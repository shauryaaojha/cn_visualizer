import Link from "next/link";
import { Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import type { Engagement } from "@/lib/studentEngagement";

const fmtDue = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "Asia/Kolkata" });

const STATUS = {
  done: { label: "Done", cls: "border-mint/70 text-mint" },
  open: { label: "To do", cls: "border-primary/70 text-primary" },
  overdue: { label: "Late", cls: "border-coral/70 text-coral" },
} as const;

/** Work set by faculty for the student's section, open and late first. */
export function AssignedPanel({ items, viewer = "self" }: { items: Engagement["assignments"]; viewer?: "self" | "faculty" }) {
  if (items.length === 0) return null;
  const order = { overdue: 0, open: 1, done: 2 };
  const sorted = [...items].sort((x, y) => order[x.status] - order[y.status] || x.a.due - y.a.due);
  const pending = items.filter((i) => i.status !== "done").length;
  return (
    <Panel className="border-primary/50">
      <h2 className="mb-3 font-headline-sm text-headline-sm text-on-surface">
        {viewer === "self" ? "Assigned to you" : "Assignments"}
        {pending > 0 && <span className="ml-2 font-mono text-[14px] text-primary">{pending} to do</span>}
      </h2>
      <ul className="flex flex-col gap-2">
        {sorted.map(({ a, status }) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-outline-variant/60 px-3 py-2">
            <Icon name={a.kind === "quiz" ? "functions" : "school"} className="text-[18px] text-on-surface-variant" />
            <Link href={a.kind === "quiz" ? `/practice/${a.target}` : a.target} className="min-w-0 font-bold text-on-surface hover:text-primary">
              {a.title}
            </Link>
            <span className="font-mono text-[13px] text-on-surface-variant">due {fmtDue(a.due)}</span>
            <span className={`ml-auto rounded-full border px-2 py-0.5 font-label-caps text-[11px] uppercase ${STATUS[status].cls}`}>{STATUS[status].label}</span>
            {a.note && <p className="w-full font-body-sm text-[13px] text-on-surface-variant">{a.facultyName}: “{a.note}”</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Streak tile plus the badge shelf: earned ones lit, locked ones dim with how close they are. */
export function StreakAndBadges({ e, viewer = "self" }: { e: Engagement; viewer?: "self" | "faculty" }) {
  const earned = e.badges.filter((b) => b.earned).length;
  const s = e.streak;
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-md">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-xl border font-mono text-[24px] font-bold ${s.current > 0 ? "border-amber/70 bg-amber/10 text-amber" : "border-outline-variant text-on-surface-variant"}`}
            aria-hidden
          >
            {s.current}
          </span>
          <div>
            <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">Day streak</p>
            <p className="font-body-sm text-[14px] text-on-surface">
              {s.current === 0
                ? viewer === "self"
                  ? "Watch a lesson or take a quiz to start one."
                  : "No current streak."
                : s.activeToday
                  ? "Studied today."
                  : viewer === "self"
                    ? "Study today to keep it going."
                    : "Not active yet today."}
            </p>
            <p className="font-mono text-[12px] text-on-surface-variant">
              best {s.best} · {s.totalDays} active {s.totalDays === 1 ? "day" : "days"}
            </p>
          </div>
        </div>
        <p className="ml-auto font-label-caps text-[12px] uppercase text-on-surface-variant">
          Badges {earned} / {e.badges.length}
        </p>
      </div>
      <ul className="mt-md grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {e.badges.map((b) => (
          <li
            key={b.id}
            title={b.description}
            className={`rounded-lg border px-3 py-2 ${b.earned ? "border-primary/70 bg-primary/10" : "border-outline-variant/50 opacity-60"}`}
          >
            <p className={`flex items-center gap-1.5 font-sans text-[14px] font-bold ${b.earned ? "text-primary" : "text-on-surface-variant"}`}>
              <Icon name={b.earned ? "verified" : "pending"} className="shrink-0 text-[16px]" />
              <span className="truncate">{b.title}</span>
            </p>
            <p className="font-body-sm text-[12px] text-on-surface-variant">{b.earned ? b.description : b.progress}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
