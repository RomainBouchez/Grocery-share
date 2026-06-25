"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { AVATAR_COLORS } from "@/lib/ui";

export type ActionResult = { error: string } | undefined;

function isValidEmail(email: string): boolean {
  // Validation volontairement permissive : un seul "@" avec du texte autour.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
 * Connexion par email + mot de passe.
 *
 * Migration des comptes hérités : un utilisateur créé avant la mise en place
 * des mots de passe a `passwordHash = null`. À sa première connexion, le mot de
 * passe saisi devient son mot de passe (le compte est ainsi « revendiqué »).
 */
export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!isValidEmail(email)) {
    return { error: "Adresse email invalide." };
  }
  if (!password) {
    return { error: "Saisis ton mot de passe." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Aucun compte avec cet email. Crée un compte." };
  }

  if (!user.passwordHash) {
    // Compte hérité : on définit le mot de passe à cette première connexion.
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Choisis un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.` };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  } else if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: "Mot de passe incorrect." };
  }

  await createSession(user.id);
  redirect(next);
}

/**
 * Inscription : crée un nouveau compte avec prénom, email et mot de passe.
 */
export async function signup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!name) {
    return { error: "Indique ton prénom." };
  }
  if (!isValidEmail(email)) {
    return { error: "Adresse email invalide." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(password);

  let user;
  if (existing) {
    if (existing.passwordHash) {
      return { error: "Un compte existe déjà avec cet email. Connecte-toi." };
    }
    // Compte hérité sans mot de passe : on le revendique avec ces identifiants.
    user = await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash },
    });
  } else {
    user = await prisma.user.create({ data: { name, email, passwordHash } });
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
