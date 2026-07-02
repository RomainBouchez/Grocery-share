import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { card, FONT } from "@/lib/ui";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main style={{
      minHeight: "100dvh", background: "#F5F5F5",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 20px", fontFamily: FONT,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: "-0.035em", color: "#1B1A16" }}>
            SharedCart
          </h1>
        </div>
        <div style={{ ...card, padding: "32px 28px" }}>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
