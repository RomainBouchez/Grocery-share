import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ItemCard, type ItemView } from "@/components/ItemCard";
import { InviteCode } from "@/components/InviteCode";
import { AddItemForm } from "@/components/AddItemForm";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";
import { Cart3, Scale } from "@/lib/icons";
import { GroupAppearance } from "@/components/GroupAppearance";
import { PushManager } from "@/components/PushManager";
import { PendingSections } from "@/components/PendingSections";
import { ensureDefaultTags, getGroupTags } from "@/lib/serverTags";
import { type TagView } from "@/lib/tags";
import { normalizeLoose } from "@/lib/matching";
import { resolveGroupColors } from "@/lib/colors";
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

  const iAmShopping = list.shoppingByUserId === user.id;
  const shoppingByOther: string | null = (() => {
    if (!list.shoppingByUserId || list.shoppingByUserId === user.id) return null;
    const m = group.members.find(m => m.user.id === list!.shoppingByUserId);
    return m?.user.name ?? null;
  })();

  await ensureDefaultTags(groupId);
  const tags = await getGroupTags(groupId);

  const items = await prisma.listItem.findMany({
    where: { listId: list.id },
    include: { addedBy: true, participants: { include: { user: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const itemViews: ItemView[] = items.map(it => ({
    id: it.id, label: it.label, status: it.status,
    addedByUserId: it.addedByUserId, addedByName: it.addedBy.name,
    tagId: it.tagId,
    quantity: it.quantity,
    participants: it.participants.map(p => ({ userId: p.userId, name: p.user.name, parts: p.parts })),
  }));

  const memberViews = group.members.map(m => ({ userId: m.user.id, name: m.user.name }));

  // Couleurs personnelles (point de vue de l'utilisateur courant) : ma couleur
  // épinglée, les autres distinctes et auto-assignées.
  const colorMap = resolveGroupColors(
    user.id, user.color,
    group.members.map(m => ({ id: m.user.id, color: m.user.color })),
  );
  const memberColors: Record<string, string> = Object.fromEntries(colorMap);

  const [myProducts, groupProductTags] = await Promise.all([
    prisma.userProduct.findMany({
      where: { userId: user.id },
      orderBy: [{ buyCount: "desc" }, { lastBoughtAt: "desc" }],
      select: { label: true },
      take: 100,
    }),
    prisma.groupProductTag.findMany({
      where: { groupId },
      select: { label: true, tagId: true },
    }),
  ]);
  const suggestions = myProducts.map(p => p.label);
  // label (lowercase) → tagId, pour l'auto-complétion du rayon dans le formulaire.
  // Clé insensible au pluriel : « melons » et « melon » partagent le même rayon mémorisé.
  const productTagMap: Record<string, string> = Object.fromEntries(
    groupProductTags.map(pt => [normalizeLoose(pt.label), pt.tagId]),
  );

  const pending = itemViews.filter(i => i.status !== "bought");
  const bought = itemViews.filter(i => i.status === "bought");
  const pct = itemViews.length > 0 ? Math.round((bought.length / itemViews.length) * 100) : 0;
  const t = tintForColor(colorFor(group.id, group.color));
  const tr = await getTranslations();

  // Regroupe les articles « à acheter » par rayon (ordre des tags, sans-rayon en dernier).
  const tagById = new Map(tags.map(tg => [tg.id, tg]));
  const pendingGroups: { tag: TagView | null; items: ItemView[] }[] = [];
  const indexOfTag = new Map<string, number>();
  for (const it of pending) {
    const tg = it.tagId ? tagById.get(it.tagId) ?? null : null;
    const key = tg ? tg.id : "__none";
    let idx = indexOfTag.get(key);
    if (idx === undefined) {
      idx = pendingGroups.length;
      indexOfTag.set(key, idx);
      pendingGroups.push({ tag: tg, items: [] });
    }
    pendingGroups[idx].items.push(it);
  }
  // Trie selon l'ordre des rayons (sort), « sans rayon » à la fin.
  pendingGroups.sort((a, b) => {
    const sa = a.tag ? tags.findIndex(x => x.id === a.tag!.id) : 9999;
    const sb = b.tag ? tags.findIndex(x => x.id === b.tag!.id) : 9999;
    return sa - sb;
  });

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 210 }}>
        {/* Header */}
        <div style={{ padding: "44px 18px 0", marginBottom: 18 }}>
          <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            ‹ {tr("nav.groups")}
          </Link>
          <GroupAppearance groupId={groupId} name={group.name} color={colorFor(group.id, group.color)} icon={group.icon} isOwner={membership.role === "owner"} expenseSharingEnabled={group.expenseSharingEnabled}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {group.members.slice(0, 4).map((m, i) => (
                <div key={m.user.id} title={m.user.name} style={{ ...avatarStyle(memberColors[m.user.id] ?? colorFor(m.user.id, m.user.color), 30), marginLeft: i > 0 ? -9 : 0 }}>
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
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK_MUTED }}>{tr("group.toBuy", { count: pending.length })}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{tr("group.doneRatio", { done: bought.length, total: itemViews.length })}</span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: t.tint, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: t.text, boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.1)", transition: "width .4s" }} />
              </div>
            </div>
          )}

          {/* Bandeau : quelqu'un d'autre est en train de faire les courses */}
          {shoppingByOther && (
            <div style={{
              marginTop: 14, padding: "11px 14px", borderRadius: 14,
              background: "#FFF8E7", border: "1.5px solid #F0D080",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13.5, fontWeight: 700, color: "#7A5A00",
            }}>
              <span style={{ fontSize: 18 }}>🛒</span>
              <span>{tr("group.shopping", { name: shoppingByOther.split(" ")[0] })}</span>
            </div>
          )}

          {/* Je vais faire les courses (push PWA) */}
          <PushManager groupId={groupId} iAmShopping={iAmShopping} />

          {/* Faire les courses button — uniquement si partage de dépenses activé */}
          {group.expenseSharingEnabled && (
            <Link href={`/groups/${groupId}/receipt`} style={{
              width: "100%", boxSizing: "border-box", marginTop: 10,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
              padding: "15px", borderRadius: 16, textDecoration: "none",
              background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 800,
              border: "1.5px solid rgba(0,0,0,0.06)",
              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 8px 18px rgba(47,179,106,0.3)",
            }}>
              <Cart3 weight="Bold" size={18} color="#fff" />
              {tr("group.iDidShopping")}
            </Link>
          )}

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
              {tr("group.balances")}
            </Link>
          )}
        </div>

        {/* Items */}
        <div style={{ padding: "8px 18px 0" }}>
          {pending.length === 0 && bought.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: 22, border: "2px dashed rgba(28,25,20,0.14)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: INK_STRONG }}>{tr("home.emptyList")}</p>
              <p style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 600, color: INK_MUTED }}>
                {group.members.length <= 1 ? tr("group.emptyHintInvite") : tr("group.emptyHint")}
              </p>
              {group.members.length <= 1 && (
                <div style={{ maxWidth: 280, margin: "0 auto" }}>
                  <InviteCode code={group.inviteCode} variant="primary" />
                </div>
              )}
            </div>
          ) : (
            <>
              <PendingSections groups={pendingGroups} currentUserId={user.id} members={memberViews} memberColors={memberColors} groupId={groupId} tags={tags} showParticipants={group.expenseSharingEnabled} />

              {bought.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, margin: "20px 4px 12px", paddingTop: 14, borderTop: `1.5px solid ${HAIRLINE}` }}>
                    {tr("group.inCart", { count: bought.length })}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {bought.map(item => (
                      <ItemCard key={item.id} item={item} currentUserId={user.id} members={memberViews} memberColors={memberColors} groupId={groupId} tags={tags} gap={8} showParticipants={group.expenseSharingEnabled} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky add bar */}
      <div id="add-item-bar" style={{
        position: "fixed", left: 16, right: 16, bottom: 116, zIndex: 40,
        maxWidth: 460, margin: "0 auto",
        padding: "8px 8px 8px 8px",
        background: "rgba(252,251,249,0.92)",
        backdropFilter: "saturate(150%) blur(18px)", WebkitBackdropFilter: "saturate(150%) blur(18px)",
        border: "1.5px solid #FFFFFF", borderRadius: 20,
        boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 10px 30px rgba(30,26,20,0.12)",
        fontFamily: FONT,
      }}>
        <AddItemForm groupId={groupId} suggestions={suggestions} tags={tags} productTagMap={productTagMap} />
      </div>

      <TabBar />
    </div>
  );
}
