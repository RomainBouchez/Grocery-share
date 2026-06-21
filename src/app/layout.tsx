import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrocyShare — courses collaboratives",
  description:
    "Liste de courses collaborative avec parts façon Tricount, suggestions et scan de ticket.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "GrocyShare", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
