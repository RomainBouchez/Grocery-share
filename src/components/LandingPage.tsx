"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Star, ChecklistMinimalistic, Calendar, Widget, Cart3, Refresh, DangerTriangle } from "@/lib/icons";
import { AddItemForm } from "@/components/AddItemForm";
import { ItemCard, type ItemView, type MemberView } from "@/components/ItemCard";
import { PendingSections } from "@/components/PendingSections";
import { DEFAULT_TAGS, type TagView } from "@/lib/tags";

/* Palette « Soft Light / Pillboard » — landing (réf. SharedCart v2) */
const ACCENT = "#2FB36A";
const INK = "#1B1A16";
const INK_MUTED = "#807C72";
const INK_FAINT = "#A8A498";

/* ── Données de démo pour la présentation (composants réels, non interactifs) ─── */
const DEMO_TAGS: TagView[] = DEFAULT_TAGS.map((t, i) => ({ id: `demo-tag-${i}`, ...t }));
const tagId = (name: string) => DEMO_TAGS.find(t => t.name === name)?.id ?? null;
const tagOf = (name: string) => DEMO_TAGS.find(t => t.name === name) ?? null;

const DEMO_MEMBERS: MemberView[] = [
  { userId: "mia", name: "Mia" },
  { userId: "jordan", name: "Jordan" },
];
const DEMO_COLORS: Record<string, string> = { mia: "#F0813F", jordan: "#7E91FF" };

/** Props partagées par tous les composants réels affichés en démo. */
const demoProps = {
  currentUserId: "mia",
  members: DEMO_MEMBERS,
  memberColors: DEMO_COLORS,
  groupId: "demo",
  tags: DEMO_TAGS,
};

const both = [
  { userId: "mia", name: "Mia", parts: 1 },
  { userId: "jordan", name: "Jordan", parts: 1 },
];

/** Fabrique un ItemView de démo avec des valeurs par défaut sensées. */
function demoItem(over: Partial<ItemView> & { id: string; label: string }): ItemView {
  return {
    status: "pending",
    addedByUserId: "mia",
    addedByName: "Mia",
    tagId: null,
    quantity: 1,
    participants: [{ userId: "mia", name: "Mia", parts: 1 }],
    ...over,
  };
}

/** Enveloppe display-only : rend un vrai composant sans interaction (aucune action serveur). */
function DemoStage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none", ...style }}>
      {children}
    </div>
  );
}

