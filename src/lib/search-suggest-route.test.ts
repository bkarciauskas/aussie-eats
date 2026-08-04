import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET } from "@/app/api/search/suggest/route";

describe("GET /api/search/suggest", () => {
  it("returns an empty list when the query is blank", async () => {
    const response = await GET(
      new Request("http://localhost/api/search/suggest?q=%20"),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { suggestions: [] });
  });
});
