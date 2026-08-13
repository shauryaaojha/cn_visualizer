import { runNetOperation, cuttableLinks, suggestedCut } from "../engines/netEngine.ts";
import { runLayerOperation, LAYER_DEFAULTS } from "../engines/layerEngine.ts";
import { runSignalOperation, SIGNAL_DEFAULTS } from "../engines/signalEngine.ts";

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { console.log("  FAIL:", msg); fails++; } else console.log("  ok  :", msg);
};

console.log("\n-- netEngine: suggested cut per topology (6 hosts, A->E) --");
const expect: Record<string, string> = {
  topoBus: "s2", topoStar: "sE", topoRing: "r4", topoMesh: "mAE", topoHybrid: "trunk",
};
for (const [op, want] of Object.entries(expect)) {
  const got = suggestedCut(op as never, 6, "A", "E");
  ok(got === want, `${op}: suggested cut ${got} (expected ${want})`);
}

console.log("\n-- netEngine: survival after the suggested cut --");
for (const [op, survives] of Object.entries({
  topoBus: false, topoStar: false, topoRing: true, topoMesh: true, topoHybrid: false,
})) {
  const cut = suggestedCut(op as never, 6, "A", "E")!;
  const p = runNetOperation({ op: op as never, from: "A", to: "E", hosts: 6, faults: [{ kind: "linkDown", id: cut }] });
  const last = p.steps[p.steps.length - 1];
  const verdict = last.panels[0].verdict!.tone;
  ok((verdict === "ok") === survives, `${op}: ${survives ? "reroutes" : "partitions"} (verdict ${verdict})`);
}

console.log("\n-- netEngine: parametric inputs --");
for (const hosts of [4, 5, 6, 7, 8]) {
  const p = runNetOperation({ op: "topoMesh", from: "A", to: "C", hosts, faults: [] });
  const links = Number(p.stats.find((s) => s.label === "Links")!.value);
  ok(links === (hosts * (hosts - 1)) / 2, `mesh with ${hosts} hosts has ${links} links`);
}
const far = runNetOperation({ op: "topoBus", from: "A", to: "H", hosts: 8, faults: [] });
ok(far.stats.find((s) => s.label === "Hops A→H")!.value === "9", "bus A->H over 8 hosts is 9 hops");
const offRoute = runNetOperation({ op: "topoRing", from: "A", to: "B", hosts: 6, faults: [{ kind: "linkDown", id: "r3" }] });
ok(offRoute.steps[offRoute.steps.length - 1].panels[0].verdict!.tone === "ok", "cutting an off-route link changes nothing");
const stale = runNetOperation({ op: "topoStar", from: "A", to: "C", hosts: 4, faults: [{ kind: "linkDown", id: "sH" }] });
ok(stale.steps.length > 0, "a cut id that no longer exists is ignored, not crashed");

console.log("\n-- netEngine: failure comparison scales with inputs --");
const cmp = runNetOperation({ op: "topoFailure", from: "B", to: "D", hosts: 5, faults: [] });
ok(cmp.steps[0].panels.length === 5, "comparison still renders 5 panels");
ok(cmp.stats.find((s) => s.label === "Survived")!.value === "2 / 5", `B->D on 5 hosts: ${cmp.stats.find((s) => s.label === "Survived")!.value} survive`);

console.log("\n-- layerEngine: custom message drives the numbers --");
for (const [msg, wire] of [["HELLO", 64], ["X", 64], ["A".repeat(40), 98]] as const) {
  const p = runLayerOperation("encapsulation", { ...LAYER_DEFAULTS, message: msg });
  const got = p.stats.find((s) => s.label === "On the wire")!.value;
  ok(got === `${wire} B`, `"${msg.slice(0, 8)}${msg.length > 8 ? "…" : ""}" (${msg.length} B) -> ${got}`);
}
const ports = runLayerOperation("encapsulation", { ...LAYER_DEFAULTS, dstPort: 443, dstIp: "1.2.3.4" });
ok(JSON.stringify(ports.steps).includes("443") && JSON.stringify(ports.steps).includes("1.2.3.4"),
   "custom port and IP appear in the header notes");

console.log("\n-- signalEngine: real delay maths --");
const s10 = runSignalOperation("bandwidthVsLatency", SIGNAL_DEFAULTS);
ok(s10.stats.find((x) => x.label === "Fibre")!.value === "4.42 ms", `10 KB fibre = ${s10.stats.find((x) => x.label === "Fibre")!.value}`);
ok(s10.stats.find((x) => x.label === "Satellite")!.value === "302.4 ms", `10 KB satellite = ${s10.stats.find((x) => x.label === "Satellite")!.value}`);
const big = runSignalOperation("bandwidthVsLatency", { ...SIGNAL_DEFAULTS, fileKB: 102400 });
const gap = parseFloat(big.stats.find((x) => x.label === "Gap")!.value);
ok(gap < 1.05, `100 MB closes the gap to ${gap}x — the verdict flips`);
// A near-but-narrow pipe against a far-but-wide one: at 100 MB the distance
// stops mattering and the wide pipe wins, even with 300 ms of flight time.
const fastB = runSignalOperation("bandwidthVsLatency", {
  fileKB: 102400,
  a: { label: "DSL", bandwidthMbps: 8, propagationMs: 2 },
  b: { label: "Satellite", bandwidthMbps: 100, propagationMs: 300 },
});
const verdict = String(fastB.steps[fastB.steps.length - 1].message?.text ?? "");
ok(verdict.startsWith("DSL"), `far-but-wide pipe wins at 100 MB — verdict: "${verdict}"`);
ok(fastB.stats.find((x) => x.label === "Satellite")!.tone === "mint",
   "satellite is marked the winner despite 300 ms of latency");

console.log(fails === 0 ? "\nALL ENGINE CHECKS PASSED\n" : `\n${fails} CHECK(S) FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
