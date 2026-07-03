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
        disallow: [
          "/admin",
          "/api/",
          "/profile",
          "/groups",
          "/join",
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
