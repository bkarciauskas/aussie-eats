import Link from "next/link";
import { ensureAdmin } from "@/lib/admin-guard";
import { RestaurantForm } from "@/components/restaurant-form";

export default async function NewRestaurantPage() {
  await ensureAdmin();
  return (
    <div>
      <Link href="/admin/restaurants" className="text-sm text-[var(--ae-ink-muted)]">
        ← Restaurants
      </Link>
      <h1 className="mt-2 font-display text-3xl text-[var(--ae-green)]">New restaurant</h1>
      <RestaurantForm />
    </div>
  );
}
