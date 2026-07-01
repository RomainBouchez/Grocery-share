"use server";

import { cookies, headers } from "next/headers";
import { coerceLocale, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./config";

/**
 * Langue active pour la requête courante.
 *
 * Priorité : cookie explicite > langue du navigateur (Accept-Language) > défaut (fr).
 * La détection navigateur est en LECTURE SEULE : tant que l'utilisateur n'a pas
 * choisi via le sélecteur, aucun cookie n'est écrit ici (on ne mute pas au rendu).
 */
export async function getUserLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (fromCookie) return coerceLocale(fromCookie);
  return detectFromHeader((await headers()).get("accept-language"));
}

/** Enregistre le choix de langue de l'utilisateur (appelé depuis le sélecteur). */
export async function setUserLocale(locale: Locale): Promise<void> {
  const safe = coerceLocale(locale);
  (await cookies()).set(LOCALE_COOKIE, safe, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 an
  });
}

/** Choisit fr/en à partir de l'en-tête Accept-Language (défaut fr si ambigu). */
function detectFromHeader(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  // On parcourt les langues par ordre de préférence (on ignore les poids q,
  // l'ordre d'apparition suffit pour un choix binaire fr/en).
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0].toLowerCase();
    const base = tag.split("-")[0];
    if (LOCALES.includes(base as Locale)) return base as Locale;
  }
  return DEFAULT_LOCALE;
}
