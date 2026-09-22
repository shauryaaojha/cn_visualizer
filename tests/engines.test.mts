import { runNetOperation, suggestedCut } from "../engines/netEngine.ts";
import { runLayerOperation, LAYER_DEFAULTS } from "../engines/layerEngine.ts";
import { runSignalOperation, SIGNAL_DEFAULTS } from "../engines/signalEngine.ts";
import { ROUTING_DEFAULTS, RIP_INFINITY, runRoutingOperation } from "../engines/routingEngine.ts";
import { runAddressOperation } from "../engines/addressEngine.ts";

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

console.log("\n-- routingEngine: Bellman-Ford, failures and forwarding --");
const chainDistances = (count: number, costs: Record<string, number>, from: string) => {
  const ids = ["A", "B", "C", "D", "E", "F"].slice(0, count);
  const origin = ids.indexOf(from);
  return Object.fromEntries(ids.map((id, i) => {
    const lo = Math.min(i, origin), hi = Math.max(i, origin);
    let distance = 0;
    for (let j = lo; j < hi; j++) distance += costs[`r-${ids[j]}-${ids[j + 1]}`] ?? (j % 2 === 0 ? 1 : 2);
    return [id, distance];
  }));
};
for (const [routerCount, linkCosts] of [
  [4, { "r-A-B": 3, "r-B-C": 1, "r-C-D": 5 }],
  [6, { "r-A-B": 2, "r-B-C": 4, "r-C-D": 1, "r-D-E": 3, "r-E-F": 2 }],
] as const) {
  const program = runRoutingOperation({ ...ROUTING_DEFAULTS, op: "distanceVector", routerCount, linkCosts });
  const final = program.steps.at(-1)!;
  const expected = chainDistances(routerCount, linkCosts, "A");
  const tableA = final.tables.find((t) => t.routerId === "A")!;
  ok(tableA.entries.every((entry) => entry.metric === expected[entry.destination]), `DV ${routerCount} routers matches reference Dijkstra distances from A`);
  ok(final.converged && program.stats.find((s) => s.label === "Converged")!.value === "yes", `DV ${routerCount} routers says converged`);
  ok(Number(program.stats.find((s) => s.label === "Rounds")!.value) >= 1, `DV ${routerCount} routers reports derived convergence rounds`);
}
const partitioned = runRoutingOperation({ ...ROUTING_DEFAULTS, op: "distanceVector", routerCount: 4, faults: [{ kind: "linkDown", id: "r-B-C" }] });
const finalPartition = partitioned.steps.at(-1)!;
const aToD = finalPartition.tables.find((t) => t.routerId === "A")!.entries.find((e) => e.destination === "D")!;
ok(aToD.metric === RIP_INFINITY, "cutting the middle link leaves the far side unreachable at RIP 16");
const faultAt = partitioned.steps.findIndex((s) => s.message?.text.includes("is down"));
const climb = partitioned.steps.slice(faultAt + 1).map((s) => s.tables.find((t) => t.routerId === "A")!.entries.find((e) => e.destination === "D")!.metric);
ok(climb.every((n, i) => i === 0 || n >= climb[i - 1]) && climb.at(-1) === RIP_INFINITY, "count-to-infinity climb is monotonic and stops at 16");
const forwarding = runRoutingOperation({ ...ROUTING_DEFAULTS, op: "ipForwarding" });
const lpm = forwarding.steps.find((s) => s.message?.text.startsWith("Longest-prefix match"))!;
ok(lpm.tables[0].entries.find((e) => e.state === "changed")!.destination.endsWith("/24"), "IP forwarding selects the longest matching /24 prefix");
const expired = runRoutingOperation({ ...ROUTING_DEFAULTS, op: "ipForwarding", ttl: 2 });
ok(expired.steps.at(-1)!.message?.tone === "error", "TTL lower than hop count drops the packet with an error banner");
const lossParams = { ...ROUTING_DEFAULTS, op: "ipForwarding" as const, faults: [{ kind: "packetLoss" as const, rate: 0.5 }] };
ok(JSON.stringify(runRoutingOperation(lossParams)) === JSON.stringify(runRoutingOperation(lossParams)), "seeded packet loss is byte-identical on replay");
console.log("\n-- addressEngine: IPv4 arithmetic & boundary checks --");
// Test 1: 192.168.1.25/24 -> network 192.168.1.0, broadcast 192.168.1.255, 254 usable hosts
const p24 = runAddressOperation({
  op: "ipv4Addressing",
  ip: "192.168.1.25",
  prefix: 24,
  faults: [],
});
const net24 = p24.stats.find((s) => s.label === "Network")?.value;
const bcast24 = p24.stats.find((s) => s.label === "Broadcast")?.value;
const hosts24 = p24.stats.find((s) => s.label === "Usable hosts")?.value;
ok(net24 === "192.168.1.0", `192.168.1.25/24 -> network ${net24} (expected 192.168.1.0)`);
ok(bcast24 === "192.168.1.255", `192.168.1.25/24 -> broadcast ${bcast24} (expected 192.168.1.255)`);
ok(hosts24 === "254", `192.168.1.25/24 -> usable hosts ${hosts24} (expected 254)`);

// Test 2: 10.0.0.0/8 -> 16,777,214 usable hosts
const p8 = runAddressOperation({
  op: "ipv4Addressing",
  ip: "10.0.0.0",
  prefix: 8,
  faults: [],
});
const hosts8 = p8.stats.find((s) => s.label === "Usable hosts")?.value;
ok(hosts8 === "16,777,214", `10.0.0.0/8 -> usable hosts ${hosts8} (expected 16,777,214)`);

