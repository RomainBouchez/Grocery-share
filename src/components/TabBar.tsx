"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";

const A = "#5BD08A";
const AT = "#9FE3BD";
const I = "rgba(255,255,255,0.5)";

const F: React.CSSProperties = {
  fontFamily: "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)",
  WebkitFontSmoothing: "antialiased",
};

export function TabBar() {
  const p = usePathname();
  const onGroups = p === "/";
  const onListes = p === "/listes" || p.startsWith("/groups");

  const tab = (active: boolean): React.CSSProperties => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    width: 60, textDecoration: "none", ...F,
  });

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
      padding: "12px 22px 24px",
      background: "rgba(13,13,15,0.72)",
      backdropFilter: "saturate(150%) blur(18px)",
      WebkitBackdropFilter: "saturate(150%) blur(18px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      ...F,
    }}>
      <Link href="/" style={tab(onGroups)}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={onGroups ? A : I} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: onGroups ? 700 : 400, color: onGroups ? AT : I }}>Groupes</span>
      </Link>

      <Link href="/listes" style={tab(onListes)}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={onListes ? A : I} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: onListes ? 700 : 400, color: onListes ? AT : I }}>Listes</span>
      </Link>

      <form action={logout} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 60 }}>
        <button type="submit" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, ...F }}>
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={I} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span style={{ fontSize: 10, color: I }}>Réglages</span>
        </button>
      </form>
    </div>
  );
}
