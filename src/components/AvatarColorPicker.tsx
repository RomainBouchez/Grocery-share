"use client";

import { useState, useTransition } from "react";
import { setProfileColor } from "@/lib/actions/auth";
import { AVATAR_COLORS } from "@/lib/ui";

export function AvatarColorPicker({
  initials,
  current,
}: {
  initials: string;
  current: string;
}) {
  const [color, setColor] = useState(current);
  const [, startTransition] = useTransition();

  function pick(c: string) {
    if (c === color) return;
    setColor(c); // optimiste
    const fd = new FormData();
    fd.append("color", c);
    startTransition(() => setProfileColor(fd));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {/* Aperçu */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: color, color: "#fff",
        fontSize: 20, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, border: "2.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05)",
        transition: "background .2s ease",
      }}>
        {initials}
      </div>

      {/* Pastilles de couleur */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {AVATAR_COLORS.map(c => {
          const on = c === color;
          return (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              aria-label={`Couleur ${c}`}
              aria-pressed={on}
              style={{
                width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer",
                border: "none", padding: 0,
                boxShadow: on
                  ? `inset 0 -2px 0 rgba(0,0,0,0.1), 0 0 0 3px ${c}40`
                  : "inset 0 -2px 0 rgba(0,0,0,0.1)",
                outline: on ? "2px solid #fff" : "2px solid transparent",
                outlineOffset: -4,
                transition: "box-shadow .2s ease",
              }}
            >
              {on && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "auto" }}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
