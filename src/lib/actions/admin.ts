"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, isAdminEmail } from "@/lib/auth";

/**
 * Active ou désactive un compte. Réservé à l'administrateur (ADMIN_EMAIL).
 * On ne désactive jamais le compte admin lui-même.
 */
export async function setUserActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!userId) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (isAdminEmail(target.email) && !active) return; // l'admin reste toujours actif

  await prisma.user.update({ where: { id: userId }, data: { isActive: active } });
  revalidatePath("/admin");
}

/**
 * Accorde ou retire l'accès premium (dictée, recettes). Réservé à l'admin.
 * Sans effet sur le compte admin (déjà premium d'office).
 */
export async function setUserPremium(formData: FormData): Promise<void> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const premium = String(formData.get("premium") ?? "") === "true";
  if (!userId) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (isAdminEmail(target.email)) return; // l'admin est premium d'office

  await prisma.user.update({ where: { id: userId }, data: { isPremium: premium } });
  revalidatePath("/admin");
}
