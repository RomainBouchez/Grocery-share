import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

// Généré à la requête (pas au build) : @vercel/og échoue au prerender sous
// Windows, et l'exécution runtime tourne sur la cible Linux sans souci.
export const dynamic = "force-dynamic";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "SharedCart — une seule liste que toute la maison partage";

export default function Image() {
  return ogImage({
    badge: "Gratuit · Temps réel",
    title: "Une seule liste que toute la maison partage",
    subtitle: "Ajoute tes courses d'où tu veux. Celui qui part au magasin les voit à la seconde.",
  });
}
