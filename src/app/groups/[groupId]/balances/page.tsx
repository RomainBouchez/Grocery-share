import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeGroupBalances } from "@/lib/balances";
import { recordSettlement } from "@/lib/actions/balances";
import { formatEuro, initials } from "@/lib/utils";
import {
  avatarStyle, colorFor,
  ACCENT_TEXT, DANGER, INK, INK_STRONG, INK_MUTED, INK_FAINT, HAIRLINE, FONT,
} from "@/lib/ui";

export default async function BalancesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
    include: { group: true },
  });
  if (!membership) notFound();
  // Module désactivé → page inaccessible.
  if (!membership.group.expenseSharingEnabled) notFound();

  const { nets, suggestions, everyoneSettled } = await computeGroupBalances(groupId);

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/groups/${groupId}`} style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          ‹ Retour à la liste
        </Link>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em" }}>Équilibre des comptes</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, fontWeight: 500, color: INK_MUTED, lineHeight: 1.5 }}>
          Calculé à partir des tickets : qui a payé, qui partage chaque article et avec combien de parts.
        </p>

        {/* Balance par membre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
          {nets.map((n) => {
            const positive = n.net > 0.005;
            const negative = n.net < -0.005;
            const amountColor = positive ? ACCENT_TEXT : negative ? DANGER : INK_FAINT;
            const sub = positive ? "on lui doit" : negative ? "doit" : "à jour";
            return (
              <div key={n.userId} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16, border: `1.5px solid ${HAIRLINE}`, padding: "12px 14px" }}>
                <span style={avatarStyle(colorFor(n.userId, n.color), 34)}>{initials(n.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.name}{n.userId === user.id && <span style={{ color: INK_FAINT }}> (toi)</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: INK_FAINT }}>{sub}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: amountColor }}>
                  {positive ? "+" : ""}{formatEuro(n.net)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Qui paie qui */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, margin: "0 4px 12px" }}>
          Qui paie qui
        </div>

        {everyoneSettled || suggestions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 20px", background: "#fff", borderRadius: 22, border: "2px dashed rgba(28,25,20,0.14)" }}>
            <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: INK_STRONG }}>Tout est équilibré 🎉</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK_MUTED }}>Personne ne doit rien à personne.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s) => (
              <div key={`${s.fromUserId}-${s.toUserId}`} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16, border: `1.5px solid ${HAIRLINE}`, padding: "12px 14px" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...avatarStyle(colorFor(s.fromUserId), 26), fontSize: 10 }}>{initials(s.fromName)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{s.fromName.split(" ")[0]}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: INK_FAINT }}>doit</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: INK_STRONG }}>{formatEuro(s.amount)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: INK_FAINT }}>à</span>
                  <span style={{ ...avatarStyle(colorFor(s.toUserId), 26), fontSize: 10 }}>{initials(s.toName)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{s.toName.split(" ")[0]}</span>
                </div>
                <form action={recordSettlement} style={{ flexShrink: 0 }}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="fromUserId" value={s.fromUserId} />
                  <input type="hidden" name="toUserId" value={s.toUserId} />
                  <input type="hidden" name="amount" value={s.amount} />
                  <button type="submit" style={{
                    minHeight: 36, padding: "8px 14px", borderRadius: 12, cursor: "pointer",
                    background: "#fff", border: `1.5px solid ${HAIRLINE}`, color: ACCENT_TEXT,
                    fontSize: 12.5, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap",
                  }}>
                    Marquer remboursé
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
