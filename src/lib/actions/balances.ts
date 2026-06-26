"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";

/**
 * Enregistre un remboursement (« marquer remboursé ») de `fromUser` (débiteur)
 * vers `toUser` (créancier). La balance étant calculée en direct depuis les tickets,
 * ce simple ajout vient éponger la dette correspondante au rendu suivant.
 */
export async function recordSettlement(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const fromUserId = String(formData.get("fromUserId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  const amount = Math.round((Number(formData.get("amount")) || 0) * 100) / 100;

  if (!groupId || !fromUserId || !toUserId || fromUserId === toUserId) return;
  if (!(amount > 0)) return;

  // L'acteur et les deux parties doivent appartenir au groupe.
  await assertMembership(user.id, groupId);
  await assertMembership(fromUserId, groupId);
  await assertMembership(toUserId, groupId);

  // Le module doit être actif pour ce groupe.
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { expenseSharingEnabled: true },
  });
  if (!group?.expenseSharingEnabled) return;

  await prisma.settlement.create({
    data: { groupId, fromUserId, toUserId, amount, createdById: user.id },
  });

  revalidatePath(`/groups/${groupId}/balances`);
  revalidatePath(`/groups/${groupId}`);
}
