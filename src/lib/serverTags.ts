/**
 * Helpers serveur pour les tags (non server-actions).
 * Séparé de `actions/tags.ts` car ces fonctions sont appelées depuis les
 * Server Components, pas exposées comme endpoints.
 */
import { prisma } from "@/lib/db";
import { DEFAULT_TAGS, type TagView } from "@/lib/tags";

/**
 * Crée les rayons par défaut pour un groupe s'il n'en a aucun.
 * Idempotent → couvre aussi les groupes créés avant la feature.
 */
export async function ensureDefaultTags(groupId: string): Promise<void> {
  const count = await prisma.tag.count({ where: { groupId } });
  if (count > 0) return;
  await prisma.tag.createMany({
    data: DEFAULT_TAGS.map((t, i) => ({
      groupId, name: t.name, icon: t.icon, color: t.color, sort: i,
    })),
  });
}

/** Tags d'un groupe, triés (sort puis nom), au format léger d'affichage. */
export async function getGroupTags(groupId: string): Promise<TagView[]> {
  const tags = await prisma.tag.findMany({
    where: { groupId },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: { id: true, name: true, icon: true, color: true },
  });
  return tags;
}
