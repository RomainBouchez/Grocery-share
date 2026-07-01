"use client";

import { useState, useRef, useLayoutEffect, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateGroupAppearance, toggleExpenseSharing } from "@/lib/actions/groups";
import { GroupCustomizer } from "./GroupCustomizer";
import { GroupIcon, DEFAULT_GROUP_ICON } from "@/lib/groupIcons";
import { card, pastille, tintForColor } from "@/lib/ui";

const EASE = "cubic-bezier(.4,0,.2,1)";

export function GroupAppearance({
  groupId, name, color, icon, children,
  isOwner = false, expenseSharingEnabled = false,
}: {
  groupId: string;
  name: string;
  color: string;
  icon: string | null;
  children?: React.ReactNode;
  isOwner?: boolean;
  expenseSharingEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // présent le temps de l'animation
  const [c, setC] = useState(color);
  const [i, setI] = useState(icon ?? DEFAULT_GROUP_ICON);
  const [expense, setExpense] = useState(expenseSharingEnabled); // état optimiste du toggle
  const [, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tr = useTranslations("group");
  const t = tintForColor(c);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Anime la hauteur du panneau → les éléments en dessous descendent / remontent.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "height") return;
      if (open) {
        wrap.style.height = "auto";       // laisse grandir si le contenu change
        wrap.style.overflow = "visible";  // ombre de carte non rognée au repos
      } else {
        setMounted(false);
      }
    };
    wrap.addEventListener("transitionend", onEnd);

    if (open) {
      wrap.style.overflow = "hidden";
      wrap.style.height = "auto";
      const target = wrap.scrollHeight;   // hauteur réelle (marge incluse via BFC)
      wrap.style.height = "0px";
      void wrap.offsetHeight;             // reflow → garantit la transition
      raf = requestAnimationFrame(() => { if (wrapRef.current) wrapRef.current.style.height = target + "px"; });
    } else {
      wrap.style.overflow = "hidden";
      wrap.style.height = wrap.scrollHeight + "px";
      void wrap.offsetHeight;
      raf = requestAnimationFrame(() => { if (wrapRef.current) wrapRef.current.style.height = "0px"; });
      // filet de sécurité si transitionend ne se déclenche pas (reduced-motion…)
      closeTimer.current = setTimeout(() => setMounted(false), 360);
    }

    return () => { wrap.removeEventListener("transitionend", onEnd); cancelAnimationFrame(raf); };
  }, [open, mounted]);

  function toggle() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (open) setOpen(false);
    else { setMounted(true); setOpen(true); }
  }

  function apply(next: { color: string; icon: string }) {
    setC(next.color);
    setI(next.icon);
    const fd = new FormData();
    fd.append("groupId", groupId);
    fd.append("color", next.color);
    fd.append("icon", next.icon);
    startTransition(() => updateGroupAppearance(fd));
  }

  function applyExpense(nextEnabled: boolean) {
    setExpense(nextEnabled);
    const fd = new FormData();
    fd.append("groupId", groupId);
    fd.append("enabled", String(nextEnabled));
    startTransition(() => toggleExpenseSharing(fd));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {/* Pastille = titre + icône (gros) + petit crayon → ouvre l'éditeur */}
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-label={tr("customize")}
          style={{ ...pastille(t, 20), border: "none", cursor: "pointer", fontFamily: "inherit", paddingRight: 13 }}
        >
          <GroupIcon name={i} weight="Bold" size={21} color={t.text} />
          {name}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, marginLeft: 1 }}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
        {children}
      </div>

      {mounted && (
        <div ref={wrapRef} style={{ height: 0, overflow: "hidden", transition: `height .3s ${EASE}` }}>
          <div
            style={{
              ...card, padding: 18, marginTop: 14,
              opacity: open ? 1 : 0,
              transition: "opacity .25s ease",
            }}
          >
            <GroupCustomizer
              name={name} color={c} icon={i} onChange={apply}
              isOwner={isOwner}
              expenseSharingEnabled={expense}
              onToggleExpenseSharing={applyExpense}
            />
          </div>
        </div>
      )}
    </div>
  );
}
