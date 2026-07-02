import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, isAdmin, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setUserActive } from "@/lib/actions/admin";
import { AdminPushToggle } from "@/components/AdminPushToggle";
import { initials } from "@/lib/utils";
import {
  colorFor, card, btnPrimary, btnSecondary,
  INK_STRONG, INK_MUTED, INK_FAINT, ACCENT_TEXT, ACCENT_SOFT, DANGER, DANGER_SOFT, FONT,
} from "@/lib/ui";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "asc" }, { createdAt: "desc" }],
  });

  const pending = users.filter((u) => !u.isActive);
  const activeUsers = users.filter((u) => u.isActive);
  const t = await getTranslations("admin");
  const rowLabels = { activate: t("activate"), deactivate: t("deactivate") };

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG }}>
      <div style={{ padding: "56px 18px 60px", maxWidth: 560, margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: 13, fontWeight: 800, color: ACCENT_TEXT, textDecoration: "none" }}>
          {t("back")}
        </Link>
        <h1 style={{ margin: "14px 0 4px", fontSize: 28, fontWeight: 900, letterSpacing: "-0.035em" }}>
          {t("title")}
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, fontWeight: 500, color: INK_MUTED }}>
          {t("subtitle")} {pending.length > 0 && (
            <strong style={{ color: DANGER }}>{t("pendingCount", { count: pending.length })}</strong>
          )}
        </p>

        <AdminPushToggle />

        {pending.length > 0 && (
          <Section title={t("pendingSection", { count: pending.length })}>
            {pending.map((u) => (
              <UserRow key={u.id} u={u} labels={rowLabels} />
            ))}
          </Section>
        )}

        <Section title={t("activeSection", { count: activeUsers.length })}>
          {activeUsers.map((u) => (
            <UserRow key={u.id} u={u} labels={rowLabels} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}

function UserRow({ u, labels }: { u: { id: string; name: string; email: string; color: string | null; isActive: boolean }; labels: { activate: string; deactivate: string } }) {
  const color = colorFor(u.id, u.color);
  const admin = isAdminEmail(u.email);

  return (
    <div style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13 }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", background: color, color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05)" }}>
        {initials(u.name)}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
          {admin && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: ACCENT_SOFT, color: ACCENT_TEXT }}>ADMIN</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: INK_MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
      </div>

      {admin ? (
        <span style={{ fontSize: 12, fontWeight: 800, color: INK_FAINT, flexShrink: 0 }}>—</span>
      ) : (
        <form action={setUserActive} style={{ flexShrink: 0 }}>
          <input type="hidden" name="userId" value={u.id} />
          <input type="hidden" name="active" value={u.isActive ? "false" : "true"} />
          <button
            type="submit"
            style={u.isActive
              ? { ...btnSecondary, minHeight: 40, padding: "8px 16px", fontSize: 13, color: DANGER, background: DANGER_SOFT, border: "1.5px solid rgba(232,80,58,0.3)", boxShadow: "none" }
              : { ...btnPrimary, minHeight: 40, padding: "8px 18px", fontSize: 13 }}
          >
            {u.isActive ? labels.deactivate : labels.activate}
          </button>
        </form>
      )}
    </div>
  );
}
