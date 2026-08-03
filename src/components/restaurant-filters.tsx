"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { DEMO_CITIES, resolveRestaurantQuery } from "@/lib/cities";

export function RestaurantFilters({
  cuisines,
  initialQ = "",
  initialCuisine = "",
  initialCity = "",
  initialOpenNow = false,
}: {
  cuisines: string[];
  initialQ?: string;
  initialCuisine?: string;
  initialCity?: string;
  initialOpenNow?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function readForm() {
    if (!formRef.current) {
      return {
        q: initialQ,
        cuisine: initialCuisine,
        city: initialCity,
        openNow: initialOpenNow,
      };
    }
    const fd = new FormData(formRef.current);
    return {
      q: String(fd.get("q") || ""),
      cuisine: String(fd.get("cuisine") || ""),
      city: String(fd.get("city") || ""),
      openNow: fd.get("openNow") === "on",
    };
  }

  function apply(
    next: {
      q?: string;
      cuisine?: string;
      city?: string;
      openNow?: boolean;
      explicitCity?: boolean;
    } = {},
  ) {
    const current = readForm();
    const params = new URLSearchParams(searchParams.toString());
    const cuisine = next.cuisine ?? current.cuisine;
    const resolved = resolveRestaurantQuery({
      q: next.q ?? current.q,
      city: next.city ?? current.city,
      explicitCity: next.explicitCity,
    });
    if (resolved.q) params.set("q", resolved.q);
    else params.delete("q");
    if (cuisine) params.set("cuisine", cuisine);
    else params.delete("cuisine");
    const cityOut = next.explicitCity ? current.city || resolved.city : resolved.city;
    if (cityOut) params.set("city", cityOut);
    else params.delete("city");
    const openNow = next.openNow ?? current.openNow;
    if (openNow) params.set("open", "1");
    else params.delete("open");
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
        <input
          key={`q-${initialQ}`}
          name="q"
          defaultValue={initialQ}
          placeholder="Restaurant, suburb, cuisine…"
        />
      </label>
      <label className="field min-w-[10rem]">
        <span>City</span>
        <select
          key={`city-${initialCity}`}
          name="city"
          defaultValue={initialCity}
          onChange={() => apply({ explicitCity: true })}
          disabled={pending}
        >
          <option value="">All cities</option>
          {DEMO_CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
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
      <label className="flex items-center gap-2 pb-2 text-sm text-[var(--ae-ink-muted)]">
        <input
          type="checkbox"
          name="openNow"
          defaultChecked={initialOpenNow}
          onChange={(e) => apply({ openNow: e.target.checked })}
          disabled={pending}
        />
        Open now
      </label>
      <button type="submit" className="btn-secondary" disabled={pending}>
        Filter
      </button>
    </form>
  );
}
