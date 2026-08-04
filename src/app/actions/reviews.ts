"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@/lib/roles";
import {
  blendRestaurantRating,
  normalizeReviewComment,
  parseReviewRating,
  unblendRestaurantRating,
} from "@/lib/reviews";
import { requireAdmin, requireUser } from "@/lib/session";

export type SubmitReviewInput = {
  orderId: string;
  rating: number;
  comment?: string;
};

export async function submitReviewAction(input: SubmitReviewInput) {
  const session = await requireUser();
  if (!session?.userId) {
    return { error: "Please log in to leave a review.", needsAuth: true as const };
  }

  const rating = parseReviewRating(input.rating);
  if (rating === null) {
    return { error: "Choose a rating between 1 and 5 stars." };
  }

  const comment = normalizeReviewComment(input.comment);
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (!orderId) {
    return { error: "Order not found." };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.userId },
    include: { restaurant: true, review: true },
  });

  if (!order) {
    return { error: "Order not found." };
  }
  if (order.status !== OrderStatus.delivered) {
    return { error: "You can only review delivered orders." };
  }
  if (order.review) {
    return { error: "You have already reviewed this order." };
  }

  const { rating: nextRating, userRatingCount } = blendRestaurantRating(
    order.restaurant.rating,
    order.restaurant.userRatingCount,
    rating,
  );

  await prisma.$transaction([
    prisma.review.create({
      data: {
        orderId: order.id,
        userId: session.userId,
        restaurantId: order.restaurantId,
        rating,
        comment,
      },
    }),
    prisma.restaurant.update({
      where: { id: order.restaurantId },
      data: {
        rating: nextRating,
        userRatingCount,
      },
    }),
  ]);

  revalidatePath(`/orders/${order.id}`);
  revalidatePath(`/restaurants/${order.restaurant.slug}`);
  revalidatePath("/restaurants");
  revalidatePath("/orders");

  return { ok: true as const };
}

export async function deleteReviewAction(reviewId: string) {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Admin access required." };
  }

  const id = typeof reviewId === "string" ? reviewId.trim() : "";
  if (!id) {
    return { error: "Review not found." };
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: { restaurant: true },
  });

  if (!review) {
    return { error: "Review not found." };
  }

  const { rating, userRatingCount } = unblendRestaurantRating(
    review.restaurant.rating,
    review.restaurant.userRatingCount,
    review.rating,
  );

  await prisma.$transaction([
    prisma.review.delete({ where: { id: review.id } }),
    prisma.restaurant.update({
      where: { id: review.restaurantId },
      data: { rating, userRatingCount },
    }),
  ]);

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath(`/orders/${review.orderId}`);
  revalidatePath(`/restaurants/${review.restaurant.slug}`);
  revalidatePath("/restaurants");
  revalidatePath("/orders");

  return { ok: true as const };
}
