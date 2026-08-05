"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

type RestaurantOption = { id: string; name: string };

export function AdminReviewFilters({
  restaurants,
  initialQ = "",
  initialRestaurantId = "",
  initialMinStars = "",
}: {
  restaurants: RestaurantOption[];
  initialQ?: string;
  initialRestaurantId?: string;
  initialMinStars?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function apply() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const params = new URLSearchParams(searchParams.toString());
    const q = String(fd.get("q") || "").trim();
    const restaurantId = String(fd.get("restaurantId") || "").trim();
    const minStars = String(fd.get("minStars") || "").trim();

    if (q) params.set("q", q);
    else params.delete("q");
    if (restaurantId) params.set("restaurantId", restaurantId);
    else params.delete("restaurantId");
    if (minStars) params.set("minStars", minStars);
    else params.delete("minStars");

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/reviews?${qs}` : "/admin/reviews");
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
      <label className="field min-w-[12rem] flex-1 sm:max-w-[27rem]">
        <span>Search</span>
        <input
          key={`q-${initialQ}`}
          name="q"
          defaultValue={initialQ}
          placeholder="Customer or comment…"
        />
      </label>
      <label className="field min-w-[12rem] sm:w-[18.75rem]">
        <span>Restaurant</span>
        <select
          key={`restaurant-${initialRestaurantId}`}
          name="restaurantId"
          defaultValue={initialRestaurantId}
          disabled={pending}
        >
          <option value="">All restaurants</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field min-w-[8rem] sm:w-[10.625rem]">
        <span>Min stars</span>
        <select
          key={`minStars-${initialMinStars}`}
          name="minStars"
          defaultValue={initialMinStars}
          disabled={pending}
        >
          <option value="">Any rating</option>
          <option value="5">5 stars</option>
          <option value="4">4+ stars</option>
          <option value="3">3+ stars</option>
          <option value="2">2+ stars</option>
          <option value="1">1+ stars</option>
        </select>
      </label>
      <button type="submit" className="btn-secondary" disabled={pending}>
        Filter
      </button>
    </form>
  );
}
