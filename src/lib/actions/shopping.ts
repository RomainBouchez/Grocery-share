"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";

/** Enregistre (ou met à jour) l'abonnement push du device courant. */
export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    update: { userId: user.id, p256dh: sub.p256dh, auth: sub.auth },
  });
}

/** Déclare que l'utilisateur va faire les courses et notifie les autres membres. */
export async function announceGoShopping(groupId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
    include: { group: { include: { members: { select: { userId: true } } } } },
  });
  if (!membership) return;

  const list = await prisma.shoppingList.findFirst({
    where: { groupId, status: { in: ["planning", "shopping"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!list) return;

  await prisma.shoppingList.update({
    where: { id: list.id },
    data: { shoppingByUserId: user.id, shoppingStartedAt: new Date(), status: "shopping" },
  });

  const otherUserIds = membership.group.members
    .map(m => m.userId)
    .filter(id => id !== user.id);

  if (otherUserIds.length > 0) {
    const firstName = user.name.split(" ")[0];
    await sendPushToUsers(otherUserIds, {
      title: "GrocyShare",
      body: `🛒 ${firstName} fait les courses !`,
      url: `/groups/${groupId}`,
      tag: `shopping-${groupId}`,
    });
  }

  revalidatePath(`/groups/${groupId}`);
}

/** Annule la déclaration "je vais faire les courses" (appelé si l'utilisateur change d'avis). */
export async function cancelGoShopping(groupId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  });
  if (!membership) return;

  const list = await prisma.shoppingList.findFirst({
    where: { groupId, status: "shopping", shoppingByUserId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!list) return;

  await prisma.shoppingList.update({
    where: { id: list.id },
    data: { shoppingByUserId: null, shoppingStartedAt: null, status: "planning" },
  });

  revalidatePath(`/groups/${groupId}`);
}
