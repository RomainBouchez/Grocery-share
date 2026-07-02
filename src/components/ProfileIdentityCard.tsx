"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { updateProfileName, type ProfileActionResult } from "@/lib/actions/auth";
import { initials } from "@/lib/utils";
import { card, input, INK_STRONG, INK_MUTED, DANGER, ACCENT, ACCENT_SOFT, ACCENT_TEXT } from "@/lib/ui";

/**
 * Carte identité du profil : avatar + prénom (éditable au crayon) + email.
 */
export function ProfileIdentityCard({
  name,
  email,
  color,
}: {
  name: string;
  email: string;
  color: string;
}) {
  const t = useTranslations("profile");
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ProfileActionResult, FormData>(updateProfileName, undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ferme le mode édition quand la sauvegarde aboutit.
  useEffect(() => {
    if (state && "success" in state) setEditing(false);
  }, [state]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  return (
    <div style={{ ...card, padding: 22, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: color, color: "#fff", fontSize: 20, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05)" }}>
          {initials(name)}
        </div>

        {editing ? (
          <form action={formAction} style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={inputRef}
              name="name"
              type="text"
              defaultValue={name}
              required
              maxLength={50}
              autoComplete="given-name"
              style={{ ...input, padding: "10px 13px", fontSize: 15 }}
            />
            <button
              type="submit"
              disabled={pending}
              aria-label={t("saveName")}
              style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0, cursor: pending ? "wait" : "pointer",
                background: ACCENT, border: "none", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)", opacity: pending ? 0.6 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label={t("cancel")}
              style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                background: "none", border: "none", color: INK_MUTED,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900,
              }}
            >
              ✕
            </button>
          </form>
        ) : (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: INK_STRONG }}>{name}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK_MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("editName")}
              style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                background: ACCENT_SOFT, border: "none", color: ACCENT_TEXT,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {editing && state && "error" in state && (
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: DANGER }}>{state.error}</div>
      )}
    </div>
  );
}