export function LandingPage() {
  const t = useTranslations("landing");
  const rootRef = useRef<HTMLDivElement>(null);

  // Données de démo (composants réels, non interactifs) — libellés traduits.
  const HERO_GROUPS = [
    { tag: tagOf("Fruits & légumes"), items: [
      demoItem({ id: "h1", label: t("demo.items.bananas"), tagId: tagId("Fruits & légumes"), quantity: 2 }),
    ] },
    { tag: tagOf("Crémerie & frais"), items: [
      demoItem({ id: "h2", label: t("demo.items.oatMilk"), tagId: tagId("Crémerie & frais"), participants: both }),
    ] },
  ];

  const SYNC_ITEMS = [
    demoItem({ id: "y1", label: t("demo.items.avocados"), status: "bought", tagId: tagId("Fruits & légumes") }),
    demoItem({ id: "y2", label: t("demo.items.sourdough"), tagId: tagId("Boulangerie"), quantity: 2, addedByUserId: "jordan", addedByName: "Jordan", participants: [{ userId: "jordan", name: "Jordan", parts: 1 }] }),
  ];

  const MERGE_GROUPS = [
    { tag: tagOf("Crémerie & frais"), items: [
      demoItem({ id: "z1", label: t("demo.items.milk"), tagId: tagId("Crémerie & frais"), participants: both }),
      demoItem({ id: "z2", label: t("demo.items.eggs"), tagId: tagId("Crémerie & frais") }),
    ] },
  ];

  const SAT_LEFT = demoItem({ id: "sl", label: t("demo.items.coffeeBeans"), status: "bought", tagId: tagId("Épicerie salée") });
  const SAT_RIGHT = demoItem({ id: "sr", label: t("demo.items.cherryTomatoes"), tagId: tagId("Fruits & légumes"), participants: both });

  const SUGGESTIONS_BASE = [t("demo.suggestions.tomatoes"), t("demo.suggestions.pasta"), t("demo.suggestions.greekYogurt")];
  const SUGGESTIONS_PLUS = [...SUGGESTIONS_BASE, t("demo.suggestions.bananas")];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function ripple(btn: HTMLElement, e: MouseEvent) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;
      const r = document.createElement("span");
      const onAccent = /rgb\(47, 179, 106\)|2FB36A/i.test(btn.style.background);
      r.style.cssText = `position:absolute;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${onAccent ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.05)"};pointer-events:none;transform:scale(0);opacity:1;animation:cf-ripple .6s ease-out forwards;`;
      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.style.overflow = "hidden";
      btn.appendChild(r);
      setTimeout(() => r.remove(), 650);
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const btn = t.closest("a[href], button") as HTMLElement | null;
      if (btn && root.contains(btn)) ripple(btn, e);
    };

    const onDown = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement).closest("a[href], button") as HTMLElement | null;
      if (!btn || !root.contains(btn)) return;
      btn.style.transition = "transform .11s ease";
      btn.style.transform = "scale(0.96)";
      const up = () => {
        btn.style.transform = "";
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest("[data-soft]") as HTMLElement & { __hov?: boolean; __bs?: string } | null;
      if (!el || !root.contains(el) || el.__hov) return;
      el.__hov = true;
      el.__bs = el.style.boxShadow;
      el.style.transition = "box-shadow .2s ease, transform .15s ease";
      el.style.transform = "translateY(-2px)";
      el.style.boxShadow = "0 0 0 1px rgba(30,26,20,0.06), 0 10px 22px rgba(30,26,20,0.12)";
    };

    const onOut = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest("[data-soft]") as HTMLElement & { __hov?: boolean; __bs?: string } | null;
      if (!el || el.__hov !== true) return;
      if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
      el.__hov = false;
      el.style.transform = "";
      el.style.boxShadow = el.__bs || "";
    };

    root.addEventListener("click", onClick);
    root.addEventListener("pointerdown", onDown as EventListener);
    root.addEventListener("pointerover", onOver as EventListener);
    root.addEventListener("pointerout", onOut as EventListener);

    const reveals = Array.from(document.querySelectorAll("[data-reveal]")) as HTMLElement[];
    let raf: number | null = null;
    const update = () => {
      const trigger = window.innerHeight * 0.9;
      reveals.forEach(el => {
        if (el.getAttribute("data-shown") === "1") return;
        if (el.getBoundingClientRect().top < trigger) el.setAttribute("data-shown", "1");
      });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; update(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerdown", onDown as EventListener);
      root.removeEventListener("pointerover", onOver as EventListener);
      root.removeEventListener("pointerout", onOut as EventListener);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const cardRelief: CSSProperties = {
    background: "#FFFFFF", border: "1.5px solid #fff",
    boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 26px 56px rgba(30,26,20,0.1)",
  };
  const btnPrimaryLink: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 9,
    fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", textDecoration: "none",
    padding: "16px 30px", borderRadius: 999,
    background: ACCENT, border: "1.5px solid rgba(0,0,0,0.06)",
    boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 12px 26px rgba(47,179,106,0.32)",
    transition: "transform .15s ease",
  };
  const btnSoftLink: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "#5A574F", textDecoration: "none",
    padding: "16px 26px", borderRadius: 999,
    background: "#FFFFFF", border: "1.5px solid #fff",
    boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 14px rgba(30,26,20,0.07)",
    transition: "transform .15s ease, box-shadow .2s ease",
  };
  const btnPrimarySmall: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7,
    fontSize: 14, fontWeight: 800, color: "#fff", textDecoration: "none",
    padding: "11px 20px", borderRadius: 999,
    background: ACCENT, border: "1.5px solid rgba(0,0,0,0.06)",
    boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 8px 18px rgba(47,179,106,0.28)",
    transition: "transform .15s ease",
  };
  const pastille = (tint: string, text: string): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "7px 14px 7px 11px", borderRadius: 999,
    background: tint, color: text, fontSize: 14, fontWeight: 800,
  });
  const avatar = (bg: string): CSSProperties => ({
    width: 30, height: 30, borderRadius: "50%", background: bg, color: "#fff",
    fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px solid #FFFFFF",
  });

  const HOW_STEPS = [
    { n: "1", c: ACCENT, tint: "#E2F5EB", tagline: t("how.step1.tagline"), title: t("how.step1.title"), desc: t("how.step1.desc") },
    { n: "2", c: "#7B6EF6", tint: "#ECEAFE", tagline: t("how.step2.tagline"), title: t("how.step2.title"), desc: t("how.step2.desc") },
    { n: "3", c: "#1F95E8", tint: "#E1F1FD", tagline: t("how.step3.tagline"), title: t("how.step3.title"), desc: t("how.step3.desc") },
  ];

  return (
    <div
      ref={rootRef}
      style={{
        fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)",
        color: INK, background: "#F5F5F5", position: "relative", width: "100%", overflowX: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, width: "100%", background: "rgba(245,245,245,0.82)", backdropFilter: "saturate(140%) blur(14px)", WebkitBackdropFilter: "saturate(140%) blur(14px)" }}>
        <nav className="cf-nav" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 4px 12px rgba(30,26,20,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>SharedCart</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 800, color: "#5A574F", textDecoration: "none", padding: "10px 6px" }}>{t("nav.signIn")}</Link>
            <Link href="/login?mode=signup" data-soft style={btnPrimarySmall}>{t("nav.createAccount")}</Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="cf-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div data-reveal style={{ ...pastille("#E2F5EB", ACCENT), marginBottom: 28 }}>
          <Star weight="Bold" size={15} color={ACCENT} />
          {t("hero.badge")}
        </div>
        <h1 className="cf-hero-title" data-reveal style={{ margin: "0 auto", lineHeight: 1.0, fontWeight: 900, letterSpacing: "-0.045em", maxWidth: 880, color: INK }}>
          {t("hero.title")}
        </h1>
        <p className="cf-hero-subtitle" data-reveal style={{ margin: "26px auto 0", lineHeight: 1.55, color: INK_MUTED, maxWidth: 540, fontWeight: 500 }}>
          {t("hero.subtitle")}
        </p>

        <div className="cf-hero-btns" data-reveal style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, marginTop: 38 }}>
          <Link href="/login?mode=signup" style={btnPrimaryLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {t("hero.ctaPrimary")}
          </Link>
          <Link href="#how" data-soft style={btnSoftLink}>{t("hero.ctaSecondary")}</Link>
        </div>
        <p data-reveal style={{ margin: "18px 0 0", fontSize: 13, fontWeight: 600, color: INK_FAINT }}>
          {t("hero.freeForever")}{" "}
          <Link href="/login" style={{ color: "#5A574F", fontWeight: 800, textDecoration: "none" }}>{t("nav.signIn")}</Link>
        </p>

        {/* Éventail de cartes flottantes — composants réels (display-only) */}
        <div className="cf-cards-fan" style={{ position: "relative" }}>
          {/* Satellite gauche — vraie ItemCard (achetée) */}
          <div className="cf-card-left" style={{ position: "absolute", left: "50%", top: 104, width: 300, transform: "translateX(calc(-50% - 250px)) rotate(-6deg)", zIndex: 2 }}>
            <div style={{ animation: "cf-floatB 7s ease-in-out infinite" }}>
              <DemoStage><ItemCard item={SAT_LEFT} {...demoProps} /></DemoStage>
            </div>
          </div>

          {/* Satellite droit — vraie ItemCard (2 participants) */}
          <div className="cf-card-right" style={{ position: "absolute", left: "50%", top: 132, width: 300, transform: "translateX(calc(-50% + 250px)) rotate(6deg)", zIndex: 2 }}>
            <div style={{ animation: "cf-floatC 8s ease-in-out infinite" }}>
              <DemoStage><ItemCard item={SAT_RIGHT} {...demoProps} /></DemoStage>
            </div>
          </div>

          {/* Carte centrale — vrai écran de groupe (header + liste par rayon + ajout) */}
          <div style={{ position: "absolute", left: "50%", top: 0, width: 400, transform: "translateX(-50%)", zIndex: 3, maxWidth: "calc(100vw - 40px)" }}>
            <div style={{ animation: "cf-floatA 9s ease-in-out infinite" }}>
              <div style={{ ...cardRelief, borderRadius: 28, padding: 20, textAlign: "left", boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 40px 80px rgba(30,26,20,0.16)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={pastille("#E2F5EB", ACCENT)}>
                    <Cart3 weight="Bold" size={15} color={ACCENT} />{t("demo.groupName")}
                  </span>
                  <div style={{ display: "flex" }}>
                    <div style={avatar("#F0813F")}>MK</div>
                    <div style={{ ...avatar("#7E91FF"), marginLeft: -10 }}>JD</div>
                  </div>
                </div>
                {/* Barre de progression (comme l'écran réel) */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED }}>{t("demo.toBuy", { count: 2 })}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{t("demo.doneRatio", { done: 1, total: 3 })}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#E2F5EB", overflow: "hidden" }}>
                    <div style={{ width: "33%", height: "100%", borderRadius: 999, background: ACCENT, boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.1)" }} />
                  </div>
                </div>
                {/* Vraie liste groupée par rayon */}
                <DemoStage><PendingSections groups={HERO_GROUPS} {...demoProps} /></DemoStage>
                {/* Vraie barre d'ajout */}
                <div style={{ marginTop: 10, padding: "6px 8px", background: "rgba(252,251,249,0.92)", border: "1.5px solid #fff", borderRadius: 18, boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 8px 20px rgba(30,26,20,0.08)" }}>
                  <DemoStage><AddItemForm groupId="demo" tags={DEMO_TAGS} suggestions={SUGGESTIONS_BASE} /></DemoStage>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ position: "relative", zIndex: 1 }}>
        <div data-reveal className="cf-trust" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK_FAINT, textAlign: "center" }}>{t("trust.heading")}</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            {[t("trust.couples"), t("trust.families"), t("trust.roommates")].map(l => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", padding: "7px 14px", borderRadius: 999, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.04)", fontSize: 13, fontWeight: 800, color: "#5A574F" }}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="cf-features" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto" }}>
        <div data-reveal style={{ maxWidth: 680, margin: "0 auto 84px", textAlign: "center" }}>
          <span style={{ ...pastille("#E2F5EB", ACCENT), fontSize: 13, marginBottom: 18 }}>
            <Widget weight="Bold" size={14} color={ACCENT} />{t("features.badge")}
          </span>
          <h2 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.04em", color: INK }}>
            {t("features.heading")}
          </h2>
        </div>

        {/* Feature 1 — vrai formulaire d'ajout + vraie liste */}
        <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center" }}>
          <div>
            <span style={{ ...pastille("#ECEAFE", "#7B6EF6"), marginBottom: 22 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B6EF6" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>{t("features.instant.badge")}
            </span>
            <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>{t("features.instant.title")}</h3>
            <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: INK_MUTED, maxWidth: 420, fontWeight: 500 }}>{t("features.instant.desc")}</p>
          </div>
          <div style={{ ...cardRelief, borderRadius: 24, padding: 22 }}>
            <div style={{ marginBottom: 12 }}>
              <DemoStage><AddItemForm groupId="demo" tags={DEMO_TAGS} suggestions={SUGGESTIONS_PLUS} /></DemoStage>
            </div>
            <DemoStage><PendingSections groups={HERO_GROUPS} {...demoProps} /></DemoStage>
          </div>
        </div>

        {/* Feature 2 — vraies ItemCard (états coché / à acheter) */}
        <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center" }}>
          <div className="cf-feature-flip" style={{ ...cardRelief, borderRadius: 24, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={pastille("#E2F5EB", ACCENT)}><span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />{t("features.realtime.shopping", { name: "Mia" })}</span>
            </div>
            <DemoStage>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SYNC_ITEMS.map(it => (
                  <ItemCard key={it.id} item={it} {...demoProps} gap={10} />
                ))}
              </div>
            </DemoStage>
            <div style={{ marginTop: 16, padding: "13px 15px", background: "#E2F5EB", borderRadius: 13, fontSize: 13, color: "#1E8F55", fontWeight: 800 }}>{t("features.realtime.syncNote")}</div>
          </div>
          <div>
            <span style={{ ...pastille("#E1F1FD", "#1F95E8"), marginBottom: 22 }}>
              <Refresh weight="Linear" size={16} color="#1F95E8" />{t("features.realtime.badge")}
            </span>
            <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>{t("features.realtime.title")}</h3>
            <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: INK_MUTED, maxWidth: 420, fontWeight: 500 }}>{t("features.realtime.desc")}</p>
          </div>
        </div>

        {/* Feature 3 — vraie liste par rayon + fusion anti-doublons */}
        <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center", marginBottom: 0 }}>
          <div>
            <span style={{ ...pastille("#FDF0D6", "#D9921C"), marginBottom: 22 }}>
              <DangerTriangle weight="Bold" size={16} color="#D9921C" />{t("features.dedup.badge")}
            </span>
            <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>{t("features.dedup.title")}</h3>
            <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: INK_MUTED, maxWidth: 420, fontWeight: 500 }}>{t("features.dedup.desc")}</p>
          </div>
          <div style={{ ...cardRelief, borderRadius: 24, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 15, background: "#FDF0D6", borderRadius: 15, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "#E8A52A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)" }}>
                <DangerTriangle weight="Bold" size={18} color="#fff" />
              </div>
              <div><div style={{ fontSize: 14, fontWeight: 800, color: "#A8731A" }}>{t("features.dedup.alertTitle", { name: "Jordan", item: t("demo.items.milk") })}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#C49A45" }}>{t("features.dedup.alertSubtitle")}</div></div>
            </div>
            <DemoStage><PendingSections groups={MERGE_GROUPS} {...demoProps} /></DemoStage>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — timeline verticale connectée */}
      <section id="how" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "120px auto 0", padding: "0 40px" }}>
        <div data-reveal style={{ ...cardRelief, borderRadius: 32, boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 30px 70px rgba(30,26,20,0.1)" }}>
          <div className="cf-how-wrap">
            <div style={{ maxWidth: 580, margin: "0 auto 56px", textAlign: "center" }}>
              <span style={{ ...pastille("#ECEAFE", "#7B6EF6"), fontSize: 13, marginBottom: 18 }}>
                <ChecklistMinimalistic weight="Bold" size={14} color="#7B6EF6" />{t("how.badge")}
              </span>
              <h2 style={{ margin: 0, fontSize: "clamp(28px, 3.5vw, 42px)", lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.04em", color: INK }}>{t("how.heading")}</h2>
            </div>

            <div style={{ position: "relative", maxWidth: 620, margin: "0 auto" }}>
              {/* Trait vertical qui relie les étapes */}
              <div aria-hidden="true" style={{ position: "absolute", left: 30, top: 30, bottom: 30, width: 3, borderRadius: 3, background: "linear-gradient(180deg, #2FB36A, #7B6EF6 55%, #1F95E8)", opacity: 0.28 }} />
              {HOW_STEPS.map((s, i) => (
                <div key={s.n} style={{ display: "flex", gap: 22, position: "relative", paddingBottom: i === HOW_STEPS.length - 1 ? 0 : 34 }}>
                  {/* Pastille numérotée au-dessus du trait */}
                  <div style={{ position: "relative", zIndex: 1, flexShrink: 0, width: 62, height: 62, borderRadius: 20, background: "#fff", border: `2px solid ${s.tint}`, boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 16px rgba(30,26,20,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: s.c }}>
                    {s.n}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <span style={{ ...pastille(s.tint, s.c), fontSize: 12, padding: "5px 11px 5px 11px", marginBottom: 12 }}>{s.tagline}</span>
                    <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: INK }}>{s.title}</h3>
                    <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: INK_MUTED, fontWeight: 500, maxWidth: 440 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 48 }}>
              <Link href="/login?mode=signup" style={btnPrimaryLink}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                {t("how.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section id="get" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "130px 40px" }}>
        <div data-reveal style={{ textAlign: "center" }}>
          <h2 className="cf-cta-title" style={{ margin: "0 auto", lineHeight: 1.04, fontWeight: 900, letterSpacing: "-0.045em", maxWidth: 780, color: INK }}>
            {t("closing.title")}
          </h2>
          <p style={{ margin: "22px auto 0", fontSize: 19, lineHeight: 1.5, color: INK_MUTED, maxWidth: 480, fontWeight: 500 }}>
            {t("closing.subtitle")}
          </p>
          <div className="cf-cta-btns" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, marginTop: 36 }}>
            <Link href="/login?mode=signup" style={btnPrimaryLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              {t("closing.ctaPrimary")}
            </Link>
            <Link href="/login" data-soft style={btnSoftLink}>{t("closing.ctaSecondary")}</Link>
          </div>
          <p style={{ margin: "22px 0 0", fontSize: 14, fontWeight: 600, color: INK_FAINT }}>{t("closing.note")}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1.5px solid #E3DED4" }}>
        <div className="cf-footer-inner" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em", color: INK }}>SharedCart</span>
          </div>
          <div className="cf-footer-links" style={{ display: "flex", gap: 26 }}>
            {[[t("footer.features"), "#features"], [t("footer.how"), "#how"], [t("footer.login"), "/login"]].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontSize: 14, fontWeight: 700, color: INK_MUTED, textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK_FAINT }}>{t("footer.copyright", { year: 2026 })}</span>
        </div>
      </footer>
    </div>
  );
}
