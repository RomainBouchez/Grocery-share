import type { CSSProperties } from "react";

/* ============================================================
   Système visuel « Soft Light / Pillboard » (v2)
   Source unique de vérité — importé partout pour éviter la dérive.
   Réf : Identité Visuelle v2 (fond crème, cartes blanches en relief,
   pastilles colorées, chips outline, typo grasse, icônes Solar).
   ============================================================ */

/* — Fonds & encre — */
export const BG = "#F5F5F5";
export const CARD = "#FFFFFF";
export const SUNKEN = "#F4F0E9"; // tuiles/encarts posés dans une carte
export const INK_STRONG = "#1B1A16";
export const INK = "#2B2A25";
export const INK_MUTED = "#807C72";
export const INK_FAINT = "#A8A498";
export const INK_DONE = "#B6B2A8"; // texte barré (coché)
export const HAIRLINE = "#ECE9E3";

/* — Accent (vert) — */
export const ACCENT = "#2FB36A";
export const ACCENT_SOFT = "#E2F5EB";
export const ACCENT_TEXT = "#1E8F55";
export const ON_ACCENT = "#FFFFFF";

/* — Destructif (corail) — */
export const DANGER = "#E8503A";
export const DANGER_SOFT = "#FDE7E3";

/* — Relief carte — */
export const CARD_BORDER = "2.5px solid #FFFFFF";
export const CARD_SHADOW =
  "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 18px 40px rgba(30,26,20,0.09)";
export const CARD_SHADOW_SM =
  "0 0 0 1px rgba(30,26,20,0.05), 0 6px 16px rgba(30,26,20,0.06)";
export const CARD_SHADOW_FOCUS =
  "0 0 0 1px rgba(30,26,20,0.06), 0 2px 4px rgba(30,26,20,0.05), 0 30px 60px rgba(30,26,20,0.13)";

/* — Teintes catégorielles : avatar (plein) + paire tint/texte (chips, pastilles) — */
export type Tint = { avatar: string; tint: string; text: string };
export const TINTS: Tint[] = [
  { avatar: "#F0813F", tint: "#FCEBD8", text: "#D9852A" }, // orange
  { avatar: "#7E91FF", tint: "#E5E9FE", text: "#5E6FE0" }, // bleu
  { avatar: "#C99BF0", tint: "#ECEAFE", text: "#7B6EF6" }, // violet
  { avatar: ACCENT, tint: ACCENT_SOFT, text: ACCENT_TEXT }, // vert
  { avatar: "#F0C53F", tint: "#FDF0D6", text: "#D9921C" }, // ambre
];
export const AVATAR_COLORS = TINTS.map((t) => t.avatar);

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h % mod;
}
/** Couleur d'avatar déterministe à partir d'une chaîne (id, nom…). */
export function avatarColor(s: string) {
  return AVATAR_COLORS[hashIndex(s, AVATAR_COLORS.length)];
}
/** Couleur choisie par l'utilisateur si valide, sinon dérivée de l'id. */
export function colorFor(id: string, chosen?: string | null) {
  return chosen && AVATAR_COLORS.includes(chosen) ? chosen : avatarColor(id);
}
/** Paire teinte/texte déterministe à partir d'une chaîne. */
export function tintFor(s: string): Tint {
  return TINTS[hashIndex(s, TINTS.length)];
}
/** Retrouve la paire teinte/texte à partir d'une couleur d'avatar connue. */
export function tintForColor(avatar: string): Tint {
  return TINTS.find((t) => t.avatar === avatar) ?? TINTS[3];
}

/* — Surfaces — */
export const card: CSSProperties = {
  background: CARD,
  border: CARD_BORDER,
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};
export const cardSm: CSSProperties = {
  background: CARD,
  border: "1.5px solid #fff",
  borderRadius: 20,
  boxShadow: CARD_SHADOW_SM,
};

/**
 * Système de boutons à 4 tiers.
 * Tier 1 primary (aplat accent biseauté) · 2 secondary (carte blanche relief)
 * · 3 ghost · 4 destructive. Cibles tactiles ≥ 44px (primary/secondary ≥ 52px).
 */
export const btnPrimary: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
  minHeight: 52, padding: "15px 24px", borderRadius: 999, cursor: "pointer",
  background: ACCENT, color: ON_ACCENT, fontSize: 16, fontWeight: 800, fontFamily: "inherit",
  border: "1.5px solid rgba(0,0,0,0.06)",
  boxShadow:
    "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 10px 22px rgba(47,179,106,0.3)",
};

export const btnSecondary: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  minHeight: 52, padding: "15px 22px", borderRadius: 999, cursor: "pointer",
  background: CARD, border: CARD_BORDER, color: INK,
  fontSize: 15, fontWeight: 800, fontFamily: "inherit",
  boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 14px rgba(30,26,20,0.07)",
};

export const btnGhost: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "none", cursor: "pointer",
  background: "none", color: ACCENT_TEXT, fontSize: 14, fontWeight: 800, fontFamily: "inherit",
};

export const btnDanger: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  minHeight: 44, padding: "10px 14px", borderRadius: 12, cursor: "pointer",
  background: DANGER_SOFT, border: `1.5px solid rgba(232,80,58,0.4)`,
  color: DANGER, fontSize: 14, fontWeight: 800, fontFamily: "inherit",
};

/* — Champ de saisie — */
export const input: CSSProperties = {
  width: "100%", padding: "13px 15px", borderRadius: 14, boxSizing: "border-box",
  background: BG, border: `1.5px solid ${HAIRLINE}`,
  color: INK_STRONG, fontSize: 15, fontWeight: 600, fontFamily: "inherit", outline: "none",
  transition: "border-color .2s ease, box-shadow .2s ease, background .2s ease",
};

/* — Pastille de titre (pill teintée + icône) — */
export function pastille(t: Tint, fontSize = 16): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "7px 14px 7px 11px", borderRadius: 999,
    background: t.tint, color: t.text, fontSize, fontWeight: 800, letterSpacing: "-0.01em",
  };
}

/* — Case à cocher (relief, pop au cochage) — */
export function checkbox(checked: boolean, size = 24): CSSProperties {
  return {
    width: size, height: size, borderRadius: 9, flexShrink: 0, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: checked ? ACCENT : CARD,
    border: checked ? "none" : "2px solid rgba(28,25,20,0.14)",
    boxShadow: checked ? "inset 0 -1.5px 0 rgba(0,0,0,0.12)" : "none",
    transition: "background .2s ease, border-color .2s ease",
  };
}

/* — Avatar circulaire (texte blanc, liseré crème) — */
export function avatarStyle(color: string, size = 27): CSSProperties {
  return {
    width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
    fontSize: size <= 24 ? 10 : 11, fontWeight: 800, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "2.5px solid #fff",
  };
}

/* — Chip membre (tint + mini-avatar) — ex : « ● Mia » — */
export function memberChip(t: Tint): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 10px 5px 7px", borderRadius: 999,
    background: t.tint, color: t.text, fontSize: 11, fontWeight: 800,
  };
}

/* — Police partagée — */
export const FONT = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";
