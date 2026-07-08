import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatEuro, initials } from "@/lib/utils";
import { resolveGroupColors } from "@/lib/colors";
import { TicketDebtRows } from "@/components/TicketDebtRows";
import {
  avatarStyle, colorFor,
  INK, INK_STRONG, INK_MUTED, INK_FAINT, HAIRLINE, FONT,
} from "@/lib/ui";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; ticketId: string }>;
}) {
  const { groupId, ticketId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
    include: { group: { include: { members: { include: { user: true } } } } },
  });
  if (!membership) notFound();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      paidBy: { select: { id: true, name: true, color: true } },
      debts: { include: { user: { select: { id: true, name: true, color: true } } } },
    },
  });
  if (!ticket || ticket.groupId !== groupId) notFound();

  const gColors = resolveGroupColors(
    user.id, user.color,
    membership.group.members.map(m => ({ id: m.user.id, color: m.user.color })),
  );
  const tr = await getTranslations("tickets");
  const payerColor = gColors.get(ticket.paidBy.id) ?? colorFor(ticket.paidBy.id, ticket.paidBy.color);
  const done = ticket.debts.filter(d => d.reimbursedAt).length;
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(ticket.createdAt);

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/groups/${groupId}/tickets`} style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          {tr("new.backToTickets")}
        </Link>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em" }}>{tr("detailTitle")}</h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 500, color: INK_MUTED }}>
          {tr("addedOn", { date })}
        </p>

        {ticket.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/tickets/${ticket.id}/photo`}
            alt={tr("photoAlt")}
            style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 18, border: `1.5px solid ${HAIRLINE}`, background: "#fff", marginBottom: 20 }}
          />
        )}

        <div style={{ background: "#fff", borderRadius: 18, border: `1.5px solid ${HAIRLINE}`, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={avatarStyle(payerColor, 32)}>{initials(ticket.paidBy.name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{tr("paidBy", { name: ticket.paidBy.name.split(" ")[0] })}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: INK_FAINT }}>{tr("progress", { done, total: ticket.debts.length })}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: INK_FAINT }}>{tr("total")}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: INK_STRONG }}>{formatEuro(ticket.totalAmount)}</div>
            </div>
          </div>

          <TicketDebtRows debts={ticket.debts} groupId={groupId} gColors={gColors} />
        </div>
      </div>
    </div>
  );
}
