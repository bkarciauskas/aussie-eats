"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { unblendRestaurantRating } from "@/lib/reviews";
import { requireAdmin } from "@/lib/session";

export async function deleteReviewAction(reviewId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const id = typeof reviewId === "string" ? reviewId.trim() : "";
  if (!id) return { error: "Review not found." };

  const review = await prisma.review.findUnique({
    where: { id },
    include: { restaurant: true },
  });
  if (!review) return { error: "Review not found." };

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
  revalidatePath(`/restaurants/${review.restaurant.slug}`);
  revalidatePath("/restaurants");
  revalidatePath(`/orders/${review.orderId}`);
  revalidatePath("/orders");

  return { ok: true as const };
}
