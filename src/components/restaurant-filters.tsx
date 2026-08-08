"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { DEMO_CITIES, resolveRestaurantQuery } from "@/lib/cities";
import {
  applyDietSearchParams,
  DIET_FILTERS,
  type DietId,
} from "@/lib/dietary";

export function RestaurantFilters({
  cuisines,
  initialQ = "",
  initialCuisine = "",
  initialCity = "",
  initialOpenNow = false,
  initialDiets = [],
}: {
  cuisines: string[];
  initialQ?: string;
  initialCuisine?: string;
  initialCity?: string;
  initialOpenNow?: boolean;
  initialDiets?: DietId[];
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
        diets: initialDiets,
      };
    }
    const fd = new FormData(formRef.current);
    const diets = DIET_FILTERS.map((f) => f.id).filter(
      (id) => fd.get(`diet-${id}`) === "on",
    );
    return {
      q: String(fd.get("q") || ""),
      cuisine: String(fd.get("cuisine") || ""),
      city: String(fd.get("city") || ""),
      openNow: fd.get("openNow") === "on",
      diets,
    };
  }

  function apply(
    next: {
      q?: string;
      cuisine?: string;
      city?: string;
      openNow?: boolean;
      diets?: DietId[];
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
    // resolved.city is always a demo city id or empty — never echo stale free-text city params
    if (resolved.city) params.set("city", resolved.city);
    else params.delete("city");
    const openNow = next.openNow ?? current.openNow;
    if (openNow) params.set("open", "1");
    else params.delete("open");
    applyDietSearchParams(params, next.diets ?? current.diets);
    startTransition(() => {
      router.push(`/restaurants?${params.toString()}`);
    });
  }

  return (
    <form
      ref={formRef}
      key={`diets-${initialDiets.join(",")}`}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
      </div>

      <fieldset className="min-w-0">
        <legend className="text-sm text-[var(--ae-ink-muted)]">
          Dietary &amp; allergy
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIET_FILTERS.map((filter) => {
            const checked = initialDiets.includes(filter.id);
            return (
              <label
                key={filter.id}
                className={`diet-chip ${checked ? "diet-chip-active" : ""}`}
              >
                <input
                  type="checkbox"
                  name={`diet-${filter.id}`}
                  defaultChecked={checked}
                  className="sr-only"
                  onChange={() => apply()}
                  disabled={pending}
                />
                {filter.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--ae-ink-soft)]">
          Demo tags only — not medical-grade allergen advice. Nut-free hides anything
          not explicitly tagged nut-free.
        </p>
      </fieldset>
    </form>
  );
}
