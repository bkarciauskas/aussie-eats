import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRestaurantSearchParams,
  buildSuggestionPath,
  restaurantMatchesQuery,
} from "./restaurant-query";

describe("restaurantMatchesQuery", () => {
  const bondi = {
    name: "Bondi Slice House",
    suburb: "Bondi",
    city: "Sydney",
    cuisineTags: '["Pizza","Italian"]',
  };

  it("matches the full restaurant name", () => {
    assert.equal(restaurantMatchesQuery(bondi, "Bondi Slice House"), true);
  });

  it("matches case-insensitively and by tokens in any order", () => {
    assert.equal(restaurantMatchesQuery(bondi, "slice bondi"), true);
    assert.equal(restaurantMatchesQuery(bondi, "BONDI"), true);
  });

  it("matches suburb and cuisine tags", () => {
    assert.equal(restaurantMatchesQuery(bondi, "bondi"), true);
    assert.equal(restaurantMatchesQuery(bondi, "pizza"), true);
  });

  it("rejects unrelated queries", () => {
    assert.equal(restaurantMatchesQuery(bondi, "melbourne ramen"), false);
  });
});

describe("buildRestaurantSearchParams", () => {
  it("searches restaurant names nationally (ignores city pin)", () => {
    const params = buildRestaurantSearchParams({
      rawQ: "Bondi Slice House",
      urlCity: "melbourne",
      locationCity: "Melbourne",
      locationLat: -37.8136,
      locationLng: 144.9631,
      locationPlace: "Melbourne",
    });
    assert.equal(params.get("q"), "Bondi Slice House");
    assert.equal(params.get("city"), null);
    assert.equal(params.get("lat"), "-37.8136");
    assert.equal(params.get("place"), "Melbourne");
  });

  it("treats a bare city name as a city filter", () => {
    const params = buildRestaurantSearchParams({
      rawQ: "melbourne",
      locationCity: "Sydney",
    });
    assert.equal(params.get("q"), null);
    assert.equal(params.get("city"), "melbourne");
  });

  it("keeps the city pin when the search box is empty", () => {
    const params = buildRestaurantSearchParams({
      rawQ: "",
      locationCity: "Sydney",
    });
    assert.equal(params.get("q"), null);
    assert.equal(params.get("city"), "sydney");
  });

  it("never uses the raw query string as a city filter", () => {
    const params = buildRestaurantSearchParams({
      rawQ: "Bondi Slice House",
    });
    assert.equal(params.get("city"), null);
    assert.equal(params.get("q"), "Bondi Slice House");
  });

  it("preserves diet and allergy filters", () => {
    const params = buildRestaurantSearchParams({
      rawQ: "",
      locationCity: "Sydney",
      diet: "vegan",
      allergy: "nuts",
    });
    assert.equal(params.get("diet"), "vegan,nut-free");
    assert.equal(params.get("allergy"), "nuts");
  });
});

describe("buildSuggestionPath", () => {
  it("carries diet and allergy onto a restaurant menu", () => {
    assert.equal(
      buildSuggestionPath({
        path: "/restaurants/bondi-slice-house",
        diet: "vegan",
        allergy: "nuts",
      }),
      "/restaurants/bondi-slice-house?diet=vegan%2Cnut-free&allergy=nuts",
    );
  });

  it("keeps destination params alongside the diet filter", () => {
    const path = buildSuggestionPath({
      path: "/restaurants",
      params: { cuisine: "Thai", lat: "-33.8688", lng: "151.2093" },
      diet: "halal",
    });
    const params = new URLSearchParams(path.split("?")[1]);
    assert.equal(params.get("cuisine"), "Thai");
    assert.equal(params.get("lat"), "-33.8688");
    assert.equal(params.get("diet"), "halal");
    assert.equal(params.get("allergy"), null);
  });

  it("returns a bare path when nothing is active", () => {
    assert.equal(
      buildSuggestionPath({ path: "/restaurants/bondi-slice-house" }),
      "/restaurants/bondi-slice-house",
    );
  });
});
