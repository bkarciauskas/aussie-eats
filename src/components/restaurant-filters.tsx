"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CITY_NAMES } from "@/lib/cities";

export function RestaurantFilters({
  cuisines,
  initialQ = "",
  initialCuisine = "",
  initialCity = "",
}: {
  cuisines: string[];
  initialQ?: string;
  initialCuisine?: string;
  initialCity?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(next: { q?: string; cuisine?: string; city?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const q = next.q ?? initialQ;
    const cuisine = next.cuisine ?? initialCuisine;
    const city = next.city ?? initialCity;
    if (q) params.set("q", q);
    else params.delete("q");
    if (cuisine) params.set("cuisine", cuisine);
    else params.delete("cuisine");
    if (city) params.set("city", city);
    else params.delete("city");
    startTransition(() => {
      router.push(`/restaurants?${params.toString()}`);
    });
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        apply({
          q: String(fd.get("q") || ""),
          cuisine: String(fd.get("cuisine") || ""),
          city: String(fd.get("city") || ""),
        });
      }}
    >
      <label className="field min-w-[12rem] flex-1">
        <span>Search</span>
        <input name="q" defaultValue={initialQ} placeholder="Restaurant, suburb, cuisine…" />
      </label>
      <label className="field min-w-[10rem]">
        <span>City</span>
        <select
          name="city"
          defaultValue={initialCity}
          onChange={(e) => apply({ city: e.target.value })}
          disabled={pending}
        >
          <option value="">All cities</option>
          {CITY_NAMES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="field min-w-[10rem]">
        <span>Cuisine</span>
        <select
          name="cuisine"
          defaultValue={initialCuisine}
          onChange={(e) => apply({ cuisine: e.target.value })}
          disabled={pending}
        >
          <option value="">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-secondary" disabled={pending}>
        Filter
      </button>
    </form>
  );
}
