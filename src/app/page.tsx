import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LandingPage } from "@/components/LandingPage";
import { HomeDashboard, type GroupData, type MemberPreview } from "@/components/HomeDashboard";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";

const COLORS = ["#F0813F", "#7E91FF", "#C99BF0", "#5BD08A", "#F0C53F"];
function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <LandingPage />;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          members: { include: { user: true } },
          lists: {
            where: { status: { in: ["planning", "shopping"] } },
            include: {
              items: {
                include: { addedBy: true },
                orderBy: [{ status: "asc" }, { createdAt: "asc" }],
              },
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const groups: GroupData[] = memberships.map(({ group }) => {
    const list = group.lists[0];
    const allItems = list?.items ?? [];
    const pending = allItems.filter(i => i.status !== "bought");
    const bought = allItems.filter(i => i.status === "bought");

    const topMembers: MemberPreview[] = group.members.slice(0, 3).map(m => ({
      initials: initials(m.user.name),
      color: avatarColor(m.user.id),
    }));

    return {
      id: group.id,
      name: group.name,
      color: avatarColor(group.id),
      memberCount: group.members.length,
      topMembers,
      pendingItems: pending.slice(0, 3).map(i => ({
        id: i.id, label: i.label, addedByName: i.addedBy.name,
      })),
      totalItems: allItems.length,
      boughtItems: bought.length,
    };
  });

  const [featured, ...others] = groups;

  return (
    <>
      <HomeDashboard userName={user.name} featured={featured ?? null} others={others} />
      <TabBar />
    </>
  );
}
