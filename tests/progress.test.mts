// Progress rules: recording, merging copies from several devices, cleaning untrusted input.
// Run: node --experimental-strip-types tests/progress.test.mts
import assert from "node:assert/strict";
import { emptyProgress, merge, sanitize, tally, withAnswer, withFrames } from "../lib/progressModel.ts";

let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};
const L = "/topics/fundamentals/topologies/bus";

console.log("progress rules");

check("Watching frames raises best; 90% of frames completes", () => {
  let p = emptyProgress(L);
  p = withFrames(p, 5, 20, 4, 1);
  assert.equal(p.best, 0.25);
  assert.equal(p.completed, false);
  p = withFrames(p, 18, 20, 17, 2);
  assert.equal(p.completed, true);
  assert.equal(p.lastFrame, 17);
});

check("Jumping to the end is not completing", () => {
  const p = withFrames(emptyProgress(L), 2, 20, 19, 1); // frame 0 then straight to 19
  assert.equal(p.completed, false);
  assert.equal(p.lastFrame, 19);
});

check("A shorter later sitting never lowers best, and completed sticks", () => {
  let p = withFrames(emptyProgress(L), 20, 20, 19, 1);
  p = withFrames(p, 3, 20, 2, 2);
  assert.equal(p.best, 1);
  assert.equal(p.completed, true);
});

check("No change → same object, so nothing is marked unsent", () => {
  const p = withFrames(emptyProgress(L), 4, 10, 3, 1);
  assert.equal(withFrames(p, 4, 10, 3, 2), p);
  assert.equal(withFrames(emptyProgress(L), 0, 10, 0, 1).best, 0);
});

check("Only the first answer to a question counts", () => {
  let p = withAnswer(emptyProgress(L), "Where does the frame go?", false, 1);
  p = withAnswer(p, "Where does the frame go?", true, 2);
  p = withAnswer(p, "  Where does   the frame go? ", true, 3); // same question, spaced differently
  assert.deepEqual(p.answers, { "Where does the frame go?": false });
});

check("Merge: max best, sticky completed, newest resume point, first answers win", () => {
  const laptop = { ...emptyProgress(L), best: 0.95, completed: true, lastFrame: 18, answers: { q1: false }, updatedAt: 100 };
  const phone = { ...emptyProgress(L), best: 0.4, completed: false, lastFrame: 6, answers: { q1: true, q2: true }, updatedAt: 200 };
  const m = merge(laptop, phone);
  assert.equal(m.best, 0.95);
  assert.equal(m.completed, true);
  assert.equal(m.lastFrame, 6);
  assert.deepEqual(m.answers, { q1: false, q2: true });
  assert.equal(m.updatedAt, 200);
  assert.deepEqual(merge(phone, laptop), m);
});

check("Sanitize: unknown lessons, junk values and future timestamps", () => {
  const isLesson = (p: string) => p === L;
  assert.equal(sanitize({ lesson: "/topics/nope" }, isLesson, 1000), null);
  assert.equal(sanitize("junk", isLesson, 1000), null);
  const s = sanitize(
    { lesson: L + "/", best: 7, completed: "yes", lastFrame: -3, answers: { q: true, bad: "x" }, updatedAt: 99999 },
    isLesson,
    1000,
  )!;
  assert.deepEqual(s, { lesson: L, best: 1, completed: false, lastFrame: 0, answers: { q: true }, updatedAt: 1000 });
});

check("Tally counts first tries across lessons", () => {
  const a = { ...emptyProgress(L), answers: { q1: true, q2: false } };
  const b = { ...emptyProgress("/x"), answers: { q3: true } };
  assert.deepEqual(tally([a, b]), { asked: 3, right: 2 });
});

console.log(`ALL ${n} PROGRESS CHECKS PASSED`);
