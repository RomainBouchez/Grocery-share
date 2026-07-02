"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseDictation, parseRecipe, addParsedItems, type ParsedItem } from "@/lib/actions/premium";
import { formatQuantity, scaleQuantity } from "@/lib/units";
import {
  input, btnPrimary, btnCancel, checkbox,
  ACCENT, ACCENT_SOFT, ACCENT_TEXT, INK, INK_STRONG, INK_MUTED, INK_FAINT,
  DANGER, DANGER_SOFT, HAIRLINE, CARD_SHADOW,
} from "@/lib/ui";

/* Reconnaissance vocale du navigateur (Web Speech API), si disponible. */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

const CHIP: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 999, cursor: "pointer",
  background: "#FFFFFF", border: `1.5px solid ${HAIRLINE}`,
  color: INK, fontSize: 12.5, fontWeight: 800, fontFamily: "inherit",
  boxShadow: "0 0 0 1px rgba(30,26,20,0.03), 0 3px 8px rgba(30,26,20,0.05)",
};

/**
 * Outils premium (admin pour l'instant) : dictée vocale rapide + import de
 * recette. Rendu au-dessus de la barre d'ajout du groupe.
 */
export function PremiumTools({ groupId }: { groupId: string }) {
  const t = useTranslations("premium");
  const [mode, setMode] = useState<"idle" | "listening" | "parsing" | "recipe">("idle");
  const [transcript, setTranscript] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSpeechAvailable(getSpeechRecognition() !== null);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  /* — Dictée vocale — */

  function startDictation() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const recog = new Ctor();
    recog.lang = document.documentElement.lang === "en" ? "en-US" : "fr-FR";
    recog.interimResults = true;
    recog.continuous = true;
    finalRef.current = "";
    setTranscript("");

    recog.onresult = e => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      finalRef.current = text;
      setTranscript(text);
    };
    recog.onerror = () => { setMode("idle"); };
    recog.onend = () => {
      // Fin (bouton stop ou silence) : envoie la dictée au parseur.
      const text = finalRef.current.trim();
      if (!text) { setMode("idle"); return; }
      setMode("parsing");
      void (async () => {
        const res = await parseDictation(groupId, text);
        if ("error" in res) {
          showToast("err", res.error);
        } else {
          const { added } = await addParsedItems(groupId, res.items, true);
          showToast("ok", t("dictationAdded", { count: added }));
        }
        setMode("idle");
        setTranscript("");
      })();
    };

    recogRef.current = recog;
    setMode("listening");
    recog.start();
  }

  function stopDictation() {
    recogRef.current?.stop(); // onend enchaîne le parsing
  }

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* Toast résultat */}
      {toast && (
        <div style={{
          marginBottom: 8, padding: "10px 14px", borderRadius: 12,
          background: toast.kind === "ok" ? ACCENT_SOFT : DANGER_SOFT,
          border: `1.5px solid ${toast.kind === "ok" ? "rgba(47,179,106,0.3)" : "rgba(232,80,58,0.3)"}`,
          fontSize: 12.5, fontWeight: 700,
          color: toast.kind === "ok" ? ACCENT_TEXT : DANGER,
        }}>
          {toast.text}
        </div>
      )}

      {/* Écoute en cours : transcript live + stop */}
      {mode === "listening" && (
        <div style={{
          marginBottom: 8, padding: "12px 14px", borderRadius: 14,
          background: "#FFFFFF", border: `1.5px solid rgba(47,179,106,0.4)`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%", background: DANGER, flexShrink: 0,
            animation: "pt-pulse 1.1s ease-in-out infinite",
          }} />
          <style>{`@keyframes pt-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: transcript ? INK_STRONG : INK_FAINT, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {transcript || t("listening")}
          </span>
          <button type="button" onClick={stopDictation} style={{
            flexShrink: 0, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
            background: ACCENT, color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: "inherit",
          }}>
            {t("done")}
          </button>
        </div>
      )}

      {/* Rangée de boutons premium */}
      {(mode === "idle" || mode === "parsing") && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {speechAvailable && (
            <button type="button" disabled={mode === "parsing"} onClick={startDictation}
              style={{ ...CHIP, opacity: mode === "parsing" ? 0.55 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT_TEXT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
              </svg>
              {mode === "parsing" ? t("parsing") : t("dictate")}
            </button>
          )}
          <button type="button" disabled={mode === "parsing"} onClick={() => setMode("recipe")}
            style={{ ...CHIP, opacity: mode === "parsing" ? 0.55 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT_TEXT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" />
            </svg>
            {t("importRecipe")}
          </button>
          <span style={{
            alignSelf: "center", marginLeft: "auto", padding: "3px 9px", borderRadius: 999,
            background: "#FDF0D6", color: "#D9921C", fontSize: 10, fontWeight: 900, letterSpacing: "0.05em",
          }}>
            {t("premiumBadge")}
          </span>
        </div>
      )}

      {/* Panneau import recette */}
      {mode === "recipe" && (
        <RecipePanel
          groupId={groupId}
          onClose={() => setMode("idle")}
          onDone={(added) => { setMode("idle"); showToast("ok", t("recipeAdded", { count: added })); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Panneau d'import de recette : saisie → aperçu cochable → ajout
   ============================================================ */

function RecipePanel({
  groupId, onClose, onDone,
}: {
  groupId: string;
  onClose: () => void;
  onDone: (added: number) => void;
}) {
  const t = useTranslations("premium");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // items = quantités de BASE (pour baseServings parts) ; targetServings ajuste.
  const [preview, setPreview] = useState<{
    title?: string; items: ParsedItem[]; checked: boolean[];
    baseServings: number; targetServings: number;
  } | null>(null);

  async function analyze() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await parseRecipe(groupId, value);
    setBusy(false);
    if ("error" in res) { setError(res.error); return; }
    const base = res.servings ?? 4;
    setPreview({ title: res.title, items: res.items, checked: res.items.map(() => true), baseServings: base, targetServings: base });
  }

  /** Quantité d'un item ramenée au nombre de parts cible. */
  function scaled(it: ParsedItem): number {
    if (!preview) return it.quantity;
    return scaleQuantity(it.quantity, preview.baseServings, preview.targetServings, it.unit ?? null);
  }

  async function addSelection() {
    if (!preview || busy) return;
    const selected = preview.items
      .filter((_, i) => preview.checked[i])
      .map(it => ({ ...it, quantity: scaled(it) }));
    if (selected.length === 0) { onClose(); return; }
    setBusy(true);
    const { added } = await addParsedItems(groupId, selected, false);
    setBusy(false);
    onDone(added);
  }

  return (
    <div style={{
      marginBottom: 8, padding: 14, borderRadius: 16,
      background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: CARD_SHADOW,
    }}>
      {!preview ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: INK_STRONG, marginBottom: 8 }}>{t("recipeTitle")}</div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t("recipePlaceholder")}
            rows={3}
            style={{ ...input, resize: "vertical", minHeight: 64, fontSize: 13.5 }}
          />
          {error && (
            <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: DANGER }}>{error}</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={{ ...btnCancel, flex: 1, minHeight: 42, fontSize: 13 }}>
              {t("cancel")}
            </button>
            <button type="button" onClick={analyze} disabled={busy || !value.trim()}
              style={{ ...btnPrimary, flex: 1.6, minHeight: 42, fontSize: 13.5, opacity: busy || !value.trim() ? 0.55 : 1, cursor: busy ? "wait" : "pointer" }}>
              {busy ? t("analyzing") : t("analyze")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: INK_STRONG, marginBottom: 10 }}>
            {preview.title || t("recipeTitle")}
          </div>

          {/* Sélecteur de parts : ajuste toutes les quantités */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            padding: "9px 12px", marginBottom: 10, borderRadius: 12,
            background: ACCENT_SOFT, border: "1.5px solid rgba(47,179,106,0.25)",
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: ACCENT_TEXT }}>
              {t("servings", { count: preview.targetServings })}
            </span>
            <div style={{ display: "flex", alignItems: "center", borderRadius: 10, border: `1.5px solid rgba(47,179,106,0.3)`, background: "#fff", overflow: "hidden" }}>
              <button type="button"
                onClick={() => setPreview(p => p ? { ...p, targetServings: Math.max(1, p.targetServings - 1) } : p)}
                style={{ padding: "5px 12px", background: "none", border: "none", cursor: "pointer", color: ACCENT_TEXT, fontFamily: "inherit", fontWeight: 800, fontSize: 16, lineHeight: 1 }}>−</button>
              <span style={{ minWidth: 26, textAlign: "center", fontSize: 14, fontWeight: 900, color: ACCENT_TEXT }}>{preview.targetServings}</span>
              <button type="button"
                onClick={() => setPreview(p => p ? { ...p, targetServings: Math.min(50, p.targetServings + 1) } : p)}
                style={{ padding: "5px 12px", background: "none", border: "none", cursor: "pointer", color: ACCENT_TEXT, fontFamily: "inherit", fontWeight: 800, fontSize: 16, lineHeight: 1 }}>+</button>
            </div>
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 600, color: INK_FAINT, marginBottom: 6 }}>
            {t("previewHint")}
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {preview.items.map((it, i) => {
              const q = scaled(it);
              return (
              <div key={i}
                onClick={() => setPreview(p => p ? { ...p, checked: p.checked.map((c, j) => j === i ? !c : c) } : p)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 2px",
                  borderBottom: `1px solid ${HAIRLINE}`, cursor: "pointer",
                }}>
                <span style={checkbox(preview.checked[i], 20)}>
                  {preview.checked[i] && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: preview.checked[i] ? INK : INK_FAINT }}>
                  {it.label}
                </span>
                {(q > 1 || it.unit === "g") && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: ACCENT_TEXT, background: ACCENT_SOFT, padding: "1px 7px", borderRadius: 8, whiteSpace: "nowrap" }}>
                    {formatQuantity(q, it.unit ?? null)}
                  </span>
                )}
              </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setPreview(null)} style={{ ...btnCancel, flex: 1, minHeight: 42, fontSize: 13 }}>
              {t("back")}
            </button>
            <button type="button" onClick={addSelection} disabled={busy}
              style={{ ...btnPrimary, flex: 1.6, minHeight: 42, fontSize: 13.5, opacity: busy ? 0.55 : 1, cursor: busy ? "wait" : "pointer" }}>
              {busy ? t("adding") : t("addSelected", { count: preview.checked.filter(Boolean).length })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
