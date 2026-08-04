import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { restaurants } from "./seed-data";
import { DEMO_CITIES } from "../src/lib/cities";
import { blendRestaurantRating, unblendRestaurantRating } from "../src/lib/reviews";

const Role = { CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" } as const;
const OrderStatus = {
  pending: "pending",
  preparing: "preparing",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
} as const;

const prisma = new PrismaClient();

function historyFor(
  status: string,
  createdAt: Date,
): { status: string; at: string }[] {
  const steps = ["pending", "preparing", "out_for_delivery", "delivered"] as const;
  if (status === "cancelled") {
    return [
      { status: "pending", at: createdAt.toISOString() },
      { status: "cancelled", at: new Date(createdAt.getTime() + 20 * 60_000).toISOString() },
    ];
  }
  const idx = steps.indexOf(status as (typeof steps)[number]);
  const end = idx >= 0 ? idx : 0;
  return steps.slice(0, end + 1).map((s, i) => ({
    status: s,
    at: new Date(createdAt.getTime() + i * 25 * 60_000).toISOString(),
  }));
}

async function ensureUsers() {
  const customerHash = await bcrypt.hash("demo1234", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);

  const customer = await prisma.user.upsert({
    where: { email: "demo@aussieeats.local" },
    update: { name: "Demo Customer", role: Role.CUSTOMER },
    create: {
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

  await prisma.user.upsert({
    where: { email: "admin@aussieeats.local" },
    update: { name: "AussieEats Admin", role: Role.ADMIN },
    create: {
      email: "admin@aussieeats.local",
      passwordHash: adminHash,
      name: "AussieEats Admin",
      role: Role.ADMIN,
    },
  });

  const extraCustomers = [
    { email: "maya@aussieeats.local", name: "Maya Chen", city: DEMO_CITIES[1] },
    { email: "liam@aussieeats.local", name: "Liam O'Brien", city: DEMO_CITIES[2] },
    { email: "priya@aussieeats.local", name: "Priya Shah", city: DEMO_CITIES[3] },
    { email: "jack@aussieeats.local", name: "Jack Nguyen", city: DEMO_CITIES[4] },
    { email: "ella@aussieeats.local", name: "Ella Brooks", city: DEMO_CITIES[5] },
    { email: "sam@aussieeats.local", name: "Sam Taylor", city: DEMO_CITIES[0] },
    { email: "zoe@aussieeats.local", name: "Zoe Martin", city: DEMO_CITIES[1] },
    { email: "noah@aussieeats.local", name: "Noah Williams", city: DEMO_CITIES[2] },
  ];

  const customers = [customer];
  for (const c of extraCustomers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { name: c.name, role: Role.CUSTOMER },
      create: {
        email: c.email,
        passwordHash: customerHash,
        name: c.name,
        role: Role.CUSTOMER,
        addresses: {
          create: {
            label: "Home",
            line1: `12 Demo Street`,
            suburb: c.city.suburb,
            state: c.city.state,
            postcode: c.city.postcode,
            lat: c.city.lat,
            lng: c.city.lng,
          },
        },
      },
    });
    customers.push(user);
  }

  return customers;
}

async function bootstrapHandwrittenRestaurantsIfEmpty() {
  const count = await prisma.restaurant.count();
  if (count > 0) {
    console.log(`  Catalog already has ${count} restaurants — skipping handwritten bootstrap`);
    return;
  }

  console.log("  Catalog empty — loading handwritten fallback restaurants");
  for (const r of restaurants) {
    await prisma.restaurant.create({
      data: {
        name: r.name,
        slug: r.slug,
        description: r.description,
        image: r.image,
        cuisineTags: JSON.stringify(r.cuisineTags),
        city: r.city,
        suburb: r.suburb,
        lat: r.lat,
        lng: r.lng,
        deliveryFeeCents: r.deliveryFeeCents,
        minOrderCents: r.minOrderCents,
        rating: r.rating,
        userRatingCount: Math.round(80 + Math.random() * 400),
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
    });
  }
}

async function clearOrdersAndReviews() {
  const existingReviews = await prisma.review.findMany({
    select: { restaurantId: true, rating: true },
  });

  // Undo prior seed/live blends so re-running seed does not inflate rating counts.
  const byRestaurant = new Map<string, number[]>();
  for (const review of existingReviews) {
    const list = byRestaurant.get(review.restaurantId) ?? [];
    list.push(review.rating);
    byRestaurant.set(review.restaurantId, list);
  }

  for (const [restaurantId, ratings] of byRestaurant) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) continue;

    let { rating, userRatingCount } = restaurant;
    for (const submitted of ratings) {
      ({ rating, userRatingCount } = unblendRestaurantRating(rating, userRatingCount, submitted));
      if (userRatingCount === 0) break;
    }

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        rating: userRatingCount === 0 ? restaurant.rating : rating,
        userRatingCount,
      },
    });
  }

  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
}

