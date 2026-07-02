"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseDictation, parseRecipe, addParsedItems, type ParsedItem } from "@/lib/actions/premium";
import { AddItemForm } from "@/components/AddItemForm";
import type { TagView } from "@/lib/tags";
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

type Mode = "idle" | "listening" | "parsing" | "dictPreview" | "recipe";

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 999, cursor: "pointer",
    background: active ? ACCENT_SOFT : "#FFFFFF",
    border: `1.5px solid ${active ? "rgba(47,179,106,0.4)" : HAIRLINE}`,
    color: active ? ACCENT_TEXT : INK, fontSize: 12.5, fontWeight: 800, fontFamily: "inherit",
    boxShadow: active ? "none" : "0 0 0 1px rgba(30,26,20,0.03), 0 3px 8px rgba(30,26,20,0.05)",
  };
}

/**
 * Barre d'ajout premium (admin pour l'instant) : les chips Dicter / Recette
 * restent fixes en haut ; le corps bascule entre le champ d'ajout normal,
 * l'écoute vocale, l'aperçu de dictée à valider, et le panneau recette.
 */
export function PremiumTools({
  groupId, suggestions = [], tags = [], productTagMap = {},
}: {
  groupId: string;
  suggestions?: string[];
  tags?: TagView[];
  productTagMap?: Record<string, string>;
}) {
  const t = useTranslations("premium");
  const [mode, setMode] = useState<Mode>("idle");
  const [transcript, setTranscript] = useState("");
  const [dict, setDict] = useState<{ items: ParsedItem[]; checked: boolean[] } | null>(null);
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

  /* — Dictée vocale : écoute → aperçu cochable à valider — */

  function startDictation() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const recog = new Ctor();
    recog.lang = document.documentElement.lang === "en" ? "en-US" : "fr-FR";
    recog.interimResults = true;
    recog.continuous = true;
    finalRef.current = "";
    setTranscript("");
    setDict(null);

    recog.onresult = e => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      finalRef.current = text;
      setTranscript(text);
    };
    recog.onerror = () => { setMode("idle"); };
    recog.onend = () => {
      const text = finalRef.current.trim();
      if (!text) { setMode("idle"); return; }
      setMode("parsing");
      void (async () => {
        const res = await parseDictation(groupId, text);
        if ("error" in res) {
          showToast("err", res.error);
          setMode("idle");
        } else {
          // Aperçu à valider : tout coché par défaut.
          setDict({ items: res.items, checked: res.items.map(() => true) });
          setMode("dictPreview");
        }
        setTranscript("");
      })();
    };

    recogRef.current = recog;
    setMode("listening");
    recog.start();
  }

  function stopDictation() {
    recogRef.current?.stop(); // onend enchaîne le parsing puis l'aperçu
  }

  async function confirmDictation() {
    if (!dict) return;
    const selected = dict.items.filter((_, i) => dict.checked[i]);
    if (selected.length === 0) { setMode("idle"); setDict(null); return; }
    setMode("parsing");
    const { added } = await addParsedItems(groupId, selected, true);
    setDict(null);
    setMode("idle");
    showToast("ok", t("dictationAdded", { count: added }));
  }

  /* — Bascule des chips — */

  function onClickDictate() {
    if (mode === "listening") { stopDictation(); return; }
    startDictation();
  }
  function onClickRecipe() {
    setMode(m => (m === "recipe" ? "idle" : "recipe"));
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

      {/* Chips fixes — toujours visibles */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        {speechAvailable && (
          <button type="button" onClick={onClickDictate} style={chipStyle(mode === "listening" || mode === "dictPreview")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mode === "listening" || mode === "dictPreview" ? ACCENT_TEXT : ACCENT_TEXT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
            </svg>
            {mode === "listening" ? t("stop") : t("dictate")}
          </button>
        )}
        <button type="button" onClick={onClickRecipe} style={chipStyle(mode === "recipe")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT_TEXT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" />
          </svg>
          {t("importRecipe")}
        </button>
        <span style={{
          marginLeft: "auto", padding: "3px 9px", borderRadius: 999,
          background: "#FDF0D6", color: "#D9921C", fontSize: 10, fontWeight: 900, letterSpacing: "0.05em",
        }}>
          {t("premiumBadge")}
        </span>
      </div>

      {/* Corps : bascule selon le mode */}
      {mode === "recipe" ? (
        <RecipePanel groupId={groupId} onClose={() => setMode("idle")}
          onDone={(added) => { setMode("idle"); showToast("ok", t("recipeAdded", { count: added })); }} />
      ) : mode === "listening" ? (
        <ListeningPanel transcript={transcript} onStop={stopDictation} label={t("listening")} stopLabel={t("done")} />
      ) : mode === "parsing" ? (
        <div style={{
          padding: "14px 16px", borderRadius: 14, background: "#FFFFFF",
          border: `1.5px solid ${HAIRLINE}`, fontSize: 13, fontWeight: 700, color: INK_MUTED, textAlign: "center",
        }}>
          {t("parsing")}
        </div>
      ) : mode === "dictPreview" && dict ? (
        <DictPreview
          items={dict.items}
          checked={dict.checked}
          onToggle={(i) => setDict(d => d ? { ...d, checked: d.checked.map((c, j) => j === i ? !c : c) } : d)}
          onCancel={() => { setDict(null); setMode("idle"); }}
          onConfirm={confirmDictation}
          title={t("dictPreviewTitle")}
          hint={t("previewHint")}
          cancelLabel={t("cancel")}
          addLabel={t("addSelected", { count: dict.checked.filter(Boolean).length })}
        />
      ) : (
        <AddItemForm groupId={groupId} suggestions={suggestions} tags={tags} productTagMap={productTagMap} />
      )}
    </div>
  );
}

/* ============================================================
   Panneau d'écoute vocale
   ============================================================ */

function ListeningPanel({
  transcript, onStop, label, stopLabel,
}: {
  transcript: string; onStop: () => void; label: string; stopLabel: string;
}) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 14,
      background: "#FFFFFF", border: `1.5px solid rgba(47,179,106,0.4)`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: "50%", background: DANGER, flexShrink: 0,
        animation: "pt-pulse 1.1s ease-in-out infinite",
      }} />
      <style>{`@keyframes pt-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: transcript ? INK_STRONG : INK_FAINT, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {transcript || label}
      </span>
      <button type="button" onClick={onStop} style={{
        flexShrink: 0, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
        background: ACCENT, color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: "inherit",
      }}>
        {stopLabel}
      </button>
    </div>
  );
}

/* ============================================================
   Aperçu de dictée à valider (cochable simple)
   ============================================================ */

function DictPreview({
  items, checked, onToggle, onCancel, onConfirm, title, hint, cancelLabel, addLabel,
}: {
  items: ParsedItem[]; checked: boolean[];
  onToggle: (i: number) => void; onCancel: () => void; onConfirm: () => void;
  title: string; hint: string; cancelLabel: string; addLabel: string;
}) {
  return (
    <div style={{ padding: 14, borderRadius: 16, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: CARD_SHADOW }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK_STRONG, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: INK_FAINT, marginBottom: 6 }}>{hint}</div>
      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {items.map((it, i) => (
          <CheckableRow key={i} label={it.label} quantity={it.quantity} unit={it.unit ?? null}
            checked={checked[i]} onClick={() => onToggle(i)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onCancel} style={{ ...btnCancel, flex: 1, minHeight: 42, fontSize: 13 }}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}
          style={{ ...btnPrimary, flex: 1.6, minHeight: 42, fontSize: 13.5 }}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

/* Ligne cochable réutilisée (dictée + recette). */
function CheckableRow({
  label, quantity, unit, checked, onClick,
}: {
  label: string; quantity: number; unit: "g" | null; checked: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9, padding: "7px 2px",
      borderBottom: `1px solid ${HAIRLINE}`, cursor: "pointer",
    }}>
      <span style={checkbox(checked, 20)}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        )}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: checked ? INK : INK_FAINT }}>{label}</span>
      {(quantity > 1 || unit === "g") && (
        <span style={{ fontSize: 11.5, fontWeight: 800, color: ACCENT_TEXT, background: ACCENT_SOFT, padding: "1px 7px", borderRadius: 8, whiteSpace: "nowrap" }}>
          {formatQuantity(quantity, unit)}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   Panneau d'import de recette : saisie → aperçu cochable → ajout
   avec sélecteur de parts qui met les quantités à l'échelle
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
    <div style={{ padding: 14, borderRadius: 16, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: CARD_SHADOW }}>
      {!preview ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: INK_STRONG, marginBottom: 8 }}>{t("recipeTitle")}</div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t("recipePlaceholder")}
            rows={3}
            autoFocus
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
            {preview.items.map((it, i) => (
              <CheckableRow key={i} label={it.label} quantity={scaled(it)} unit={it.unit ?? null}
                checked={preview.checked[i]}
                onClick={() => setPreview(p => p ? { ...p, checked: p.checked.map((c, j) => j === i ? !c : c) } : p)} />
            ))}
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
