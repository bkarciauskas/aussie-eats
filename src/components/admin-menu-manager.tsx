"use client";

import { useState, useTransition } from "react";
import {
  toggleMenuItemAvailabilityAction,
  upsertCategoryAction,
  upsertMenuItemAction,
} from "@/app/actions/admin-restaurants";
import { formatAUD } from "@/lib/money";

type Item = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  image: string | null;
  isAvailable: boolean;
  categoryId: string;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  items: Item[];
};

export function AdminMenuManager({
  restaurantId,
  categories,
}: {
  restaurantId: string;
  categories: Category[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  return (
    <div className="mt-6 space-y-8">
      <form
        className="panel grid gap-3 sm:grid-cols-[1fr_8rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("restaurantId", restaurantId);
          setError(null);
          startTransition(async () => {
            const result = await upsertCategoryAction(fd);
            if (result?.error) setError(result.error);
            else e.currentTarget.reset();
          });
        }}
      >
        <label className="field">
          <span>New category</span>
          <input name="name" required placeholder="e.g. Mains" />
        </label>
        <label className="field">
          <span>Sort</span>
          <input name="sortOrder" type="number" defaultValue={categories.length} />
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn-secondary w-full" disabled={pending}>
            Add category
          </button>
        </div>
      </form>

      {categories.map((category) => (
        <section key={category.id} className="panel">
          <h2 className="font-display text-xl">{category.name}</h2>
          <ul className="mt-4 divide-y divide-[var(--ae-line)]">
            {category.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {item.name}{" "}
                    <span className="text-sm font-normal text-[var(--ae-ink-muted)]">
                      {formatAUD(item.priceCents)}
                    </span>
                  </p>
                  <p className="text-sm text-[var(--ae-ink-muted)]">{item.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => setEditingItem(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm underline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await toggleMenuItemAvailabilityAction(
                          restaurantId,
                          item.id,
                          !item.isAvailable,
                        );
                      });
                    }}
                  >
                    {item.isAvailable ? "Mark unavailable" : "Mark available"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <form
            className="mt-4 grid gap-3 border-t border-[var(--ae-line)] pt-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("restaurantId", restaurantId);
              fd.set("categoryId", category.id);
              fd.set("isAvailable", "true");
              setError(null);
              startTransition(async () => {
                const result = await upsertMenuItemAction(fd);
                if (result?.error) setError(result.error);
                else e.currentTarget.reset();
              });
            }}
          >
            <label className="field sm:col-span-2">
              <span>Add item to {category.name}</span>
              <input name="name" required placeholder="Item name" />
            </label>
            <label className="field sm:col-span-2">
              <span>Description</span>
              <input name="description" placeholder="Short description" />
            </label>
            <label className="field">
              <span>Price (AUD)</span>
              <input name="price" type="number" step="0.01" min="0" required defaultValue="12.00" />
            </label>
            <div className="flex items-end">
              <button type="submit" className="btn-secondary" disabled={pending}>
                Add item
              </button>
            </div>
          </form>
        </section>
      ))}

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="panel w-full max-w-md space-y-3"
            role="dialog"
            aria-modal="true"
            aria-label="Edit menu item"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("restaurantId", restaurantId);
              fd.set("id", editingItem.id);
              fd.set("categoryId", editingItem.categoryId);
              setError(null);
              startTransition(async () => {
                const result = await upsertMenuItemAction(fd);
                if (result?.error) setError(result.error);
                else setEditingItem(null);
              });
            }}
          >
            <h3 className="font-display text-xl">Edit item</h3>
            <label className="field">
              <span>Name</span>
              <input name="name" required defaultValue={editingItem.name} />
            </label>
            <label className="field">
              <span>Description</span>
              <input name="description" defaultValue={editingItem.description} />
            </label>
            <label className="field">
              <span>Price (AUD)</span>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={(editingItem.priceCents / 100).toFixed(2)}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isAvailable"
                defaultChecked={editingItem.isAvailable}
              />
              Available
            </label>
            {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={pending}>
                Save
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}
    </div>
  );
}
