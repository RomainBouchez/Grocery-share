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
