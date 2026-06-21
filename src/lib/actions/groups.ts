"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateInviteCode } from "@/lib/utils";

export type ActionResult = { error: string } | undefined;

/** Crée un groupe, y ajoute le créateur (owner) et ouvre une liste en planning. */
export async function createGroup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Donne un nom au groupe." };

  // Génère un code d'invitation unique.
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.group.findUnique({ where: { inviteCode } });
    if (!exists) break;
    inviteCode = generateInviteCode();
  }

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode,
      members: { create: { userId: user.id, role: "owner" } },
      lists: { create: { status: "planning" } },
    },
  });

  revalidatePath("/");
  redirect(`/groups/${group.id}`);
}

/** Rejoint un groupe via son code d'invitation. */
export async function joinGroup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!code) return { error: "Saisis un code d'invitation." };

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) return { error: "Aucun groupe ne correspond à ce code." };

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
  });

  if (!existing) {
    await prisma.groupMember.create({
      data: { userId: user.id, groupId: group.id, role: "member" },
    });
  }

  revalidatePath("/");
  redirect(`/groups/${group.id}`);
}

/** Vérifie l'appartenance d'un user à un groupe (helper d'autorisation). */
export async function assertMembership(userId: string, groupId: string): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!member) throw new Error("FORBIDDEN");
}
