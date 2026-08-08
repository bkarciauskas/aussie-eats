import {
  allergenLabels,
  dietLabels,
  parseAllergens,
  parseDietaryTags,
  type DietId,
} from "@/lib/dietary";

export function MenuItemBadges({
  dietaryTags,
  allergens,
  activeDiets = [],
}: {
  dietaryTags: string;
  allergens: string;
  activeDiets?: readonly DietId[];
}) {
  const diets = parseDietaryTags(dietaryTags);
  const allergenIds = parseAllergens(allergens);
  const nutFreeActive = activeDiets.includes("nut-free");
  const explicitlyNutFree = diets.includes("nut-free");
  const mayContainNuts =
    nutFreeActive && !explicitlyNutFree && allergenIds.length === 0;
  const hasNuts = allergenIds.length > 0;

  if (
    diets.length === 0 &&
    allergenIds.length === 0 &&
    !mayContainNuts
  ) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {dietLabels(diets).map((label) => (
        <span key={label} className="tag tag-diet">
          {label}
        </span>
      ))}
      {allergenLabels(allergenIds).map((label) => (
        <span key={label} className="tag tag-allergen">
          Contains {label.toLowerCase()}
        </span>
      ))}
      {mayContainNuts ? (
        <span className="tag tag-allergen">May contain nuts</span>
      ) : null}
      {hasNuts && nutFreeActive ? (
        <span className="tag tag-allergen">Not nut-free</span>
      ) : null}
    </div>
  );
}
