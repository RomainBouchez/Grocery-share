import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const members = membership.group.members.map(m => ({ userId: m.user.id, name: m.user.name }));

  const FF = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";

  return (
    <div style={{ fontFamily: FF, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: "#1B1A16", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "44px 18px 40px", maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/groups/${groupId}`} style={{ fontSize: 13, fontWeight: 700, color: "#807C72", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          ‹ Retour à la liste
        </Link>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em" }}>J&apos;ai fait les courses</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, fontWeight: 500, color: "#807C72", lineHeight: 1.5 }}>
          Prends le ticket en photo — Claude en extrait les articles et les prix, puis on les rapproche de la liste.
        </p>
        <ReceiptScanner groupId={groupId} members={members} currentUserId={user.id} />
      </div>
    </div>
  );
}
