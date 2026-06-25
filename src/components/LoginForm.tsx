"use client";

import { useActionState, useRef, useState } from "react";
import { login, signup, type ActionResult } from "@/lib/actions/auth";
import { input, btnPrimary, INK_STRONG, INK_MUTED, INK_FAINT, DANGER, DANGER_SOFT, ACCENT_TEXT, HAIRLINE, BG } from "@/lib/ui";

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
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(login, undefined);
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK_MUTED, lineHeight: 1.4 }}>
        Content de te revoir ! Connecte-toi pour retrouver tes listes.
      </p>

      <label style={LABEL_STYLE}>
        Email
        <SoftInput name="email" type="email" required autoComplete="email" placeholder="romain@exemple.fr" />
      </label>

      <label style={LABEL_STYLE}>
        Mot de passe
        <SoftInput name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </label>

      {state?.error && <ErrorBox message={state.error} />}

      <SubmitBtn pending={pending} label="Se connecter" pendingLabel="Connexion…" />
    </form>
  );
}

function SignupFields({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signup, undefined);
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK_MUTED, lineHeight: 1.4 }}>
        Crée ton compte en quelques secondes.
      </p>

      <label style={LABEL_STYLE}>
        Prénom
        <SoftInput name="name" type="text" required autoComplete="name" placeholder="Romain" />
      </label>

      <label style={LABEL_STYLE}>
        Email
        <SoftInput name="email" type="email" required autoComplete="email" placeholder="romain@exemple.fr" />
      </label>

      <label style={LABEL_STYLE}>
        Mot de passe
        <SoftInput name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8 caractères minimum" />
      </label>

      <label style={LABEL_STYLE}>
        Confirmer le mot de passe
        <SoftInput name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
      </label>

      {state?.error && <ErrorBox message={state.error} />}

      <SubmitBtn pending={pending} label="Créer mon compte" pendingLabel="Création…" />
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("login");

  const tab = (m: Mode, label: string): React.CSSProperties => ({
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
        <button type="button" style={tab("login", "Connexion")} onClick={() => setMode("login")}>
          Connexion
        </button>
        <button type="button" style={tab("signup", "Inscription")} onClick={() => setMode("signup")}>
          Inscription
        </button>
      </div>

      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: INK_STRONG }}>
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </h2>

      {mode === "login" ? <LoginFields next={next} /> : <SignupFields next={next} />}

      <p style={{ margin: 0, textAlign: "center", fontSize: 13, fontWeight: 600, color: INK_MUTED }}>
        {mode === "login" ? (
          <>Pas encore de compte ?{" "}
            <button type="button" onClick={() => setMode("signup")}
              style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT_TEXT, fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}>
              Inscris-toi
            </button>
          </>
        ) : (
          <>Déjà un compte ?{" "}
            <button type="button" onClick={() => setMode("login")}
              style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT_TEXT, fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}>
              Connecte-toi
            </button>
          </>
        )}
      </p>
    </div>
  );
}
