"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { AVATAR_COLORS } from "@/lib/ui";

export type ActionResult = { error: string } | undefined;

/**
 * Valide une destination de redirection post-login.
 * On n'accepte qu'un chemin interne absolu pour éviter les open redirects
 * (pas de "//evil.com", pas d'URL absolue, pas de backslash).
 */
function safeNext(raw: string): string {
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

/**
 * Connexion simplifiée (MVP) : on identifie l'utilisateur par email.
 * S'il n'existe pas, on le crée. À remplacer par un vrai magic link ensuite.
 */
export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!email || !email.includes("@")) {
    return { error: "Adresse email invalide." };
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!name) {
      return { error: "Première connexion : indique ton prénom." };
    }
    user = await prisma.user.create({ data: { name, email } });
  } else if (name && name !== user.name) {
    user = await prisma.user.update({ where: { id: user.id }, data: { name } });
  }

  await createSession(user.id);
  redirect(next);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Met à jour la couleur d'avatar choisie par l'utilisateur connecté. */
export async function setProfileColor(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const color = String(formData.get("color") ?? "");
  if (!AVATAR_COLORS.includes(color)) return;
  await prisma.user.update({ where: { id: user.id }, data: { color } });
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/listes");
}
