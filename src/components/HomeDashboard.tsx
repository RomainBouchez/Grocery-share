"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { setItemStatus } from "@/lib/actions/items";
import { createGroup, joinGroup, type ActionResult } from "@/lib/actions/groups";
import { useActionState } from "react";
import { GroupIcon, DEFAULT_GROUP_ICON } from "@/lib/groupIcons";
import { GroupCustomizer } from "@/components/GroupCustomizer";
import {
  btnPrimary, btnSecondary, card, cardSm, input, pastille, checkbox,
  avatarStyle, tintFor, tintForColor, AVATAR_COLORS,
  ACCENT, ACCENT_SOFT, INK_STRONG, INK, INK_MUTED, INK_FAINT, INK_DONE, FONT, DANGER,
} from "@/lib/ui";

const FF: React.CSSProperties = { fontFamily: FONT, WebkitFontSmoothing: "antialiased" };

const BTN_ACCENT: React.CSSProperties = { ...btnPrimary, flex: 1 };
const BTN_SOFT: React.CSSProperties = { ...btnSecondary, flex: "none" };

export type QuickItem = { id: string; label: string; addedByName: string };
export type MemberPreview = { initials: string; color: string };
export type GroupData = {
  id: string; name: string; color: string; icon: string | null;
  memberCount: number; topMembers: MemberPreview[];
  pendingItems: QuickItem[];
  totalItems: number; boughtItems: number;
};

