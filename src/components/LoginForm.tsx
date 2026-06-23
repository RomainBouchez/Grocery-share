"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/lib/actions/auth";
import { useRef } from "react";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 13,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "rgba(255,255,255,0.55)",
};

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      {...props}
      style={INPUT_STYLE}
      onFocus={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.borderColor = "rgba(91,208,138,0.5)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(91,208,138,0.12)";
      }}
      onBlur={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(login, undefined);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.96)" }}>
          Connexion
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
          Première fois ? Ton compte est créé automatiquement.
        </p>
      </div>

      <label style={LABEL_STYLE}>
        Prénom
        <GlassInput
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Romain"
        />
      </label>

      <label style={LABEL_STYLE}>
        Email
        <GlassInput
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="romain@exemple.fr"
        />
      </label>

      {state?.error && (
        <div style={{
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.25)",
          fontSize: 13,
          color: "#FCA5A5",
          fontWeight: 500,
        }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          width: "100%",
          padding: "15px 24px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.09)",
          boxShadow: "inset 0 1.6px 0.8px -0.6px rgba(255,255,255,0.72), inset 0 -1.6px 0.8px -0.6px rgba(255,255,255,0.5), inset 2px 0 2px -1.5px rgba(0,0,0,0.55), inset -2px 0 2px -1.5px rgba(0,0,0,0.55), inset 0 0 24px rgba(91,208,138,0.1), 0 10px 30px rgba(0,0,0,0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: "rgba(255,255,255,0.96)",
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          transition: "opacity .2s ease, transform .1s ease",
        }}
        onPointerDown={e => { if (!pending) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
        onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
        onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
      >
        {!pending && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5BD08A", boxShadow: "0 0 10px #5BD08A", display: "block", flexShrink: 0 }} />
        )}
        {pending ? "Connexion…" : "Continuer"}
      </button>
    </form>
  );
}
