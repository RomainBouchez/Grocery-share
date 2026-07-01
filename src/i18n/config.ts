/**
 * Configuration i18n partagée (sans « use server » : constantes + types).
 * Le français reste la langue par défaut ; l'anglais est proposé en option.
 */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Cookie mémorisant le choix de langue (distinct du cookie de session). */
export const LOCALE_COOKIE = "grocyshare_locale";

/** Libellés affichés dans le sélecteur de langue. */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

/** Garde-fou : ramène une valeur inconnue vers la langue par défaut. */
export function coerceLocale(value?: string | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
