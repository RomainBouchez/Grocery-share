"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LinkRound, CheckCircle } from "@/lib/icons";
import { btnPrimary, ACCENT_TEXT, ACCENT_SOFT, INK_MUTED, HAIRLINE } from "@/lib/ui";

export function InviteCode({ code, variant = "pill" }: { code: string; variant?: "pill" | "primary" }) {
  const tr = useTranslations("group");
  const [copied, setCopied] = useState(false);

  /** Copie compatible HTTP (Raspberry Pi) : clipboard API → execCommand → prompt. */
  async function copy() {
    const url = `${window.location.origin}/join/${code}`;
    let ok = false;

    // 1. Clipboard API moderne — uniquement en contexte sécurisé (https / localhost).
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = false;
      }
    }

    // 2. Fallback execCommand — fonctionne en HTTP simple (cas du Pi).
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      // 3. Dernier recours : on montre le lien pour copie manuelle.
      window.prompt(tr("copyLinkPrompt"), url);
    }
  }

  if (variant === "primary") {
    return (
      <button onClick={copy} style={{ ...btnPrimary, width: "100%" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
        </svg>
        {copied ? tr("linkCopied") : tr("inviteSomeone")}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      title={tr("copyLinkTitle")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 999, cursor: "pointer",
        background: copied ? ACCENT_SOFT : "#fff",
        border: `1.5px solid ${copied ? "rgba(47,179,106,0.3)" : HAIRLINE}`,
        boxShadow: "0 0 0 1px rgba(30,26,20,0.04)",
        fontSize: 12, fontWeight: 800, fontFamily: "inherit",
        color: copied ? ACCENT_TEXT : INK_MUTED,
        letterSpacing: "0.04em", transition: "color .2s, background .2s",
      }}
    >
      {copied
        ? <CheckCircle weight="Bold" size={14} color="currentColor" />
        : <LinkRound weight="Linear" size={14} color="currentColor" />}
      <span>{copied ? tr("copied") : code}</span>
    </button>
  );
}