// Test 3: /30 -> 2 usable; /31 -> 0 usable; /32 -> 0 usable (no negatives anywhere)
const p30 = runAddressOperation({ op: "ipv4Addressing", ip: "192.168.1.1", prefix: 30, faults: [] });
const p31 = runAddressOperation({ op: "ipv4Addressing", ip: "192.168.1.1", prefix: 31, faults: [] });
const p32 = runAddressOperation({ op: "ipv4Addressing", ip: "192.168.1.1", prefix: 32, faults: [] });
const hosts30 = p30.stats.find((s) => s.label === "Usable hosts")?.value;
const hosts31 = p31.stats.find((s) => s.label === "Usable hosts")?.value;
const hosts32 = p32.stats.find((s) => s.label === "Usable hosts")?.value;
ok(hosts30 === "2", `/30 -> usable hosts ${hosts30} (expected 2)`);
ok(hosts31 === "0", `/31 -> usable hosts ${hosts31} (expected 0)`);
ok(hosts32 === "0", `/32 -> usable hosts ${hosts32} (expected 0)`);

console.log("\n-- addressEngine: VLSM hierarchical carving & free space --");
// Test 4: VLSM on 192.168.1.0/24 with 100/50/20/10 -> prefixes /25 /26 /27 /28, networks .0, .128, .192, .224, and leftover free space correct
const vlsmP = runAddressOperation({
  op: "vlsm",
  baseBlock: "192.168.1.0/24",
  departments: [
    { id: "d1", name: "Engineering", hostsNeeded: 100 },
    { id: "d2", name: "Sales", hostsNeeded: 50 },
    { id: "d3", name: "Support", hostsNeeded: 20 },
    { id: "d4", name: "Ops", hostsNeeded: 10 },
  ],
  faults: [],
});
const summaryStep = vlsmP.steps.find((s) => s.table !== undefined && s.spaceBar?.blocks.some((b) => b.id === "block-free-space"));
const blocks = summaryStep?.spaceBar?.blocks ?? [];
const engBlock = blocks.find((b) => b.id === "block-d1");
const salesBlock = blocks.find((b) => b.id === "block-d2");
const suppBlock = blocks.find((b) => b.id === "block-d3");
const opsBlock = blocks.find((b) => b.id === "block-d4");
const freeBlock = blocks.find((b) => b.id === "block-free-space");

ok(engBlock?.prefix === 25 && engBlock?.startIp === "192.168.1.0", `Engineering: /${engBlock?.prefix} network ${engBlock?.startIp} (expected /25 192.168.1.0)`);
ok(salesBlock?.prefix === 26 && salesBlock?.startIp === "192.168.1.128", `Sales: /${salesBlock?.prefix} network ${salesBlock?.startIp} (expected /26 192.168.1.128)`);
ok(suppBlock?.prefix === 27 && suppBlock?.startIp === "192.168.1.192", `Support: /${suppBlock?.prefix} network ${suppBlock?.startIp} (expected /27 192.168.1.192)`);
ok(opsBlock?.prefix === 28 && opsBlock?.startIp === "192.168.1.224", `Ops: /${opsBlock?.prefix} network ${opsBlock?.startIp} (expected /28 192.168.1.224)`);
ok(freeBlock?.startIp === "192.168.1.240" && freeBlock?.endIp === "192.168.1.255", `Free space: ${freeBlock?.startIp} - ${freeBlock?.endIp} (expected 192.168.1.240 - 192.168.1.255)`);

// Test 5: VLSM with an impossible requirement (e.g. 300 hosts in a /24) produces an error-toned final frame rather than throwing
const overflowP = runAddressOperation({
  op: "vlsm",
  baseBlock: "192.168.1.0/24",
  departments: [
    { id: "giant", name: "Datacenter", hostsNeeded: 300 },
  ],
  faults: [],
});
const overflowLast = overflowP.steps[overflowP.steps.length - 1];
ok(overflowLast.message?.tone === "error", `Impossible VLSM requirement (300 hosts in /24) produces error frame: "${overflowLast.message?.text}"`);
ok(overflowP.stats.find((s) => s.label === "Status")?.value === "Overflow", "Overflow status reflected in stats");

console.log("\n-- addressEngine: bit-flip fault consequences --");
// Test 6: A bit flip changes the computed network address in the way claimed
// Flip bit 23 of 192.168.1.25/24 (last bit of 3rd octet). 1 -> 0 => network becomes 192.168.0.0
const flipP = runAddressOperation({
  op: "ipv4Addressing",
  ip: "192.168.1.25",
  prefix: 24,
  faults: [{ kind: "bitFlip", index: 23 }],
});
const flipNet = flipP.stats.find((s) => s.label === "Network")?.value;
ok(flipNet === "192.168.0.0", `Flipping bit 23 moved network from 192.168.1.0 to ${flipNet} (expected 192.168.0.0)`);
// Flip bit 31 of 192.168.1.25/24 (LSB of host portion). Network remains 192.168.1.0.
const hostFlipP = runAddressOperation({
  op: "ipv4Addressing",
  ip: "192.168.1.25",
  prefix: 24,
  faults: [{ kind: "bitFlip", index: 31 }],
});
const hostFlipNet = hostFlipP.stats.find((s) => s.label === "Network")?.value;
ok(hostFlipNet === "192.168.1.0", `Host bit flip (bit 31) preserves network address ${hostFlipNet}`);

console.log(fails === 0 ? "\nALL ENGINE CHECKS PASSED\n" : `\n${fails} CHECK(S) FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
