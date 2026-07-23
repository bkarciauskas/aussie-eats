import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";
import { AdminMenuManager } from "@/components/admin-menu-manager";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMenuPage({ params }: Props) {
  await ensureAdmin();
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!restaurant) notFound();

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
      <AdminMenuManager restaurantId={restaurant.id} categories={restaurant.categories} />
    </div>
  );
}
