"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, ChecklistMinimalistic, UserRounded } from "@/lib/icons";
import { ACCENT, INK_FAINT, FONT } from "@/lib/ui";

const tab: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
  flex: 1, minHeight: 48, textDecoration: "none", fontFamily: FONT,
};

function label(active: boolean): React.CSSProperties {
  return { fontSize: 10, fontWeight: active ? 800 : 700, color: active ? ACCENT : INK_FAINT };
}

export function TabBar() {
  const t = useTranslations("nav");
  const p = usePathname();
  const onGroups = p === "/";
  const onListes = p === "/listes" || p.startsWith("/groups");
  const onProfile = p.startsWith("/profile");

  return (
    <div style={{
      position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 50,
      maxWidth: 460, margin: "0 auto",
      padding: "13px 14px 14px",
      background: "rgba(252,251,249,0.86)",
      backdropFilter: "saturate(150%) blur(18px)",
      WebkitBackdropFilter: "saturate(150%) blur(18px)",
      border: "1.5px solid #FFFFFF", borderRadius: 26,
      boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 10px 30px rgba(30,26,20,0.12)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      fontFamily: FONT,
    }}>
      <Link href="/" style={tab} aria-label={t("groups")}>
        <Home weight={onGroups ? "Bold" : "Linear"} size={24} color={onGroups ? ACCENT : INK_FAINT} />
        <span style={label(onGroups)}>{t("groups")}</span>
      </Link>

      <Link href="/listes" style={tab} aria-label={t("lists")}>
        <ChecklistMinimalistic weight={onListes ? "Bold" : "Linear"} size={24} color={onListes ? ACCENT : INK_FAINT} />
        <span style={label(onListes)}>{t("lists")}</span>
      </Link>

      <Link href="/profile" style={tab} aria-label={t("profile")}>
        <UserRounded weight={onProfile ? "Bold" : "Linear"} size={24} color={onProfile ? ACCENT : INK_FAINT} />
        <span style={label(onProfile)}>{t("profile")}</span>
      </Link>
    </div>
  );
}
