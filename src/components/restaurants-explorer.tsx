"use client";

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
  city: string;
  suburb: string;
  rating: number;
  deliveryFeeCents: number;
  isOpen: boolean;
  lat: number;
  lng: number;
  distanceKm: number | null;
};

export function RestaurantsExplorer({
  restaurants,
  origin,
  locationLabel,
}: {
  restaurants: ExplorerRestaurant[];
  origin: Origin | null;
  locationLabel?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
              Try another city filter, clear search, or widen your location.
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
                  slug={r.slug}
                  name={r.name}
                  description={r.description}
                  image={r.image}
                  cuisineTags={r.cuisineTags}
                  city={r.city}
                  suburb={r.suburb}
                  rating={r.rating}
                  deliveryFeeCents={r.deliveryFeeCents}
                  isOpen={r.isOpen}
                  distanceKm={r.distanceKm}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </MapProvider>
  );
}
