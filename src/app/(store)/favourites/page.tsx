import Link from "next/link";
import { redirect } from "next/navigation";
import { RestaurantCard } from "@/components/restaurant-card";
import { listFavouriteRestaurants } from "@/lib/backend";
import { formatHoursSummary, isOpenNow } from "@/lib/opening-hours";
import { requireUser } from "@/lib/session";

export default async function FavouritesPage() {
  const session = await requireUser();
  if (!session?.userId) {
    redirect("/login?next=/favourites");
  }

  const restaurants = await listFavouriteRestaurants();

  return (
    <div className="page-shell">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[var(--ae-green)]">Favourites</h1>
        <p className="mt-2 text-[var(--ae-ink-muted)]">
          Your saved restaurants, ready for the next order.
        </p>
      </div>

      {restaurants.length === 0 ? (
        <div className="panel text-center">
          <h2 className="font-display text-2xl text-[var(--ae-green)]">
            No saved restaurants yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[var(--ae-ink-muted)]">
            Tap the heart on a restaurant to keep it close for next time.
          </p>
          <Link href="/restaurants" className="btn-primary mt-5">
            Browse restaurants
          </Link>
        </div>
      ) : (
        <div>
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              id={restaurant.id}
              slug={restaurant.slug}
              name={restaurant.name}
              description={restaurant.description}
              image={restaurant.image}
              cuisineTags={restaurant.cuisineTags}
              city={restaurant.city}
              suburb={restaurant.suburb}
              rating={restaurant.rating}
              userRatingCount={restaurant.userRatingCount}
              deliveryFeeCents={restaurant.deliveryFeeCents}
              isOpen={isOpenNow({
                openingHoursJson: restaurant.openingHoursJson,
                isOpen: restaurant.isOpen,
                city: restaurant.city,
              })}
              hoursSummary={formatHoursSummary(restaurant.openingHoursJson)}
              isFavourite
            />
          ))}
        </div>
      )}
    </div>
  );
}
