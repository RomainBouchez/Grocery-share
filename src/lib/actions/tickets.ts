"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";
import { sendPushToUsers } from "@/lib/push";
import { formatEuro } from "@/lib/utils";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(os.tmpdir(), "grocyshare-uploads");
const round2 = (n: number) => Math.round(n * 100) / 100;

export type TicketActionResult = { error: string } | undefined;

type TicketPayload = {
  totalAmount: number;
  debts: { userId: string; amount: number }[];
};

/** Résout le nom de groupe pour les notifs push (fallback + troncature, comme announceGoShopping). */
export async function pushGroupName(groupId: string): Promise<string> {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  const t = await getTranslations("push.notif");
  const rawName = (group?.name ?? "").trim();
  const safeName = rawName.length === 0 ? t("fallbackGroup") : rawName;
  return safeName.length > 40 ? `${safeName.slice(0, 39)}…` : safeName;
}

/**
 * Ajoute un ticket rapide : photo + montant total réparti entre débiteurs choisis.
 * Ardoise indépendante du flux OCR (Receipt) — ne touche ni ShoppingList ni
 * computeGroupBalances/Settlement. Le payeur n'est jamais son propre débiteur.
 */
export async function createTicket(formData: FormData): Promise<TicketActionResult> {
  const user = await requireUser();
  const t = await getTranslations("tickets.errors");

  const groupId = String(formData.get("groupId") ?? "");
  const paidByUserId = String(formData.get("paidByUserId") ?? user.id);
  const photo = formData.get("photo");
  const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as TicketPayload;

  try {
    await assertMembership(user.id, groupId);
    await assertMembership(paidByUserId, groupId);
  } catch {
    return { error: t("accessDenied") };
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: t("noPhoto") };
  }
  if (!photo.type.startsWith("image/")) {
    return { error: t("notImage") };
  }

  // Le payeur ne peut jamais être son propre débiteur, même si le client l'a envoyé.
  const debts = (payload.debts ?? []).filter((d) => d.userId !== paidByUserId && d.amount > 0);
  if (debts.length === 0) {
    return { error: t("noDebtors") };
  }

  const totalAmount = round2(Number(payload.totalAmount) || 0);
  if (totalAmount <= 0) {
    return { error: t("invalidAmount") };
  }

  const sum = round2(debts.reduce((s, d) => s + d.amount, 0));
  if (Math.abs(sum - totalAmount) > 0.01) {
    return { error: t("amountsDontMatch", { sum: formatEuro(sum), total: formatEuro(totalAmount) }) };
  }

  try {
    for (const d of debts) {
      await assertMembership(d.userId, groupId);
    }
  } catch {
    return { error: t("accessDenied") };
  }

  const ext = (photo.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_DIR, "tickets");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await photo.arrayBuffer()));

  const ticket = await prisma.ticket.create({
    data: {
      groupId,
      paidByUserId,
      totalAmount,
      photoUrl: filename,
      debts: { create: debts.map((d) => ({ userId: d.userId, amount: round2(d.amount) })) },
    },
  });

  const tPush = await getTranslations("push.notif");
  const firstName = user.name.split(" ")[0];
  const groupName = await pushGroupName(groupId);
  await Promise.all(
    debts.map((d) =>
      sendPushToUsers([d.userId], {
        title: "GrocyShare",
        body: tPush("ticketAssigned", { name: firstName, amount: formatEuro(d.amount), group: groupName }),
        url: `/groups/${groupId}/tickets`,
        tag: `ticket-${ticket.id}`,
      }),
    ),
  );

  revalidatePath(`/groups/${groupId}/tickets`);
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}/tickets/${ticket.id}`);
}

/** Marque la part d'un débiteur comme remboursée. N'importe quel membre du groupe peut valider. */
export async function markDebtReimbursed(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const debtId = String(formData.get("debtId") ?? "");
  if (!groupId || !debtId) return;

  await assertMembership(user.id, groupId);

  const debt = await prisma.ticketDebt.findUnique({
    where: { id: debtId },
    include: { ticket: true },
  });
  if (!debt || debt.ticket.groupId !== groupId) return;
  if (debt.reimbursedAt) return;

  await prisma.ticketDebt.update({
    where: { id: debtId },
    data: { reimbursedAt: new Date() },
  });

  const t = await getTranslations("push.notif");
  const groupName = await pushGroupName(groupId);
  await sendPushToUsers([debt.userId], {
    title: "GrocyShare",
    body: t("ticketReimbursed", { amount: formatEuro(debt.amount), group: groupName }),
    url: `/groups/${groupId}/tickets`,
    tag: `ticket-${debt.ticketId}-${debt.id}`,
  });

  revalidatePath(`/groups/${groupId}/tickets`);
}
