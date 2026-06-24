"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/lib/actions/auth";
import { useRef } from "react";
import { input, btnPrimary, INK_STRONG, INK_MUTED, DANGER, DANGER_SOFT } from "@/lib/ui";

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

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(login, undefined);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: INK_STRONG }}>
          Connexion
        </h2>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK_MUTED, lineHeight: 1.4 }}>
          Première fois ? Ton compte est créé automatiquement.
        </p>
      </div>

      <label style={LABEL_STYLE}>
        Prénom
        <SoftInput name="name" type="text" autoComplete="name" placeholder="Romain" />
      </label>

      <label style={LABEL_STYLE}>
        Email
        <SoftInput name="email" type="email" required autoComplete="email" placeholder="romain@exemple.fr" />
      </label>

      {state?.error && (
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: DANGER_SOFT, border: `1.5px solid rgba(232,80,58,0.3)`,
          fontSize: 13, color: DANGER, fontWeight: 700,
        }}>
          {state.error}
        </div>
      )}

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
        {pending ? "Connexion…" : "Continuer"}
      </button>
    </form>
  );
}
