"use client";

import { useTransition, useState, useRef } from "react";
import { scanReceipt, confirmReceipt, type ScanDraft, type DraftExtra } from "@/lib/actions/receipt";
import { formatEuro } from "@/lib/utils";

type Member = { userId: string; name: string };

const FF: React.CSSProperties = {
  fontFamily: "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)",
  WebkitFontSmoothing: "antialiased",
};
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};
const BTN_ACCENT: React.CSSProperties = {
  width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
  background: "#5BD08A", color: "#0D0D0F", fontSize: 16, fontWeight: 700, fontFamily: "inherit",
  boxShadow: "inset 0 1.4px 0.6px rgba(255,255,255,0.4), 0 8px 20px rgba(91,208,138,0.26)",
};
const BTN_GLASS: React.CSSProperties = {
  padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer",
  background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  boxShadow: "inset 0 1.6px 0.8px -0.6px rgba(255,255,255,0.5)",
};

const CHIP_COLORS = ["#F0813F", "#7E91FF", "#C99BF0", "#5BD08A", "#F0C53F"];
function chipColor(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return CHIP_COLORS[h % CHIP_COLORS.length];
}

function extraKey(ex: DraftExtra, i: number) {
  return `${i}:${ex.rawLabel}`;
}

export function ReceiptScanner({
  groupId, members, currentUserId,
}: {
  groupId: string; members: Member[]; currentUserId: string;
}) {
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [scanning, startScan] = useTransition();
  const [confirming, startConfirm] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);

  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [extrasParticipants, setExtrasParticipants] = useState<Map<string, Set<string>>>(new Map());
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);

  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | undefined) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  }

  function handleScan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setScanError(null);
    startScan(async () => {
      const result = await scanReceipt(undefined, fd);
      if (!result.ok) { setScanError(result.error); return; }
      const sel = new Set(result.matched.map(m => m.itemId));
      setSelectedMatchIds(sel);
      const ep = new Map<string, Set<string>>();
      result.extras.forEach((ex, i) => { ep.set(extraKey(ex, i), new Set(members.map(m => m.userId))); });
      setExtrasParticipants(ep);
      setDraft(result);
      setPhase(1);
    });
  }

  function toggleMatchItem(itemId: string) {
    setSelectedMatchIds(prev => { const n = new Set(prev); if (n.has(itemId)) n.delete(itemId); else n.add(itemId); return n; });
  }

  function toggleExtraParticipant(key: string, userId: string) {
    setExtrasParticipants(prev => {
      const n = new Map(prev);
      const s = new Set(prev.get(key) ?? []);
      if (s.has(userId)) s.delete(userId); else s.add(userId);
      n.set(key, s); return n;
    });
  }

  function computeSummary() {
    if (!draft) return [];
    const matched = draft.matched.filter(m => selectedMatchIds.has(m.itemId));
    const matchedTotal = matched.reduce((s, m) => s + m.price * (m.quantity ?? 1), 0);
    const perMember = members.length > 0 ? matchedTotal / members.length : 0;
    const owes = new Map<string, number>();
    members.forEach(m => owes.set(m.userId, perMember));
    draft.extras.forEach((ex, i) => {
      const key = extraKey(ex, i);
      const pids = Array.from(extrasParticipants.get(key) ?? []);
      if (!pids.length) return;
      const share = ex.price / pids.length;
      pids.forEach(uid => owes.set(uid, (owes.get(uid) ?? 0) + share));
    });
    return members.map(m => ({ ...m, owes: owes.get(m.userId) ?? 0, isPayer: m.userId === paidByUserId }));
  }

  function handleConfirm() {
    if (!draft) return;
    const matched = draft.matched.filter(m => selectedMatchIds.has(m.itemId)).map(m => ({ itemId: m.itemId, rawLabel: m.rawLabel, price: m.price }));
    const extras = draft.extras.map((ex, i) => ({ rawLabel: ex.rawLabel, price: ex.price, participantIds: Array.from(extrasParticipants.get(extraKey(ex, i)) ?? []) })).filter(ex => ex.participantIds.length > 0);
    const fd = new FormData();
    fd.append("payload", JSON.stringify({ groupId, photoFile: draft.photoFile, paidByUserId, matched, extras }));
    startConfirm(() => confirmReceipt(fd));
  }

  // ── Phase 0 : Upload ──────────────────────────────────────────────────────
  if (phase === 0) {
    return (
      <form onSubmit={handleScan} style={{ ...FF, display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="groupId" value={groupId} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            ...GLASS, padding: "48px 24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            cursor: "pointer", textAlign: "center",
            border: preview ? "1px solid rgba(91,208,138,0.35)" : "1px dashed rgba(255,255,255,0.18)",
            background: preview ? "rgba(91,208,138,0.04)" : "rgba(255,255,255,0.03)",
          }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />
              <span style={{ fontSize: 13, color: "#9FE3BD" }}>Ticket prêt — Appuie sur Analyser</span>
            </>
          ) : (
            <>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
              </svg>
              <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>Prends le ticket en photo</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>ou sélectionne depuis la galerie</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" name="photo" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
        {scanError && (
          <div style={{ ...GLASS, padding: "13px 16px", background: "rgba(252,165,165,0.07)", borderColor: "rgba(252,165,165,0.2)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#FCA5A5" }}>{scanError}</p>
          </div>
        )}
        <button type="submit" disabled={scanning || !preview} style={{ ...BTN_ACCENT, opacity: scanning || !preview ? 0.5 : 1 }}>
          {scanning ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "rs-spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Analyse en cours…
            </span>
          ) : "Analyser le ticket"}
        </button>
        <style>{`@keyframes rs-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </form>
    );
  }

  // ── Phase 1 : Review ──────────────────────────────────────────────────────
  if (phase === 1 && draft) {
    const matchedTotal = draft.matched.filter(m => selectedMatchIds.has(m.itemId)).reduce((s, m) => s + m.price * (m.quantity ?? 1), 0);
    const extrasTotal = draft.extras.reduce((s, ex, i) => (extrasParticipants.get(extraKey(ex, i))?.size ?? 0) > 0 ? s + ex.price : s, 0);
    return (
      <div style={{ ...FF, display: "flex", flexDirection: "column", gap: 22 }}>
        {draft.matched.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
              Trouvés dans la liste ({draft.matched.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {draft.matched.map(m => {
                const sel = selectedMatchIds.has(m.itemId);
                return (
                  <div key={m.itemId} onClick={() => toggleMatchItem(m.itemId)} style={{
                    ...GLASS, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                    border: sel ? "1px solid rgba(91,208,138,0.38)" : "1px solid rgba(255,255,255,0.07)",
                    background: sel ? "rgba(91,208,138,0.06)" : "rgba(255,255,255,0.03)",
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: sel ? "#5BD08A" : "transparent", border: sel ? "none" : "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: sel ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)", textDecoration: sel ? "none" : "line-through" }}>{m.itemLabel}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{m.rawLabel}</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: sel ? "#9FE3BD" : "rgba(255,255,255,0.3)", flexShrink: 0 }}>{formatEuro(m.price * (m.quantity ?? 1))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {draft.extras.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
              Hors liste — qui participe ?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {draft.extras.map((ex, i) => {
                const key = extraKey(ex, i);
                const pids = extrasParticipants.get(key) ?? new Set<string>();
                return (
                  <div key={key} style={{ ...GLASS, padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{ex.rawLabel}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>{formatEuro(ex.price)}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {members.map(m => {
                        const on = pids.has(m.userId);
                        const c = chipColor(m.userId);
                        return (
                          <button key={m.userId} type="button" onClick={() => toggleExtraParticipant(key, m.userId)} style={{
                            padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                            background: on ? `${c}2A` : "rgba(255,255,255,0.06)",
                            color: on ? c : "rgba(255,255,255,0.4)",
                            outline: on ? `1.5px solid ${c}55` : "1.5px solid transparent",
                          }}>{m.name.split(" ")[0]}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ ...GLASS, padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Total confirmé</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#9FE3BD" }}>{formatEuro(matchedTotal + extrasTotal)}</div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", textAlign: "right", lineHeight: 1.5 }}>
            {selectedMatchIds.size}/{draft.matched.length} liste<br />+{draft.extras.filter((_, i) => (extrasParticipants.get(extraKey(_, i))?.size ?? 0) > 0).length} extras
          </div>
        </div>

        <button type="button" onClick={() => setPhase(2)} style={BTN_ACCENT}>Voir le récap dépenses →</button>
        <button type="button" onClick={() => { setPhase(0); setDraft(null); setScanError(null); setPreview(null); }} style={{ ...BTN_GLASS, width: "100%" }}>Recommencer</button>
      </div>
    );
  }

  // ── Phase 2 : Expense summary ─────────────────────────────────────────────
  if (phase === 2 && draft) {
    const summary = computeSummary();
    const total = summary.reduce((s, m) => s + m.owes, 0);
    const payer = summary.find(m => m.isPayer);
    const nonPayers = summary.filter(m => !m.isPayer);
    return (
      <div style={{ ...FF, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Récap des dépenses</div>

        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>Qui a payé ?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {members.map(m => {
              const on = m.userId === paidByUserId;
              const c = chipColor(m.userId);
              return (
                <button key={m.userId} type="button" onClick={() => setPaidByUserId(m.userId)} style={{
                  padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  background: on ? c : "rgba(255,255,255,0.07)",
                  color: on ? (c === "#5BD08A" ? "#0D0D0F" : "#fff") : "rgba(255,255,255,0.5)",
                }}>{m.name.split(" ")[0]}</button>
              );
            })}
          </div>
        </div>

        <div style={{ ...GLASS, padding: "16px 18px", textAlign: "center", border: "1px solid rgba(91,208,138,0.2)" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{payer?.name.split(" ")[0]} a avancé</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: "#9FE3BD" }}>{formatEuro(total)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {nonPayers.map(m => (
            <div key={m.userId} style={{ ...GLASS, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#FCA5A5" }}>doit {formatEuro(m.owes)}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>à {payer?.name.split(" ")[0]}</div>
              </div>
            </div>
          ))}
          {payer && (
            <div style={{ ...GLASS, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(91,208,138,0.22)" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{payer.name} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>(payeur)</span></span>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#9FE3BD" }}>ma part {formatEuro(payer.owes)}</div>
            </div>
          )}
        </div>

        <button type="button" onClick={handleConfirm} disabled={confirming} style={{ ...BTN_ACCENT, opacity: confirming ? 0.55 : 1 }}>
          {confirming ? "Enregistrement…" : "Valider les courses ✓"}
        </button>
        <button type="button" onClick={() => setPhase(1)} style={{ ...BTN_GLASS, width: "100%" }}>‹ Modifier</button>
      </div>
    );
  }

  return null;
}
