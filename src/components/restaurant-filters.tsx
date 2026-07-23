"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);

  function readForm() {
    if (!formRef.current) {
      return { q: initialQ, cuisine: initialCuisine, city: initialCity };
    }
    const fd = new FormData(formRef.current);
    return {
      q: String(fd.get("q") || ""),
      cuisine: String(fd.get("cuisine") || ""),
      city: String(fd.get("city") || ""),
    };
  }

  function apply(next: { q?: string; cuisine?: string; city?: string } = {}) {
    const current = readForm();
    const params = new URLSearchParams(searchParams.toString());
    const q = next.q ?? current.q;
    const cuisine = next.cuisine ?? current.cuisine;
    const city = next.city ?? current.city;
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
      ref={formRef}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
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
          onChange={() => apply()}
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
          onChange={() => apply()}
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
