/**
 * Tags / rayons — données partagées (client + serveur, sans Prisma).
 * Chaque tag a un nom, une icône Solar (clé) et une couleur hex.
 */
import type { ComponentType } from "react";
import {
  Leaf, Bone, Bottle, RollingPin, Box, Donut, Wineglass,
  Snowflake, Bath, Broom, Heart, Paw, Tag,
} from "@/lib/icons";

// Les composants Solar attendent un `weight` typé (IconWeight). On reste permissif
// ici pour pouvoir les stocker dans un registre sans batailler avec la variance.
export type IconComponent = ComponentType<{ size?: number; weight?: string; color?: string }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyIcon = ComponentType<any>;

/** Registre nom d'icône → composant. Source unique pour le rendu des tags. */
export const TAG_ICON: Record<string, AnyIcon> = {
  Leaf, Bone, Bottle, RollingPin, Box, Donut, Wineglass,
  Snowflake, Bath, Broom, Heart, Paw, Tag,
};

/** Icône à afficher pour une clé donnée (fallback Tag). */
export function tagIcon(name?: string | null): AnyIcon {
  return (name && TAG_ICON[name]) || Tag;
}

export type DefaultTag = { name: string; icon: string; color: string };

/** Jeu de rayons par défaut, créés à la 1re ouverture d'un groupe. */
export const DEFAULT_TAGS: DefaultTag[] = [
  { name: "Fruits & légumes", icon: "Leaf", color: "#2FB36A" },
  { name: "Viande & poisson", icon: "Bone", color: "#E8503A" },
  { name: "Crémerie & frais", icon: "Bottle", color: "#7E91FF" },
  { name: "Boulangerie", icon: "RollingPin", color: "#D9852A" },
  { name: "Épicerie salée", icon: "Box", color: "#F0813F" },
  { name: "Épicerie sucrée", icon: "Donut", color: "#EF6F9E" },
  { name: "Boissons", icon: "Wineglass", color: "#C99BF0" },
  { name: "Surgelés", icon: "Snowflake", color: "#5AB0E8" },
  { name: "Hygiène & beauté", icon: "Bath", color: "#2BB3A3" },
  { name: "Entretien & maison", icon: "Broom", color: "#8A93A8" },
  { name: "Animaux", icon: "Paw", color: "#B5793F" },
  { name: "Autre", icon: "Tag", color: "#807C72" },
];

/** Couleurs autorisées pour un tag (= palette des rayons par défaut). */
export const TAG_COLORS = DEFAULT_TAGS.map((t) => t.color);

/** Couleur déterministe pour un tag créé à la volée (à partir de son nom). */
export function pickNewTagColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_COLORS[h % TAG_COLORS.length];
}

/** Couleur de fond douce (≈8 %) dérivée d'une couleur de tag, pour les puces. */
export function tagBg(color: string): string {
  return `${color}16`; // hex alpha ~9 %
}

/** Vue légère d'un tag pour le rendu (props composants). */
export type TagView = { id: string; name: string; icon: string; color: string };
