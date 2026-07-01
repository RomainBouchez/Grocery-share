import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logout } from "@/lib/actions/auth";
import { initials } from "@/lib/utils";

export async function AppHeader({ userName }: { userName: string }) {
  const t = await getTranslations("nav");
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-neutral-900">
          <span className="text-xl">🛒</span> GrocyShare
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
            {initials(userName)}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-neutral-500 hover:text-neutral-800"
            >
              {t("logout")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
