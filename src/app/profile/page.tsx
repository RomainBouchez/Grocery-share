import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getUserLocale } from "@/i18n/locale";
import { prisma } from "@/lib/db";
import { TabBar } from "@/components/TabBar";
import { LogoutButton } from "@/components/LogoutButton";
import { AvatarColorPicker } from "@/components/AvatarColorPicker";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { initials } from "@/lib/utils";
import { colorFor, card, cardSm, INK_STRONG, INK_MUTED, INK_FAINT, ACCENT_TEXT, FONT } from "@/lib/ui";

const FF = FONT;

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations("profile");
  const locale = await getUserLocale();
  const groupCount = await prisma.groupMember.count({ where: { userId: user.id } });
  const color = colorFor(user.id, user.color);

  return (
    <div style={{ fontFamily: FF, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "56px 18px 130px", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 22px", fontSize: 28, fontWeight: 900, letterSpacing: "-0.035em" }}>{t("title")}</h1>

        <div style={{ ...card, padding: 22, marginBottom: 14, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: color, color: "#fff", fontSize: 20, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05)" }}>
            {initials(user.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK_MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ ...cardSm, flex: 1, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, lineHeight: 0.95 }}>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", color: INK_STRONG }}>{groupCount}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK_FAINT, marginTop: 4 }}>{t("groups", { count: groupCount })}</div>
          </div>
        </div>

        <div style={{ ...card, padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, marginBottom: 16 }}>{t("avatarColor")}</div>
          <AvatarColorPicker initials={initials(user.name)} current={color} />
        </div>

        <div style={{ ...card, padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, marginBottom: 16 }}>{t("language")}</div>
          <LanguageSwitcher current={locale} />
        </div>

        {isAdmin(user) && (
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <div style={{ ...card, padding: "18px 20px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em", color: INK_STRONG }}>{t("admin")}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK_MUTED }}>{t("adminSubtitle")}</div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: ACCENT_TEXT }}>→</span>
            </div>
          </Link>
        )}

        <LogoutButton />
      </div>

      <TabBar />
    </div>
  );
}
