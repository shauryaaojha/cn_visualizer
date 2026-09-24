// ---------------------------------------------------------------------------
// Auth.js (next-auth v5). JWT sessions in an httpOnly cookie, so no password
// is ever stored. The user record lives in Mongo (lib/users.ts), and so do the
// pending email codes (lib/codeStore.ts).
//
// Providers, each only when its env vars are present:
//   srm-email  a 6-digit code mailed to netid@srmist.edu.in (needs SMTP_*)
//   srm        Google, with the consent screen pinned to srmist.edu.in. SRM's
//              Workspace admins block it until they approve the app.
//   google     Google, any account           (global mode)
//   github     GitHub                        (global mode)
// Both Google entries share one OAuth client. Register BOTH callback URLs on it:
//   <site>/api/auth/callback/srm   and   <site>/api/auth/callback/google
// ---------------------------------------------------------------------------

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { classifySignIn, parseEmailList, SRM_DOMAIN, srmEmailFromNetId, type SignInClaim } from "@/lib/authRules";
import { redeemCode } from "@/lib/codeStore";
import { cleanCode } from "@/lib/loginCode";
import { devMailer, hasMailer } from "@/lib/mail";
import { upsertUser } from "@/lib/users";

const env = process.env;
export const hasGoogle = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const hasGithub = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
export const hasEmailCode = hasMailer || devMailer;

const google = { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET };

const providers: NextAuthConfig["providers"] = [];
if (hasEmailCode) {
  providers.push(
    Credentials({
      id: "srm-email",
      name: "SRM email code",
      credentials: { email: {}, code: {} },
      // Returns the user only when the code matches. It is checked, then spent, in one step.
      async authorize(input) {
        const email = srmEmailFromNetId(String(input?.email ?? ""));
        const code = cleanCode(String(input?.code ?? ""));
        if (!email || !code || !(await redeemCode(email, code))) return null;
        // No name: that would overwrite the one they gave at onboarding on every sign-in.
        return { id: email, email };
      },
    }),
  );
}
if (hasGoogle) {
  providers.push(
    Google({
      ...google,
      id: "srm",
      name: "SRM",
      authorization: { params: { hd: SRM_DOMAIN, prompt: "select_account" } },
    }),
    Google({ ...google, authorization: { params: { prompt: "select_account" } } }),
  );
}
if (hasGithub) providers.push(GitHub);

/** GitHub's profile email can be unverified; its emails API says which are. */
async function githubEmailVerified(accessToken: string | undefined, email: string | null | undefined) {
  if (!accessToken || !email) return false;
  const res = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "cn-visualizer", Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return false;
  const list = (await res.json()) as { email: string; verified: boolean }[];
  return list.some((e) => e.verified && e.email.toLowerCase() === email.toLowerCase());
}

async function claimFor(
  provider: string,
  email: string | null | undefined,
  profile: unknown,
  accessToken: string | undefined,
): Promise<SignInClaim> {
  if (provider === "github") {
    return { provider, email, emailVerified: await githubEmailVerified(accessToken, email) };
  }
  // authorize() only returns a user after the mailbox code matched.
  if (provider === "srm-email") return { provider, email, emailVerified: true };
  const p = (profile ?? {}) as Partial<GoogleProfile>;
  return { provider, email: p.email ?? email, emailVerified: p.email_verified === true, hd: p.hd };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Runs once per sign-in, before the cookie is written. Returning a path
    // refuses the sign-in and sends them there with the reason.
    async signIn({ user, account, profile }) {
      if (!account) return false;
      const claim = await claimFor(account.provider, user.email, profile, account.access_token);
      const verdict = classifySignIn(claim, parseEmailList(env.FACULTY_EMAILS));
      if (!verdict.ok) return `/login?error=${verdict.reason}`;

      const doc = await upsertUser({ ...verdict, name: user.name, image: user.image, provider: account.provider });
      // Hand the Mongo id to the jwt callback, which runs next.
      user.id = doc._id.toHexString();
      user.mode = doc.mode;
      user.role = doc.role;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.mode = user.mode;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      const { uid, mode, role } = token;
      if (typeof uid === "string" && (mode === "srm" || mode === "global") && (role === "student" || role === "faculty")) {
        session.user.id = uid;
        session.user.mode = mode;
        session.user.role = role;
      }
      return session;
    },
  },
});
