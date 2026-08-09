"""Cuisine-templated dietary / allergen tags for demo menus.

Ported from prisma/tag-menu-item.ts. Places ingest has no real allergen data —
this is an approximation only.
"""

from __future__ import annotations

import re
from typing import Any, Optional, Union

from app.domain.dietary import DIET_IDS, coerce_tag_list, tags_for_storage

PEANUT_RE = re.compile(
    r"\b(peanut|peanuts|satay|massaman|crushed peanuts?|peanut sauce)\b",
    re.I,
)
TREE_NUT_RE = re.compile(
    r"\b(almond|almonds|cashew|cashews|walnut|walnuts|pistachio|pistachios|"
    r"hazelnut|hazelnuts|macadamia|pecan|pecans|tree.?nuts?)\b",
    re.I,
)
VEGAN_RE = re.compile(r"\b(vegan|plant-based)\b", re.I)
VEGETARIAN_RE = re.compile(
    r"\b(vegetarian|veggie|paneer|falafel|margherita|mushroom swiss|avocado toast|"
    r"granola|edamame|seaweed salad|dal makhani|palak paneer|samosas?|onion bhaji|"
    r"raita|guacamole|elote|garden salad|side salad|veggie bowl|veggie patty|"
    r"risotto funghi|penne arrabbiata)\b",
    re.I,
)
MEAT_RE = re.compile(
    r"\b(chicken|beef|pork|lamb|bacon|ham|salami|pepperoni|prawn|salmon|tuna|fish|"
    r"squid|barramundi|flathead|meat|sausage|pancetta|katsu|gyoza|burrito|taco|"
    r"quesadilla|parmigiana|bolognese|carbonara|satay|massaman|rogan josh|"
    r"butter chicken)\b",
    re.I,
)
GLUTEN_FREE_RE = re.compile(r"\b(gluten-?free|\bgf\b)\b", re.I)
HALAL_RE = re.compile(r"\bhalal\b", re.I)
DRINK_RE = re.compile(
    r"\b(ginger beer|lemonade|sparkling water|flat white|iced latte|fresh juice|"
    r"hot chocolate|miso soup)\b",
    re.I,
)
DAIRY_DRINK_RE = re.compile(
    r"\b(flat white|latte|cappuccino|macchiato|mocha|chai|hot chocolate|"
    r"milkshake|thickshake|thai iced tea|milk|cream|yoghurt)\b",
    re.I,
)
SAFE_SIDE_RE = re.compile(
    r"\b(jasmine rice|thick-cut chips|extra chips|chips|onion rings|garlic bread|"
    r"edamame|seaweed salad|garden salad|side salad|raita|guacamole & chips)\b",
    re.I,
)
PORK_RE = re.compile(r"\bpork\b|\bbacon\b", re.I)
NUT_FREE_RE = re.compile(r"\bnut-?free\b", re.I)

TagInput = Optional[Union[list[str], str]]


def tag_menu_item(
    *,
    name: str,
    description: str,
    dietary_tags: TagInput = None,
    allergens: TagInput = None,
    category_name: Optional[str] = None,
    cuisine_key: Optional[str] = None,
) -> dict[str, list[str]]:
    """Derive demo dietary tags + allergens from item copy and optional overrides."""
    haystack = f"{name} {description}"
    allergen_set = set(coerce_tag_list(allergens))
    diet_set = set(coerce_tag_list(dietary_tags))

    if PEANUT_RE.search(haystack):
        allergen_set.add("peanuts")
    if TREE_NUT_RE.search(haystack):
        allergen_set.add("tree-nuts")

    if VEGAN_RE.search(haystack):
        diet_set.add("vegan")
        diet_set.add("vegetarian")
    if VEGETARIAN_RE.search(haystack) and not MEAT_RE.search(haystack):
        diet_set.add("vegetarian")
    if GLUTEN_FREE_RE.search(haystack):
        diet_set.add("gluten-free")
    if HALAL_RE.search(haystack):
        diet_set.add("halal")

    cuisine = (cuisine_key or "").lower()
    if cuisine == "indian" and MEAT_RE.search(haystack) and not PORK_RE.search(haystack):
        diet_set.add("halal")

    category = (category_name or "").lower()
    looks_like_drink = (
        "drink" in category or "coffee" in category or bool(DRINK_RE.search(name))
    )
    looks_like_safe_side = bool(SAFE_SIDE_RE.search(name)) or (
        "side" in category
        and not PEANUT_RE.search(haystack)
        and not TREE_NUT_RE.search(haystack)
    )

    # Conservative nut-free: only mark when clearly a drink/safe side or explicitly
    # overridden, and never when peanut/tree-nut allergens are present.
    if "peanuts" in allergen_set or "tree-nuts" in allergen_set:
        diet_set.discard("nut-free")
    elif (
        "nut-free" in diet_set
        or looks_like_drink
        or looks_like_safe_side
        or NUT_FREE_RE.search(haystack)
    ):
        diet_set.add("nut-free")

    # Drinks in this demo catalog are gluten-free and halal, but milk-based ones
    # are only vegetarian — never vegan.
    if looks_like_drink:
        diet_set.add("vegetarian")
        diet_set.add("gluten-free")
        diet_set.add("halal")
        if not DAIRY_DRINK_RE.search(haystack):
            diet_set.add("vegan")

    if "vegan" in diet_set:
        diet_set.add("vegetarian")

    ordered_diets = [tag for tag in DIET_IDS if tag in diet_set]
    ordered_allergens = [tag for tag in ("peanuts", "tree-nuts") if tag in allergen_set]
    return {
        "dietaryTags": tags_for_storage(ordered_diets),
        "allergens": tags_for_storage(ordered_allergens),
    }


def tag_menu_categories(
    categories: list[dict[str, Any]],
    cuisine_key: Optional[str] = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Apply tagging across menu categories; returns venue-level dietary tag union."""
    venue_diets: set[str] = set()
    tagged: list[dict[str, Any]] = []

    for cat in categories:
        items_out: list[dict[str, Any]] = []
        for item in cat.get("items", []):
            fields = tag_menu_item(
                name=item["name"],
                description=item.get("description", ""),
                dietary_tags=item.get("dietaryTags"),
                allergens=item.get("allergens"),
                category_name=cat.get("name"),
                cuisine_key=cuisine_key,
            )
            for tag in fields["dietaryTags"]:
                venue_diets.add(tag)
            items_out.append(
                {
                    "name": item["name"],
                    "description": item.get("description", ""),
                    "priceCents": item["priceCents"],
                    "image": item.get("image"),
                    "dietaryTags": fields["dietaryTags"],
                    "allergens": fields["allergens"],
                }
            )
        tagged.append({"name": cat["name"], "items": items_out})

    ordered = [tag for tag in DIET_IDS if tag in venue_diets]
    return tagged, tags_for_storage(ordered)
