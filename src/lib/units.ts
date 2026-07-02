// Unités d'article : pièces (unit = null, quantity = nombre) ou poids
// (unit = "g", quantity = grammes). Partagé client/serveur.

export type ItemUnit = "g" | null;

export const MAX_PIECES = 99;
export const MAX_GRAMS = 20_000;
export const GRAM_STEP = 100;
export const DEFAULT_GRAMS = 500;

/** Normalise une unité brute (formulaire, JSON du modèle…). */
export function parseUnit(raw: unknown): ItemUnit {
  return raw === "g" ? "g" : null;
}

/** Borne la quantité selon l'unité (pièces 1-99, grammes 1-20000). */
export function clampQuantity(q: number, unit: ItemUnit): number {
  const n = Math.round(Number(q));
  if (!Number.isFinite(n)) return unit === "g" ? DEFAULT_GRAMS : 1;
  return unit === "g" ? Math.max(1, Math.min(MAX_GRAMS, n)) : Math.max(1, Math.min(MAX_PIECES, n));
}

/**
 * Met à l'échelle une quantité d'ingrédient d'un nombre de parts de base vers
 * un nombre de parts cible (scaling de recette). Grammes arrondis à 10 g près
 * pour rester lisibles, pièces au minimum à 1.
 */
export function scaleQuantity(baseQty: number, baseServings: number, target: number, unit: ItemUnit): number {
  if (baseServings <= 0) return clampQuantity(baseQty, unit);
  const raw = (baseQty * target) / baseServings;
  const rounded = unit === "g" ? Math.round(raw / 10) * 10 : Math.round(raw);
  return clampQuantity(rounded, unit);
}

/**
 * Affichage : "×3" (pièces), "250 g", "1,2 kg" (grammes, bascule kg ≥ 1000,
 * décimale locale, ",5" tronqué si rond).
 */
export function formatQuantity(quantity: number, unit: ItemUnit, locale = "fr"): string {
  if (unit !== "g") return `×${quantity}`;
  if (quantity < 1000) return `${quantity} g`;
  const kg = quantity / 1000;
  const rounded = Math.round(kg * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", locale.startsWith("fr") ? "," : ".");
  return `${text} kg`;
}
