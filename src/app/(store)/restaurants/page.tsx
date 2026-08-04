import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { RestaurantsExplorer, type ExplorerRestaurant } from "@/components/restaurants-explorer";
import { distanceKm, parseCuisineTags, parseOrigin } from "@/lib/restaurants";
import {
  demoCityLabel,
  findDemoCity,
  matchesRestaurantCity,
  resolveRestaurantQuery,
} from "@/lib/cities";
import { restaurantMatchesQuery } from "@/lib/restaurant-query";
import { estimateDeliveryEta } from "@/lib/eta";
import { formatHoursSummary, isOpenNow } from "@/lib/opening-hours";

type Props = {
  searchParams: Promise<{
    q?: string;
    cuisine?: string;
    city?: string;
    lat?: string;
    lng?: string;
    place?: string;
    open?: string;
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
    open = "",
  } = await searchParams;
  const { q, city: cityFilter } = resolveRestaurantQuery({ q: rawQ, city });
  const cityLabel = demoCityLabel(cityFilter);
  const openNowOnly = open === "1" || open === "true";
  const origin = parseOrigin(lat, lng);
  const cityPin = findDemoCity(cityFilter);
  const etaOrigin = origin ?? (cityPin ? { lat: cityPin.lat, lng: cityPin.lng } : null);

  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { rating: "desc" }, { name: "asc" }],
  });

  const allCuisines = Array.from(
    new Set(restaurants.flatMap((r) => parseCuisineTags(r.cuisineTags))),
  ).sort();

  const filtered = restaurants.filter((r) => {
    const tags = parseCuisineTags(r.cuisineTags);
    const matchesQ = restaurantMatchesQuery(r, q);
    const matchesCuisine =
      !cuisine || tags.some((t) => t.toLowerCase() === cuisine.toLowerCase());
    const matchesCity = matchesRestaurantCity(r.city, cityFilter);
    const openNow = isOpenNow({
      openingHoursJson: r.openingHoursJson,
      isOpen: r.isOpen,
      city: r.city,
    });
    const matchesOpen = !openNowOnly || openNow;
    return matchesQ && matchesCuisine && matchesCity && matchesOpen;
  });

  const withDistance: ExplorerRestaurant[] = filtered.map((r) => {
    const openNow = isOpenNow({
      openingHoursJson: r.openingHoursJson,
      isOpen: r.isOpen,
      city: r.city,
    });
    const eta = etaOrigin
      ? estimateDeliveryEta({
          originLat: etaOrigin.lat,
          originLng: etaOrigin.lng,
          restaurantLat: r.lat,
          restaurantLng: r.lng,
        }).label
      : null;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      image: r.image,
      cuisineTags: r.cuisineTags,
      city: r.city,
      suburb: r.suburb,
      rating: r.rating,
      userRatingCount: r.userRatingCount,
      deliveryFeeCents: r.deliveryFeeCents,
      isOpen: openNow,
      hoursSummary: formatHoursSummary(r.openingHoursJson),
      lat: r.lat,
      lng: r.lng,
      distanceKm: origin ? distanceKm(origin.lat, origin.lng, r.lat, r.lng) : null,
      etaLabel: eta,
    };
  });

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
                ? `${cityLabel} · filter or search across suburbs`
                : "Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart"}
            {openNowOnly ? " · open now" : ""}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-[var(--ae-ink-muted)]">Loading filters…</div>}>
        <RestaurantFilters
          cuisines={allCuisines}
          initialQ={q}
          initialCuisine={cuisine}
          initialCity={cityFilter}
          initialOpenNow={openNowOnly}
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
