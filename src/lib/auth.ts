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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
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
