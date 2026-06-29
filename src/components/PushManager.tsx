"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { savePushSubscription, announceGoShopping, cancelGoShopping } from "@/lib/actions/shopping";
import { Bell, Cart3 } from "@/lib/icons";
import { ACCENT, INK_MUTED, INK_STRONG, HAIRLINE, FONT } from "@/lib/ui";

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
  iAmShopping: boolean;
};

export function PushManager({ groupId, iAmShopping }: Props) {
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        swReg.current = reg;
        return reg.pushManager.getSubscription();
      })
      .then(sub => { if (sub) setSubscribed(true); })
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

  async function doAnnounce() {
    if (busy || isPending) return;
    setShowModal(false);
    setBusy(true);
    try {
      await ensureSubscribed();
      startTransition(() => announceGoShopping(groupId));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (busy || isPending) return;
    setBusy(true);
    try {
      await ensureSubscribed();
      startTransition(() => cancelGoShopping(groupId));
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || isPending;

  return (
    <>
      {/* Modal de confirmation — portal pour échapper aux stacking contexts */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(20,18,14,0.45)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "0 0 32px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(420px, calc(100vw - 32px))",
              background: "#FEFCF9", borderRadius: 24,
              padding: "24px 20px 20px", fontFamily: FONT,
              boxShadow: "0 24px 60px rgba(20,18,14,0.22)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <span style={{
                width: 52, height: 52, borderRadius: 16, background: `${ACCENT}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bell size={26} weight="Bold" color={ACCENT} />
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: INK_STRONG, textAlign: "center" }}>
              Rappeler le groupe ?
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 14, fontWeight: 500, color: INK_MUTED, textAlign: "center", lineHeight: 1.5 }}>
              Tous les membres vont recevoir une notification pour compléter la liste avant que tu partes faire les courses.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: "13px", borderRadius: 14,
                  border: `1.5px solid ${HAIRLINE}`, background: "#fff",
                  fontSize: 14, fontWeight: 700, color: INK_MUTED,
                  cursor: "pointer", fontFamily: FONT,
                }}
              >
                Annuler
              </button>
              <button
                onClick={doAnnounce}
                style={{
                  flex: 1, padding: "13px", borderRadius: 14,
                  border: "none", background: ACCENT,
                  fontSize: 14, fontWeight: 800, color: "#fff",
                  cursor: "pointer", fontFamily: FONT,
                  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.3), 0 6px 14px rgba(47,179,106,0.3)",
                }}
              >
                C&apos;est parti !
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {iAmShopping ? (
        <button
          onClick={handleCancel}
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
      ) : (
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          style={{
            width: "100%", boxSizing: "border-box", marginTop: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
            padding: "14px", borderRadius: 16, cursor: loading ? "not-allowed" : "pointer",
            background: ACCENT, color: "#fff",
            fontSize: 14, fontWeight: 800, fontFamily: FONT,
            border: "1.5px solid rgba(0,0,0,0.06)",
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 6px 14px rgba(47,179,106,0.28)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Bell weight="Bold" size={17} color="#fff" />
          {loading ? "…" : "Je vais faire les courses"}
        </button>
      )}
    </>
  );
}
