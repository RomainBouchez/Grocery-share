import { ImageResponse } from "next/og";

// Taille standard des aperçus de partage (Open Graph / Twitter card).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const ACCENT = "#2FB36A";
const INK = "#1B1A16";
const MUTED = "#6B675E";

// Logo SharedCart inline (évite toute dépendance réseau au rendu).
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 48 48"><path d="M7.4 12.8 H9.6 a2 2 0 0 1 1.85 1.2 L15 20.5" fill="none" stroke="#2FB36A" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(13.16,8.68) scale(0.62)"><circle cx="12" cy="6" r="4" fill="#7B6EF6"/><path d="M20 17.5C20 20 20 22 12 22C4 22 4 20 4 17.5C4 15 7.6 13 12 13C16.4 13 20 15 20 17.5Z" fill="#7B6EF6"/></g><g transform="translate(25.96,8.68) scale(0.62)"><circle cx="12" cy="6" r="4" fill="#1F95E8"/><path d="M20 17.5C20 20 20 22 12 22C4 22 4 20 4 17.5C4 15 7.6 13 12 13C16.4 13 20 15 20 17.5Z" fill="#1F95E8"/></g><g transform="translate(18.84,6.32) scale(0.68)"><circle cx="12" cy="6" r="4" fill="#E8503A"/><path d="M20 17.5C20 20 20 22 12 22C4 22 4 20 4 17.5C4 15 7.6 13 12 13C16.4 13 20 15 20 17.5Z" fill="#E8503A"/></g><path d="M12.6 21.5 H41 L38.8 29.6 A4.4 4.4 0 0 1 34.6 32.7 H19.2 A4.4 4.4 0 0 1 15 29.6 Z" fill="#2FB36A"/><circle cx="20" cy="38.6" r="3.1" fill="#2FB36A"/><circle cx="34" cy="38.6" r="3.1" fill="#2FB36A"/></svg>`;
const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`;

// Charge Hanken Grotesk (bold) en TTF pour un rendu fidèle à la marque.
// Le trick UA ancien force Google à servir du .ttf (satori ne lit pas le woff2).
// Échec silencieux -> police par défaut, sans casser le build.
async function loadBrandFont(): Promise<
  { name: string; data: ArrayBuffer; weight: 800; style: "normal" }[]
> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@800",
      { headers: { "User-Agent": "Mozilla/4.0" } },
    ).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+\.ttf)\)/)?.[1];
    if (!url) return [];
    const data = await fetch(url).then((r) => r.arrayBuffer());
    return [{ name: "Hanken Grotesk", data, weight: 800, style: "normal" }];
  } catch {
    return [];
  }
}

/** Génère une image OG 1200×630 aux couleurs SharedCart. */
export async function ogImage({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  const fonts = await loadBrandFont();
  const fontFamily = fonts.length ? "Hanken Grotesk" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #FBFCFB 0%, #E9F6EE 100%)",
          fontFamily,
        }}
      >
        {/* Marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 26,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(30,26,20,0.10)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK_DATA_URI} width={64} height={64} alt="" />
          </div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", color: INK }}>
            SharedCart
          </div>
        </div>

        {/* Message principal */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#DFF3E8",
              color: ACCENT,
              fontSize: 26,
              fontWeight: 800,
              padding: "10px 24px",
              borderRadius: 999,
            }}
          >
            {badge}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: INK,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 500, color: MUTED, maxWidth: 920 }}>
            {subtitle}
          </div>
        </div>

        {/* Pied : URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", height: 6, width: 64, borderRadius: 6, background: ACCENT }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: MUTED }}>
            sharedcart.romainbouchez.fr
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
