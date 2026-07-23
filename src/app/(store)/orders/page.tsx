import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { OrderStatus } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export default async function OrdersPage() {
  const session = await requireUser();
  if (!session?.userId) {
    redirect("/login?next=/orders");
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: { restaurant: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell">
      <h1 className="font-display text-4xl text-[var(--ae-green)]">Your orders</h1>
      <p className="mt-2 text-[var(--ae-ink-muted)]">Order history for {session.email}</p>

      {orders.length === 0 ? (
        <div className="panel mt-8">
          <p>No orders yet.</p>
          <Link href="/restaurants" className="btn-primary mt-4 inline-flex">
            Browse restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="panel block transition hover:border-[var(--ae-green)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.restaurant.name}</p>
                    <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                      {new Intl.DateTimeFormat("en-AU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="status-pill" data-status={order.status}>
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                    <p className="mt-2 font-semibold">{formatAUD(order.totalCents)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
