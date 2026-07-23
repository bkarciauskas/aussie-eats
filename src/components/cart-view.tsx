"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatAUD } from "@/lib/money";

export function CartView() {
  const { cart, subtotalCents, totalCents, setQuantity, clearCart, hydrated } = useCart();

  if (!hydrated) {
    return <div className="panel">Loading cart…</div>;
  }

  if (!cart.items.length) {
    return (
      <div className="panel">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-[var(--ae-ink-muted)]">Browse Sydney restaurants and add a few favourites.</p>
        <Link href="/restaurants" className="btn-primary mt-6 inline-flex">
          Browse restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Cart</h1>
            <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">{cart.restaurantName}</p>
          </div>
          <button type="button" className="nav-link" onClick={clearCart}>
            Clear
          </button>
        </div>
        <ul className="divide-y divide-[var(--ae-line)]">
          {cart.items.map((item) => (
            <li key={item.menuItemId} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-[var(--ae-ink-muted)]">{formatAUD(item.unitPriceCents)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="qty-btn"
                  aria-label={`Decrease ${item.name}`}
                  onClick={() => setQuantity(item.menuItemId, item.quantity - 1)}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  aria-label={`Increase ${item.name}`}
                  onClick={() => setQuantity(item.menuItemId, item.quantity + 1)}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="panel h-fit space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatAUD(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery</span>
          <span>{formatAUD(cart.deliveryFeeCents)}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--ae-line)] pt-3 font-semibold">
          <span>Total</span>
          <span>{formatAUD(totalCents)}</span>
        </div>
        {subtotalCents < cart.minOrderCents ? (
          <p className="text-sm text-[var(--ae-danger)]">
            Minimum order {formatAUD(cart.minOrderCents)} (before delivery).
          </p>
        ) : null}
        <Link href="/checkout" className="btn-primary inline-flex w-full justify-center">
          Checkout
        </Link>
      </aside>
    </div>
  );
}
