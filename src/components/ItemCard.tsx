"use client";

import { useState, useTransition, useRef, useEffect, useLayoutEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { setParticipation, setItemStatus, deleteItem, updateItem } from "@/lib/actions/items";
import { TrashBinMinimalistic } from "@/lib/icons";
import { TagPicker } from "@/components/TagPicker";
import type { TagView } from "@/lib/tags";
import { initials } from "@/lib/utils";
import { formatQuantity, GRAM_STEP, DEFAULT_GRAMS, MAX_GRAMS, type ItemUnit } from "@/lib/units";
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
  unit?: ItemUnit;
  participants: ParticipantView[];
};

export function ItemCard({
  item, currentUserId, members, memberColors = {}, groupId, tags, gap = 10, onLeaving,
  showParticipants = true, canModerate = false,
}: {
  item: ItemView; currentUserId: string; members: MemberView[];
  memberColors?: Record<string, string>;
  groupId: string; tags: TagView[]; gap?: number;
  /** Notifie le parent qu'un item quitte sa section (collapse qui démarre) →
   *  permet de collapser le header de rayon en synchro si c'est le dernier. */
  onLeaving?: (itemId: string) => void;
  /** false quand le partage de dépenses (balance) du groupe est désactivé :
   *  masque les participants, affiche seulement qui a ajouté l'article. */
  showParticipants?: boolean;
  /** true pour le propriétaire du groupe (ou admin) : peut supprimer tout article. */
  canModerate?: boolean;
}) {
  const tr = useTranslations();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  // Édition inline du nom + quantité (clic sur le libellé).
  const [renaming, setRenaming] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [editQty, setEditQty] = useState(item.quantity);
  const [editUnit, setEditUnit] = useState<ItemUnit>(item.unit ?? null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  // Coche affichée localement avant le collapse (feedback « validé » de 0,5 s).
  const [justChecked, setJustChecked] = useState(false);
  // Animation d'entrée : démarre replié/fondu puis se déploie au montage
  // (carte qui apparaît dans « à acheter » ou « dans le panier »).
  const [entered, setEntered] = useState(false);
  // Animation d'écrasement à la suppression : mesure → hauteur fixe → 0 + scaleY.
  const [collapse, setCollapse] = useState<{ h: number; phase: "start" | "end" } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const delTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (delTimer.current) clearTimeout(delTimer.current); }, []);

  const totalParts = item.participants.reduce((n, p) => n + p.parts, 0);
  const isBought = item.status === "bought";
  // Visuel « acheté » = état serveur OU coche locale en attente du collapse.
  const showBought = isBought || justChecked;
  const partsByUser = new Map(item.participants.map(p => [p.userId, p.parts]));

  function call(fn: (fd: FormData) => Promise<void>, fields: Record<string, string>) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    startTransition(() => fn(fd));
  }

  function setPartsFor(userId: string, next: number) {
    call(setParticipation, { itemId: item.id, userId, parts: String(Math.max(0, next)) });
  }

  // Joue le collapse puis exécute l'action quand l'animation est terminée
  // (suppression OU passage acheté/à acheter → l'item « quitte » sa section
  // en douceur avant de réapparaître dans l'autre, au lieu de se téléporter).
  function collapseThen(run: () => void) {
    const h = rootRef.current?.offsetHeight ?? 0;
    onLeaving?.(item.id);                 // header de rayon collapse en synchro
    setCollapse({ h, phase: "start" });
    delTimer.current = setTimeout(run, 280);
  }

  function handleDelete() {
    collapseThen(() => call(deleteItem, { itemId: item.id }));
  }

  function openRename() {
    setEditLabel(item.label);
    setEditQty(item.quantity);
    setEditUnit(item.unit ?? null);
    setRenaming(true);
  }

  function saveRename() {
    const label = editLabel.trim();
    if (!label) return;
    setRenaming(false);
    if (label === item.label && editQty === item.quantity && editUnit === (item.unit ?? null)) return; // rien changé
    call(updateItem, { itemId: item.id, label, quantity: String(editQty), unit: editUnit ?? "" });
  }

  // Focus + sélection du champ nom à l'ouverture de l'édition.
  useEffect(() => {
    if (renaming) { labelInputRef.current?.focus(); labelInputRef.current?.select(); }
  }, [renaming]);

  function toggleBought() {
    if (collapse || justChecked) return; // anti double-clic pendant l'anim
    if (isBought) {
      collapseThen(() => call(setItemStatus, { itemId: item.id, status: "pending" }));
    } else {
      // 1) coche affichée 0,5 s en place  2) collapse  3) action serveur.
      setJustChecked(true);
      delTimer.current = setTimeout(
        () => collapseThen(() => call(setItemStatus, { itemId: item.id, status: "bought" })),
        500,
      );
    }
  }

  // Passe en phase "end" à la frame suivante → déclenche la transition.
  useLayoutEffect(() => {
    if (collapse?.phase !== "start") return;
    const id = requestAnimationFrame(() => setCollapse(c => (c ? { ...c, phase: "end" } : c)));
    return () => cancelAnimationFrame(id);
  }, [collapse?.phase]);

  // Déploie la carte à la frame suivant le montage → joue l'animation d'entrée.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

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

  // État de départ de l'animation d'entrée (avant le 1er rAF post-montage).
  const baseOpacity = pending ? 0.6 : showBought ? 0.66 : 1;
  const entranceStyle: CSSProperties = !collapse && !entered
    ? { opacity: 0, transform: "translateY(-10px) scale(0.97)" }
    : {};

  return (
    <div ref={rootRef} style={{
      ...cardSm,
      padding: "13px 14px",
      borderRadius: 16,
      opacity: baseOpacity,
      transform: "none",
      transition: "opacity .28s ease, transform .28s ease",
      ...collapseStyle,
      ...entranceStyle,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          onClick={toggleBought}
          style={checkbox(showBought, 24)}
        >
          {showBought && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
        </span>
        {renaming ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              ref={labelInputRef}
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(false); }}
              style={{
                flex: 1, minWidth: 0, padding: "6px 10px", borderRadius: 10,
                border: `1.5px solid ${ACCENT}`, background: "#fff",
                color: INK, fontSize: 16, fontWeight: 600, fontFamily: "inherit", outline: "none",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", borderRadius: 10, border: `1.5px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden", flexShrink: 0 }}>
              <button onClick={() => setEditQty(q => Math.max(editUnit === "g" ? GRAM_STEP : 1, q - (editUnit === "g" ? GRAM_STEP : 1)))} style={{ padding: "4px 9px", background: "none", border: "none", cursor: "pointer", color: INK_MUTED, fontFamily: "inherit", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>−</button>
              <button
                onClick={() => {
                  // Bascule pièces ↔ grammes (500 g par défaut).
                  if (editUnit === "g") { setEditUnit(null); setEditQty(1); }
                  else { setEditUnit("g"); setEditQty(DEFAULT_GRAMS); }
                }}
                style={{ minWidth: 36, textAlign: "center", padding: "4px 2px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: ACCENT_TEXT, fontFamily: "inherit" }}
              >
                {formatQuantity(editQty, editUnit)}
              </button>
              <button onClick={() => setEditQty(q => Math.min(editUnit === "g" ? MAX_GRAMS : 99, q + (editUnit === "g" ? GRAM_STEP : 1)))} style={{ padding: "4px 9px", background: "none", border: "none", cursor: "pointer", color: INK_MUTED, fontFamily: "inherit", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>+</button>
            </div>
            <button
              onClick={saveRename}
              aria-label={tr("common.save")}
              style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, border: "none", background: ACCENT, color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </button>
            <button
              onClick={() => setRenaming(false)}
              aria-label={tr("common.cancel")}
              style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: INK_FAINT, fontSize: 18, lineHeight: 1, padding: "4px 4px" }}
            >
              ×
            </button>
          </div>
        ) : (
          <span
            onClick={openRename}
            style={{ flex: 1, cursor: "pointer", fontSize: 16, fontWeight: 600, color: showBought ? INK_DONE : INK, textDecoration: showBought ? "line-through" : "none", display: "flex", alignItems: "center", gap: 5 }}>
            {item.label}
            {(item.quantity > 1 || item.unit === "g") && (
              <span style={{ fontSize: 12, fontWeight: 800, color: showBought ? INK_FAINT : ACCENT_TEXT, background: showBought ? "#F0EFEB" : ACCENT_SOFT, padding: "1px 6px", borderRadius: 8, whiteSpace: "nowrap" }}>
                {formatQuantity(item.quantity, item.unit ?? null)}
              </span>
            )}
          </span>
        )}
        {!renaming && <TagPicker itemId={item.id} groupId={groupId} currentTagId={item.tagId} tags={tags} />}
        {!renaming && (item.addedByUserId === currentUserId || canModerate) && (
          confirmDel ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={handleDelete}
                aria-label={tr("item.confirmDeleteAria", { label: item.label })}
                style={{ ...btnDanger, minHeight: 34, padding: "6px 14px", fontSize: 12, display: "inline-flex", alignItems: "center" }}
              >
                <TrashBinMinimalistic weight="Bold" size={16} color={DANGER} />
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                aria-label={tr("common.cancel")}
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: INK_FAINT, fontSize: 18, lineHeight: 1, padding: "4px 6px" }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              aria-label={tr("item.deleteAria", { label: item.label })}
              style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: INK_FAINT, fontSize: 18, lineHeight: 1, padding: "4px 6px" }}
            >
              ×
            </button>
          )
        )}
      </div>

      {/* Balance désactivée : juste qui a ajouté l'article */}
      {!showParticipants && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingLeft: 36 }}>
          {(() => {
            const t = tintForColor(memberColors[item.addedByUserId] ?? avatarColor(item.addedByUserId));
            return (
              <span style={memberChip(t)}>
                <span style={{ ...avatarStyle(t.avatar, 14), border: "none", fontSize: 8 }}>{item.addedByName[0]?.toUpperCase()}</span>
                {tr("item.addedBy", { name: item.addedByName.split(" ")[0] })}
              </span>
            );
          })()}
        </div>
      )}

      {/* Participants badges */}
      {showParticipants && (
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
          <span style={{ fontSize: 12, fontWeight: 600, color: INK_FAINT }}>{tr("item.noParticipants")}</span>
        )}
        <button
          onClick={() => setEditing(v => !v)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, color: ACCENT_TEXT, fontFamily: "inherit", padding: "2px 4px" }}
        >
          {editing ? tr("common.close") : tr("item.whoParticipates")}
        </button>
      </div>
      )}

      {/* Participant editor */}
      {showParticipants && editing && (
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
                    {m.name}{isMe && <span style={{ color: INK_FAINT }}> ({tr("item.you")})</span>}
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
                    {tr("item.addShare")}
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
