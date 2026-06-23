"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setItemStatus } from "@/lib/actions/items";
import { createGroup, joinGroup, type ActionResult } from "@/lib/actions/groups";
import { useActionState } from "react";

const COLORS = ["#F0813F", "#7E91FF", "#C99BF0", "#5BD08A", "#F0C53F"];
function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

const FF: React.CSSProperties = {
  fontFamily: "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)",
  WebkitFontSmoothing: "antialiased",
};
const GLASS_LG: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 24,
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 56px rgba(0,0,0,0.45)",
};
const GLASS_SM: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
};
const BTN_ACCENT: React.CSSProperties = {
  flex: 1, padding: "15px", border: "none", borderRadius: 14, cursor: "pointer",
  background: "#5BD08A", color: "#0D0D0F",
  fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  boxShadow: "inset 0 1.4px 0.6px rgba(255,255,255,0.4), 0 8px 20px rgba(91,208,138,0.26)",
};
const BTN_GLASS: React.CSSProperties = {
  flex: "none", padding: "15px 18px", borderRadius: 14, cursor: "pointer",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
  color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  boxShadow: "inset 0 1.6px 0.8px -0.6px rgba(255,255,255,0.6), inset 0 -1.6px 0.8px -0.6px rgba(255,255,255,0.4)",
  backdropFilter: "blur(14px)",
};
const DARK_INPUT: React.CSSProperties = {
  width: "100%", padding: "13px 14px", borderRadius: 12,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.92)", fontSize: 15, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

export type QuickItem = { id: string; label: string; addedByName: string };
export type MemberPreview = { initials: string; color: string };
export type GroupData = {
  id: string; name: string; color: string;
  memberCount: number; topMembers: MemberPreview[];
  pendingItems: QuickItem[];
  totalItems: number; boughtItems: number;
};

export function HomeDashboard({
  userName, featured, others,
}: {
  userName: string;
  featured: GroupData | null;
  others: GroupData[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createState, createAction] = useActionState<ActionResult, FormData>(createGroup, undefined);
  const [joinState, joinAction] = useActionState<ActionResult, FormData>(joinGroup, undefined);

  function toggleItem(itemId: string) {
    const nowChecked = !checked.has(itemId);
    setChecked(prev => {
      const next = new Set(prev);
      if (nowChecked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
    const fd = new FormData();
    fd.append("itemId", itemId);
    fd.append("status", nowChecked ? "bought" : "pending");
    startTransition(() => setItemStatus(fd));
  }

  const totalPending = featured
    ? featured.totalItems - featured.boughtItems
    : 0;

  return (
    <div style={{ ...FF, minHeight: "100dvh", background: "#0D0D0F", color: "rgba(255,255,255,0.92)", position: "relative", overflowX: "hidden" }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(420px 280px at 22% 0%, rgba(91,208,138,0.09), transparent 60%), radial-gradient(420px 360px at 100% 28%, rgba(120,140,255,0.06), transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "0 18px 130px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 56, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.03em" }}>Bonjour {userName.split(" ")[0]}.</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
              {totalPending > 0 ? `${totalPending} article${totalPending > 1 ? "s" : ""} à acheter aujourd'hui` : "Tout est à jour 🎉"}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#5BD08A", color: "#0D0D0F", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {userName[0]?.toUpperCase()}
          </div>
        </div>

        {/* Featured group */}
        {featured ? (
          <div style={{ ...GLASS_LG, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: featured.color, display: "block" }} />
                <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>{featured.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(91,208,138,0.14)", color: "#9FE3BD" }}>actif</span>
              </div>
              <div style={{ display: "flex" }}>
                {featured.topMembers.map((m, i) => (
                  <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: m.color, color: m.color === "#5BD08A" ? "#0D0D0F" : "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #16161b", marginLeft: i > 0 ? -8 : 0 }}>
                    {m.initials}
                  </div>
                ))}
                {featured.memberCount > 3 && (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #16161b", marginLeft: -8 }}>
                    +{featured.memberCount - 3}
                  </div>
                )}
              </div>
            </div>

            {featured.pendingItems.length === 0 ? (
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" }}>Liste vide — ajoutez le premier article</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {featured.pendingItems.map(item => {
                  const done = checked.has(item.id);
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, opacity: done ? 0.5 : 1, transition: "opacity .2s" }}>
                      <span
                        onClick={() => toggleItem(item.id)}
                        style={{
                          width: 23, height: 23, borderRadius: 7, flexShrink: 0, cursor: "pointer",
                          background: done ? "#5BD08A" : "transparent",
                          border: done ? "none" : "1.5px solid rgba(255,255,255,0.22)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "background .2s, border-color .2s",
                        }}
                      >
                        {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                      </span>
                      <span style={{ fontSize: 15, color: done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)", textDecoration: done ? "line-through" : "none" }}>{item.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{item.addedByName}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {featured.totalItems} article{featured.totalItems !== 1 ? "s" : ""} · {Math.round((featured.boughtItems / Math.max(featured.totalItems, 1)) * 100)}% fait
              </span>
              <Link href={`/groups/${featured.id}`} style={{ fontSize: 13, fontWeight: 700, color: "#5BD08A", textDecoration: "none" }}>
                Ouvrir la liste →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ ...GLASS_SM, padding: 24, marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>Aucun groupe — crée-en un ou rejoins celui d&apos;un ami.</p>
          </div>
        )}

        {/* Other groups */}
        {others.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "22px 4px 12px" }}>
              Tes autres groupes
            </div>
            {others.map(g => (
              <Link key={g.id} href={`/groups/${g.id}`} style={{ textDecoration: "none" }}>
                <div style={{ ...GLASS_SM, padding: 18, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: g.color, display: "block" }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>{g.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                    {g.pendingItems.length > 0 ? `${g.pendingItems.length} article${g.pendingItems.length > 1 ? "s" : ""}` : "Liste vide"}
                  </span>
                </div>
              </Link>
            ))}
          </>
        )}

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={() => { setShowCreate(v => !v); setShowJoin(false); }} style={BTN_ACCENT}>
            Nouveau groupe
          </button>
          <button onClick={() => { setShowJoin(v => !v); setShowCreate(false); }} style={BTN_GLASS}>
            Rejoindre
          </button>
        </div>

        {/* Nouveau groupe form */}
        {showCreate && (
          <form action={createAction} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input name="name" placeholder="Nom du groupe (Coloc, Famille…)" style={DARK_INPUT} autoFocus />
            {createState?.error && <p style={{ fontSize: 13, color: "#FCA5A5", margin: 0 }}>{createState.error}</p>}
            <button type="submit" style={{ ...BTN_ACCENT, flex: "none", borderRadius: 12 }}>Créer</button>
          </form>
        )}

        {/* Rejoindre form */}
        {showJoin && (
          <form action={joinAction} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input name="code" placeholder="Code d'invitation (ex: K7P2QX)" autoCapitalize="characters" style={{ ...DARK_INPUT, textTransform: "uppercase", letterSpacing: "0.08em" }} autoFocus />
            {joinState?.error && <p style={{ fontSize: 13, color: "#FCA5A5", margin: 0 }}>{joinState.error}</p>}
            <button type="submit" style={BTN_GLASS}>Rejoindre avec ce code</button>
          </form>
        )}
      </div>
    </div>
  );
}
