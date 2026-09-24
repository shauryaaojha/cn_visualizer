import type { ReactNode } from "react";

/** Headed sections for the policy pages. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-lg first:mt-0">
      <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 font-body-md text-body-md text-on-surface-variant [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-on-surface">
        {children}
      </div>
    </section>
  );
}

export const UPDATED = "25 September 2026";
export const CONTACT_URL = "https://github.com/shauryaaojha/cn_visualizer/issues";
