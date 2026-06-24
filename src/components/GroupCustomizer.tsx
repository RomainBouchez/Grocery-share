"use client";

import { AVATAR_COLORS, tintForColor, pastille, INK_FAINT } from "@/lib/ui";
import { GROUP_ICONS, GroupIcon } from "@/lib/groupIcons";

const subLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
  color: INK_FAINT, marginBottom: 10,
};

export function GroupCustomizer({
  name, color, icon, onChange,
}: {
  name?: string;
  color: string;
  icon: string;
  onChange: (next: { color: string; icon: string }) => void;
}) {
  const t = tintForColor(color);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Aperçu */}
      <span style={{ ...pastille(t, 16), alignSelf: "flex-start" }}>
        <GroupIcon name={icon} size={16} color={t.text} />
        {name?.trim() || "Aperçu"}
      </span>

      {/* Couleurs */}
      <div>
        <div style={subLabel}>Couleur</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {AVATAR_COLORS.map(c => {
            const on = c === color;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ color: c, icon })}
                aria-label={`Couleur ${c}`}
                aria-pressed={on}
                style={{
                  width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer",
                  border: "none", padding: 0,
                  boxShadow: on ? `inset 0 -2px 0 rgba(0,0,0,0.1), 0 0 0 3px ${c}40` : "inset 0 -2px 0 rgba(0,0,0,0.1)",
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

      {/* Icônes */}
      <div>
        <div style={subLabel}>Icône</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {GROUP_ICONS.map(ic => {
            const on = ic === icon;
            return (
              <button
                key={ic}
                type="button"
                onClick={() => onChange({ color, icon: ic })}
                aria-label={`Icône ${ic}`}
                aria-pressed={on}
                style={{
                  aspectRatio: "1", borderRadius: 13, cursor: "pointer", padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? t.tint : "#F5F5F5",
                  border: on ? `1.5px solid ${t.text}55` : "1.5px solid #fff",
                  boxShadow: on ? "none" : "0 0 0 1px rgba(30,26,20,0.04)",
                  transition: "background .15s ease, border-color .15s ease",
                }}
              >
                <GroupIcon name={ic} size={22} color={on ? t.text : INK_FAINT} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
