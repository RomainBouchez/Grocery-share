import type { CSSProperties } from "react";
import { cardSm } from "@/lib/ui";

/** Squelette d'une carte article (shimmer) pendant le chargement de la liste. */
export function ItemCardSkeleton({ width = "60%" }: { width?: string }) {
  return (
    <div style={{ ...cardSm, padding: "13px 14px", borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="cf-skel" style={{ width: 24, height: 24, borderRadius: 9, flexShrink: 0 }} />
        <span className="cf-skel" style={{ height: 14, width, borderRadius: 7 }} />
        <span className="cf-skel" style={{ height: 22, width: 64, borderRadius: 999, marginLeft: "auto", flexShrink: 0 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, paddingLeft: 36 }}>
        <span className="cf-skel" style={{ height: 18, width: 84, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/** Squelette d'une section rayon : en-tête + quelques cartes. */
export function RayonSkeleton({ count = 2, headerWidth = 110 }: { count?: number; headerWidth?: number }) {
  const widths = ["62%", "48%", "70%", "55%"];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "0 4px 8px" }}>
        <span className="cf-skel" style={{ width: 22, height: 22, borderRadius: 7 }} />
        <span className="cf-skel" style={{ height: 12, width: headerWidth, borderRadius: 6 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 } as CSSProperties}>
        {Array.from({ length: count }).map((_, i) => (
          <ItemCardSkeleton key={i} width={widths[i % widths.length]} />
        ))}
      </div>
    </div>
  );
}
