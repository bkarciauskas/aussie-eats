"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { useLocation } from "@/components/location-provider";

export function RestaurantSearch({
  variant,
  initialQ = "",
  className = "",
}: {
  variant: "hero" | "header";
  initialQ?: string;
  className?: string;
}) {
  const router = useRouter();
  const { location } = useLocation();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location?.label) params.set("city", location.label);
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
        defaultValue={initialQ}
        placeholder={
          variant === "hero"
            ? "Search restaurants, suburbs, cuisines…"
            : "Search…"
        }
        autoComplete="off"
        disabled={pending}
      />
      <button type="submit" className={variant === "hero" ? "btn-primary" : "btn-secondary"} disabled={pending}>
        Find
      </button>
    </form>
  );
}
