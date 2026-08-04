"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { DeliveryEta } from "@/components/delivery-eta";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { placeOrderAction } from "@/app/actions/orders";
import { formatAUD } from "@/lib/money";
import {
  PaymentMethodId,
  cardDigits,
  detectCardBrand,
} from "@/lib/payment";

type Props = {
  isLoggedIn: boolean;
  defaultAddress?: {
    label: string;
    line1: string;
    suburb: string;
    state: string;
    postcode: string;
  };
};

export function CheckoutForm({ isLoggedIn, defaultAddress }: Props) {
  const { cart, subtotalCents, totalCents, clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("pay_on_delivery");
  const [cardNumber, setCardNumber] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!cart.items.length) {
    return (
      <div className="panel">
        <p>Your cart is empty.</p>
        <Link href="/restaurants" className="btn-primary mt-4 inline-flex">
          Browse restaurants
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="panel">
        <h2 className="font-display text-2xl">Log in to checkout</h2>
        <p className="mt-2 text-[var(--ae-ink-muted)]">
          You can browse and build a cart without an account. Sign in to place your order.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent("/checkout")}`}
          className="btn-primary mt-6 inline-flex"
        >
          Log in to continue
        </Link>
        <p className="mt-3 text-sm text-[var(--ae-ink-soft)]">
          Demo: demo@aussieeats.local / demo1234
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        const digits = cardDigits(cardNumber);
        if (paymentMethod === "card" && (digits.length < 12 || digits.length > 19)) {
          setError("Enter a valid demo card number with 12 to 19 digits.");
          return;
        }
        startTransition(async () => {
          const result = await placeOrderAction({
            restaurantId: cart.restaurantId!,
            items: cart.items.map((i) => ({
              menuItemId: i.menuItemId,
              quantity: i.quantity,
            })),
            address: {
              label: String(fd.get("label") || "Delivery"),
              line1: String(fd.get("line1") || ""),
              suburb: String(fd.get("suburb") || ""),
              state: String(fd.get("state") || "NSW"),
              postcode: String(fd.get("postcode") || ""),
              phone: String(fd.get("phone") || ""),
            },
            payment:
              paymentMethod === "card"
                ? {
                    method: "card",
                    cardLast4: digits.slice(-4),
                    cardBrand: detectCardBrand(digits),
                  }
                : { method: paymentMethod },
          });
          if (result?.error) {
            if ("needsAuth" in result && result.needsAuth) {
              router.push("/login?next=/checkout");
              return;
            }
            setError(result.error);
            return;
          }
          if (result?.orderId) {
            clearCart();
            router.push(`/orders/${result.orderId}`);
          }
        });
      }}
    >
      <div className="panel space-y-4">
        <h2 className="font-display text-2xl">Delivery address</h2>
        <p className="text-sm text-[var(--ae-ink-muted)]">Australia / NSW · AUD pricing</p>
        <label className="field">
          <span>Label</span>
          <input name="label" defaultValue={defaultAddress?.label || "Home"} />
        </label>
        <label className="field">
          <span>Street address</span>
          <input
            name="line1"
            required
            defaultValue={defaultAddress?.line1 || "100 George Street"}
            placeholder="Street address"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Suburb</span>
            <input name="suburb" required defaultValue={defaultAddress?.suburb || "Sydney"} />
          </label>
          <label className="field">
            <span>Postcode</span>
            <input name="postcode" required defaultValue={defaultAddress?.postcode || "2000"} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>State</span>
            <input name="state" defaultValue={defaultAddress?.state || "NSW"} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" defaultValue="+61 400 000 000" placeholder="+61 …" />
          </label>
        </div>
        <PaymentMethodPicker
          method={paymentMethod}
          cardNumber={cardNumber}
          onMethodChange={setPaymentMethod}
          onCardNumberChange={setCardNumber}
        />
        {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}
      </div>

      <aside className="panel h-fit space-y-3">
        <h2 className="font-display text-2xl">Order summary</h2>
        <p className="text-sm text-[var(--ae-ink-muted)]">{cart.restaurantName}</p>
        <ul className="space-y-2 text-sm">
          {cart.items.map((item) => (
            <li key={item.menuItemId} className="flex justify-between gap-3">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>{formatAUD(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--ae-line)] pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatAUD(subtotalCents)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Delivery</span>
            <span>{formatAUD(cart.deliveryFeeCents)}</span>
          </div>
          {cart.restaurantLat != null && cart.restaurantLng != null ? (
            <DeliveryEta
              restaurantLat={cart.restaurantLat}
              restaurantLng={cart.restaurantLng}
              className="mt-1 flex justify-between text-[var(--ae-ink-muted)]"
              asRow
            />
          ) : null}
          <div className="mt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatAUD(totalCents)}</span>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending
            ? "Placing order…"
            : paymentMethod === "pay_on_delivery"
              ? "Place order"
              : "Pay & place order"}
        </button>
      </aside>
    </form>
  );
}
