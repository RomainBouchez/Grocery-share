import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

/**
 * Config de requête next-intl (mode « sans routing par locale ») :
 * la langue vient du cookie / navigateur, pas de l'URL. Chargée automatiquement
 * par le plugin next-intl (voir next.config.mjs).
 */
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
