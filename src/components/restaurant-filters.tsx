"use client";

import { useRouter, usePathname } from "next/navigation";
import { FormEvent } from "react";

export function RestaurantFilters({
  cuisines,
  initialQ,
  initialCuisine,
}: {
  cuisines: string[];
  initialQ: string;
  initialCuisine: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const q = String(fd.get("q") || "").trim();
    const cuisine = String(fd.get("cuisine") || "").trim();
    if (q) params.set("q", q);
    if (cuisine) params.set("cuisine", cuisine);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form onSubmit={onSubmit} className="panel grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
      <label className="field">
        <span>Search</span>
        <input name="q" defaultValue={initialQ} placeholder="Restaurant, suburb, cuisine…" />
      </label>
      <label className="field">
        <span>Cuisine</span>
        <select name="cuisine" defaultValue={initialCuisine}>
          <option value="">All</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button type="submit" className="btn-primary w-full sm:w-auto">
          Filter
        </button>
      </div>
    </form>
  );
}
