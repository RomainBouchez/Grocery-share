"use client";

import { useActionState, useEffect, useRef } from "react";
import { addItem, type ActionResult } from "@/lib/actions/items";
import { SubmitButton } from "./SubmitButton";

export function AddItemForm({
  groupId,
  suggestions = [],
}: {
  groupId: string;
  suggestions?: string[];
}) {
  const [state, action] = useActionState<ActionResult, FormData>(addItem, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Vide le champ après un ajout réussi (pas d'erreur renvoyée).
  useEffect(() => {
    if (state === undefined) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input type="hidden" name="groupId" value={groupId} />
        <input
          name="label"
          placeholder="Ajouter un article (lait, vodka 1L…)"
          autoComplete="off"
          list={suggestions.length > 0 ? "product-suggestions" : undefined}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
        />
        {suggestions.length > 0 && (
          <datalist id="product-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        <SubmitButton
          className="bg-green-600 px-4 py-2.5 text-white hover:bg-green-700"
          pendingLabel="…"
        >
          Ajouter
        </SubmitButton>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
