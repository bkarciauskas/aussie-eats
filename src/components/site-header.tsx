import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { CartBadge } from "@/components/cart-badge";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="site-header">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="brand-mark" aria-label="AussieEats home">
          AussieEats
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Primary">
          <Link href="/restaurants" className="nav-link">
            Restaurants
          </Link>
          <Link href="/orders" className="nav-link">
            Orders
          </Link>
          <CartBadge />
          {session.isLoggedIn ? (
            <form action={logoutAction}>
              <button type="submit" className="nav-link">
                Log out
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn-secondary !px-3 !py-1.5 text-sm">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
