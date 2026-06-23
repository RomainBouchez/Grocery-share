"use client";

import { useState } from "react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const url = `${window.location.origin}/join/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable on http
    }
  }

  return (
    <button
      onClick={copy}
      title="Copier le lien d'invitation"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999, cursor: "pointer",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)",
        fontSize: 12, fontWeight: 700, fontFamily: "inherit",
        color: copied ? "#9FE3BD" : "rgba(255,255,255,0.55)",
        letterSpacing: "0.05em", transition: "color .2s",
      }}
    >
      <span>{code}</span>
      <span style={{ opacity: 0.8 }}>{copied ? "✓" : "🔗"}</span>
    </button>
  );
}
