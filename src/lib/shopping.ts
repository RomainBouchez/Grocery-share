import "server-only";
import type { ShoppingList } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Durée maximale d'une session « je fais les courses ». Au-delà, la session
 * est considérée abandonnée (l'utilisateur a oublié de la terminer) et
 * libérée automatiquement au prochain chargement — pas besoin de cron.
 */
export const SHOPPING_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 h

/**
 * Libère la session « courses » si elle a dépassé le TTL (ou si elle n'a pas
 * de date de départ — état incohérent). Renvoie la liste, mise à jour ou non.
 */
export async function expireStaleShopping(list: ShoppingList): Promise<ShoppingList> {
  if (list.status !== "shopping") return list;

  const stale =
    !list.shoppingStartedAt ||
    Date.now() - list.shoppingStartedAt.getTime() > SHOPPING_SESSION_TTL_MS;
  if (!stale) return list;

  return prisma.shoppingList.update({
    where: { id: list.id },
    data: { shoppingByUserId: null, shoppingStartedAt: null, status: "planning" },
  });
}
