import assert from "node:assert/strict";
import test from "node:test";
import {
  dietaryCatalogVenueSchema,
  orderSchema,
  restaurantDetailSchema,
  restaurantListResponseSchema,
  restaurantSummarySchema,
} from "./api-schemas";

test("dietaryCatalogVenueSchema accepts lean menu tag payloads", () => {
  const parsed = dietaryCatalogVenueSchema.parse({
    id: "r1",
    menuItems: [
      { dietaryTags: '["vegan"]', allergens: "[]" },
      { dietaryTags: "[]", allergens: '["peanuts"]' },
    ],
  });
  assert.equal(parsed.id, "r1");
  assert.equal(parsed.menuItems.length, 2);
  assert.equal(parsed.menuItems[0]?.dietaryTags, '["vegan"]');
});

test("restaurantSummarySchema accepts FastAPI camelCase payloads", () => {
  const parsed = restaurantSummarySchema.parse({
    id: "r1",
    name: "Bondi Burger Co",
    slug: "bondi-burger-co",
    description: "Burgers",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: '["Burgers"]',
    dietaryTags: "[]",
    city: "Sydney",
    suburb: "Bondi",
    lat: -33.89,
    lng: 151.27,
    deliveryFeeCents: 499,
    minOrderCents: 1500,
    isOpen: true,
    isActive: true,
    rating: 4.6,
    userRatingCount: 12,
    openingHoursJson: null,
    phone: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(parsed.slug, "bondi-burger-co");
  assert.ok(parsed.createdAt instanceof Date);
});

test("restaurantListResponseSchema requires page window fields", () => {
  const summary = {
    id: "r1",
    name: "Bondi Burger Co",
    slug: "bondi-burger-co",
    description: "Burgers",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: '["Burgers"]',
    dietaryTags: "[]",
    city: "Sydney",
    suburb: "Bondi",
    lat: -33.89,
    lng: 151.27,
    deliveryFeeCents: 499,
    minOrderCents: 1500,
    isOpen: true,
    isActive: true,
    rating: 4.6,
    userRatingCount: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const parsed = restaurantListResponseSchema.parse({
    restaurants: [summary],
    availableCuisines: ["Burgers"],
    page: 1,
    pageSize: 10,
    total: 1,
  });
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 10);
  assert.equal(parsed.total, 1);
  assert.equal(parsed.restaurants.length, 1);

  assert.throws(() =>
    restaurantListResponseSchema.parse({
      restaurants: [],
      availableCuisines: [],
      page: 0,
      pageSize: 10,
      total: 0,
    }),
  );
});

test("restaurantDetailSchema includes nested categories and reviews", () => {
  const parsed = restaurantDetailSchema.parse({
    id: "r1",
    name: "Bondi Burger Co",
    slug: "bondi-burger-co",
    description: "Burgers",
    image: "/images/restaurants/burger.jpg",
    cuisineTags: "[]",
    city: "Sydney",
    suburb: "Bondi",
    lat: -33.89,
    lng: 151.27,
    deliveryFeeCents: 499,
    minOrderCents: 1500,
    isOpen: true,
    isActive: true,
    rating: 4.6,
    userRatingCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    categories: [
      {
        id: "c1",
        restaurantId: "r1",
        name: "Mains",
        sortOrder: 0,
        items: [
          {
            id: "m1",
            categoryId: "c1",
            name: "Classic",
            description: "Beef",
            priceCents: 1800,
            isAvailable: true,
            dietaryTags: "[]",
            allergens: "[]",
          },
        ],
      },
    ],
    reviews: [
      {
        id: "rev1",
        orderId: "o1",
        userId: "u1",
        restaurantId: "r1",
        rating: 5,
        comment: "Ripper",
        createdAt: "2026-01-02T00:00:00.000Z",
        userName: "Demo",
      },
    ],
  });
  assert.equal(parsed.categories[0].items[0].priceCents, 1800);
  assert.equal(parsed.reviews[0].userName, "Demo");
});

test("orderSchema accepts nested restaurant and review", () => {
  const parsed = orderSchema.parse({
    id: "o1",
    userId: "u1",
    restaurantId: "r1",
    status: "delivered",
    statusHistoryJson: "[]",
    subtotalCents: 1800,
    deliveryFeeCents: 499,
    totalCents: 2299,
    deliveryAddress: "{}",
    paymentMethod: "Pay on delivery",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [
      {
        id: "oi1",
        orderId: "o1",
        menuItemId: "m1",
        name: "Classic",
        unitPriceCents: 1800,
        quantity: 1,
      },
    ],
    restaurant: {
      id: "r1",
      name: "Bondi Burger Co",
      slug: "bondi-burger-co",
      description: "Burgers",
      image: "/images/restaurants/burger.jpg",
      cuisineTags: "[]",
      city: "Sydney",
      suburb: "Bondi",
      lat: -33.89,
      lng: 151.27,
      deliveryFeeCents: 499,
      minOrderCents: 1500,
      isOpen: true,
      isActive: true,
      rating: 4.6,
      userRatingCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    review: null,
    user: {
      id: "u1",
      email: "demo@aussieeats.local",
      name: "Demo",
      role: "CUSTOMER",
    },
  });
  assert.equal(parsed.restaurant?.slug, "bondi-burger-co");
  assert.equal(parsed.user?.email, "demo@aussieeats.local");
});
