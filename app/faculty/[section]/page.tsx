import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { buildReport, parseSectionSlug, sectionLabel, sectionSlug } from "@/lib/classReport";
import { LESSON_COLUMNS, progressFor, requireFaculty, studentsIn, teaches } from "@/lib/faculty";

export const metadata: Metadata = { title: "Section — CN_Visualizer" };

function ago(ms: number | null): string {
  if (!ms) return "never";
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 60) return `${Math.max(m, 1)} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function Cell({ v, title }: { v: number | null; title: string }) {
  const cls =
    v === null ? "bg-outline-variant/25" : v === 1 ? "bg-mint" : v >= 0.5 ? "bg-primary/80" : v > 0 ? "bg-primary/35" : "bg-outline-variant/25";
  return <span title={title} className={`block h-4 w-3 rounded-[3px] ${cls}`} />;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Panel>
      <p className="font-label-caps text-[12px] uppercase text-on-surface-variant">{label}</p>
      <p className="font-mono text-[22px] font-bold text-on-surface">{value}</p>
      {sub && <p className="font-body-sm text-[13px] text-on-surface-variant">{sub}</p>}
    </Panel>
  );
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params;
  const s = parseSectionSlug(slug);
  if (!s) notFound();
  const user = await requireFaculty(`/faculty/${slug}`);
  if (!(await teaches(user._id.toHexString(), s))) notFound();

  const students = await studentsIn(s);
  const progress = await progressFor(students.map((st) => st.id));
  const report = buildReport(students, progress, LESSON_COLUMNS);
  const t = report.rows.reduce((a, r) => ({ asked: a.asked + r.asked, right: a.right + r.right }), { asked: 0, right: 0 });
  const units = [...new Set(LESSON_COLUMNS.map((l) => l.unit))].map((u) => ({
    unit: u,
    span: LESSON_COLUMNS.filter((l) => l.unit === u).length,
  }));

  return (
    <AccountShell icon="groups" eyebrow="FACULTY · SECTION" title={sectionLabel(s)} width="max-w-7xl">
      <div className="mb-md flex flex-wrap items-center gap-3">
        <Link href="/faculty" className="font-sans text-[14px] font-bold text-on-surface-variant hover:text-primary">
          ← All sections
        </Link>
        <a
          href={`/api/faculty/export?section=${sectionSlug(s)}`}
          className="ml-auto flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 font-sans text-[14px] font-bold text-on-primary hover:bg-primary-fixed"
        >
          <Icon name="upload" className="rotate-180 text-[16px]" />
          Download CSV
        </a>
      </div>

      <div className="grid gap-md sm:grid-cols-4">
        <Stat label="Students" value={String(report.rows.length)} sub="signed up with these details" />
        <Stat label="Started" value={String(report.active)} sub="finished at least one lesson" />
        <Stat label="Avg lessons done" value={report.avgDone.toFixed(1)} sub={`of ${LESSON_COLUMNS.length}`} />
        <Stat
          label="Predict accuracy"
          value={t.asked ? `${Math.round((t.right / t.asked) * 100)}%` : "—"}
          sub={t.asked ? `${t.right} right of ${t.asked} first tries` : "no answers yet"}
        />
      </div>

      <Panel className="mt-md">
        <div className="mb-3 flex flex-wrap items-center gap-x-md gap-y-1 font-body-sm text-[13px] text-on-surface-variant">
          <h2 className="mr-auto font-headline-sm text-headline-sm text-on-surface">Class progress</h2>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-mint" /> complete</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-primary/80" /> half+ watched</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-primary/35" /> started</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-outline-variant/25" /> not opened</span>
        </div>
        {report.rows.length === 0 ? (
          <p className="font-body-md text-on-surface-variant">
            No students with these details have signed in yet. Share the site link, and ask them to sign in with their
            SRM NetID and enter this department, year and section.
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="border-separate border-spacing-0 font-sans text-[14px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-container-low" />
                  <th colSpan={3} />
                  {units.map((u) => (
                    <th
                      key={u.unit}
                      colSpan={u.span}
                      title={u.unit}
                      className="whitespace-nowrap border-l border-outline-variant/60 px-1 pb-1 text-left font-label-caps text-[11px] uppercase text-on-surface-variant"
                    >
                      {/* A unit with only a few lessons is too narrow for its full name. */}
                      {u.span >= 5 ? u.unit : u.unit.replace("Unit ", "U").replace("Capstone", "Cap")}
                    </th>
                  ))}
                </tr>
                <tr className="text-left font-label-caps text-[12px] uppercase text-on-surface-variant">
                  <th className="sticky left-0 z-10 bg-surface-container-low py-1 pr-3">Student</th>
                  <th className="px-2">Done</th>
                  <th className="px-2">Predict</th>
                  <th className="px-2 pr-3">Active</th>
                  {LESSON_COLUMNS.map((l, i) => (
                    <th key={l.href} className={i === 0 || LESSON_COLUMNS[i - 1].unit !== l.unit ? "border-l border-outline-variant/60 pl-1" : ""} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.student.id} className="hover:bg-black/10">
                    <td className="sticky left-0 z-10 max-w-[14rem] bg-surface-container-low py-1 pr-3">
                      <Link href={`/faculty/${sectionSlug(s)}/${r.student.id}`} className="block truncate font-bold text-on-surface hover:text-primary">
                        {r.student.name}
                      </Link>
                      <span className="block font-mono text-[12px] text-on-surface-variant">{r.student.regNo ?? r.student.netId}</span>
                    </td>
                    <td className="px-2 font-mono">{r.done}</td>
                    <td className="px-2 font-mono">{r.asked ? `${Math.round((r.right / r.asked) * 100)}%` : "—"}</td>
                    <td className="whitespace-nowrap px-2 pr-3 text-[13px] text-on-surface-variant">{ago(r.lastActive)}</td>
                    {r.cells.map((v, i) => {
                      const l = LESSON_COLUMNS[i];
                      const state = v === null ? "not opened" : v === 1 ? "complete" : `${Math.round(v * 100)}% watched`;
                      return (
                        <td key={l.href} className={`px-[1px] ${i === 0 || LESSON_COLUMNS[i - 1].unit !== l.unit ? "border-l border-outline-variant/60 pl-1" : ""}`}>
                          <Cell v={v} title={`${l.title}: ${state}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="mt-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Most-missed Predict questions</h2>
        <p className="mb-3 font-body-sm text-[13px] text-on-surface-variant">First tries only. Worth going over in the next class.</p>
        {report.missed.length === 0 ? (
          <p className="font-body-md text-on-surface-variant">Nothing missed yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {report.missed.map((q) => (
              <li key={q.lesson + q.question} className="flex items-start gap-3 rounded-md border border-outline-variant/60 px-3 py-2">
                <span className="w-12 shrink-0 font-mono text-[15px] font-bold text-coral">{Math.round((q.wrong / q.asked) * 100)}%</span>
                <div className="min-w-0">
                  <p className="text-on-surface">{q.question}</p>
                  <p className="font-body-sm text-[13px] text-on-surface-variant">
                    <Link href={q.lesson} className="hover:text-primary">{q.lessonTitle}</Link> · {q.wrong} of {q.asked} got it wrong
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </AccountShell>
  );
}
