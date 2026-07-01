"use client";

import { useTransition, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { scanReceipt, confirmReceipt, type ScanDraft, type DraftExtra } from "@/lib/actions/receipt";
import { compressImage } from "@/lib/compressImage";
import { formatEuro } from "@/lib/utils";
import { Camera } from "@/lib/icons";
import {
  btnPrimary, btnSecondary, card, tintFor,
  ACCENT, ACCENT_SOFT, ACCENT_TEXT, INK_STRONG, INK, INK_MUTED, INK_FAINT, INK_DONE, HAIRLINE, DANGER, DANGER_SOFT, FONT,
} from "@/lib/ui";

type Member = { userId: string; name: string };

const FF: React.CSSProperties = { fontFamily: FONT, WebkitFontSmoothing: "antialiased" };
const SURFACE: React.CSSProperties = {
  background: "#FFFFFF", border: "1.5px solid #fff", borderRadius: 18,
  boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 16px rgba(30,26,20,0.06)",
};
const BTN_ACCENT: React.CSSProperties = { ...btnPrimary, width: "100%", borderRadius: 16 };
const BTN_SOFT: React.CSSProperties = { ...btnSecondary, width: "100%", borderRadius: 16 };

function extraKey(ex: DraftExtra, i: number) {
  return `${i}:${ex.rawLabel}`;
}

export function ReceiptScanner({
  groupId, members, currentUserId,
}: {
  groupId: string; members: Member[]; currentUserId: string;
}) {
  const tr = useTranslations("receipt");
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
    const file = fileRef.current?.files?.[0];
    setScanError(null);
    startScan(async () => {
      // Ré-encode en JPEG côté client (les photos iPhone sont en HEIC, illisible
      // par l'OCR serveur). Repli sur le fichier brut si la conversion échoue.
      const fd = new FormData();
      fd.append("groupId", groupId);
      if (file) {
        let photo: File = file;
        try {
          photo = await compressImage(file);
        } catch {
          /* navigateur incapable de décoder le format → on envoie l'original */
        }
        fd.append("photo", photo);
      }
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

  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: INK_FAINT, marginBottom: 12 };

  // ── Phase 0 : Upload ──────────────────────────────────────────────────────
  if (phase === 0) {
    return (
      <form onSubmit={handleScan} style={{ ...FF, display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="groupId" value={groupId} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            ...SURFACE, padding: "48px 24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            cursor: "pointer", textAlign: "center",
            border: preview ? "2px solid rgba(47,179,106,0.45)" : "2px dashed rgba(28,25,20,0.16)",
            background: preview ? ACCENT_SOFT : "#fff",
            boxShadow: preview ? "none" : "0 0 0 1px rgba(30,26,20,0.04)",
          }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 12, objectFit: "contain" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT_TEXT }}>{tr("ready")}</span>
            </>
          ) : (
            <>
              <Camera weight="Linear" size={44} color={INK_FAINT} />
              <span style={{ fontSize: 16, fontWeight: 800, color: INK_STRONG }}>{tr("takePhoto")}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: INK_FAINT }}>{tr("orGallery")}</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" name="photo" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
        {scanError && (
          <div style={{ padding: "13px 16px", borderRadius: 14, background: DANGER_SOFT, border: `1.5px solid rgba(232,80,58,0.3)` }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DANGER }}>{scanError}</p>
          </div>
        )}
        <button type="submit" disabled={scanning || !preview} style={{ ...BTN_ACCENT, opacity: scanning || !preview ? 0.5 : 1 }}>
          {scanning ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "rs-spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              {tr("analyzing")}
            </span>
          ) : tr("analyze")}
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
            <div style={sectionLabel}>{tr("foundInList", { count: draft.matched.length })}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {draft.matched.map(m => {
                const sel = selectedMatchIds.has(m.itemId);
                return (
                  <div key={m.itemId} onClick={() => toggleMatchItem(m.itemId)} style={{
                    ...SURFACE, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                    border: sel ? "1.5px solid rgba(47,179,106,0.45)" : "1.5px solid #fff",
                    background: sel ? ACCENT_SOFT : "#fff",
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: 8, flexShrink: 0, background: sel ? ACCENT : "#fff", border: sel ? "none" : "2px solid rgba(28,25,20,0.14)", boxShadow: sel ? "inset 0 -1.5px 0 rgba(0,0,0,0.12)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: sel ? INK : INK_DONE, textDecoration: sel ? "none" : "line-through" }}>{m.itemLabel}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: INK_FAINT, marginTop: 1 }}>{m.rawLabel}</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: sel ? ACCENT_TEXT : INK_FAINT, flexShrink: 0 }}>{formatEuro(m.price * (m.quantity ?? 1))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {draft.extras.length > 0 && (
          <div>
            <div style={sectionLabel}>{tr("offListWho")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {draft.extras.map((ex, i) => {
                const key = extraKey(ex, i);
                const pids = extrasParticipants.get(key) ?? new Set<string>();
                return (
                  <div key={key} style={{ ...SURFACE, padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: INK_STRONG }}>{ex.rawLabel}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: INK_MUTED }}>{formatEuro(ex.price)}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {members.map(m => {
                        const on = pids.has(m.userId);
                        const t = tintFor(m.userId);
                        return (
                          <button key={m.userId} type="button" onClick={() => toggleExtraParticipant(key, m.userId)} style={{
                            padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: 800, fontFamily: "inherit",
                            background: on ? t.tint : "#F5F5F5",
                            color: on ? t.text : INK_FAINT,
                            outline: on ? `1.5px solid ${t.text}55` : "1.5px solid transparent",
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

        <div style={{ ...card, padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: INK_FAINT }}>{tr("confirmedTotal")}</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", color: INK_STRONG }}>{formatEuro(matchedTotal + extrasTotal)}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: INK_FAINT, textAlign: "right", lineHeight: 1.5 }}>
            {tr("listCount", { selected: selectedMatchIds.size, total: draft.matched.length })}<br />{tr("extrasCount", { count: draft.extras.filter((_, i) => (extrasParticipants.get(extraKey(_, i))?.size ?? 0) > 0).length })}
          </div>
        </div>

        <button type="button" onClick={() => setPhase(2)} style={BTN_ACCENT}>{tr("seeSummary")}</button>
        <button type="button" onClick={() => { setPhase(0); setDraft(null); setScanError(null); setPreview(null); }} style={BTN_SOFT}>{tr("restart")}</button>
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
        <div style={sectionLabel}>{tr("summaryTitle")}</div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, marginBottom: 8 }}>{tr("whoPaid")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {members.map(m => {
              const on = m.userId === paidByUserId;
              const t = tintFor(m.userId);
              return (
                <button key={m.userId} type="button" onClick={() => setPaidByUserId(m.userId)} style={{
                  padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                  fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                  background: on ? t.avatar : "#fff",
                  border: on ? "1.5px solid rgba(0,0,0,0.06)" : `1.5px solid ${HAIRLINE}`,
                  color: on ? "#fff" : INK_MUTED,
                  boxShadow: on ? "inset 0 -1.5px 0 rgba(0,0,0,0.12)" : "0 0 0 1px rgba(30,26,20,0.04)",
                }}>{m.name.split(" ")[0]}</button>
              );
            })}
          </div>
        </div>

        <div style={{ ...card, padding: "18px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK_FAINT, marginBottom: 2 }}>{tr("advanced", { name: payer?.name.split(" ")[0] ?? "" })}</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, lineHeight: 0.95 }}>
            <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", color: INK_STRONG }}>{formatEuro(total)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {nonPayers.map(m => (
            <div key={m.userId} style={{ ...SURFACE, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: INK_STRONG }}>{m.name}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: DANGER }}>{tr("owes", { amount: formatEuro(m.owes) })}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: INK_FAINT }}>{tr("to", { name: payer?.name.split(" ")[0] ?? "" })}</div>
              </div>
            </div>
          ))}
          {payer && (
            <div style={{ ...SURFACE, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: ACCENT_SOFT, border: "1.5px solid rgba(47,179,106,0.25)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: INK_STRONG }}>{payer.name} <span style={{ fontSize: 11, fontWeight: 600, color: INK_FAINT }}>{tr("payer")}</span></span>
              <div style={{ fontSize: 17, fontWeight: 900, color: ACCENT_TEXT }}>{tr("myShare", { amount: formatEuro(payer.owes) })}</div>
            </div>
          )}
        </div>

        <button type="button" onClick={handleConfirm} disabled={confirming} style={{ ...BTN_ACCENT, opacity: confirming ? 0.55 : 1 }}>
          {confirming ? tr("saving") : tr("confirmShopping")}
        </button>
        <button type="button" onClick={() => setPhase(1)} style={BTN_SOFT}>{tr("edit")}</button>
      </div>
    );
  }

  return null;
}
