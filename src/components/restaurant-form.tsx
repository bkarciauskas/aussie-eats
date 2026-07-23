"use client";

import { useState, useTransition } from "react";
import { upsertRestaurantAction } from "@/app/actions/admin-restaurants";
import { parseCuisineTags } from "@/lib/restaurants";

type RestaurantFormValues = {
  id?: string;
  name?: string;
  description?: string;
  suburb?: string;
  cuisineTags?: string;
  image?: string;
  deliveryFeeCents?: number;
  minOrderCents?: number;
  rating?: number;
  phone?: string | null;
  lat?: number;
  lng?: number;
  isOpen?: boolean;
  isActive?: boolean;
};

export function RestaurantForm({ restaurant }: { restaurant?: RestaurantFormValues }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tags = restaurant?.cuisineTags ? parseCuisineTags(restaurant.cuisineTags).join(", ") : "";

  return (
    <form
      className="panel mt-6 grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await upsertRestaurantAction(fd);
          if (result?.error) setError(result.error);
        });
      }}
    >
      {restaurant?.id ? <input type="hidden" name="id" value={restaurant.id} /> : null}
      <label className="field">
        <span>Name</span>
        <input name="name" required defaultValue={restaurant?.name || ""} />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea name="description" rows={3} required defaultValue={restaurant?.description || ""} />
      </label>
      <label className="field">
        <span>Suburb</span>
        <input name="suburb" required defaultValue={restaurant?.suburb || "Sydney"} />
      </label>
      <label className="field">
        <span>Cuisine tags (comma-separated)</span>
        <input name="cuisineTags" defaultValue={tags || "Cafe"} />
      </label>
      <label className="field">
        <span>Image path</span>
        <input name="image" defaultValue={restaurant?.image || "/images/restaurants/burger.jpg"} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Delivery fee (AUD)</span>
          <input
            name="deliveryFee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={((restaurant?.deliveryFeeCents ?? 450) / 100).toFixed(2)}
          />
        </label>
        <label className="field">
          <span>Min order (AUD)</span>
          <input
            name="minOrder"
            type="number"
            step="0.01"
            min="0"
            defaultValue={((restaurant?.minOrderCents ?? 1500) / 100).toFixed(2)}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Rating</span>
          <input
            name="rating"
            type="number"
            step="0.1"
            min="0"
            max="5"
            defaultValue={restaurant?.rating ?? 4.5}
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" defaultValue={restaurant?.phone || "+61 2 9000 0000"} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Lat</span>
          <input name="lat" type="number" step="any" defaultValue={restaurant?.lat ?? -33.8688} />
        </label>
        <label className="field">
          <span>Lng</span>
          <input name="lng" type="number" step="any" defaultValue={restaurant?.lng ?? 151.2093} />
        </label>
      </div>
      <div className="flex gap-6 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isOpen" defaultChecked={restaurant?.isOpen ?? true} />
          Open
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={restaurant?.isActive ?? true} />
          Active
        </label>
      </div>
      {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}
      <button type="submit" className="btn-primary w-fit" disabled={pending}>
        {pending ? "Saving…" : "Save restaurant"}
      </button>
    </form>
  );
}
