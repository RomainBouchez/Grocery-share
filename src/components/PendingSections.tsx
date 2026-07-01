"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ItemCard, type ItemView, type MemberView } from "@/components/ItemCard";
import { RayonGroup } from "@/components/RayonGroup";
import { tagIcon, tagBg, type TagView } from "@/lib/tags";
import { INK_FAINT } from "@/lib/ui";

type Group = { tag: TagView | null; items: ItemView[] };
type Entry = { key: string; tag: TagView | null; items: ItemView[]; exiting: boolean };

const keyOf = (g: Group) => (g.tag ? g.tag.id : "__none");

/**
 * Sections « à acheter » groupées par rayon, avec présence animée :
 * un rayon qui apparaît se déploie, un rayon vidé collapse avant de partir.
 */
export function PendingSections({
  groups, currentUserId, members, memberColors, groupId, tags,
}: {
  groups: Group[];
  currentUserId: string;
  members: MemberView[];
  memberColors: Record<string, string>;
  groupId: string;
  tags: TagView[];
}) {
  const tr = useTranslations("tag");
  const [entries, setEntries] = useState<Entry[]>(() =>
    groups.map(g => ({ key: keyOf(g), tag: g.tag, items: g.items, exiting: false })),
  );

  useEffect(() => {
    setEntries(prev => {
      const incoming = new Map(groups.map(g => [keyOf(g), g]));
      const prevKeys = new Set(prev.map(e => e.key));

      // Met à jour les rayons encore présents, marque en sortie ceux disparus.
      const merged: Entry[] = prev.map(e => {
        const g = incoming.get(e.key);
        if (g) return { key: e.key, tag: g.tag, items: g.items, exiting: false };
        return { ...e, items: [], exiting: true }; // vidé → header seul qui collapse
      });

      // Ajoute les nouveaux rayons.
      for (const g of groups) {
        if (!prevKeys.has(keyOf(g))) {
          merged.push({ key: keyOf(g), tag: g.tag, items: g.items, exiting: false });
        }
      }

      // Ordre : rayons actifs selon l'ordre serveur, sortants en fin.
      const order = new Map(groups.map((g, i) => [keyOf(g), i]));
      merged.sort((a, b) => {
        const ai = a.exiting ? Infinity : (order.get(a.key) ?? Infinity);
        const bi = b.exiting ? Infinity : (order.get(b.key) ?? Infinity);
        return ai - bi;
      });
      return merged;
    });
  }, [groups]);

  function removeEntry(key: string) {
    setEntries(prev => prev.filter(e => e.key !== key));
  }

  // Un item démarre son collapse : si c'est le dernier de son rayon, on collapse
  // le header en même temps (sortie synchronisée carte + section).
  function handleLeaving(itemId: string) {
    setEntries(prev => prev.map(e => {
      if (e.exiting) return e;
      const has = e.items.some(i => i.id === itemId);
      return has && e.items.length === 1 ? { ...e, exiting: true } : e;
    }));
  }

  return (
    <>
      {entries.map(e => {
        const Icon = e.tag ? tagIcon(e.tag.icon) : null;
        return (
          <RayonGroup key={e.key} exiting={e.exiting} onExited={() => removeEntry(e.key)}>
            {/* En-tête de rayon */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "0 4px 8px" }}>
              {e.tag && Icon ? (
                <>
                  <span style={{
                    width: 22, height: 22, borderRadius: 7,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: tagBg(e.tag.color),
                  }}>
                    <Icon size={13} weight="Bold" color={e.tag.color} />
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: e.tag.color }}>{e.tag.name}</span>
                </>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: INK_FAINT }}>
                  {tr("noAisleHeader")}
                </span>
              )}
              {!e.exiting && <span style={{ fontSize: 12, fontWeight: 700, color: INK_FAINT }}>· {e.items.length}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {e.items.map(item => (
                <ItemCard key={item.id} item={item} currentUserId={currentUserId} members={members} memberColors={memberColors} groupId={groupId} tags={tags} onLeaving={handleLeaving} />
              ))}
            </div>
          </RayonGroup>
        );
      })}
    </>
  );
}
