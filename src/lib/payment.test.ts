import assert from "node:assert/strict";
import test from "node:test";
import {
  cardLast4,
  detectCardBrand,
  formatCardPaymentLabel,
  parsePaymentMethod,
  paymentStatusLabel,
} from "./payment";

test("parses only supported payment method ids", () => {
  assert.equal(parsePaymentMethod("card"), "card");
  assert.equal(parsePaymentMethod("apple_pay"), "apple_pay");
  assert.equal(parsePaymentMethod("cash"), null);
  assert.equal(parsePaymentMethod(undefined), null);
});

test("detects common card brands after normalising the number", () => {
  assert.equal(detectCardBrand("4242 4242 4242 4242"), "Visa");
  assert.equal(detectCardBrand("5555 5555 5555 4444"), "Mastercard");
  assert.equal(detectCardBrand("3782 822463 10005"), "Amex");
  assert.equal(detectCardBrand("6011 1111 1111 1117"), "Card");
});

test("extracts and formats safe card details", () => {
  assert.equal(cardLast4("4242 4242 4242 4242"), "4242");
  assert.equal(cardLast4("12"), null);
  assert.equal(formatCardPaymentLabel({ brand: "Visa", last4: "4242" }), "Card · Visa ending 4242");
  assert.equal(formatCardPaymentLabel({ brand: "Visa", last4: "42" }), null);
});

test("labels payment settlement from the persisted method", () => {
  assert.equal(paymentStatusLabel("Pay on delivery"), "Due on delivery");
  assert.equal(paymentStatusLabel("Apple Pay"), "Paid (demo)");
  assert.equal(paymentStatusLabel("Card · Visa ending 4242"), "Paid (demo)");
});
