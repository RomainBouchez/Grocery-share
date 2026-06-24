import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LandingPage } from "@/components/LandingPage";
import { HomeDashboard, type GroupData, type MemberPreview } from "@/components/HomeDashboard";
import { TabBar } from "@/components/TabBar";
import { initials } from "@/lib/utils";
import { colorFor } from "@/lib/ui";

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
      color: colorFor(m.user.id, m.user.color),
    }));

    return {
      id: group.id,
      name: group.name,
      color: colorFor(group.id, group.color),
      icon: group.icon,
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
      <HomeDashboard userName={user.name} userColor={colorFor(user.id, user.color)} featured={featured ?? null} others={others} />
      <TabBar />
    </>
  );
}
