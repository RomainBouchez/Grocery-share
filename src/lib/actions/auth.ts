"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, isAdminEmail, revokeOtherSessions } from "@/lib/auth";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { sendMail, isMailConfigured, passwordResetEmailHtml } from "@/lib/mail";
import { AVATAR_COLORS } from "@/lib/ui";

export type ActionResult =
  | { error: string }
  | undefined;

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
  const t = await getTranslations("auth.errors");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!isValidEmail(email)) {
    return { error: t("invalidEmail") };
  }
  if (!password) {
    return { error: t("missingPassword") };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: t("noAccount") };
  }

  if (!user.passwordHash) {
    // Compte hérité : on définit le mot de passe à cette première connexion.
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: t("legacyPasswordTooShort", { min: MIN_PASSWORD_LENGTH }) };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  } else if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: t("wrongPassword") };
  }

  // Compte désactivé par un administrateur (l'admin lui-même est exempté).
  if (!user.isActive && !isAdminEmail(user.email)) {
    return { error: t("accountPending") };
  }

  await createSession(user.id);
  redirect(next);
}

/**
 * Inscription : crée un nouveau compte avec prénom, email et mot de passe.
 */
export async function signup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("auth.errors");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!name) {
    return { error: t("missingFirstName") };
  }
  if (!isValidEmail(email)) {
    return { error: t("invalidEmail") };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t("passwordTooShort", { min: MIN_PASSWORD_LENGTH }) };
  }
  if (password !== confirm) {
    return { error: t("passwordMismatch") };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(password);

  let user;
  if (existing) {
    if (existing.passwordHash) {
      return { error: t("accountExists") };
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

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 h

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** URL de base de l'app : APP_URL si défini, sinon dérivée de la requête. */
async function appBaseUrl(): Promise<string> {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Demande de réinitialisation : envoie un email avec un lien à usage unique.
 *
 * Anti-énumération : la réponse est identique que le compte existe ou non.
 * Le jeton est stocké hashé (SHA-256), expire au bout d'une heure.
 */
export async function requestPasswordReset(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const t = await getTranslations("auth.errors");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { error: t("invalidEmail") };
  }
  if (!isMailConfigured()) {
    return { error: t("mailNotConfigured") };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Compte inexistant ou hérité sans mot de passe : on répond succès sans rien
  // envoyer, pour ne pas révéler l'existence (ou non) d'un compte.
  if (user && user.passwordHash) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashResetToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const tm = await getTranslations("auth.resetMail");
    const resetUrl = `${await appBaseUrl()}/reset-password/${token}`;
    const firstName = user.name.split(" ")[0];
    await sendMail({
      to: user.email,
      subject: tm("subject"),
      html: passwordResetEmailHtml({
        greeting: tm("greeting", { name: firstName }),
        intro: tm("intro"),
        buttonLabel: tm("button"),
        resetUrl,
        expiry: tm("expiry"),
        ignore: tm("ignore"),
      }),
      text: `${tm("greeting", { name: firstName })}\n\n${tm("intro")}\n\n${resetUrl}\n\n${tm("expiry")}\n${tm("ignore")}`,
    });
  }

  return { success: true };
}

/**
 * Réinitialisation effective depuis le lien reçu par email.
 * Vérifie le jeton (hash, expiration, usage unique), applique le nouveau mot
 * de passe puis révoque toutes les sessions existantes de l'utilisateur.
 */
export async function resetPassword(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const t = await getTranslations("auth.errors");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    return { error: t("resetTokenInvalid") };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t("passwordTooShort", { min: MIN_PASSWORD_LENGTH }) };
  }
  if (password !== confirm) {
    return { error: t("passwordMismatch") };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: t("resetTokenInvalid") };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Toutes les sessions sont révoquées : l'utilisateur se reconnecte
    // avec son nouveau mot de passe.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
    // Nettoyage des autres jetons encore actifs pour ce compte.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
    }),
  ]);

  return { success: true };
}

/** Résultat des actions du profil : erreur, succès, ou rien (état initial). */
export type ProfileActionResult = { error: string } | { success: true } | undefined;

/** Met à jour le prénom de l'utilisateur connecté. */
export async function updateProfileName(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const t = await getTranslations("auth.errors");
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  if (!name) {
    return { error: t("missingFirstName") };
  }

  if (name !== user.name) {
    await prisma.user.update({ where: { id: user.id }, data: { name } });
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/listes");
  }
  return { success: true };
}

/**
 * Changement de mot de passe depuis le profil.
 * Exige le mot de passe actuel, puis révoque les sessions des autres appareils.
 */
export async function changePassword(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  const t = await getTranslations("auth.errors");
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Un compte connecté a toujours un hash (les comptes hérités le définissent
  // à la connexion), mais on reste défensif.
  if (!user.passwordHash || !(await verifyPassword(current, user.passwordHash))) {
    return { error: t("wrongCurrentPassword") };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t("passwordTooShort", { min: MIN_PASSWORD_LENGTH }) };
  }
  if (password !== confirm) {
    return { error: t("passwordMismatch") };
  }
  if (password === current) {
    return { error: t("samePassword") };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });
  await revokeOtherSessions(user.id);

  return { success: true };
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
