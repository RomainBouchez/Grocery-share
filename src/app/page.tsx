import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { CreateGroupForm, JoinGroupForm } from "@/components/GroupForms";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          lists: {
            where: { status: { in: ["planning", "shopping"] } },
            include: { _count: { select: { items: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-2xl px-5 py-6">
        <h1 className="mb-1 text-xl font-bold text-neutral-900">Tes groupes</h1>
        <p className="mb-5 text-sm text-neutral-500">
          Salut {user.name} 👋 — choisis un groupe ou crées-en un nouveau.
        </p>

        {memberships.length > 0 ? (
          <ul className="mb-8 flex flex-col gap-3">
            {memberships.map(({ group, role }) => {
              const activeItems = group.lists.reduce((n, l) => n + l._count.items, 0);
              return (
                <li key={group.id}>
                  <Link
                    href={`/groups/${group.id}`}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-green-300 hover:shadow"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900">{group.name}</div>
                      <div className="text-sm text-neutral-500">
                        {group._count.members} membre{group._count.members > 1 ? "s" : ""}
                        {" · "}
                        {activeItems} article{activeItems > 1 ? "s" : ""} en cours
                        {role === "owner" && " · admin"}
                      </div>
                    </div>
                    <span className="text-neutral-300">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mb-8 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            Tu n&apos;es encore dans aucun groupe. Crée-en un ou rejoins celui d&apos;un ami.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800">Nouveau groupe</h2>
            <CreateGroupForm />
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800">Rejoindre un groupe</h2>
            <JoinGroupForm />
          </section>
        </div>
      </main>
    </>
  );
}
