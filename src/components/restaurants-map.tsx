"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Map,
  Marker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import type { ExplorerRestaurant } from "@/components/restaurants-explorer";
import type { Origin } from "@/lib/restaurants";

const SYDNEY = { lat: -33.8688, lng: 151.2093 };

function FitBounds({
  restaurants,
  origin,
}: {
  restaurants: ExplorerRestaurant[];
  origin: Origin | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const points = restaurants.map((r) => ({ lat: r.lat, lng: r.lng }));
    if (origin) points.push(origin);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 64);
  }, [map, restaurants, origin]);
  return null;
}

export function RestaurantsMap({
  restaurants,
  origin,
  activeId,
  onActivate,
}: {
  restaurants: ExplorerRestaurant[];
  origin: Origin | null;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}) {
  const active = restaurants.find((r) => r.id === activeId) ?? null;
  const defaultCenter = origin ?? (restaurants[0] ? { lat: restaurants[0].lat, lng: restaurants[0].lng } : SYDNEY);

  return (
    <div className="h-[380px] w-full overflow-hidden rounded-2xl border border-[var(--ae-line)]">
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        onClick={() => onActivate(null)}
        style={{ width: "100%", height: "100%" }}
      >
        <FitBounds restaurants={restaurants} origin={origin} />

        {origin ? (
          <Marker
            position={origin}
            title="Your location"
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
          />
        ) : null}

        {restaurants.map((r) => (
          <Marker
            key={r.id}
            position={{ lat: r.lat, lng: r.lng }}
            title={r.name}
            onClick={() => onActivate(r.id)}
          />
        ))}

        {active ? (
          <InfoWindow
            position={{ lat: active.lat, lng: active.lng }}
            onCloseClick={() => onActivate(null)}
          >
            <div className="max-w-[220px] text-[var(--ae-ink)]">
              <p className="font-display text-base">{active.name}</p>
              <p className="text-xs text-[var(--ae-ink-muted)]">
                {active.suburb}, {active.city} · {active.rating.toFixed(1)} ★
                {active.distanceKm != null ? ` · ${active.distanceKm.toFixed(1)} km` : ""}
              </p>
              <Link
                href={`/restaurants/${active.slug}`}
                className="mt-1 inline-block text-sm font-semibold text-[var(--ae-green)] underline"
              >
                View menu
              </Link>
            </div>
          </InfoWindow>
        ) : null}
      </Map>
    </div>
  );
}
