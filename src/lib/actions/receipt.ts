"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser, hasPremiumAccess } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";
import { extractAndMatchReceipt, extractReceiptItems } from "@/lib/ocr";
import { matchReceiptWithClaude } from "@/lib/matchClaude";
import type { MatchResult, OcrLine } from "@/lib/matching";
import { pushGroupName, type TicketActionResult } from "@/lib/actions/tickets";
import { sendPushToUsers } from "@/lib/push";
import { formatEuro } from "@/lib/utils";

const round2 = (n: number) => Math.round(n * 100) / 100;

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(os.tmpdir(), "grocyshare-uploads");

export type DraftMatch = {
  rawLabel: string;
  price: number;
  quantity?: number;
  itemId: string;
  itemLabel: string;
  score: number;
};
export type DraftExtra = { rawLabel: string; price: number; quantity?: number };

export type ScanDraft = {
  ok: true;
  groupId: string;
  photoFile: string;
  total: number;
  matched: DraftMatch[];
  extras: DraftExtra[];
};
export type ScanError = { ok: false; error: string };

/** Récupère la liste active d'un groupe (planning/shopping), après contrôle d'accès. */
async function getActiveList(userId: string, groupId: string) {
  await assertMembership(userId, groupId);
  let list = await prisma.shoppingList.findFirst({
    where: { groupId, status: { in: ["planning", "shopping"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!list) {
    list = await prisma.shoppingList.create({ data: { groupId, status: "planning" } });
  }
  return list;
}

/**
 * « J'ai fait les courses » : reçoit la photo du ticket, lance l'OCR via
 * `claude -p`, puis fait le fuzzy matching avec la liste planifiée.
 * Ne persiste rien : renvoie un brouillon que l'utilisateur valide ensuite.
 */
export async function scanReceipt(_prev: unknown, formData: FormData): Promise<ScanDraft | ScanError> {
  const user = await requireUser();
  const t = await getTranslations("receipt.errors");

  // Scan OCR + Claude : fonctionnalité Premium (comme dictée / recette).
  if (!hasPremiumAccess(user)) {
    return { ok: false, error: t("premiumOnly") };
  }

  const groupId = String(formData.get("groupId") ?? "");
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, error: t("noPhoto") };
  }
  if (!photo.type.startsWith("image/")) {
    return { ok: false, error: t("notImage") };
  }

  let list;
  try {
    list = await getActiveList(user.id, groupId);
  } catch {
    return { ok: false, error: t("accessDenied") };
  }

  // Sauvegarde l'image dans un dossier accessible par le CLI Claude. Sous
  // tickets/ : la photo finira par appuyer un Ticket (voir confirmReceipt),
  // servie ensuite par /api/tickets/[ticketId]/photo qui lit ce même sous-dossier.
  const ext = (photo.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(UPLOAD_DIR, "tickets");
  const filepath = path.join(dir, filename);
  await mkdir(dir, { recursive: true });
  await writeFile(filepath, Buffer.from(await photo.arrayBuffer()));

  const plannedItems = await prisma.listItem.findMany({
    where: { listId: list.id, status: { not: "bought" } },
    select: { id: true, label: true },
  });

  // Lecture + matching en UN seul appel (un seul démarrage du CLI ≈ moitié du
  // temps). Repli sur deux appels séparés si l'appel combiné échoue.
  let lines: OcrLine[];
  let result: MatchResult;
  try {
    ({ lines, result } = await extractAndMatchReceipt(filepath, plannedItems));
  } catch {
    try {
      lines = await extractReceiptItems(filepath);
      result = await matchReceiptWithClaude(lines, plannedItems);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : t("analysisFailed") };
    }
  }
  if (lines.length === 0) {
    return { ok: false, error: t("noItemsDetected") };
  }

  const labelById = new Map(plannedItems.map((p) => [p.id, p.label]));

  const matched: DraftMatch[] = result.matches.map((m) => ({
    rawLabel: lines[m.ocrIndex].label,
    price: lines[m.ocrIndex].prix,
    quantity: lines[m.ocrIndex].quantity,
    itemId: m.itemId,
    itemLabel: labelById.get(m.itemId) ?? "",
    score: Math.round(m.score * 100) / 100,
  }));
  const extras: DraftExtra[] = result.extras.map((i) => ({
    rawLabel: lines[i].label,
    price: lines[i].prix,
    quantity: lines[i].quantity,
  }));
  const total = lines.reduce((s, l) => s + l.prix, 0);

  return {
    ok: true,
    groupId,
    photoFile: filename,
    total: Math.round(total * 100) / 100,
    matched,
    extras,
  };
}

type ConfirmPayload = {
  groupId: string;
  photoFile: string;
  paidByUserId: string;
  matched: { itemId: string; rawLabel: string; price: number }[];
  // extras conservés, avec les participants choisis (façon Tricount)
  extras: { rawLabel: string; price: number; participantIds: string[] }[];
  // part de chaque débiteur (hors payeur), calculée côté client par ReceiptScanner
  debts: { userId: string; amount: number }[];
};

/**
 * Valide le ticket : marque les articles matchés comme achetés, matérialise
 * les extras conservés en articles, et enregistre la dépense comme Ticket
 * (même registre que la saisie manuelle — un seul endroit pour "qui doit quoi").
 */
export async function confirmReceipt(formData: FormData): Promise<TicketActionResult> {
  const user = await requireUser();
  const t = await getTranslations("receipt.errors");
  const tTickets = await getTranslations("tickets.errors");
  const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as ConfirmPayload;
  const { groupId } = payload;

  try {
    await assertMembership(user.id, groupId);
    await assertMembership(payload.paidByUserId, groupId);
  } catch {
    return { error: t("accessDenied") };
  }

  const list = await getActiveList(user.id, groupId);
  const total = round2(
    payload.matched.reduce((s, m) => s + m.price, 0) +
    payload.extras.reduce((s, e) => s + e.price, 0),
  );
  if (total <= 0) {
    return { error: t("nothingSelected") };
  }

  const debts = (payload.debts ?? []).filter((d) => d.userId !== payload.paidByUserId && d.amount > 0);
  try {
    for (const d of debts) {
      await assertMembership(d.userId, groupId);
    }
  } catch {
    return { error: t("accessDenied") };
  }

  const debtSum = round2(debts.reduce((s, d) => s + d.amount, 0));
  // <= et non === : le payeur peut avoir sa propre part auto-financée (non trackée comme dette).
  if (debtSum > total + 0.01) {
    return { error: tTickets("amountsDontMatch", { sum: formatEuro(debtSum), total: formatEuro(total) }) };
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        groupId,
        paidByUserId: payload.paidByUserId,
        totalAmount: total,
        photoUrl: payload.photoFile,
        debts: { create: debts.map((d) => ({ userId: d.userId, amount: round2(d.amount) })) },
      },
    });

    // Articles planifiés retrouvés sur le ticket → marqués achetés.
    for (const m of payload.matched) {
      await tx.listItem.update({
        where: { id: m.itemId },
        data: { status: "bought" },
      });
    }

    // Extras conservés → nouvel article (acheté) + participants choisis.
    for (const e of payload.extras) {
      const participantIds = e.participantIds.length > 0 ? e.participantIds : [payload.paidByUserId];
      await tx.listItem.create({
        data: {
          listId: list.id,
          label: e.rawLabel,
          addedByUserId: user.id,
          status: "bought",
          participants: { create: participantIds.map((uid) => ({ userId: uid, parts: 1 })) },
        },
      });
    }

    return created;
  });

  // Courses terminées : efface l'annonce « je vais faire les courses ».
  await prisma.shoppingList.update({
    where: { id: list.id },
    data: { shoppingByUserId: null, shoppingStartedAt: null, status: "planning" },
  });

  if (debts.length > 0) {
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
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/tickets`);
  redirect(`/groups/${groupId}/tickets/${ticket.id}`);
}
