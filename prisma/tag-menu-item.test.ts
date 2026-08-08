import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tagMenuItem } from "./tag-menu-item";

function diets(input: {
  name: string;
  description: string;
  categoryName?: string;
  cuisineKey?: string;
}): string[] {
  return JSON.parse(tagMenuItem(input).dietaryTags) as string[];
}

describe("tagMenuItem drinks", () => {
  it("does not mark milk-based drinks vegan", () => {
    for (const drink of [
      { name: "Flat white", description: "Double shot, silky milk.", categoryName: "Coffee" },
      { name: "Iced latte", description: "Over ice.", categoryName: "Coffee" },
      { name: "Hot chocolate", description: "Dark cocoa.", categoryName: "Drinks" },
      { name: "Thai iced tea", description: "Sweetened, over ice.", categoryName: "Drinks" },
    ]) {
      const tags = diets(drink);
      assert.equal(tags.includes("vegan"), false, `${drink.name} should not be vegan`);
      assert.equal(tags.includes("vegetarian"), true, `${drink.name} should be vegetarian`);
    }
  });

  it("still marks dairy-free drinks vegan", () => {
    for (const drink of [
      { name: "Lemonade", description: "Fresh lemon, lightly sparkling.", categoryName: "Drinks" },
      { name: "Sparkling water", description: "Chilled.", categoryName: "Drinks" },
      { name: "Long black", description: "Strong and clean.", categoryName: "Coffee" },
    ]) {
      assert.equal(diets(drink).includes("vegan"), true, `${drink.name} should be vegan`);
    }
  });

  it("respects an explicit vegan override on a milk-style name", () => {
    const tags = JSON.parse(
      tagMenuItem({
        name: "Oat latte",
        description: "Oat milk, double shot.",
        categoryName: "Coffee",
        dietaryTags: ["vegan"],
      }).dietaryTags,
    ) as string[];
    assert.equal(tags.includes("vegan"), true);
  });
});
