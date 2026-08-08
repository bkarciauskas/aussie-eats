import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDietSearchParams,
  itemMatchesDiets,
  parseDietQuery,
  restaurantMatchesDiets,
  serializeDietQuery,
} from "./dietary";

describe("parseDietQuery", () => {
  it("parses comma-separated diet params", () => {
    assert.deepEqual(parseDietQuery({ diet: "vegan,gluten-free" }), [
      "vegan",
      "gluten-free",
    ]);
  });

  it("maps allergy=nuts to nut-free", () => {
    assert.deepEqual(parseDietQuery({ allergy: "nuts" }), ["nut-free"]);
    assert.deepEqual(parseDietQuery({ diet: "halal", allergy: "peanuts" }), [
      "halal",
      "nut-free",
    ]);
  });

  it("ignores unknown tokens", () => {
    assert.deepEqual(parseDietQuery({ diet: "keto,vegan" }), ["vegan"]);
  });
});

describe("itemMatchesDiets (conservative)", () => {
  it("requires explicit nut-free tag; unmarked fails", () => {
    assert.equal(
      itemMatchesDiets({ dietaryTags: "[]", allergens: "[]" }, ["nut-free"]),
      false,
    );
    assert.equal(
      itemMatchesDiets(
        { dietaryTags: '["nut-free"]', allergens: "[]" },
        ["nut-free"],
      ),
      true,
    );
  });

  it("rejects items that only list peanut allergens", () => {
    assert.equal(
      itemMatchesDiets(
        { dietaryTags: "[]", allergens: '["peanuts"]' },
        ["nut-free"],
      ),
      false,
    );
  });

  it("ANDs multiple diets", () => {
    assert.equal(
      itemMatchesDiets(
        { dietaryTags: '["vegan","vegetarian","nut-free"]', allergens: "[]" },
        ["vegan", "nut-free"],
      ),
      true,
    );
    assert.equal(
      itemMatchesDiets(
        { dietaryTags: '["vegan","vegetarian"]', allergens: "[]" },
        ["vegan", "nut-free"],
      ),
      false,
    );
  });
});

describe("restaurantMatchesDiets", () => {
  it("hides venues not tagged for the selected diet", () => {
    assert.equal(
      restaurantMatchesDiets({ dietaryTags: '["vegan"]' }, ["nut-free"]),
      false,
    );
    assert.equal(
      restaurantMatchesDiets(
        { dietaryTags: '["vegan","nut-free"]' },
        ["nut-free"],
      ),
      true,
    );
  });
});

describe("serialize / applyDietSearchParams", () => {
  it("writes diet and allergy=nuts for shareable links", () => {
    assert.equal(serializeDietQuery(["vegan", "nut-free"]), "vegan,nut-free");
    const params = new URLSearchParams();
    applyDietSearchParams(params, ["vegan", "nut-free"]);
    assert.equal(params.get("diet"), "vegan,nut-free");
    assert.equal(params.get("allergy"), "nuts");
  });

  it("clears params when no diets selected", () => {
    const params = new URLSearchParams("diet=vegan&allergy=nuts");
    applyDietSearchParams(params, []);
    assert.equal(params.get("diet"), null);
    assert.equal(params.get("allergy"), null);
  });
});
