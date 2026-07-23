import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";
import { formatAUD } from "@/lib/money";
import { OrderStatus } from "@/lib/roles";
import { AdminOrderStatus } from "@/components/admin-order-status";

export default async function AdminOrdersPage() {
  await ensureAdmin();

  const orders = await prisma.order.findMany({
    include: { restaurant: true, user: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--ae-green)]">Orders</h1>
      <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
        Status flow: pending → preparing → out for delivery → delivered (or cancelled)
      </p>

      <div className="panel mt-6 overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="whitespace-nowrap">
                  {new Intl.DateTimeFormat("en-AU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(order.createdAt)}
                </td>
                <td>{order.user.email}</td>
                <td>{order.restaurant.name}</td>
                <td>
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </td>
                <td>{formatAUD(order.totalCents)}</td>
                <td>
                  <AdminOrderStatus orderId={order.id} status={order.status as OrderStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
