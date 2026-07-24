import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { RestaurantsExplorer, type ExplorerRestaurant } from "@/components/restaurants-explorer";
import { distanceKm, parseCuisineTags, parseOrigin } from "@/lib/restaurants";
import { resolveRestaurantQuery } from "@/lib/cities";

type Props = {
  searchParams: Promise<{
    q?: string;
    cuisine?: string;
    city?: string;
    lat?: string;
    lng?: string;
    place?: string;
  }>;
};

export default async function RestaurantsPage({ searchParams }: Props) {
  const {
    q: rawQ = "",
    cuisine = "",
    city = "",
    lat,
    lng,
    place = "",
  } = await searchParams;
  const { q, city: cityFilter } = resolveRestaurantQuery({ q: rawQ, city });
  const origin = parseOrigin(lat, lng);

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

  const withDistance: ExplorerRestaurant[] = filtered.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    image: r.image,
    cuisineTags: r.cuisineTags,
    city: r.city,
    suburb: r.suburb,
    rating: r.rating,
    deliveryFeeCents: r.deliveryFeeCents,
    isOpen: r.isOpen,
    lat: r.lat,
    lng: r.lng,
    distanceKm: origin ? distanceKm(origin.lat, origin.lng, r.lat, r.lng) : null,
  }));

  if (origin) {
    withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  const locationLabel = origin
    ? place || `${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)}`
    : "";

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-[var(--ae-green)]">Restaurants</h1>
          <p className="mt-2 text-[var(--ae-ink-muted)]">
            {origin
              ? `Sorted by distance from ${locationLabel}`
              : cityFilter
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

      <Suspense fallback={<div className="mt-8 text-sm text-[var(--ae-ink-muted)]">Loading map…</div>}>
        <RestaurantsExplorer
          restaurants={withDistance}
          origin={origin}
          locationLabel={locationLabel}
        />
      </Suspense>
    </div>
  );
}