async function seedReviewsOntoExistingOrders() {
  const deliveredOrders = await prisma.order.findMany({
    where: { status: OrderStatus.delivered, review: null },
    select: { id: true, userId: true, restaurantId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  await seedSampleReviews(deliveredOrders);
}

async function seedDenseOrders(
  customers: { id: string; email: string }[],
) {
  // Default: keep orders/reviews in SQLite once seeded (same idea as restaurant bootstrap).
  // Set FORCE_SEED_ORDERS=1 to wipe and rebuild sample orders + reviews.
  const forceRefresh = process.env.FORCE_SEED_ORDERS === "1";
  const existingReviewCount = await prisma.review.count();
  const existingOrderCount = await prisma.order.count();

  if (!forceRefresh && existingReviewCount > 0) {
    console.log(
      `  Orders/reviews already in DB (${existingOrderCount} orders, ${existingReviewCount} reviews) — skipping refresh`,
    );
    return;
  }

  if (!forceRefresh && existingOrderCount > 0) {
    console.log(
      `  Orders already present (${existingOrderCount}) — seeding reviews onto delivered orders only`,
    );
    await seedReviewsOntoExistingOrders();
    return;
  }

  if (forceRefresh) {
    console.log("  FORCE_SEED_ORDERS=1 — clearing and rebuilding sample orders/reviews");
    await clearOrdersAndReviews();
  }

  const catalog = await prisma.restaurant.findMany({
    where: { isActive: true },
    include: {
      categories: { include: { items: true }, orderBy: { sortOrder: "asc" } },
    },
    take: 80,
  });
  if (catalog.length === 0) return;

  const statuses = [
    OrderStatus.delivered,
    OrderStatus.delivered,
    OrderStatus.delivered,
    OrderStatus.preparing,
    OrderStatus.out_for_delivery,
    OrderStatus.pending,
    OrderStatus.cancelled,
  ] as const;

  const demo = customers.find((c) => c.email === "demo@aussieeats.local")!;
  let created = 0;
  const deliveredOrders: {
    id: string;
    userId: string;
    restaurantId: string;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < 55; i++) {
    const restaurant = catalog[i % catalog.length];
    const items = restaurant.categories.flatMap((c) => c.items).filter((it) => it.isAvailable);
    if (items.length === 0) continue;

    const pick = items.slice(0, 1 + (i % 3));
    const subtotalCents = pick.reduce(
      (sum, it, idx) => sum + it.priceCents * (1 + (idx % 2)),
      0,
    );
    const status = statuses[i % statuses.length];
    const createdAt = new Date(Date.now() - (i + 1) * 3 * 60 * 60 * 1000);
    const user = i % 4 === 0 ? demo : customers[i % customers.length];
    const cityMeta = DEMO_CITIES.find((c) => c.label === restaurant.city) ?? DEMO_CITIES[0];

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        restaurantId: restaurant.id,
        status,
        statusHistoryJson: JSON.stringify(historyFor(status, createdAt)),
        subtotalCents,
        deliveryFeeCents: restaurant.deliveryFeeCents,
        totalCents: subtotalCents + restaurant.deliveryFeeCents,
        deliveryAddress: JSON.stringify({
          label: "Home",
          line1: "12 Demo Street",
          suburb: cityMeta.suburb,
          state: cityMeta.state,
          postcode: cityMeta.postcode,
        }),
        paymentMethod: "Pay on delivery",
        createdAt,
        items: {
          create: pick.map((it, idx) => ({
            menuItemId: it.id,
            name: it.name,
            unitPriceCents: it.priceCents,
            quantity: 1 + (idx % 2),
          })),
        },
      },
    });
    created += 1;
    if (status === OrderStatus.delivered) {
      deliveredOrders.push({
        id: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
        createdAt: order.createdAt,
      });
    }
  }

  console.log(`  Seeded ${created} sample orders`);
  await seedSampleReviews(deliveredOrders);
}

