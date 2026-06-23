import "server-only";
import path from "path";
import { runClaude } from "@/lib/claude-cli";
import type { MatchResult, OcrLine, PlannedItem } from "@/lib/matching";

const OCR_MODEL = process.env.CLAUDE_OCR_MODEL; // ex: "claude-sonnet-4-6" (optionnel)

const PROMPT = [
  "Lis le ticket de caisse dans le fichier {FILE}.",
  "Renvoie UNIQUEMENT un tableau JSON des articles achetés, au format exact :",
  '[{"label":"LIBELLE TEL QUEL","prix":0.00}]',
  "Règles :",
  "- un objet par article, dans l'ordre du ticket ;",
  "- `prix` = prix payé pour la ligne, en nombre (point décimal) ;",
  "- ignore les lignes de total, sous-total, TVA, remises globales, moyen de paiement ;",
  "- n'ajoute aucun texte, aucune explication, aucun bloc de code autour du JSON.",
].join("\n");

/** Extrait le premier tableau JSON présent dans une sortie texte. */
function extractJsonArray(raw: string): unknown {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Réponse de Claude sans tableau JSON exploitable.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function coerceLines(parsed: unknown): OcrLine[] {
  if (!Array.isArray(parsed)) throw new Error("Le JSON du ticket n'est pas un tableau.");
  const lines: OcrLine[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const label = String((entry as Record<string, unknown>).label ?? "").trim();
    const prixRaw = (entry as Record<string, unknown>).prix;
    const prix = typeof prixRaw === "number" ? prixRaw : parseFloat(String(prixRaw).replace(",", "."));
    if (label && Number.isFinite(prix)) lines.push({ label, prix: Math.round(prix * 100) / 100 });
  }
  return lines;
}

/** Regroupe les lignes avec le même libellé (insensible à la casse) en additionnant leurs prix et en comptant la quantité. */
function mergeOcrDuplicates(lines: OcrLine[]): OcrLine[] {
  const map = new Map<string, OcrLine>();
  for (const line of lines) {
    const key = line.label.trim().toUpperCase();
    const existing = map.get(key);
    if (existing) {
      existing.prix = Math.round((existing.prix + line.prix) * 100) / 100;
      existing.quantity = (existing.quantity ?? 1) + 1;
    } else {
      map.set(key, { ...line });
    }
  }
  return Array.from(map.values());
}

/**
 * Lance `claude -p` sur l'image du ticket et renvoie les lignes extraites.
 * Le CLI Claude Code lit l'image via son outil Read : on exécute donc le
 * process avec `cwd` = dossier de l'image et on la référence par son nom.
 */
export async function extractReceiptItems(imagePath: string): Promise<OcrLine[]> {
  const dir = path.dirname(imagePath);
  const file = `./${path.basename(imagePath)}`;
  const prompt = PROMPT.replace("{FILE}", file);

  // L'image est lue par l'outil Read du CLI, d'où `cwd` = dossier de l'image.
  const stdout = await runClaude({
    prompt,
    allowedTools: ["Read"],
    cwd: dir,
    model: OCR_MODEL,
  });

  return mergeOcrDuplicates(coerceLines(extractJsonArray(stdout)));
}

// ---------------------------------------------------------------------------
// Lecture + matching en UN seul appel (rapide : un seul démarrage du CLI)
// ---------------------------------------------------------------------------

const COMBINED_PROMPT = [
  "Lis le ticket de caisse dans le fichier {FILE}.",
  "Pour chaque article acheté, associe-le si possible à un article de la liste",
  "de courses ci-dessous, en raisonnant sur le SENS (une marque correspond à sa",
  "catégorie : RedBull/Celsius = boisson énergisante ; Nestlé Cookie Crisp =",
  "céréales ; Alpro = produit végétal/soja ; JR Haché = viande hachée).",
  "",
  "ARTICLES DE LA LISTE (id: libellé) :",
  "{PLANNED}",
  "",
  "Renvoie UNIQUEMENT un tableau JSON, un objet par article distinct du ticket,",
  "au format exact :",
  '[{"label":"LIBELLE TEL QUEL","prix":0.00,"quantity":1,"itemId":"id-ou-null"}]',
  "Règles :",
  "- un objet par article, dans l'ordre du ticket ; si le même article apparaît",
  "  plusieurs fois, regroupe-le en un seul objet avec quantity = nombre",
  "  d'occurrences et prix = somme des prix de ces lignes ;",
  "- `prix` = nombre (point décimal) ; `quantity` = entier ≥ 1 ;",
  "- `itemId` = l'id de l'article de la liste correspondant, ou null si aucun ne",
  "  correspond ; chaque id n'est utilisé qu'une seule fois au maximum ;",
  "- ignore les lignes de total, sous-total, TVA, remises globales, paiement ;",
  "- n'ajoute aucun texte, aucune explication, aucun bloc de code autour du JSON.",
].join("\n");

type CombinedItem = { label: string; prix: number; quantity?: number; itemId: string | null };

function coerceCombined(parsed: unknown): CombinedItem[] {
  if (!Array.isArray(parsed)) throw new Error("Le JSON du ticket n'est pas un tableau.");
  const items: CombinedItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const label = String(e.label ?? "").trim();
    const prix =
      typeof e.prix === "number" ? e.prix : parseFloat(String(e.prix).replace(",", "."));
    if (!label || !Number.isFinite(prix)) continue;
    const qRaw = Number(e.quantity);
    const quantity = Number.isInteger(qRaw) && qRaw > 1 ? qRaw : undefined;
    const idRaw = e.itemId;
    const itemId = typeof idRaw === "string" && idRaw && idRaw !== "null" ? idRaw : null;
    items.push({ label, prix: Math.round(prix * 100) / 100, quantity, itemId });
  }
  return items;
}

