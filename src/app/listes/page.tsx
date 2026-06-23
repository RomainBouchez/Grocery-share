import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";

const COLORS = ["#F0813F", "#7E91FF", "#C99BF0", "#5BD08A", "#F0C53F"];
function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

const FF = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";

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
    <div style={{ fontFamily: FF, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#0D0D0F", color: "rgba(255,255,255,0.92)", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(420px 280px at 22% 0%, rgba(91,208,138,0.09), transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "56px 18px 130px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Listes</h2>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
          {memberships.length} liste{memberships.length !== 1 ? "s" : ""} partagée{memberships.length !== 1 ? "s" : ""} · {totalPending} article{totalPending !== 1 ? "s" : ""} à acheter
        </p>

        {memberships.map(({ group }) => {
          const list = group.lists[0];
          const pendingCount = list?.items.length ?? 0;
          const totalCount = list?._count.items ?? 0;
          const preview = list?.items.map(i => i.label).join(" · ") ?? "";
          const pct = totalCount > 0 ? Math.round(((totalCount - pendingCount) / totalCount) * 100) : 0;
          const color = avatarColor(group.id);
          const topMembers = group.members.slice(0, 3);

          return (
            <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none", display: "block", marginBottom: 14 }}>
              <div style={{
                background: "rgba(255,255,255,0.055)", border: `1px solid ${color}4D`,
                borderRadius: 22, padding: 20,
                backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 56px rgba(0,0,0,0.45)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "block" }} />
                    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.96)" }}>{group.name}</span>
                  </div>
                  <div style={{ display: "flex" }}>
                    {topMembers.map((m, i) => (
                      <div key={m.user.id} style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(m.user.id), color: avatarColor(m.user.id) === "#5BD08A" ? "#0D0D0F" : "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #16161b", marginLeft: i > 0 ? -8 : 0 }}>
                        {initials(m.user.name)}
                      </div>
                    ))}
                    {group.members.length > 3 && (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #16161b", marginLeft: -8 }}>
                        +{group.members.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                {preview && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>{preview}…</div>}
                <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#5BD08A", transition: "width .4s ease" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{totalCount} article{totalCount !== 1 ? "s" : ""} · {group.members.length} membre{group.members.length !== 1 ? "s" : ""}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#5BD08A" }}>Ouvrir →</span>
                </div>
              </div>
            </Link>
          );
        })}

        {memberships.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Aucune liste — rejoins ou crée un groupe depuis l&apos;onglet Groupes.</p>
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}
