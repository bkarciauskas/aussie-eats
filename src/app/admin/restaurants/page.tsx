import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";
import { formatAUD } from "@/lib/money";
import { parseCuisineTags } from "@/lib/restaurants";
import { ToggleRestaurantActive } from "@/components/admin-restaurant-actions";

export default async function AdminRestaurantsPage() {
  await ensureAdmin();
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--ae-green)]">Restaurants</h1>
          <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">Create, edit, deactivate</p>
        </div>
        <Link href="/admin/restaurants/new" className="btn-primary">
          New restaurant
        </Link>
      </div>

      <div className="panel mt-6 overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Suburb</th>
              <th>Cuisines</th>
              <th>Delivery</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--ae-ink-soft)]">{r.slug}</div>
                </td>
                <td>{r.suburb}</td>
                <td>{parseCuisineTags(r.cuisineTags).join(", ")}</td>
                <td>{formatAUD(r.deliveryFeeCents)}</td>
                <td>
                  {r.isActive ? (r.isOpen ? "Open" : "Closed") : "Inactive"}
                </td>
                <td className="space-y-1">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/restaurants/${r.id}`} className="text-sm underline">
                      Edit
                    </Link>
                    <Link
                      href={`/admin/restaurants/${r.id}/menu`}
                      className="text-sm underline"
                    >
                      Menu
                    </Link>
                  </div>
                  <ToggleRestaurantActive id={r.id} isActive={r.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
