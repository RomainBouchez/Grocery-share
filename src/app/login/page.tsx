import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#0D0D0F",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glows */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(700px 600px at 50% 10%, rgba(91,208,138,0.07), transparent 65%), radial-gradient(600px 500px at 85% 80%, rgba(120,140,255,0.05), transparent 60%), radial-gradient(800px 500px at 10% 60%, rgba(255,255,255,0.04), transparent 65%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", color: "rgba(255,255,255,0.97)" }}>
            SharedCart
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
            Une liste. Tout votre foyer. En temps réel.
          </p>
        </div>

        {/* Glass card */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 24,
          padding: "32px 28px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 40px 90px rgba(0,0,0,0.6)",
        }}>
          <LoginForm />
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
          © 2026 SharedCart · Gratuit pour toujours
        </p>
      </div>
    </main>
  );
}
