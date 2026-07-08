import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TicketEntryChooser } from "@/components/TicketEntryChooser";
import { FONT, INK_STRONG, INK_MUTED } from "@/lib/ui";

export default async function NewTicketPage({
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
  const t = await getTranslations("tickets.new");

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/groups/${groupId}/tickets`} style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          {t("backToTickets")}
        </Link>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em" }}>{t("title")}</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, fontWeight: 500, color: INK_MUTED, lineHeight: 1.5 }}>
          {t("intro")}
        </p>
        <TicketEntryChooser groupId={groupId} members={members} currentUserId={user.id} isPremium={hasPremiumAccess(user)} />
      </div>
    </div>
  );
}
