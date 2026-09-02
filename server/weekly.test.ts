import assert from "node:assert/strict";
import test from "node:test";
import { weekBounds } from "./weekly";

test("IST week is Monday through Sunday", () => {
  const wednesday = new Date("2026-08-26T18:30:00.000Z");
  const { weekStart, weekEnd } = weekBounds(wednesday);
  assert.equal(weekStart, "2026-08-24");
  assert.equal(weekEnd, "2026-08-30");
});
