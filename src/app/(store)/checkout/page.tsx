import { CheckoutForm } from "@/components/checkout-form";
import { getSession } from "@/lib/session";

export default async function CheckoutPage() {
  const session = await getSession();

  // Saved addresses live in Mongo but have no public FastAPI route yet;
  // checkout still collects a delivery address at place-order time.
  return (
    <div className="page-shell">
      <h1 className="mb-6 font-display text-4xl text-[var(--ae-green)]">Checkout</h1>
      <CheckoutForm isLoggedIn={!!session.isLoggedIn} />
    </div>
  );
}
