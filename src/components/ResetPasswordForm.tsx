"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { resetPassword, type ProfileActionResult } from "@/lib/actions/auth";
import {
  input, btnPrimary, INK_STRONG, INK_MUTED,
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

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const [state, formAction, pending] = useActionState<ProfileActionResult, FormData>(resetPassword, undefined);

  if (state && "success" in state) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{
          padding: "14px 16px", borderRadius: 12,
          background: ACCENT_SOFT, border: "1.5px solid rgba(47,179,106,0.3)",
          fontSize: 13.5, color: ACCENT_TEXT, fontWeight: 700, lineHeight: 1.45,
          display: "flex", alignItems: "flex-start", gap: 9,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1.2 }}>✓</span>
          <span>{t("done")}</span>
        </div>
        <Link href="/login" style={{ ...btnPrimary, width: "100%", boxSizing: "border-box", textDecoration: "none" }}>
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <input type="hidden" name="token" value={token} />

      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: INK_STRONG }}>
        {t("heading")}
      </h2>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK_MUTED, lineHeight: 1.4 }}>
        {t("intro")}
      </p>

      <label style={LABEL_STYLE}>
        {t("newPassword")}
        <SoftInput name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t("passwordPlaceholder")} />
      </label>

      <label style={LABEL_STYLE}>
        {t("confirmPassword")}
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

      <button
        type="submit"
        disabled={pending}
        style={{ ...btnPrimary, width: "100%", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? t("resetting") : t("reset")}
      </button>
    </form>
  );
}
