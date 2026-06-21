import { randomInt } from "crypto";

// Pas de I, O, 0, 1 pour éviter les confusions à la lecture du code d'invitation.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Génère un code d'invitation court et lisible (ex: "K7P2QX"). */
export function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

/** Formate un montant en euros (ex: 1.29 -> "1,29 €"). */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Initiales d'un nom pour les avatars (ex: "Romain Bouchez" -> "RB"). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
