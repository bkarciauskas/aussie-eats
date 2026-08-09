/** Demo dietary / allergy tags — not medical-grade allergen data. */

export const DIET_IDS = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "halal",
  "nut-free",
] as const;

export type DietId = (typeof DIET_IDS)[number];

export const ALLERGEN_IDS = ["peanuts", "tree-nuts"] as const;
export type AllergenId = (typeof ALLERGEN_IDS)[number];

export const DIET_FILTERS: { id: DietId; label: string }[] = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "halal", label: "Halal" },
  { id: "nut-free", label: "Nut-free" },
];

export const ALLERGEN_LABELS: Record<AllergenId, string> = {
  peanuts: "Peanuts",
  "tree-nuts": "Tree nuts",
};

const DIET_SET = new Set<string>(DIET_IDS);
const ALLERGEN_SET = new Set<string>(ALLERGEN_IDS);

export function isDietId(value: string): value is DietId {
  return DIET_SET.has(value);
}

export function isAllergenId(value: string): value is AllergenId {
  return ALLERGEN_SET.has(value);
}

export function parseJsonStringArray(
  raw: string | string[] | null | undefined,
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export function parseDietaryTags(
  raw: string | string[] | null | undefined,
): DietId[] {
  return parseJsonStringArray(raw).filter(isDietId);
}

export function parseAllergens(
  raw: string | string[] | null | undefined,
): AllergenId[] {
  return parseJsonStringArray(raw).filter(isAllergenId);
}

export function serializeTags(tags: readonly string[]): string {
  return JSON.stringify(tags);
}

/**
 * Parse shareable filter params.
 * Supports `diet=vegan,nut-free` and `allergy=nuts` (alias for nut-free).
 */
export function parseDietQuery(input: {
  diet?: string | null;
  allergy?: string | null;
}): DietId[] {
  const selected = new Set<DietId>();
  const dietRaw = (input.diet ?? "").trim();
  if (dietRaw) {
    for (const part of dietRaw.split(/[+,]/).map((p) => p.trim().toLowerCase())) {
      const normalized = part === "gf" ? "gluten-free" : part;
      if (isDietId(normalized)) selected.add(normalized);
    }
  }

  const allergy = (input.allergy ?? "").trim().toLowerCase();
  if (
    allergy === "nuts" ||
    allergy === "nut" ||
    allergy === "peanut" ||
    allergy === "peanuts" ||
    allergy === "tree-nuts"
  ) {
    selected.add("nut-free");
  }

  return DIET_IDS.filter((id) => selected.has(id));
}

export function serializeDietQuery(diets: readonly DietId[]): string {
  return diets.join(",");
}

/** Apply diet selection onto URLSearchParams (diet + allergy alias for nut-free). */
export function applyDietSearchParams(
  params: URLSearchParams,
  diets: readonly DietId[],
): void {
  if (diets.length === 0) {
    params.delete("diet");
    params.delete("allergy");
    return;
  }
  params.set("diet", serializeDietQuery(diets));
  if (diets.includes("nut-free")) params.set("allergy", "nuts");
  else params.delete("allergy");
}

export type DietaryTagged = {
  dietaryTags: string | string[];
  allergens?: string | string[] | null;
};

/**
 * Conservative match: every selected diet must be explicitly tagged.
 * Unmarked items fail nut-free (treated as “may contain nuts”).
 */
export function itemMatchesDiets(
  item: DietaryTagged,
  diets: readonly DietId[],
): boolean {
  if (diets.length === 0) return true;
  const tags = new Set(parseDietaryTags(item.dietaryTags));
  return diets.every((diet) => tags.has(diet));
}

/**
 * A venue matches only when one menu item satisfies every selected diet.
 * The venue's own `dietaryTags` is a union across the menu, so it can report
 * vegan + gluten-free when separate items supply each tag and the filtered menu
 * would render empty.
 */
export function restaurantMatchesDiets(
  restaurant: { menuItems: readonly DietaryTagged[] },
  diets: readonly DietId[],
): boolean {
  if (diets.length === 0) return true;
  return restaurant.menuItems.some((item) => itemMatchesDiets(item, diets));
}

export function dietLabels(diets: readonly DietId[]): string[] {
  return diets.map((id) => DIET_FILTERS.find((f) => f.id === id)?.label ?? id);
}

export function allergenLabels(allergens: readonly AllergenId[]): string[] {
  return allergens.map((id) => ALLERGEN_LABELS[id]);
}

/** Union dietary tags from menu items for venue-level browse filtering. */
export function unionDietaryTags(
  items: Iterable<{ dietaryTags: string }>,
): DietId[] {
  const set = new Set<DietId>();
  for (const item of items) {
    for (const tag of parseDietaryTags(item.dietaryTags)) set.add(tag);
  }
  return DIET_IDS.filter((id) => set.has(id));
}
