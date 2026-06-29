/**
 * Couleurs de membres PERSONNELLES par observateur.
 *
 * Règle métier : dans MA vue, je porte la couleur que j'ai choisie ; les autres
 * membres prennent des couleurs distinctes auto-assignées — jamais la mienne, et
 * sans doublon entre eux (best-effort si le groupe dépasse la palette). Les choix
 * des autres ne sont pas synchronisés vers ma vue.
 */
import { AVATAR_COLORS, colorFor } from "@/lib/ui";

export type ColorMember = { id: string; color?: string | null };

/**
 * Construit la table userId → couleur du point de vue de `viewerId`.
 * @param viewerId      l'observateur (moi)
 * @param viewerChosen  ma couleur choisie (User.color), résolue via colorFor
 * @param members       tous les membres du groupe (id suffisant)
 */
export function resolveGroupColors(
  viewerId: string,
  viewerChosen: string | null | undefined,
  members: ColorMember[],
): Map<string, string> {
  const mine = colorFor(viewerId, viewerChosen);
  const map = new Map<string, string>();
  map.set(viewerId, mine);

  // Pool = palette sans ma couleur ; assignation déterministe par ordre d'id stable.
  const pool = AVATAR_COLORS.filter((c) => c !== mine);
  const others = members
    .filter((m) => m.id !== viewerId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  others.forEach((m, i) => {
    map.set(m.id, pool.length ? pool[i % pool.length] : mine);
  });

  return map;
}
