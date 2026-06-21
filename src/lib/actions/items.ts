"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";

export type ActionResult = { error: string } | undefined;

/** Récupère la liste active (planning/shopping) d'un groupe, après contrôle d'accès. */
async function getActiveListForGroup(userId: string, groupId: string) {
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
 * Ajoute un article à la liste du groupe.
 * Conformément à la spec : le créateur devient automatiquement participant (1 part).
 */
export async function addItem(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  if (!label) return { error: "Indique le nom de l'article." };

  const list = await getActiveListForGroup(user.id, groupId);

  await prisma.listItem.create({
    data: {
      listId: list.id,
      label,
      addedByUserId: user.id,
      participants: { create: { userId: user.id, parts: 1 } },
    },
  });

  revalidatePath(`/groups/${groupId}`);
}

/** Helper : charge un article + vérifie que l'utilisateur appartient au groupe. */
async function loadItemAndAuthorize(userId: string, itemId: string) {
  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item) throw new Error("NOT_FOUND");
  await assertMembership(userId, item.list.groupId);
  return item;
}

/** Rejoint un article avec un nombre de parts (ajout ou mise à jour). */
export async function setParticipation(formData: FormData): Promise<void> {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const parts = Math.max(0, Math.min(99, parseInt(String(formData.get("parts") ?? "1"), 10) || 0));

  const item = await loadItemAndAuthorize(user.id, itemId);

  if (parts <= 0) {
    // 0 part = se retirer de l'article.
    await prisma.itemParticipant.deleteMany({ where: { itemId, userId: user.id } });
  } else {
    await prisma.itemParticipant.upsert({
      where: { itemId_userId: { itemId, userId: user.id } },
      create: { itemId, userId: user.id, parts },
      update: { parts },
    });
  }

  revalidatePath(`/groups/${item.list.groupId}`);
}

/** Change le statut d'un article (pending -> bought -> ...). */
export async function setItemStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const status = String(formData.get("status") ?? "pending");
  const allowed = ["pending", "bought", "skipped"];
  if (!allowed.includes(status)) return;

  const item = await loadItemAndAuthorize(user.id, itemId);
  await prisma.listItem.update({ where: { id: itemId }, data: { status } });
  revalidatePath(`/groups/${item.list.groupId}`);
}

/** Supprime un article (réservé à son créateur). */
export async function deleteItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");

  const item = await loadItemAndAuthorize(user.id, itemId);
  if (item.addedByUserId !== user.id) throw new Error("FORBIDDEN");

  await prisma.listItem.delete({ where: { id: itemId } });
  revalidatePath(`/groups/${item.list.groupId}`);
}
