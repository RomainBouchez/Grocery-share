import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ItemCard, type ItemView } from "@/components/ItemCard";
import { InviteCode } from "@/components/InviteCode";
import { AddItemForm } from "@/components/AddItemForm";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";
import { Cart3, Scale } from "@/lib/icons";
import { GroupAppearance } from "@/components/GroupAppearance";
import {
  colorFor, avatarStyle, tintForColor,
  ACCENT, INK_STRONG, INK_MUTED, INK_FAINT, HAIRLINE, FONT,
} from "@/lib/ui";

export default async function GroupPage({
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

  const { group } = membership;

  let list = await prisma.shoppingList.findFirst({
    where: { groupId, status: { in: ["planning", "shopping"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!list) {
    list = await prisma.shoppingList.create({ data: { groupId, status: "planning" } });
  }

  const items = await prisma.listItem.findMany({
    where: { listId: list.id },
    include: { addedBy: true, participants: { include: { user: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const itemViews: ItemView[] = items.map(it => ({
    id: it.id, label: it.label, status: it.status,
    addedByUserId: it.addedByUserId, addedByName: it.addedBy.name,
    participants: it.participants.map(p => ({ userId: p.userId, name: p.user.name, parts: p.parts })),
  }));

  const memberViews = group.members.map(m => ({ userId: m.user.id, name: m.user.name }));

  const myProducts = await prisma.userProduct.findMany({
    where: { userId: user.id },
    orderBy: [{ buyCount: "desc" }, { lastBoughtAt: "desc" }],
    select: { label: true },
    take: 100,
  });
  const suggestions = myProducts.map(p => p.label);

  const pending = itemViews.filter(i => i.status !== "bought");
  const bought = itemViews.filter(i => i.status === "bought");
  const pct = itemViews.length > 0 ? Math.round((bought.length / itemViews.length) * 100) : 0;
  const t = tintForColor(colorFor(group.id, group.color));

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 210 }}>
        {/* Header */}
        <div style={{ padding: "44px 18px 0", marginBottom: 18 }}>
          <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            ‹ Groupes
          </Link>
          <GroupAppearance groupId={groupId} name={group.name} color={colorFor(group.id, group.color)} icon={group.icon} isOwner={membership.role === "owner"} expenseSharingEnabled={group.expenseSharingEnabled}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {group.members.slice(0, 4).map((m, i) => (
                <div key={m.user.id} title={m.user.name} style={{ ...avatarStyle(colorFor(m.user.id, m.user.color), 30), marginLeft: i > 0 ? -9 : 0 }}>
                  {initials(m.user.name)}
                </div>
              ))}
              {group.members.length > 4 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: INK_FAINT, marginLeft: 6 }}>+{group.members.length - 4}</span>
              )}
            </div>
          </GroupAppearance>

          <div style={{ marginTop: 14 }}>
            <InviteCode code={group.inviteCode} />
          </div>

          {/* Progress bar */}
          {itemViews.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK_MUTED }}>{pending.length} à acheter</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{bought.length} / {itemViews.length} fait</span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: t.tint, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: t.text, boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.1)", transition: "width .4s" }} />
              </div>
            </div>
          )}

          {/* Faire les courses button */}
          <Link href={`/groups/${groupId}/receipt`} style={{
            width: "100%", boxSizing: "border-box", marginTop: 16,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
            padding: "15px", borderRadius: 16, textDecoration: "none",
            background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 800,
            border: "1.5px solid rgba(0,0,0,0.06)",
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 8px 18px rgba(47,179,106,0.3)",
          }}>
            <Cart3 weight="Bold" size={18} color="#fff" />
            J&apos;ai fait les courses
          </Link>

          {/* Balance du groupe — uniquement si le module est activé */}
          {group.expenseSharingEnabled && (
            <Link href={`/groups/${groupId}/balances`} style={{
              width: "100%", boxSizing: "border-box", marginTop: 10,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
              padding: "14px", borderRadius: 16, textDecoration: "none",
              background: "#fff", color: INK_STRONG, fontSize: 15, fontWeight: 800,
              border: `1.5px solid ${HAIRLINE}`,
              boxShadow: "0 0 0 1px rgba(30,26,20,0.04), 0 6px 14px rgba(30,26,20,0.07)",
            }}>
              <Scale weight="Bold" size={18} color={INK_STRONG} />
              Équilibre des comptes
            </Link>
          )}
        </div>

        {/* Items */}
        <div style={{ padding: "8px 18px 0" }}>
          {pending.length === 0 && bought.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: 22, border: "2px dashed rgba(28,25,20,0.14)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: INK_STRONG }}>Liste vide</p>
              <p style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 600, color: INK_MUTED }}>
                Ajoute un article ci-dessous{group.members.length <= 1 ? " — ou invite quelqu'un d'abord." : "."}
              </p>
              {group.members.length <= 1 && (
                <div style={{ maxWidth: 280, margin: "0 auto" }}>
                  <InviteCode code={group.inviteCode} variant="primary" />
                </div>
              )}
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 6 }}>
                  {pending.map(item => (
                    <ItemCard key={item.id} item={item} currentUserId={user.id} members={memberViews} />
                  ))}
                </div>
              )}

              {bought.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, margin: "20px 4px 12px", paddingTop: 14, borderTop: `1.5px solid ${HAIRLINE}` }}>
                    Dans le panier ({bought.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {bought.map(item => (
                      <ItemCard key={item.id} item={item} currentUserId={user.id} members={memberViews} gap={8} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky add bar */}
      <div style={{
        position: "fixed", left: 16, right: 16, bottom: 116, zIndex: 40,
        maxWidth: 460, margin: "0 auto",
        padding: "8px 8px 8px 8px",
        background: "rgba(252,251,249,0.92)",
        backdropFilter: "saturate(150%) blur(18px)", WebkitBackdropFilter: "saturate(150%) blur(18px)",
        border: "1.5px solid #FFFFFF", borderRadius: 20,
        boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 10px 30px rgba(30,26,20,0.12)",
        fontFamily: FONT,
      }}>
        <AddItemForm groupId={groupId} suggestions={suggestions} />
      </div>

      <TabBar />
    </div>
  );
}
