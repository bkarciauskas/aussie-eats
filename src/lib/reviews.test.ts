import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blendRestaurantRating,
  formatStarRating,
  normalizeReviewComment,
  parseReviewRating,
  unblendRestaurantRating,
  MAX_REVIEW_COMMENT_LENGTH,
} from "./reviews";

describe("parseReviewRating", () => {
  it("accepts integers 1–5 and truncates fractions", () => {
    assert.equal(parseReviewRating(1), 1);
    assert.equal(parseReviewRating(5), 5);
    assert.equal(parseReviewRating(4.9), 4);
    assert.equal(parseReviewRating("3"), 3);
  });

  it("rejects out-of-range and non-numeric values", () => {
    for (const v of [0, 6, -1, NaN, Infinity, "", "abc", null, undefined]) {
      assert.equal(parseReviewRating(v), null, String(v));
    }
  });
});

describe("normalizeReviewComment", () => {
  it("trims and caps length", () => {
    assert.equal(normalizeReviewComment("  yum  "), "yum");
    assert.equal(normalizeReviewComment(null), "");
    const long = "a".repeat(MAX_REVIEW_COMMENT_LENGTH + 40);
    assert.equal(normalizeReviewComment(long).length, MAX_REVIEW_COMMENT_LENGTH);
  });
});

describe("blendRestaurantRating", () => {
  it("increments count and blends the average", () => {
    const next = blendRestaurantRating(4.0, 1, 5);
    assert.equal(next.userRatingCount, 2);
    assert.equal(next.rating, 4.5);
  });

  it("handles zero prior reviews", () => {
    const next = blendRestaurantRating(4.5, 0, 3);
    assert.equal(next.userRatingCount, 1);
    assert.equal(next.rating, 3);
  });
});

describe("unblendRestaurantRating", () => {
  it("decrements count and restores the prior average", () => {
    const next = unblendRestaurantRating(4.5, 2, 5);
    assert.equal(next.userRatingCount, 1);
    assert.equal(next.rating, 4);
  });

  it("zeros the count when removing the last review", () => {
    const next = unblendRestaurantRating(5, 1, 5);
    assert.equal(next.userRatingCount, 0);
    assert.equal(next.rating, 5);
  });

  it("is the inverse of blendRestaurantRating", () => {
    const baseline = { rating: 4.2, count: 3 };
    const blended = blendRestaurantRating(baseline.rating, baseline.count, 5);
    const restored = unblendRestaurantRating(blended.rating, blended.userRatingCount, 5);
    assert.equal(restored.userRatingCount, baseline.count);
    assert.ok(Math.abs(restored.rating - baseline.rating) < 1e-12);
  });
});

describe("formatStarRating", () => {
  it("renders filled and empty stars", () => {
    assert.equal(formatStarRating(5), "★★★★★");
    assert.equal(formatStarRating(4), "★★★★☆");
    assert.equal(formatStarRating(3), "★★★☆☆");
    assert.equal(formatStarRating(1), "★☆☆☆☆");
  });
});
