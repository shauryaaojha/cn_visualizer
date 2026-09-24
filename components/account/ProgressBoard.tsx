import Link from "next/link";
import { SECTIONS, leavesOfSection, type LeafRef } from "@/data/curriculum";
import { Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { tally, type LessonProgress } from "@/lib/progressModel";

// The student's own dashboard: a ring per unit, Predict accuracy, where to
// pick up, and every built lesson with its state. A server component; it is
// handed the stored progress and reads the curriculum itself.

function Ring({ value, label }: { value: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0" role="img" aria-label={label}>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-outline-variant/60" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        transform="rotate(-90 28 28)"
        className={value >= 1 ? "stroke-mint" : "stroke-primary"}
      />
      <text x="28" y="32.5" textAnchor="middle" className="fill-on-surface font-mono text-[13px] font-bold">
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

function StateDot({ p }: { p?: LessonProgress }) {
  if (p?.completed) return <Icon name="verified" className="text-[18px] text-mint" />;
  if (p && p.best > 0)
    return <span className="w-9 shrink-0 text-right font-mono text-[12px] text-primary">{Math.round(p.best * 100)}%</span>;
  return <span className="mx-[5px] h-2 w-2 shrink-0 rounded-full bg-outline-variant" aria-hidden />;
}

export function ProgressBoard({ items }: { items: LessonProgress[] }) {
  const byLesson = new Map(items.map((i) => [i.lesson, i]));
  const units = SECTIONS.map((s) => ({ s, leaves: leavesOfSection(s.slug).filter((l) => l.status === "available") })).filter(
    (u) => u.leaves.length > 0,
  );
  const all = units.flatMap((u) => u.leaves);
  const done = all.filter((l) => byLesson.get(l.href)?.completed).length;
  const t = tally(items);

  // Pick up the most recent unfinished lesson, else the first one not started.
  const recent = [...items].filter((i) => !i.completed && byLesson.has(i.lesson)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const next: LeafRef | undefined =
    all.find((l) => l.href === recent?.lesson) ?? all.find((l) => !byLesson.get(l.href)?.completed);

  return (
    <div className="flex flex-col gap-md">
      <div className="grid gap-md sm:grid-cols-3">
        <Panel className="flex items-center gap-md">
          <Ring value={all.length ? done / all.length : 0} label={`${done} of ${all.length} lessons complete`} />
          <div>
            <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">Lessons done</p>
            <p className="font-mono text-[22px] font-bold text-on-surface">
              {done}
              <span className="text-[15px] text-on-surface-variant"> / {all.length}</span>
            </p>
          </div>
        </Panel>
        <Panel>
          <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">Predict accuracy</p>
          <p className="font-mono text-[22px] font-bold text-on-surface">
            {t.asked ? `${Math.round((t.right / t.asked) * 100)}%` : "—"}
          </p>
          <p className="font-body-sm text-[13px] text-on-surface-variant">
            {t.asked ? `${t.right} right of ${t.asked} first ${t.asked === 1 ? "try" : "tries"}` : "Turn on Predict in any lesson"}
          </p>
        </Panel>
        <Panel>
          <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">
            {recent ? "Pick up where you left off" : done === all.length ? "All done" : "Start here"}
          </p>
          {next ? (
            <Link href={next.href} className="mt-1 flex items-center gap-1.5 font-sans text-[15px] font-bold text-primary hover:underline">
              <span className="truncate">{next.title}</span>
              <Icon name="east" className="shrink-0 text-[16px]" />
            </Link>
          ) : (
            <p className="mt-1 font-body-sm text-on-surface-variant">Every built lesson is complete.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        {units.map(({ s, leaves }) => {
          const unitDone = leaves.filter((l) => byLesson.get(l.href)?.completed).length;
          return (
            <Panel key={s.slug}>
              <div className="flex items-center gap-md">
                <Ring value={unitDone / leaves.length} label={`${s.title}: ${unitDone} of ${leaves.length} complete`} />
                <div className="min-w-0">
                  <p className="font-label-caps text-[12px] uppercase text-primary/85">{s.unit <= 5 ? `Unit ${s.unit}` : "Capstone"}</p>
                  <Link href={`/topics/${s.slug}`} className="block truncate font-headline-sm text-[19px] text-on-surface hover:text-primary">
                    {s.title}
                  </Link>
                  <p className="font-body-sm text-[13px] text-on-surface-variant">
                    {unitDone} of {leaves.length} lessons complete
                  </p>
                </div>
              </div>
              <ul className="mt-md flex flex-col">
                {leaves.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-sans text-[14px] text-on-surface-variant hover:bg-black/15 hover:text-on-surface"
                    >
                      <span className="truncate">{l.title}</span>
                      <StateDot p={byLesson.get(l.href)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
