/**
 * Cuisine-templated dietary / allergen tags for demo menus.
 * Places ingest has no real allergen data — this is an approximation only.
 */
import {
  type AllergenId,
  type DietId,
  serializeTags,
} from "../src/lib/dietary";

export type TaggedMenuFields = {
  dietaryTags: string;
  allergens: string;
};

export type TagableMenuItem = {
  name: string;
  description: string;
  priceCents: number;
  image?: string;
  dietaryTags?: DietId[];
  allergens?: AllergenId[];
};

export type TagableCategory = {
  name: string;
  items: TagableMenuItem[];
};

export type TaggedMenuItem = Omit<TagableMenuItem, "dietaryTags" | "allergens"> &
  TaggedMenuFields;

export type TaggedCategory = {
  name: string;
  items: TaggedMenuItem[];
};

type TagInput = {
  name: string;
  description: string;
  dietaryTags?: DietId[];
  allergens?: AllergenId[];
  categoryName?: string;
  cuisineKey?: string;
};

const PEANUT_RE =
  /\b(peanut|peanuts|satay|massaman|crushed peanuts?|peanut sauce)\b/i;
const TREE_NUT_RE =
  /\b(almond|almonds|cashew|cashews|walnut|walnuts|pistachio|pistachios|hazelnut|hazelnuts|macadamia|pecan|pecans|tree.?nuts?)\b/i;
const VEGAN_RE = /\b(vegan|plant-based)\b/i;
const VEGETARIAN_RE =
  /\b(vegetarian|veggie|paneer|falafel|margherita|mushroom swiss|avocado toast|granola|edamame|seaweed salad|dal makhani|palak paneer|samosas?|onion bhaji|raita|guacamole|elote|garden salad|side salad|veggie bowl|veggie patty|risotto funghi|penne arrabbiata)\b/i;
const MEAT_RE =
  /\b(chicken|beef|pork|lamb|bacon|ham|salami|pepperoni|prawn|salmon|tuna|fish|squid|barramundi|flathead|meat|sausage|pancetta|katsu|gyoza|burrito|taco|quesadilla|parmigiana|bolognese|carbonara|satay|massaman|rogan josh|butter chicken)\b/i;
const GLUTEN_FREE_RE = /\b(gluten-?free|\bgf\b)\b/i;
const HALAL_RE = /\bhalal\b/i;
const DRINK_RE =
  /\b(ginger beer|lemonade|sparkling water|flat white|iced latte|fresh juice|hot chocolate|miso soup)\b/i;
const DAIRY_DRINK_RE =
  /\b(flat white|latte|cappuccino|macchiato|mocha|chai|hot chocolate|milkshake|thickshake|thai iced tea|milk|cream|yoghurt)\b/i;
const SAFE_SIDE_RE =
  /\b(jasmine rice|thick-cut chips|extra chips|chips|onion rings|garlic bread|edamame|seaweed salad|garden salad|side salad|raita|guacamole & chips)\b/i;

/** Derive demo dietary tags + allergens from item copy and optional overrides. */
export function tagMenuItem(input: TagInput): TaggedMenuFields {
  const haystack = `${input.name} ${input.description}`;
  const allergens = new Set<AllergenId>(input.allergens ?? []);
  const diets = new Set<DietId>(input.dietaryTags ?? []);

  if (PEANUT_RE.test(haystack)) allergens.add("peanuts");
  if (TREE_NUT_RE.test(haystack)) allergens.add("tree-nuts");

  if (VEGAN_RE.test(haystack)) {
    diets.add("vegan");
    diets.add("vegetarian");
  }
  if (VEGETARIAN_RE.test(haystack) && !MEAT_RE.test(haystack)) {
    diets.add("vegetarian");
  }
  if (GLUTEN_FREE_RE.test(haystack)) diets.add("gluten-free");
  if (HALAL_RE.test(haystack)) diets.add("halal");

  const cuisine = (input.cuisineKey ?? "").toLowerCase();
  if (
    cuisine === "indian" &&
    MEAT_RE.test(haystack) &&
    !/\bpork\b|\bbacon\b/i.test(haystack)
  ) {
    diets.add("halal");
  }

  const category = (input.categoryName ?? "").toLowerCase();
  const looksLikeDrink =
    category.includes("drink") ||
    category.includes("coffee") ||
    DRINK_RE.test(input.name);
  const looksLikeSafeSide =
    SAFE_SIDE_RE.test(input.name) ||
    (category.includes("side") &&
      !PEANUT_RE.test(haystack) &&
      !TREE_NUT_RE.test(haystack));

  // Conservative nut-free: only mark when clearly a drink/safe side or explicitly overridden,
  // and never when peanut/tree-nut allergens are present.
  if (allergens.has("peanuts") || allergens.has("tree-nuts")) {
    diets.delete("nut-free");
  } else if (
    diets.has("nut-free") ||
    looksLikeDrink ||
    looksLikeSafeSide ||
    /\bnut-?free\b/i.test(haystack)
  ) {
    diets.add("nut-free");
  }

  // Drinks in this demo catalog are gluten-free and halal, but milk-based ones
  // (flat white, latte, hot chocolate) are only vegetarian — never vegan.
  if (looksLikeDrink) {
    diets.add("vegetarian");
    diets.add("gluten-free");
    diets.add("halal");
    if (!DAIRY_DRINK_RE.test(haystack)) diets.add("vegan");
  }

  // Vegan implies vegetarian.
  if (diets.has("vegan")) diets.add("vegetarian");

  const orderedDiets: DietId[] = (
    ["vegan", "vegetarian", "gluten-free", "halal", "nut-free"] as const
  ).filter((id) => diets.has(id));
  const orderedAllergens: AllergenId[] = (
    ["peanuts", "tree-nuts"] as const
  ).filter((id) => allergens.has(id));

  return {
    dietaryTags: serializeTags(orderedDiets),
    allergens: serializeTags(orderedAllergens),
  };
}

/** Apply tagging across menu categories; returns venue-level dietary tag union. */
export function tagMenuCategories(
  categories: TagableCategory[],
  cuisineKey?: string,
): {
  categories: TaggedCategory[];
  restaurantDietaryTags: string;
} {
  const venueDiets = new Set<DietId>();
  const tagged: TaggedCategory[] = categories.map((cat) => ({
    name: cat.name,
    items: cat.items.map((item) => {
      const fields = tagMenuItem({
        name: item.name,
        description: item.description,
        dietaryTags: item.dietaryTags,
        allergens: item.allergens,
        categoryName: cat.name,
        cuisineKey,
      });
      for (const tag of JSON.parse(fields.dietaryTags) as DietId[]) {
        venueDiets.add(tag);
      }
      return {
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        image: item.image,
        dietaryTags: fields.dietaryTags,
        allergens: fields.allergens,
      };
    }),
  }));

  const ordered = (
    ["vegan", "vegetarian", "gluten-free", "halal", "nut-free"] as const
  ).filter((id) => venueDiets.has(id));

  return {
    categories: tagged,
    restaurantDietaryTags: serializeTags(ordered),
  };
}
