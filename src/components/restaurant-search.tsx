"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition, type FormEvent } from "react";
import { useLocation } from "@/components/location-provider";
import { resolveRestaurantQuery } from "@/lib/cities";

type RestaurantSearchProps = {
  variant: "hero" | "header";
  initialQ?: string;
  className?: string;
};

function RestaurantSearchForm({
  variant,
  initialQ = "",
  className = "",
}: RestaurantSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { location, hydrated } = useLocation();
  const [pending, startTransition] = useTransition();
  const disabled = pending || !hydrated;
  const qDefault = initialQ || searchParams.get("q") || "";

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Location restores from localStorage after mount; wait so a saved pin is not dropped.
    if (!hydrated) return;

    const fd = new FormData(e.currentTarget);
    const rawQ = String(fd.get("q") || "").trim();
    // Keep cuisine from the current URL; city/q are resolved below.
    const params = new URLSearchParams();
    const cuisine = searchParams.get("cuisine");
    if (cuisine) params.set("cuisine", cuisine);

    // Typing a city name (e.g. "melbourne") should switch city, not fight the demo pin.
    const resolved = resolveRestaurantQuery({
      q: rawQ,
      city: searchParams.get("city") || location?.label || "",
    });
    if (resolved.q) params.set("q", resolved.q);
    if (resolved.city) params.set("city", resolved.city);

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/restaurants?${qs}` : "/restaurants");
    });
  }

  const formClass =
    variant === "hero"
      ? `hero-search ${className}`.trim()
      : `header-search ${className}`.trim();

  return (
    <form className={formClass} onSubmit={onSubmit} role="search">
      <label className="sr-only" htmlFor={`restaurant-search-${variant}`}>
        Search restaurants
      </label>
      <input
        key={qDefault}
        id={`restaurant-search-${variant}`}
        name="q"
        type="search"
        defaultValue={qDefault}
        placeholder={
          variant === "hero"
            ? "Search restaurants, suburbs, cuisines…"
            : "Search…"
        }
        autoComplete="off"
        disabled={disabled}
      />
      <button type="submit" className={variant === "hero" ? "btn-primary" : "btn-secondary"} disabled={disabled}>
        Find
      </button>
    </form>
  );
}

function RestaurantSearchFallback({ variant, initialQ = "", className = "" }: RestaurantSearchProps) {
  const formClass =
    variant === "hero"
      ? `hero-search ${className}`.trim()
      : `header-search ${className}`.trim();

  return (
    <form className={formClass} role="search">
      <label className="sr-only" htmlFor={`restaurant-search-${variant}`}>
        Search restaurants
      </label>
      <input
        id={`restaurant-search-${variant}`}
        name="q"
        type="search"
        defaultValue={initialQ}
        placeholder={
          variant === "hero"
            ? "Search restaurants, suburbs, cuisines…"
            : "Search…"
        }
        autoComplete="off"
        disabled
      />
      <button type="submit" className={variant === "hero" ? "btn-primary" : "btn-secondary"} disabled>
        Find
      </button>
    </form>
  );
}

export function RestaurantSearch(props: RestaurantSearchProps) {
  return (
    <Suspense fallback={<RestaurantSearchFallback {...props} />}>
      <RestaurantSearchForm {...props} />
    </Suspense>
  );
}
