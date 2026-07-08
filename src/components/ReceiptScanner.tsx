"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { scanReceipt, confirmReceipt, type ScanDraft, type DraftExtra } from "@/lib/actions/receipt";
import { compressImage } from "@/lib/compressImage";
import { formatEuro, initials } from "@/lib/utils";
import { Camera } from "@/lib/icons";
import {
  btnPrimary, btnSecondary, card, tintFor, avatarStyle,
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

/**
 * Éditeur "combien de parts prend cette personne" par produit — même mécanique
 * que ItemCard (0 = ne participe pas, sinon N/Total + stepper), pour que "2/3"
 * se lise pareil partout dans l'app.
 */
function ProductPartsEditor({
  members, getParts, totalParts, onChange, addShareLabel,
}: {
  members: Member[]; getParts: (userId: string) => number; totalParts: number;
  onChange: (userId: string, next: number) => void; addShareLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {members.map(m => {
        const parts = getParts(m.userId);
        const t = tintFor(m.userId);
        return (
          <div key={m.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={avatarStyle(t.avatar, 24)}>{initials(m.name)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name.split(" ")[0]}</span>
            </div>
            {parts > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: INK_FAINT, marginRight: 2 }}>{totalParts > 0 && `${parts}/${totalParts}`}</span>
                <div style={{ display: "flex", alignItems: "center", borderRadius: 10, border: `1.5px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden" }}>
                  <button type="button" onClick={() => onChange(m.userId, parts - 1)} style={{ padding: "3px 9px", background: "none", border: "none", cursor: "pointer", color: INK_MUTED, fontFamily: "inherit", fontWeight: 700 }}>−</button>
                  <span style={{ width: 18, textAlign: "center", fontSize: 13, fontWeight: 800, color: INK_STRONG }}>{parts}</span>
                  <button type="button" onClick={() => onChange(m.userId, parts + 1)} style={{ padding: "3px 9px", background: "none", border: "none", cursor: "pointer", color: INK_MUTED, fontFamily: "inherit", fontWeight: 700 }}>+</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => onChange(m.userId, 1)} style={{
                flexShrink: 0, padding: "4px 11px", borderRadius: 999, border: "1.5px solid rgba(47,179,106,0.4)",
                background: ACCENT_SOFT, color: ACCENT, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              }}>{addShareLabel}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Stepper de quantité (− ×N +) — même gabarit que celui d'AddItemForm, sans la bascule grammes. */
function QuantityStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderRadius: 12, border: `1.5px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden", flexShrink: 0 }}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} style={{
        padding: "4px 11px", background: "none", border: "none",
        cursor: value > 1 ? "pointer" : "default", color: value > 1 ? INK_MUTED : HAIRLINE,
        fontFamily: "inherit", fontWeight: 700, fontSize: 16, lineHeight: 1,
      }}>−</button>
      <span style={{ minWidth: 26, textAlign: "center", fontSize: 13, fontWeight: 800, color: INK }}>×{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} style={{
        padding: "4px 11px", background: "none", border: "none", cursor: "pointer",
        color: INK_MUTED, fontFamily: "inherit", fontWeight: 700, fontSize: 16, lineHeight: 1,
      }}>+</button>
    </div>
  );
}

/** Pile d'avatars des participants actuels + badge crayon permanent (affordance "c'est cliquable"). */
function AvatarStack({
  members, getParts, onToggle,
}: {
  members: Member[]; getParts: (userId: string) => number; onToggle: () => void;
}) {
  const active = members.filter(m => getParts(m.userId) > 0);
  return (
    <button type="button" onClick={onToggle} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0 }}>
      <span style={{ position: "relative", display: "inline-flex" }}>
        {active.length > 0 ? (
          <span style={{ display: "flex" }}>
            {active.map((m, i) => (
              <span key={m.userId} style={{ ...avatarStyle(tintFor(m.userId).avatar, 24), marginLeft: i > 0 ? -8 : 0 }}>{initials(m.name)}</span>
            ))}
          </span>
        ) : (
          <span style={{ width: 24, height: 24, borderRadius: "50%", border: `2px dashed ${HAIRLINE}`, flexShrink: 0 }} />
        )}
        <span style={{
          position: "absolute", bottom: -3, right: -3, width: 15, height: 15, borderRadius: "50%",
          background: INK_STRONG, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </span>
      </span>
    </button>
  );
}

/** Panneau flottant "qui partage ce produit" — ouvert depuis AvatarStack, ferme sur OK ou clic dehors. */
function PartsPopover({
  members, getParts, totalParts, onChange, addShareLabel, okLabel, onClose,
}: {
  members: Member[]; getParts: (userId: string) => number; totalParts: number;
  onChange: (userId: string, next: number) => void; addShareLabel: string; okLabel: string; onClose: () => void;
}) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 5, width: 210,
      background: "#fff", borderRadius: 14, padding: 12,
      boxShadow: "0 0 0 1px rgba(30,26,20,0.06), 0 16px 36px rgba(20,18,14,0.22)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <ProductPartsEditor members={members} getParts={getParts} totalParts={totalParts} onChange={onChange} addShareLabel={addShareLabel} />
      <button type="button" onClick={onClose} style={{
        marginTop: 2, width: "100%", padding: 7, borderRadius: 9, border: "none",
        background: ACCENT, color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer",
      }}>
        {okLabel}
      </button>
    </div>
  );
}

/** Bulle d'aide affichée une seule fois (mémorisée dans localStorage), sur le tout premier produit. */
function Coachmark({ text, dismissLabel, onDismiss }: { text: string; dismissLabel: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 10px)", right: -6, zIndex: 6, width: 188,
      background: INK_STRONG, color: "#fff", padding: "10px 12px", borderRadius: 12,
      fontSize: 12, fontWeight: 600, lineHeight: 1.4, boxShadow: "0 12px 28px rgba(20,18,14,0.3)",
    }}>
      <span style={{ position: "absolute", top: -6, right: 16, width: 12, height: 12, background: INK_STRONG, transform: "rotate(45deg)" }} />
      {text}
      <button type="button" onClick={onDismiss} style={{
        display: "block", marginTop: 8, background: "none", border: "none", color: "#A9F0CB",
        fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, cursor: "pointer", padding: 0,
        textDecoration: "underline", textUnderlineOffset: "2px",
      }}>
        {dismissLabel}
      </button>
    </div>
  );
}

