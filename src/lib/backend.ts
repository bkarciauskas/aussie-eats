import { ApiError, apiFetch, apiFetchAuthed, okResponseSchema } from "@/lib/api";
import {
  adminDashboardSchema,
  categorySchema,
  dietaryCatalogVenueSchema,
  favouriteIdsSchema,
  orderSchema,
  placeOrderResponseSchema,
  restaurantDetailSchema,
  restaurantSummarySchema,
  reviewSchema,
  searchSuggestSchema,
  toggleFavouriteSchema,
  type DietaryCatalogVenue,
  type Order,
  type RestaurantDetail,
  type RestaurantSummary,
} from "@/lib/api-schemas";
import type { OrderStatus } from "@/lib/roles";
import { z } from "zod";

export { ApiError };

export async function listRestaurants(options?: {
  activeOnly?: boolean;
}): Promise<RestaurantSummary[]> {
  const activeOnly = options?.activeOnly ?? true;
  const query = activeOnly ? "" : "?activeOnly=false";
  return apiFetch(`/restaurants${query}`, {
    schema: z.array(restaurantSummarySchema),
  });
}

export async function getRestaurantBySlug(slug: string): Promise<RestaurantDetail | null> {
  try {
    return await apiFetch(`/restaurants/${encodeURIComponent(slug)}`, {
      schema: restaurantDetailSchema,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** One catalog query of menu diet tags for browse filters. */
export async function listDietaryCatalog(options?: {
  activeOnly?: boolean;
}): Promise<DietaryCatalogVenue[]> {
  const activeOnly = options?.activeOnly ?? true;
  const query = activeOnly ? "" : "?activeOnly=false";
  return apiFetch(`/restaurants/dietary-catalog${query}`, {
    schema: z.array(dietaryCatalogVenueSchema),
  });
}

export async function listMyOrders(): Promise<Order[]> {
  return apiFetchAuthed("/orders", { schema: z.array(orderSchema) });
}

export async function getMyOrder(orderId: string): Promise<Order | null> {
  try {
    return await apiFetchAuthed(`/orders/${encodeURIComponent(orderId)}`, {
      schema: orderSchema,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function placeOrder(body: unknown) {
  return apiFetchAuthed("/orders", {
    method: "POST",
    body,
    schema: placeOrderResponseSchema,
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return apiFetchAuthed(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: { status },
    schema: okResponseSchema,
  });
}

export async function listFavouriteIds(): Promise<string[]> {
  try {
    const data = await apiFetchAuthed("/favourites", { schema: favouriteIdsSchema });
    return data.restaurantIds;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return [];
    throw err;
  }
}

export async function listFavouriteRestaurants(): Promise<RestaurantSummary[]> {
  return apiFetchAuthed("/favourites/restaurants", {
    schema: z.array(restaurantSummarySchema),
  });
}

export async function toggleFavourite(restaurantId: string) {
  return apiFetchAuthed(`/favourites/${encodeURIComponent(restaurantId)}/toggle`, {
    method: "POST",
    schema: toggleFavouriteSchema,
  });
}

export async function submitReview(body: {
  orderId: string;
  rating: number;
  comment?: string;
}) {
  return apiFetchAuthed("/reviews", {
    method: "POST",
    body,
    schema: reviewSchema,
  });
}

export async function getAdminDashboard() {
  return apiFetchAuthed("/admin/dashboard", { schema: adminDashboardSchema });
}

export async function listAdminRestaurants(): Promise<RestaurantSummary[]> {
  return apiFetchAuthed("/admin/restaurants", {
    schema: z.array(restaurantSummarySchema),
  });
}

export async function getAdminRestaurant(id: string): Promise<RestaurantSummary | null> {
  try {
    return await apiFetchAuthed(`/admin/restaurants/${encodeURIComponent(id)}`, {
      schema: restaurantSummarySchema,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getAdminRestaurantMenu(id: string) {
  return apiFetchAuthed(`/admin/restaurants/${encodeURIComponent(id)}/menu`, {
    schema: z.array(categorySchema),
  });
}

export async function listAdminOrders(): Promise<Order[]> {
  return apiFetchAuthed("/admin/orders", { schema: z.array(orderSchema) });
}

export async function upsertRestaurant(body: unknown) {
  return apiFetchAuthed("/admin/restaurants", {
    method: "POST",
    body,
    schema: restaurantSummarySchema,
  });
}

export async function toggleRestaurantActive(id: string, isActive: boolean) {
  return apiFetchAuthed(`/admin/restaurants/${encodeURIComponent(id)}/active`, {
    method: "PATCH",
    body: { isActive },
    schema: okResponseSchema,
  });
}

export async function upsertCategory(body: unknown) {
  return apiFetchAuthed("/admin/categories", {
    method: "POST",
    body,
    schema: categorySchema,
  });
}

export async function upsertMenuItem(body: unknown) {
  return apiFetchAuthed("/admin/menu-items", {
    method: "POST",
    body,
    schema: z.object({
      id: z.string(),
      categoryId: z.string(),
      name: z.string(),
      description: z.string(),
      priceCents: z.number().int(),
      image: z.string().nullable().optional(),
      isAvailable: z.boolean(),
      dietaryTags: z.string(),
      allergens: z.string(),
    }),
  });
}

export async function toggleMenuItemAvailability(itemId: string, isAvailable: boolean) {
  return apiFetchAuthed(`/admin/menu-items/${encodeURIComponent(itemId)}/availability`, {
    method: "PATCH",
    body: { isAvailable },
    schema: okResponseSchema,
  });
}

export async function searchSuggest(q: string) {
  const params = new URLSearchParams({ q });
  return apiFetch(`/search/suggest?${params}`, { schema: searchSuggestSchema });
}
