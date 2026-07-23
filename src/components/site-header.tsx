import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { CartBadge } from "@/components/cart-badge";
import { RestaurantSearch } from "@/components/restaurant-search";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="site-header">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-4">
        <Link href="/" className="brand-mark shrink-0" aria-label="AussieEats home">
          AussieEats
        </Link>
        <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex md:px-4">
          <RestaurantSearch variant="header" className="w-full max-w-md" />
        </div>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-3" aria-label="Primary">
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
