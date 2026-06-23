import "server-only";
import { runClaude } from "@/lib/claude-cli";
import {
  matchReceiptToList,
  type MatchResult,
  type OcrLine,
  type PlannedItem,
} from "@/lib/matching";

// Matching SÉMANTIQUE via Claude Haiku : comprend qu'une marque correspond à sa
// catégorie (RedBull = boisson énergisante, Nestlé Cookie Crisp = céréales…),
// là où le matching lexical (bigrammes) échoue. Repli sur le lexical si l'appel
// échoue ou renvoie un JSON inexploitable.

const MATCH_MODEL = process.env.CLAUDE_MATCH_MODEL ?? "haiku";

function buildPrompt(ocr: OcrLine[], planned: PlannedItem[]): string {
  const ocrList = ocr.map((l, i) => `${i}: ${l.label}`).join("\n");
  const plannedList = planned.map((p) => `${p.id}: ${p.label}`).join("\n");
  return [
    "Tu associes les lignes d'un ticket de caisse aux articles d'une liste de courses.",
    "Raisonne sur le SENS, pas seulement les lettres : une marque correspond à sa",
    "catégorie (ex: RedBull/Celsius = boisson énergisante ; Nestlé Cookie Crisp =",
    "céréales ; Alpro = produit végétal/soja ; JR Haché = viande hachée).",
    "",
    "LIGNES DU TICKET (index: libellé) :",
    ocrList,
    "",
    "ARTICLES DE LA LISTE (id: libellé) :",
    plannedList,
    "",
    "Renvoie UNIQUEMENT un tableau JSON des correspondances sûres, au format exact :",
    '[{"ocrIndex":0,"itemId":"abc"}]',
    "Règles :",
    "- chaque index de ticket apparaît au plus une fois ;",
    "- chaque itemId apparaît au plus une fois ;",
    "- n'inclus QUE les correspondances dont tu es raisonnablement sûr ; omets une",
    "  ligne du ticket si aucun article ne correspond ;",
    "- aucun texte, aucune explication, aucun bloc de code autour du JSON.",
  ].join("\n");
}

type RawMatch = { ocrIndex: number; itemId: string };

/** Extrait le premier tableau JSON présent dans la sortie texte. */
function parseMatches(raw: string): RawMatch[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Réponse de Claude sans tableau JSON exploitable.");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Le JSON de matching n'est pas un tableau.");
  return parsed as RawMatch[];
}

/**
 * Associe les lignes du ticket aux articles planifiés via Claude Haiku.
 * Valide chaque correspondance (indices/ids réels, unicité) puis construit le
 * MatchResult. Repli silencieux sur le matching lexical en cas d'échec.
 */
export async function matchReceiptWithClaude(
  ocr: OcrLine[],
  planned: PlannedItem[],
): Promise<MatchResult> {
  // Rien à associer → inutile d'appeler le modèle.
  if (ocr.length === 0 || planned.length === 0) {
    return matchReceiptToList(ocr, planned);
  }

  let raw: RawMatch[];
  try {
    const out = await runClaude({ prompt: buildPrompt(ocr, planned), model: MATCH_MODEL });
    raw = parseMatches(out);
  } catch {
    return matchReceiptToList(ocr, planned); // filet de secours lexical
  }

  const plannedIds = new Set(planned.map((p) => p.id));
  const usedOcr = new Set<number>();
  const usedItem = new Set<string>();
  const matches: MatchResult["matches"] = [];

  for (const m of raw) {
    const ocrIndex = Number(m?.ocrIndex);
    const itemId = String(m?.itemId ?? "");
    if (!Number.isInteger(ocrIndex) || ocrIndex < 0 || ocrIndex >= ocr.length) continue;
    if (!plannedIds.has(itemId)) continue;
    if (usedOcr.has(ocrIndex) || usedItem.has(itemId)) continue;
    usedOcr.add(ocrIndex);
    usedItem.add(itemId);
    matches.push({ ocrIndex, itemId, score: 1 });
  }

  const extras = ocr.map((_, i) => i).filter((i) => !usedOcr.has(i));
  const unmatchedItemIds = planned.map((p) => p.id).filter((id) => !usedItem.has(id));
  return { matches, extras, unmatchedItemIds };
}
