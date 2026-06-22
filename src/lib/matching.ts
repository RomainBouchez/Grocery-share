// Fuzzy matching entre les lignes d'un ticket OCR et les articles planifiés.
// Implémentation maison (pas de dépendance) adaptée au cas « libellé planifié
// court » (ex: "lait") ↔ « libellé ticket long et abrégé » (ex: "LAIT ENTIER DEMI ECR 1L").

/** Normalise : minuscules, sans accents, alphanum + espaces compactés. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const clean = s.replace(/\s+/g, "");
  const map = new Map<string, number>();
  for (let i = 0; i < clean.length - 1; i++) {
    const bg = clean.slice(i, i + 2);
    map.set(bg, (map.get(bg) ?? 0) + 1);
  }
  return map;
}

/** Coefficient de Sørensen–Dice sur les bigrammes de caractères (0..1). */
export function diceCoefficient(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

  const ba = bigrams(na);
  const bb = bigrams(nb);
  let inter = 0;
  let totalA = 0;
  let totalB = 0;
  for (const v of ba.values()) totalA += v;
  for (const v of bb.values()) totalB += v;
  for (const [bg, count] of ba) {
    const other = bb.get(bg);
    if (other) inter += Math.min(count, other);
  }
  return (2 * inter) / (totalA + totalB);
}

/**
 * Score de présence des tokens du libellé planifié dans le libellé ticket.
 * Pensé pour le cas asymétrique : "lait" doit matcher "LAIT ENTIER DEMI ECR 1L".
 */
function tokenContainment(planned: string, ocr: string): number {
  const pTokens = normalize(planned).split(" ").filter((t) => t.length >= 2);
  const oTokens = normalize(ocr).split(" ").filter((t) => t.length >= 2);
  if (pTokens.length === 0 || oTokens.length === 0) return 0;

  // Pondération par longueur : un mot distinctif ("vodka") pèse plus qu'un
  // token de contenance générique ("1l"), souvent écrit différemment sur le ticket.
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const pt of pTokens) {
    totalWeight += pt.length;
    const hit = oTokens.some(
      (ot) => ot === pt || ot.startsWith(pt) || pt.startsWith(ot) || diceCoefficient(pt, ot) >= 0.8,
    );
    if (hit) matchedWeight += pt.length;
  }
  return totalWeight === 0 ? 0 : matchedWeight / totalWeight;
}

/** Score de similarité global (0..1) entre un libellé planifié et un libellé ticket. */
export function similarity(planned: string, ocr: string): number {
  return Math.max(diceCoefficient(planned, ocr), tokenContainment(planned, ocr));
}

export type OcrLine = { label: string; prix: number; quantity?: number };
export type PlannedItem = { id: string; label: string };

export type MatchResult = {
  /** Lignes du ticket associées à un article planifié. */
  matches: { ocrIndex: number; itemId: string; score: number }[];
  /** Lignes du ticket sans correspondance (extras à confirmer). */
  extras: number[];
  /** Articles planifiés non retrouvés sur le ticket. */
  unmatchedItemIds: string[];
};

export const DEFAULT_MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 0.6);

/**
 * Associe chaque ligne du ticket au meilleur article planifié encore libre
 * (affectation gloutonne par score décroissant), au-dessus du seuil.
 */
export function matchReceiptToList(
  ocr: OcrLine[],
  planned: PlannedItem[],
  threshold: number = DEFAULT_MATCH_THRESHOLD,
): MatchResult {
  type Pair = { ocrIndex: number; itemId: string; score: number };
  const pairs: Pair[] = [];

  ocr.forEach((line, ocrIndex) => {
    planned.forEach((item) => {
      const score = similarity(item.label, line.label);
      if (score >= threshold) pairs.push({ ocrIndex, itemId: item.id, score });
    });
  });

  pairs.sort((a, b) => b.score - a.score);

  const usedOcr = new Set<number>();
  const usedItem = new Set<string>();
  const matches: Pair[] = [];

  for (const p of pairs) {
    if (usedOcr.has(p.ocrIndex) || usedItem.has(p.itemId)) continue;
    usedOcr.add(p.ocrIndex);
    usedItem.add(p.itemId);
    matches.push(p);
  }

  const extras = ocr.map((_, i) => i).filter((i) => !usedOcr.has(i));
  const unmatchedItemIds = planned.map((p) => p.id).filter((id) => !usedItem.has(id));

  return { matches, extras, unmatchedItemIds };
}
