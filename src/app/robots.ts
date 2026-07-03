import type { MetadataRoute } from "next";

const SITE = process.env.APP_URL ?? "https://sharedcart.romainbouchez.fr";

// Robots générés par Next (route /robots.txt). On autorise explicitement les
// crawlers IA (référencement dans ChatGPT, Claude, Perplexity, Gemini…) et on
// tient les pages authentifiées hors index pour le crawler générique.
export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "Amazonbot",
    "CCBot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /join volontairement absent : les pages d'invitation sont en noindex
        // par page, mais doivent rester accessibles aux robots d'aperçu
        // (WhatsApp, iMessage, Slack…) pour générer la vignette de partage.
        disallow: [
          "/admin",
          "/api/",
          "/profile",
          "/groups",
          "/listes",
          "/forgot-password",
          "/reset-password",
        ],
      },
      // Les moteurs IA peuvent parcourir les pages publiques (landing + login).
      { userAgent: aiBots, allow: "/", disallow: ["/admin", "/api/"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
