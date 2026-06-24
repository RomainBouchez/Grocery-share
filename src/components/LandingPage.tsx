"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Star, ChecklistMinimalistic, Calendar, Widget, Bag3, Heart, Cart3, Refresh, DangerTriangle } from "@/lib/icons";

/* Palette « Soft Light / Pillboard » — landing (réf. SharedCart v2) */
const ACCENT = "#2FB36A";
const INK = "#1B1A16";
const INK_MUTED = "#807C72";
const INK_FAINT = "#A8A498";

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = ["Tomates", "Pâtes", "Yaourt grec", "Bananes", "Huile d'olive", "Épinards"];
    let itemIdx = 0;

    function toggleCheck(cb: HTMLElement) {
      const label = cb.nextElementSibling as HTMLElement | null;
      const on = cb.getAttribute("data-checked") === "1";
      if (!on) {
        cb.setAttribute("data-checked", "1");
        cb.style.background = ACCENT;
        cb.style.borderColor = "transparent";
        cb.style.boxShadow = "inset 0 -1.5px 0 rgba(0,0,0,0.12)";
        cb.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M20 6L9 17l-5-5"/></svg>';
        cb.style.display = "flex";
        cb.style.alignItems = "center";
        cb.style.justifyContent = "center";
        cb.style.animation = "cf-pop .34s cubic-bezier(.34,1.56,.64,1)";
        if (label?.tagName === "SPAN") {
          label.style.transition = "color .3s ease";
          label.style.textDecoration = "line-through";
          label.style.color = "#B6B2A8";
        }
      } else {
        cb.removeAttribute("data-checked");
        cb.style.background = "#fff";
        cb.style.borderColor = "rgba(28,25,20,0.14)";
        cb.style.boxShadow = "none";
        cb.innerHTML = "";
        cb.style.animation = "cf-pop .26s ease";
        if (label?.tagName === "SPAN") {
          label.style.textDecoration = "none";
          label.style.color = "#2B2A25";
        }
      }
    }

    function addItem(row: HTMLElement) {
      const name = items[itemIdx % items.length];
      itemIdx++;
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;gap:13px;animation:cf-slidein .35s ease;";
      el.innerHTML = `<span data-check style="width:23px;height:23px;border-radius:8px;background:#fff;border:2px solid rgba(28,25,20,0.14);cursor:pointer;flex:none;transition:background .2s ease,border-color .2s ease;"></span><span style="font-size:15.5px;font-weight:600;color:#2B2A25;">${name}</span>`;
      row.parentElement?.insertBefore(el, row);
    }

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
      const cb = t.closest("[data-check]") as HTMLElement | null;
      if (cb && root.contains(cb)) { toggleCheck(cb); return; }
      const add = t.closest("[data-additem]") as HTMLElement | null;
      if (add && root.contains(add)) { addItem(add); return; }
      const btn = t.closest("a[href], button") as HTMLElement | null;
      if (btn && root.contains(btn)) ripple(btn, e);
    };

    const onDown = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement).closest("a[href], button, [data-additem]") as HTMLElement | null;
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

  const cardRelief: React.CSSProperties = {
    background: "#FFFFFF", border: "1.5px solid #fff",
    boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 26px 56px rgba(30,26,20,0.1)",
  };
  const btnPrimaryLink: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 9,
    fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", textDecoration: "none",
    padding: "16px 30px", borderRadius: 999,
    background: ACCENT, border: "1.5px solid rgba(0,0,0,0.06)",
    boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 12px 26px rgba(47,179,106,0.32)",
    transition: "transform .15s ease",
  };
  const btnSoftLink: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "#5A574F", textDecoration: "none",
    padding: "16px 26px", borderRadius: 999,
    background: "#FFFFFF", border: "1.5px solid #fff",
    boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 14px rgba(30,26,20,0.07)",
    transition: "transform .15s ease, box-shadow .2s ease",
  };
  const pastille = (tint: string, text: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "7px 14px 7px 11px", borderRadius: 999,
    background: tint, color: text, fontSize: 14, fontWeight: 800,
  });
  const checkbox: React.CSSProperties = {
    width: 23, height: 23, borderRadius: 8, flex: "none", cursor: "pointer",
    background: "#fff", border: "2px solid rgba(28,25,20,0.14)",
  };
  const avatar = (bg: string): React.CSSProperties => ({
    width: 27, height: 27, borderRadius: "50%", background: bg, color: "#fff",
    fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px solid #FFFFFF",
  });

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
          <Link href="/login" data-soft style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#2B2A25", textDecoration: "none", padding: "11px 22px", borderRadius: 999, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 14px rgba(30,26,20,0.07)", transition: "transform .15s ease, box-shadow .2s ease" }}>Ouvrir l&apos;app</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="cf-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div data-reveal style={{ ...pastille("#E2F5EB", ACCENT), marginBottom: 28 }}>
          <Star weight="Bold" size={15} color={ACCENT} />
          Gratuit pour toute la maison
        </div>
        <h1 className="cf-hero-title" data-reveal style={{ margin: "0 auto", lineHeight: 1.0, fontWeight: 900, letterSpacing: "-0.045em", maxWidth: 880, color: INK }}>
          Une seule liste que toute la maison partage.
        </h1>
        <p className="cf-hero-subtitle" data-reveal style={{ margin: "26px auto 0", lineHeight: 1.55, color: INK_MUTED, maxWidth: 540, fontWeight: 500 }}>
          Ajoute tes courses d&apos;où tu veux. Celui qui part au magasin les voit à la seconde où tu les notes.
        </p>

        <div className="cf-hero-btns" data-reveal style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, marginTop: 38 }}>
          <Link href="/login" style={btnPrimaryLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Commencer — c&apos;est gratuit
          </Link>
          <Link href="#how" data-soft style={btnSoftLink}>Voir comment ça marche</Link>
        </div>
        <p data-reveal style={{ margin: "18px 0 0", fontSize: 13, fontWeight: 600, color: INK_FAINT }}>
          Gratuit pour toujours · sur ton navigateur préféré
        </p>

        {/* Floating card fan */}
        <div className="cf-cards-fan" style={{ position: "relative" }}>
          {/* Left card */}
          <div className="cf-card-left" style={{ position: "absolute", left: "50%", top: 56, width: 330, transform: "translateX(calc(-50% - 230px)) rotate(-6deg)", zIndex: 2 }}>
            <div style={{ animation: "cf-floatB 7s ease-in-out infinite" }}>
              <div style={{ ...cardRelief, borderRadius: 26, padding: 20 }}>
                <span style={{ ...pastille("#ECEAFE", "#7B6EF6"), marginBottom: 16 }}>
                  <ChecklistMinimalistic weight="Bold" size={14} color="#7B6EF6" />Mes listes
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 13 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="#C8C4B8"><circle cx="12" cy="12" r="4" /></svg><span style={{ fontSize: 15, fontWeight: 600, color: INK_MUTED }}>Aujourd&apos;hui</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 13, background: "#fff", border: "1.5px solid #F0ECE4", boxShadow: "0 2px 6px rgba(30,26,20,0.05)" }}><Calendar weight="Bold" size={18} color={ACCENT} /><span style={{ fontSize: 15, fontWeight: 800, color: INK }}>Cette semaine</span><span style={{ marginLeft: "auto", display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: "#F0813F", color: "#fff", fontSize: 11, fontWeight: 800 }}>Costco</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 13 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8C4B8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg><span style={{ fontSize: 15, fontWeight: 600, color: INK_MUTED }}>Terminé</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right card */}
          <div className="cf-card-right" style={{ position: "absolute", left: "50%", top: 56, width: 320, transform: "translateX(calc(-50% + 230px)) rotate(6deg)", zIndex: 2 }}>
            <div style={{ animation: "cf-floatC 8s ease-in-out infinite" }}>
              <div style={{ ...cardRelief, borderRadius: 26, padding: 20 }}>
                <span style={{ ...pastille("#FDE7E3", "#E8503A"), marginBottom: 18 }}>
                  <Widget weight="Bold" size={14} color="#E8503A" />Ajouter un tag
                </span>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  {["#F0813F", "#F0C53F", ACCENT, "#C99BF0", "#7E91FF"].map((c, i) => (
                    <span key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, boxShadow: c === ACCENT ? "inset 0 -2px 0 rgba(0,0,0,0.1), 0 0 0 3px rgba(47,179,106,0.22)" : "inset 0 -2px 0 rgba(0,0,0,0.1)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  {[
                    { bg: "#F4F0E9", c: "#807C72", Icon: Bag3 },
                    { bg: "#F4F0E9", c: "#807C72", Icon: Heart },
                    { bg: "#E2F5EB", c: ACCENT, Icon: Cart3 },
                    { bg: "#F4F0E9", c: "#807C72", Icon: Star },
                  ].map(({ bg, c, Icon }, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 13, background: bg, border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.04)" }}><Icon weight="Bold" size={20} color={c} /></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center card */}
          <div style={{ position: "absolute", left: "50%", top: 0, width: 384, transform: "translateX(-50%)", zIndex: 3, maxWidth: "calc(100vw - 48px)" }}>
            <div style={{ animation: "cf-floatA 9s ease-in-out infinite" }}>
              <div style={{ ...cardRelief, borderRadius: 28, padding: 24, boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 40px 80px rgba(30,26,20,0.16)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={pastille("#E2F5EB", ACCENT)}>
                    <Cart3 weight="Bold" size={16} color={ACCENT} />Courses du week-end
                  </span>
                  <div style={{ display: "flex" }}>
                    <div style={{ ...avatar("#F0813F"), width: 30, height: 30, fontSize: 11 }}>MK</div>
                    <div style={{ ...avatar("#7E91FF"), width: 30, height: 30, fontSize: 11, marginLeft: -10 }}>JD</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}><span style={{ width: 23, height: 23, borderRadius: 8, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.12)" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span><span style={{ fontSize: 15.5, fontWeight: 600, textDecoration: "line-through", color: "#B6B2A8" }}>Avocats</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}><span data-check style={checkbox} /><span style={{ fontSize: 15.5, fontWeight: 600, color: "#2B2A25" }}>Pain au levain</span><span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px 5px 7px", borderRadius: 999, background: "#FCEBD8", color: "#D9852A", fontSize: 11, fontWeight: 800 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: "#F0813F", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>M</span>Mia</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}><span data-check style={checkbox} /><span style={{ fontSize: 15.5, fontWeight: 600, color: "#2B2A25" }}>Lait d&apos;avoine</span><span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px 5px 7px", borderRadius: 999, background: "#E5E9FE", color: "#5E6FE0", fontSize: 11, fontWeight: 800 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: "#7E91FF", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>J</span>Jordan</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}><span data-check style={checkbox} /><span style={{ fontSize: 15.5, fontWeight: 600, color: "#2B2A25" }}>Café en grains</span></div>
                  <div data-additem style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "13px 14px", border: "2px dashed rgba(28,25,20,0.12)", borderRadius: 14, cursor: "pointer" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: INK_FAINT }}>Ajouter un article…</span>
                    <span style={{ marginLeft: "auto", width: 27, height: 27, borderRadius: 9, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.12)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, fontSize: 12.5, fontWeight: 700, color: "#9C988D" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT }} />1 sur 4 fait · synchro en direct sur chaque téléphone
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ position: "relative", zIndex: 1 }}>
        <div data-reveal className="cf-trust" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK_FAINT, textAlign: "center" }}>Pensé pour les gens avec qui tu vis</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            {["Couples", "Familles", "Colocs"].map(l => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", padding: "7px 14px", borderRadius: 999, background: "#FFFFFF", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.04)", fontSize: 13, fontWeight: 800, color: "#5A574F" }}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="cf-features" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto" }}>
        <div data-reveal style={{ maxWidth: 680, margin: "0 auto 84px", textAlign: "center" }}>
          <span style={{ ...pastille("#E2F5EB", ACCENT), fontSize: 13, marginBottom: 18 }}>
            <Widget weight="Bold" size={14} color={ACCENT} />Pourquoi SharedCart
          </span>
          <h2 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.04em", color: INK }}>
            Une liste de courses qui suit enfin le rythme de la maison.
          </h2>
        </div>

        {/* Feature 1 */}
        <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center" }}>
          <div>
            <span style={{ ...pastille("#ECEAFE", "#7B6EF6"), marginBottom: 22 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B6EF6" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Ajout instantané
            </span>
            <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>Ajoute de n&apos;importe où</h3>
            <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: INK_MUTED, maxWidth: 420, fontWeight: 500 }}>Tape-le, dicte-le, ou colle une recette. L&apos;article arrive sur la liste partagée en un instant — sans réglages, sans « qui a le carnet ».</p>
          </div>
          <div style={{ ...cardRelief, borderRadius: 24, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={pastille("#E1F1FD", "#1F95E8")}><Calendar weight="Bold" size={15} color="#1F95E8" />Courses du week-end</span>
              <div style={{ display: "flex" }}><div style={avatar("#F0813F")}>MK</div><div style={{ ...avatar("#7E91FF"), marginLeft: -9 }}>JD</div></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Avocats", "Mia"], ["Pain au levain", "Jordan"], ["Lait d'avoine", "Mia"]].map(([item, who]) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span data-check style={{ ...checkbox, width: 22, height: 22 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#2B2A25" }}>{item}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: INK_FAINT }}>{who}</span>
                </div>
              ))}
              <div data-additem style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "12px 13px", border: "2px dashed rgba(28,25,20,0.12)", borderRadius: 13, cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: INK_FAINT }}>Ajouter un article…</span>
                <span style={{ marginLeft: "auto", width: 25, height: 25, borderRadius: 8, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.12)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center" }}>
          <div className="cf-feature-flip" style={{ ...cardRelief, borderRadius: 24, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={pastille("#E2F5EB", ACCENT)}><span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />Mia fait les courses</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Avocats", "Lait d'avoine"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 8, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.12)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, textDecoration: "line-through", color: "#B6B2A8" }}>{item}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span data-check style={{ ...checkbox, width: 22, height: 22 }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: "#2B2A25" }}>Pain au levain</span>
              </div>
            </div>
            <div style={{ marginTop: 18, padding: "13px 15px", background: "#E2F5EB", borderRadius: 13, fontSize: 13, color: "#1E8F55", fontWeight: 800 }}>2 sur 3 fait · mis à jour en direct sur chaque téléphone</div>
          </div>
          <div>
            <span style={{ ...pastille("#E1F1FD", "#1F95E8"), marginBottom: 22 }}>
              <Refresh weight="Linear" size={16} color="#1F95E8" />Temps réel
            </span>
            <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>Synchronisé en direct</h3>
            <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: INK_MUTED, maxWidth: 420, fontWeight: 500 }}>Coche un article et il disparaît de la liste de tout le monde d&apos;un coup. Pas de rafraîchissement, pas de doublons, pas de quiproquo à la caisse.</p>
          </div>
        </div>

        {/* Feature 3 */}
        <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center", marginBottom: 0 }}>
          <div>
            <span style={{ ...pastille("#FDF0D6", "#D9921C"), marginBottom: 22 }}>
              <DangerTriangle weight="Bold" size={16} color="#D9921C" />Anti-doublons
            </span>
            <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>Fini les doubles</h3>
            <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: INK_MUTED, maxWidth: 420, fontWeight: 500 }}>SharedCart repère quand deux personnes ajoutent la même chose — ou un truc que tu as déjà à la maison — et le fusionne discrètement. Un seul lait. Toujours.</p>
          </div>
          <div style={{ ...cardRelief, borderRadius: 24, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 15, background: "#FDF0D6", borderRadius: 15, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "#E8A52A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)" }}>
                <DangerTriangle weight="Bold" size={18} color="#fff" />
              </div>
              <div><div style={{ fontSize: 14, fontWeight: 800, color: "#A8731A" }}>Jordan a aussi ajouté « Lait »</div><div style={{ fontSize: 13, fontWeight: 600, color: "#C49A45" }}>Fusionné en un seul article</div></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Lait", "Œufs", "Café en grains"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span data-check style={{ ...checkbox, width: 22, height: 22 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#2B2A25" }}>{item}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: INK_FAINT }}>×1</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "120px auto 0", padding: "0 40px" }}>
        <div data-reveal style={{ ...cardRelief, borderRadius: 32, boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 30px 70px rgba(30,26,20,0.1)" }}>
          <div className="cf-how-wrap">
            <div style={{ maxWidth: 580, margin: "0 auto 56px", textAlign: "center" }}>
              <span style={{ ...pastille("#ECEAFE", "#7B6EF6"), fontSize: 13, marginBottom: 18 }}>
                <ChecklistMinimalistic weight="Bold" size={14} color="#7B6EF6" />Comment ça marche
              </span>
              <h2 style={{ margin: 0, fontSize: "clamp(28px, 3.5vw, 42px)", lineHeight: 1.08, fontWeight: 900, letterSpacing: "-0.04em", color: INK }}>Opérationnel en une minute.</h2>
            </div>
            <div className="cf-how-grid" style={{ display: "grid", gap: 20 }}>
              {[
                { n: "1", c: ACCENT, title: "Crée une liste", desc: "La liste de ta maison en quelques secondes. Aucun compte à jongler." },
                { n: "2", c: "#7B6EF6", title: "Invite tes proches", desc: "Partage un lien. Partenaire, enfants, colocs — tout le monde sur la même liste." },
                { n: "3", c: "#1F95E8", title: "Faites les courses", desc: "Ajoute, coche, et regarde tout se mettre à jour partout — à l'instant." },
              ].map(({ n, c, title, desc }) => (
                <div key={n} style={{ padding: 28, borderRadius: 20, background: "#F4F0E9", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.04)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: "#fff", boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 4px 10px rgba(30,26,20,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: c, marginBottom: 18 }}>{n}</div>
                  <h3 style={{ margin: "0 0 10px", fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", color: INK }}>{title}</h3>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: INK_MUTED, fontWeight: 500 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section id="get" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "130px 40px" }}>
        <div data-reveal style={{ textAlign: "center" }}>
          <h2 className="cf-cta-title" style={{ margin: "0 auto", lineHeight: 1.04, fontWeight: 900, letterSpacing: "-0.045em", maxWidth: 780, color: INK }}>
            Arrête de vous envoyer des listes par SMS.
          </h2>
          <p style={{ margin: "22px auto 0", fontSize: 19, lineHeight: 1.5, color: INK_MUTED, maxWidth: 480, fontWeight: 500 }}>
            SharedCart gratuit, et toute la maison reste sur la même page — et la même liste.
          </p>
          <div className="cf-cta-btns" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 13, marginTop: 36 }}>
            <Link href="/login" style={btnPrimaryLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Commencer gratuitement
            </Link>
            <Link href="/login" data-soft style={btnSoftLink}>Se connecter</Link>
          </div>
          <p style={{ margin: "22px 0 0", fontSize: 14, fontWeight: 600, color: INK_FAINT }}>Gratuit pour toujours · Sans pub · Sans carte</p>
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
            {[["Fonctions", "#features"], ["Comment ça marche", "#how"], ["Connexion", "/login"]].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontSize: 14, fontWeight: 700, color: INK_MUTED, textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK_FAINT }}>© 2026 SharedCart</span>
        </div>
      </footer>
    </div>
  );
}
