import Link from "next/link";
import { adminLogoutAction } from "@/app/actions/auth";
import { getSession } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session.isLoggedIn && session.role === "ADMIN";

  return (
    <div className="admin-shell">
      <header className="admin-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-display text-lg font-bold text-[var(--ae-green)]">
              AussieEats Admin
            </Link>
            {isAdmin ? (
              <nav className="flex gap-2 text-sm" aria-label="Admin">
                <Link href="/admin" className="nav-link">
                  Dashboard
                </Link>
                <Link href="/admin/restaurants" className="nav-link">
                  Restaurants
                </Link>
                <Link href="/admin/orders" className="nav-link">
                  Orders
                </Link>
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="nav-link">
              Storefront
            </Link>
            {isAdmin ? (
              <form action={adminLogoutAction}>
                <button type="submit" className="nav-link">
                  Log out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
