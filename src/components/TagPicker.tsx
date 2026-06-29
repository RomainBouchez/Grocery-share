"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { setItemTag, createTag } from "@/lib/actions/tags";
import { tagIcon, tagBg, pickNewTagColor, type TagView } from "@/lib/tags";
import { INK, INK_MUTED, INK_FAINT, HAIRLINE, CARD, FONT } from "@/lib/ui";

/**
 * Sélecteur de rayon façon Notion : puce déclencheuse + popover avec recherche
 * et création à la volée. 1 tag par article.
 */
export function TagPicker({
  itemId, groupId, currentTagId, tags,
}: {
  itemId: string;
  groupId: string;
  currentTagId?: string | null;
  tags: TagView[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = tags.find((t) => t.id === currentTagId) ?? null;

  // Fermer au clic dehors.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

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

  function create() {
    const name = query.trim();
    if (!name) return;
    const color = pickNewTagColor(name);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("groupId", groupId);
      fd.append("name", name);
      fd.append("icon", "Tag");
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

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      {/* Déclencheur */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {/* Popover */}
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60,
            width: 230, maxHeight: 290, overflowY: "auto",
            background: CARD, borderRadius: 14, border: `1.5px solid ${HAIRLINE}`,
            boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 12px 30px rgba(30,26,20,0.16)",
            padding: 8, fontFamily: FONT,
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher ou créer…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 10px",
              borderRadius: 10, border: `1.5px solid ${HAIRLINE}`, background: "#F5F5F5",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: INK, outline: "none",
              marginBottom: 6,
            }}
          />

          {/* Retirer le rayon */}
          {current && (
            <button
              type="button"
              onClick={() => apply(null)}
              style={rowStyle(INK_MUTED)}
            >
              ✕ Retirer le rayon
            </button>
          )}

          {filtered.map((t) => {
            const Icon = tagIcon(t.icon);
            const on = t.id === currentTagId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => apply(t.id)}
                style={{ ...rowStyle(INK), background: on ? tagBg(t.color) : "transparent" }}
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

          {/* Créer un nouveau tag */}
          {q && !exact && (
            <button type="button" onClick={create} style={rowStyle(INK)}>
              <span style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "#F5F5F5", color: INK_MUTED, fontSize: 15, fontWeight: 700,
              }}>+</span>
              <span style={{ flex: 1, textAlign: "left" }}>
                Créer «&nbsp;<strong>{query.trim()}</strong>&nbsp;»
              </span>
            </button>
          )}

          {filtered.length === 0 && !q && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: INK_FAINT }}>Aucun rayon</div>
          )}
        </div>
      )}
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
