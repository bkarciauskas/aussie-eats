import type { AllergenId, DietId } from "../src/lib/dietary";
import { tagMenuCategories } from "./tag-menu-item";

export type MenuSeed = {
  name: string;
  description: string;
  priceCents: number;
  image?: string;
  /** Explicit demo tags; merged with cuisine-templated heuristics at import/seed. */
  dietaryTags?: DietId[];
  allergens?: AllergenId[];
};

export type CategorySeed = {
  name: string;
  items: MenuSeed[];
};

function cats(groups: { name: string; items: MenuSeed[] }[]): CategorySeed[] {
  return groups;
}

const drinks: CategorySeed = {
  name: "Drinks",
  items: [
    { name: "Ginger beer", description: "Local brew, ice-cold.", priceCents: 450 },
    { name: "Lemonade", description: "Fresh lemon, lightly sparkling.", priceCents: 400 },
    { name: "Sparkling water", description: "Chilled.", priceCents: 350 },
  ],
};

const TEMPLATES: Record<string, CategorySeed[]> = {
  Burgers: cats([
    {
      name: "Burgers",
      items: [
        { name: "Classic Smash", description: "Double beef, cheddar, pickles, soft bun.", priceCents: 1890, image: "/images/food/burger.jpg" },
        { name: "Bacon BBQ", description: "Crispy bacon, smoky BBQ, onion jam.", priceCents: 2190, image: "/images/food/burger.jpg" },
        { name: "Mushroom Swiss", description: "Swiss cheese, garlic mushrooms, aioli.", priceCents: 2090 },
        {
          name: "Veggie Patty",
          description: "Plant-based patty, lettuce, tomato, vegan mayo.",
          priceCents: 1990,
          dietaryTags: ["vegan", "vegetarian", "nut-free"],
        },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          name: "Thick-cut chips",
          description: "Sea salt and house tomato sauce.",
          priceCents: 650,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
        { name: "Onion rings", description: "Beer-battered, crispy.", priceCents: 750, dietaryTags: ["vegetarian", "nut-free"] },
        { name: "Loaded fries", description: "Cheese sauce, bacon bits, spring onion.", priceCents: 1100 },
      ],
    },
    drinks,
  ]),
  Thai: cats([
    {
      name: "Starters",
      items: [
        {
          name: "Chicken satay",
          description: "Grilled skewers with peanut sauce.",
          priceCents: 1400,
          allergens: ["peanuts"],
        },
        {
          name: "Spring rolls",
          description: "Crispy veg rolls, sweet chilli.",
          priceCents: 1100,
          dietaryTags: ["vegan", "vegetarian", "nut-free"],
        },
        { name: "Tom yum soup", description: "Hot and sour prawn soup.", priceCents: 1500, dietaryTags: ["gluten-free", "nut-free"] },
      ],
    },
    {
      name: "Mains",
      items: [
        {
          name: "Pad Thai",
          description: "Rice noodles, tofu, egg, crushed peanuts.",
          priceCents: 1890,
          image: "/images/food/thai.jpg",
          allergens: ["peanuts"],
        },
        {
          name: "Green curry",
          description: "Chicken, eggplant, Thai basil, jasmine rice.",
          priceCents: 2190,
          image: "/images/food/thai.jpg",
          dietaryTags: ["gluten-free", "nut-free"],
        },
        { name: "Basil stir-fry", description: "Minced pork, chilli, holy basil.", priceCents: 1990 },
        {
          name: "Massaman beef",
          description: "Slow-cooked beef, potato, peanut.",
          priceCents: 2490,
          allergens: ["peanuts"],
        },
      ],
    },
    drinks,
  ]),
  Pizza: cats([
    {
      name: "Pizzas",
      items: [
        {
          name: "Margherita",
          description: "San Marzano tomato, mozzarella, basil.",
          priceCents: 1890,
          image: "/images/food/pizza.jpg",
          dietaryTags: ["vegetarian", "nut-free"],
        },
        { name: "Pepperoni", description: "Spicy salami, mozzarella.", priceCents: 2190, image: "/images/food/pizza.jpg", dietaryTags: ["nut-free"] },
        { name: "Hawaiian", description: "Ham, pineapple, mozzarella.", priceCents: 2090, dietaryTags: ["nut-free"] },
        { name: "BBQ Chicken", description: "Smoky BBQ base, red onion, mozzarella.", priceCents: 2290, dietaryTags: ["nut-free"] },
      ],
    },
    {
      name: "Sides",
      items: [
        { name: "Garlic bread", description: "Toasted with herb butter.", priceCents: 750, dietaryTags: ["vegetarian", "nut-free"] },
        {
          name: "Garden salad",
          description: "Leafy greens, vinaigrette.",
          priceCents: 900,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
      ],
    },
    drinks,
  ]),
  Italian: cats([
    {
      name: "Pasta",
      items: [
        { name: "Spaghetti bolognese", description: "Slow beef ragu, parmesan.", priceCents: 2190 },
        {
          name: "Penne arrabbiata",
          description: "Chilli tomato, garlic, parsley.",
          priceCents: 1990,
          dietaryTags: ["vegan", "vegetarian", "nut-free"],
        },
        { name: "Fettuccine carbonara", description: "Egg, pecorino, pancetta.", priceCents: 2290 },
      ],
    },
    {
      name: "Mains",
      items: [
        { name: "Chicken parmigiana", description: "Napoli, mozzarella, chips.", priceCents: 2690, dietaryTags: ["nut-free"] },
        {
          name: "Risotto funghi",
          description: "Mushroom, thyme, parmesan.",
          priceCents: 2390,
          dietaryTags: ["vegetarian", "gluten-free", "nut-free"],
        },
      ],
    },
    drinks,
  ]),
  Cafe: cats([
    {
      name: "Brunch",
      items: [
        {
          name: "Avocado toast",
          description: "Sourdough, lemon, chilli flakes.",
          priceCents: 1690,
          image: "/images/food/cafe.jpg",
          dietaryTags: ["vegan", "vegetarian", "nut-free"],
        },
        { name: "Eggs benedict", description: "Ham, hollandaise, English muffin.", priceCents: 1890 },
        { name: "Big breakfast", description: "Eggs, bacon, sausage, hash brown, toast.", priceCents: 2290 },
        {
          name: "Granola bowl",
          description: "Yoghurt, seasonal fruit, honey.",
          priceCents: 1490,
          dietaryTags: ["vegetarian"],
          allergens: ["tree-nuts"],
        },
      ],
    },
    {
      name: "Coffee & drinks",
      items: [
        { name: "Flat white", description: "Double shot.", priceCents: 500 },
        { name: "Iced latte", description: "Over ice.", priceCents: 550 },
        { name: "Fresh juice", description: "Orange or apple.", priceCents: 650 },
      ],
    },
  ]),
  Sushi: cats([
    {
      name: "Rolls",
      items: [
        {
          name: "Salmon avocado roll",
          description: "8 pieces.",
          priceCents: 1600,
          image: "/images/food/sushi.jpg",
          dietaryTags: ["gluten-free", "nut-free"],
        },
        { name: "California roll", description: "Crab stick, avocado, mayo.", priceCents: 1400, dietaryTags: ["nut-free"] },
        { name: "Spicy tuna roll", description: "Tuna, chilli mayo, cucumber.", priceCents: 1700, dietaryTags: ["nut-free"] },
      ],
    },
    {
      name: "Nigiri & bowls",
      items: [
        {
          name: "Salmon nigiri",
          description: "2 pieces.",
          priceCents: 900,
          image: "/images/food/sushi.jpg",
          dietaryTags: ["gluten-free", "nut-free"],
        },
        { name: "Teriyaki chicken bowl", description: "Rice, salad, sesame.", priceCents: 1890, dietaryTags: ["nut-free"] },
        {
          name: "Miso soup",
          description: "Tofu, wakame.",
          priceCents: 450,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
      ],
    },
    drinks,
  ]),
  Japanese: cats([
    {
      name: "Favourites",
      items: [
        { name: "Chicken katsu", description: "Crumbed chicken, tonkatsu sauce, rice.", priceCents: 2190 },
        { name: "Beef teriyaki", description: "Grilled beef, sticky glaze, rice.", priceCents: 2390, dietaryTags: ["nut-free"] },
        { name: "Gyoza", description: "Pan-fried dumplings, 6 pcs.", priceCents: 1200 },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          name: "Edamame",
          description: "Sea salt.",
          priceCents: 700,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
        {
          name: "Seaweed salad",
          description: "Sesame dressing.",
          priceCents: 850,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
      ],
    },
    drinks,
  ]),
  Indian: cats([
    {
      name: "Starters",
      items: [
        {
          name: "Samosas",
          description: "Potato pea, tamarind chutney.",
          priceCents: 1100,
          dietaryTags: ["vegan", "vegetarian", "halal", "nut-free"],
        },
        {
          name: "Onion bhaji",
          description: "Crispy gram flour fritters.",
          priceCents: 1000,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "halal", "nut-free"],
        },
      ],
    },
    {
      name: "Curries",
      items: [
        {
          name: "Butter chicken",
          description: "Creamy tomato, mild spice, rice.",
          priceCents: 2190,
          image: "/images/food/indian.jpg",
          dietaryTags: ["gluten-free", "halal", "nut-free"],
        },
        {
          name: "Lamb rogan josh",
          description: "Kashmiri spices, yoghurt.",
          priceCents: 2490,
          dietaryTags: ["gluten-free", "halal", "nut-free"],
        },
        {
          name: "Palak paneer",
          description: "Spinach, homemade paneer.",
          priceCents: 1990,
          dietaryTags: ["vegetarian", "gluten-free", "halal", "nut-free"],
        },
        {
          name: "Dal makhani",
          description: "Black lentils, butter, cream.",
          priceCents: 1790,
          dietaryTags: ["vegetarian", "gluten-free", "halal", "nut-free"],
        },
      ],
    },
    {
      name: "Breads & sides",
      items: [
        { name: "Garlic naan", description: "Tandoor baked.", priceCents: 450, dietaryTags: ["vegetarian", "halal", "nut-free"] },
        {
          name: "Raita",
          description: "Cucumber yoghurt.",
          priceCents: 400,
          dietaryTags: ["vegetarian", "gluten-free", "halal", "nut-free"],
        },
      ],
    },
  ]),
  Mexican: cats([
    {
      name: "Mains",
      items: [
        { name: "Beef burrito", description: "Rice, beans, pico, cheese.", priceCents: 1890, image: "/images/food/mexican.jpg", dietaryTags: ["nut-free"] },
        { name: "Chicken taco trio", description: "Three soft tacos, salsa verde.", priceCents: 1690, dietaryTags: ["nut-free"] },
        {
          name: "Veggie bowl",
          description: "Black beans, corn, avocado, lime.",
          priceCents: 1790,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
        { name: "Quesadilla", description: "Cheese, jalapeño, sour cream.", priceCents: 1590, dietaryTags: ["vegetarian", "nut-free"] },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          name: "Guacamole & chips",
          description: "House guac, tortilla chips.",
          priceCents: 900,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
        { name: "Elote", description: "Street corn, mayo, chilli, cotija.", priceCents: 750, dietaryTags: ["vegetarian", "gluten-free", "nut-free"] },
      ],
    },
    drinks,
  ]),
  Bakery: cats([
    {
      name: "Baked",
      items: [
        {
          name: "Sourdough loaf",
          description: "Same-day bake.",
          priceCents: 850,
          image: "/images/food/bakery.jpg",
          dietaryTags: ["vegan", "vegetarian", "nut-free"],
        },
        { name: "Croissant", description: "Butter, flaky.", priceCents: 550, dietaryTags: ["vegetarian", "nut-free"] },
        { name: "Meat pie", description: "Classic beef, tomato sauce.", priceCents: 750 },
        {
          name: "Vanilla slice",
          description: "Custard, passionfruit icing.",
          priceCents: 650,
          dietaryTags: ["vegetarian"],
          allergens: ["tree-nuts"],
        },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Flat white", description: "Double shot.", priceCents: 500 },
        { name: "Hot chocolate", description: "Dark cocoa.", priceCents: 550 },
      ],
    },
  ]),
  Seafood: cats([
    {
      name: "Fish & chips",
      items: [
        {
          name: "Beer-battered flathead",
          description: "Chips, tartare, lemon.",
          priceCents: 2290,
          image: "/images/food/sushi.jpg",
          dietaryTags: ["nut-free"],
        },
        {
          name: "Grilled barramundi",
          description: "Salad, lemon butter.",
          priceCents: 2690,
          dietaryTags: ["gluten-free", "nut-free"],
        },
        { name: "Salt & pepper squid", description: "Aioli.", priceCents: 1690, dietaryTags: ["nut-free"] },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          name: "Garden salad",
          description: "House dressing.",
          priceCents: 900,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
        {
          name: "Extra chips",
          description: "Sea salt.",
          priceCents: 650,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
      ],
    },
    drinks,
  ]),
  Default: cats([
    {
      name: "Mains",
      items: [
        { name: "Chef's special", description: "Ask the kitchen — seasonal favourite.", priceCents: 2190 },
        { name: "House burger", description: "Beef patty, salad, chips.", priceCents: 1890, image: "/images/food/burger.jpg" },
        {
          name: "Chicken salad",
          description: "Grilled chicken, greens, vinaigrette.",
          priceCents: 1790,
          dietaryTags: ["gluten-free", "nut-free"],
        },
        {
          name: "Veggie bowl",
          description: "Roast veg, grains, tahini.",
          priceCents: 1690,
          dietaryTags: ["vegan", "vegetarian"],
        },
      ],
    },
    {
      name: "Sides",
      items: [
        {
          name: "Chips",
          description: "Crispy, salted.",
          priceCents: 650,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
        {
          name: "Side salad",
          description: "Seasonal greens.",
          priceCents: 700,
          dietaryTags: ["vegan", "vegetarian", "gluten-free", "nut-free"],
        },
      ],
    },
    drinks,
  ]),
};

const TYPE_TO_CUISINE: { match: RegExp; key: string; tags: string[] }[] = [
  { match: /hamburger|burger/i, key: "Burgers", tags: ["Burgers", "American", "Fast food"] },
  { match: /thai/i, key: "Thai", tags: ["Thai", "Asian", "Noodles"] },
  { match: /pizza/i, key: "Pizza", tags: ["Pizza", "Italian", "Casual"] },
  { match: /italian|pasta/i, key: "Italian", tags: ["Italian", "Pasta", "Casual"] },
  { match: /cafe|coffee|brunch/i, key: "Cafe", tags: ["Cafe", "Brunch", "Coffee"] },
  { match: /sushi/i, key: "Sushi", tags: ["Sushi", "Japanese", "Seafood"] },
  { match: /japanese|ramen|izakaya/i, key: "Japanese", tags: ["Japanese", "Asian"] },
  { match: /indian|curry/i, key: "Indian", tags: ["Indian", "Curry", "Vegetarian"] },
  { match: /mexican|taco|burrito/i, key: "Mexican", tags: ["Mexican", "Street food"] },
  { match: /bakery|pastry|dessert/i, key: "Bakery", tags: ["Bakery", "Pastries", "Cafe"] },
  { match: /seafood|fish/i, key: "Seafood", tags: ["Seafood", "Fish & chips", "Casual"] },
  { match: /chinese|dim.?sum/i, key: "Default", tags: ["Chinese", "Asian"] },
  { match: /vietnamese|pho/i, key: "Default", tags: ["Vietnamese", "Asian", "Noodles"] },
  { match: /korean/i, key: "Default", tags: ["Korean", "Asian"] },
  { match: /greek|mediterranean/i, key: "Default", tags: ["Mediterranean", "Casual"] },
  { match: /steak|grill|bbq|barbecue/i, key: "Default", tags: ["Grill", "Casual"] },
];

export function resolveCuisineFromPlaces(input: {
  types: string[];
  primaryType?: string;
  displayName: string;
}): { templateKey: string; cuisineTags: string[] } {
  const haystack = [input.primaryType ?? "", ...input.types, input.displayName].join(" ");
  for (const row of TYPE_TO_CUISINE) {
    if (row.match.test(haystack)) {
      return { templateKey: row.key, cuisineTags: row.tags };
    }
  }
  return { templateKey: "Default", cuisineTags: ["Restaurant", "Casual"] };
}

export function menuForCuisine(templateKey: string): CategorySeed[] {
  return TEMPLATES[templateKey] ?? TEMPLATES.Default;
}

/** Deep-clone and tag menu categories for Prisma create payloads. */
export function cloneMenuCategories(templateKey: string) {
  const cloned = structuredClone(menuForCuisine(templateKey));
  return tagMenuCategories(cloned, templateKey);
}
