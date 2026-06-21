import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { AddItemForm } from "@/components/AddItemForm";
import { ItemCard, type ItemView } from "@/components/ItemCard";
import { InviteCode } from "@/components/InviteCode";

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
    include: {
      group: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
  });

  if (!membership) notFound();
  const { group } = membership;

  // Liste active du groupe (créée à la volée si besoin).
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

  const itemViews: ItemView[] = items.map((it) => ({
    id: it.id,
    label: it.label,
    status: it.status,
    addedByUserId: it.addedByUserId,
    addedByName: it.addedBy.name,
    participants: it.participants.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      parts: p.parts,
    })),
  }));

  const pending = itemViews.filter((i) => i.status !== "bought");
  const bought = itemViews.filter((i) => i.status === "bought");

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-2xl px-5 py-5">
        <div className="mb-4">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ‹ Tous les groupes
          </Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-neutral-900">{group.name}</h1>
            <InviteCode code={group.inviteCode} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {group.members.map((m) => m.user.name).join(", ")}
          </p>
        </div>

        <div className="mb-5">
          <AddItemForm groupId={groupId} />
        </div>

        {pending.length === 0 && bought.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Liste vide. Ajoute le premier article — tu seras automatiquement sur 1 part. 🛒
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {pending.map((item) => (
                <ItemCard key={item.id} item={item} currentUserId={user.id} />
              ))}
            </ul>

            {bought.length > 0 && (
              <>
                <h2 className="mb-2 mt-6 text-sm font-semibold text-neutral-500">
                  Dans le panier ({bought.length})
                </h2>
                <ul className="flex flex-col gap-2">
                  {bought.map((item) => (
                    <ItemCard key={item.id} item={item} currentUserId={user.id} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
