import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, hasEmailCode, hasGithub, hasGoogle, signIn } from "@/auth";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { SIGN_IN_ERRORS, type SignInError } from "@/lib/authRules";
import { safeNext } from "@/lib/session";
import { getUser } from "@/lib/users";
import { SrmCodeForm } from "./SrmCodeForm";

export const metadata: Metadata = { title: "Sign in — CN_Visualizer" };

// SRM's Google Workspace blocks unapproved apps (Error 400: access_not_configured).
// Until SRM IT approves ours, the Google button would only lead to that page,
// so it stays hidden whenever the email code works. Set SRM_GOOGLE_APPROVED=1
// once it's approved.
const srmGoogle = hasGoogle && (!hasEmailCode || process.env.SRM_GOOGLE_APPROVED === "1");

const BTN =
  "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 font-sans text-[15px] font-bold transition-colors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  // Skip the page only if the cookie's user still exists. Otherwise a stale
  // cookie (deleted account, reset database) loops /login ⇄ /dashboard forever.
  const uid = (await auth())?.user?.id;
  if (uid && (await getUser(uid))) redirect(next);

  const code = typeof params.error === "string" ? params.error : undefined;
  const error = code ? (SIGN_IN_ERRORS[code as SignInError] ?? "Sign-in did not go through. Please try again.") : null;

  async function go(provider: string) {
    "use server";
    await signIn(provider, { redirectTo: next });
  }

  return (
    <AccountShell
      icon="login"
      eyebrow="ACCOUNT"
      title="Sign in"
      blurb="Lessons stay open to everyone. Sign in to save your progress and, if you are in a class, let your faculty see it."
    >
      {error && (
        <p role="alert" className="mb-md flex items-start gap-2 rounded-lg border border-coral/60 bg-coral/10 px-md py-sm font-body-sm text-body-sm text-coral">
          <Icon name="warning" className="mt-0.5 text-[18px]" />
          {error}
        </p>
      )}

      {!hasGoogle && !hasGithub && !hasEmailCode ? (
        <Panel>
          <p className="font-body-md text-on-surface-variant">
            Sign-in is not configured on this deployment yet. The site owner needs to add the OAuth keys
            (see <span className="font-mono text-[13px] text-on-surface">.env.example</span>).
          </p>
        </Panel>
      ) : (
        <div className="grid gap-md md:grid-cols-2">
          <Panel className="border-primary/60">
            <p className="font-label-caps text-label-caps uppercase text-primary">SRM students &amp; faculty</p>
            <h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">Use your SRM account</h2>
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              {hasEmailCode
                ? "We email a one-time code to your SRM mailbox. Typing it here proves the account is yours, with no password needed."
                : "Your SRM Google login. Google confirms the account belongs to SRM, and your password never reaches this site."}
            </p>
            {hasEmailCode && (
              <div className="mt-md">
                <SrmCodeForm next={next} />
              </div>
            )}
            {srmGoogle && (
              <form action={go.bind(null, "srm")} className="mt-md">
                <button
                  className={`${BTN} ${hasEmailCode ? "border-outline-variant text-on-surface hover:border-primary hover:text-primary" : "border-primary bg-primary text-on-primary hover:bg-primary-fixed"}`}
                >
                  <Icon name="google" className="text-[20px]" />
                  {hasEmailCode ? "Or use SRM Google" : "Continue with SRM Google"}
                </button>
              </form>
            )}
            {!hasEmailCode && !srmGoogle && (
              <p className="mt-md font-body-sm text-on-surface-variant/70">Not available on this deployment.</p>
            )}
          </Panel>

          <Panel>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Everyone else</p>
            <h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">Personal account</h2>
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              Any Google or GitHub account. Join a class later with the code your teacher gives you.
            </p>
            <div className="mt-md flex flex-col gap-sm">
              {hasGoogle && (
                <form action={go.bind(null, "google")}>
                  <button className={`${BTN} border-outline-variant text-on-surface hover:border-primary hover:text-primary`}>
                    <Icon name="google" className="text-[20px]" />
                    Continue with Google
                  </button>
                </form>
              )}
              {hasGithub && (
                <form action={go.bind(null, "github")}>
                  <button className={`${BTN} border-outline-variant text-on-surface hover:border-primary hover:text-primary`}>
                    <Icon name="github" className="text-[20px]" />
                    Continue with GitHub
                  </button>
                </form>
              )}
            </div>
          </Panel>
        </div>
      )}

      <p className="mt-lg font-body-sm text-body-sm text-on-surface-variant/80">
        We store your name, email and lesson progress, nothing else. There are no passwords here to leak.{" "}
        <Link href="/privacy" className="text-primary underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="text-primary underline">
          Terms
        </Link>
      </p>
    </AccountShell>
  );
}
