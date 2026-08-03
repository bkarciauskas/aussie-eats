import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cartSubtotalCents } from "./cart-types";

describe("cartSubtotalCents", () => {
  it("multiplies unit price by quantity per line", () => {
    assert.equal(
      cartSubtotalCents([
        { unitPriceCents: 1890, quantity: 2 },
        { unitPriceCents: 500, quantity: 3 },
      ]),
      1890 * 2 + 500 * 3,
    );
  });

  it("returns 0 for an empty cart", () => {
    assert.equal(cartSubtotalCents([]), 0);
  });

  it("does not treat dollars-as-cents as valid menu prices", () => {
    // Regression: restaurant page previously passed priceCents/100 into the cart.
    const buggyUnit = 1890 / 100;
    assert.notEqual(cartSubtotalCents([{ unitPriceCents: buggyUnit, quantity: 1 }]), 1890);
    assert.equal(cartSubtotalCents([{ unitPriceCents: 1890, quantity: 1 }]), 1890);
  });
});
