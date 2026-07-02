import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-hanken",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.webmanifest",
    // Favicon adaptatif : suit le mode clair/sombre du navigateur/OS.
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
        { url: "/icon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      ],
      apple: [{ url: "/icon-light-1024.png" }],
    },
    appleWebApp: { capable: true, title: "SharedCart", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#F5F5F5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`min-h-dvh antialiased ${hanken.variable}`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
