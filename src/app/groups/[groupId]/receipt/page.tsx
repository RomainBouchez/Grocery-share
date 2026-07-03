import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReceiptScanner } from "@/components/ReceiptScanner";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
    include: { group: { include: { members: { include: { user: true } } } } },
  });
  if (!membership) notFound();

  const members = membership.group.members.map(m => ({ userId: m.user.id, name: m.user.name }));

  const t = await getTranslations();
  const FF = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";

  // Scan OCR + Claude réservé au Premium : garde d'accès direct par URL.
  if (!hasPremiumAccess(user)) {
    return (
      <div style={{ fontFamily: FF, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: "#1B1A16" }}>
        <div style={{ padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
          <Link href={`/groups/${groupId}`} style={{ fontSize: 13, fontWeight: 700, color: "#807C72", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
            {t("receipt.backToList")}
          </Link>
          <div style={{ background: "#FFFFFF", border: "1.5px solid #fff", borderRadius: 22, padding: "28px 24px", boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 18px 40px rgba(30,26,20,0.09)" }}>
            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: "#FDF0D6", color: "#D9921C", fontSize: 10, fontWeight: 900, letterSpacing: "0.05em", marginBottom: 12 }}>
              {t("premium.premiumBadge")}
            </span>
            <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}>{t("receipt.premiumRequiredTitle")}</h1>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#807C72", lineHeight: 1.55 }}>{t("receipt.premiumRequiredDesc")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FF, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: "#1B1A16", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/groups/${groupId}`} style={{ fontSize: 13, fontWeight: 700, color: "#807C72", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          {t("receipt.backToList")}
        </Link>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em" }}>{t("group.iDidShopping")}</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, fontWeight: 500, color: "#807C72", lineHeight: 1.5 }}>
          {t("receipt.intro")}
        </p>
        <ReceiptScanner groupId={groupId} members={members} currentUserId={user.id} />
      </div>
    </div>
  );
}
