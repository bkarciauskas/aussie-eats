"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition, type FormEvent } from "react";
import { useLocation } from "@/components/location-provider";

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
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (!params.get("city") && hydrated && location?.label) {
      params.set("city", location.label);
    }
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
