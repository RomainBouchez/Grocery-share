import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const FF = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";

// Lien d'invitation : /join/<CODE> — rejoint le groupe puis redirige dessus.
export default async function JoinByLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/join/${normalized}`);

  const group = await prisma.group.findUnique({ where: { inviteCode: normalized } });

  if (!group) {
    const t = await getTranslations("group");
    return (
      <main style={{
        fontFamily: FF, WebkitFontSmoothing: "antialiased",
        minHeight: "100dvh", background: "#F5F5F5", color: "#1B1A16",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
          <div style={{
            background: "#FFFFFF", border: "2.5px solid #fff",
            borderRadius: 24, padding: "36px 28px",
            boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 18px 40px rgba(30,26,20,0.09)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
            <h1 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: "#1B1A16" }}>
              {t("inviteNotFound")}
            </h1>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: "#807C72" }}>
              {t.rich("inviteNotFoundDesc", {
                value: normalized,
                code: (chunks) => (
                  <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800, color: "#1B1A16", letterSpacing: "0.05em" }}>{chunks}</span>
                ),
              })}
            </p>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 24, padding: "15px 24px", borderRadius: 999, textDecoration: "none",
              background: "#2FB36A", color: "#fff", fontSize: 15, fontWeight: 800,
              border: "1.5px solid rgba(0,0,0,0.06)",
              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 10px 22px rgba(47,179,106,0.3)",
            }}>
              {t("backHome")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    create: { userId: user.id, groupId: group.id, role: "member" },
    update: {},
  });

  redirect(`/groups/${group.id}`);
}
