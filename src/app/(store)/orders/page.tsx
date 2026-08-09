import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyOrders } from "@/lib/backend";
import { formatAUD } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { OrderStatus } from "@/lib/roles";
import { getSession, requireUser } from "@/lib/session";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return (
      <div className="page-shell">
        <h1 className="font-display text-4xl text-[var(--ae-green)]">Your orders</h1>
        <div className="panel mt-8 max-w-xl">
          <h2 className="font-display text-2xl">Full order history needs an account</h2>
          <p className="mt-2 text-[var(--ae-ink-muted)]">
            Guest checkout keeps this device&apos;s recent order after you place it. Sign in
            with a demo account to browse full history across sessions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?next=/orders" className="btn-primary inline-flex">
              Log in
            </Link>
            <Link href="/signup?next=/orders" className="btn-secondary inline-flex">
              Create account
            </Link>
          </div>
          <p className="mt-4 text-sm text-[var(--ae-ink-soft)]">
            Demo: demo@aussieeats.local / demo1234
          </p>
        </div>
      </div>
    );
  }

  const authed = await requireUser();
  if (!authed?.userId) {
    redirect("/login?next=/orders");
  }

  const orders = await listMyOrders();
  const isGuest = !!session.isGuest;

  return (
    <div className="page-shell">
      <h1 className="font-display text-4xl text-[var(--ae-green)]">Your orders</h1>
      <p className="mt-2 text-[var(--ae-ink-muted)]">
        {isGuest
          ? "Guest orders on this device"
          : `Order history for ${session.email}`}
      </p>

      {isGuest ? (
        <div className="panel mt-6 border-[var(--ae-green)]/30 bg-[var(--ae-cream)]">
          <p className="font-medium text-[var(--ae-ink)]">
            Full order history needs an account
          </p>
          <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
            You checked out as a guest. Create an account to keep orders across devices and
            browsers — or use the demo login for the seeded history.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary inline-flex">
              Create account
            </Link>
            <Link href="/login?next=/orders" className="btn-secondary inline-flex">
              Log in
            </Link>
          </div>
        </div>
      ) : null}

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
                    <p className="font-medium">{order.restaurant?.name ?? "Restaurant"}</p>
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
