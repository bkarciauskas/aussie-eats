"use client";

import Link from "next/link";
import { useState } from "react";
import { RestaurantCard } from "@/components/restaurant-card";
import { LocationSearch } from "@/components/location-search";
import { RestaurantsMap } from "@/components/restaurants-map";
import { MapProvider, hasMapsKey } from "@/components/maps/map-provider";
import type { Origin } from "@/lib/restaurants";

export type ExplorerRestaurant = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  cuisineTags: string;
  dietaryTags?: string;
  city: string;
  suburb: string;
  rating: number;
  userRatingCount: number;
  deliveryFeeCents: number;
  isOpen: boolean;
  hoursSummary?: string | null;
  lat: number;
  lng: number;
  distanceKm: number | null;
  etaLabel?: string | null;
  /** Query string to append on restaurant links (e.g. diet filters). */
  hrefQuery?: string;
};

export type RestaurantListPagination = {
  page: number;
  pages: number;
  prevHref: string | null;
  nextHref: string | null;
};

export function RestaurantsExplorer({
  restaurants,
  origin,
  locationLabel,
  favouriteIds,
  pagination = null,
}: {
  restaurants: ExplorerRestaurant[];
  origin: Origin | null;
  locationLabel?: string;
  favouriteIds: string[];
  pagination?: RestaurantListPagination | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const favouriteIdSet = new Set(favouriteIds);

  return (
    <MapProvider>
      <div className="mt-6">
        <LocationSearch locationLabel={locationLabel} />

        {hasMapsKey ? (
          <RestaurantsMap
            restaurants={restaurants}
            origin={origin}
            activeId={activeId}
            onActivate={setActiveId}
          />
        ) : (
          <div className="panel flex flex-col items-center justify-center gap-1 border-dashed py-10 text-center">
            <p className="font-display text-lg text-[var(--ae-green)]">Map preview</p>
            <p className="max-w-md text-sm text-[var(--ae-ink-muted)]">
              Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show the interactive map with
              restaurant pins. Distance sorting and “Use my location” work without it.
            </p>
          </div>
        )}

        {restaurants.length === 0 ? (
          <div className="panel mt-6">
            <h2 className="font-display text-2xl">No restaurants match</h2>
            <p className="mt-2 text-[var(--ae-ink-muted)]">
              Try another city filter, clear dietary filters, clear search, or widen your
              location.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {restaurants.map((r) => (
              <div
                key={r.id}
                onMouseEnter={() => setActiveId(r.id)}
                onMouseLeave={() => setActiveId((cur) => (cur === r.id ? null : cur))}
                className={
                  activeId === r.id
                    ? "rounded-2xl ring-2 ring-[var(--ae-green)] ring-offset-2 ring-offset-[var(--ae-bg)]"
                    : ""
                }
              >
                <RestaurantCard
                  id={r.id}
                  slug={r.slug}
                  name={r.name}
                  description={r.description}
                  image={r.image}
                  cuisineTags={r.cuisineTags}
                  dietaryTags={r.dietaryTags}
                  city={r.city}
                  suburb={r.suburb}
                  rating={r.rating}
                  userRatingCount={r.userRatingCount}
                  deliveryFeeCents={r.deliveryFeeCents}
                  isOpen={r.isOpen}
                  distanceKm={r.distanceKm}
                  etaLabel={r.etaLabel}
                  hoursSummary={r.hoursSummary}
                  isFavourite={favouriteIdSet.has(r.id)}
                  hrefQuery={r.hrefQuery}
                />
              </div>
            ))}
          </div>
        )}

        {pagination ? (
          <nav
            aria-label="Restaurant list pages"
            className="mt-8 flex flex-wrap items-center justify-between gap-3"
          >
            {pagination.prevHref ? (
              <Link href={pagination.prevHref} className="btn-secondary">
                Previous
              </Link>
            ) : (
              <span className="btn-secondary pointer-events-none opacity-40">Previous</span>
            )}
            <p className="font-display text-[var(--ae-ink-muted)]">
              Page {pagination.page} of {pagination.pages}
            </p>
            {pagination.nextHref ? (
              <Link href={pagination.nextHref} className="btn-secondary">
                Next
              </Link>
            ) : (
              <span className="btn-secondary pointer-events-none opacity-40">Next</span>
            )}
          </nav>
        ) : null}
      </div>
    </MapProvider>
  );
}
