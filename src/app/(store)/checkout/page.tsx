import { CheckoutForm } from "@/components/checkout-form";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export default async function CheckoutPage() {
  const session = await getSession();
  let defaultAddress:
    | { label: string; line1: string; suburb: string; state: string; postcode: string }
    | undefined;

  if (session.userId) {
    const address = await prisma.address.findFirst({
      where: { userId: session.userId },
      orderBy: { id: "asc" },
    });
    if (address) {
      defaultAddress = {
        label: address.label,
        line1: address.line1,
        suburb: address.suburb,
        state: address.state,
        postcode: address.postcode,
      };
    }
  }

  return (
    <div className="page-shell">
      <h1 className="mb-6 font-display text-4xl text-[var(--ae-green)]">Checkout</h1>
      <CheckoutForm isLoggedIn={!!session.isLoggedIn} defaultAddress={defaultAddress} />
    </div>
  );
}
