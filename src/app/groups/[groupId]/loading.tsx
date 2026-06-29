import { RayonSkeleton } from "@/components/ItemCardSkeleton";
import { FONT, INK_STRONG } from "@/lib/ui";

/** Écran de chargement (App Router) affiché pendant le fetch de la page groupe. */
export default function Loading() {
  return (
    <div style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased", minHeight: "100dvh", background: "#F5F5F5", color: INK_STRONG }}>
      <div style={{ paddingBottom: 210 }}>
        {/* En-tête */}
        <div style={{ padding: "44px 18px 0", marginBottom: 18 }}>
          <span className="cf-skel" style={{ display: "block", height: 12, width: 72, borderRadius: 6, marginBottom: 16 }} />
          <span className="cf-skel" style={{ display: "block", height: 48, width: 170, borderRadius: 16 }} />
          <span className="cf-skel" style={{ display: "block", height: 38, width: 130, borderRadius: 12, marginTop: 14 }} />
          {/* Barre de progression */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span className="cf-skel" style={{ height: 12, width: 70, borderRadius: 6 }} />
              <span className="cf-skel" style={{ height: 12, width: 56, borderRadius: 6 }} />
            </div>
            <span className="cf-skel" style={{ display: "block", height: 9, width: "100%", borderRadius: 999 }} />
          </div>
          {/* Bouton courses */}
          <span className="cf-skel" style={{ display: "block", height: 50, width: "100%", borderRadius: 16, marginTop: 14 }} />
        </div>

        {/* Liste */}
        <div style={{ padding: "8px 18px 0" }}>
          <RayonSkeleton count={2} headerWidth={120} />
          <RayonSkeleton count={3} headerWidth={90} />
          <RayonSkeleton count={1} headerWidth={70} />
        </div>
      </div>
    </div>
  );
}
