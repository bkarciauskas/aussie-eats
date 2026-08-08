"use server";

import { revalidatePath } from "next/cache";
import { ApiError, submitReview } from "@/lib/backend";
import { normalizeReviewComment, parseReviewRating } from "@/lib/reviews";
import { requireUser } from "@/lib/session";

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

  try {
    const review = await submitReview({ orderId, rating, comment });
    revalidatePath(`/orders/${review.orderId}`);
    revalidatePath("/orders");
    revalidatePath("/restaurants", "layout");
    return { ok: true as const };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { error: "Please log in to leave a review.", needsAuth: true as const };
    }
    if (err instanceof ApiError) {
      return { error: err.detail || "Unable to submit review." };
    }
    return { error: "Unable to submit review." };
  }
}
