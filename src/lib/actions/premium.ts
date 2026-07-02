"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser, hasPremiumAccess } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";
import { runClaude } from "@/lib/claude-cli";
import { normalizeLoose } from "@/lib/matching";
import { parseUnit, clampQuantity, MAX_PIECES, MAX_GRAMS, type ItemUnit } from "@/lib/units";

// Fonctionnalités premium : dictée vocale rapide + import de recettes.
// Accès contrôlé par hasPremiumAccess (admin uniquement pour l'instant).

const PREMIUM_MODEL = process.env.CLAUDE_PREMIUM_MODEL ?? "haiku";
const RECIPE_FETCH_TIMEOUT_MS = 15_000;
const RECIPE_TEXT_MAX_CHARS = 16_000;

export type ParsedItem = { label: string; quantity: number; unit?: ItemUnit };
export type ParseResult =
  | { error: string }
  | { items: ParsedItem[]; title?: string; servings?: number };

/** Extrait le premier tableau/objet JSON de la sortie texte de Claude. */
function extractJson(raw: string, open: string, close: string): string {
  const start = raw.indexOf(open);
  const end = raw.lastIndexOf(close);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Sortie Claude sans JSON exploitable.");
  }
  return raw.slice(start, end + 1);
}

/** Valide/nettoie les items renvoyés par le modèle. */
function sanitizeItems(raw: unknown): ParsedItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: ParsedItem[] = [];
  for (const entry of raw) {
    const label = String((entry as { label?: unknown })?.label ?? "").trim().slice(0, 80);
    if (!label) continue;
    const norm = normalizeLoose(label);
    if (seen.has(norm)) continue;
    seen.add(norm);
    const unit = parseUnit((entry as { unit?: unknown })?.unit);
    const q = Number((entry as { quantity?: unknown })?.quantity);
    items.push({ label, quantity: clampQuantity(q, unit), unit });
    if (items.length >= 40) break;
  }
  return items;
}

async function requirePremiumMember(groupId: string) {
  const user = await requireUser();
  if (!hasPremiumAccess(user)) throw new Error("FORBIDDEN");
  await assertMembership(user.id, groupId);
  return user;
}

/* ============================================================
   Dictée vocale : transcript libre → articles structurés
   ============================================================ */

/**
 * Transforme une dictée (« du lait, deux douzaines d'œufs et du pain complet »)
 * en articles structurés. Repli simple sur un découpage par virgules si Claude
 * est indisponible.
 */
export async function parseDictation(groupId: string, transcript: string): Promise<ParseResult> {
  await requirePremiumMember(groupId);
  const t = await getTranslations("premium.errors");

  const text = transcript.trim().slice(0, 1000);
  if (!text) return { error: t("emptyDictation") };

  const prompt = [
    "Tu transformes une dictée vocale de courses en liste d'articles.",
    "La dictée peut être en français ou en anglais, avec des quantités en toutes",
    "lettres (« deux », « une douzaine ») ou des hésitations à ignorer.",
    "",
    `DICTÉE : ${text}`,
    "",
    "Renvoie UNIQUEMENT un tableau JSON, au format exact :",
    '[{"label":"Lait","quantity":1,"unit":null}]',
    "Règles :",
    "- un objet par article distinct ; label court et propre (première lettre en",
    "  majuscule, sans article défini : « Lait » pas « du lait ») ;",
    "- unit = null pour des pièces, \"g\" pour un poids ; avec unit \"g\",",
    "  quantity = poids en grammes (« 500 grammes de farine » → quantity 500,",
    "  « un kilo de pommes » → quantity 1000) ;",
    "- sans unité : quantity = nombre entier ≥ 1 (« une douzaine d'œufs » →",
    "  label « Œufs », quantity 12 ; sans quantité explicite → 1) ;",
    "- ignore les hésitations et mots parasites ;",
    "- aucun texte autour du JSON.",
  ].join("\n");

  try {
    const out = await runClaude({ prompt, model: PREMIUM_MODEL, timeoutMs: 30_000 });
    const items = sanitizeItems(JSON.parse(extractJson(out, "[", "]")));
    if (items.length === 0) return { error: t("nothingParsed") };
    return { items };
  } catch (err) {
    console.error("[premium] parseDictation fallback", err);
    // Filet de secours : découpage par virgules / « et ».
    const items = sanitizeItems(
      text.split(/,|\bet\b|\band\b/i).map(part => ({ label: part.trim(), quantity: 1 })),
    );
    if (items.length === 0) return { error: t("nothingParsed") };
    return { items };
  }
}

/* ============================================================
   Import de recette : URL ou texte collé → ingrédients
   ============================================================ */

/** Garde-fou SSRF : n'autorise que http(s) vers des hôtes publics. */
function isSafeRecipeUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // IP littérales privées/loopback (IPv4 + IPv6 usuelles).
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;
  return true;
}

/** Récupère une page de recette et la réduit à du texte brut exploitable. */
async function fetchRecipeText(rawUrl: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!isSafeRecipeUrl(url)) return null;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(RECIPE_FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SharedCart/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Réduction HTML → texte : scripts/styles supprimés, balises aplaties.
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#?\w+;/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, RECIPE_TEXT_MAX_CHARS);
  } catch {
    return null;
  }
}

/**
 * Importe une recette depuis une URL ou un texte collé et en extrait les
 * ingrédients sous forme d'articles de courses (avec aperçu côté client).
 */
