import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { restaurants } from "./seed-data";

const Role = { CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" } as const;
const OrderStatus = {
  pending: "pending",
  preparing: "preparing",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
} as const;

const prisma = new PrismaClient();

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
        city: r.city,
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

  const byCity = createdRestaurants.reduce<Record<string, number>>((acc, r) => {
    acc[r.city] = (acc[r.city] || 0) + 1;
    return acc;
  }, {});

  console.log("Seed complete:");
  console.log("  Customer: demo@aussieeats.local / demo1234");
  console.log("  Admin:    admin@aussieeats.local / admin1234");
  console.log(`  Restaurants: ${createdRestaurants.length}`);
  console.log(
    "  Cities:",
    Object.entries(byCity)
      .map(([city, n]) => `${city} (${n})`)
      .join(", "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
