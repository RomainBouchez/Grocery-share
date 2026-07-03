import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const FF = "var(--font-hanken,'Hanken Grotesk',system-ui,sans-serif)";

function normalize(code: string) {
  return code.trim().toUpperCase();
}

function findGroup(code: string) {
  return prisma.group.findUnique({ where: { inviteCode: normalize(code) } });
}

// Métadonnées de l'invitation : titre + description + image OG (via
// opengraph-image.tsx). noindex : les liens d'invitation ne doivent pas
// atterrir dans Google, mais restent lisibles par les robots d'aperçu.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const group = await findGroup(code);
  const t = await getTranslations("group");

  if (!group) {
    return { title: t("inviteNotFound"), robots: { index: false, follow: false } };
  }

  const title = t("invitePreviewTitle", { name: group.name });
  const description = t("invitePreviewDesc");
  const path = `/join/${normalize(code)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

// Lien d'invitation : /join/<CODE>.
// - Groupe introuvable  -> carte « invitation invalide ».
// - Visiteur non connecté -> aperçu de l'invitation + CTA (pas de redirection,
//   pour que les balises OG soient rendues et scrapées par les aperçus).
// - Visiteur connecté   -> rejoint le groupe puis redirige dessus.
export default async function JoinByLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalize(code);
  const t = await getTranslations("group");

  const group = await findGroup(normalized);

  if (!group) {
    return (
      <Shell>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: "#1B1A16" }}>
          {t("inviteNotFound")}
        </h1>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: "#807C72" }}>
          {t.rich("inviteNotFoundDesc", {
            value: normalized,
            code: (chunks) => (
              <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800, color: "#1B1A16", letterSpacing: "0.05em" }}>{chunks}</span>
            ),
          })}
        </p>
        <Link href="/" style={primaryBtn}>{t("backHome")}</Link>
      </Shell>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    const next = `/join/${normalized}`;
    return (
      <Shell>
        <div style={{ width: 60, height: 60, margin: "0 auto 16px", borderRadius: 18, background: "#E2F5EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/mark.svg" alt="Logo SharedCart" width={38} height={38} />
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "#1B1A16" }}>
          {t("invitePreviewTitle", { name: group.name })}
        </h1>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: "#807C72" }}>
          {t("invitePreviewDesc")}
        </p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} style={primaryBtn}>
          {t("invitePreviewSignIn")}
        </Link>
        <Link
          href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 12, fontSize: 14, fontWeight: 800, color: "#5A574F", textDecoration: "none" }}
        >
          {t("invitePreviewCreate")}
        </Link>
      </Shell>
    );
  }

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    create: { userId: user.id, groupId: group.id, role: "member" },
    update: {},
  });

  redirect(`/groups/${group.id}`);
}

const primaryBtn = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  marginTop: 24, padding: "15px 24px", borderRadius: 999, textDecoration: "none",
  background: "#2FB36A", color: "#fff", fontSize: 15, fontWeight: 800,
  border: "1.5px solid rgba(0,0,0,0.06)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.12), 0 10px 22px rgba(47,179,106,0.3)",
} as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      fontFamily: FF, WebkitFontSmoothing: "antialiased",
      minHeight: "100dvh", background: "#F5F5F5", color: "#1B1A16",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        <div style={{
          background: "#FFFFFF", border: "2.5px solid #fff",
          borderRadius: 24, padding: "36px 28px",
          boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 18px 40px rgba(30,26,20,0.09)",
        }}>
          {children}
        </div>
      </div>
    </main>
  );
}
