import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { ORDER_STATUS_LABELS, parseDeliveryAddress } from "@/lib/orders";
import { OrderStatus } from "@/lib/roles";
import { requireUser } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const session = await requireUser();
  if (!session?.userId) {
    redirect("/login?next=/orders");
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: session.userId },
    include: { restaurant: true, items: true },
  });

  if (!order) notFound();

  const address = parseDeliveryAddress(order.deliveryAddress);

  return (
    <div className="page-shell max-w-3xl">
      <Link href="/orders" className="text-sm text-[var(--ae-ink-muted)] hover:text-[var(--ae-ink)]">
        ← Back to orders
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-[var(--ae-green)]">{order.restaurant.name}</h1>
          <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">
            Placed{" "}
            {new Intl.DateTimeFormat("en-AU", {
              dateStyle: "full",
              timeStyle: "short",
            }).format(order.createdAt)}
          </p>
        </div>
        <span className="status-pill" data-status={order.status}>
          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
        </span>
      </div>

      <div className="panel mt-8 space-y-4">
        <h2 className="font-display text-xl">Items</h2>
        <ul className="divide-y divide-[var(--ae-line)]">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
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
            <span>{formatAUD(order.subtotalCents)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Delivery</span>
            <span>{formatAUD(order.deliveryFeeCents)}</span>
          </div>
          <div className="mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatAUD(order.totalCents)}</span>
          </div>
          <p className="mt-3 text-[var(--ae-ink-soft)]">Payment: {order.paymentMethod}</p>
        </div>
      </div>

      <div className="panel mt-4">
        <h2 className="font-display text-xl">Delivery address</h2>
        <p className="mt-2 text-sm">
          {address.label}
          <br />
          {address.line1}
          <br />
          {address.suburb} {address.state} {address.postcode}
          <br />
          Australia
          {address.phone ? (
            <>
              <br />
              {address.phone}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
