import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ItemCard, type ItemView } from "@/components/ItemCard";
import { InviteCode } from "@/components/InviteCode";
import { AddItemForm } from "@/components/AddItemForm";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";

const COLORS = ["#F0813F", "#7E91FF", "#C99BF0", "#5BD08A", "#F0C53F"];
function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

const FF = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";

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
  const groupColor = avatarColor(group.id);

  return (
    <div style={{ fontFamily: FF, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#0D0D0F", color: "rgba(255,255,255,0.92)", position: "relative" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(400px 280px at 60% 0%, ${groupColor}18, transparent 60%)` }} />

      <div style={{ position: "relative", zIndex: 1, paddingBottom: 160 }}>
        {/* Header */}
        <div style={{ padding: "44px 18px 0", marginBottom: 20 }}>
          <Link href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
            ‹ Groupes
          </Link>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: groupColor, display: "block" }} />
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>{group.name}</h1>
              </div>
              {/* Members row */}
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {group.members.slice(0, 4).map((m, i) => (
                  <div key={m.user.id} title={m.user.name} style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: avatarColor(m.user.id),
                    color: avatarColor(m.user.id) === "#5BD08A" ? "#0D0D0F" : "#fff",
                    fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #0D0D0F", marginLeft: i > 0 ? -7 : 0,
                  }}>
                    {initials(m.user.name)}
                  </div>
                ))}
                {group.members.length > 4 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginLeft: 6 }}>+{group.members.length - 4}</span>
                )}
                <div style={{ marginLeft: 10 }}>
                  <InviteCode code={group.inviteCode} />
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {itemViews.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{pending.length} restant{pending.length !== 1 ? "s" : ""}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{pct}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#5BD08A", transition: "width .4s" }} />
              </div>
            </div>
          )}
        </div>

        {/* Faire les courses button */}
        <div style={{ padding: "0 18px 4px" }}>
          <Link href={`/groups/${groupId}/receipt`} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px", borderRadius: 14, textDecoration: "none",
            background: "rgba(91,208,138,0.12)", border: "1px solid rgba(91,208,138,0.32)",
            color: "#5BD08A", fontSize: 15, fontWeight: 700,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="14" rx="2" /><path d="M9 6V4a3 3 0 0 1 6 0v2" />
            </svg>
            J&apos;ai fait les courses
          </Link>
        </div>

        {/* Items */}
        <div style={{ padding: "16px 18px 0" }}>
          {pending.length === 0 && bought.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.03)", borderRadius: 18, border: "1px dashed rgba(255,255,255,0.10)" }}>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Liste vide. Ajoute le premier article ci-dessous.</p>
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
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "18px 4px 10px" }}>
                    Dans le panier ({bought.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {bought.map(item => (
                      <ItemCard key={item.id} item={item} currentUserId={user.id} members={memberViews} />
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
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
        padding: "14px 18px 80px",
        background: "rgba(13,13,15,0.82)",
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        fontFamily: FF,
      }}>
        <AddItemForm groupId={groupId} suggestions={suggestions} />
      </div>

      <TabBar />
    </div>
  );
}
