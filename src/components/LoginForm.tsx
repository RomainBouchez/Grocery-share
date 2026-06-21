"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/lib/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Prénom
        <input
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Romain"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="romain@exemple.fr"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton
        className="bg-green-600 px-4 py-2.5 text-white hover:bg-green-700"
        pendingLabel="Connexion…"
      >
        Continuer
      </SubmitButton>

      <p className="text-center text-xs text-neutral-500">
        Première fois ? On crée ton compte automatiquement.
      </p>
    </form>
  );
}
