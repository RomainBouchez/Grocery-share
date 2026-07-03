import type { MetadataRoute } from "next";

const SITE = process.env.APP_URL ?? "https://sharedcart.romainbouchez.fr";

// Sitemap généré par Next (route /sitemap.xml). Le champ lastModified fournit
// aussi le signal de fraîcheur (lastmod) que scrutent les moteurs IA.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
