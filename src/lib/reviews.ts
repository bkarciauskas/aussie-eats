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
