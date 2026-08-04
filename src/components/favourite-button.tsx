"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleFavouriteAction } from "@/app/actions/favourites";

type Props = {
  restaurantId: string;
  restaurantName: string;
  initialIsFavourite: boolean;
  variant?: "card" | "hero";
};

export function FavouriteButton({
  restaurantId,
  restaurantName,
  initialIsFavourite,
  variant = "card",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = isFavourite
    ? `Remove ${restaurantName} from favourites`
    : `Save ${restaurantName} to favourites`;

  return (
    <div className="relative">
      <button
        type="button"
        className={`favourite-button favourite-button-${variant}`}
        aria-label={label}
        aria-pressed={isFavourite}
        title={label}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await toggleFavouriteAction(restaurantId);
            if (!result.ok) {
              if (result.needsAuth) {
                router.push(`/login?next=${encodeURIComponent(pathname)}`);
                return;
              }
              setError(result.error);
              return;
            }
            setIsFavourite(result.isFavourite);
          });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 20.4 10.55 19.08C5.4 14.4 2 11.3 2 7.5 2 4.4 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09A6.01 6.01 0 0 1 16.5 2C19.58 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.55 11.58L12 20.4Z"
            fill={isFavourite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        {variant === "hero" ? (
          <span>{isFavourite ? "Saved" : "Save restaurant"}</span>
        ) : null}
      </button>
      {error ? (
        <p className="absolute right-0 top-full z-10 mt-1 w-48 rounded bg-white p-2 text-xs text-[var(--ae-danger)] shadow">
          {error}
        </p>
      ) : null}
    </div>
  );
}
