import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

const SESSION_COOKIE = "grocyshare_session";
const SESSION_TTL_DAYS = 30;

/**
 * Crée une session pour un utilisateur et pose le cookie httpOnly.
 * Auth volontairement simple (cf. spec : magic link / code PIN à brancher).
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Cookie `Secure` uniquement si on est servi en HTTPS (reverse proxy).
    // En accès direct HTTP (LAN, http://<ip>:3015) le navigateur jette un
    // cookie Secure, ce qui casse la session. Défaut : non-secure.
    // Passer COOKIE_SECURE=true derrière un proxy HTTPS.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Révoque toutes les sessions de l'utilisateur sauf la session courante.
 * Utilisé après un changement de mot de passe pour déconnecter les autres appareils.
 */
export async function revokeOtherSessions(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await prisma.session.deleteMany({
    where: { userId, ...(token ? { token: { not: token } } : {}) },
  });
}

/** Détruit la session courante (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}

/**
 * Renvoie l'utilisateur connecté ou null. Mémoïsé sur la durée d'une requête.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  return session.user;
});

/** Variante qui garantit un utilisateur (à utiliser dans les zones protégées). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * L'administrateur est désigné par la variable d'environnement ADMIN_EMAIL.
 * Il est toujours considéré actif et contourne le contrôle d'activation.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin || !email) return false;
  return email.trim().toLowerCase() === admin;
}

export function isAdmin(user: { email: string }): boolean {
  return isAdminEmail(user.email);
}

/**
 * Accès aux fonctionnalités premium (dictée vocale, import de recettes).
 * L'admin l'a toujours ; les autres via le drapeau `isPremium` accordé
 * depuis la page admin (en attendant le branchement de l'abonnement payant).
 */
export function hasPremiumAccess(user: { email: string; isPremium?: boolean }): boolean {
  return isAdmin(user) || user.isPremium === true;
}

/** Garantit un utilisateur admin (zones d'administration). */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new Error("FORBIDDEN");
  return user;
}
