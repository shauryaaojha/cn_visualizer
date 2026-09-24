"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { completeOnboarding, type OnboardingState } from "./actions";

const INPUT =
  "w-full rounded-md border border-outline-variant bg-black/20 px-3 py-2 font-sans text-[15px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary";

const DEPTS = ["CSE", "CSE (AI & ML)", "CSE (Data Science)", "CSE (Cyber Security)", "CSE (Cloud Computing)", "IT", "ECE", "EEE"];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="font-body-sm text-[13px] text-on-surface-variant/70">{hint}</span>}
    </label>
  );
}

export interface ProfileDefaults {
  regNo?: string;
  dept?: string;
  year?: number;
  section?: string;
  org?: string;
}

export function OnboardingForm({
  srm,
  name,
  next,
  initial = {},
}: {
  srm: boolean;
  name: string;
  next: string;
  initial?: ProfileDefaults;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {});
  // After a failed save, show what they typed rather than what was stored.
  const v = (k: keyof ProfileDefaults | "name") => state.values?.[k] ?? (k === "name" ? name : initial[k]);

  return (
    // Remount after a failed save so every field, <select> included, starts from what they typed.
    <form key={state.error ? JSON.stringify(state.values) : "fresh"} action={action} className="flex flex-col gap-md">
      <input type="hidden" name="next" value={next} />
      <Row label="Name">
        <input name="name" required defaultValue={v("name")} maxLength={80} autoComplete="name" className={INPUT} />
      </Row>

      {srm ? (
        <>
          <Row label="Register number" hint="As on your ID card. Faculty exports use it.">
            <input
              name="regNo"
              required
              defaultValue={v("regNo")}
              placeholder="RA2211003010123"
              maxLength={20}
              autoCapitalize="characters"
              spellCheck={false}
              className={`${INPUT} font-mono uppercase`}
            />
          </Row>
          <div className="grid gap-md sm:grid-cols-[1fr_7rem_7rem]">
            <Row label="Department">
              <input name="dept" required defaultValue={v("dept")} list="depts" placeholder="CSE" maxLength={40} className={INPUT} />
              <datalist id="depts">
                {DEPTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Row>
            <Row label="Year">
              <select name="year" required defaultValue={v("year") ?? ""} className={INPUT}>
                <option value="" disabled>
                  —
                </option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Section">
              <input name="section" required defaultValue={v("section")} placeholder="A1" maxLength={8} autoCapitalize="characters" className={`${INPUT} font-mono uppercase`} />
            </Row>
          </div>
        </>
      ) : (
        <Row label="College or organisation" hint="Optional.">
          <input name="org" defaultValue={v("org")} maxLength={80} autoComplete="organization" className={INPUT} />
        </Row>
      )}

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-coral/60 bg-coral/10 px-md py-sm font-body-sm text-body-sm text-coral">
          <Icon name="warning" className="mt-0.5 text-[18px]" />
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="mt-sm flex items-center justify-center gap-2 self-start rounded-lg border border-primary bg-primary px-5 py-2.5 font-sans text-[15px] font-bold text-on-primary transition-colors hover:bg-primary-fixed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save and continue"}
        <Icon name="east" className="text-[18px]" />
      </button>
    </form>
  );
}
