// ---------------------------------------------------------------------------
// authRules — who is allowed in, and as what. Pure so tests can run it without
// Google, Mongo or Next.
//
// Ways in:
//   "srm"        Google, locked to the srmist.edu.in Workspace. Proof is the
//                `hd` claim in Google's signed ID token. The `hd=` URL hint on
//                the consent screen is only a hint and the user can edit it.
//   "srm-email"  A one-time code emailed to netid@srmist.edu.in. Typing it back
//                proves the mailbox is theirs. SRM's Workspace admins block
//                unapproved Google apps (Error 400: access_not_configured), so
//                this is the way SRM students actually get in.
//   global       Google (any account) or GitHub.
//
// SRM mode is decided by what was proven, not by which button was pressed: an
// SRM account that comes in through the global Google button is still SRM.
// GitHub proves neither Workspace membership nor the mailbox, so it may not
// claim an SRM address.
// ---------------------------------------------------------------------------

export const SRM_DOMAIN = "srmist.edu.in";

export type AuthMode = "srm" | "global";
export type Role = "student" | "faculty";

export interface SignInClaim {
  /** Auth.js provider id: "srm", "srm-email", "google" or "github". */
  provider: string;
  email?: string | null;
  emailVerified?: boolean;
  /** Google's hosted-domain claim; absent for personal Gmail. */
  hd?: string | null;
}

export type SignInVerdict =
  | { ok: true; email: string; mode: AuthMode; netId?: string; role: Role }
  | { ok: false; reason: SignInError };

export type SignInError = "no-email" | "unverified" | "not-srm" | "srm-use-google";

export const SIGN_IN_ERRORS: Record<SignInError, string> = {
  "no-email": "That account did not share an email address with us.",
  unverified: "That email address is not verified with the provider.",
  "not-srm": "SRM sign-in only accepts @srmist.edu.in accounts. Use “Everyone else” for other accounts.",
  "srm-use-google": "SRM addresses sign in through the SRM box, so we can confirm the mailbox is yours.",
};

/** FACULTY_EMAILS is a comma/space/newline separated list, compared case-insensitively. */
export function parseEmailList(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function classifySignIn(claim: SignInClaim, faculty: Set<string>): SignInVerdict {
  const email = claim.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "no-email" };

  const isGoogle = claim.provider === "srm" || claim.provider === "google";
  const isCode = claim.provider === "srm-email";
  const srmAddress = email.endsWith(`@${SRM_DOMAIN}`);

  // Accounts are keyed by email, so an unverified one could walk into someone
  // else's progress. Google sends email_verified; for GitHub, auth.ts asks the
  // emails API.
  if (claim.emailVerified !== true) return { ok: false, reason: "unverified" };

  // Either Google says this account belongs to the SRM Workspace, or the
  // person read a code out of the SRM mailbox.
  const provenSrm = srmAddress && ((isGoogle && claim.hd?.toLowerCase() === SRM_DOMAIN) || isCode);

  if ((claim.provider === "srm" || isCode) && !provenSrm) return { ok: false, reason: "not-srm" };
  if (!isGoogle && !isCode && srmAddress) return { ok: false, reason: "srm-use-google" };

  // Faculty needs the allowlist and an address proven by Google or by a code.
  const role: Role = (isGoogle || isCode) && faculty.has(email) ? "faculty" : "student";

  return provenSrm
    ? { ok: true, email, mode: "srm", netId: email.slice(0, -(SRM_DOMAIN.length + 1)), role }
    : { ok: true, email, mode: "global", role };
}

/**
 * What a student types into the NetID box ("ds8237", "DS8237@srmist.edu.in")
 * → their SRM address, or null if it can't be one.
 */
export function srmEmailFromNetId(raw: string): string | null {
  let local = raw.trim().toLowerCase();
  if (local.endsWith(`@${SRM_DOMAIN}`)) local = local.slice(0, -(SRM_DOMAIN.length + 1));
  return /^[a-z0-9][a-z0-9._-]{1,63}$/.test(local) ? `${local}@${SRM_DOMAIN}` : null;
}

/** SRM register numbers: "RA" + 13 digits, e.g. RA2211003010123. */
export const REG_NO_PATTERN = /^RA\d{13}$/;

export function normalizeRegNo(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}
