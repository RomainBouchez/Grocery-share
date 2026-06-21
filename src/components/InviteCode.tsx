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
      // clipboard indisponible (http non sécurisé) : on ignore silencieusement.
    }
  }

  return (
    <button
      onClick={copy}
      title="Copier le lien d'invitation"
      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200"
    >
      <span className="tracking-widest">{code}</span>
      <span className="text-neutral-400">{copied ? "✓ copié" : "🔗"}</span>
    </button>
  );
}
