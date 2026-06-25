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

export default nextConfig;