async function seedSampleReviews(
  deliveredOrders: {
    id: string;
    userId: string;
    restaurantId: string;
    createdAt: Date;
  }[],
) {
  const samples = [
    { rating: 5, comment: "Arrived hot and exactly as ordered — will reorder." },
    { rating: 4, comment: "Great flavours. Packaging held up well in the rain." },
    { rating: 5, comment: "Quick delivery and generous portions." },
    { rating: 3, comment: "Tasty but a bit late. Still happy overall." },
    { rating: 4, comment: "" },
    { rating: 5, comment: "Best dumpling run this week." },
  ] as const;

  // Leave some delivered orders unreviewed so the demo customer can still submit a review.
  const toReview = deliveredOrders.filter((_, idx) => idx % 3 !== 0).slice(0, samples.length);
  let created = 0;

  for (let i = 0; i < toReview.length; i++) {
    const order = toReview[i];
    const sample = samples[i % samples.length];
    const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
    if (!restaurant) continue;

    const { rating, userRatingCount } = blendRestaurantRating(
      restaurant.rating,
      restaurant.userRatingCount,
      sample.rating,
    );

    await prisma.$transaction([
      prisma.review.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          restaurantId: order.restaurantId,
          rating: sample.rating,
          comment: sample.comment,
          createdAt: new Date(order.createdAt.getTime() + 90 * 60_000),
        },
      }),
      prisma.restaurant.update({
        where: { id: order.restaurantId },
        data: { rating, userRatingCount },
      }),
    ]);
    created += 1;
  }

  console.log(`  Seeded ${created} sample reviews`);
}

async function main() {
  console.log("Seed (non-destructive to restaurant catalog):");
  const customers = await ensureUsers();
  console.log(`  Users upserted (${customers.length} customers + admin)`);
  await bootstrapHandwrittenRestaurantsIfEmpty();
  await seedDenseOrders(customers);

  const restaurantCount = await prisma.restaurant.count();
  const orderCount = await prisma.order.count();
  const reviewCount = await prisma.review.count();
  const byCity = await prisma.restaurant.groupBy({
    by: ["city"],
    _count: { _all: true },
    orderBy: { city: "asc" },
  });

  console.log("Seed complete:");
  console.log("  Customer: demo@aussieeats.local / demo1234");
  console.log("  Admin:    admin@aussieeats.local / admin1234");
  console.log(`  Restaurants: ${restaurantCount}`);
  console.log(`  Orders: ${orderCount}`);
  console.log(`  Reviews: ${reviewCount}`);
  console.log(
    "  Cities:",
    byCity.map((r) => `${r.city} (${r._count._all})`).join(", "),
  );
  console.log("  Tip: run `npm run db:import-places` once to pull ~100 real venues per city.");
  console.log("  Tip: FORCE_SEED_ORDERS=1 npm run db:seed to rebuild sample orders/reviews.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
