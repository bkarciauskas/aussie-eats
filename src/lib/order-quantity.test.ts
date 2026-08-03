import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_LINE_QUANTITY, parseOrderLineQuantity } from "./orders";

describe("parseOrderLineQuantity", () => {
  it("accepts normal quantities and floors fractions", () => {
    assert.equal(parseOrderLineQuantity(1), 1);
    assert.equal(parseOrderLineQuantity(2), 2);
    assert.equal(parseOrderLineQuantity(MAX_LINE_QUANTITY), MAX_LINE_QUANTITY);
    assert.equal(parseOrderLineQuantity(1.9), 1);
  });

  it("rejects zero, negative, non-finite, and oversized values", () => {
    for (const q of [0, -1, 0.5, MAX_LINE_QUANTITY + 1, 1e9, NaN, Infinity, "", "abc", null, undefined]) {
      assert.equal(parseOrderLineQuantity(q), null, String(q));
    }
  });
});
