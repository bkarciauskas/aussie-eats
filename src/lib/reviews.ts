export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;
export const MAX_REVIEW_COMMENT_LENGTH = 500;

export function parseReviewRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rating = Math.trunc(n);
  if (rating < MIN_REVIEW_RATING || rating > MAX_REVIEW_RATING) return null;
  return rating;
}

export function normalizeReviewComment(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw.trim().slice(0, MAX_REVIEW_COMMENT_LENGTH);
}

/** Incremental blend of a new star into existing denormalized aggregates. */
export function blendRestaurantRating(
  currentRating: number,
  currentCount: number,
  submittedRating: number,
): { rating: number; userRatingCount: number } {
  const safeCount = Math.max(0, Math.trunc(currentCount));
  const safeCurrent = Number.isFinite(currentRating) ? currentRating : 0;
  const userRatingCount = safeCount + 1;
  const rating = (safeCurrent * safeCount + submittedRating) / userRatingCount;
  return { rating, userRatingCount };
}

/** Inverse of blendRestaurantRating — remove one star from denormalized aggregates. */
export function unblendRestaurantRating(
  currentRating: number,
  currentCount: number,
  removedRating: number,
): { rating: number; userRatingCount: number } {
  const safeCount = Math.max(0, Math.trunc(currentCount));
  const safeCurrent = Number.isFinite(currentRating) ? currentRating : 0;
  if (safeCount <= 1) {
    return { rating: safeCurrent, userRatingCount: 0 };
  }
  const userRatingCount = safeCount - 1;
  const rating = (safeCurrent * safeCount - removedRating) / userRatingCount;
  return { rating, userRatingCount };
}

export function formatReviewStars(rating: number): string {
  const n = Math.min(MAX_REVIEW_RATING, Math.max(0, Math.trunc(rating)));
  return `${"★".repeat(n)}${"☆".repeat(MAX_REVIEW_RATING - n)}`;
}
