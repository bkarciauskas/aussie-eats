import Link from "next/link";
import { FavouriteButton } from "@/components/favourite-button";
import { formatAUD } from "@/lib/money";
import { parseCuisineTags } from "@/lib/restaurants";

type Props = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  cuisineTags: string;
  city?: string;
  suburb: string;
  rating: number;
  userRatingCount?: number;
  deliveryFeeCents: number;
  isOpen: boolean;
  distanceKm?: number | null;
  etaLabel?: string | null;
  hoursSummary?: string | null;
  isFavourite?: boolean;
};

export function RestaurantCard({
  id,
  slug,
  name,
  description,
  image,
  cuisineTags,
  city,
  suburb,
  rating,
  userRatingCount = 0,
  deliveryFeeCents,
  isOpen,
  distanceKm,
  etaLabel,
  hoursSummary,
  isFavourite = false,
}: Props) {
  const tags = parseCuisineTags(cuisineTags);
  const ratingLabel =
    userRatingCount > 0
      ? `${rating.toFixed(1)} ★ (${userRatingCount.toLocaleString("en-AU")})`
      : `${rating.toFixed(1)} ★`;

  return (
    <article className="relative">
      <Link href={`/restaurants/${slug}`} className="restaurant-row group pr-12">
        <div
          className="restaurant-thumb"
          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label={name}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl text-[var(--ae-ink)] group-hover:text-[var(--ae-green)]">
              {name}
            </h2>
            <span className="text-sm text-[var(--ae-ink-muted)]">{ratingLabel}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--ae-ink-muted)]">{description}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ae-ink-soft)]">
            <span>{city ? `${suburb}, ${city}` : suburb}</span>
            <span>{formatAUD(deliveryFeeCents)} delivery</span>
            {distanceKm != null ? <span>{distanceKm.toFixed(1)} km</span> : null}
            {etaLabel ? <span>{etaLabel}</span> : null}
            <span className={isOpen ? "text-[var(--ae-green)]" : "text-[var(--ae-danger)]"}>
              {isOpen ? "Open" : "Closed"}
            </span>
          </div>
          {hoursSummary ? (
            <p className="mt-1 text-xs text-[var(--ae-ink-soft)]">{hoursSummary}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <div className="absolute right-1 top-4">
        <FavouriteButton
          restaurantId={id}
          restaurantName={name}
          initialIsFavourite={isFavourite}
        />
      </div>
    </article>
  );
}
