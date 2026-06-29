"use client";

import { useState, useRef, useLayoutEffect, useEffect, type CSSProperties, type ReactNode } from "react";

/**
 * Enveloppe animée d'une section rayon : déploiement au montage (apparition)
 * et collapse au démontage logique (`exiting`) avant retrait réel via onExited.
 */
export function RayonGroup({
  exiting, onExited, children,
}: {
  exiting?: boolean;
  onExited?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [collapse, setCollapse] = useState<{ h: number; phase: "start" | "end" } | null>(null);
  const exitedDone = useRef(false);

  // Animation d'entrée : démarre fondu/décalé puis se pose.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Déclenche le collapse quand on passe en sortie.
  useLayoutEffect(() => {
    if (!exiting || collapse) return;
    const h = ref.current?.offsetHeight ?? 0;
    setCollapse({ h, phase: "start" });
  }, [exiting, collapse]);

  // Passe en phase "end" à la frame suivante → joue la transition.
  useLayoutEffect(() => {
    if (collapse?.phase !== "start") return;
    const id = requestAnimationFrame(() => setCollapse(c => (c ? { ...c, phase: "end" } : c)));
    return () => cancelAnimationFrame(id);
  }, [collapse?.phase]);

  // Retrait réel une fois le collapse terminé.
  useEffect(() => {
    if (collapse?.phase !== "end") return;
    const t = setTimeout(() => {
      if (!exitedDone.current) { exitedDone.current = true; onExited?.(); }
    }, 300);
    return () => clearTimeout(t);
  }, [collapse?.phase, onExited]);

  const end = collapse?.phase === "end";
  const style: CSSProperties = collapse
    ? {
        height: end ? 0 : collapse.h,
        marginBottom: end ? 0 : 14,
        opacity: end ? 0 : 1,
        transform: end ? "translateY(-6px)" : "none",
        overflow: "hidden",
        pointerEvents: "none",
        transition: "height .28s ease, margin-bottom .28s ease, opacity .22s ease, transform .28s ease",
      }
    : {
        marginBottom: 14,
        opacity: entered ? 1 : 0,
        transform: entered ? "none" : "translateY(-10px)",
        transition: "opacity .28s ease, transform .28s ease",
      };

  return <div ref={ref} style={style}>{children}</div>;
}
