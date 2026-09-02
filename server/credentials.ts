import { randomInt } from "crypto";

/** Indian PAN: five letters, four digits, one letter. Format check only (Phase 1). */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
const PIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePan(value: string) {
  return value.trim().toUpperCase();
}

export function isValidPan(value: string) {
  return PAN_PATTERN.test(normalizePan(value));
}

export function generatePassword(length = 12) {
  return Array.from({ length }, () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)]).join("");
}

export function generatePinCode() {
  const body = Array.from({ length: 10 }, () => PIN_CHARS[randomInt(PIN_CHARS.length)]).join("");
  return `PIN-${body}`;
}

/** Accepts `PIN-ABC…`, `pin abc…`, or the body only. */
export function normalizePinCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = compact.startsWith("PIN") ? compact.slice(3) : compact;
  return body ? `PIN-${body}` : "";
}
