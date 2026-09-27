import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { sectionLabel, sectionSlug } from "@/lib/classReport";
import { getTeaches, requireFaculty, sectionCounts } from "@/lib/faculty";
import { removeSection } from "./actions";
import { AddSectionForm } from "./AddSectionForm";

export const metadata: Metadata = { title: "Faculty — CN_Visualizer" };

export default async function FacultyPage() {
  const user = await requireFaculty("/faculty");
  const sections = await getTeaches(user._id.toHexString());
  const counts = await sectionCounts(sections);

  return (
    <AccountShell
      icon="groups"
      eyebrow="FACULTY"
      title="Your sections"
      blurb="Add the sections you teach. You see progress only for students whose details match one of them."
      width="max-w-4xl"
    >
      <div className="flex flex-col gap-md">
        {sections.length > 0 ? (
          <div className="grid gap-md sm:grid-cols-2">
            {sections.map((s, i) => {
              const slug = sectionSlug(s);
              return (
                <Panel key={slug} className="flex items-center justify-between gap-md">
                  <Link href={`/faculty/${slug}`} className="group min-w-0">
                    <p className="font-headline-sm text-[20px] text-on-surface group-hover:text-primary">{sectionLabel(s)}</p>
                    <p className="font-body-sm text-[14px] text-on-surface-variant">
                      {counts[i]} {counts[i] === 1 ? "student" : "students"} signed up
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/faculty/${slug}`}
                      className="rounded-md border border-primary/70 px-3 py-1.5 font-sans text-[14px] font-bold text-primary hover:bg-primary hover:text-on-primary"
                    >
                      Open
                    </Link>
                    <form action={removeSection}>
                      <input type="hidden" name="slug" value={slug} />
                      <button
                        title="Remove this section from your list"
                        aria-label={`Remove ${sectionLabel(s)}`}
                        className="rounded-md border border-outline-variant p-1.5 text-on-surface-variant hover:border-coral hover:text-coral"
                      >
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    </form>
                  </div>
                </Panel>
              );
            })}
          </div>
        ) : (
          <Panel>
            <p className="font-body-md text-on-surface-variant">No sections yet. Add one below.</p>
          </Panel>
        )}

        <Panel>
          <h2 className="mb-3 font-headline-sm text-headline-sm text-on-surface">Add a section</h2>
          <AddSectionForm />
          <p className="mt-3 font-body-sm text-[13px] text-on-surface-variant">
            Students give department, year and section when they first sign in. Match what they typed; capital letters
            and extra spaces don&apos;t matter.
          </p>
        </Panel>
      </div>
    </AccountShell>
  );
}
