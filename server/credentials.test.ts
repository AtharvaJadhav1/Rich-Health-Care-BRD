import assert from "node:assert/strict";
import test from "node:test";
import { generatePassword, generateMemberCode, isValidPan, normalizePan, normalizePinCode } from "./credentials";

test("PAN format check", () => {
  assert.equal(isValidPan("ABCDE1234F"), true);
  assert.equal(isValidPan("abcde1234f"), true);
  assert.equal(isValidPan("ABCDE1234"), false);
  assert.equal(normalizePan(" abcde1234f "), "ABCDE1234F");
});

test("generated passwords are long enough and not sequential", () => {
  const a = generatePassword();
  const b = generatePassword();
  assert.equal(a.length, 12);
  assert.notEqual(a, b);
});

test("PIN codes normalize pasted prefixes and spaces", () => {
  assert.equal(normalizePinCode("PIN-HZH2LRFEWW"), "PIN-HZH2LRFEWW");
  assert.equal(normalizePinCode("  pin hzh2lrfeww  "), "PIN-HZH2LRFEWW");
  assert.equal(normalizePinCode("HZH2LRFEWW"), "PIN-HZH2LRFEWW");
});

test("member codes are random numeric RHC IDs", () => {
  const a = generateMemberCode();
  const b = generateMemberCode();
  assert.match(a, /^RHC[0-9]{4,6}$/);
  assert.match(b, /^RHC[0-9]{4,6}$/);
  assert.notEqual(a, "RHC0001");
  assert.notEqual(a.replace("RHC", ""), "0001");
});
