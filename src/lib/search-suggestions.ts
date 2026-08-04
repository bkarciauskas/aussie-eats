import type { DemoCity } from "@/lib/cities";

const RECENT_SEARCHES_KEY = "aussieeats_recent_searches_v1";
const MAX_RECENT_SEARCHES = 8;

export type RestaurantSuggestion = {
  kind: "restaurant";
  label: string;
  slug: string;
  detail: string;
};

export type CuisineSuggestion = {
  kind: "cuisine";
  label: string;
};

export type CitySuggestion = {
  kind: "city";
  label: string;
  cityId: string;
};

export type SuburbSuggestion = {
  kind: "suburb";
  label: string;
};

export type RecentSuggestion = {
  kind: "recent";
  label: string;
};

export type SearchSuggestion =
  | RestaurantSuggestion
  | CuisineSuggestion
  | CitySuggestion
  | SuburbSuggestion
  | RecentSuggestion;

export type SuggestibleRestaurant = {
  name: string;
  slug: string;
  suburb: string;
  city: string;
};

type BuildSearchSuggestionsInput = {
  query: string;
  restaurants: SuggestibleRestaurant[];
  cuisines: string[];
  suburbs: string[];
  cities: DemoCity[];
  limit?: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function matchRank(label: string, query: string): number {
  const normalized = label.toLowerCase();
  if (normalized === query) return 0;
  if (normalized.startsWith(query)) return 1;
  return normalized.includes(query) ? 2 : Number.POSITIVE_INFINITY;
}

function ranked<T>(
  items: T[],
  query: string,
  labelFor: (item: T) => string,
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      rank: matchRank(labelFor(item), query),
    }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}

export function buildSearchSuggestions({
  query,
  restaurants,
  cuisines,
  suburbs,
  cities,
  limit = 8,
}: BuildSearchSuggestionsInput): SearchSuggestion[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || limit <= 0) return [];

  const suggestions: SearchSuggestion[] = [
    ...ranked(restaurants, normalizedQuery, (restaurant) => restaurant.name).map(
      (restaurant): RestaurantSuggestion => ({
        kind: "restaurant",
        label: restaurant.name,
        slug: restaurant.slug,
        detail: `${restaurant.suburb}, ${restaurant.city}`,
      }),
    ),
    ...ranked(cuisines, normalizedQuery, (cuisine) => cuisine).map(
      (cuisine): CuisineSuggestion => ({
        kind: "cuisine",
        label: cuisine,
      }),
    ),
    ...ranked(cities, normalizedQuery, (city) => city.label).map(
      (city): CitySuggestion => ({
        kind: "city",
        label: city.label,
        cityId: city.id,
      }),
    ),
    ...ranked(suburbs, normalizedQuery, (suburb) => suburb).map(
      (suburb): SuburbSuggestion => ({
        kind: "suburb",
        label: suburb,
      }),
    ),
  ];

  return suggestions.slice(0, limit);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export function loadRecentSearches(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return isStringArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(
  storage: StorageLike,
  query: string,
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches(storage);

  const searches = [
    trimmed,
    ...loadRecentSearches(storage).filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  return searches;
}

export function clearRecentSearches(storage: StorageLike): void {
  storage.removeItem(RECENT_SEARCHES_KEY);
}

export function isSearchSuggestion(value: unknown): value is SearchSuggestion {
  if (!value || typeof value !== "object") return false;
  if (!("kind" in value) || !("label" in value)) return false;
  if (typeof value.kind !== "string" || typeof value.label !== "string") {
    return false;
  }

  switch (value.kind) {
    case "restaurant":
      return (
        "slug" in value &&
        "detail" in value &&
        typeof value.slug === "string" &&
        typeof value.detail === "string"
      );
    case "city":
      return "cityId" in value && typeof value.cityId === "string";
    case "cuisine":
    case "suburb":
    case "recent":
      return true;
    default:
      return false;
  }
}
