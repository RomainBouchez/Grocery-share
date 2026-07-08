import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatEuro, initials } from "@/lib/utils";
import { resolveGroupColors } from "@/lib/colors";
import { TicketDebtRows } from "@/components/TicketDebtRows";
import {
  avatarStyle, colorFor, btnPrimary,
  INK, INK_STRONG, INK_MUTED, INK_FAINT, HAIRLINE, FONT,
} from "@/lib/ui";
import { AddCircle } from "@/lib/icons";

export default async function TicketsPage({
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

  const tickets = await prisma.ticket.findMany({
    where: { groupId, debts: { some: { reimbursedAt: null } } },
    include: {
      paidBy: { select: { id: true, name: true, color: true } },
      debts: { include: { user: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const gColors = resolveGroupColors(
    user.id, user.color,
    membership.group.members.map(m => ({ id: m.user.id, color: m.user.color })),
  );
  const tr = await getTranslations();

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/groups/${groupId}`} style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          {tr("receipt.backToList")}
        </Link>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em" }}>{tr("tickets.title")}</h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 500, color: INK_MUTED, lineHeight: 1.5 }}>
          {tr("tickets.intro")}
        </p>

        <Link href={`/groups/${groupId}/tickets/new`} style={{ ...btnPrimary, textDecoration: "none", width: "100%", boxSizing: "border-box", marginBottom: 24 }}>
          <AddCircle weight="Bold" size={18} color="#fff" />
          {tr("tickets.addCta")}
        </Link>

        {tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px", background: "#fff", borderRadius: 22, border: "2px dashed rgba(28,25,20,0.14)" }}>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: INK_STRONG }}>{tr("tickets.empty")}</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK_MUTED }}>{tr("tickets.emptyHint")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tickets.map(ticket => {
              const done = ticket.debts.filter(d => d.reimbursedAt).length;
              const payerColor = gColors.get(ticket.paidBy.id) ?? colorFor(ticket.paidBy.id, ticket.paidBy.color);
              return (
                <div key={ticket.id} style={{ background: "#fff", borderRadius: 18, border: `1.5px solid ${HAIRLINE}`, padding: "14px 16px" }}>
                  <Link href={`/groups/${groupId}/tickets/${ticket.id}`} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, textDecoration: "none", color: "inherit" }}>
                    <span style={avatarStyle(payerColor, 32)}>{initials(ticket.paidBy.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{tr("tickets.paidBy", { name: ticket.paidBy.name.split(" ")[0] })}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: INK_FAINT }}>{tr("tickets.progress", { done, total: ticket.debts.length })}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: INK_FAINT }}>{tr("tickets.total")}</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: INK_STRONG }}>{formatEuro(ticket.totalAmount)}</div>
                    </div>
                  </Link>

                  <TicketDebtRows debts={ticket.debts} groupId={groupId} gColors={gColors} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
