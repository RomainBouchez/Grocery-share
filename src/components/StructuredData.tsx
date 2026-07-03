import { getTranslations } from "next-intl/server";

const SITE = process.env.APP_URL ?? "https://sharedcart.romainbouchez.fr";

type Faq = { q: string; a: string };

/**
 * JSON-LD rendu côté serveur pour la landing publique. Fournit aux moteurs IA
 * (ChatGPT, Claude, Perplexity, Gemini) le type de produit, l'éditeur, la
 * fraîcheur (dateModified) et une FAQPage citable.
 */
export async function StructuredData() {
  const t = await getTranslations("metadata");
  const tf = await getTranslations("faq");
  const faqs = tf.raw("items") as Faq[];
  const dateModified = new Date().toISOString();

  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "SharedCart",
      url: SITE,
      logo: `${SITE}/icon-light-1024.png`,
      founder: { "@type": "Person", name: "Romain Bouchez", url: "https://romainbouchez.fr" },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE}/#app`,
      name: "SharedCart",
      url: SITE,
      description: t("description"),
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, iOS, Android (PWA)",
      inLanguage: ["fr", "en"],
      dateModified,
      publisher: { "@id": `${SITE}/#org` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE}/#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  const json = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
