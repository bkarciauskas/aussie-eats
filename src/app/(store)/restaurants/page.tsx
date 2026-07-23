import { prisma } from "@/lib/db";
import { RestaurantCard } from "@/components/restaurant-card";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { parseCuisineTags } from "@/lib/restaurants";

type Props = {
  searchParams: Promise<{ q?: string; cuisine?: string }>;
};

export default async function RestaurantsPage({ searchParams }: Props) {
  const { q = "", cuisine = "" } = await searchParams;
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });

  const allCuisines = Array.from(
    new Set(restaurants.flatMap((r) => parseCuisineTags(r.cuisineTags))),
  ).sort();

  const filtered = restaurants.filter((r) => {
    const tags = parseCuisineTags(r.cuisineTags);
    const matchesQ =
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.suburb.toLowerCase().includes(q.toLowerCase()) ||
      tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
    const matchesCuisine =
      !cuisine || tags.some((t) => t.toLowerCase() === cuisine.toLowerCase());
    return matchesQ && matchesCuisine;
  });

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-[var(--ae-green)]">Restaurants</h1>
          <p className="mt-2 text-[var(--ae-ink-muted)]">
            Sydney-first seed data · Surry Hills, Newtown, Bondi, Parramatta, Manly
          </p>
        </div>
      </div>

      <RestaurantFilters cuisines={allCuisines} initialQ={q} initialCuisine={cuisine} />

      {filtered.length === 0 ? (
        <div className="panel mt-8">
          <h2 className="font-display text-2xl">No restaurants match</h2>
          <p className="mt-2 text-[var(--ae-ink-muted)]">
            If the list is empty after seeding, use “Use Sydney demo location” on the home page and
            clear filters.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          {filtered.map((r) => (
            <RestaurantCard key={r.id} {...r} />
          ))}
        </div>
      )}
    </div>
  );
}
