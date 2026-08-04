import { notFound } from "next/navigation";
import { listFavouriteRestaurantIds } from "@/app/actions/favourites";
import { prisma } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { parseCuisineTags } from "@/lib/restaurants";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { RestaurantLocationMap } from "@/components/restaurant-location-map";
import { DeliveryEta } from "@/components/delivery-eta";
import { FavouriteButton } from "@/components/favourite-button";
import { formatHoursSummary, isOpenNow } from "@/lib/opening-hours";

type Props = { params: Promise<{ slug: string }> };

export default async function RestaurantDetailPage({ params }: Props) {
  const { slug } = await params;
  const [restaurant, favouriteIds] = await Promise.all([
    prisma.restaurant.findFirst({
      where: { slug, isActive: true },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: { orderBy: { name: "asc" } },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            user: { select: { name: true } },
          },
        },
      },
    }),
    listFavouriteRestaurantIds(),
  ]);

  if (!restaurant) notFound();

  const tags = parseCuisineTags(restaurant.cuisineTags);
  const openNow = isOpenNow({
    openingHoursJson: restaurant.openingHoursJson,
    isOpen: restaurant.isOpen,
    city: restaurant.city,
  });
  const hoursSummary = formatHoursSummary(restaurant.openingHoursJson);
  const ratingLabel =
    restaurant.userRatingCount > 0
      ? `${restaurant.rating.toFixed(1)} ★ (${restaurant.userRatingCount.toLocaleString("en-AU")} reviews)`
      : `${restaurant.rating.toFixed(1)} ★`;

  return (
    <div>
      <section
        className="relative min-h-[280px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(22,54,40,0.35), rgba(22,54,40,0.88)), url(${restaurant.image})`,
        }}
      >
        <div className="page-shell !pb-8 !pt-16 text-white">
          <p className="text-sm uppercase tracking-[0.14em] text-white/70">
            {restaurant.suburb}, {restaurant.city}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-4xl sm:text-5xl">{restaurant.name}</h1>
            <FavouriteButton
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              initialIsFavourite={favouriteIds.includes(restaurant.id)}
              variant="hero"
            />
          </div>
          <p className="mt-3 max-w-2xl text-white/85">{restaurant.description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
            <span>{ratingLabel}</span>
            <span>{formatAUD(restaurant.deliveryFeeCents)} delivery</span>
            <span>Min {formatAUD(restaurant.minOrderCents)}</span>
            <DeliveryEta
              restaurantLat={restaurant.lat}
              restaurantLng={restaurant.lng}
              className="text-white/80"
            />
            <span className={openNow ? "text-emerald-200" : "text-red-200"}>
              {openNow ? "Open now" : "Closed"}
            </span>
          </div>
          {hoursSummary ? (
            <p className="mt-2 text-sm text-white/70">{hoursSummary}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded bg-white/15 px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-xl text-xs text-white/55">
            Venue details sourced from Google Places where available; menus are demo-generated.
          </p>
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
                    restaurantLat={restaurant.lat}
                    restaurantLng={restaurant.lng}
                    deliveryFeeCents={restaurant.deliveryFeeCents}
                    minOrderCents={restaurant.minOrderCents}
                    disabled={!item.isAvailable || !openNow}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="font-display text-2xl text-[var(--ae-green)]">Customer reviews</h2>
          {restaurant.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ae-ink-muted)]">
              No AussieEats customer reviews yet. Order and rate after delivery to be the first.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--ae-line)]">
              {restaurant.reviews.map((review) => (
                <li key={review.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {review.user.name}{" "}
                      <span className="text-[var(--ae-green)]">{review.rating} ★</span>
                    </p>
                    <p className="text-xs text-[var(--ae-ink-soft)]">
                      {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
                        review.createdAt,
                      )}
                    </p>
                  </div>
                  {review.comment ? (
                    <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">{review.comment}</p>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--ae-ink-soft)]">No written review.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl text-[var(--ae-green)]">Where to find us</h2>
          <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
            {restaurant.suburb}, {restaurant.city}
            {restaurant.phone ? ` · ${restaurant.phone}` : ""}
          </p>
          <div className="mt-4">
            <RestaurantLocationMap
              lat={restaurant.lat}
              lng={restaurant.lng}
              name={restaurant.name}
              suburb={restaurant.suburb}
              city={restaurant.city}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
