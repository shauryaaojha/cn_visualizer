"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SRM_DOMAIN } from "@/lib/authRules";
import { sendCode, verifyCode, type CodeState } from "./actions";

const INPUT =
  "w-full rounded-md border border-outline-variant bg-black/20 px-3 py-2.5 font-mono text-[16px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary";
const PRIMARY =
  "flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 font-sans text-[15px] font-bold text-on-primary transition-colors hover:bg-primary-fixed disabled:opacity-60";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-coral/60 bg-coral/10 px-3 py-2 font-body-sm text-[14px] text-coral">
      <Icon name="warning" className="mt-0.5 text-[16px]" />
      {children}
    </p>
  );
}

/**
 * Two steps on one card: NetID → "Email me a code", then the code → "Sign in".
 * Each step is its own server action. The second keeps the address in a
 * hidden field, so a reload only costs asking for a new code.
 */
export function SrmCodeForm({ next }: { next: string }) {
  const [sent, send, sending] = useActionState<CodeState, FormData>(sendCode, {});
  const [checked, check, checking] = useActionState<CodeState, FormData>(verifyCode, {});
  // "Different NetID" dismisses the current send. Any new send is a new state
  // object, so it shows the code step again without an effect.
  const [dismissed, setDismissed] = useState<CodeState | null>(null);
  // A "wrong code" error is stale once a newer code has been sent.
  const verifyError = checked.error && (checked.at ?? 0) > (sent.at ?? 0) ? checked.error : undefined;

  if (sent.email && dismissed !== sent) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-body-sm text-[14px] text-on-surface-variant">
          We emailed a 6-digit code to <span className="break-all font-mono text-on-surface">{sent.email}</span>. It
          can take a minute, and may land in spam.
        </p>
        <form action={check} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={sent.email} />
          <input type="hidden" name="next" value={next} />
          <label className="flex flex-col gap-1">
            <span className="font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant">Code</span>
            <input
              key={sent.at}
              autoFocus
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 \-]{6,8}"
              maxLength={8}
              placeholder="123456"
              className={`${INPUT} text-center tracking-[0.4em]`}
            />
          </label>
          {verifyError && <Alert>{verifyError}</Alert>}
          {sent.error && <Alert>{sent.error}</Alert>}
          <button disabled={checking} className={PRIMARY}>
            <Icon name="login" className="text-[18px]" />
            {checking ? "Checking…" : "Sign in"}
          </button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-[14px]">
          <button type="button" onClick={() => setDismissed(sent)} className="font-bold text-on-surface-variant hover:text-primary">
            ← Different NetID
          </button>
          <form action={send}>
            <input type="hidden" name="netId" value={sent.email} />
            <button disabled={sending} className="font-bold text-primary hover:underline disabled:opacity-60">
              {sending ? "Sending…" : "Send a new code"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={send} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant">NetID</span>
        <div className="flex items-stretch overflow-hidden rounded-md border border-outline-variant bg-black/20 focus-within:border-primary">
          <input
            name="netId"
            required
            defaultValue={sent.email?.split("@")[0]}
            placeholder="ab1234"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={80}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[16px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
          />
          <span className="flex items-center border-l border-outline-variant px-3 font-mono text-[13px] text-on-surface-variant">
            @{SRM_DOMAIN}
          </span>
        </div>
      </label>
      {sent.error && <Alert>{sent.error}</Alert>}
      <button disabled={sending} className={PRIMARY}>
        <Icon name="mail" className="text-[18px]" />
        {sending ? "Sending…" : "Email me a code"}
      </button>
    </form>
  );
}
