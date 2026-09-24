"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { normalizeRegNo, REG_NO_PATTERN } from "@/lib/authRules";
import { safeNext } from "@/lib/session";
import { getUser, saveProfile } from "@/lib/users";

export interface OnboardingState {
  error?: string;
  /** What they typed. React resets the form after an action, so an error must hand it back. */
  values?: Record<string, string>;
}

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function completeOnboarding(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const result = await validateAndSave(form);
  if (!result) redirect(safeNext(String(form.get("next") ?? "")));
  const values: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string" && !k.startsWith("$")) values[k] = v.slice(0, 100);
  return { error: result, values };
}

/** Returns an error message, or null once saved. */
async function validateAndSave(form: FormData): Promise<string | null> {
  const session = await auth();
  const user = session?.user?.id ? await getUser(session.user.id) : null;
  if (!user) redirect("/login");

  const name = text(form, "name", 80);
  if (name.length < 2) return "Please enter your name.";

  if (user.mode === "srm") {
    const regNo = normalizeRegNo(text(form, "regNo", 30));
    if (!REG_NO_PATTERN.test(regNo)) return "Register number should look like RA2211003010123: RA followed by 13 digits.";
    const dept = text(form, "dept", 40);
    if (!dept) return "Please enter your department.";
    const year = Number(form.get("year"));
    if (!Number.isInteger(year) || year < 1 || year > 5) return "Please pick your year.";
    const section = text(form, "section", 8).toUpperCase();
    if (!/^[A-Z0-9-]{1,8}$/.test(section)) return "Section should be short, like A1 or K2.";
    await saveProfile(user._id.toHexString(), name, { regNo, dept, year, section });
  } else {
    await saveProfile(user._id.toHexString(), name, { org: text(form, "org", 80) || undefined });
  }
  return null;
}
