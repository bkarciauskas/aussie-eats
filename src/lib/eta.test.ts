import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateCourierEta,
  estimateDeliveryEta,
  originFromDeliveryAddress,
  resolveOrderEtaOrigin,
} from "./eta";
import { OrderStatus } from "./roles";

const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const BONDI_RESTAURANT = { lat: -33.8915, lng: 151.2767 };

describe("estimateDeliveryEta", () => {
  it("returns a clamped minute range label", () => {
    const eta = estimateDeliveryEta({
      originLat: SYDNEY.lat,
      originLng: SYDNEY.lng,
      restaurantLat: BONDI_RESTAURANT.lat,
      restaurantLng: BONDI_RESTAURANT.lng,
    });
    assert.ok(eta.minMinutes >= 15);
    assert.ok(eta.maxMinutes <= 75);
    assert.ok(eta.maxMinutes > eta.minMinutes);
    assert.equal(eta.label, `${eta.minMinutes}–${eta.maxMinutes} min`);
  });
});

describe("estimateCourierEta", () => {
  const base = {
    originLat: SYDNEY.lat,
    originLng: SYDNEY.lng,
    restaurantLat: BONDI_RESTAURANT.lat,
    restaurantLng: BONDI_RESTAURANT.lng,
  };

  it("shrinks as status advances toward delivery", () => {
    const pending = estimateCourierEta({ ...base, status: OrderStatus.pending });
    const preparing = estimateCourierEta({ ...base, status: OrderStatus.preparing });
    const enRoute = estimateCourierEta({ ...base, status: OrderStatus.out_for_delivery });

    assert.equal(pending.kind, "eta");
    assert.equal(preparing.kind, "eta");
    assert.equal(enRoute.kind, "eta");
    if (pending.kind !== "eta" || preparing.kind !== "eta" || enRoute.kind !== "eta") {
      return;
    }

    assert.ok(preparing.maxMinutes <= pending.maxMinutes);
    assert.ok(enRoute.maxMinutes < preparing.maxMinutes);
    assert.equal(enRoute.headline, "Courier on the way");
  });

  it("returns delivered / cancelled terminals", () => {
    assert.deepEqual(
      estimateCourierEta({ ...base, status: OrderStatus.delivered }),
      { kind: "delivered" },
    );
    assert.deepEqual(
      estimateCourierEta({ ...base, status: OrderStatus.cancelled }),
      { kind: "cancelled" },
    );
  });
});

describe("originFromDeliveryAddress", () => {
  it("maps suburb and state onto demo city pins", () => {
    const bySuburb = originFromDeliveryAddress({ suburb: "Melbourne", state: "VIC" });
    assert.ok(bySuburb);
    assert.equal(bySuburb?.lat, -37.8136);

    const byState = originFromDeliveryAddress({ suburb: "Parramatta", state: "NSW" });
    assert.ok(byState);
    assert.equal(byState?.lat, -33.8688);
  });
});

describe("resolveOrderEtaOrigin", () => {
  it("prefers live location over address and restaurant city", () => {
    const origin = resolveOrderEtaOrigin({
      location: { lat: -27.4698, lng: 153.0251 },
      address: { suburb: "Sydney", state: "NSW" },
      restaurantCity: "Melbourne",
    });
    assert.deepEqual(origin, { lat: -27.4698, lng: 153.0251 });
  });

  it("falls back to restaurant city when address is unknown", () => {
    const origin = resolveOrderEtaOrigin({
      location: null,
      address: { suburb: "Somewhere", state: "XX" },
      restaurantCity: "Perth",
    });
    assert.ok(origin);
    assert.equal(origin?.lat, -31.9505);
  });
});
