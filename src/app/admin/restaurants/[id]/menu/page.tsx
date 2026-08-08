import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRestaurant, getAdminRestaurantMenu } from "@/lib/backend";
import { ensureAdmin } from "@/lib/admin-guard";
import { AdminMenuManager } from "@/components/admin-menu-manager";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMenuPage({ params }: Props) {
  await ensureAdmin();
  const { id } = await params;
  const restaurant = await getAdminRestaurant(id);
  if (!restaurant) notFound();

  const categories = await getAdminRestaurantMenu(id);

  return (
    <div>
      <Link href="/admin/restaurants" className="text-sm text-[var(--ae-ink-muted)]">
        ← Restaurants
      </Link>
      <h1 className="mt-2 font-display text-3xl text-[var(--ae-green)]">
        Menu · {restaurant.name}
      </h1>
      <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
        Add categories and items, edit prices, toggle availability
      </p>
      <AdminMenuManager
        restaurantId={restaurant.id}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          sortOrder: category.sortOrder,
          items: category.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            priceCents: item.priceCents,
            image: item.image ?? null,
            isAvailable: item.isAvailable,
            categoryId: item.categoryId,
            dietaryTags: item.dietaryTags,
            allergens: item.allergens,
          })),
        }))}
      />
    </div>
  );
}
