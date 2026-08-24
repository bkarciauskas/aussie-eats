import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CART_SUBTOTAL_IGNORES_QTY, parseDemoScenarioId } from "./scenarios";
import {
  emptyDemoState,
  parseDemoState,
  serializeDemoState,
  withScenarioEnabled,
} from "./state";

describe("parseDemoScenarioId", () => {
  it("accepts the registry id", () => {
    assert.equal(parseDemoScenarioId("cart-subtotal-ignores-qty"), CART_SUBTOTAL_IGNORES_QTY);
  });

  it("drops unknown ids", () => {
    assert.equal(parseDemoScenarioId("legacy-gst-pricing"), null);
    assert.equal(parseDemoScenarioId(12), null);
  });
});

describe("parseDemoState", () => {
  it("reads known enabled ids", () => {
    const state = parseDemoState({ enabled: ["cart-subtotal-ignores-qty"] });
    assert.deepEqual([...state.enabled], [CART_SUBTOTAL_IGNORES_QTY]);
  });

  it("drops unknown ids and garbage payloads", () => {
    assert.deepEqual([...parseDemoState({ enabled: ["nope"] }).enabled], []);
    assert.deepEqual([...parseDemoState("nope").enabled], []);
    assert.deepEqual([...parseDemoState(null).enabled], []);
    assert.deepEqual([...parseDemoState({ enabled: "cart-subtotal-ignores-qty" }).enabled], []);
  });

  it("round-trips through serialize", () => {
    const state = withScenarioEnabled(emptyDemoState(), CART_SUBTOTAL_IGNORES_QTY, true);
    const parsed = parseDemoState(JSON.parse(serializeDemoState(state)));
    assert.deepEqual([...parsed.enabled], [CART_SUBTOTAL_IGNORES_QTY]);
  });
});
