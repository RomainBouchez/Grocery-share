import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl">🛒</div>
        <h1 className="text-2xl font-bold text-neutral-900">GrocyShare</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Vos courses en groupe, avec les parts façon Tricount.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <LoginForm />
      </div>
    </main>
  );
}
