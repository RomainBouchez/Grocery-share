"use client";

import { useActionState, useEffect, useRef } from "react";
import { addItem, type ActionResult } from "@/lib/actions/items";

export function AddItemForm({
  groupId,
  suggestions = [],
}: {
  groupId: string;
  suggestions?: string[];
}) {
  const [state, action] = useActionState<ActionResult, FormData>(addItem, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === undefined) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <input type="hidden" name="groupId" value={groupId} />
      <input
        ref={inputRef}
        name="label"
        placeholder="Ajouter un article…"
        autoComplete="off"
        list={suggestions.length > 0 ? "product-suggestions" : undefined}
        style={{
          flex: 1, minWidth: 0,
          padding: "12px 4px 12px 12px",
          border: "none",
          background: "transparent",
          color: "#1B1A16",
          fontSize: 15, fontWeight: 600,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      {suggestions.length > 0 && (
        <datalist id="product-suggestions">
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
      <button
        type="submit"
        aria-label="Ajouter"
        style={{
          flexShrink: 0,
          width: 46, height: 46,
          borderRadius: 14,
          border: "1.5px solid rgba(0,0,0,0.06)",
          cursor: "pointer",
          background: "#2FB36A",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 8px 18px rgba(47,179,106,0.3)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </form>
  );
}
