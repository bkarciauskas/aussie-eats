import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRestaurantSearchParams,
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
});
