import { getTranslations } from "next-intl/server";
import { markDebtReimbursed } from "@/lib/actions/tickets";
import { formatEuro, initials } from "@/lib/utils";
import { avatarStyle, colorFor, ACCENT_TEXT, DANGER, INK, INK_DONE, HAIRLINE } from "@/lib/ui";

type Debt = {
  id: string;
  amount: number;
  reimbursedAt: Date | null;
  user: { id: string; name: string; color: string | null };
};

/** Lignes de débiteurs d'un ticket + bouton "Marquer remboursé". Partagé entre la liste et le détail. */
export async function TicketDebtRows({
  debts, groupId, gColors,
}: {
  debts: Debt[];
  groupId: string;
  gColors: Map<string, string>;
}) {
  const tr = await getTranslations("tickets");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {debts.map(debt => {
        const reimbursed = !!debt.reimbursedAt;
        const debtColor = gColors.get(debt.user.id) ?? colorFor(debt.user.id, debt.user.color);
        return (
          <div key={debt.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12,
            background: reimbursed ? "#F5F5F5" : "#FAFAF8",
          }}>
            <span style={{ ...avatarStyle(debtColor, 24), fontSize: 10, opacity: reimbursed ? 0.5 : 1 }}>{initials(debt.user.name)}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: reimbursed ? INK_DONE : INK, textDecoration: reimbursed ? "line-through" : "none" }}>
              {debt.user.name}
            </span>
            {reimbursed ? (
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT_TEXT }}>{tr("reimbursed")}</span>
            ) : (
              <>
                <span style={{ fontSize: 13.5, fontWeight: 900, color: DANGER, whiteSpace: "nowrap" }}>{tr("owes", { amount: formatEuro(debt.amount) })}</span>
                <form action={markDebtReimbursed}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="debtId" value={debt.id} />
                  <button type="submit" style={{
                    minHeight: 32, padding: "7px 12px", borderRadius: 10, cursor: "pointer",
                    background: "#fff", border: `1.5px solid ${HAIRLINE}`, color: ACCENT_TEXT,
                    fontSize: 11.5, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap",
                  }}>
                    {tr("markReimbursed")}
                  </button>
                </form>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
