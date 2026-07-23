import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const Role = { CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" } as const;
const OrderStatus = {
  pending: "pending",
  preparing: "preparing",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
} as const;

const prisma = new PrismaClient();

type MenuSeed = {
  name: string;
  description: string;
  priceCents: number;
  image?: string;
};

type CategorySeed = {
  name: string;
  items: MenuSeed[];
};

type RestaurantSeed = {
  name: string;
  slug: string;
  description: string;
  image: string;
  cuisineTags: string[];
  suburb: string;
  lat: number;
  lng: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  rating: number;
  phone: string;
  categories: CategorySeed[];
};

const restaurants: RestaurantSeed[] = [
  {
    name: "Harbour Burger Co",
    slug: "harbour-burger-co",
    description: "Smash burgers and thick-cut chips with harbour views energy.",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: ["Burgers", "American", "Fast food"],
    suburb: "Surry Hills",
    lat: -33.8830,
    lng: 151.2140,
    deliveryFeeCents: 450,
    minOrderCents: 1500,
    rating: 4.7,
    phone: "+61 2 9000 1101",
    categories: [
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
    ],
  },
  {
    name: "Newtown Thai Kitchen",
    slug: "newtown-thai-kitchen",
    description: "Punchy Thai classics with fragrant herbs and chilli heat.",
    image: "/images/restaurants/thai.jpg",
    cuisineTags: ["Thai", "Asian", "Noodles"],
    suburb: "Newtown",
    lat: -33.8978,
    lng: 151.1790,
    deliveryFeeCents: 500,
    minOrderCents: 2000,
    rating: 4.6,
    phone: "+61 2 9000 2202",
    categories: [
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
    ],
  },
  {
    name: "Bondi Slice House",
    slug: "bondi-slice-house",
    description: "Wood-fired pizzas after a Bondi swim — thin crust, big flavour.",
    image: "/images/restaurants/pizza.jpg",
    cuisineTags: ["Pizza", "Italian", "Casual"],
    suburb: "Bondi",
    lat: -33.8915,
    lng: 151.2767,
    deliveryFeeCents: 550,
    minOrderCents: 1800,
    rating: 4.5,
    phone: "+61 2 9000 3303",
    categories: [
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
    ],
  },
  {
    name: "Parramatta Brew Cafe",
    slug: "parramatta-brew-cafe",
    description: "All-day brunch plates and specialty coffee for the west.",
    image: "/images/restaurants/cafe.jpg",
    cuisineTags: ["Cafe", "Brunch", "Coffee"],
    suburb: "Parramatta",
    lat: -33.8151,
    lng: 151.0011,
    deliveryFeeCents: 400,
    minOrderCents: 1200,
    rating: 4.4,
    phone: "+61 2 9000 4404",
    categories: [
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
    ],
  },
  {
    name: "Manly Sushi Bar",
    slug: "manly-sushi-bar",
    description: "Fresh rolls and donburi steps from the ferry wharf.",
    image: "/images/restaurants/sushi.jpg",
    cuisineTags: ["Sushi", "Japanese", "Seafood"],
    suburb: "Manly",
    lat: -33.7969,
    lng: 151.2870,
    deliveryFeeCents: 600,
    minOrderCents: 2200,
    rating: 4.8,
    phone: "+61 2 9000 5505",
    categories: [
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
    ],
  },
  {
    name: "Surry Hills Spice",
    slug: "surry-hills-spice",
    description: "North Indian curries, tandoor breads, and fragrant biryani.",
    image: "/images/restaurants/indian.jpg",
    cuisineTags: ["Indian", "Curry", "Vegetarian"],
    suburb: "Surry Hills",
    lat: -33.8845,
    lng: 151.2110,
    deliveryFeeCents: 450,
    minOrderCents: 2000,
    rating: 4.6,
    phone: "+61 2 9000 6606",
    categories: [
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
    ],
  },
  {
    name: "Chipotle Crossing",
    slug: "chipotle-crossing",
    description: "Build-your-own burritos and bowls with a Sydney kick.",
    image: "/images/restaurants/mexican.jpg",
    cuisineTags: ["Mexican", "Burritos", "Street food"],
    suburb: "Newtown",
    lat: -33.8955,
    lng: 151.1815,
    deliveryFeeCents: 450,
    minOrderCents: 1600,
    rating: 4.3,
    phone: "+61 2 9000 7707",
    categories: [
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
    ],
  },
  {
    name: "Baker's Lane",
    slug: "bakers-lane",
    description: "Artisan loaves, pastries, and afternoon sweets.",
    image: "/images/restaurants/bakery.jpg",
    cuisineTags: ["Bakery", "Pastries", "Dessert"],
    suburb: "Parramatta",
    lat: -33.8170,
    lng: 151.0035,
    deliveryFeeCents: 350,
    minOrderCents: 1000,
    rating: 4.7,
    phone: "+61 2 9000 8808",
    categories: [
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
    ],
  },
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  const customerHash = await bcrypt.hash("demo1234", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);

  const customer = await prisma.user.create({
    data: {
      email: "demo@aussieeats.local",
      passwordHash: customerHash,
      name: "Demo Customer",
      role: Role.CUSTOMER,
      addresses: {
        create: {
          label: "Home",
          line1: "100 George Street",
          suburb: "Sydney",
          state: "NSW",
          postcode: "2000",
          lat: -33.8688,
          lng: 151.2093,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@aussieeats.local",
      passwordHash: adminHash,
      name: "AussieEats Admin",
      role: Role.ADMIN,
    },
  });

  const createdRestaurants = [];
  for (const r of restaurants) {
    const created = await prisma.restaurant.create({
      data: {
        name: r.name,
        slug: r.slug,
        description: r.description,
        image: r.image,
        cuisineTags: JSON.stringify(r.cuisineTags),
        suburb: r.suburb,
        lat: r.lat,
        lng: r.lng,
        deliveryFeeCents: r.deliveryFeeCents,
        minOrderCents: r.minOrderCents,
        rating: r.rating,
        phone: r.phone,
        isOpen: true,
        isActive: true,
        categories: {
          create: r.categories.map((cat, idx) => ({
            name: cat.name,
            sortOrder: idx,
            items: {
              create: cat.items.map((item) => ({
                name: item.name,
                description: item.description,
                priceCents: item.priceCents,
                image: item.image ?? null,
                isAvailable: true,
              })),
            },
          })),
        },
      },
      include: {
        categories: { include: { items: true } },
      },
    });
    createdRestaurants.push(created);
  }

  const burger = createdRestaurants.find((r) => r.slug === "harbour-burger-co")!;
  const thai = createdRestaurants.find((r) => r.slug === "newtown-thai-kitchen")!;
  const burgerItem = burger.categories[0].items[0];
  const chips = burger.categories[1].items[0];
  const padThai = thai.categories[1].items[0];

  await prisma.order.create({
    data: {
      userId: customer.id,
      restaurantId: burger.id,
      status: OrderStatus.delivered,
      subtotalCents: burgerItem.priceCents + chips.priceCents,
      deliveryFeeCents: burger.deliveryFeeCents,
      totalCents: burgerItem.priceCents + chips.priceCents + burger.deliveryFeeCents,
      deliveryAddress: JSON.stringify({
        label: "Home",
        line1: "100 George Street",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
      }),
      paymentMethod: "Pay on delivery",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      items: {
        create: [
          {
            menuItemId: burgerItem.id,
            name: burgerItem.name,
            unitPriceCents: burgerItem.priceCents,
            quantity: 1,
          },
          {
            menuItemId: chips.id,
            name: chips.name,
            unitPriceCents: chips.priceCents,
            quantity: 1,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: customer.id,
      restaurantId: thai.id,
      status: OrderStatus.preparing,
      subtotalCents: padThai.priceCents * 2,
      deliveryFeeCents: thai.deliveryFeeCents,
      totalCents: padThai.priceCents * 2 + thai.deliveryFeeCents,
      deliveryAddress: JSON.stringify({
        label: "Home",
        line1: "100 George Street",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
      }),
      paymentMethod: "Pay on delivery",
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
      items: {
        create: [
          {
            menuItemId: padThai.id,
            name: padThai.name,
            unitPriceCents: padThai.priceCents,
            quantity: 2,
          },
        ],
      },
    },
  });

  console.log("Seed complete:");
  console.log("  Customer: demo@aussieeats.local / demo1234");
  console.log("  Admin:    admin@aussieeats.local / admin1234");
  console.log(`  Restaurants: ${createdRestaurants.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
