import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";
import { RestaurantForm } from "@/components/restaurant-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditRestaurantPage({ params }: Props) {
  await ensureAdmin();
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) notFound();

  return (
    <div>
      <Link href="/admin/restaurants" className="text-sm text-[var(--ae-ink-muted)]">
        ← Restaurants
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl text-[var(--ae-green)]">Edit {restaurant.name}</h1>
        <Link href={`/admin/restaurants/${restaurant.id}/menu`} className="btn-secondary">
          Edit menu
        </Link>
      </div>
      <RestaurantForm restaurant={restaurant} />
    </div>
  );
}
