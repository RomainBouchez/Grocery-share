import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";
import { ArrowRight } from "@/lib/icons";
import { GroupIcon } from "@/lib/groupIcons";
import {
  colorFor, avatarStyle, pastille, tintForColor, card, cardSm,
  ACCENT, INK_STRONG, INK_MUTED, INK_FAINT, FONT,
} from "@/lib/ui";

export default async function ListesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          members: { include: { user: true } },
          lists: {
            where: { status: { in: ["planning", "shopping"] } },
            include: {
              _count: { select: { items: true } },
              items: { where: { status: { not: "bought" } }, select: { label: true }, take: 3 },
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const totalPending = memberships.reduce((s, { group }) => {
    const list = group.lists[0];
    return s + (list?.items.length ?? 0);
  }, 0);

  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG, position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "56px 18px 130px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 900, letterSpacing: "-0.035em" }}>Listes</h2>
        <p style={{ margin: "0 0 22px", fontSize: 13, fontWeight: 600, color: INK_FAINT }}>
          {memberships.length} liste{memberships.length !== 1 ? "s" : ""} partagée{memberships.length !== 1 ? "s" : ""} · {totalPending} article{totalPending !== 1 ? "s" : ""} à acheter
        </p>

        {memberships.map(({ group }, idx) => {
          const list = group.lists[0];
          const pendingCount = list?.items.length ?? 0;
          const totalCount = list?._count.items ?? 0;
          const preview = list?.items.map(i => i.label).join(" · ") ?? "";
          const pct = totalCount > 0 ? Math.round(((totalCount - pendingCount) / totalCount) * 100) : 0;
          const t = tintForColor(colorFor(group.id, group.color));
          const topMembers = group.members.slice(0, 3);
          const featured = idx === 0;

          if (featured) {
            return (
              <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none", display: "block", marginBottom: 14 }}>
                <div style={{ ...card, borderRadius: 26, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={pastille(t, 16)}>
                      <GroupIcon name={group.icon} weight="Bold" size={16} color={t.text} />
                      {group.name}
                    </span>
                    <div style={{ display: "flex" }}>
                      {topMembers.map((m, i) => (
                        <div key={m.user.id} style={{ ...avatarStyle(colorFor(m.user.id, m.user.color), 27), marginLeft: i > 0 ? -9 : 0 }}>{initials(m.user.name)}</div>
                      ))}
                      {group.members.length > 3 && (
                        <div style={{ ...avatarStyle("#EFEBE3", 27), color: "#928E83", marginLeft: -9 }}>+{group.members.length - 3}</div>
                      )}
                    </div>
                  </div>
                  {preview && <div style={{ fontSize: 14, fontWeight: 600, color: INK_FAINT, marginBottom: 14 }}>{preview}…</div>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: INK_FAINT }}>{totalCount} article{totalCount !== 1 ? "s" : ""} · {group.members.length} membre{group.members.length !== 1 ? "s" : ""}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 800, color: ACCENT }}>
                      Ouvrir
                      <ArrowRight weight="Linear" size={15} color={ACCENT} />
                    </span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: t.tint, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: t.text, boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.1)", transition: "width .4s ease" }} />
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none", display: "block", marginBottom: 11 }}>
              <div style={{ ...cardSm, borderRadius: 22, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 13, background: t.tint, flex: "none" }}>
                  <GroupIcon name={group.icon} weight="Bold" size={20} color={t.text} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: INK_STRONG }}>{group.name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: INK_FAINT }}>{totalCount} article{totalCount !== 1 ? "s" : ""} · {group.members.length} membre{group.members.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex" }}>
                  {topMembers.slice(0, 2).map((m, i) => (
                    <div key={m.user.id} style={{ ...avatarStyle(colorFor(m.user.id, m.user.color), 26), marginLeft: i > 0 ? -9 : 0 }}>{initials(m.user.name)}</div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}

        {memberships.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: INK_MUTED }}>Aucune liste — rejoins ou crée un groupe depuis l&apos;onglet Groupes.</p>
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}
