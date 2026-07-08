"use client";

import { useTransition, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createTicket } from "@/lib/actions/tickets";
import { compressImage } from "@/lib/compressImage";
import { formatEuro } from "@/lib/utils";
import { Camera } from "@/lib/icons";
import {
  btnPrimary, checkbox, input, tintFor,
  ACCENT_SOFT, INK_STRONG, INK, INK_MUTED, INK_FAINT, HAIRLINE, DANGER, DANGER_SOFT, FONT,
} from "@/lib/ui";

type Member = { userId: string; name: string };

const FF: React.CSSProperties = { fontFamily: FONT, WebkitFontSmoothing: "antialiased" };
const SURFACE: React.CSSProperties = {
  background: "#FFFFFF", border: "1.5px solid #fff", borderRadius: 18,
  boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 16px rgba(30,26,20,0.06)",
};

/** Répartition égale en centimes : les premiers débiteurs absorbent le reliquat (10,00€/3 → 3,34/3,33/3,33). */
function equalSplit(totalEuros: number, userIds: string[]): Map<string, number> {
  const map = new Map<string, number>();
  const n = userIds.length;
  if (n === 0) return map;
  const totalCents = Math.max(0, Math.round(totalEuros * 100));
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  userIds.forEach((id, i) => map.set(id, (base + (i < remainder ? 1 : 0)) / 100));
  return map;
}

export function AddTicketForm({
  groupId, members, currentUserId,
}: {
  groupId: string; members: Member[]; currentUserId: string;
}) {
  const tr = useTranslations("tickets.new");
  const [preview, setPreview] = useState<string | null>(null);
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedDebtorIds, setSelectedDebtorIds] = useState<Set<string>>(
    () => new Set(members.filter(m => m.userId !== currentUserId).map(m => m.userId)),
  );
  const [amounts, setAmounts] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const totalNumber = Number(totalAmount) || 0;
  const otherMembers = members.filter(m => m.userId !== paidByUserId);
  const sumAssigned = Array.from(selectedDebtorIds).reduce((s, id) => s + (amounts.get(id) ?? 0), 0);
  const remaining = Math.round((totalNumber - sumAssigned) * 100) / 100;

  function handleFile(f: File | undefined) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  }

  function handleTotalChange(value: string) {
    setTotalAmount(value);
    setAmounts(equalSplit(Number(value) || 0, Array.from(selectedDebtorIds)));
  }

  function toggleDebtor(userId: string) {
    setSelectedDebtorIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      setAmounts(equalSplit(totalNumber, Array.from(next)));
      return next;
    });
  }

  function changePayer(userId: string) {
    setPaidByUserId(userId);
    const next = new Set(members.filter(m => m.userId !== userId).map(m => m.userId));
    setSelectedDebtorIds(next);
    setAmounts(equalSplit(totalNumber, Array.from(next)));
  }

  function setDebtorAmount(userId: string, value: string) {
    setAmounts(prev => new Map(prev).set(userId, Number(value) || 0));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    setError(null);
    startSaving(async () => {
      const fd = new FormData();
      fd.append("groupId", groupId);
      fd.append("paidByUserId", paidByUserId);
      if (file) {
        let photo: File = file;
        try {
          photo = await compressImage(file);
        } catch {
          /* navigateur incapable de décoder le format → on envoie l'original */
        }
        fd.append("photo", photo);
      }
      const debts = Array.from(selectedDebtorIds).map(userId => ({ userId, amount: amounts.get(userId) ?? 0 }));
      fd.append("payload", JSON.stringify({ totalAmount: totalNumber, debts }));
      const result = await createTicket(fd);
      if (result?.error) setError(result.error);
    });
  }

  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: INK_FAINT, marginBottom: 12 };
  const canSubmit = !saving && !!preview && selectedDebtorIds.size > 0 && totalNumber > 0 && Math.abs(remaining) < 0.01;

  return (
    <form onSubmit={handleSubmit} style={{ ...FF, display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Photo */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          ...SURFACE, padding: "36px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          cursor: "pointer", textAlign: "center",
          border: preview ? "2px solid rgba(47,179,106,0.45)" : "2px dashed rgba(28,25,20,0.16)",
          background: preview ? ACCENT_SOFT : "#fff",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 12, objectFit: "contain" }} />
        ) : (
          <>
            <Camera weight="Linear" size={40} color={INK_FAINT} />
            <span style={{ fontSize: 15, fontWeight: 800, color: INK_STRONG }}>{tr("takePhoto")}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: INK_FAINT }}>{tr("orGallery")}</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />

      {/* Qui a payé */}
      <div>
        <div style={sectionLabel}>{tr("whoPaid")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {members.map(m => {
            const on = m.userId === paidByUserId;
            const t = tintFor(m.userId);
            return (
              <button key={m.userId} type="button" onClick={() => changePayer(m.userId)} style={{
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

      {/* Montant total */}
      <div>
        <div style={sectionLabel}>{tr("totalAmount")}</div>
        <input
          type="number" step="0.01" min="0" inputMode="decimal" placeholder="0,00"
          value={totalAmount} onChange={e => handleTotalChange(e.target.value)}
          style={input}
        />
      </div>

      {/* Qui doit rembourser */}
      <div>
        <div style={sectionLabel}>{tr("whoOwes")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {otherMembers.map(m => {
            const selected = selectedDebtorIds.has(m.userId);
            return (
              <div key={m.userId} style={{ ...SURFACE, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <span onClick={() => toggleDebtor(m.userId)} style={checkbox(selected)}>
                  {selected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: selected ? INK : INK_FAINT }}>{m.name}</span>
                {selected && (
                  <input
                    type="number" step="0.01" min="0" inputMode="decimal"
                    value={amounts.get(m.userId) ?? 0}
                    onChange={e => setDebtorAmount(m.userId, e.target.value)}
                    style={{ ...input, width: 84, padding: "8px 10px", textAlign: "right" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {selectedDebtorIds.size > 0 && Math.abs(remaining) >= 0.01 && (
          <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: DANGER }}>
            {tr("remaining", { amount: formatEuro(remaining) })}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "13px 16px", borderRadius: 14, background: DANGER_SOFT, border: "1.5px solid rgba(232,80,58,0.3)" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DANGER }}>{error}</p>
        </div>
      )}

      <button type="submit" disabled={!canSubmit} style={{ ...btnPrimary, width: "100%", opacity: canSubmit ? 1 : 0.5 }}>
        {saving ? tr("saving") : tr("save")}
      </button>
    </form>
  );
}
