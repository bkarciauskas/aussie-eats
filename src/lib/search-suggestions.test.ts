import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMO_CITIES } from "./cities";
import {
  buildSearchSuggestions,
  clearRecentSearches,
  loadRecentSearches,
  pushRecentSearch,
} from "./search-suggestions";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("buildSearchSuggestions", () => {
  const restaurants = [
    {
      name: "Harbour Burger Co",
      slug: "harbour-burger-co",
      suburb: "The Rocks",
      city: "Sydney",
    },
    {
      name: "Bondi Burger Bar",
      slug: "bondi-burger-bar",
      suburb: "Bondi",
      city: "Sydney",
    },
  ];

  it("returns mixed suggestions in category order", () => {
    const suggestions = buildSearchSuggestions({
      query: "bur",
      restaurants,
      cuisines: ["Burgers", "Italian"],
      suburbs: ["Burwood", "Bondi"],
      cities: DEMO_CITIES,
    });

    assert.deepEqual(
      suggestions.map(({ kind, label }) => ({ kind, label })),
      [
        { kind: "restaurant", label: "Harbour Burger Co" },
        { kind: "restaurant", label: "Bondi Burger Bar" },
        { kind: "cuisine", label: "Burgers" },
        { kind: "suburb", label: "Burwood" },
      ],
    );
  });

  it("ranks exact and prefix matches before substring matches", () => {
    const suggestions = buildSearchSuggestions({
      query: "burger",
      restaurants: [
        ...restaurants,
        {
          name: "Burger",
          slug: "burger",
          suburb: "Perth",
          city: "Perth",
        },
      ],
      cuisines: [],
      suburbs: [],
      cities: [],
    });

    assert.equal(suggestions[0]?.label, "Burger");
  });

  it("matches case-insensitively and respects the limit", () => {
    const suggestions = buildSearchSuggestions({
      query: "SYD",
      restaurants: [],
      cuisines: [],
      suburbs: ["Sydney Olympic Park"],
      cities: DEMO_CITIES,
      limit: 1,
    });

    assert.deepEqual(suggestions, [
      { kind: "city", label: "Sydney", cityId: "sydney" },
    ]);
  });

  it("returns no suggestions for an empty query", () => {
    assert.deepEqual(
      buildSearchSuggestions({
        query: " ",
        restaurants,
        cuisines: ["Burgers"],
        suburbs: ["Bondi"],
        cities: DEMO_CITIES,
      }),
      [],
    );
  });
});

describe("recent searches", () => {
  it("keeps newest searches first and deduplicates case-insensitively", () => {
    const storage = new MemoryStorage();
    pushRecentSearch(storage, "Burger");
    pushRecentSearch(storage, "Pizza");

    assert.deepEqual(pushRecentSearch(storage, " burger "), [
      "burger",
      "Pizza",
    ]);
  });

  it("keeps at most eight searches", () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 10; index += 1) {
      pushRecentSearch(storage, `Search ${index}`);
    }

    assert.deepEqual(loadRecentSearches(storage), [
      "Search 9",
      "Search 8",
      "Search 7",
      "Search 6",
      "Search 5",
      "Search 4",
      "Search 3",
      "Search 2",
    ]);
  });

  it("ignores malformed storage and clears saved searches", () => {
    const storage = new MemoryStorage();
    storage.setItem("aussieeats_recent_searches_v1", '{"bad":true}');
    assert.deepEqual(loadRecentSearches(storage), []);

    pushRecentSearch(storage, "Ramen");
    clearRecentSearches(storage);
    assert.deepEqual(loadRecentSearches(storage), []);
  });
});
