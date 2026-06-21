import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Lien d'invitation : /join/<CODE> — rejoint le groupe puis redirige dessus.
export default async function JoinByLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/join/${normalized}`);

  const group = await prisma.group.findUnique({ where: { inviteCode: normalized } });

  if (!group) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <div className="mb-3 text-4xl">🤔</div>
        <h1 className="text-lg font-semibold">Invitation introuvable</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Le code <span className="font-mono">{normalized}</span> ne correspond à aucun groupe.
        </p>
      </main>
    );
  }

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    create: { userId: user.id, groupId: group.id, role: "member" },
    update: {},
  });

  redirect(`/groups/${group.id}`);
}
