// Sign-in rules: who gets in, in which mode, with which role.
// Run: node --experimental-strip-types tests/auth.test.mts
import assert from "node:assert/strict";
import { classifySignIn, normalizeRegNo, parseEmailList, REG_NO_PATTERN, srmEmailFromNetId } from "../lib/authRules.ts";
import { cleanCode, hashCode, hashesMatch, newCode } from "../lib/loginCode.ts";

const faculty = parseEmailList(" Prof.Kumar@srmist.edu.in, teacher@gmail.com\nhod@srmist.edu.in ");
let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};

console.log("auth rules");

check("SRM button + SRM Workspace account → srm student with NetID", () => {
  const v = classifySignIn({ provider: "srm", email: "AB1234@srmist.edu.in", emailVerified: true, hd: "srmist.edu.in" }, faculty);
  assert.deepEqual(v, { ok: true, email: "ab1234@srmist.edu.in", mode: "srm", netId: "ab1234", role: "student" });
});

check("SRM button + personal Gmail → refused", () => {
  const v = classifySignIn({ provider: "srm", email: "someone@gmail.com", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: false, reason: "not-srm" });
});

check("SRM button + srmist address but no hd claim (not Workspace-proven) → refused", () => {
  const v = classifySignIn({ provider: "srm", email: "ab1234@srmist.edu.in", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: false, reason: "not-srm" });
});

check("SRM button + hd claim for a different domain → refused", () => {
  const v = classifySignIn({ provider: "srm", email: "x@other.edu", emailVerified: true, hd: "other.edu" }, faculty);
  assert.deepEqual(v, { ok: false, reason: "not-srm" });
});

check("Global Google + Gmail → global student", () => {
  const v = classifySignIn({ provider: "google", email: "someone@gmail.com", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: true, email: "someone@gmail.com", mode: "global", role: "student" });
});

check("Global Google + SRM Workspace account → still srm (Google proved it)", () => {
  const v = classifySignIn({ provider: "google", email: "ab1234@srmist.edu.in", emailVerified: true, hd: "srmist.edu.in" }, faculty);
  assert.equal(v.ok && v.mode, "srm");
});

check("Unverified Google email → refused", () => {
  const v = classifySignIn({ provider: "google", email: "a@gmail.com", emailVerified: false }, faculty);
  assert.deepEqual(v, { ok: false, reason: "unverified" });
});

check("GitHub + verified personal email → global student", () => {
  const v = classifySignIn({ provider: "github", email: "dev@example.com", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: true, email: "dev@example.com", mode: "global", role: "student" });
});

check("GitHub + unverified email → refused", () => {
  const v = classifySignIn({ provider: "github", email: "dev@example.com", emailVerified: false }, faculty);
  assert.deepEqual(v, { ok: false, reason: "unverified" });
});

check("GitHub may not claim an SRM address, even verified", () => {
  const v = classifySignIn({ provider: "github", email: "ab1234@srmist.edu.in", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: false, reason: "srm-use-google" });
});

check("No email → refused", () => {
  assert.deepEqual(classifySignIn({ provider: "google", email: null, emailVerified: true }, faculty), { ok: false, reason: "no-email" });
});

check("Allowlisted SRM faculty (case-insensitive) → faculty", () => {
  const v = classifySignIn({ provider: "srm", email: "prof.kumar@SRMIST.edu.in", emailVerified: true, hd: "srmist.edu.in" }, faculty);
  assert.equal(v.ok && v.role, "faculty");
});

check("Allowlisted Gmail via Google → faculty in global mode", () => {
  const v = classifySignIn({ provider: "google", email: "teacher@gmail.com", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: true, email: "teacher@gmail.com", mode: "global", role: "faculty" });
});

check("Allowlisted email via GitHub → student (faculty needs Google)", () => {
  const v = classifySignIn({ provider: "github", email: "teacher@gmail.com", emailVerified: true }, faculty);
  assert.equal(v.ok && v.role, "student");
});

check("Empty FACULTY_EMAILS → nobody is faculty", () => {
  const v = classifySignIn({ provider: "srm", email: "hod@srmist.edu.in", emailVerified: true, hd: "srmist.edu.in" }, parseEmailList(undefined));
  assert.equal(v.ok && v.role, "student");
});

check("Email code + SRM address → srm student (mailbox proven, no hd needed)", () => {
  const v = classifySignIn({ provider: "srm-email", email: "ds8237@srmist.edu.in", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: true, email: "ds8237@srmist.edu.in", mode: "srm", netId: "ds8237", role: "student" });
});

check("Email code for a non-SRM address → refused", () => {
  const v = classifySignIn({ provider: "srm-email", email: "a@gmail.com", emailVerified: true }, faculty);
  assert.deepEqual(v, { ok: false, reason: "not-srm" });
});

check("Email code without a verified mailbox → refused", () => {
  const v = classifySignIn({ provider: "srm-email", email: "ds8237@srmist.edu.in", emailVerified: false }, faculty);
  assert.deepEqual(v, { ok: false, reason: "unverified" });
});

check("Allowlisted faculty via email code → faculty", () => {
  const v = classifySignIn({ provider: "srm-email", email: "hod@srmist.edu.in", emailVerified: true }, faculty);
  assert.equal(v.ok && v.role, "faculty");
});

check("NetID box: bare NetID, full address, case and spaces", () => {
  assert.equal(srmEmailFromNetId("ds8237"), "ds8237@srmist.edu.in");
  assert.equal(srmEmailFromNetId("  DS8237@SRMIST.EDU.IN "), "ds8237@srmist.edu.in");
  assert.equal(srmEmailFromNetId("ds8237@gmail.com"), null);
  assert.equal(srmEmailFromNetId("a"), null);
  assert.equal(srmEmailFromNetId("ds 8237"), null);
  assert.equal(srmEmailFromNetId(""), null);
});

check("Codes: six digits, keyed hash, constant-time match", () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), /^\d{6}$/);
  const h = hashCode("ds8237@srmist.edu.in", "042917", "secret");
  assert.ok(hashesMatch(h, hashCode("DS8237@srmist.edu.in", "042917", "secret")));
  assert.ok(!hashesMatch(h, hashCode("ds8237@srmist.edu.in", "042918", "secret")));
  assert.ok(!hashesMatch(h, hashCode("ds8237@srmist.edu.in", "042917", "other-secret")));
  assert.ok(!hashesMatch(h, hashCode("xx0000@srmist.edu.in", "042917", "secret")));
  assert.ok(!hashesMatch(h, ""));
  assert.equal(cleanCode(" 042 917 "), "042917");
  assert.equal(cleanCode("042-917"), "042917");
  assert.equal(cleanCode("42917"), null);
  assert.equal(cleanCode("04291a"), null);
});

check("Register number format", () => {
  assert.ok(REG_NO_PATTERN.test(normalizeRegNo(" ra2211003010123 ")));
  assert.ok(!REG_NO_PATTERN.test("RA22110030101"));
  assert.ok(!REG_NO_PATTERN.test("AB2211003010123"));
});

console.log(`ALL ${n} AUTH CHECKS PASSED`);
