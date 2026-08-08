import { z } from "zod";
import { OrderStatus, Role } from "@/lib/roles";
import { userPublicSchema } from "@/lib/api";

const orderStatusSchema = z.enum([
  OrderStatus.pending,
  OrderStatus.preparing,
  OrderStatus.out_for_delivery,
  OrderStatus.delivered,
  OrderStatus.cancelled,
]);

export const restaurantSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  slug: z.string().min(1),
  description: z.string(),
  image: z.string(),
  cuisineTags: z.string(),
  dietaryTags: z.string().default("[]"),
  city: z.string(),
  suburb: z.string(),
  lat: z.number(),
  lng: z.number(),
  deliveryFeeCents: z.number().int(),
  minOrderCents: z.number().int(),
  isOpen: z.boolean(),
  isActive: z.boolean(),
  rating: z.number(),
  placeId: z.string().nullable().optional(),
  userRatingCount: z.number().int().default(0),
  openingHoursJson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type RestaurantSummary = z.infer<typeof restaurantSummarySchema>;

export const menuItemSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int(),
  image: z.string().nullable().optional(),
  isAvailable: z.boolean(),
  dietaryTags: z.string().default("[]"),
  allergens: z.string().default("[]"),
});

export type MenuItem = z.infer<typeof menuItemSchema>;

export const categorySchema = z.object({
  id: z.string().min(1),
  restaurantId: z.string().min(1),
  name: z.string(),
  sortOrder: z.number().int().default(0),
  items: z.array(menuItemSchema).default([]),
});

export type Category = z.infer<typeof categorySchema>;

export const reviewSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  userId: z.string().min(1),
  restaurantId: z.string().min(1),
  rating: z.number().int(),
  comment: z.string().default(""),
  createdAt: z.coerce.date(),
  userName: z.string().nullable().optional(),
});

export type Review = z.infer<typeof reviewSchema>;

export const restaurantDetailSchema = restaurantSummarySchema.extend({
  categories: z.array(categorySchema).default([]),
  reviews: z.array(reviewSchema).default([]),
});

export type RestaurantDetail = z.infer<typeof restaurantDetailSchema>;

/** Lean menu fields for browse diet matching (no full menus/reviews). */
export const dietaryCatalogItemSchema = z.object({
  dietaryTags: z.string().default("[]"),
  allergens: z.string().default("[]"),
});

export const dietaryCatalogVenueSchema = z.object({
  id: z.string().min(1),
  menuItems: z.array(dietaryCatalogItemSchema).default([]),
});

export type DietaryCatalogVenue = z.infer<typeof dietaryCatalogVenueSchema>;

export const orderItemSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  menuItemId: z.string().nullable().optional(),
  name: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  restaurantId: z.string().min(1),
  status: orderStatusSchema,
  statusHistoryJson: z.string(),
  subtotalCents: z.number().int(),
  deliveryFeeCents: z.number().int(),
  totalCents: z.number().int(),
  deliveryAddress: z.string(),
  paymentMethod: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(orderItemSchema).default([]),
  restaurant: restaurantSummarySchema.nullable().optional(),
  review: reviewSchema.nullable().optional(),
  user: userPublicSchema.nullable().optional(),
});

export type Order = z.infer<typeof orderSchema>;

export const placeOrderResponseSchema = z.object({
  orderId: z.string().min(1),
});

export const favouriteIdsSchema = z.object({
  restaurantIds: z.array(z.string()),
});

export const toggleFavouriteSchema = z.object({
  ok: z.boolean(),
  isFavourite: z.boolean(),
});

export const adminDashboardSchema = z.object({
  restaurantCount: z.number().int(),
  openOrders: z.number().int(),
  customerCount: z.number().int(),
  recentOrders: z.array(orderSchema).default([]),
});

export const searchSuggestSchema = z.object({
  suggestions: z.array(z.record(z.string(), z.unknown())),
});

export const roleSchema = z.enum([Role.CUSTOMER, Role.ADMIN]);
