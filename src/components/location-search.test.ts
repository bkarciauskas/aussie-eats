import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("LocationSearch markup", () => {
  const src = readFileSync(fileURLToPath(new URL("./location-search.tsx", import.meta.url)), "utf8");

  it("keeps the geo error outside the controls row", () => {
    const controlsStart = src.indexOf("data-location-search-controls");
    const errorStart = src.indexOf("data-location-search-error");
    assert.ok(controlsStart > 0, "controls row marker");
    assert.ok(errorStart > controlsStart, "error marker after controls");
    const between = src.slice(controlsStart, errorStart);
    const opened = (between.match(/<div/g) ?? []).length;
    const closed = (between.match(/<\/div>/g) ?? []).length;
    assert.ok(closed >= opened, "controls row must close before the error");
    assert.doesNotMatch(between, /sm:w-full/);
  });
});