export function HomeDashboard({
  userName, userColor, featured, others,
}: {
  userName: string;
  userColor: string;
  featured: GroupData | null;
  others: GroupData[];
}) {
  const tr = useTranslations();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [gName, setGName] = useState("");
  const [gColor, setGColor] = useState(AVATAR_COLORS[3]); // vert par défaut
  const [gIcon, setGIcon] = useState(DEFAULT_GROUP_ICON);
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

  const totalPending = featured ? featured.totalItems - featured.boughtItems : 0;
  const featTint = featured ? tintForColor(featured.color) : null;

  return (
    <div style={{ ...FF, minHeight: "100dvh", background: "#F5F5F5", color: INK, position: "relative", overflowX: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "0 18px 130px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 52, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em", color: INK_STRONG }}>{tr("home.greeting", { name: userName.split(" ")[0] })}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK_FAINT, marginTop: 3 }}>
              {totalPending > 0 ? tr("home.toBuyToday", { count: totalPending }) : tr("home.allDone")}
            </div>
          </div>
          <Link href="/profile" aria-label={tr("home.profileAria")} style={{
            width: 42, height: 42, borderRadius: "50%", background: userColor, color: "#fff",
            border: "2.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 16px rgba(30,26,20,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none",
            fontSize: 16, fontWeight: 900,
          }}>
            {userName[0]?.toUpperCase()}
          </Link>
        </div>

        {/* Featured group */}
        {featured && featTint ? (
          <Link href={`/groups/${featured.id}`} style={{ ...card, borderRadius: 26, padding: 18, marginBottom: 16, display: "block", textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={pastille(featTint)}>
                  <GroupIcon name={featured.icon} weight="Bold" size={16} color={featTint.text} />
                  {featured.name}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999, background: ACCENT_SOFT, color: ACCENT }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />{tr("home.active")}
                </span>
              </div>
              <div style={{ display: "flex" }}>
                {featured.topMembers.map((m, i) => (
                  <div key={i} style={{ ...avatarStyle(m.color, 27), marginLeft: i > 0 ? -9 : 0 }}>{m.initials}</div>
                ))}
                {featured.memberCount > 3 && (
                  <div style={{ ...avatarStyle("#EFEBE3", 27), color: "#928E83", marginLeft: -9 }}>+{featured.memberCount - 3}</div>
                )}
              </div>
            </div>

            {featured.pendingItems.length === 0 ? (
              <p style={{ fontSize: 14, fontWeight: 600, color: INK_FAINT, margin: "0 0 16px" }}>{tr("home.emptyListAddFirst")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {featured.pendingItems.map(item => {
                  const done = checked.has(item.id);
                  const t = tintFor(item.addedByName);
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 13 }}>
                      <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItem(item.id); }} style={checkbox(done, 25)}>
                        {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                      </span>
                      <span style={{ fontSize: 15.5, fontWeight: 600, color: done ? INK_DONE : INK, textDecoration: done ? "line-through" : "none" }}>{item.label}</span>
                      <span style={{
                        marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 800, padding: "5px 10px 5px 7px", borderRadius: 999,
                        background: t.tint, color: t.text,
                      }}>
                        <span style={{ ...avatarStyle(t.avatar, 14), border: "none", fontSize: 8 }}>{item.addedByName[0]?.toUpperCase()}</span>
                        {item.addedByName.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1.5px solid #F0ECE4" }}>
              <div style={{ marginBottom: 9 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK_FAINT }}>
                  {tr("home.itemsDone", { count: featured.totalItems, pct: Math.round((featured.boughtItems / Math.max(featured.totalItems, 1)) * 100) })}
                </span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: ACCENT_SOFT, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((featured.boughtItems / Math.max(featured.totalItems, 1)) * 100)}%`, height: "100%", borderRadius: 999, background: ACCENT, boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.1)", transition: "width .4s ease" }} />
              </div>
            </div>
          </Link>
        ) : (
          <div style={{ ...cardSm, padding: 24, marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: INK_MUTED, margin: 0 }}>{tr("home.noGroups")}</p>
          </div>
        )}

        {/* Other groups */}
        {others.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: INK_FAINT, margin: "22px 4px 12px" }}>
              {tr("home.otherGroups")}
            </div>
            {others.map(g => {
              const t = tintForColor(g.color);
              return (
                <Link key={g.id} href={`/groups/${g.id}`} style={{ textDecoration: "none", display: "block", marginBottom: 11 }}>
                  <div style={{ ...cardSm, borderRadius: 22, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 13, background: t.tint, flex: "none" }}>
                      <GroupIcon name={g.icon} weight="Bold" size={20} color={t.text} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 800, color: INK_STRONG }}>{g.name}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: INK_FAINT }}>
                        {g.pendingItems.length > 0 ? tr("units.items", { count: g.pendingItems.length }) : tr("home.emptyList")} · {tr("units.members", { count: g.memberCount })}
                      </div>
                    </div>
                    <div style={{ display: "flex" }}>
                      {g.topMembers.slice(0, 2).map((m, i) => (
                        <div key={i} style={{ ...avatarStyle(m.color, 26), marginLeft: i > 0 ? -9 : 0 }}>{m.initials}</div>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {/* CTA */}
        <div style={{ display: "flex", gap: 11, marginTop: 24 }}>
          <button onClick={() => { setShowCreate(v => !v); setShowJoin(false); }} style={BTN_ACCENT}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {tr("home.newGroup")}
          </button>
          <button onClick={() => { setShowJoin(v => !v); setShowCreate(false); }} style={BTN_SOFT}>
            {tr("home.join")}
          </button>
        </div>

        {/* Nouveau groupe form */}
        {showCreate && (
          <form action={createAction} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <input name="name" value={gName} onChange={e => setGName(e.target.value)} placeholder={tr("home.groupNamePlaceholder")} style={input} autoFocus />
            <input type="hidden" name="color" value={gColor} />
            <input type="hidden" name="icon" value={gIcon} />
            <div style={{ ...cardSm, padding: 16 }}>
              <GroupCustomizer name={gName} color={gColor} icon={gIcon} onChange={({ color, icon }) => { setGColor(color); setGIcon(icon); }} />
            </div>
            {createState?.error && <p style={{ fontSize: 13, fontWeight: 600, color: DANGER, margin: 0 }}>{createState.error}</p>}
            <button type="submit" style={{ ...BTN_ACCENT, flex: "none" }}>{tr("home.create")}</button>
          </form>
        )}

        {/* Rejoindre form */}
        {showJoin && (
          <form action={joinAction} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input name="code" placeholder={tr("home.invitePlaceholder")} autoCapitalize="characters" style={{ ...input, textTransform: "uppercase", letterSpacing: "0.08em" }} autoFocus />
            {joinState?.error && <p style={{ fontSize: 13, fontWeight: 600, color: DANGER, margin: 0 }}>{joinState.error}</p>}
            <button type="submit" style={{ ...BTN_SOFT, width: "100%" }}>{tr("home.joinWithCode")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
