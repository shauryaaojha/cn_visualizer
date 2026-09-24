// ---------------------------------------------------------------------------
// loginCode — the one-time codes emailed to SRM mailboxes. The pure half,
// kept free of Mongo and Next so tests can run it directly.
//
// Only a keyed hash of each code is stored, so a database leak does not hand
// out live codes. A code is valid for 10 minutes and allows 5 guesses. Only
// the newest code for an address counts.
// ---------------------------------------------------------------------------

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_GUESSES = 5;
/** Codes one address may request per window, so nobody can flood an inbox. */
export const MAX_SENDS_PER_ADDRESS = 3;
/** Codes the whole site may send per window. Gmail SMTP allows ~500 a day. */
export const MAX_SENDS_TOTAL = 60;
export const SEND_WINDOW_MS = 15 * 60 * 1000;

export function newCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(email: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

/** Constant-time comparison of two hex hashes. */
export function hashesMatch(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** "123 456", "123-456" → "123456"; anything that isn't six digits → null. */
export function cleanCode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}
