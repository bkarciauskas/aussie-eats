import { distanceKm } from "@/lib/restaurants";

export type EtaRange = {
  minMinutes: number;
  maxMinutes: number;
  label: string;
};

/** Rough delivery ETA from origin → restaurant (prep + travel). */
export function estimateDeliveryEta(input: {
  originLat: number;
  originLng: number;
  restaurantLat: number;
  restaurantLng: number;
  prepMinutes?: number;
}): EtaRange {
  const km = distanceKm(
    input.originLat,
    input.originLng,
    input.restaurantLat,
    input.restaurantLng,
  );
  const prep = input.prepMinutes ?? 18;
  // ~3.2 min/km urban courier + buffer; clamp for demo realism
  const travel = Math.max(8, Math.round(km * 3.2));
  const mid = prep + travel;
  const minMinutes = Math.max(15, mid - 5);
  const maxMinutes = Math.min(75, mid + 7);
  return {
    minMinutes,
    maxMinutes,
    label: `${minMinutes}–${maxMinutes} min`,
  };
}

export function etaLabelOrNull(
  origin: { lat: number; lng: number } | null | undefined,
  restaurant: { lat: number; lng: number },
): string | null {
  if (!origin) return null;
  return estimateDeliveryEta({
    originLat: origin.lat,
    originLng: origin.lng,
    restaurantLat: restaurant.lat,
    restaurantLng: restaurant.lng,
  }).label;
}
