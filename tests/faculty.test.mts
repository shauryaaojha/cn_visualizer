// Faculty report: section matching, the class grid, most-missed questions, CSV safety.
// Run: node --experimental-strip-types tests/faculty.test.mts
import assert from "node:assert/strict";
import {
  buildReport,
  csvField,
  normSection,
  parseSectionSlug,
  reportCsv,
  sameSection,
  sectionSlug,
  type LessonInfo,
} from "../lib/classReport.ts";
import { emptyProgress } from "../lib/progressModel.ts";

let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};

console.log("faculty report");

check("Sections match however the department was typed", () => {
  assert.ok(sameSection({ dept: " cse  (ai & ml) ", year: 3, section: "k2" }, { dept: "CSE (AI & ML)", year: 3, section: "K2" }));
  assert.ok(!sameSection({ dept: "CSE", year: 3, section: "K2" }, { dept: "CSE", year: 2, section: "K2" }));
  assert.ok(!sameSection({ dept: "CSE", year: 3, section: "K2" }, { dept: "IT", year: 3, section: "K2" }));
});

check("Section slugs round-trip, and junk is refused", () => {
  const s = normSection("CSE (AI & ML)", 3, "k2");
  assert.deepEqual(parseSectionSlug(sectionSlug(s)), s);
  assert.deepEqual(parseSectionSlug(decodeURIComponent(sectionSlug(s))), s); // already-decoded params
  assert.equal(parseSectionSlug("CSE~9~K2"), null);
  assert.equal(parseSectionSlug("CSE~3"), null);
  assert.equal(parseSectionSlug("a~3~b~c"), null);
  assert.equal(parseSectionSlug("%E0%A4%A"), null);
});

const lessons: LessonInfo[] = [
  { href: "/a", title: "A", unit: "Unit 1" },
  { href: "/b", title: "B", unit: "Unit 1" },
  { href: "/c", title: "C", unit: "Unit 2" },
];
const students = [
  { id: "2", name: "Zed", email: "z@srmist.edu.in", regNo: "RA0000000000002" },
  { id: "1", name: "Amy", email: "a@srmist.edu.in", regNo: "RA0000000000001" },
  { id: "3", name: "Idle", email: "i@srmist.edu.in", regNo: "RA0000000000003" },
];
const progress = new Map([
  ["1", [
    { ...emptyProgress("/a"), completed: true, best: 1, answers: { "Q1?": false, "Q2?": true }, updatedAt: 500 },
    { ...emptyProgress("/c"), best: 0.4, answers: {}, updatedAt: 900 },
  ]],
  ["2", [{ ...emptyProgress("/a"), best: 0.3, answers: { "Q1?": false }, updatedAt: 100 }, { ...emptyProgress("/gone"), completed: true, updatedAt: 50 }]],
]);

check("Grid cells, counts, ordering by register number", () => {
  const r = buildReport(students, progress, lessons);
  assert.deepEqual(r.rows.map((x) => x.student.name), ["Amy", "Zed", "Idle"]);
  assert.deepEqual(r.rows[0].cells, [1, null, 0.4]);
  assert.equal(r.rows[0].done, 1);
  assert.equal(r.rows[0].lastActive, 900);
  assert.deepEqual(r.rows[2].cells, [null, null, null]);
  assert.equal(r.rows[2].lastActive, null);
  assert.equal(r.active, 1);
  assert.equal(r.avgDone, 1 / 3);
});

check("Most-missed: only wrong answers, worst first, removed lessons ignored", () => {
  const r = buildReport(students, progress, lessons);
  assert.deepEqual(r.missed, [{ lesson: "/a", lessonTitle: "A", question: "Q1?", asked: 2, wrong: 2 }]);
});

check("CSV: header, per-unit counts, formula injection defused", () => {
  const r = buildReport([{ id: "1", name: "=HYPERLINK(\"x\")", email: "a@srmist.edu.in", regNo: "RA1" }], progress, lessons);
  const csv = reportCsv(r, lessons);
  const [head, row] = csv.replace("﻿", "").trim().split("\r\n");
  assert.equal(head, "Register no,Name,NetID,Email,Lessons done,Lessons total,Unit 1 done,Unit 2 done,Predict right,Predict asked,Predict %,Last active (UTC)");
  assert.ok(row.startsWith(`RA1,"'=HYPERLINK(""x"")",,a@srmist.edu.in,1,3,1,0,1,2,50,`));
  assert.equal(csvField("-5"), "'-5");
  assert.equal(csvField(-5), "'-5");
  assert.equal(csvField("a,b"), '"a,b"');
});

console.log(`ALL ${n} FACULTY CHECKS PASSED`);
