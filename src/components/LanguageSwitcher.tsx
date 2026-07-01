"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserLocale } from "@/i18n/locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { ACCENT, INK_STRONG, INK_MUTED } from "@/lib/ui";

/**
 * Sélecteur de langue. Écrit le choix côté serveur (cookie) puis rafraîchit la
 * route pour que tous les server components se re-rendent dans la nouvelle langue.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const [locale, setLocale] = useState<Locale>(current);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function pick(next: Locale) {
    if (next === locale || isPending) return;
    setLocale(next); // optimiste
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {LOCALES.map((code) => {
        const on = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => pick(code)}
            aria-pressed={on}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              cursor: isPending ? "default" : "pointer",
              border: on ? `2px solid ${ACCENT}` : "2px solid #ECE9E3",
              background: on ? "rgba(47,179,106,0.08)" : "#fff",
              color: on ? INK_STRONG : INK_MUTED,
              fontSize: 15,
              fontWeight: on ? 800 : 600,
              letterSpacing: "-0.01em",
              transition: "border-color .2s ease, background .2s ease",
            }}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
