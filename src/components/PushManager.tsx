"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { savePushSubscription, announceGoShopping, cancelGoShopping } from "@/lib/actions/shopping";
import { Cart3 } from "@/lib/icons";
import { ACCENT, INK_MUTED, FONT } from "@/lib/ui";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

type Props = {
  groupId: string;
  /** true si l'utilisateur courant a déjà déclaré faire les courses */
  iAmShopping: boolean;
};

export function PushManager({ groupId, iAmShopping }: Props) {
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        swReg.current = reg;
        return reg.pushManager.getSubscription();
      })
      .then(sub => {
        if (sub) setSubscribed(true);
      })
      .catch(() => {});
  }, []);

  async function ensureSubscribed(): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (subscribed) return true;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = swReg.current ?? (await navigator.serviceWorker.register("/sw.js"));
    swReg.current = reg;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
    });

    const json = sub.toJSON();
    await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: (json.keys?.p256dh as string) ?? "",
      auth: (json.keys?.auth as string) ?? "",
    });
    setSubscribed(true);
    return true;
  }

  async function handleClick() {
    if (busy || isPending) return;
    setBusy(true);
    try {
      await ensureSubscribed();
      startTransition(async () => {
        if (iAmShopping) {
          await cancelGoShopping(groupId);
        } else {
          await announceGoShopping(groupId);
        }
      });
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || isPending;

  if (iAmShopping) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: "100%", boxSizing: "border-box", marginTop: 10,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
          padding: "14px", borderRadius: 16, cursor: loading ? "not-allowed" : "pointer",
          background: "#fff", color: INK_MUTED,
          fontSize: 14, fontWeight: 700, fontFamily: FONT,
          border: "1.5px solid rgba(28,25,20,0.12)",
          boxShadow: "0 0 0 1px rgba(30,26,20,0.04), 0 4px 10px rgba(30,26,20,0.07)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Cart3 weight="Bold" size={17} />
        {loading ? "…" : "Annuler les courses"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        width: "100%", boxSizing: "border-box", marginTop: 10,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
        padding: "14px", borderRadius: 16, cursor: loading ? "not-allowed" : "pointer",
        background: "#fff", color: ACCENT,
        fontSize: 14, fontWeight: 800, fontFamily: FONT,
        border: "1.5px solid rgba(28,25,20,0.12)",
        boxShadow: "0 0 0 1px rgba(30,26,20,0.04), 0 6px 14px rgba(30,26,20,0.07)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Cart3 weight="Bold" size={17} color={ACCENT} />
      {loading ? "…" : "Je vais faire les courses"}
    </button>
  );
}
