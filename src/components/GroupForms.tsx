"use client";

import { useActionState } from "react";
import { createGroup, joinGroup, type ActionResult } from "@/lib/actions/groups";
import { SubmitButton } from "./SubmitButton";

export function CreateGroupForm() {
  const [state, action] = useActionState<ActionResult, FormData>(createGroup, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="name"
        placeholder="Nom du groupe (Coloc, Famille…)"
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton
        className="bg-green-600 px-4 py-2.5 text-white hover:bg-green-700"
        pendingLabel="Création…"
      >
        Créer un groupe
      </SubmitButton>
    </form>
  );
}

export function JoinGroupForm() {
  const [state, action] = useActionState<ActionResult, FormData>(joinGroup, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="code"
        placeholder="Code d'invitation (ex: K7P2QX)"
        autoCapitalize="characters"
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base uppercase tracking-widest outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton
        className="border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 hover:bg-neutral-50"
        pendingLabel="Recherche…"
      >
        Rejoindre avec un code
      </SubmitButton>
    </form>
  );
}
