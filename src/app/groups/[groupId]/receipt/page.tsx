import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { ReceiptScanner } from "@/components/ReceiptScanner";

export default async function ReceiptPage({
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

  const members = membership.group.members.map((m) => ({ userId: m.user.id, name: m.user.name }));

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto w-full max-w-2xl px-5 py-5">
        <Link
          href={`/groups/${groupId}`}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          ‹ Retour à la liste
        </Link>
        <h1 className="mb-1 mt-2 text-xl font-bold text-neutral-900">🧾 J&apos;ai fait les courses</h1>
        <p className="mb-5 text-sm text-neutral-500">
          Prends le ticket en photo : Claude en extrait les articles et les prix, puis on les
          rapproche de votre liste.
        </p>

        <ReceiptScanner groupId={groupId} members={members} currentUserId={user.id} />
      </main>
    </>
  );
}
