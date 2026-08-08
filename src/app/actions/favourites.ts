"use server";

import { revalidatePath } from "next/cache";
import { ApiError, listFavouriteIds, toggleFavourite } from "@/lib/backend";
import { requireUser } from "@/lib/session";

type ToggleFavouriteResult =
  | { ok: true; isFavourite: boolean }
  | { ok: false; error: string; needsAuth?: true };

export async function listFavouriteRestaurantIds(): Promise<string[]> {
  const session = await requireUser();
  if (!session?.userId) return [];

  try {
    return await listFavouriteIds();
  } catch {
    return [];
  }
}

export async function toggleFavouriteAction(
  restaurantId: string,
): Promise<ToggleFavouriteResult> {
  const session = await requireUser();
  if (!session?.userId) {
    return {
      ok: false,
      error: "Please log in to save restaurants.",
      needsAuth: true,
    };
  }

  const normalizedId = typeof restaurantId === "string" ? restaurantId.trim() : "";
  if (!normalizedId) {
    return { ok: false, error: "Restaurant not found." };
  }

  try {
    const result = await toggleFavourite(normalizedId);
    revalidatePath("/favourites");
    revalidatePath("/restaurants", "layout");
    return { ok: true, isFavourite: result.isFavourite };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return {
        ok: false,
        error: "Please log in to save restaurants.",
        needsAuth: true,
      };
    }
    if (err instanceof ApiError) {
      return { ok: false, error: err.detail || "Restaurant not found." };
    }
    return { ok: false, error: "Unable to update favourites." };
  }
}
