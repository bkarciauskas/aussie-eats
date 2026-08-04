import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  demoCityLabel,
  matchesRestaurantCity,
  resolveRestaurantQuery,
} from "./cities";

describe("resolveRestaurantQuery", () => {
  it("does not treat a restaurant name as a city filter", () => {
    assert.deepEqual(
      resolveRestaurantQuery({ q: "Bondi Slice House", city: "Bondi Slice House" }),
      { q: "Bondi Slice House", city: "" },
    );
  });

  it("keeps valid demo city ids and promotes bare city queries", () => {
    assert.deepEqual(resolveRestaurantQuery({ q: "", city: "melbourne" }), {
      q: "",
      city: "melbourne",
    });
    assert.deepEqual(resolveRestaurantQuery({ q: "Sydney" }), {
      q: "",
      city: "sydney",
    });
  });

  it("drops invalid city values from the dropdown path", () => {
    assert.deepEqual(
      resolveRestaurantQuery({
        q: "pizza",
        city: "Bondi Slice House",
        explicitCity: true,
      }),
      { q: "pizza", city: "" },
    );
  });
});

describe("matchesRestaurantCity", () => {
  it("ignores unknown city filters so stale URLs still show results", () => {
    assert.equal(matchesRestaurantCity("Sydney", "Bondi Slice House"), true);
  });

  it("filters by demo city id or label", () => {
    assert.equal(matchesRestaurantCity("Sydney", "sydney"), true);
    assert.equal(matchesRestaurantCity("Melbourne", "sydney"), false);
  });
});

describe("demoCityLabel", () => {
  it("returns empty for non-demo city strings", () => {
    assert.equal(demoCityLabel("Bondi Slice House"), "");
    assert.equal(demoCityLabel("melbourne"), "Melbourne");
  });
});
