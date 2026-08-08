import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getOriginMarkerIcon } from "./origin-marker-icon";

type GoogleStub = {
  maps?: {
    SymbolPath?: { CIRCLE: number };
  };
};

function setGoogle(value: GoogleStub | undefined) {
  Object.defineProperty(globalThis, "google", {
    value,
    writable: true,
    configurable: true,
  });
}

describe("getOriginMarkerIcon", () => {
  const previous = (globalThis as { google?: GoogleStub }).google;

  afterEach(() => {
    setGoogle(previous);
  });

  it("returns null when the google global is missing", () => {
    setGoogle(undefined);
    assert.equal(getOriginMarkerIcon(), null);
  });

  it("returns null when SymbolPath is not available yet", () => {
    setGoogle({ maps: {} });
    assert.equal(getOriginMarkerIcon(), null);
  });

  it("returns the circle icon once SymbolPath is available", () => {
    setGoogle({ maps: { SymbolPath: { CIRCLE: 0 } } });
    const icon = getOriginMarkerIcon();
    assert.ok(icon);
    assert.equal(icon.path, 0);
    assert.equal(icon.scale, 8);
    assert.equal(icon.fillColor, "#2563eb");
    assert.equal(icon.fillOpacity, 1);
    assert.equal(icon.strokeColor, "#ffffff");
    assert.equal(icon.strokeWeight, 2);
  });
});
