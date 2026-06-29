"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";
import { DEFAULT_TAGS } from "@/lib/tags";

/** Palette de couleurs autorisées pour un tag (rayons par défaut). */
const TAG_COLORS = DEFAULT_TAGS.map((t) => t.color);
const cleanTagColor = (c: string) => (TAG_COLORS.includes(c) ? c : "#807C72");

/** Crée (ou récupère) un tag dans un groupe. Retourne son id. */
export async function createTag(formData: FormData): Promise<string | undefined> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const icon = String(formData.get("icon") ?? "Tag") || "Tag";
  const color = cleanTagColor(String(formData.get("color") ?? ""));

  await assertMembership(user.id, groupId);

  const tag = await prisma.tag.upsert({
    where: { groupId_name: { groupId, name } },
    create: { groupId, name, icon, color },
    update: {},
  });

  revalidatePath(`/groups/${groupId}`);
  return tag.id;
}

/** Affecte (ou retire) le tag d'un article + mémorise le rayon du produit. */
export async function setItemTag(formData: FormData): Promise<void> {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const raw = String(formData.get("tagId") ?? "");
  const tagId = raw === "" ? null : raw;

  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item) throw new Error("NOT_FOUND");
  await assertMembership(user.id, item.list.groupId);

  // Le tag doit appartenir au même groupe.
  if (tagId) {
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.groupId !== item.list.groupId) throw new Error("FORBIDDEN");
  }

  await prisma.listItem.update({ where: { id: itemId }, data: { tagId } });

  // Mémoire produit→tag au niveau du groupe (réappliquée si l'article revient).
  const groupId = item.list.groupId;
  if (tagId) {
    await prisma.groupProductTag.upsert({
      where: { groupId_label: { groupId, label: item.label } },
      create: { groupId, label: item.label, tagId },
      update: { tagId },
    });
  } else {
    await prisma.groupProductTag.deleteMany({ where: { groupId, label: item.label } });
  }

  revalidatePath(`/groups/${groupId}`);
}
