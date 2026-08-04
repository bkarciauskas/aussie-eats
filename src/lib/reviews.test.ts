import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blendRestaurantRating,
  formatReviewStars,
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
  it("is the inverse of blendRestaurantRating", () => {
    const blended = blendRestaurantRating(4.0, 1, 5);
    const restored = unblendRestaurantRating(blended.rating, blended.userRatingCount, 5);
    assert.equal(restored.userRatingCount, 1);
    assert.equal(restored.rating, 4.0);
  });

  it("zeros count when removing the last blended review", () => {
    const next = unblendRestaurantRating(3, 1, 3);
    assert.equal(next.userRatingCount, 0);
    assert.equal(next.rating, 3);
  });
});

describe("formatReviewStars", () => {
  it("renders filled and empty stars", () => {
    assert.equal(formatReviewStars(5), "★★★★★");
    assert.equal(formatReviewStars(4), "★★★★☆");
    assert.equal(formatReviewStars(3), "★★★☆☆");
  });
});
