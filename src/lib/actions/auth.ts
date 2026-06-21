"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export type ActionResult = { error: string } | undefined;

/**
 * Connexion simplifiée (MVP) : on identifie l'utilisateur par email.
 * S'il n'existe pas, on le crée. À remplacer par un vrai magic link ensuite.
 */
export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Adresse email invalide." };
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!name) {
      return { error: "Première connexion : indique ton prénom." };
    }
    user = await prisma.user.create({ data: { name, email } });
  } else if (name && name !== user.name) {
    user = await prisma.user.update({ where: { id: user.id }, data: { name } });
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
