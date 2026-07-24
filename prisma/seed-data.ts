export type MenuSeed = {
  name: string;
  description: string;
  priceCents: number;
  image?: string;
};

export type CategorySeed = {
  name: string;
  items: MenuSeed[];
};

export type RestaurantSeed = {
  name: string;
  slug: string;
  description: string;
  image: string;
  cuisineTags: string[];
  city: string;
  suburb: string;
  lat: number;
  lng: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  rating: number;
  phone: string;
  categories: CategorySeed[];
};

function cats(
  groups: { name: string; items: MenuSeed[] }[],
): CategorySeed[] {
  return groups;
}

export const restaurants: RestaurantSeed[] = [
  // —— Sydney ——
  {
    name: "Harbour Burger Co",
    slug: "harbour-burger-co",
    description: "Smash burgers and thick-cut chips with harbour views energy.",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: ["Burgers", "American", "Fast food"],
    city: "Sydney",
    suburb: "Surry Hills",
    lat: -33.883,
    lng: 151.214,
    deliveryFeeCents: 450,
    minOrderCents: 1500,
    rating: 4.7,
    phone: "+61 2 9000 1101",
    categories: cats([
      {
        name: "Burgers",
        items: [
          { name: "Classic Smash", description: "Double beef, American cheddar, pickles, soft bun.", priceCents: 1890, image: "/images/food/burger.jpg" },
          { name: "Bacon BBQ", description: "Crispy bacon, smoky BBQ, onion jam.", priceCents: 2190, image: "/images/food/burger.jpg" },
          { name: "Mushroom Swiss", description: "Swiss cheese, garlic mushrooms, aioli.", priceCents: 2090 },
          { name: "Veggie Patty", description: "Plant-based patty, lettuce, tomato, vegan mayo.", priceCents: 1990 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Thick-cut chips", description: "Sea salt and house tomato sauce.", priceCents: 650 },
          { name: "Onion rings", description: "Beer-battered, crispy.", priceCents: 750 },
          { name: "Loaded fries", description: "Cheese sauce, bacon bits, spring onion.", priceCents: 1100 },
        ],
      },
      {
        name: "Drinks",
        items: [
          { name: "Ginger beer", description: "Local brew, ice-cold.", priceCents: 450 },
          { name: "Lemonade", description: "Fresh lemon, lightly sparkling.", priceCents: 400 },
        ],
      },
    ]),
  },
  {
    name: "Newtown Thai Kitchen",
    slug: "newtown-thai-kitchen",
    description: "Punchy Thai classics with fragrant herbs and chilli heat.",
    image: "/images/restaurants/thai.jpg",
    cuisineTags: ["Thai", "Asian", "Noodles"],
    city: "Sydney",
    suburb: "Newtown",
    lat: -33.8978,
    lng: 151.179,
    deliveryFeeCents: 500,
    minOrderCents: 2000,
    rating: 4.6,
    phone: "+61 2 9000 2202",
    categories: cats([
      {
        name: "Starters",
        items: [
          { name: "Chicken satay", description: "Grilled skewers with peanut sauce.", priceCents: 1400 },
          { name: "Spring rolls", description: "Crispy veg rolls, sweet chilli.", priceCents: 1100 },
          { name: "Tom yum soup", description: "Hot and sour prawn soup.", priceCents: 1500 },
        ],
      },
      {
        name: "Mains",
        items: [
          { name: "Pad Thai", description: "Rice noodles, tofu, egg, crushed peanuts.", priceCents: 1890, image: "/images/food/thai.jpg" },
          { name: "Green curry", description: "Chicken, eggplant, Thai basil, jasmine rice.", priceCents: 2190, image: "/images/food/thai.jpg" },
          { name: "Basil stir-fry", description: "Minced pork, chilli, holy basil.", priceCents: 1990 },
          { name: "Massaman beef", description: "Slow-cooked beef, potato, peanut.", priceCents: 2490 },
        ],
      },
      {
        name: "Rice & noodles",
        items: [
          { name: "Jasmine rice", description: "Steamed.", priceCents: 350 },
          { name: "Garlic noodles", description: "Wok-tossed egg noodles.", priceCents: 1200 },
        ],
      },
    ]),
  },
  {
    name: "Bondi Slice House",
    slug: "bondi-slice-house",
    description: "Wood-fired pizzas after a Bondi swim — thin crust, big flavour.",
    image: "/images/restaurants/pizza.jpg",
    cuisineTags: ["Pizza", "Italian", "Casual"],
    city: "Sydney",
    suburb: "Bondi",
    lat: -33.8915,
    lng: 151.2767,
    deliveryFeeCents: 550,
    minOrderCents: 1800,
    rating: 4.5,
    phone: "+61 2 9000 3303",
    categories: cats([
      {
        name: "Pizzas",
        items: [
          { name: "Margherita", description: "San Marzano, fior di latte, basil.", priceCents: 1890, image: "/images/food/pizza.jpg" },
          { name: "Pepperoni", description: "Spicy salami, mozzarella.", priceCents: 2190, image: "/images/food/pizza.jpg" },
          { name: "Prosciutto & rocket", description: "Parma ham, rocket, shaved parmesan.", priceCents: 2490 },
          { name: "Capricciosa", description: "Ham, mushroom, olive, artichoke.", priceCents: 2290 },
          { name: "Vegan garden", description: "Roasted veg, vegan cheese, pesto.", priceCents: 2190 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Garlic bread", description: "Wood-fired, herb butter.", priceCents: 800 },
          { name: "Caesar salad", description: "Cos, parmesan, croutons.", priceCents: 1400 },
        ],
      },
      {
        name: "Desserts",
        items: [
          { name: "Tiramisu", description: "Classic espresso sponge.", priceCents: 1100 },
          { name: "Gelato scoop", description: "Ask for today's flavour.", priceCents: 600 },
        ],
      },
    ]),
  },
  {
    name: "Parramatta Brew Cafe",
    slug: "parramatta-brew-cafe",
    description: "All-day brunch plates and specialty coffee for the west.",
    image: "/images/restaurants/cafe.jpg",
    cuisineTags: ["Cafe", "Brunch", "Coffee"],
    city: "Sydney",
    suburb: "Parramatta",
    lat: -33.8151,
    lng: 151.0011,
    deliveryFeeCents: 400,
    minOrderCents: 1200,
    rating: 4.4,
    phone: "+61 2 9000 4404",
    categories: cats([
      {
        name: "Brunch",
        items: [
          { name: "Avocado toast", description: "Sourdough, chilli flakes, poached eggs.", priceCents: 1890, image: "/images/food/cafe.jpg" },
          { name: "Big Aussie breakfast", description: "Eggs, bacon, sausage, tomato, hash brown.", priceCents: 2490 },
          { name: "Bircher muesli", description: "Apple, yoghurt, toasted seeds.", priceCents: 1400 },
          { name: "Eggs Benedict", description: "Ham, hollandaise, English muffin.", priceCents: 2190 },
        ],
      },
      {
        name: "Coffee",
        items: [
          { name: "Flat white", description: "Double shot, silky milk.", priceCents: 500 },
          { name: "Long black", description: "Strong and clean.", priceCents: 450 },
          { name: "Iced latte", description: "Over ice.", priceCents: 550 },
        ],
      },
      {
        name: "Bakes",
        items: [
          { name: "Banana bread", description: "Toasted with butter.", priceCents: 650 },
          { name: "Sausage roll", description: "Flaky pastry, tomato relish.", priceCents: 750 },
        ],
      },
    ]),
  },
  {
    name: "Manly Sushi Bar",
    slug: "manly-sushi-bar",
    description: "Fresh rolls and donburi steps from the ferry wharf.",
    image: "/images/restaurants/sushi.jpg",
    cuisineTags: ["Sushi", "Japanese", "Seafood"],
    city: "Sydney",
    suburb: "Manly",
    lat: -33.7969,
    lng: 151.287,
    deliveryFeeCents: 600,
    minOrderCents: 2200,
    rating: 4.8,
    phone: "+61 2 9000 5505",
    categories: cats([
      {
        name: "Rolls",
        items: [
          { name: "Salmon avocado roll", description: "8 pieces.", priceCents: 1600, image: "/images/food/sushi.jpg" },
          { name: "Spicy tuna roll", description: "8 pieces, chilli mayo.", priceCents: 1700 },
          { name: "California roll", description: "Crab stick, avocado, cucumber.", priceCents: 1400 },
          { name: "Tempura prawn roll", description: "Crispy prawn, eel sauce.", priceCents: 1800 },
        ],
      },
      {
        name: "Donburi",
        items: [
          { name: "Salmon don", description: "Rice bowl, salmon, edamame.", priceCents: 2290, image: "/images/food/sushi.jpg" },
          { name: "Chicken katsu don", description: "Crumbed chicken, egg, onion.", priceCents: 2190 },
          { name: "Tofu teriyaki don", description: "Glazed tofu, sesame.", priceCents: 1990 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Miso soup", description: "Silken tofu, wakame.", priceCents: 450 },
          { name: "Edamame", description: "Sea salt.", priceCents: 600 },
          { name: "Gyoza (5)", description: "Pan-fried pork dumplings.", priceCents: 1100 },
        ],
      },
    ]),
  },
  {
    name: "Surry Hills Spice",
    slug: "surry-hills-spice",
    description: "North Indian curries, tandoor breads, and fragrant biryani.",
    image: "/images/restaurants/indian.jpg",
    cuisineTags: ["Indian", "Curry", "Vegetarian"],
    city: "Sydney",
    suburb: "Surry Hills",
    lat: -33.8845,
    lng: 151.211,
    deliveryFeeCents: 450,
    minOrderCents: 2000,
    rating: 4.6,
    phone: "+61 2 9000 6606",
    categories: cats([
      {
        name: "Starters",
        items: [
          { name: "Samosas (2)", description: "Potato pea filling, mint chutney.", priceCents: 900 },
          { name: "Onion bhaji", description: "Crispy gram flour fritters.", priceCents: 1000 },
          { name: "Paneer tikka", description: "Tandoor-grilled cottage cheese.", priceCents: 1600 },
        ],
      },
      {
        name: "Curries",
        items: [
          { name: "Butter chicken", description: "Creamy tomato gravy, mild.", priceCents: 2290, image: "/images/food/indian.jpg" },
          { name: "Lamb rogan josh", description: "Kashmiri-style, aromatic.", priceCents: 2490 },
          { name: "Palak paneer", description: "Spinach, paneer, garam masala.", priceCents: 2090 },
          { name: "Dal makhani", description: "Black lentils, slow-cooked.", priceCents: 1890 },
        ],
      },
      {
        name: "Breads & rice",
        items: [
          { name: "Garlic naan", description: "Fresh from the tandoor.", priceCents: 450 },
          { name: "Biryani (chicken)", description: "Fragrant basmati, raita.", priceCents: 2290 },
          { name: "Steamed rice", description: "Basmati.", priceCents: 400 },
        ],
      },
    ]),
  },
  {
    name: "Chipotle Crossing",
    slug: "chipotle-crossing",
    description: "Build-your-own burritos and bowls with a Sydney kick.",
    image: "/images/restaurants/mexican.jpg",
    cuisineTags: ["Mexican", "Burritos", "Street food"],
    city: "Sydney",
    suburb: "Newtown",
    lat: -33.8955,
    lng: 151.1815,
    deliveryFeeCents: 450,
    minOrderCents: 1600,
    rating: 4.3,
    phone: "+61 2 9000 7707",
    categories: cats([
      {
        name: "Burritos",
        items: [
          { name: "Beef burrito", description: "Rice, beans, pico, cheese, chipotle.", priceCents: 1890, image: "/images/food/mexican.jpg" },
          { name: "Chicken burrito", description: "Grilled chicken, guacamole.", priceCents: 1790 },
          { name: "Bean burrito", description: "Black beans, corn salsa, vegan.", priceCents: 1690 },
        ],
      },
      {
        name: "Bowls",
        items: [
          { name: "Carnitas bowl", description: "Slow pork, rice, salsa verde.", priceCents: 1990 },
          { name: "Fish taco bowl", description: "Battered fish, slaw, lime crema.", priceCents: 2090 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Nachos", description: "Cheese, jalapeño, sour cream.", priceCents: 1400 },
          { name: "Guacamole & chips", description: "Fresh-made.", priceCents: 900 },
          { name: "Churros (3)", description: "Cinnamon sugar, chocolate dip.", priceCents: 800 },
        ],
      },
    ]),
  },
  {
    name: "Baker's Lane",
    slug: "bakers-lane",
    description: "Artisan loaves, pastries, and afternoon sweets.",
    image: "/images/restaurants/bakery.jpg",
    cuisineTags: ["Bakery", "Pastries", "Dessert"],
    city: "Sydney",
    suburb: "Parramatta",
    lat: -33.817,
    lng: 151.0035,
    deliveryFeeCents: 350,
    minOrderCents: 1000,
    rating: 4.7,
    phone: "+61 2 9000 8808",
    categories: cats([
      {
        name: "Pastries",
        items: [
          { name: "Croissant", description: "Butter laminate, flaky.", priceCents: 550, image: "/images/food/bakery.jpg" },
          { name: "Pain au chocolat", description: "Dark chocolate batons.", priceCents: 650 },
          { name: "Almond croissant", description: "Frangipane filled.", priceCents: 750 },
          { name: "Cinnamon scroll", description: "Cream cheese icing.", priceCents: 650 },
        ],
      },
      {
        name: "Cakes",
        items: [
          { name: "Lamington slice", description: "Chocolate coconut sponge.", priceCents: 600 },
          { name: "Lemon myrtle tart", description: "Native citrus curd.", priceCents: 750 },
          { name: "Flourless brownie", description: "GF, rich cocoa.", priceCents: 700 },
        ],
      },
      {
        name: "Bread",
        items: [
          { name: "Sourdough loaf", description: "Country white.", priceCents: 850 },
          { name: "Fruit toast (2)", description: "Thick-cut, butter.", priceCents: 700 },
        ],
      },
    ]),
  },

  // —— Melbourne ——
  {
    name: "Fitzroy Smash Yard",
    slug: "fitzroy-smash-yard",
    description: "Laneway smash burgers and milkshakes in the inner north.",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: ["Burgers", "American", "Casual"],
    city: "Melbourne",
    suburb: "Fitzroy",
    lat: -37.7985,
    lng: 144.9784,
    deliveryFeeCents: 450,
    minOrderCents: 1500,
    rating: 4.6,
    phone: "+61 3 9000 1101",
    categories: cats([
      {
        name: "Burgers",
        items: [
          { name: "Laneway Smash", description: "Double smash, pickles, American cheese.", priceCents: 1890, image: "/images/food/burger.jpg" },
          { name: "Chilli Cheese", description: "Jalapeños, cheese sauce, crispy onions.", priceCents: 2090 },
          { name: "Mushroom Melt", description: "Swiss, garlic mushrooms, aioli.", priceCents: 1990 },
          { name: "Plant Yard", description: "Plant patty, vegan cheddar.", priceCents: 1990 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Shoestring fries", description: "Salted, house sauce.", priceCents: 650 },
          { name: "Onion rings", description: "Beer batter.", priceCents: 750 },
        ],
      },
      {
        name: "Shakes",
        items: [
          { name: "Vanilla malt", description: "Thick and cold.", priceCents: 750 },
          { name: "Chocolate shake", description: "Dutch cocoa.", priceCents: 750 },
        ],
      },
    ]),
  },
  {
    name: "Carlton Nonna's Kitchen",
    slug: "carlton-nonnas-kitchen",
    description: "Homestyle pasta and wood-fired pizza near Lygon Street.",
    image: "/images/restaurants/pizza.jpg",
    cuisineTags: ["Italian", "Pizza", "Pasta"],
    city: "Melbourne",
    suburb: "Carlton",
    lat: -37.7982,
    lng: 144.9671,
    deliveryFeeCents: 500,
    minOrderCents: 2000,
    rating: 4.7,
    phone: "+61 3 9000 2202",
    categories: cats([
      {
        name: "Pasta",
        items: [
          { name: "Spaghetti ragu", description: "Slow beef ragu, parmesan.", priceCents: 2290 },
          { name: "Penne arrabbiata", description: "Chilli tomato, basil.", priceCents: 1990 },
          { name: "Mushroom risotto", description: "Arborio, thyme, pecorino.", priceCents: 2390 },
        ],
      },
      {
        name: "Pizza",
        items: [
          { name: "Margherita", description: "San Marzano, fior di latte.", priceCents: 1890, image: "/images/food/pizza.jpg" },
          { name: "Diavola", description: "Spicy salami, chilli oil.", priceCents: 2190, image: "/images/food/pizza.jpg" },
          { name: "Funghi", description: "Mushroom, rosemary, mozzarella.", priceCents: 2090 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Garlic focaccia", description: "Rosemary oil.", priceCents: 800 },
          { name: "Rocket salad", description: "Parmesan, balsamic.", priceCents: 1200 },
        ],
      },
    ]),
  },
  {
    name: "South Yarra Sushi Lab",
    slug: "south-yarra-sushi-lab",
    description: "Precision rolls and chirashi near Chapel Street.",
    image: "/images/restaurants/sushi.jpg",
    cuisineTags: ["Sushi", "Japanese", "Seafood"],
    city: "Melbourne",
    suburb: "South Yarra",
    lat: -37.8385,
    lng: 144.992,
    deliveryFeeCents: 500,
    minOrderCents: 2200,
    rating: 4.8,
    phone: "+61 3 9000 3303",
    categories: cats([
      {
        name: "Rolls",
        items: [
          { name: "Salmon avocado roll", description: "8 pieces.", priceCents: 1650, image: "/images/food/sushi.jpg" },
          { name: "Crispy prawn roll", description: "Tempura prawn, eel sauce.", priceCents: 1850 },
          { name: "Spicy tuna roll", description: "Chilli mayo.", priceCents: 1750 },
        ],
      },
      {
        name: "Bowls",
        items: [
          { name: "Chirashi bowl", description: "Chef’s assortment over sushi rice.", priceCents: 2690 },
          { name: "Chicken katsu don", description: "Crumbed chicken, egg.", priceCents: 2190 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Miso soup", description: "Wakame, tofu.", priceCents: 450 },
          { name: "Edamame", description: "Sea salt.", priceCents: 600 },
        ],
      },
    ]),
  },

  // —— Brisbane ——
  {
    name: "Valley Hot Pot & Grill",
    slug: "valley-hot-pot-grill",
    description: "Late-night Thai and noodle bowls in Fortitude Valley.",
    image: "/images/restaurants/thai.jpg",
    cuisineTags: ["Thai", "Asian", "Noodles"],
    city: "Brisbane",
    suburb: "Fortitude Valley",
    lat: -27.4571,
    lng: 153.0335,
    deliveryFeeCents: 450,
    minOrderCents: 1800,
    rating: 4.5,
    phone: "+61 7 9000 1101",
    categories: cats([
      {
        name: "Starters",
        items: [
          { name: "Chicken satay", description: "Peanut sauce.", priceCents: 1400 },
          { name: "Fish cakes", description: "Sweet chilli dip.", priceCents: 1300 },
        ],
      },
      {
        name: "Mains",
        items: [
          { name: "Pad Thai", description: "Prawn or tofu, crushed peanut.", priceCents: 1890, image: "/images/food/thai.jpg" },
          { name: "Red curry", description: "Chicken, bamboo, jasmine rice.", priceCents: 2190 },
          { name: "Drunken noodles", description: "Wide rice noodles, chilli basil.", priceCents: 1990 },
          { name: "Crispy pork belly", description: "Five-spice, chilli caramel.", priceCents: 2490 },
        ],
      },
      {
        name: "Drinks",
        items: [
          { name: "Thai iced tea", description: "Sweetened, over ice.", priceCents: 550 },
          { name: "Coconut water", description: "Chilled.", priceCents: 450 },
        ],
      },
    ]),
  },
  {
    name: "West End Bowl Co",
    slug: "west-end-bowl-co",
    description: "Bright burrito bowls and tacos for Brisbane’s west side.",
    image: "/images/restaurants/mexican.jpg",
    cuisineTags: ["Mexican", "Bowls", "Street food"],
    city: "Brisbane",
    suburb: "West End",
    lat: -27.4825,
    lng: 153.0128,
    deliveryFeeCents: 400,
    minOrderCents: 1500,
    rating: 4.4,
    phone: "+61 7 9000 2202",
    categories: cats([
      {
        name: "Bowls",
        items: [
          { name: "Chipotle chicken bowl", description: "Rice, black beans, salsa.", priceCents: 1890, image: "/images/food/mexican.jpg" },
          { name: "Carnitas bowl", description: "Slow pork, pico, lime.", priceCents: 1990 },
          { name: "Veggie burrito bowl", description: "Roasted veg, guacamole.", priceCents: 1790 },
        ],
      },
      {
        name: "Tacos",
        items: [
          { name: "Fish tacos (3)", description: "Battered fish, slaw, crema.", priceCents: 1890 },
          { name: "Al pastor tacos (3)", description: "Pineapple, coriander.", priceCents: 1790 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Elote corn", description: "Cotija, chilli mayo.", priceCents: 800 },
          { name: "Chips & guac", description: "Fresh avocado.", priceCents: 900 },
        ],
      },
    ]),
  },
  {
    name: "Paddington Pie & Pint",
    slug: "paddington-pie-pint",
    description: "Pub classics and wood-fired pizzas in Paddington.",
    image: "/images/restaurants/pizza.jpg",
    cuisineTags: ["Pizza", "Pub food", "Casual"],
    city: "Brisbane",
    suburb: "Paddington",
    lat: -27.4602,
    lng: 152.9995,
    deliveryFeeCents: 450,
    minOrderCents: 1800,
    rating: 4.5,
    phone: "+61 7 9000 3303",
    categories: cats([
      {
        name: "Pizza",
        items: [
          { name: "Margherita", description: "Tomato, mozzarella, basil.", priceCents: 1890, image: "/images/food/pizza.jpg" },
          { name: "Meat lovers", description: "Ham, salami, bacon.", priceCents: 2290 },
          { name: "BBQ chicken", description: "Smoky BBQ, red onion.", priceCents: 2190 },
        ],
      },
      {
        name: "Pub plates",
        items: [
          { name: "Chicken parmi", description: "Ham, cheese, chips, salad.", priceCents: 2490 },
          { name: "Beef pie", description: "Pepper gravy, mash.", priceCents: 1890 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Loaded wedges", description: "Sour cream, sweet chilli.", priceCents: 1100 },
          { name: "Garden salad", description: "House dressing.", priceCents: 900 },
        ],
      },
    ]),
  },

  // —— Perth ——
  {
    name: "Fremantle Fish House",
    slug: "fremantle-fish-house",
    description: "Crispy fish and chips with harbour breeze vibes.",
    image: "/images/restaurants/sushi.jpg",
    cuisineTags: ["Seafood", "Fish & chips", "Casual"],
    city: "Perth",
    suburb: "Fremantle",
    lat: -32.0569,
    lng: 115.7439,
    deliveryFeeCents: 550,
    minOrderCents: 1800,
    rating: 4.6,
    phone: "+61 8 9000 1101",
    categories: cats([
      {
        name: "Mains",
        items: [
          { name: "Beer-battered barramundi", description: "Chips, tartare, lemon.", priceCents: 2490, image: "/images/food/sushi.jpg" },
          { name: "Grilled salmon", description: "Seasonal greens, citrus butter.", priceCents: 2790 },
          { name: "Salt & pepper squid", description: "Chilli salt, aioli.", priceCents: 1890 },
          { name: "Fish burger", description: "Crispy fish, slaw, soft bun.", priceCents: 1990 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Chunky chips", description: "Sea salt.", priceCents: 650 },
          { name: "Garden salad", description: "House dressing.", priceCents: 900 },
          { name: "Mushy peas", description: "Classic.", priceCents: 450 },
        ],
      },
      {
        name: "Drinks",
        items: [
          { name: "Lemonade", description: "Fresh lemon.", priceCents: 400 },
          { name: "Ginger beer", description: "Local brew.", priceCents: 450 },
        ],
      },
    ]),
  },
  {
    name: "Subiaco Spice Route",
    slug: "subiaco-spice-route",
    description: "North Indian curries and tandoor breads in Subiaco.",
    image: "/images/restaurants/indian.jpg",
    cuisineTags: ["Indian", "Curry", "Vegetarian"],
    city: "Perth",
    suburb: "Subiaco",
    lat: -31.9488,
    lng: 115.8241,
    deliveryFeeCents: 450,
    minOrderCents: 2000,
    rating: 4.5,
    phone: "+61 8 9000 2202",
    categories: cats([
      {
        name: "Starters",
        items: [
          { name: "Samosas (2)", description: "Mint chutney.", priceCents: 900 },
          { name: "Paneer tikka", description: "Tandoor-grilled.", priceCents: 1600 },
        ],
      },
      {
        name: "Curries",
        items: [
          { name: "Butter chicken", description: "Mild creamy tomato.", priceCents: 2290, image: "/images/food/indian.jpg" },
          { name: "Lamb vindaloo", description: "Hot Goan-style.", priceCents: 2490 },
          { name: "Chana masala", description: "Chickpeas, tomato, spice.", priceCents: 1890 },
          { name: "Dal tadka", description: "Tempered yellow lentils.", priceCents: 1690 },
        ],
      },
      {
        name: "Breads & rice",
        items: [
          { name: "Garlic naan", description: "From the tandoor.", priceCents: 450 },
          { name: "Chicken biryani", description: "Basmati, raita.", priceCents: 2290 },
        ],
      },
    ]),
  },
  {
    name: "Leederville Burger Joint",
    slug: "leederville-burger-joint",
    description: "Smash burgers and shakes on Oxford Street.",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: ["Burgers", "American", "Fast food"],
    city: "Perth",
    suburb: "Leederville",
    lat: -31.9365,
    lng: 115.8415,
    deliveryFeeCents: 450,
    minOrderCents: 1500,
    rating: 4.4,
    phone: "+61 8 9000 3303",
    categories: cats([
      {
        name: "Burgers",
        items: [
          { name: "Classic smash", description: "Double beef, cheddar, pickles.", priceCents: 1890, image: "/images/food/burger.jpg" },
          { name: "Bacon jam", description: "Bacon jam, Swiss, aioli.", priceCents: 2190 },
          { name: "Plant smash", description: "Plant patty, vegan cheese.", priceCents: 1990 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Fries", description: "Sea salt.", priceCents: 650 },
          { name: "Onion rings", description: "Beer-battered.", priceCents: 750 },
        ],
      },
      {
        name: "Shakes",
        items: [
          { name: "Vanilla shake", description: "Thick and cold.", priceCents: 750 },
          { name: "Chocolate shake", description: "Dutch cocoa.", priceCents: 750 },
        ],
      },
    ]),
  },

  // —— Adelaide ——
  {
    name: "Glenelg Beach Cafe",
    slug: "glenelg-beach-cafe",
    description: "Brunch plates and flat whites a stroll from the jetty.",
    image: "/images/restaurants/cafe.jpg",
    cuisineTags: ["Cafe", "Brunch", "Coffee"],
    city: "Adelaide",
    suburb: "Glenelg",
    lat: -34.9805,
    lng: 138.5125,
    deliveryFeeCents: 450,
    minOrderCents: 1200,
    rating: 4.5,
    phone: "+61 8 9000 3303",
    categories: cats([
      {
        name: "Brunch",
        items: [
          { name: "Avocado toast", description: "Sourdough, chilli, poached eggs.", priceCents: 1890, image: "/images/food/cafe.jpg" },
          { name: "Jetty breakfast", description: "Eggs, bacon, hash brown, tomato.", priceCents: 2390 },
          { name: "Acai bowl", description: "Granola, seasonal fruit.", priceCents: 1600 },
          { name: "Eggs Florentine", description: "Spinach, hollandaise.", priceCents: 2090 },
        ],
      },
      {
        name: "Coffee",
        items: [
          { name: "Flat white", description: "Double shot.", priceCents: 500 },
          { name: "Iced latte", description: "Over ice.", priceCents: 550 },
          { name: "Long black", description: "Strong and clean.", priceCents: 450 },
        ],
      },
      {
        name: "Bakes",
        items: [
          { name: "Banana bread", description: "Toasted.", priceCents: 650 },
          { name: "Lamington", description: "Chocolate coconut.", priceCents: 550 },
        ],
      },
    ]),
  },
  {
    name: "North Adelaide Oven",
    slug: "north-adelaide-oven",
    description: "Wood-fired pies, pastries, and afternoon sweets.",
    image: "/images/restaurants/bakery.jpg",
    cuisineTags: ["Bakery", "Pastries", "Pie"],
    city: "Adelaide",
    suburb: "North Adelaide",
    lat: -34.9065,
    lng: 138.593,
    deliveryFeeCents: 350,
    minOrderCents: 1000,
    rating: 4.6,
    phone: "+61 8 9000 4404",
    categories: cats([
      {
        name: "Pies & pasties",
        items: [
          { name: "Beef pie", description: "Pepper gravy.", priceCents: 750, image: "/images/food/bakery.jpg" },
          { name: "Chicken mushroom pie", description: "Creamy filling.", priceCents: 800 },
          { name: "Vegetable pastie", description: "Seasonal veg.", priceCents: 700 },
        ],
      },
      {
        name: "Pastries",
        items: [
          { name: "Croissant", description: "Butter laminate.", priceCents: 550 },
          { name: "Pain au chocolat", description: "Dark chocolate.", priceCents: 650 },
          { name: "Vanilla slice", description: "Custard, icing.", priceCents: 650 },
        ],
      },
      {
        name: "Bread",
        items: [
          { name: "Sourdough loaf", description: "Country white.", priceCents: 850 },
          { name: "Fruit toast (2)", description: "Thick-cut.", priceCents: 700 },
        ],
      },
    ]),
  },
  {
    name: "Rundle Street Thai",
    slug: "rundle-street-thai",
    description: "Fragrant curries and noodle woks on Rundle Street.",
    image: "/images/restaurants/thai.jpg",
    cuisineTags: ["Thai", "Asian", "Noodles"],
    city: "Adelaide",
    suburb: "Adelaide CBD",
    lat: -34.9225,
    lng: 138.6065,
    deliveryFeeCents: 400,
    minOrderCents: 1800,
    rating: 4.5,
    phone: "+61 8 9000 5505",
    categories: cats([
      {
        name: "Starters",
        items: [
          { name: "Chicken satay", description: "Peanut sauce.", priceCents: 1400 },
          { name: "Spring rolls", description: "Sweet chilli.", priceCents: 1100 },
        ],
      },
      {
        name: "Mains",
        items: [
          { name: "Pad Thai", description: "Prawn or tofu.", priceCents: 1890, image: "/images/food/thai.jpg" },
          { name: "Green curry", description: "Chicken, Thai basil, rice.", priceCents: 2190 },
          { name: "Basil chilli stir-fry", description: "Minced pork, jasmine rice.", priceCents: 1990 },
        ],
      },
      {
        name: "Drinks",
        items: [
          { name: "Thai iced tea", description: "Sweetened.", priceCents: 550 },
          { name: "Coconut water", description: "Chilled.", priceCents: 450 },
        ],
      },
    ]),
  },

  // —— Hobart ——
  {
    name: "Salamanca Sourdough",
    slug: "salamanca-sourdough",
    description: "Market-morning loaves, pastries, and coffee by the waterfront.",
    image: "/images/restaurants/bakery.jpg",
    cuisineTags: ["Bakery", "Cafe", "Pastries"],
    city: "Hobart",
    suburb: "Salamanca",
    lat: -42.8867,
    lng: 147.3312,
    deliveryFeeCents: 400,
    minOrderCents: 1000,
    rating: 4.7,
    phone: "+61 3 9000 5505",
    categories: cats([
      {
        name: "Pastries",
        items: [
          { name: "Croissant", description: "Butter laminate.", priceCents: 550, image: "/images/food/bakery.jpg" },
          { name: "Apple danish", description: "Cinnamon apple.", priceCents: 650 },
          { name: "Cherry ripe brownie", description: "Local twist.", priceCents: 700 },
        ],
      },
      {
        name: "Savoury",
        items: [
          { name: "Ham & cheese croissant", description: "Warm.", priceCents: 850 },
          { name: "Spinach feta roll", description: "Flaky pastry.", priceCents: 750 },
        ],
      },
      {
        name: "Coffee",
        items: [
          { name: "Flat white", description: "Double shot.", priceCents: 500 },
          { name: "Long black", description: "Clean and strong.", priceCents: 450 },
        ],
      },
    ]),
  },
  {
    name: "Battery Point Bento",
    slug: "battery-point-bento",
    description: "Fresh sushi rolls and donburi in historic Battery Point.",
    image: "/images/restaurants/sushi.jpg",
    cuisineTags: ["Sushi", "Japanese", "Seafood"],
    city: "Hobart",
    suburb: "Battery Point",
    lat: -42.8895,
    lng: 147.3338,
    deliveryFeeCents: 500,
    minOrderCents: 2000,
    rating: 4.6,
    phone: "+61 3 9000 6606",
    categories: cats([
      {
        name: "Rolls",
        items: [
          { name: "Salmon avocado roll", description: "8 pieces.", priceCents: 1600, image: "/images/food/sushi.jpg" },
          { name: "Spicy tuna roll", description: "Chilli mayo.", priceCents: 1700 },
          { name: "Veggie roll", description: "Cucumber, avocado, carrot.", priceCents: 1400 },
        ],
      },
      {
        name: "Donburi",
        items: [
          { name: "Salmon don", description: "Rice, salmon, edamame.", priceCents: 2290 },
          { name: "Chicken katsu don", description: "Crumbed chicken, egg.", priceCents: 2190 },
          { name: "Tofu teriyaki don", description: "Glazed tofu.", priceCents: 1990 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Miso soup", description: "Wakame, tofu.", priceCents: 450 },
          { name: "Edamame", description: "Sea salt.", priceCents: 600 },
          { name: "Gyoza (5)", description: "Pan-fried.", priceCents: 1100 },
        ],
      },
    ]),
  },
  {
    name: "North Hobart Grill House",
    slug: "north-hobart-grill-house",
    description: "Char-grilled burgers and steaks on Elizabeth Street.",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: ["Burgers", "Grill", "Casual"],
    city: "Hobart",
    suburb: "North Hobart",
    lat: -42.8695,
    lng: 147.3155,
    deliveryFeeCents: 450,
    minOrderCents: 1600,
    rating: 4.5,
    phone: "+61 3 9000 7707",
    categories: cats([
      {
        name: "Burgers",
        items: [
          { name: "Harbour smash", description: "Double beef, cheddar, pickles.", priceCents: 1890, image: "/images/food/burger.jpg" },
          { name: "Bacon cheddar", description: "Crispy bacon, onion jam.", priceCents: 2190 },
          { name: "Mushroom Swiss", description: "Garlic mushrooms, Swiss.", priceCents: 2090 },
        ],
      },
      {
        name: "Grill",
        items: [
          { name: "Rump steak", description: "Chips, salad, pepper gravy.", priceCents: 2890 },
          { name: "Chicken schnitzel", description: "Parmy option, chips.", priceCents: 2490 },
        ],
      },
      {
        name: "Sides",
        items: [
          { name: "Thick-cut chips", description: "Sea salt.", priceCents: 650 },
          { name: "Onion rings", description: "Beer-battered.", priceCents: 750 },
        ],
      },
    ]),
  },
];
