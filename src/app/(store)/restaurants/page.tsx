import { Suspense } from "react";
import { listFavouriteRestaurantIds } from "@/app/actions/favourites";
import { listRestaurants } from "@/lib/backend";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { RestaurantsExplorer, type ExplorerRestaurant } from "@/components/restaurants-explorer";
import { distanceKm, parseOrigin } from "@/lib/restaurants";
import {
  demoCityLabel,
  findDemoCity,
  resolveRestaurantQuery,
} from "@/lib/cities";
import { estimateDeliveryEta } from "@/lib/eta";
import { formatHoursSummary, isOpenNow } from "@/lib/opening-hours";
import {
  applyDietSearchParams,
  dietLabels,
  parseDietQuery,
  serializeDietQuery,
} from "@/lib/dietary";
import {
  parsePage,
  restaurantListPageHref,
  totalPages,
} from "@/lib/restaurant-list";

type Props = {
  searchParams: Promise<{
    q?: string;
    cuisine?: string;
    city?: string;
    lat?: string;
    lng?: string;
    place?: string;
    open?: string;
    diet?: string;
    allergy?: string;
    page?: string;
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
    diet = "",
    allergy = "",
    page: pageRaw,
  } = await searchParams;
  const { q, city: cityFilter } = resolveRestaurantQuery({ q: rawQ, city });
  const cityLabel = demoCityLabel(cityFilter);
  const openNowOnly = open === "1" || open === "true";
  const activeDiets = parseDietQuery({ diet, allergy });
  const origin = parseOrigin(lat, lng);
  const cityPin = findDemoCity(cityFilter);
  const etaOrigin = origin ?? (cityPin ? { lat: cityPin.lat, lng: cityPin.lng } : null);
  const page = parsePage(pageRaw);

  const [{ restaurants, availableCuisines, page: listPage, pageSize, total }, favouriteIds] =
    await Promise.all([
      listRestaurants({
        activeOnly: true,
        city: cityFilter || undefined,
        cuisine: cuisine || undefined,
        q: q || undefined,
        diet: activeDiets.length > 0 ? serializeDietQuery(activeDiets) : undefined,
        page,
      }),
      listFavouriteRestaurantIds(),
    ]);

  const filtered = restaurants.filter((r) => {
    if (!openNowOnly) return true;
    return isOpenNow({
      openingHoursJson: r.openingHoursJson,
      isOpen: r.isOpen,
      city: r.city,
    });
  });

  const dietLinkParams = new URLSearchParams();
  applyDietSearchParams(dietLinkParams, activeDiets);
  const hrefQuery = dietLinkParams.toString();

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
      dietaryTags: r.dietaryTags,
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
      hrefQuery,
    };
  });

  if (origin) {
    withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  const locationLabel = origin
    ? place || `${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)}`
    : "";

  const dietSummary =
    activeDiets.length > 0 ? ` · ${dietLabels(activeDiets).join(", ")}` : "";

  const listParams = new URLSearchParams();
  if (q) listParams.set("q", q);
  if (cuisine) listParams.set("cuisine", cuisine);
  if (cityFilter) listParams.set("city", cityFilter);
  if (lat) listParams.set("lat", lat);
  if (lng) listParams.set("lng", lng);
  if (place) listParams.set("place", place);
  if (openNowOnly) listParams.set("open", "1");
  applyDietSearchParams(listParams, activeDiets);

  const pages = totalPages(total, pageSize);
  const pagination =
    total > pageSize
      ? {
          page: listPage,
          pages,
          prevHref: listPage > 1 ? restaurantListPageHref(listParams, listPage - 1) : null,
          nextHref: listPage < pages ? restaurantListPageHref(listParams, listPage + 1) : null,
        }
      : null;

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
            {dietSummary}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-[var(--ae-ink-muted)]">Loading filters…</div>}>
        <RestaurantFilters
          cuisines={availableCuisines}
          initialQ={q}
          initialCuisine={cuisine}
          initialCity={cityFilter}
          initialOpenNow={openNowOnly}
          initialDiets={activeDiets}
        />
      </Suspense>

      <Suspense fallback={<div className="mt-8 text-sm text-[var(--ae-ink-muted)]">Loading map…</div>}>
        <RestaurantsExplorer
          restaurants={withDistance}
          origin={origin}
          locationLabel={locationLabel}
          favouriteIds={favouriteIds}
          pagination={pagination}
        />
      </Suspense>
    </div>
  );
}
