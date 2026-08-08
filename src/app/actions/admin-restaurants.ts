"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  toggleMenuItemAvailability,
  toggleRestaurantActive,
  upsertCategory,
  upsertMenuItem,
  upsertRestaurant,
} from "@/lib/backend";
import { requireAdmin } from "@/lib/session";

function actionError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.detail || fallback;
  }
  return fallback;
}

export async function upsertRestaurantAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const city = String(formData.get("city") || "Sydney").trim();
  const suburb = String(formData.get("suburb") || "").trim();
  const cuisineTagsRaw = String(formData.get("cuisineTags") || "");
  const image = String(formData.get("image") || "/images/restaurants/burger.jpg");
  const deliveryFeeCents = Math.round(Number(formData.get("deliveryFee")) * 100);
  const minOrderCents = Math.round(Number(formData.get("minOrder")) * 100);
  const rating = Number(formData.get("rating") || 4.5);
  const phone = String(formData.get("phone") || "");
  const isOpen = formData.get("isOpen") === "on" || formData.get("isOpen") === "true";
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!name || !description || !suburb || !city) {
    return { error: "Name, description, city, and suburb are required." };
  }

  if (
    !Number.isFinite(deliveryFeeCents) ||
    deliveryFeeCents < 0 ||
    !Number.isFinite(minOrderCents) ||
    minOrderCents < 0 ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    return { error: "Delivery fee, minimum order, and rating must be valid non-negative numbers." };
  }

  const cuisineTags = cuisineTagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const lat = Number(formData.get("lat") || -33.8688);
  const lng = Number(formData.get("lng") || 151.2093);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return { error: "Latitude and longitude must be valid coordinates." };
  }

  try {
    await upsertRestaurant({
      id: id || undefined,
      name,
      description,
      city,
      suburb,
      cuisineTags,
      image,
      deliveryFeeCents,
      minOrderCents,
      rating,
      phone: phone || null,
      isOpen,
      isActive,
      lat,
      lng,
    });
  } catch (err) {
    return { error: actionError(err, "Unable to save restaurant.") };
  }

  revalidatePath("/admin/restaurants");
  revalidatePath("/restaurants");
  redirect("/admin/restaurants");
}

export async function toggleRestaurantActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  try {
    await toggleRestaurantActive(id, isActive);
  } catch (err) {
    return { error: actionError(err, "Unable to update restaurant.") };
  }

  revalidatePath("/admin/restaurants");
  revalidatePath("/restaurants");
  return { ok: true as const };
}

export async function upsertCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const restaurantId = String(formData.get("restaurantId") || "");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!restaurantId || !name) return { error: "Category name is required." };

  try {
    await upsertCategory({
      id: id || undefined,
      restaurantId,
      name,
      sortOrder,
    });
  } catch (err) {
    return { error: actionError(err, "Unable to save category.") };
  }

  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
  revalidatePath("/restaurants");
  return { ok: true as const };
}

export async function upsertMenuItemAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const restaurantId = String(formData.get("restaurantId") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priceCents = Math.round(Number(formData.get("price")) * 100);
  const image = String(formData.get("image") || "") || null;
  const isAvailable =
    formData.get("isAvailable") === "on" || formData.get("isAvailable") === "true";
  const dietaryTags = ["vegan", "vegetarian", "gluten-free", "halal", "nut-free"].filter(
    (tag) => formData.get(`diet-${tag}`) === "on",
  );
  const allergens = ["peanuts", "tree-nuts"].filter(
    (tag) => formData.get(`allergen-${tag}`) === "on",
  );

  if (!categoryId || !name || !Number.isFinite(priceCents) || priceCents < 0) {
    return { error: "Name, category, and a non-negative price are required." };
  }

  try {
    // Backend syncs venue-level dietaryTags from the menu after upsert.
    await upsertMenuItem({
      id: id || undefined,
      restaurantId,
      categoryId,
      name,
      description,
      priceCents,
      image,
      isAvailable,
      dietaryTags,
      allergens,
    });
  } catch (err) {
    return { error: actionError(err, "Unable to save menu item.") };
  }

  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
  revalidatePath("/restaurants");
  return { ok: true as const };
}

export async function toggleMenuItemAvailabilityAction(
  restaurantId: string,
  itemId: string,
  isAvailable: boolean,
) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  try {
    await toggleMenuItemAvailability(itemId, isAvailable);
  } catch (err) {
    return { error: actionError(err, "Unable to update menu item.") };
  }

  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
  revalidatePath("/restaurants");
  return { ok: true as const };
}
