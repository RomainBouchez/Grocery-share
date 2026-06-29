"use client";

import { useState, useTransition, useRef } from "react";
import { addItem } from "@/lib/actions/items";
import type { TagView } from "@/lib/tags";
import { tagIcon, tagBg } from "@/lib/tags";
import { ACCENT, ACCENT_SOFT, ACCENT_TEXT, INK_FAINT, INK_MUTED, HAIRLINE } from "@/lib/ui";

export function AddItemForm({
  groupId,
  suggestions = [],
  tags = [],
  productTagMap = {},
}: {
  groupId: string;
  suggestions?: string[];
  tags?: TagView[];
  productTagMap?: Record<string, string>;
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagSetByUser, setTagSetByUser] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyAutoTag(label: string) {
    if (tagSetByUser) return;
    const tagId = productTagMap[label.trim().toLowerCase()] ?? null;
    setSelectedTagId(tagId);
  }

  const filteredSuggestions = inputValue.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && s.toLowerCase() !== inputValue.toLowerCase()).slice(0, 6)
    : [];

  const selectedTag = tags.find(t => t.id === selectedTagId) ?? null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = inputValue.trim();
    if (!label || isPending) return;
    const fd = new FormData();
    fd.append("groupId", groupId);
    fd.append("label", label);
    fd.append("tagId", selectedTagId ?? "");
    fd.append("quantity", String(quantity));
    setShowSuggestions(false);
    setShowTagPicker(false);
    startTransition(async () => {
      const result = await addItem(undefined, fd);
      if (!result) {
        setInputValue("");
        setSelectedTagId(null);
        setTagSetByUser(false);
        setQuantity(1);
      }
    });
  }

  function selectSuggestion(s: string) {
    if (suggestBlurTimer.current) clearTimeout(suggestBlurTimer.current);
    setInputValue(s);
    setShowSuggestions(false);
    applyAutoTag(s);
    inputRef.current?.focus();
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Autocomplete dropdown — flotte au-dessus */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", borderRadius: 16, border: `1.5px solid ${HAIRLINE}`,
          boxShadow: "0 8px 28px rgba(30,26,20,0.13)", overflow: "hidden", zIndex: 50,
        }}>
          <div style={{ padding: "6px 14px 4px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: INK_FAINT }}>
            Historique
          </div>
          {filteredSuggestions.map((s, i) => {
            const memTagId = productTagMap[s.toLowerCase()];
            const memTag = memTagId ? tags.find(t => t.id === memTagId) ?? null : null;
            const MemIcon = memTag ? tagIcon(memTag.icon) : null;
            return (
              <button
                key={s}
                type="button"
                onMouseDown={() => selectSuggestion(s)}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", textAlign: "left",
                  padding: "9px 14px",
                  background: "none", border: "none",
                  borderTop: i > 0 ? `1px solid ${HAIRLINE}` : "none",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {/* clock icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={INK_FAINT} strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                </svg>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1B1A16", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s}
                </span>
                {memTag && MemIcon && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                    padding: "3px 8px", borderRadius: 10, background: tagBg(memTag.color),
                  }}>
                    <MemIcon size={10} weight="Bold" color={memTag.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: memTag.color }}>{memTag.name}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tag picker sheet — flotte au-dessus */}
      {showTagPicker && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", borderRadius: 16, border: `1.5px solid ${HAIRLINE}`,
          boxShadow: "0 4px 24px rgba(30,26,20,0.14)",
          padding: "10px 8px", zIndex: 50,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "2px 4px" }}>
            {selectedTagId && (
              <button
                type="button"
                onClick={() => { setSelectedTagId(null); setTagSetByUser(true); setShowTagPicker(false); }}
                style={{
                  padding: "6px 12px", borderRadius: 20, border: `1.5px dashed ${HAIRLINE}`,
                  background: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  color: INK_FAINT, fontFamily: "inherit",
                }}
              >
                ✕ Retirer
              </button>
            )}
            {tags.map(tag => {
              const Icon = tagIcon(tag.icon);
              const isSelected = tag.id === selectedTagId;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => { setSelectedTagId(tag.id); setTagSetByUser(true); setShowTagPicker(false); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 11px", borderRadius: 20,
                    background: isSelected ? tagBg(tag.color) : "#F5F5F3",
                    border: `1.5px solid ${isSelected ? tag.color + "40" : "transparent"}`,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <Icon size={12} weight="Bold" color={tag.color} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: tag.color }}>{tag.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Row 1 : input + bouton ajouter */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); applyAutoTag(e.target.value); setShowSuggestions(true); setShowTagPicker(false); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => { suggestBlurTimer.current = setTimeout(() => setShowSuggestions(false), 150); }}
            placeholder="Ajouter un article…"
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0,
              padding: "10px 4px 10px 12px",
              border: "none", background: "transparent",
              color: "#1B1A16", fontSize: 15, fontWeight: 600,
              fontFamily: "inherit", outline: "none",
              opacity: isPending ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={isPending || !inputValue.trim()}
            aria-label="Ajouter"
            style={{
              flexShrink: 0, width: 44, height: 44,
              borderRadius: 13, border: "1.5px solid rgba(0,0,0,0.06)",
              cursor: isPending || !inputValue.trim() ? "not-allowed" : "pointer",
              background: inputValue.trim() ? "#2FB36A" : "#C8C5BC",
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
              boxShadow: inputValue.trim() ? "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 6px 14px rgba(47,179,106,0.28)" : "none",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>

        {/* Row 2 : rayon + quantité */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4, paddingBottom: 2 }}>
          {/* Tag trigger */}
          <button
            type="button"
            onClick={() => { setShowTagPicker(v => !v); setShowSuggestions(false); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 20,
              background: selectedTag ? tagBg(selectedTag.color) : "#EFEFED",
              border: `1.5px solid ${selectedTag ? selectedTag.color + "30" : "transparent"}`,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {selectedTag ? (
              (() => {
                const Icon = tagIcon(selectedTag.icon);
                return (
                  <>
                    <Icon size={11} weight="Bold" color={selectedTag.color} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: selectedTag.color }}>{selectedTag.name}</span>
                  </>
                );
              })()
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: INK_FAINT }}>· Rayon</span>
            )}
          </button>

          <div style={{ flex: 1 }} />

          {/* Quantity stepper */}
          <div style={{ display: "flex", alignItems: "center", borderRadius: 12, border: `1.5px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              style={{
                padding: "4px 11px", background: "none", border: "none",
                cursor: quantity > 1 ? "pointer" : "default",
                color: quantity > 1 ? INK_MUTED : HAIRLINE,
                fontFamily: "inherit", fontWeight: 700, fontSize: 16, lineHeight: 1,
              }}
            >−</button>
            <span style={{ minWidth: 24, textAlign: "center", fontSize: 13, fontWeight: 800, color: quantity > 1 ? ACCENT_TEXT : INK_FAINT }}>
              ×{quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(99, q + 1))}
              style={{
                padding: "4px 11px", background: "none", border: "none", cursor: "pointer",
                color: INK_MUTED, fontFamily: "inherit", fontWeight: 700, fontSize: 16, lineHeight: 1,
              }}
            >+</button>
          </div>
        </div>
      </form>
    </div>
  );
}
