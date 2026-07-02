"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { savePushSubscription } from "@/lib/actions/shopping";
import { Bell } from "@/lib/icons";
import { ACCENT, ACCENT_SOFT, ACCENT_TEXT, INK_MUTED, HAIRLINE, FONT } from "@/lib/ui";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Bouton d'activation des notifications push pour l'admin. Enregistre
 * l'abonnement du device courant afin de recevoir l'alerte « compte en attente ».
 */
export function AdminPushToggle() {
  const t = useTranslations("admin");
  const [subscribed, setSubscribed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") setBlocked(true);
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        swReg.current = reg;
        return reg.pushManager.getSubscription();
      })
      .then(sub => { if (sub) setSubscribed(true); })
      .catch(() => {});
  }, []);

  async function enable() {
    if (busy || subscribed) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setBlocked(permission === "denied"); return; }
      const reg = swReg.current ?? (await navigator.serviceWorker.register("/sw.js"));
      swReg.current = reg;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
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
    } finally {
      setBusy(false);
    }
  }

  if (subscribed) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
        padding: "12px 14px", borderRadius: 14,
        background: ACCENT_SOFT, border: `1.5px solid rgba(47,179,106,0.3)`,
        fontSize: 13.5, fontWeight: 700, color: ACCENT_TEXT, fontFamily: FONT,
      }}>
        <Bell weight="Bold" size={17} color={ACCENT} />
        {t("notifsEnabled")}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={enable}
        disabled={busy || blocked}
        style={{
          width: "100%", boxSizing: "border-box",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
          padding: "13px", borderRadius: 14, fontFamily: FONT,
          cursor: busy || blocked ? "not-allowed" : "pointer",
          background: blocked ? "#fff" : ACCENT,
          color: blocked ? INK_MUTED : "#fff",
          fontSize: 14, fontWeight: 800,
          border: blocked ? `1.5px solid ${HAIRLINE}` : "1.5px solid rgba(0,0,0,0.06)",
          boxShadow: blocked ? "none" : "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 6px 14px rgba(47,179,106,0.28)",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Bell weight="Bold" size={17} color={blocked ? INK_MUTED : "#fff"} />
        {blocked ? t("notifsBlocked") : busy ? "…" : t("enableNotifs")}
      </button>
      {!blocked && (
        <p style={{ margin: "8px 2px 0", fontSize: 12.5, fontWeight: 500, color: INK_MUTED, lineHeight: 1.45 }}>
          {t("notifsHint")}
        </p>
      )}
    </div>
  );
}
