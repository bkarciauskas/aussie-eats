"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartBadge() {
  const { itemCount, hydrated } = useCart();
  return (
    <Link href="/cart" className="nav-link relative">
      Cart
      {hydrated && itemCount > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[var(--ae-accent)] px-1 text-xs font-semibold text-white">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
