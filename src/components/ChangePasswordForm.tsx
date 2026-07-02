"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { changePassword, type ProfileActionResult } from "@/lib/actions/auth";
import {
  input, btnPrimary, btnCancel, INK_STRONG, INK_MUTED, INK_FAINT,
  DANGER, DANGER_SOFT, ACCENT_SOFT, ACCENT_TEXT, HAIRLINE,
} from "@/lib/ui";

const LABEL_STYLE: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 8,
  fontSize: 13, fontWeight: 700, letterSpacing: "0.01em", color: INK_MUTED,
};

function SoftInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={input}
      onFocus={e => {
        e.currentTarget.style.borderColor = "rgba(47,179,106,0.55)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,179,106,0.14)";
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = HAIRLINE;
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

/**
 * Section « Sécurité » du profil : changement de mot de passe repliable.
 * Après succès, les autres appareils sont déconnectés (cf. action serveur).
 */
export function ChangePasswordForm() {
  const t = useTranslations("profile");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ProfileActionResult, FormData>(changePassword, undefined);
  const success = state && "success" in state;

  // Replie le formulaire après un changement réussi (dépend de l'objet state :
  // chaque action renvoie un nouvel objet, même si le booléen ne change pas).
  useEffect(() => {
    if (state && "success" in state) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <div>
        {success && (
          <div style={{
            padding: "13px 16px", borderRadius: 12, marginBottom: 10,
            background: ACCENT_SOFT, border: "1.5px solid rgba(47,179,106,0.3)",
            fontSize: 13.5, color: ACCENT_TEXT, fontWeight: 700, lineHeight: 1.45,
          }}>
            ✓ {t("passwordChanged")}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 14, cursor: "pointer",
            background: "#F5F5F5", border: `1.5px solid ${HAIRLINE}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: INK_STRONG, letterSpacing: "-0.01em",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={ACCENT_TEXT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t("changePassword")}
          </span>
          <span style={{ fontSize: 16, fontWeight: 900, color: INK_FAINT }}>→</span>
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={LABEL_STYLE}>
        {t("currentPassword")}
        <SoftInput name="current" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </label>

      <label style={LABEL_STYLE}>
        {t("newPassword")}
        <SoftInput name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t("newPasswordPlaceholder")} />
      </label>

      <label style={LABEL_STYLE}>
        {t("confirmNewPassword")}
        <SoftInput name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
      </label>

      {state && "error" in state && (
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: DANGER_SOFT, border: "1.5px solid rgba(232,80,58,0.3)",
          fontSize: 13, color: DANGER, fontWeight: 700,
        }}>
          {state.error}
        </div>
      )}

      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: INK_FAINT, lineHeight: 1.45 }}>
        {t("passwordHint")}
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ ...btnCancel, flex: 1 }}
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          style={{
            ...btnPrimary, flex: 1.6, minHeight: 48, fontSize: 15,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? t("updating") : t("update")}
        </button>
      </div>
    </form>
  );
}
