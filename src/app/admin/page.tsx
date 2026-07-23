import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";

export default async function AdminDashboardPage() {
  await ensureAdmin();

  const [restaurantCount, openOrders, customerCount, recentOrders] = await Promise.all([
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.order.count({
      where: { status: { in: ["pending", "preparing", "out_for_delivery"] } },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { restaurant: true, user: true },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--ae-green)]">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">Local SQLite · no external food APIs</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-[var(--ae-ink-soft)]">Restaurants</p>
          <p className="mt-2 font-display text-4xl">{restaurantCount}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-[var(--ae-ink-soft)]">Open orders</p>
          <p className="mt-2 font-display text-4xl">{openOrders}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-[var(--ae-ink-soft)]">Customers</p>
          <p className="mt-2 font-display text-4xl">{customerCount}</p>
        </div>
      </div>

      <div className="panel mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm underline">
            View all
          </Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  {new Intl.DateTimeFormat("en-AU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(order.createdAt)}
                </td>
                <td>{order.user.email}</td>
                <td>{order.restaurant.name}</td>
                <td>
                  <span className="status-pill" data-status={order.status}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
