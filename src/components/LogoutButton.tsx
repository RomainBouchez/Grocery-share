"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/actions/auth";
import { btnSecondary, btnCancel, btnDangerSolid } from "@/lib/ui";

export function LogoutButton() {
  const t = useTranslations();
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} style={{ ...btnSecondary, width: "100%" }}>
        {t("nav.signOut")}
      </button>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes lo-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes lo-pulse { 0% { box-shadow: 0 0 0 0 rgba(240,86,63,0.45); } 100% { box-shadow: 0 0 0 14px rgba(240,86,63,0); } }
        @media (prefers-reduced-motion: reduce) { [data-lo] { animation: none !important; } }
      `}</style>

      <p data-lo style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#807C72", textAlign: "center", animation: "lo-rise .18s ease both" }}>
        {t("nav.signOutConfirm")}
      </p>

      <form action={logout} style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          data-lo
          onClick={() => setConfirm(false)}
          style={{ ...btnCancel, flex: 1, animation: "lo-rise .24s cubic-bezier(.34,1.56,.64,1) both" }}
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          data-lo
          style={{ ...btnDangerSolid, flex: 1.6, animation: "lo-rise .24s cubic-bezier(.34,1.56,.64,1) .04s both, lo-pulse 1.1s ease-out .24s 1" }}
        >
          {t("common.confirm")}
        </button>
      </form>
    </div>
  );
}
