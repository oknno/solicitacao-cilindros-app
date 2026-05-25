import assert from "node:assert/strict";
import test from "node:test";
import { buildStockItemTitle } from "../../../src/domain/materialRequest/buildStockItemTitle.ts";

test("buildStockItemTitle concatena centro e material", () => {
  assert.equal(buildStockItemTitle("9860", "29092"), "9860-29092");
});

test("buildStockItemTitle aplica trim", () => {
  assert.equal(buildStockItemTitle(" 9860 ", " 0029092 "), "9860-0029092");
});
