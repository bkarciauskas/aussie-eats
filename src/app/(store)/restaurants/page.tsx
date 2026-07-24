import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { RestaurantCard } from "@/components/restaurant-card";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { parseCuisineTags } from "@/lib/restaurants";
import { resolveRestaurantQuery } from "@/lib/cities";

type Props = {
  searchParams: Promise<{ q?: string; cuisine?: string; city?: string }>;
};

export default async function RestaurantsPage({ searchParams }: Props) {
  const { q: rawQ = "", cuisine = "", city = "" } = await searchParams;
  const { q, city: cityFilter } = resolveRestaurantQuery({ q: rawQ, city });
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { rating: "desc" }, { name: "asc" }],
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
      r.city.toLowerCase().includes(q.toLowerCase()) ||
      tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
    const matchesCuisine =
      !cuisine || tags.some((t) => t.toLowerCase() === cuisine.toLowerCase());
    const matchesCity = !cityFilter || r.city.toLowerCase() === cityFilter.toLowerCase();
    return matchesQ && matchesCuisine && matchesCity;
  });

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-[var(--ae-green)]">Restaurants</h1>
          <p className="mt-2 text-[var(--ae-ink-muted)]">
            {cityFilter
              ? `${cityFilter} · filter or search across seeded suburbs`
              : "Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart"}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-[var(--ae-ink-muted)]">Loading filters…</div>}>
        <RestaurantFilters
          cuisines={allCuisines}
          initialQ={q}
          initialCuisine={cuisine}
          initialCity={cityFilter}
        />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="panel mt-8">
          <h2 className="font-display text-2xl">No restaurants match</h2>
          <p className="mt-2 text-[var(--ae-ink-muted)]">
            Try another city filter, clear search, or re-run <code>npm run db:seed</code>.
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
