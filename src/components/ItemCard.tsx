"use client";

import { useState, useTransition } from "react";
import { setParticipation, setItemStatus, deleteItem } from "@/lib/actions/items";
import { initials } from "@/lib/utils";

export type ParticipantView = { userId: string; name: string; parts: number };
export type MemberView = { userId: string; name: string };
export type ItemView = {
  id: string; label: string; status: string;
  addedByUserId: string; addedByName: string;
  participants: ParticipantView[];
};

const PART_COLORS = ["#F0813F", "#7E91FF", "#C99BF0", "#5BD08A", "#F0C53F"];
function pColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PART_COLORS[h % PART_COLORS.length];
}

export function ItemCard({
  item, currentUserId, members,
}: {
  item: ItemView; currentUserId: string; members: MemberView[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const totalParts = item.participants.reduce((n, p) => n + p.parts, 0);
  const isBought = item.status === "bought";
  const partsByUser = new Map(item.participants.map(p => [p.userId, p.parts]));

  function call(fn: (fd: FormData) => Promise<void>, fields: Record<string, string>) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    startTransition(() => fn(fd));
  }

  function setPartsFor(userId: string, next: number) {
    call(setParticipation, { itemId: item.id, userId, parts: String(Math.max(0, next)) });
  }

  return (
    <div style={{
      padding: "13px 14px",
      borderRadius: 14,
      background: isBought ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${isBought ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)"}`,
      opacity: pending ? 0.6 : 1,
      transition: "opacity .2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          onClick={() => call(setItemStatus, { itemId: item.id, status: isBought ? "pending" : "bought" })}
          style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: "pointer",
            background: isBought ? "#5BD08A" : "transparent",
            border: isBought ? "none" : "1.5px solid rgba(255,255,255,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .2s, border-color .2s",
          }}
        >
          {isBought && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
        </span>
        <span style={{ flex: 1, fontSize: 16, color: isBought ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.92)", textDecoration: isBought ? "line-through" : "none" }}>
          {item.label}
        </span>
        {item.addedByUserId === currentUserId && (
          <button
            onClick={() => call(deleteItem, { itemId: item.id })}
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", fontSize: 16, padding: "0 2px" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Participants badges */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10, paddingLeft: 34 }}>
        {item.participants.map(p => (
          <span key={p.userId} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: `${pColor(p.userId)}22`, color: pColor(p.userId),
          }}>
            {p.name.split(" ")[0]}
            {totalParts > 0 && <span style={{ opacity: 0.7 }}>{p.parts}/{totalParts}</span>}
          </span>
        ))}
        {item.participants.length === 0 && (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>personne pour l&apos;instant</span>
        )}
        <button
          onClick={() => setEditing(v => !v)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "rgba(91,208,138,0.8)", fontFamily: "inherit", padding: "2px 4px" }}
        >
          {editing ? "Fermer" : "Qui participe ?"}
        </button>
      </div>

      {/* Participant editor */}
      {editing && (
        <div style={{ marginTop: 10, marginLeft: 34, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {members.map(m => {
            const parts = partsByUser.get(m.userId) ?? 0;
            const isMe = m.userId === currentUserId;
            const c = pColor(m.userId);
            return (
              <div key={m.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: c, color: c === "#5BD08A" ? "#0D0D0F" : "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {initials(m.name)}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", truncate: "ellipsis" }}>
                    {m.name}{isMe && <span style={{ color: "rgba(255,255,255,0.4)" }}> (toi)</span>}
                  </span>
                </div>
                {parts > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 4 }}>{totalParts > 0 && `${parts}/${totalParts}`}</span>
                    <div style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden" }}>
                      <button onClick={() => setPartsFor(m.userId, parts - 1)} style={{ padding: "4px 10px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontFamily: "inherit" }}>−</button>
                      <span style={{ width: 20, textAlign: "center", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{parts}</span>
                      <button onClick={() => setPartsFor(m.userId, parts + 1)} style={{ padding: "4px 10px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontFamily: "inherit" }}>+</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setPartsFor(m.userId, 1)}
                    style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(91,208,138,0.4)", background: "rgba(91,208,138,0.08)", color: "#9FE3BD", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    + Ajouter
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
