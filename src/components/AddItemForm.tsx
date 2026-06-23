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
          padding: "14px 16px",
          borderRadius: 13,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.92)",
          fontSize: 15,
          fontFamily: "inherit",
          outline: "none",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "rgba(91,208,138,0.5)";
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(91,208,138,0.12)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {suggestions.length > 0 && (
        <datalist id="product-suggestions">
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
      <button
        type="submit"
        style={{
          flexShrink: 0,
          width: 48, height: 48,
          borderRadius: 13,
          border: "none",
          cursor: "pointer",
          background: "#5BD08A",
          color: "#0D0D0F",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "inset 0 1.4px 0.6px rgba(255,255,255,0.45), 0 8px 20px rgba(91,208,138,0.3)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </form>
  );
}
