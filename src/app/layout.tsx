import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SharedCart — one list your whole house shares",
  description:
    "Add groceries from anywhere. Whoever's heading to the store sees them the second you do.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SharedCart", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#5BD08A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`min-h-dvh antialiased ${hanken.variable}`}>{children}</body>
    </html>
  );
}
