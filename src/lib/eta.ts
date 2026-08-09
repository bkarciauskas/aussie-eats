import { findDemoCity, DEMO_CITIES } from "@/lib/cities";
import type { DeliveryAddress } from "@/lib/orders";
import { OrderStatus, isOrderStatus } from "@/lib/roles";
import { distanceKm, type Origin } from "@/lib/restaurants";

export type EtaRange = {
  minMinutes: number;
  maxMinutes: number;
  label: string;
};

export type CourierEta = {
  kind: "eta";
  minMinutes: number;
  maxMinutes: number;
  label: string;
  /** Short headline for the courier card (e.g. "Arriving soon"). */
  headline: string;
};

export type CourierEtaResult =
  | CourierEta
  | { kind: "delivered" }
  | { kind: "cancelled" }
  | { kind: "unavailable" };

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

function travelMinutes(km: number): number {
  return Math.max(8, Math.round(km * 3.2));
}

function clampEta(mid: number, spread = 5): EtaRange {
  const minMinutes = Math.max(5, mid - spread);
  const maxMinutes = Math.min(75, mid + spread + 2);
  return {
    minMinutes,
    maxMinutes,
    label: `${minMinutes}–${maxMinutes} min`,
  };
}

/**
 * Mock courier ETA for the live order tracker.
 * Shrinks remaining time as the order advances through kitchen → road → door.
 */
export function estimateCourierEta(input: {
  status: string;
  originLat: number;
  originLng: number;
  restaurantLat: number;
  restaurantLng: number;
}): CourierEtaResult {
  if (input.status === OrderStatus.delivered) return { kind: "delivered" };
  if (input.status === OrderStatus.cancelled) return { kind: "cancelled" };
  if (!isOrderStatus(input.status)) return { kind: "unavailable" };

  const km = distanceKm(
    input.originLat,
    input.originLng,
    input.restaurantLat,
    input.restaurantLng,
  );
  const travel = travelMinutes(km);

  if (input.status === OrderStatus.out_for_delivery) {
    const eta = clampEta(Math.max(6, Math.round(travel * 0.85)), 3);
    return {
      kind: "eta",
      ...eta,
      headline: "Courier on the way",
    };
  }

  if (input.status === OrderStatus.preparing) {
    const prepLeft = 10;
    const eta = clampEta(prepLeft + travel, 4);
    return {
      kind: "eta",
      ...eta,
      headline: "Estimated arrival",
    };
  }

  // pending (and any other active status): full prep + travel
  const eta = estimateDeliveryEta({
    originLat: input.originLat,
    originLng: input.originLng,
    restaurantLat: input.restaurantLat,
    restaurantLng: input.restaurantLng,
  });
  return {
    kind: "eta",
    ...eta,
    headline: "Estimated arrival",
  };
}

/** Map a delivery suburb/state onto a demo city pin for distance math. */
export function originFromDeliveryAddress(
  address: Pick<DeliveryAddress, "suburb" | "state">,
): Origin | null {
  const suburbKey = address.suburb.trim().toLowerCase();
  if (suburbKey) {
    const bySuburb = DEMO_CITIES.find(
      (c) => c.suburb.toLowerCase() === suburbKey || c.label.toLowerCase() === suburbKey,
    );
    if (bySuburb) return { lat: bySuburb.lat, lng: bySuburb.lng };
  }

  const stateKey = address.state.trim().toUpperCase();
  if (stateKey) {
    const byState = DEMO_CITIES.find((c) => c.state === stateKey);
    if (byState) return { lat: byState.lat, lng: byState.lng };
  }

  return null;
}

/** Prefer live pin → delivery address → restaurant city. */
export function resolveOrderEtaOrigin(input: {
  location: Origin | null | undefined;
  address: Pick<DeliveryAddress, "suburb" | "state">;
  restaurantCity?: string | null;
}): Origin | null {
  if (input.location) return input.location;
  const fromAddress = originFromDeliveryAddress(input.address);
  if (fromAddress) return fromAddress;
  const city = findDemoCity(input.restaurantCity);
  return city ? { lat: city.lat, lng: city.lng } : null;
}