const COACHMARK_KEY = "gs-ticket-parts-coachmark-seen";

function partsKey(productKey: string, userId: string) {
  return `${productKey}::${userId}`;
}

export function ReceiptScanner({
  groupId, members, currentUserId,
}: {
  groupId: string; members: Member[]; currentUserId: string;
}) {
  const tr = useTranslations("receipt");
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [scanning, startScan] = useTransition();
  const [confirming, startConfirm] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);

  // parts[`${productKey}::${userId}`] = nombre de parts (0/absent = ne participe pas à ce produit).
  // Clé produit = itemId (article matché) ou extraKey(ex,i) (hors liste) — même traitement pour les deux.
  const [parts, setParts] = useState<Map<string, number>>(new Map());
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);

  // Un seul panneau ouvert à la fois (clé produit), + bulle d'aide affichée une fois par appareil.
  const [openProductKey, setOpenProductKey] = useState<string | null>(null);
  const [showCoachmark, setShowCoachmark] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Clic en dehors du panneau ouvert (ou de son bouton) → referme.
  useEffect(() => {
    if (!openProductKey) return;
    function handleOutside(e: MouseEvent) {
      const root = (e.target as HTMLElement).closest<HTMLElement>("[data-product-key]");
      if (!root || root.dataset.productKey !== openProductKey) setOpenProductKey(null);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openProductKey]);

  function toggleProduct(key: string) {
    setOpenProductKey(prev => (prev === key ? null : key));
    dismissCoachmark();
  }

  function dismissCoachmark() {
    if (!showCoachmark) return;
    setShowCoachmark(false);
    try { localStorage.setItem(COACHMARK_KEY, "1"); } catch { /* stockage indisponible, tant pis */ }
  }

  function getParts(productKey: string, userId: string): number {
    return parts.get(partsKey(productKey, userId)) ?? 0;
  }
  function setPartsFor(productKey: string, userId: string, next: number) {
    setParts(prev => { const n = new Map(prev); n.set(partsKey(productKey, userId), Math.max(0, next)); return n; });
  }
  function totalPartsFor(productKey: string): number {
    return members.reduce((s, m) => s + getParts(productKey, m.userId), 0);
  }
  function participantsFor(productKey: string): { userId: string; parts: number }[] {
    return members.filter(m => getParts(productKey, m.userId) > 0).map(m => ({ userId: m.userId, parts: getParts(productKey, m.userId) }));
  }

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

      const p = new Map<string, number>();
      const q = new Map<string, number>();
      // Défaut article matché : les vraies parts déjà posées sur la liste (ItemParticipant) ;
      // repli sur tout le monde à 1 part si l'article n'en avait aucune.
      result.matched.forEach(m => {
        if (m.participants.length > 0) {
          m.participants.forEach(pp => p.set(partsKey(m.itemId, pp.userId), pp.parts));
        } else {
          members.forEach(mm => p.set(partsKey(m.itemId, mm.userId), 1));
        }
        q.set(m.itemId, m.quantity ?? 1);
      });
      // Défaut extra : tout le monde à 1 part (ajustable ensuite).
      result.extras.forEach((ex, i) => {
        const key = extraKey(ex, i);
        members.forEach(mm => p.set(partsKey(key, mm.userId), 1));
        q.set(key, ex.quantity ?? 1);
      });
      setParts(p);
      setQuantities(q);
      let seen = false;
      try { seen = localStorage.getItem(COACHMARK_KEY) === "1"; } catch { /* stockage indisponible → montre la bulle */ }
      setShowCoachmark(!seen);
      setDraft(result);
      setPhase(1);
    });
  }

  function setQuantity(key: string, value: number) {
    setQuantities(prev => new Map(prev).set(key, Math.max(1, value)));
  }

  // Un produit dont personne n'a de part est exclu (ni marqué acheté, ni facturé à personne) —
  // remplace l'ancien "cocher/décocher" par un seul mécanisme, cohérent entre matchés et extras.
  function computeSummary() {
    if (!draft) return [];
    const owes = new Map<string, number>();
    members.forEach(m => owes.set(m.userId, 0));

    const applyLine = (price: number, key: string) => {
      const totalP = totalPartsFor(key);
      if (totalP === 0) return;
      const lineTotal = price * (quantities.get(key) ?? 1);
      members.forEach(m => {
        const pp = getParts(key, m.userId);
        if (pp > 0) owes.set(m.userId, (owes.get(m.userId) ?? 0) + (lineTotal * pp) / totalP);
      });
    };

    draft.matched.forEach(m => applyLine(m.price, m.itemId));
    draft.extras.forEach((ex, i) => applyLine(ex.price, extraKey(ex, i)));

    return members.map(m => ({ ...m, owes: owes.get(m.userId) ?? 0, isPayer: m.userId === paidByUserId }));
  }

  function handleConfirm() {
    if (!draft) return;
    const matched = draft.matched
      .filter(m => totalPartsFor(m.itemId) > 0)
      .map(m => ({ itemId: m.itemId, rawLabel: m.rawLabel, price: m.price, quantity: quantities.get(m.itemId) ?? 1 }));
    const extras = draft.extras
      .map((ex, i) => {
        const key = extraKey(ex, i);
        return { rawLabel: ex.rawLabel, price: ex.price, quantity: quantities.get(key) ?? 1, participants: participantsFor(key) };
      })
      .filter(ex => ex.participants.length > 0);
    const debts = computeSummary()
      .filter(m => !m.isPayer && m.owes > 0.005)
      .map(m => ({ userId: m.userId, amount: Math.round(m.owes * 100) / 100 }));
    const fd = new FormData();
    fd.append("payload", JSON.stringify({ groupId, photoFile: draft.photoFile, paidByUserId, matched, extras, debts }));
    setConfirmError(null);
    startConfirm(async () => {
      const result = await confirmReceipt(fd);
      if (result?.error) setConfirmError(result.error);
    });
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
    const lineTotal = (price: number, key: string) =>
      totalPartsFor(key) > 0 ? price * (quantities.get(key) ?? 1) : 0;
    const matchedTotal = draft.matched.reduce((s, m) => s + lineTotal(m.price, m.itemId), 0);
    const extrasTotal = draft.extras.reduce((s, ex, i) => s + lineTotal(ex.price, extraKey(ex, i)), 0);
    const keptMatchedCount = draft.matched.filter(m => totalPartsFor(m.itemId) > 0).length;
    const keptExtrasCount = draft.extras.filter((ex, i) => totalPartsFor(extraKey(ex, i)) > 0).length;
    const addShareLabel = tr("addShare");
    const okLabel = tr("ok");
    const firstProductKey = draft.matched[0]?.itemId ?? (draft.extras.length > 0 ? extraKey(draft.extras[0], 0) : null);

    return (
      <div style={{ ...FF, display: "flex", flexDirection: "column", gap: 22 }}>
        {draft.matched.length > 0 && (
          <div>
            <div style={sectionLabel}>{tr("foundInList", { count: draft.matched.length })}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {draft.matched.map(m => {
                const totalP = totalPartsFor(m.itemId);
                const kept = totalP > 0;
                const qty = quantities.get(m.itemId) ?? 1;
                return (
                  <div key={m.itemId} style={{
                    ...SURFACE, padding: "13px 14px",
                    border: kept ? "1.5px solid rgba(47,179,106,0.45)" : "1.5px solid #fff",
                    background: kept ? ACCENT_SOFT : "#fff",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: kept ? INK : INK_DONE, textDecoration: kept ? "none" : "line-through" }}>{m.itemLabel}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: INK_FAINT, marginTop: 1 }}>{m.rawLabel}</div>
                      </div>
                      <QuantityStepper value={qty} onChange={v => setQuantity(m.itemId, v)} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: kept ? ACCENT_TEXT : INK_FAINT, flexShrink: 0, minWidth: 60, textAlign: "right" }}>
                        {kept ? formatEuro(m.price * qty) : tr("excluded")}
                      </span>
                      <div style={{ position: "relative" }} data-product-key={m.itemId}>
                        <AvatarStack members={members} getParts={uid => getParts(m.itemId, uid)} onToggle={() => toggleProduct(m.itemId)} />
                        {openProductKey === m.itemId && (
                          <PartsPopover
                            members={members}
                            getParts={uid => getParts(m.itemId, uid)}
                            totalParts={totalP}
                            onChange={(uid, next) => setPartsFor(m.itemId, uid, next)}
                            addShareLabel={addShareLabel}
                            okLabel={okLabel}
                            onClose={() => setOpenProductKey(null)}
                          />
                        )}
                        {showCoachmark && m.itemId === firstProductKey && (
                          <Coachmark text={tr("coachmark")} dismissLabel={tr("coachmarkDismiss")} onDismiss={dismissCoachmark} />
                        )}
                      </div>
                    </div>
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
                const totalP = totalPartsFor(key);
                const kept = totalP > 0;
                const qty = quantities.get(key) ?? 1;
                return (
                  <div key={key} style={{ ...SURFACE, padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: INK_STRONG }}>{ex.rawLabel}</span>
                      <QuantityStepper value={qty} onChange={v => setQuantity(key, v)} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: kept ? INK_MUTED : INK_FAINT, minWidth: 60, textAlign: "right" }}>
                        {kept ? formatEuro(ex.price * qty) : tr("excluded")}
                      </span>
                      <div style={{ position: "relative" }} data-product-key={key}>
                        <AvatarStack members={members} getParts={uid => getParts(key, uid)} onToggle={() => toggleProduct(key)} />
                        {openProductKey === key && (
                          <PartsPopover
                            members={members}
                            getParts={uid => getParts(key, uid)}
                            totalParts={totalP}
                            onChange={(uid, next) => setPartsFor(key, uid, next)}
                            addShareLabel={addShareLabel}
                            okLabel={okLabel}
                            onClose={() => setOpenProductKey(null)}
                          />
                        )}
                        {showCoachmark && key === firstProductKey && (
                          <Coachmark text={tr("coachmark")} dismissLabel={tr("coachmarkDismiss")} onDismiss={dismissCoachmark} />
                        )}
                      </div>
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
            {tr("listCount", { selected: keptMatchedCount, total: draft.matched.length })}<br />{tr("extrasCount", { count: keptExtrasCount })}
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

        {confirmError && (
          <div style={{ padding: "13px 16px", borderRadius: 14, background: DANGER_SOFT, border: `1.5px solid rgba(232,80,58,0.3)` }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DANGER }}>{confirmError}</p>
          </div>
        )}
        <button type="button" onClick={handleConfirm} disabled={confirming} style={{ ...BTN_ACCENT, opacity: confirming ? 0.55 : 1 }}>
          {confirming ? tr("saving") : tr("confirmShopping")}
        </button>
        <button type="button" onClick={() => { setPhase(1); setConfirmError(null); }} style={BTN_SOFT}>{tr("edit")}</button>
      </div>
    );
  }

  return null;
}
