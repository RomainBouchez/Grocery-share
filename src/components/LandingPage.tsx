"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

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
        cb.style.background = "#5BD08A";
        cb.style.borderColor = "transparent";
        cb.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M20 6L9 17l-5-5"/></svg>';
        cb.style.display = "flex";
        cb.style.alignItems = "center";
        cb.style.justifyContent = "center";
        cb.style.animation = "cf-pop .34s cubic-bezier(.34,1.56,.64,1)";
        if (label?.tagName === "SPAN") {
          label.style.transition = "color .3s ease";
          label.style.textDecoration = "line-through";
          label.style.color = "rgba(255,255,255,0.45)";
        }
      } else {
        cb.removeAttribute("data-checked");
        cb.style.background = "transparent";
        cb.style.borderColor = "rgba(255,255,255,0.22)";
        cb.innerHTML = "";
        cb.style.animation = "cf-pop .26s ease";
        if (label?.tagName === "SPAN") {
          label.style.textDecoration = "none";
          label.style.color = "rgba(255,255,255,0.9)";
        }
      }
    }

    function addItem(row: HTMLElement) {
      const name = items[itemIdx % items.length];
      itemIdx++;
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;gap:12px;animation:cf-slidein .35s ease;";
      el.innerHTML = `<span data-check style="width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.22);cursor:pointer;position:relative;transition:background .2s ease,border-color .2s ease;"></span><span style="font-size:15px;color:rgba(255,255,255,0.9);">${name}</span>`;
      row.parentElement?.insertBefore(el, row);
    }

    function ripple(btn: HTMLElement, e: MouseEvent) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;
      const r = document.createElement("span");
      r.style.cssText = `position:absolute;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.22);pointer-events:none;transform:scale(0);opacity:1;animation:cf-ripple .6s ease-out forwards;`;
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
      const el = (e.target as HTMLElement).closest("[data-glass]") as HTMLElement & { __hov?: boolean; __bs?: string } | null;
      if (!el || !root.contains(el) || el.__hov) return;
      el.__hov = true;
      el.__bs = el.style.boxShadow;
      el.style.transition = "box-shadow .25s ease";
      el.style.boxShadow = (el.__bs ? el.__bs + ", " : "") + "inset 0 0 0 999px rgba(255,255,255,0.11)";
    };

    const onOut = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest("[data-glass]") as HTMLElement & { __hov?: boolean; __bs?: string } | null;
      if (!el || el.__hov !== true) return;
      if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return;
      el.__hov = false;
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

  const glassMd: React.CSSProperties = {
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 70px rgba(0,0,0,0.55)",
  };
  const glassLg: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 40px 90px rgba(0,0,0,0.6)",
  };
  const glassSm: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  };
  const btnPrimary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 9,
    fontFamily: "inherit", fontSize: 16, fontWeight: 700,
    color: "rgba(255,255,255,0.96)", textDecoration: "none",
    padding: "16px 30px", borderRadius: 999,
    background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "inset 0 1.6px 0.8px -0.6px rgba(255,255,255,0.72), inset 0 -1.6px 0.8px -0.6px rgba(255,255,255,0.5), inset 2px 0 2px -1.5px rgba(0,0,0,0.55), inset -2px 0 2px -1.5px rgba(0,0,0,0.55), inset 0 0 24px rgba(91,208,138,0.1), 0 14px 38px rgba(0,0,0,0.5)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    transition: "transform .2s ease, box-shadow .2s ease",
  };
  const btnSecondary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: "inherit", fontSize: 16, fontWeight: 600,
    color: "rgba(255,255,255,0.7)", textDecoration: "none",
    padding: "16px 24px", borderRadius: 999,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 1.6px 0.8px -0.6px rgba(255,255,255,0.72), inset 0 -1.6px 0.8px -0.6px rgba(255,255,255,0.5), inset 2px 0 2px -1.5px rgba(0,0,0,0.55), inset -2px 0 2px -1.5px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    transition: "transform .2s ease, color .2s ease",
  };
  const iconTile: React.CSSProperties = {
    width: 46, height: 46, borderRadius: 13,
    background: "rgba(91,208,138,0.12)", border: "1px solid rgba(91,208,138,0.22)",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
  };
  const dot = (color = "#5BD08A"): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: "50%", background: color,
    boxShadow: `0 0 10px ${color}`, display: "block", flexShrink: 0,
  });

  return (
    <>
      <div
        ref={rootRef}
        style={{
          fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)",
          color: "rgba(255,255,255,0.92)",
          background: "#0D0D0F",
          position: "relative",
          width: "100%",
          overflowX: "hidden",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Ambient glows */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(900px 520px at 50% -8%, rgba(255,255,255,0.06), transparent 70%), radial-gradient(700px 600px at 85% 18%, rgba(91,208,138,0.07), transparent 65%), radial-gradient(700px 600px at 10% 30%, rgba(120,140,255,0.05), transparent 65%)" }} />

        {/* NAV */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, width: "100%", background: "rgba(13,13,15,0.55)", backdropFilter: "saturate(150%) blur(16px)", WebkitBackdropFilter: "saturate(150%) blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <nav className="cf-nav" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 18px rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <span style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>SharedCart</span>
            </div>
            <Link href="/login" data-glass style={btnSecondary}>Connexion</Link>
          </nav>
        </header>

        {/* HERO */}
        <section className="cf-hero" style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h1 className="cf-hero-title" style={{ margin: "0 auto", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.04em", maxWidth: 900, color: "rgba(255,255,255,0.97)" }}>
            One list your whole house shares.
          </h1>
          <p className="cf-hero-subtitle" style={{ margin: "24px auto 0", lineHeight: 1.5, color: "rgba(255,255,255,0.55)", maxWidth: 560 }}>
            Ajoutez vos courses depuis n&apos;importe où. Celui qui part au magasin les voit au même instant.
          </p>

          <div className="cf-hero-btns" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 40 }}>
            <Link href="/login" data-glass style={btnPrimary}>
              <span style={dot()} />
              Créer un compte — c&apos;est gratuit
            </Link>
            <Link href="#how" data-glass style={btnSecondary}>Comment ça marche</Link>
          </div>
          <p style={{ margin: "18px 0 0", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.35)", letterSpacing: "0.01em" }}>
            Gratuit · Aucune carte requise · Prêt en 30 secondes
          </p>

          {/* Floating glass card fan */}
          <div className="cf-cards-fan" style={{ position: "relative" }}>
            {/* Left card */}
            <div className="cf-card-left" style={{ position: "absolute", left: "50%", top: 60, width: 340, transform: "translateX(-128%) rotate(-7deg)", zIndex: 2 }}>
              <div style={{ animation: "cf-floatB 7s ease-in-out infinite" }}>
                <div style={{ ...glassMd, borderRadius: 24, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 13, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Search lists…</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>, label: "Today", active: false },
                      { icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5BD08A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>, label: "This week", active: true, tag: "Costco" },
                      { icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>, label: "Completed", active: false },
                    ].map(({ icon, label, active, tag }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12, ...(active ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" } : {}) }}>
                        {icon}
                        <span style={{ fontSize: 15, color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)", fontWeight: active ? 600 : 400 }}>{label}</span>
                        {tag && <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, background: "#F0813F", color: "#fff", fontSize: 11, fontWeight: 700 }}>{tag}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right card */}
            <div className="cf-card-right" style={{ position: "absolute", left: "50%", top: 60, width: 330, transform: "translateX(28%) rotate(7deg)", zIndex: 2 }}>
              <div style={{ animation: "cf-floatC 8s ease-in-out infinite" }}>
                <div style={{ ...glassMd, borderRadius: 24, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>Add a tag</div>
                  <div style={{ display: "flex", gap: 13, marginBottom: 20 }}>
                    {["#F0813F", "#F0C53F", "#5BD08A", "#C99BF0", "#7E91FF"].map((c, i) => (
                      <span key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: c, display: "block", ...(c === "#5BD08A" ? { boxShadow: "0 0 0 3px rgba(91,208,138,0.25)" } : {}) }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M3 10l2-6h14l2 6M3 10v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9" /></svg>, accent: false },
                      { icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" /></svg>, accent: false },
                      { icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5BD08A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2 12.5a1.5 1.5 0 0 0 1.5 1.2h9.1a1.5 1.5 0 0 0 1.5-1.2L21 7H5.2" /></svg>, accent: true },
                    ].map(({ icon, accent }, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 12, background: accent ? "rgba(91,208,138,0.14)" : "rgba(255,255,255,0.05)", border: `1px solid ${accent ? "rgba(91,208,138,0.3)" : "rgba(255,255,255,0.08)"}` }}>{icon}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Center card */}
            <div style={{ position: "absolute", left: "50%", top: 0, width: 392, transform: "translateX(-50%)", zIndex: 3, maxWidth: "calc(100vw - 48px)" }}>
              <div style={{ animation: "cf-floatA 9s ease-in-out infinite" }}>
                <div style={{ ...glassLg, borderRadius: 26, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 19, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Courses week-end</span>
                    <div style={{ display: "flex" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F0813F", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #15151a" }}>MK</div>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7E91FF", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #15151a", marginLeft: -9 }}>JD</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.5 }}>
                      <span style={{ width: 21, height: 21, borderRadius: 7, background: "#5BD08A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </span>
                      <span style={{ fontSize: 15, textDecoration: "line-through", color: "rgba(255,255,255,0.45)" }}>Avocats</span>
                    </div>
                    {[
                      { name: "Pain au levain", tag: { label: "Mia", bg: "rgba(240,129,63,0.18)", color: "#F0A06F" } },
                      { name: "Lait d'avoine", tag: { label: "Jordan", bg: "rgba(126,145,255,0.2)", color: "#A6B2FF" } },
                      { name: "Café en grains", tag: null },
                    ].map(({ name, tag }) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ width: 21, height: 21, borderRadius: 7, border: "1.5px solid rgba(255,255,255,0.22)", cursor: "pointer", flexShrink: 0 }} data-check />
                        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.9)" }}>{name}</span>
                        {tag && <span style={{ marginLeft: "auto", display: "inline-flex", padding: "3px 9px", borderRadius: 999, background: tag.bg, color: tag.color, fontSize: 11, fontWeight: 700 }}>{tag.label}</span>}
                      </div>
                    ))}
                    <div data-additem style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, padding: "12px 14px", border: "1.5px dashed rgba(255,255,255,0.16)", borderRadius: 13, cursor: "pointer" }}>
                      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Ajouter…</span>
                      <span style={{ marginLeft: "auto", width: 26, height: 26, borderRadius: 8, background: "#5BD08A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(91,208,138,0.4)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5BD08A", display: "block" }} />
                    1 sur 4 · synchro en direct
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div data-reveal className="cf-trust" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Pour ceux avec qui vous vivez</span>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "block", margin: "0 8px" }} />
            {["Couples", "Familles", "Colocataires", "Gratuit, toujours"].map(l => (
              <span key={l} style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{l}</span>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="cf-features" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
          <div data-reveal style={{ maxWidth: 660, margin: "0 auto 90px", textAlign: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5BD08A" }}>POURQUOI SHAREDCART</span>
            <h2 style={{ margin: "16px 0 0", fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em", color: "rgba(255,255,255,0.96)" }}>
              Une liste de courses qui suit enfin le rythme de votre foyer.
            </h2>
          </div>

          {/* Feature 1 */}
          <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center" }}>
            <div>
              <div style={iconTile}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5BD08A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg></div>
              <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 800, letterSpacing: "-0.025em", color: "rgba(255,255,255,0.96)" }}>Ajoutez depuis n&apos;importe où</h3>
              <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", maxWidth: 420 }}>Tapez, dictez ou collez une recette. Les articles arrivent instantanément — sans &ldquo;qui a le carnet ?&rdquo;</p>
            </div>
            <div style={{ ...glassMd, borderRadius: 22, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Courses du week-end</span>
                <div style={{ display: "flex" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#F0813F", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #15151a" }}>MK</div>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#7E91FF", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #15151a", marginLeft: -8 }}>JD</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[["Avocats", "Mia"], ["Pain au levain", "Jordan"], ["Lait d'avoine", "Mia"]].map(([item, who]) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0 }} data-check />
                    <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)" }}>{item}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{who}</span>
                  </div>
                ))}
                <div data-additem style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "11px 13px", border: "1.5px dashed rgba(255,255,255,0.16)", borderRadius: 11, cursor: "pointer" }}>
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Ajouter…</span>
                  <span style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 7, background: "#5BD08A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center" }}>
            <div className="cf-feature-flip" style={{ ...glassMd, borderRadius: 22, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Courses du week-end</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5BD08A", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5BD08A", boxShadow: "0 0 8px #5BD08A", display: "block" }} />
                  Mia fait ses courses
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["Avocats", "Lait d'avoine"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.5 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: "#5BD08A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    <span style={{ fontSize: 15, textDecoration: "line-through", color: "rgba(255,255,255,0.4)" }}>{item}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0 }} data-check />
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)" }}>Pain au levain</span>
                </div>
              </div>
              <div style={{ marginTop: 18, padding: 13, background: "rgba(91,208,138,0.1)", border: "1px solid rgba(91,208,138,0.18)", borderRadius: 12, fontSize: 13, color: "#9FE3BD", fontWeight: 600 }}>
                2 sur 3 faits · synchro en direct
              </div>
            </div>
            <div>
              <div style={iconTile}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5BD08A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15" /></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 800, letterSpacing: "-0.025em", color: "rgba(255,255,255,0.96)" }}>Synchronisé en temps réel</h3>
              <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", maxWidth: 420 }}>Cochez un article et il disparaît de la liste de tout le monde. Pas de rechargement, pas de doublons.</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div data-reveal className="cf-feature-grid" style={{ display: "grid", alignItems: "center", marginBottom: 0 }}>
            <div>
              <div style={iconTile}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5BD08A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 800, letterSpacing: "-0.025em", color: "rgba(255,255,255,0.96)" }}>Fini les doublons</h3>
              <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", maxWidth: 420 }}>SharedCart détecte quand deux personnes ajoutent la même chose et fusionne silencieusement. Un seul lait. Toujours.</p>
            </div>
            <div style={{ ...glassMd, borderRadius: 22, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 15, background: "rgba(240,197,63,0.1)", border: "1px solid rgba(240,197,63,0.22)", borderRadius: 14, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#E7A33E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F0D08A" }}>Jordan a aussi ajouté &ldquo;Lait&rdquo;</div>
                  <div style={{ fontSize: 13, color: "rgba(240,208,138,0.7)" }}>Fusionné en un seul article</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["Lait", "Œufs", "Café en grains"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer", flexShrink: 0 }} data-check />
                    <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)" }}>{item}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>×1</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "120px auto 0", padding: "0 40px" }}>
          <div data-reveal style={{ ...glassSm, borderRadius: 28 }}>
            <div className="cf-how-wrap">
              <div style={{ maxWidth: 560, margin: "0 auto 64px", textAlign: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5BD08A" }}>Comment ça marche</span>
                <h2 style={{ margin: "16px 0 0", fontSize: "clamp(28px, 3.5vw, 44px)", lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em", color: "rgba(255,255,255,0.96)" }}>Opérationnel en une minute.</h2>
              </div>
              <div className="cf-how-grid" style={{ display: "grid", gap: 24 }}>
                {[
                  { n: "01", title: "Créez une liste", desc: "Créez la liste de votre foyer en quelques secondes. Aucune complication de compte." },
                  { n: "02", title: "Invitez vos proches", desc: "Partagez un lien. Partenaire, enfants, colocataires — tout le monde sur la même liste." },
                  { n: "03", title: "Faites vos courses en sync", desc: "Ajoutez, cochez et regardez la mise à jour partout — instantanément." },
                ].map(({ n, title, desc }) => (
                  <div key={n} style={{ padding: 28, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#5BD08A", marginBottom: 18 }}>{n}</div>
                    <h3 style={{ margin: "0 0 10px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>{title}</h3>
                    <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "rgba(255,255,255,0.5)" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section id="get" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "140px 40px" }}>
          <div data-reveal style={{ textAlign: "center" }}>
            <h2 className="cf-cta-title" style={{ margin: "0 auto", lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.04em", maxWidth: 780, color: "rgba(255,255,255,0.97)" }}>
              Arrêtez de vous envoyer des listes de courses par SMS.
            </h2>
            <p style={{ margin: "22px auto 0", fontSize: 19, lineHeight: 1.5, color: "rgba(255,255,255,0.5)", maxWidth: 480 }}>
              Créez votre compte SharedCart gratuitement et gardez tout votre foyer sur la même page — et la même liste.
            </p>
            <div className="cf-cta-btns" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 40 }}>
              <Link href="/login" data-glass style={btnPrimary}>
                <span style={dot()} />
                Commencer gratuitement
              </Link>
              <Link href="/login" data-glass style={btnSecondary}>Se connecter</Link>
            </div>
            <p style={{ margin: "22px 0 0", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Gratuit · Sans pub · Aucune carte requise</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="cf-footer-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.9)" }}>SharedCart</span>
            </div>
            <div className="cf-footer-links" style={{ display: "flex", gap: 28 }}>
              {[["Fonctionnalités", "#features"], ["Comment ça marche", "#how"], ["Connexion", "/login"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{label}</Link>
              ))}
            </div>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>© 2026 SharedCart</span>
          </div>
        </footer>
      </div>
    </>
  );
}
