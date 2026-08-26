import assert from "node:assert/strict";
import test from "node:test";
import { computeMatching } from "./matching";

test("one pair nets ₹225 after 5% GST and 5% admin cut", () => {
  const result = computeMatching({
    carryLeft: 0,
    carryRight: 0,
    newLeft: 1,
    newRight: 1,
    pairValue: 250,
    dailyCap: 10,
    gstPercent: 5,
    adminCutPercent: 5,
  });
  assert.equal(result.pairsMatched, 1);
  assert.equal(result.grossPayout, 250);
  assert.equal(result.netPayout, 225);
  assert.equal(result.gstCut + result.adminCut, 25);
  assert.equal(result.leftoverLeft, 0);
  assert.equal(result.leftoverRight, 0);
});

test("hard-caps at 10 pairs even when both legs are huge", () => {
  const result = computeMatching({
    carryLeft: 40,
    carryRight: 55,
    newLeft: 20,
    newRight: 10,
    pairValue: 250,
    dailyCap: 10,
    gstPercent: 5,
    adminCutPercent: 5,
  });
  assert.equal(result.pairsMatched, 10);
  assert.equal(result.netPayout, 2250);
  assert.equal(result.leftoverLeft, 50);
  assert.equal(result.leftoverRight, 55);
});

test("unmatched volume carries forward", () => {
  const result = computeMatching({
    carryLeft: 2,
    carryRight: 0,
    newLeft: 1,
    newRight: 1,
    pairValue: 250,
    dailyCap: 10,
    gstPercent: 5,
    adminCutPercent: 5,
  });
  assert.equal(result.pairsMatched, 1);
  assert.equal(result.leftoverLeft, 2);
  assert.equal(result.leftoverRight, 0);
});
