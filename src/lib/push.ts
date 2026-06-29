/**
 * Web Push (PWA) côté serveur. Configure web-push avec les clés VAPID et envoie
 * les notifications aux abonnements enregistrés. Tolérant aux pannes : un
 * abonnement expiré (404/410) est supprimé, le reste continue.
 */
import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:contact@example.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** Envoie une notification à tous les appareils d'une liste d'utilisateurs. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  if (!ensureConfigured()) {
    console.warn("[push] clés VAPID absentes — notification ignorée");
    return;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // Abonnement périmé → on le purge.
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.warn("[push] échec d'envoi", code ?? err);
        }
      }
    }),
  );
}