/**
 * Lit le ticket ET l'associe à la liste planifiée en UN seul appel `claude -p`.
 * Bien plus rapide que deux appels successifs (un seul démarrage du CLI), et le
 * matching est sémantique (porté par le modèle), pas lexical.
 */
export async function extractAndMatchReceipt(
  imagePath: string,
  planned: PlannedItem[],
): Promise<{ lines: OcrLine[]; result: MatchResult }> {
  const dir = path.dirname(imagePath);
  const file = `./${path.basename(imagePath)}`;
  const plannedBlock =
    planned.length > 0
      ? planned.map((p) => `${p.id}: ${p.label}`).join("\n")
      : "(aucun article planifié — mets itemId à null partout)";
  const prompt = COMBINED_PROMPT.replace("{FILE}", file).replace("{PLANNED}", plannedBlock);

  const stdout = await runClaude({ prompt, allowedTools: ["Read"], cwd: dir, model: OCR_MODEL });
  const items = coerceCombined(extractJsonArray(stdout));

  const plannedIds = new Set(planned.map((p) => p.id));
  const usedItem = new Set<string>();
  const lines: OcrLine[] = [];
  const matches: MatchResult["matches"] = [];

  items.forEach((it) => {
    const ocrIndex = lines.length;
    lines.push({ label: it.label, prix: it.prix, quantity: it.quantity });
    // Garde le match seulement si l'id existe vraiment et n'a pas déjà servi.
    if (it.itemId && plannedIds.has(it.itemId) && !usedItem.has(it.itemId)) {
      usedItem.add(it.itemId);
      matches.push({ ocrIndex, itemId: it.itemId, score: 1 });
    }
  });

  const matchedOcr = new Set(matches.map((m) => m.ocrIndex));
  const extras = lines.map((_, i) => i).filter((i) => !matchedOcr.has(i));
  const unmatchedItemIds = planned.map((p) => p.id).filter((id) => !usedItem.has(id));

  return { lines, result: { matches, extras, unmatchedItemIds } };
}