export async function parseRecipe(groupId: string, input: string): Promise<ParseResult> {
  await requirePremiumMember(groupId);
  const t = await getTranslations("premium.errors");

  const raw = input.trim();
  if (!raw) return { error: t("emptyRecipe") };

  let recipeText = raw.slice(0, RECIPE_TEXT_MAX_CHARS);
  if (/^https?:\/\//i.test(raw)) {
    const fetched = await fetchRecipeText(raw);
    if (!fetched) return { error: t("fetchFailed") };
    recipeText = fetched;
  }

  const prompt = [
    "Tu extrais la liste d'ingrédients d'une recette de cuisine pour en faire",
    "une liste de courses. Le texte peut contenir du bruit (navigation, pubs,",
    "commentaires) : concentre-toi sur la section ingrédients.",
    "",
    "TEXTE DE LA RECETTE :",
    recipeText,
    "",
    "Renvoie UNIQUEMENT un objet JSON, au format exact :",
    '{"title":"Nom de la recette","servings":4,"items":[{"label":"Farine","quantity":200,"unit":"g"}]}',
    "Règles :",
    "- servings = nombre de personnes/parts de la recette (« pour 6 personnes »",
    "  → 6) ; quantity de chaque ingrédient correspond à CE nombre de parts ;",
    "  si non précisé, servings = 4 ;",
    "- un objet par ingrédient ; label court de liste de courses (« Farine »,",
    "  « Crème fraîche »), sans grammages dans le label ;",
    "- unit = \"g\" quand la recette donne un poids : quantity = grammes",
    "  (« 200 g de farine » → quantity 200 ; « 1,5 kg » → 1500) ;",
    "- unit = null quand c'est dénombrable : quantity = nombre (« 3 pommes »",
    "  → 3) ; liquides et volumes → quantity 1, unit null ;",
    "- ignore l'eau, le sel et le poivre (basiques toujours présents) ;",
    "- si aucun ingrédient trouvé : {\"title\":\"\",\"servings\":4,\"items\":[]} ;",
    "- aucun texte autour du JSON.",
  ].join("\n");

  try {
    const out = await runClaude({ prompt, model: PREMIUM_MODEL, timeoutMs: 60_000 });
    const parsed = JSON.parse(extractJson(out, "{", "}")) as { title?: unknown; servings?: unknown; items?: unknown };
    const items = sanitizeItems(parsed.items);
    if (items.length === 0) return { error: t("noIngredients") };
    const title = String(parsed.title ?? "").trim().slice(0, 80) || undefined;
    // Parts de base : bornées 1-50, repli 4 si absent/incohérent.
    const rawServings = Math.round(Number(parsed.servings));
    const servings = Number.isFinite(rawServings) ? Math.max(1, Math.min(50, rawServings)) : 4;
    return { items, title, servings };
  } catch {
    return { error: t("parseFailed") };
  }
}

/* ============================================================
   Ajout groupé des articles retenus
   ============================================================ */

/**
 * Ajoute d'un coup les articles issus d'une dictée ou d'une recette.
 * Reprend les règles d'addItem : anti-doublons (quantités fusionnées) et
 * rayon mémorisé par produit. `withHistory` alimente l'autocomplétion perso
 * (dictée = saisie volontaire → oui ; recette = import auto → non).
 */
export async function addParsedItems(
  groupId: string,
  items: ParsedItem[],
  withHistory = false,
): Promise<{ added: number }> {
  const user = await requirePremiumMember(groupId);

  const clean = sanitizeItems(items);
  if (clean.length === 0) return { added: 0 };

  let list = await prisma.shoppingList.findFirst({
    where: { groupId, status: { in: ["planning", "shopping"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!list) {
    list = await prisma.shoppingList.create({ data: { groupId, status: "planning" } });
  }

  const [productTags, pendingItems] = await Promise.all([
    prisma.groupProductTag.findMany({ where: { groupId }, select: { label: true, tagId: true } }),
    prisma.listItem.findMany({
      where: { listId: list.id, status: "pending" },
      select: { id: true, label: true, quantity: true, unit: true },
    }),
  ]);
  const tagByNorm = new Map(productTags.map(pt => [normalizeLoose(pt.label), pt.tagId]));
  // Clé de fusion = libellé normalisé + unité (500 g de farine ≠ 2 farines).
  const keyOf = (label: string, unit: ItemUnit) => `${unit ?? "x"}:${normalizeLoose(label)}`;
  const pendingByKey = new Map(pendingItems.map(it => [keyOf(it.label, parseUnit(it.unit)), it]));

  let added = 0;
  for (const item of clean) {
    const unit = item.unit ?? null;
    const existing = pendingByKey.get(keyOf(item.label, unit));

    if (existing) {
      await prisma.listItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(unit === "g" ? MAX_GRAMS : MAX_PIECES, existing.quantity + item.quantity) },
      });
      await prisma.itemParticipant.upsert({
        where: { itemId_userId: { itemId: existing.id, userId: user.id } },
        create: { itemId: existing.id, userId: user.id, parts: 1 },
        update: {},
      });
    } else {
      const created = await prisma.listItem.create({
        data: {
          listId: list.id,
          label: item.label,
          addedByUserId: user.id,
          tagId: tagByNorm.get(normalizeLoose(item.label)) ?? null,
          quantity: item.quantity,
          unit,
          participants: { create: { userId: user.id, parts: 1 } },
        },
      });
      pendingByKey.set(keyOf(item.label, unit), { id: created.id, label: created.label, quantity: created.quantity, unit: created.unit });
    }

    if (withHistory) {
      await prisma.userProduct.upsert({
        where: { userId_label: { userId: user.id, label: item.label } },
        create: { userId: user.id, label: item.label, buyCount: 1, lastBoughtAt: new Date() },
        update: { buyCount: { increment: 1 }, lastBoughtAt: new Date() },
      });
    }
    added++;
  }

  revalidatePath(`/groups/${groupId}`);
  return { added };
}
