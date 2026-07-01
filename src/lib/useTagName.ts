"use client";

import { useTranslations } from "next-intl";
import { DEFAULT_TAGS } from "@/lib/tags";

/**
 * Les rayons par défaut sont stockés en base avec leur nom français (seed).
 * Pour les afficher dans la langue active, on retraduit UNIQUEMENT ceux dont
 * le nom correspond exactement à un rayon par défaut (clé = son icône). Les
 * rayons créés par l'utilisateur sont laissés tels quels.
 */
const NAME_TO_ICON = new Map(DEFAULT_TAGS.map((t) => [t.name, t.icon]));

export function useTagName() {
  const t = useTranslations("tags.defaults");
  return (name: string): string => {
    const icon = NAME_TO_ICON.get(name);
    return icon ? t(icon) : name;
  };
}
