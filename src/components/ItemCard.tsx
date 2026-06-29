"use client";

import { useState, useTransition, useRef, useEffect, useLayoutEffect, type CSSProperties } from "react";
import { setParticipation, setItemStatus, deleteItem } from "@/lib/actions/items";
import { TrashBinMinimalistic } from "@/lib/icons";
import { TagPicker } from "@/components/TagPicker";
import type { TagView } from "@/lib/tags";
import { initials } from "@/lib/utils";
import {
  btnDanger, checkbox, cardSm, memberChip, avatarStyle,
  tintForColor, avatarColor, ACCENT, ACCENT_TEXT, ACCENT_SOFT,
  INK, INK_STRONG, INK_MUTED, INK_FAINT, INK_DONE, HAIRLINE, DANGER,
} from "@/lib/ui";

export type ParticipantView = { userId: string; name: string; parts: number };
export type MemberView = { userId: string; name: string };
export type ItemView = {
  id: string; label: string; status: string;
  addedByUserId: string; addedByName: string;
  tagId?: string | null;
  quantity: number;
  participants: ParticipantView[];
};

export function ItemCard({
  item, currentUserId, members, memberColors = {}, groupId, tags, gap = 10,
}: {
  item: ItemView; currentUserId: string; members: MemberView[];
  memberColors?: Record<string, string>;
  groupId: string; tags: TagView[]; gap?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  // Animation d'écrasement à la suppression : mesure → hauteur fixe → 0 + scaleY.
  const [collapse, setCollapse] = useState<{ h: number; phase: "start" | "end" } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const delTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (delTimer.current) clearTimeout(delTimer.current); }, []);

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

  function handleDelete() {
    const h = rootRef.current?.offsetHeight ?? 0;
    setCollapse({ h, phase: "start" });          // fige la hauteur courante → joue le collapse
    // suppression réelle après l'animation, pour que le collapse aille à son terme
    delTimer.current = setTimeout(() => call(deleteItem, { itemId: item.id }), 300);
  }

  // Passe en phase "end" à la frame suivante → déclenche la transition.
  useLayoutEffect(() => {
    if (collapse?.phase !== "start") return;
    const id = requestAnimationFrame(() => setCollapse(c => (c ? { ...c, phase: "end" } : c)));
    return () => cancelAnimationFrame(id);
  }, [collapse?.phase]);

  const end = collapse?.phase === "end";
  const collapseStyle: CSSProperties = collapse
    ? {
        height: end ? 0 : collapse.h,
        marginTop: end ? -gap : 0,
        opacity: end ? 0 : 1,
        transform: end ? "scaleY(0)" : "scaleY(1)",
        transformOrigin: "center",
        overflow: "hidden",
        pointerEvents: "none",
        // collapse aussi padding + bordure → hauteur réelle = 0 (sinon ~28px résiduels
        // qui font « sauter » l'item du dessous au démontage).
        paddingTop: end ? 0 : undefined,
        paddingBottom: end ? 0 : undefined,
        borderTopWidth: end ? 0 : undefined,
        borderBottomWidth: end ? 0 : undefined,
        transition: "height .26s ease, margin-top .26s ease, opacity .2s ease, transform .26s ease, padding .26s ease, border-width .26s ease",
      }
    : {};

  return (
    <div ref={rootRef} style={{
      ...cardSm,
      padding: "13px 14px",
      borderRadius: 16,
      opacity: pending ? 0.6 : isBought ? 0.66 : 1,
      transition: "opacity .2s",
      ...collapseStyle,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          onClick={() => call(setItemStatus, { itemId: item.id, status: isBought ? "pending" : "bought" })}
          style={checkbox(isBought, 24)}
        >
          {isBought && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
        </span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: isBought ? INK_DONE : INK, textDecoration: isBought ? "line-through" : "none", display: "flex", alignItems: "center", gap: 5 }}>
          {item.label}
          {item.quantity > 1 && (
            <span style={{ fontSize: 12, fontWeight: 800, color: isBought ? INK_FAINT : ACCENT_TEXT, background: isBought ? "#F0EFEB" : ACCENT_SOFT, padding: "1px 6px", borderRadius: 8 }}>
              ×{item.quantity}
            </span>
          )}
        </span>
        <TagPicker itemId={item.id} groupId={groupId} currentTagId={item.tagId} tags={tags} />
        {item.addedByUserId === currentUserId && (
          confirmDel ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={handleDelete}
                aria-label={`Confirmer la suppression de ${item.label}`}
                style={{ ...btnDanger, minHeight: 34, padding: "6px 14px", fontSize: 12, display: "inline-flex", alignItems: "center" }}
              >
                <TrashBinMinimalistic weight="Bold" size={16} color={DANGER} />
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                aria-label="Annuler"
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: INK_FAINT, fontSize: 18, lineHeight: 1, padding: "4px 6px" }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              aria-label={`Supprimer ${item.label}`}
              style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: INK_FAINT, fontSize: 18, lineHeight: 1, padding: "4px 6px" }}
            >
              ×
            </button>
          )
        )}
      </div>

      {/* Participants badges */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10, paddingLeft: 36 }}>
        {item.participants.map(p => {
          const t = tintForColor(memberColors[p.userId] ?? avatarColor(p.userId));
          return (
            <span key={p.userId} style={memberChip(t)}>
              <span style={{ ...avatarStyle(t.avatar, 14), border: "none", fontSize: 8 }}>{p.name[0]?.toUpperCase()}</span>
              {p.name.split(" ")[0]}
              {totalParts > 0 && <span style={{ opacity: 0.7 }}>{p.parts}/{totalParts}</span>}
            </span>
          );
        })}
        {item.participants.length === 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: INK_FAINT }}>personne pour l&apos;instant</span>
        )}
        <button
          onClick={() => setEditing(v => !v)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, color: ACCENT_TEXT, fontFamily: "inherit", padding: "2px 4px" }}
        >
          {editing ? "Fermer" : "Qui participe ?"}
        </button>
      </div>

      {/* Participant editor */}
      {editing && (
        <div style={{ marginTop: 10, marginLeft: 36, padding: 12, borderRadius: 14, background: "#F5F5F5", border: `1.5px solid ${HAIRLINE}` }}>
          {members.map(m => {
            const parts = partsByUser.get(m.userId) ?? 0;
            const isMe = m.userId === currentUserId;
            const c = memberColors[m.userId] ?? avatarColor(m.userId);
            return (
              <div key={m.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: `1px solid ${HAIRLINE}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={avatarStyle(c, 26)}>{initials(m.name)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}{isMe && <span style={{ color: INK_FAINT }}> (toi)</span>}
                  </span>
                </div>
                {parts > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: INK_FAINT, marginRight: 4 }}>{totalParts > 0 && `${parts}/${totalParts}`}</span>
                    <div style={{ display: "flex", alignItems: "center", borderRadius: 10, border: `1.5px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden" }}>
                      <button onClick={() => setPartsFor(m.userId, parts - 1)} style={{ padding: "4px 10px", background: "none", border: "none", cursor: "pointer", color: INK_MUTED, fontFamily: "inherit", fontWeight: 700 }}>−</button>
                      <span style={{ width: 20, textAlign: "center", fontSize: 14, fontWeight: 800, color: INK_STRONG }}>{parts}</span>
                      <button onClick={() => setPartsFor(m.userId, parts + 1)} style={{ padding: "4px 10px", background: "none", border: "none", cursor: "pointer", color: INK_MUTED, fontFamily: "inherit", fontWeight: 700 }}>+</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setPartsFor(m.userId, 1)}
                    style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid rgba(47,179,106,0.4)`, background: ACCENT_SOFT, color: ACCENT, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
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
