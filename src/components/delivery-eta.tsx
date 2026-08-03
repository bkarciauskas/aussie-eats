"use client";

import { useLocation } from "@/components/location-provider";
import { etaLabelOrNull } from "@/lib/eta";

export function DeliveryEta({
  restaurantLat,
  restaurantLng,
  className,
  asRow = false,
}: {
  restaurantLat: number;
  restaurantLng: number;
  className?: string;
  /** When true, render a labeled row (or nothing if ETA unavailable). */
  asRow?: boolean;
}) {
  const { location, hydrated } = useLocation();
  if (!hydrated) return null;
  const label = etaLabelOrNull(
    location ? { lat: location.lat, lng: location.lng } : null,
    { lat: restaurantLat, lng: restaurantLng },
  );
  if (!label) return null;
  if (asRow) {
    return (
      <div className={className}>
        <span>Est. delivery</span>
        <span>{label}</span>
      </div>
    );
  }
  return <span className={className}>{label}</span>;
}
