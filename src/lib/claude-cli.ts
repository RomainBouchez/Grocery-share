import "server-only";
import { spawn } from "child_process";

// Wrapper unique autour du CLI Claude Code (`claude -p`). Utilisé pour l'OCR du
// ticket (avec l'outil Read) et pour le matching sémantique (texte seul).

const CLAUDE_BIN = process.env.CLAUDE_CLI_BIN ?? "claude";
const DEFAULT_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS ?? 120_000);

export type RunClaudeOptions = {
  /** Prompt envoyé via stdin (évite tout souci de quoting shell). */
  prompt: string;
  /** Alias ("haiku", "sonnet") ou nom complet d'un modèle. Défaut du CLI sinon. */
  model?: string;
  /** Outils autorisés (ex: ["Read"] pour lire l'image). Aucun par défaut. */
  allowedTools?: string[];
  /** Répertoire de travail du process (ex: dossier de l'image). */
  cwd?: string;
  timeoutMs?: number;
};

/** Lance `claude -p`, renvoie la sortie standard. Rejette si code ≠ 0 / timeout. */
export function runClaude(opts: RunClaudeOptions): Promise<string> {
  const { prompt, model, allowedTools, cwd, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  const args = ["-p"];
  // Spread → chaque outil devient un argument distinct (sûr avec shell:true tant
  // que les noms n'ont pas d'espace, ce qui est le cas : "Read", "Edit"…).
  if (allowedTools && allowedTools.length > 0) args.push("--allowedTools", ...allowedTools);
  if (model) args.push("--model", model);

  return new Promise<string>((resolve, reject) => {
    // `shell: true` permet à Windows de résoudre `claude` → `claude.cmd` via
    // PATHEXT (sinon ENOENT). Sous Unix, résolution PATH habituelle.
    const child = spawn(CLAUDE_BIN, args, { cwd, shell: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Claude : délai dépassé."));
    }, timeoutMs);

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

    child.stdin.on("error", () => {}); // évite un crash si le process meurt tôt
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
