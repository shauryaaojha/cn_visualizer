"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { srmEmailFromNetId } from "@/lib/authRules";
import { issueCode } from "@/lib/codeStore";
import { sendLoginCode } from "@/lib/mail";
import { safeNext } from "@/lib/session";

export interface CodeState {
  /** Set once a code has been sent. The form then asks for the code. */
  email?: string;
  error?: string;
  /** When this state was produced. Lets the form tell which of send/verify happened last. */
  at?: number;
}

export async function sendCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const email = srmEmailFromNetId(String(form.get("netId") ?? ""));
  if (!email) return { error: "Enter your NetID, the part of your SRM email before @srmist.edu.in (e.g. ab1234)." };

  const issued = await issueCode(email);
  if (!issued.ok) {
    return {
      at: Date.now(),
      // Too many sends: still show the code box, because their last code works.
      email: issued.reason === "too-many" ? email : undefined,
      error:
        issued.reason === "too-many"
          ? "Too many codes for this NetID. Use the last one we sent, or try again in 15 minutes."
          : "Lots of people are signing in right now. Try again in a few minutes.",
    };
  }
  try {
    await sendLoginCode(email, issued.code);
  } catch (err) {
    console.error("sendLoginCode failed", err instanceof Error ? err.message : err);
    return { error: "We couldn't send the email just now. Try again in a minute." };
  }
  return { email, at: Date.now() };
}

export async function verifyCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("srm-email", {
      email,
      code: String(form.get("code") ?? ""),
      redirectTo: safeNext(String(form.get("next") ?? "")),
    });
  } catch (err) {
    // A successful sign-in "throws" a redirect. Let that through; only real auth failures stop here.
    if (err instanceof AuthError) {
      return { email, at: Date.now(), error: "That code is wrong or has expired. Check the latest email, or send a new code." };
    }
    throw err;
  }
  return { email };
}
