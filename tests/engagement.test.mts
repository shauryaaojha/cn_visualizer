// Streaks, badges, assignment status.
// Run: node --experimental-strip-types tests/engagement.test.mts
import assert from "node:assert/strict";
import { assignmentStatus, computeBadges, computeStreak, dayKey, dueFromDateInput } from "../lib/engagement.ts";
import { emptyProgress } from "../lib/progressModel.ts";

let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};
console.log("engagement");

// 2026-09-27 12:00 IST
const NOON = Date.parse("2026-09-27T06:30:00Z");

check("Days are IST: 11:30 pm IST is still that day, 12:30 am is the next", () => {
  assert.equal(dayKey(Date.parse("2026-09-27T18:00:00Z")), "2026-09-27"); // 23:30 IST
  assert.equal(dayKey(Date.parse("2026-09-27T19:00:00Z")), "2026-09-28"); // 00:30 IST
});

check("Streak counts back from today, or from yesterday if today is empty", () => {
  assert.deepEqual(computeStreak(["2026-09-25", "2026-09-26", "2026-09-27"], NOON), { current: 3, best: 3, activeToday: true, totalDays: 3 });
  assert.equal(computeStreak(["2026-09-25", "2026-09-26"], NOON).current, 2); // still alive today
  assert.equal(computeStreak(["2026-09-24", "2026-09-25"], NOON).current, 0); // missed yesterday
});

check("Best streak survives a break; duplicates don't inflate it", () => {
  const s = computeStreak(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-03", "2026-09-10", "2026-09-27"], NOON);
  assert.equal(s.best, 3);
  assert.equal(s.current, 1);
  assert.equal(s.totalDays, 5);
  assert.deepEqual(computeStreak([], NOON), { current: 0, best: 0, activeToday: false, totalDays: 0 });
});

check("Badges: earned, and progress text while locked", () => {
  const progress = [
    { ...emptyProgress("/a"), completed: true, answers: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`q${i}`, i < 17])) },
    { ...emptyProgress("/b"), completed: false },
  ];
  const badges = computeBadges({
    progress,
    quizzes: [{ quiz: "4", best: 1 }],
    units: [{ unit: "Unit 1", lessons: ["/a", "/b"] }, { unit: "Capstone", lessons: ["/a"] }],
    streak: { current: 2, best: 3, activeToday: true, totalDays: 4 },
  });
  const by = Object.fromEntries(badges.map((b) => [b.id, b]));
  assert.equal(by["first-lesson"].earned, true);
  assert.equal(by["ten-lessons"].progress, "1 / 10");
  assert.equal(by["unit-unit-1"].earned, false);
  assert.equal(by["unit-unit-1"].progress, "1 / 2");
  assert.equal(by["unit-capstone"].earned, true);
  assert.equal(by.predictor.progress, "17 / 20");
  assert.equal(by.sharp.earned, true); // 17/20 = 85%
  assert.equal(by["quiz-ace"].earned, true);
  assert.equal(by["all-rounder"].progress, "1 / 6");
  assert.equal(by["streak-3"].earned, true);
  assert.equal(by["streak-7"].progress, "3 / 7");
});

check("Assignments: lesson done by completion, quiz only by an attempt after assigning", () => {
  const lesson = { kind: "lesson" as const, target: "/a", due: NOON + 1000, createdAt: NOON - 1000 };
  assert.equal(assignmentStatus(lesson, [{ ...emptyProgress("/a"), completed: true }], [], NOON), "done");
  assert.equal(assignmentStatus(lesson, [{ ...emptyProgress("/a"), best: 0.5 }], [], NOON), "open");
  assert.equal(assignmentStatus(lesson, [], [], NOON + 2000), "overdue");
  const quiz = { kind: "quiz" as const, target: "4", due: NOON + 1000, createdAt: NOON - 1000 };
  assert.equal(assignmentStatus(quiz, [], [{ quiz: "4", at: NOON - 5000 }], NOON), "open"); // before it was assigned
  assert.equal(assignmentStatus(quiz, [], [{ quiz: "4", at: NOON }], NOON), "done");
  assert.equal(assignmentStatus(quiz, [], [{ quiz: "2", at: NOON }], NOON), "open");
});

check("Due date input means the end of that IST day", () => {
  assert.equal(dayKey(dueFromDateInput("2026-10-03")!), "2026-10-03");
  assert.equal(dayKey(dueFromDateInput("2026-10-03")! + 1000), "2026-10-04");
  assert.equal(dueFromDateInput("03/10/2026"), null);
});

console.log(`ALL ${n} ENGAGEMENT CHECKS PASSED`);
