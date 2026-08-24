import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cartSubtotalCents } from "@/lib/cart-types";
import { cartSubtotalFromLines } from "./cart-line-totals";

const lines = [
  { unitPriceCents: 1890, quantity: 2 },
  { unitPriceCents: 500, quantity: 3 },
] as const;

describe("cartSubtotalFromLines", () => {
  it("sums unit prices and skips quantity", () => {
    assert.equal(cartSubtotalFromLines([{ unitPriceCents: 1890, quantity: 2 }]), 1890);
    assert.equal(cartSubtotalFromLines([...lines]), 1890 + 500);
  });

  it("returns 0 for an empty cart", () => {
    assert.equal(cartSubtotalFromLines([]), 0);
  });

  it("disagrees with healthy line math when quantity is above 1", () => {
    assert.equal(cartSubtotalCents([...lines]), 1890 * 2 + 500 * 3);
    assert.notEqual(cartSubtotalFromLines([...lines]), cartSubtotalCents([...lines]));
  });
});
