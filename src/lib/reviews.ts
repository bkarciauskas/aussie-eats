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

/**
 * Inverse of blendRestaurantRating — remove one star from denormalized aggregates.
 * When the last review is removed, count becomes 0 and the rating value is left unchanged
 * (storefront hides the count-based label when userRatingCount is 0).
 */
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

/** Filled/empty stars for admin list display (e.g. ★★★★☆). */
export function formatStarRating(rating: number): string {
  const filled = Math.min(MAX_REVIEW_RATING, Math.max(0, Math.trunc(rating)));
  return `${"★".repeat(filled)}${"☆".repeat(MAX_REVIEW_RATING - filled)}`;
}
