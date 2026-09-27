// Quiz generators: every question well-formed, deterministic, and right.
// Run: node --experimental-strip-types tests/quiz.test.mts
import assert from "node:assert/strict";
import { buildQuiz, QUIZ_IDS, rngFrom, UNIT_GENERATORS } from "../lib/quiz/generators.ts";
import { makeTicket, readTicket, TICKET_TTL_MS } from "../lib/quiz/ticket.ts";

let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};
console.log("quiz generators");

const ip = (s: string) => s.split(".").reduce((a, o) => a * 256 + Number(o), 0);
const dot = (v: number) => [24, 16, 8, 0].map((sh) => Math.floor(v / 2 ** sh) % 256).join(".");

check("Every question: 4 distinct options, a valid answer, no filler, a lesson link", () => {
  for (let seed = 1; seed <= 400; seed++)
    for (const id of QUIZ_IDS)
      for (const q of buildQuiz(id, seed)) {
        assert.equal(q.options.length, 4, `${q.kind} seed ${seed}`);
        assert.equal(new Set(q.options).size, 4, `${q.kind} dup options seed ${seed}: ${q.options}`);
        assert.ok(q.answer >= 0 && q.answer < 4, q.kind);
        assert.ok(!q.options.some((o) => o.includes("‡")), `${q.kind} filler option seed ${seed}: ${q.options}`);
        assert.ok(q.lesson.startsWith("/topics/"), q.kind);
      }
});

check("Same seed → same quiz; different seed → different numbers", () => {
  assert.deepEqual(buildQuiz("4", 99), buildQuiz("4", 99));
  assert.notDeepEqual(buildQuiz("4", 99), buildQuiz("4", 100));
});

check("Unit quizzes cover every generator of the unit before repeating", () => {
  for (const [id, u] of Object.entries(UNIT_GENERATORS)) {
    const kinds = new Set(buildQuiz(id as "1", 7).map((q) => q.kind));
    assert.equal(kinds.size, u.gens.length, `unit ${id}`);
  }
});

check("Answers are right (checked independently of the generators)", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const r = rngFrom(seed);
    for (const gens of Object.values(UNIT_GENERATORS))
      for (const g of gens.gens) {
        const q = g(r);
        const a = q.options[q.answer];
        const m = q.prompt.match(/of (\d+\.\d+\.\d+\.\d+)\/(\d+)/);
        if (q.kind === "network-address" && m) {
          const size = 2 ** (32 - Number(m[2]));
          assert.equal(a, dot(Math.floor(ip(m[1]) / size) * size), q.prompt);
        }
        if (q.kind === "broadcast-address" && m) {
          const size = 2 ** (32 - Number(m[2]));
          assert.equal(a, dot(Math.floor(ip(m[1]) / size) * size + size - 1), q.prompt);
        }
        if (q.kind === "usable-hosts") {
          const p = Number(q.prompt.match(/\/(\d+)/)![1]);
          assert.equal(a, (2 ** (32 - p) - 2).toLocaleString());
        }
        if (q.kind === "mesh-links") {
          const d = Number(q.prompt.match(/of (\d+) devices/)![1]);
          assert.equal(a, String((d * (d - 1)) / 2));
        }
        if (q.kind === "parity") {
          const [, kind, data] = q.prompt.match(/What (even|odd) parity bit is added to ([01]+)/)!;
          const ones = [...data].filter((b) => b === "1").length;
          assert.equal(a, String(kind === "even" ? ones % 2 : 1 - (ones % 2)));
        }
        if (q.kind === "crc") {
          // Check by recomputing (data || remainder) mod generator = 0.
          const [, data, gen] = q.prompt.match(/Data ([01]+), generator ([01]+)/)!;
          let w = (data + a).split("").map(Number);
          const gb = gen.split("").map(Number);
          for (let i = 0; i + gb.length <= w.length; i++) if (w[i]) for (let j = 0; j < gb.length; j++) w[i + j] ^= gb[j];
          assert.ok(w.every((b) => b === 0), `crc ${data} ${gen} ${a}`);
          w = [];
        }
        if (q.kind === "handshake") {
          const [, x, y] = q.prompt.match(/seq=(\d+)\. The server picks its own ISN (\d+)/)!;
          assert.equal(a, `seq=${y}, ack=${Number(x) + 1}`);
        }
        if (q.kind === "distance-vector") {
          const nums = q.prompt.match(/\d+/g)!.map(Number); // cB, cC, bD, cD
          assert.equal(Number(a.split(" ")[0]), Math.min(nums[0] + nums[2], nums[1] + nums[3]));
        }
      }
  }
});

check("Tickets: valid round-trip; tampering, other users, expiry all refused", () => {
  const t = { quiz: "4" as const, seed: 1234, issuedAt: 1_000_000, who: "userA" };
  const raw = makeTicket(t, "s3cret");
  assert.deepEqual(readTicket(raw, "s3cret", "userA", 1_000_500), t);
  assert.equal(readTicket(raw.replace(".1234.", ".1235."), "s3cret", "userA", 1_000_500), null); // friendlier seed
  assert.equal(readTicket(raw, "s3cret", "userB", 1_000_500), null); // someone else's ticket
  assert.equal(readTicket(raw, "other", "userA", 1_000_500), null); // wrong secret
  assert.equal(readTicket(raw, "s3cret", "userA", 1_000_000 + TICKET_TTL_MS + 1), null); // expired
  assert.equal(readTicket("junk", "s3cret", "userA", 1_000_500), null);
  assert.equal(readTicket(makeTicket({ ...t, quiz: "9" as "4" }, "s3cret"), "s3cret", "userA", 1_000_500), null); // unknown quiz
});

console.log(`ALL ${n} QUIZ CHECKS PASSED`);
