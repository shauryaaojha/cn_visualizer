"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { addSection, type AddState } from "./actions";

const INPUT =
  "w-full rounded-md border border-outline-variant bg-black/20 px-3 py-2 font-mono text-[15px] uppercase text-on-surface outline-none placeholder:normal-case placeholder:text-on-surface-variant/50 focus:border-primary";

export function AddSectionForm() {
  const [state, action, pending] = useActionState<AddState, FormData>(addSection, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[12px] uppercase text-on-surface-variant">Department</span>
          <input name="dept" required maxLength={40} placeholder="CSE" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[12px] uppercase text-on-surface-variant">Year</span>
          <select name="year" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              —
            </option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[12px] uppercase text-on-surface-variant">Section</span>
          <input name="section" required maxLength={8} placeholder="K2" className={INPUT} />
        </label>
        <button
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 font-sans text-[15px] font-bold text-on-primary hover:bg-primary-fixed disabled:opacity-60"
        >
          <Icon name="groups" className="text-[18px]" />
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state.error && <p role="alert" className="font-body-sm text-[14px] text-coral">{state.error}</p>}
    </form>
  );
}
