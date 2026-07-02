"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { login, signup, type ActionResult } from "@/lib/actions/auth";
import { input, btnPrimary, INK_STRONG, INK_MUTED, INK_FAINT, DANGER, DANGER_SOFT, ACCENT_TEXT, ACCENT_SOFT, HAIRLINE, BG } from "@/lib/ui";

type Mode = "login" | "signup";

const LABEL_STYLE: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 8,
  fontSize: 13, fontWeight: 700, letterSpacing: "0.01em", color: INK_MUTED,
};

function SoftInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      {...props}
      style={input}
      onFocus={e => {
        e.currentTarget.style.borderColor = "rgba(47,179,106,0.55)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,179,106,0.14)";
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = "#ECE9E3";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: DANGER_SOFT, border: `1.5px solid rgba(232,80,58,0.3)`,
      fontSize: 13, color: DANGER, fontWeight: 700,
    }}>
      {message}
    </div>
  );
}

function PendingBox({ message }: { message: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12,
      background: ACCENT_SOFT, border: `1.5px solid rgba(47,179,106,0.3)`,
      fontSize: 13.5, color: ACCENT_TEXT, fontWeight: 700, lineHeight: 1.45,
      display: "flex", alignItems: "flex-start", gap: 9,
    }}>
      <span style={{ fontSize: 16, lineHeight: 1.2 }}>⏳</span>
      <span>{message}</span>
    </div>
  );
}

function SubmitBtn({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        ...btnPrimary, width: "100%",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
        transition: "opacity .2s ease, transform .1s ease",
      }}
      onPointerDown={e => { if (!pending) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
      onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
      onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
    >
      {!pending && (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block", flexShrink: 0 }} />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}

function LoginFields({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(login, undefined);
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK_MUTED, lineHeight: 1.4 }}>
        {t("loginIntro")}
      </p>

      <label style={LABEL_STYLE}>
        {t("email")}
        <SoftInput name="email" type="email" required autoComplete="email" placeholder={t("emailPlaceholder")} />
      </label>

      <label style={LABEL_STYLE}>
        {t("password")}
        <SoftInput name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </label>

      <a href="/forgot-password" style={{ alignSelf: "flex-end", marginTop: -10, fontSize: 13, fontWeight: 800, color: ACCENT_TEXT, textDecoration: "none" }}>
        {t("forgotPassword")}
      </a>

      {state && "error" in state && <ErrorBox message={state.error} />}

      <SubmitBtn pending={pending} label={t("signIn")} pendingLabel={t("signingIn")} />
    </form>
  );
}

function SignupFields({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signup, undefined);

  // Inscription réussie mais en attente d'activation par l'admin.
  if (state && "pending" in state) {
    return <PendingBox message={state.pending} />;
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK_MUTED, lineHeight: 1.4 }}>
        {t("signupIntro")}
      </p>

      <label style={LABEL_STYLE}>
        {t("firstName")}
        <SoftInput name="name" type="text" required autoComplete="name" placeholder={t("firstNamePlaceholder")} />
      </label>

      <label style={LABEL_STYLE}>
        {t("email")}
        <SoftInput name="email" type="email" required autoComplete="email" placeholder={t("emailPlaceholder")} />
      </label>

      <label style={LABEL_STYLE}>
        {t("password")}
        <SoftInput name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t("passwordMinPlaceholder")} />
      </label>

      <label style={LABEL_STYLE}>
        {t("confirmPassword")}
        <SoftInput name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
      </label>

      {state && "error" in state && <ErrorBox message={state.error} />}

      <SubmitBtn pending={pending} label={t("createAccount")} pendingLabel={t("creatingAccount")} />
    </form>
  );
}

export function LoginForm({ next, initialMode = "login" }: { next?: string; initialMode?: Mode }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>(initialMode);

  const tab = (m: Mode): React.CSSProperties => ({
    flex: 1, padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em",
    background: mode === m ? "#FFFFFF" : "transparent",
    color: mode === m ? INK_STRONG : INK_FAINT,
    boxShadow: mode === m ? "0 0 0 1px rgba(30,26,20,0.06), 0 4px 10px rgba(30,26,20,0.08)" : "none",
    transition: "background .2s ease, color .2s ease, box-shadow .2s ease",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Sélecteur Connexion / Inscription */}
      <div style={{
        display: "flex", gap: 4, padding: 4, borderRadius: 16,
        background: BG, border: `1.5px solid ${HAIRLINE}`,
      }}>
        <button type="button" style={tab("login")} onClick={() => setMode("login")}>
          {t("tabLogin")}
        </button>
        <button type="button" style={tab("signup")} onClick={() => setMode("signup")}>
          {t("tabSignup")}
        </button>
      </div>

      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: INK_STRONG }}>
        {mode === "login" ? t("headingLogin") : t("headingSignup")}
      </h2>

      {mode === "login" ? <LoginFields next={next} /> : <SignupFields next={next} />}

      <p style={{ margin: 0, textAlign: "center", fontSize: 13, fontWeight: 600, color: INK_MUTED }}>
        {mode === "login" ? (
          <>{t("noAccount")}{" "}
            <button type="button" onClick={() => setMode("signup")}
              style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT_TEXT, fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}>
              {t("signUpLink")}
            </button>
          </>
        ) : (
          <>{t("haveAccount")}{" "}
            <button type="button" onClick={() => setMode("login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT_TEXT, fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}>
              {t("signInLink")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
