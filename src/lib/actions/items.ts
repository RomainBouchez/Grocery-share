"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";
import { normalizeLoose } from "@/lib/matching";

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
  const tagIdRaw = String(formData.get("tagId") ?? "").trim() || null;
  const quantity = Math.max(1, Math.min(99, parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));

  if (!label) return { error: (await getTranslations("item.errors"))("labelRequired") };

  const list = await getActiveListForGroup(user.id, groupId);

  // Mémoire produit→tag : tag du formulaire, sinon tag mémorisé pour ce libellé.
  // Correspondance insensible au pluriel (« melon » retrouve le rayon de « melons »).
  let rememberedTagId: string | null = null;
  if (!tagIdRaw) {
    const normLabel = normalizeLoose(label);
    const productTags = await prisma.groupProductTag.findMany({
      where: { groupId },
      select: { label: true, tagId: true },
    });
    rememberedTagId = productTags.find(pt => normalizeLoose(pt.label) === normLabel)?.tagId ?? null;
  }
  const finalTagId = tagIdRaw ?? rememberedTagId ?? null;

  // Si un tag est fourni au moment de l'ajout, mettre à jour la mémoire.
  if (finalTagId) {
    await prisma.groupProductTag.upsert({
      where: { groupId_label: { groupId, label } },
      create: { groupId, label, tagId: finalTagId },
      update: { tagId: finalTagId },
    });
  }

  // Historique perso : seuls les aliments saisis à la main alimentent
  // l'autocomplétion (les tickets scannés n'y contribuent pas).
  await prisma.userProduct.upsert({
    where: { userId_label: { userId: user.id, label } },
    create: { userId: user.id, label, buyCount: 1, lastBoughtAt: new Date() },
    update: { buyCount: { increment: 1 }, lastBoughtAt: new Date() },
  });

  // Anti-doublons : si un article « à acheter » identique existe déjà dans la
  // liste (même libellé, aux accents/casse/ponctuation près), on ne recrée pas.
  // On incrémente sa quantité et on ajoute l'utilisateur aux participants.
  const norm = normalizeLoose(label);
  const pendingItems = await prisma.listItem.findMany({
    where: { listId: list.id, status: "pending" },
    select: { id: true, label: true, quantity: true },
  });
  const existing = pendingItems.find(it => normalizeLoose(it.label) === norm);

  if (existing) {
    await prisma.listItem.update({
      where: { id: existing.id },
      data: { quantity: Math.min(99, existing.quantity + 1) },
    });
    // Ajoute l'utilisateur s'il ne participe pas encore (sinon on ne touche pas ses parts).
    await prisma.itemParticipant.upsert({
      where: { itemId_userId: { itemId: existing.id, userId: user.id } },
      create: { itemId: existing.id, userId: user.id, parts: 1 },
      update: {},
    });
    revalidatePath(`/groups/${groupId}`);
    return;
  }

  await prisma.listItem.create({
    data: {
      listId: list.id,
      label,
      addedByUserId: user.id,
      tagId: finalTagId,
      quantity,
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
/**
 * Définit les parts d'un participant sur un article (style Tricount).
 * N'importe quel membre du groupe peut ajouter/retirer/ajuster n'importe quel
 * autre membre. Sans `userId`, on agit sur l'utilisateur courant.
 */
export async function setParticipation(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "") || actor.id;
  const parts = Math.max(0, Math.min(99, parseInt(String(formData.get("parts") ?? "1"), 10) || 0));

  // L'auteur de l'action doit appartenir au groupe…
  const item = await loadItemAndAuthorize(actor.id, itemId);
  // …et la personne ajoutée aussi (on ne met que des membres du groupe sur un article).
  await assertMembership(targetUserId, item.list.groupId);

  if (parts <= 0) {
    // 0 part = retirer la personne de l'article.
    await prisma.itemParticipant.deleteMany({ where: { itemId, userId: targetUserId } });
  } else {
    await prisma.itemParticipant.upsert({
      where: { itemId_userId: { itemId, userId: targetUserId } },
      create: { itemId, userId: targetUserId, parts },
      update: { parts },
    });
  }

  revalidatePath(`/groups/${item.list.groupId}`);
}

/** Modifie le nom et/ou la quantité d'un article (tout membre du groupe). */
export async function updateItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const quantity = Math.max(1, Math.min(99, parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));

  if (!label) return;

  const item = await loadItemAndAuthorize(user.id, itemId);
  await prisma.listItem.update({ where: { id: itemId }, data: { label, quantity } });
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
