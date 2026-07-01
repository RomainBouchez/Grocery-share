import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const initialMode = mode === "signup" ? "signup" : "login";

  const user = await getCurrentUser();
  if (user) redirect(safeNext ?? "/");

  const t = await getTranslations("auth.page");

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F5F5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: "#FFFFFF", border: "1.5px solid #fff",
            boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 6px 16px rgba(30,26,20,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2FB36A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: "-0.035em", color: "#1B1A16" }}>
            SharedCart
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 500, color: "#807C72", lineHeight: 1.4 }}>
            {t("tagline")}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#FFFFFF",
          border: "2.5px solid #fff",
          borderRadius: 24,
          padding: "32px 28px",
          boxShadow: "0 0 0 1px rgba(30,26,20,0.05), 0 2px 4px rgba(30,26,20,0.04), 0 18px 40px rgba(30,26,20,0.09)",
        }}>
          <LoginForm next={safeNext} initialMode={initialMode} />
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, fontWeight: 600, color: "#A8A498" }}>
          {t("footer", { year: 2026 })}
        </p>
      </div>
    </main>
  );
}
