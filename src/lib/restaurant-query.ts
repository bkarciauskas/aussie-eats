import { findDemoCity, resolveRestaurantQuery } from "@/lib/cities";
import { applyDietSearchParams, parseDietQuery } from "@/lib/dietary";
import { parseCuisineTags } from "@/lib/restaurants";

export type SearchableRestaurant = {
  name: string;
  suburb: string;
  city: string;
  cuisineTags: string;
};

/** True when every query token appears in name, suburb, city, or cuisine tags. */
export function restaurantMatchesQuery(
  restaurant: SearchableRestaurant,
  q: string,
): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    restaurant.name,
    restaurant.suburb,
    restaurant.city,
    ...parseCuisineTags(restaurant.cuisineTags),
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(query)) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

export type BuildRestaurantSearchParamsInput = {
  rawQ: string;
  /** Existing `city` query param from the URL, if any. */
  urlCity?: string | null;
  /** Demo pin label/id from location storage (not an arbitrary suburb). */
  locationCity?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlace?: string | null;
  cuisine?: string | null;
  diet?: string | null;
  allergy?: string | null;
};

/**
 * Build `/restaurants` query params for the hero/header search box.
 * Text text searches nationally; city pin only applies when there is no text
 * query (or the query itself is a city name). Location lat/lng still sort results.
 */
export function buildRestaurantSearchParams(
  input: BuildRestaurantSearchParamsInput,
): URLSearchParams {
  const params = new URLSearchParams();
  if (input.cuisine) params.set("cuisine", input.cuisine);
  applyDietSearchParams(
    params,
    parseDietQuery({ diet: input.diet, allergy: input.allergy }),
  );

  const resolved = resolveRestaurantQuery({
    q: input.rawQ,
    city: input.urlCity || "",
  });

  if (resolved.q) {
    params.set("q", resolved.q);
  } else {
    const city =
      resolved.city ||
      findDemoCity(input.urlCity)?.id ||
      findDemoCity(input.locationCity)?.id ||
      "";
    if (city) params.set("city", city);
  }

  if (
    input.locationLat != null &&
    input.locationLng != null &&
    Number.isFinite(input.locationLat) &&
    Number.isFinite(input.locationLng)
  ) {
    params.set("lat", String(input.locationLat));
    params.set("lng", String(input.locationLng));
    if (input.locationPlace) params.set("place", input.locationPlace);
  }

  return params;
}
