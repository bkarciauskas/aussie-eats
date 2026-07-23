import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { parseCuisineTags } from "@/lib/restaurants";
import { AddToCartButton } from "@/components/add-to-cart-button";

type Props = { params: Promise<{ slug: string }> };

export default async function RestaurantDetailPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isActive: true },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!restaurant) notFound();

  const tags = parseCuisineTags(restaurant.cuisineTags);

  return (
    <div>
      <section
        className="relative min-h-[280px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(22,54,40,0.35), rgba(22,54,40,0.88)), url(${restaurant.image})`,
        }}
      >
        <div className="page-shell !pb-8 !pt-16 text-white">
          <p className="text-sm uppercase tracking-[0.14em] text-white/70">{restaurant.suburb}</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">{restaurant.name}</h1>
          <p className="mt-3 max-w-2xl text-white/85">{restaurant.description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
            <span>{restaurant.rating.toFixed(1)} ★</span>
            <span>{formatAUD(restaurant.deliveryFeeCents)} delivery</span>
            <span>Min {formatAUD(restaurant.minOrderCents)}</span>
            <span className={restaurant.isOpen ? "text-emerald-200" : "text-red-200"}>
              {restaurant.isOpen ? "Open now" : "Closed"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded bg-white/15 px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="page-shell space-y-10">
        {restaurant.categories.map((category) => (
          <section key={category.id}>
            <h2 className="font-display text-2xl text-[var(--ae-green)]">{category.name}</h2>
            <ul className="mt-4 divide-y divide-[var(--ae-line)]">
              {category.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.name}
                      {!item.isAvailable ? (
                        <span className="ml-2 text-xs text-[var(--ae-danger)]">Unavailable</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">{item.description}</p>
                    <p className="mt-2 text-sm font-semibold">{formatAUD(item.priceCents)}</p>
                  </div>
                  <AddToCartButton
                    menuItemId={item.id}
                    name={item.name}
                    unitPriceCents={item.priceCents}
                    image={item.image}
                    restaurantId={restaurant.id}
                    restaurantSlug={restaurant.slug}
                    restaurantName={restaurant.name}
                    deliveryFeeCents={restaurant.deliveryFeeCents}
                    minOrderCents={restaurant.minOrderCents}
                    disabled={!item.isAvailable || !restaurant.isOpen}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
