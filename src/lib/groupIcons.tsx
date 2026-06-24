import {
  Home, UsersGroupRounded, Cart3, Bag3, Heart, Star,
  Wineglass, ChefHatMinimalistic, CupHot, Buildings, Confetti, Leaf,
} from "@solar-icons/react/ssr";
import type { ComponentType } from "react";
import type { IconProps } from "@solar-icons/react";

/** Icônes proposées pour les groupes/listes (Solar). Ordre = ordre du sélecteur. */
const MAP: Record<string, ComponentType<IconProps>> = {
  Home, UsersGroupRounded, Cart3, Bag3, Heart, Star,
  Wineglass, ChefHatMinimalistic, CupHot, Buildings, Confetti, Leaf,
};

export const GROUP_ICONS = Object.keys(MAP);
export const DEFAULT_GROUP_ICON = "Home";

/** Rend l'icône d'un groupe par son nom (repli sur Home). */
export function GroupIcon({
  name, size = 20, color, weight = "Bold",
}: {
  name?: string | null;
  size?: number;
  color?: string;
  weight?: "Bold" | "Linear";
}) {
  const Cmp = (name && MAP[name]) || MAP[DEFAULT_GROUP_ICON];
  return <Cmp weight={weight} size={size} color={color} />;
}
