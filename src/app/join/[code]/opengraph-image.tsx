import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Invitation à rejoindre un groupe sur SharedCart";

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const group = await prisma.group.findUnique({
    where: { inviteCode: normalized },
    select: { name: true },
  });

  return ogImage({
    badge: "Invitation",
    title: group ? `Rejoins « ${group.name} » sur SharedCart` : "Rejoins un groupe sur SharedCart",
    subtitle: "Votre liste de courses partagée, synchronisée en temps réel.",
  });
}
