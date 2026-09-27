// ---------------------------------------------------------------------------
// classReport: what faculty see for one section. Pure, so tests and the CSV
// export share the exact numbers the page shows.
//
// A section is what students typed at onboarding: department, year, section.
// Department is free text ("cse", "CSE ", "CSE (AI & ML)"), so it is compared
// upper-cased with spaces squeezed.
// ---------------------------------------------------------------------------

import { tally, type LessonProgress } from "./progressModel.ts";

export interface SectionRef {
  dept: string;
  year: number;
  section: string;
}

export function normSection(dept: string, year: number, section: string): SectionRef {
  return {
    dept: dept.trim().replace(/\s+/g, " ").toUpperCase(),
    year,
    section: section.trim().toUpperCase(),
  };
}

export function sameSection(a: SectionRef, b: SectionRef): boolean {
  const x = normSection(a.dept, a.year, a.section);
  const y = normSection(b.dept, b.year, b.section);
  return x.dept === y.dept && x.year === y.year && x.section === y.section;
}

export function sectionLabel(s: SectionRef): string {
  return `${s.dept} · Year ${s.year} · ${s.section}`;
}

/** URL segment for a section. "~" can't appear in a department name we accept. */
export function sectionSlug(s: SectionRef): string {
  const n = normSection(s.dept, s.year, s.section);
  return encodeURIComponent(`${n.dept}~${n.year}~${n.section}`);
}

export function parseSectionSlug(slug: string): SectionRef | null {
  let raw: string;
  try {
    raw = decodeURIComponent(slug);
  } catch {
    return null;
  }
  const [dept, year, section, extra] = raw.split("~");
  const y = Number(year);
  if (extra !== undefined || !dept || !section || !Number.isInteger(y) || y < 1 || y > 5) return null;
  return normSection(dept, y, section);
}

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  netId?: string;
  regNo?: string;
}

export interface LessonInfo {
  href: string;
  title: string;
  /** "Unit 1", "Capstone", … for grouping columns. */
  unit: string;
}

/** Best practice-quiz score per quiz, as saved for one student. */
export interface QuizBest {
  quiz: string;
  attempts: number;
  /** 0..1 */
  best: number;
}

export interface StudentRow {
  student: StudentInfo;
  /** Per lesson, in `lessons` order: 1 = complete, 0..1 = share watched, null = not opened. */
  cells: (number | null)[];
  done: number;
  asked: number;
  right: number;
  lastActive: number | null;
  quizzes: QuizBest[];
  /** Mean of the best scores over the quizzes tried, 0..1, or null if none. */
  quizAvg: number | null;
}

export interface MissedQuestion {
  lesson: string;
  lessonTitle: string;
  question: string;
  asked: number;
  wrong: number;
}

export interface ClassReport {
  rows: StudentRow[];
  missed: MissedQuestion[];
  /** Students with at least one completed lesson. */
  active: number;
  avgDone: number;
}

export function buildReport(
  students: StudentInfo[],
  progress: Map<string, LessonProgress[]>,
  lessons: LessonInfo[],
  quizzes: Map<string, QuizBest[]> = new Map(),
): ClassReport {
  const questions = new Map<string, MissedQuestion>();
  const titles = new Map(lessons.map((l) => [l.href, l.title]));

  const rows = students.map((student) => {
    const items = progress.get(student.id) ?? [];
    const by = new Map(items.map((i) => [i.lesson, i]));
    const cells = lessons.map((l) => {
      const p = by.get(l.href);
      if (!p) return null;
      return p.completed ? 1 : p.best;
    });
    for (const p of items) {
      if (!titles.has(p.lesson)) continue;
      for (const [q, right] of Object.entries(p.answers)) {
        const key = `${p.lesson}\n${q}`;
        const m = questions.get(key) ?? { lesson: p.lesson, lessonTitle: titles.get(p.lesson)!, question: q, asked: 0, wrong: 0 };
        m.asked++;
        if (!right) m.wrong++;
        questions.set(key, m);
      }
    }
    const t = tally(items);
    const qs = quizzes.get(student.id) ?? [];
    return {
      student,
      cells,
      done: cells.filter((c) => c === 1).length,
      asked: t.asked,
      right: t.right,
      lastActive: items.length ? Math.max(...items.map((i) => i.updatedAt)) : null,
      quizzes: qs,
      quizAvg: qs.length ? qs.reduce((a, q) => a + q.best, 0) / qs.length : null,
    };
  });

  rows.sort((a, b) => (a.student.regNo ?? a.student.name).localeCompare(b.student.regNo ?? b.student.name));
  const missed = [...questions.values()]
    .filter((q) => q.wrong > 0)
    .sort((a, b) => b.wrong / b.asked - a.wrong / a.asked || b.wrong - a.wrong)
    .slice(0, 10);

  return {
    rows,
    missed,
    active: rows.filter((r) => r.done > 0).length,
    avgDone: rows.length ? rows.reduce((s, r) => s + r.done, 0) / rows.length : 0,
  };
}

/** One CSV field. Quotes when needed, and defuses spreadsheet formulas (=, +, -, @). */
export function csvField(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Quiz columns for the CSV, in this order. */
export const CSV_QUIZZES: { id: string; label: string }[] = [
  { id: "1", label: "Quiz U1 best %" },
  { id: "2", label: "Quiz U2 best %" },
  { id: "3", label: "Quiz U3 best %" },
  { id: "4", label: "Quiz U4 best %" },
  { id: "5", label: "Quiz U5 best %" },
  { id: "mixed", label: "Quiz mixed best %" },
];

export function reportCsv(report: ClassReport, lessons: LessonInfo[]): string {
  const units = [...new Set(lessons.map((l) => l.unit))];
  const header = [
    "Register no",
    "Name",
    "NetID",
    "Email",
    "Lessons done",
    "Lessons total",
    ...units.map((u) => `${u} done`),
    "Predict right",
    "Predict asked",
    "Predict %",
    ...CSV_QUIZZES.map((q) => q.label),
    "Last active (UTC)",
  ];
  const lines = report.rows.map((r) => [
    r.student.regNo ?? "",
    r.student.name,
    r.student.netId ?? "",
    r.student.email,
    r.done,
    lessons.length,
    ...units.map((u) => lessons.filter((l, i) => l.unit === u && r.cells[i] === 1).length),
    r.right,
    r.asked,
    r.asked ? Math.round((r.right / r.asked) * 100) : "",
    ...CSV_QUIZZES.map((q) => {
      const b = r.quizzes.find((x) => x.quiz === q.id);
      return b ? Math.round(b.best * 100) : "";
    }),
    r.lastActive ? new Date(r.lastActive).toISOString().slice(0, 16).replace("T", " ") : "",
  ]);
  // BOM so Excel reads UTF-8 names correctly.
  return "﻿" + [header, ...lines].map((l) => l.map(csvField).join(",")).join("\r\n") + "\r\n";
}
