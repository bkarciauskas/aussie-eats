import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePage,
  restaurantListPageHref,
  RESTAURANT_LIST_PAGE_SIZE,
  totalPages,
} from "./restaurant-list";

test("RESTAURANT_LIST_PAGE_SIZE is 10", () => {
  assert.equal(RESTAURANT_LIST_PAGE_SIZE, 10);
});

test("parsePage clamps invalid values to 1", () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage(null), 1);
  assert.equal(parsePage(""), 1);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-3"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage("2"), 2);
  assert.equal(parsePage("99"), 99);
});

test("totalPages rounds up and handles empty", () => {
  assert.equal(totalPages(0), 1);
  assert.equal(totalPages(10), 1);
  assert.equal(totalPages(11), 2);
  assert.equal(totalPages(15), 2);
});

test("restaurantListPageHref preserves params and omits page=1", () => {
  const base = new URLSearchParams("city=sydney&q=ramen&page=3");
  assert.equal(
    restaurantListPageHref(base, 1),
    "/restaurants?city=sydney&q=ramen",
  );
  assert.equal(
    restaurantListPageHref(base, 2),
    "/restaurants?city=sydney&q=ramen&page=2",
  );
  assert.equal(restaurantListPageHref("", 1), "/restaurants");
  assert.equal(restaurantListPageHref("", 2), "/restaurants?page=2");
});
