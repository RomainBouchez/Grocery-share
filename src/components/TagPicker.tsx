"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { setItemTag, createTag, deleteTag, renameTag } from "@/lib/actions/tags";
import { tagIcon, tagBg, pickNewTagColor, TAG_ICON, type TagView } from "@/lib/tags";
import { INK, INK_MUTED, INK_FAINT, HAIRLINE, CARD, FONT } from "@/lib/ui";

type PopoverPos = { top?: number; bottom?: number; right: number };

const LONG_PRESS_MS = 500;

export function TagPicker({
  itemId, groupId, currentTagId, tags,
}: {
  itemId: string;
  groupId: string;
  currentTagId?: string | null;
  tags: TagView[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos>({ top: 0, right: 0 });
  const [query, setQuery] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const current = tags.find((t) => t.id === currentTagId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setContextMenuId(null);
      setConfirmDeleteId(null);
      setRenamingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  function computePos(): PopoverPos | null {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = window.innerWidth - rect.right;
    return spaceBelow < 300
      ? { bottom: window.innerHeight - rect.top + 6, right }
      : { top: rect.bottom + 6, right };
  }

  function openPopover() {
    const p = computePos();
    if (p) setPos(p);
    setOpen(true);
  }

  // Le popover suit la puce déclencheuse au scroll / resize — mise à jour
  // impérative (DOM direct + rAF) pour éviter un re-render React par event.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = popoverRef.current;
        const p = computePos();
        if (!el || !p) return;
        el.style.top = p.top != null ? `${p.top}px` : "auto";
        el.style.bottom = p.bottom != null ? `${p.bottom}px` : "auto";
        el.style.right = `${p.right}px`;
      });
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Long press handlers
  function startLongPress(tagId: string) {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      setContextMenuId(tagId);
      setConfirmDeleteId(null);
      setRenamingId(null);
    }, LONG_PRESS_MS);
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  const q = query.trim().toLowerCase();
  const filtered = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  const exact = tags.some((t) => t.name.toLowerCase() === q);

  function apply(tagId: string | null) {
    const fd = new FormData();
    fd.append("itemId", itemId);
    fd.append("tagId", tagId ?? "");
    startTransition(() => setItemTag(fd));
    setOpen(false);
  }

  function doDelete(tagId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("tagId", tagId);
      await deleteTag(fd);
    });
    setContextMenuId(null);
    setConfirmDeleteId(null);
    setOpen(false);
  }

  function doRename(tagId: string) {
    const name = renameValue.trim();
    if (!name) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("tagId", tagId);
      fd.append("name", name);
      await renameTag(fd);
    });
    setRenamingId(null);
    setContextMenuId(null);
  }

  function create(iconKey: string) {
    const name = query.trim();
    if (!name) return;
    const color = pickNewTagColor(name);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("groupId", groupId);
      fd.append("name", name);
      fd.append("icon", iconKey);
      fd.append("color", color);
      const newId = await createTag(fd);
      if (newId) {
        const fd2 = new FormData();
        fd2.append("itemId", itemId);
        fd2.append("tagId", newId);
        await setItemTag(fd2);
      }
    });
    setOpen(false);
  }

  const CurIcon = current ? tagIcon(current.icon) : null;

  const popover = open && typeof document !== "undefined" && createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        right: pos.right,
        zIndex: 200,
        width: 230, maxHeight: 310, overflowY: "auto",
        background: CARD, borderRadius: 14, border: `1.5px solid ${HAIRLINE}`,
        boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 12px 30px rgba(30,26,20,0.16)",
        padding: 8, fontFamily: FONT,
        userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
      }}
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher ou créer…"
        style={{
          width: "100%", boxSizing: "border-box", padding: "8px 10px",
          borderRadius: 10, border: `1.5px solid ${HAIRLINE}`, background: "#F5F5F5",
          fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: INK, outline: "none",
          marginBottom: 6, userSelect: "text", WebkitUserSelect: "text",
        }}
      />

      {current && (
        <button type="button" onClick={() => apply(null)} style={rowStyle(INK_MUTED)}>
          ✕ Retirer le rayon
        </button>
      )}

      {filtered.map((t) => {
        const Icon = tagIcon(t.icon);
        const on = t.id === currentTagId;
        const inContextMenu = contextMenuId === t.id;
        const inConfirm = confirmDeleteId === t.id;
        const inRename = renamingId === t.id;

        if (inRename) {
          return (
            <div key={t.id} style={{ position: "relative", padding: "4px 4px" }}>
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") doRename(t.id); if (e.key === "Escape") { setRenamingId(null); setContextMenuId(null); } }}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "6px 40px 6px 8px", borderRadius: 8,
                  border: `1.5px solid ${t.color}`, background: "#fff",
                  fontSize: 13, fontWeight: 600, fontFamily: FONT, color: INK, outline: "none",
                  userSelect: "text", WebkitUserSelect: "text",
                }}
              />
              <button type="button" onClick={() => doRename(t.id)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  padding: "3px 7px", borderRadius: 6, border: "none", background: t.color,
                  fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT,
                }}>
                ✓
              </button>
            </div>
          );
        }

        if (inConfirm) return null;

        if (inContextMenu) {
          return (
            <div key={t.id} style={{ borderRadius: 10, background: tagBg(t.color), padding: "4px 6px", marginBottom: 2 }}>
              {/* Tag header */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 4px 6px" }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", background: tagBg(t.color), flexShrink: 0 }}>
                  <Icon size={12} weight="Bold" color={t.color} />
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: t.color, flex: 1 }}>{t.name}</span>
                <button type="button" onClick={() => setContextMenuId(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: INK_FAINT, fontSize: 14, lineHeight: 1, padding: "2px 4px" }}>×</button>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 5 }}>
                <button type="button"
                  onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: `1.5px solid ${HAIRLINE}`, background: "#fff", fontSize: 12, fontWeight: 700, color: INK_MUTED, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <span style={{ display: "inline-block", transform: "rotate(45deg)" }}>✏</span> Modifier
                </button>
                <button type="button"
                  onClick={() => doDelete(t.id)}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: "none", background: "#FFEDEB", fontSize: 12, fontWeight: 700, color: "#E8503A", cursor: "pointer", fontFamily: FONT }}>
                  🗑 Supprimer
                </button>
              </div>
            </div>
          );
        }

        return (
          <button
            key={t.id}
            type="button"
            onMouseDown={() => startLongPress(t.id)}
            onMouseUp={() => { cancelLongPress(); }}
            onMouseLeave={() => cancelLongPress()}
            onTouchStart={() => startLongPress(t.id)}
            onTouchEnd={() => cancelLongPress()}
            onTouchMove={() => cancelLongPress()}
            onClick={() => { if (!didLongPress.current) apply(t.id); }}
            style={{ ...rowStyle(INK), width: "100%", background: on ? tagBg(t.color) : "transparent" }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: 7, flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: tagBg(t.color),
            }}>
              <Icon size={13} weight="Bold" color={t.color} />
            </span>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.name}
            </span>
            {on && <span style={{ color: t.color, fontSize: 13 }}>✓</span>}
          </button>
        );
      })}

      {q && !exact && (
        <div style={{ borderTop: filtered.length > 0 ? `1px solid ${HAIRLINE}` : "none", marginTop: filtered.length > 0 ? 4 : 0, paddingTop: 6 }}>
          <div style={{ padding: "0 8px 6px", fontSize: 12, fontWeight: 700, color: INK_MUTED }}>
            Créer «&nbsp;<span style={{ color: INK }}>{query.trim()}</span>&nbsp;»
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "0 6px 4px" }}>
            {Object.entries(TAG_ICON).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => create(key)}
                title={key}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  border: `1.5px solid ${HAIRLINE}`,
                  background: "#F5F5F3", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} weight="Bold" color={INK_MUTED} />
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !q && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: INK_FAINT }}>Aucun rayon</div>
      )}
    </div>,
    document.body
  );

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openPopover()}
        aria-label={current ? `Rayon : ${current.name}` : "Choisir un rayon"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: current ? "4px 9px 4px 7px" : "4px 9px",
          borderRadius: 999, cursor: "pointer", fontFamily: FONT,
          fontSize: 11, fontWeight: 800,
          border: current ? "none" : `1.5px dashed ${HAIRLINE}`,
          background: current ? tagBg(current.color) : "transparent",
          color: current ? current.color : INK_FAINT,
          opacity: pending ? 0.6 : 1,
        }}
      >
        {current && CurIcon ? (
          <>
            <CurIcon size={13} weight="Bold" color={current.color} />
            {current.name}
          </>
        ) : (
          "+ Rayon"
        )}
      </button>
      {popover}
    </div>
  );
}

function rowStyle(color: string) {
  return {
    display: "flex", alignItems: "center", gap: 9, width: "100%",
    padding: "8px 8px", borderRadius: 10, border: "none", cursor: "pointer",
    background: "transparent", color, fontSize: 13, fontWeight: 700,
    fontFamily: "inherit", textAlign: "left" as const,
  };
}
