import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Les photos de tickets prises au téléphone dépassent la limite par
      // défaut de 1 MB des Server Actions. On l'élève pour permettre l'upload.
      bodySizeLimit: "10mb",
    },
  },
};

// Charge la config i18n (locale via cookie, sans routing par locale).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
