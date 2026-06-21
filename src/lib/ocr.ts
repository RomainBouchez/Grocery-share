import "server-only";
import { spawn } from "child_process";
import path from "path";
import type { OcrLine } from "@/lib/matching";

const CLAUDE_BIN = process.env.CLAUDE_CLI_BIN ?? "claude";
const OCR_MODEL = process.env.CLAUDE_OCR_MODEL; // ex: "claude-sonnet-4-6" (optionnel)
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS ?? 120_000);

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

/**
 * Lance `claude -p` sur l'image du ticket et renvoie les lignes extraites.
 * Le CLI Claude Code lit l'image via son outil Read : on exécute donc le
 * process avec `cwd` = dossier de l'image et on la référence par son nom.
 */
export async function extractReceiptItems(imagePath: string): Promise<OcrLine[]> {
  const dir = path.dirname(imagePath);
  const file = `./${path.basename(imagePath)}`;
  const prompt = PROMPT.replace("{FILE}", file);

  const args = ["-p", prompt, "--allowedTools", "Read"];
  if (OCR_MODEL) args.push("--model", OCR_MODEL);

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, { cwd: dir });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Analyse du ticket : délai dépassé."));
    }, OCR_TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Impossible de lancer Claude (${CLAUDE_BIN}) : ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`Claude a échoué (code ${code}). ${err.slice(0, 300)}`));
    });
  });

  return coerceLines(extractJsonArray(stdout));
}
