// ---------------------------------------------------------------------------
// routingEngine — forwarding and distance-vector routing.
//
// The engine deliberately owns the algorithms, not the animation. Each frame
// is a complete routing snapshot, so the same experiment is replayable in
// either direction and changing a cost changes the actual calculation.
// ---------------------------------------------------------------------------

import type {
  Fault,
  NetLink,
  NetNode,
  NetPanel,
  Packet,
  RoutingOperationId,
  RoutingProgram,
  RoutingStep,
  RoutingTable,
  RoutingTableEntry,
  StepMessage,
} from "@/types/visualization";
import { ask, near } from "./lessonKit.ts";

export const ROUTER_IDS = ["A", "B", "C", "D", "E", "F"];
export const MIN_ROUTERS = 3;
export const MAX_ROUTERS = 6;
export const RIP_INFINITY = 16;

export interface RoutingLinkCost {
  id: string;
  cost: number;
}

export interface RoutingParams {
  op: RoutingOperationId;
  routerCount: number;
  source: string;
  destination: string;
  ttl: number;
  /** Costs are keyed by the stable ids returned from routingLinks(). */
  linkCosts: Record<string, number>;
  faults: Fault[];
}

export const ROUTING_DEFAULTS: RoutingParams = {
  op: "ipForwarding",
  routerCount: 4,
  source: "PC",
  destination: "Server",
  ttl: 8,
  linkCosts: {},
  faults: [],
};

interface Edge { id: string; from: string; to: string; cost: number }
interface VectorRow { metric: number; nextHop: string; path: string[] }
type VectorTable = Record<string, VectorRow>;

const costOf = (params: RoutingParams, id: string, fallback: number) => {
  const requested = params.linkCosts[id];
  return Number.isFinite(requested) ? Math.max(1, Math.min(15, Math.round(requested))) : fallback;
};

/** A simple chain is intentional: one cut makes the count-to-infinity lesson visible. */
export function routingLinks(routerCount: number, linkCosts: Record<string, number> = {}): RoutingLinkCost[] {
  const n = Math.max(MIN_ROUTERS, Math.min(MAX_ROUTERS, routerCount));
  return Array.from({ length: n - 1 }, (_, i) => {
    const id = `r-${ROUTER_IDS[i]}-${ROUTER_IDS[i + 1]}`;
    return { id, cost: costOf({ ...ROUTING_DEFAULTS, routerCount: n, linkCosts }, id, i % 2 === 0 ? 1 : 2) };
  });
}

export function suggestedRoutingCut(routerCount: number): string {
  const links = routingLinks(routerCount);
  return links[Math.floor((links.length - 1) / 2)]?.id ?? "";
}

export function routingRouters(routerCount: number): string[] {
  return ROUTER_IDS.slice(0, Math.max(MIN_ROUTERS, Math.min(MAX_ROUTERS, routerCount)));
}

function graphEdges(params: RoutingParams, includeHosts = false): Edge[] {
  const routers = routingRouters(params.routerCount);
  const links = routingLinks(routers.length, params.linkCosts).map((l, i) => ({
    id: l.id,
    from: routers[i],
    to: routers[i + 1],
    cost: l.cost,
  }));
  if (!includeHosts) return links;
  return [
    { id: "pc-A", from: "PC", to: routers[0], cost: 1 },
    ...links,
    { id: `server-${routers.at(-1)}`, from: routers.at(-1)!, to: "Server", cost: 1 },
  ];
}

function downSets(faults: Fault[]) {
  return {
    links: new Set(faults.filter((f): f is Extract<Fault, { kind: "linkDown" }> => f.kind === "linkDown").map((f) => f.id)),
    nodes: new Set(faults.filter((f): f is Extract<Fault, { kind: "nodeDown" }> => f.kind === "nodeDown").map((f) => f.id)),
  };
}

function positions(ids: string[]) {
  return ids.map((id, i) => ({ id, x: 12 + (i * 76) / Math.max(1, ids.length - 1), y: 50 }));
}

function panelFor(params: RoutingParams, packets: Packet[] = [], badges: Record<string, string> = {}, includeHosts = false): NetPanel {
  const edges = graphEdges(params, includeHosts);
  const { links: downLinks, nodes: downNodes } = downSets(params.faults);
  const ids = includeHosts ? ["PC", ...routingRouters(params.routerCount), "Server"] : routingRouters(params.routerCount);
  const pos = positions(ids);
  const nodes: NetNode[] = pos.map((p) => ({
    id: p.id,
    label: p.id,
    kind: p.id === "PC" ? "host" : p.id === "Server" ? "server" : "router",
    x: p.x,
    y: p.y,
    state: downNodes.has(p.id) ? "failed" : "idle",
    badge: badges[p.id],
  }));
  const links: NetLink[] = edges.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    label: `cost ${e.cost}`,
    state: downLinks.has(e.id) || downNodes.has(e.from) || downNodes.has(e.to) ? "down" : packets.some((p) => p.linkId === e.id) ? "active" : "idle",
  }));
  return { id: "routing-graph", label: includeHosts ? "Packet path" : "Router graph", sub: "link costs are RIP metrics", nodes, links, packets };
}

function deterministicLoss(params: RoutingParams, hop: number) {
  const loss = params.faults.find((f): f is Extract<Fault, { kind: "packetLoss" }> => f.kind === "packetLoss");
  if (!loss || loss.rate <= 0) return false;
  const seed = `${params.routerCount}|${params.ttl}|${params.source}|${params.destination}|${hop}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 10000) / 10000 < Math.min(1, loss.rate);
}

function forwardingRows(router: string, routers: string[]): RoutingTableEntry[] {
  const last = routers.at(-1)!;
  const i = routers.indexOf(router);
  const localNet = `10.0.${i + 1}.0/24`;
  const serverNet = `10.0.${routers.length + 1}.0/24`;
  const next = i === routers.length - 1 ? "direct" : routers[i + 1];
  const rows: RoutingTableEntry[] = [
    { destination: localNet, nextHop: "direct", outgoingInterface: "Gi0/0", metric: 0, state: "idle" },
    { destination: "10.0.0.0/8", nextHop: next, outgoingInterface: "Gi0/1", metric: Math.max(1, routers.length - i), state: "idle" },
    { destination: serverNet, nextHop: next, outgoingInterface: i === routers.length - 1 ? "Gi0/1" : "Gi0/1", metric: routers.length - i, state: "idle" },
  ];
  return rows.map((row) => ({ ...row, path: row.nextHop === "direct" ? [router] : [router, ...routers.slice(i + 1), last] }));
}

function prefixLength(route: string) { return Number(route.split("/")[1] ?? 0); }
function matchesPrefix(ip: string, route: string) {
  const [network, suffix] = route.split("/");
  const prefix = Number(suffix);
  const toBits = (s: string) => s.split(".").map((x) => Number(x).toString(2).padStart(8, "0")).join("");
  return toBits(ip).slice(0, prefix) === toBits(network).slice(0, prefix);
}

function forwardingTable(router: string, routers: string[], destinationIp: string, winner?: string): RoutingTable {
  return {
    id: `table-${router}`,
    title: `${router} routing table`,
    routerId: router,
    focused: true,
    entries: forwardingRows(router, routers).map((entry) => ({
      ...entry,
      state: entry.destination === winner ? "changed" : matchesPrefix(destinationIp, entry.destination) ? "head" : "idle",
    })),
  };
}

function forwardingProgram(params: RoutingParams): RoutingProgram {
  const routers = routingRouters(params.routerCount);
  const destinationIp = `10.0.${routers.length + 1}.10`;
  const { links: downLinks, nodes: downNodes } = downSets(params.faults);
  const steps: RoutingStep[] = [];
  let ttl = params.ttl;
  let hopCount = 0;
  let delivered = false;
  let finalMessage: StepMessage | undefined;
  const push = (description: string, table: RoutingTable, codeLines: number[], packets: Packet[] = [], message?: StepMessage) =>
    steps.push({ panels: [panelFor(params, packets, {}, true)], tables: [table], round: hopCount, converged: false, description, codeLines, message });

  for (let i = 0; i < routers.length; i++) {
    const router = routers[i];
    const inbound = i === 0 ? "pc-A" : `r-${routers[i - 1]}-${router}`;
    const rows = forwardingRows(router, routers);
    const candidates = rows.filter((r) => matchesPrefix(destinationIp, r.destination));
    const winner = candidates.sort((a, b) => prefixLength(b.destination) - prefixLength(a.destination))[0];
    push(
      `${router} receives the packet. It does not need a map of the Internet; it only needs one good next step for ${destinationIp}.`,
      forwardingTable(router, routers, destinationIp),
      [1],
      [{ id: "IP1", label: `TTL ${ttl}`, linkId: inbound, t: i === 0 ? 1 : 0.85, kind: "data", state: "flying" }],
    );
    if (!winner) {
      finalMessage = { text: "Destination unreachable — this router has no matching route.", tone: "error" };
      push("Without a matching prefix or a default route, guessing would be worse than stopping. The packet is dropped here.", forwardingTable(router, routers, destinationIp), [2], [], finalMessage);
      break;
    }
    push(
      `${winner.destination} beats ${candidates.filter((r) => r !== winner).map((r) => r.destination).join(" and ") || "no broader candidate"}: its /${prefixLength(winner.destination)} prefix matches more of the destination address.`,
      forwardingTable(router, routers, destinationIp, winner.destination),
      [2, 3],
      [],
      { text: `Longest-prefix match: ${winner.destination} via ${winner.nextHop}`, tone: "info" },
    );
    ttl -= 1;
    if (ttl <= 0) {
      finalMessage = { text: "TTL expired — the packet is discarded before it can loop forever.", tone: "error" };
      push("Every router spends one TTL. This packet has run out of life before the next hop.", forwardingTable(router, routers, destinationIp, winner.destination), [4], [], finalMessage);
      break;
    }
    const out = i === routers.length - 1 ? `server-${router}` : `r-${router}-${routers[i + 1]}`;
    const unavailable = downLinks.has(out) || downNodes.has(router) || downNodes.has(i === routers.length - 1 ? "Server" : routers[i + 1]);
    if (unavailable || deterministicLoss(params, hopCount)) {
      finalMessage = { text: unavailable ? "Static route failed — its outgoing link is down." : "Packet lost on this hop.", tone: "error" };
      push("The table still points at the same interface. Static forwarding does not discover a detour by itself.", forwardingTable(router, routers, destinationIp, winner.destination), [5], [{ id: "IP1", label: "IP1", linkId: out, t: 0.5, kind: "data", state: "dropped" }], finalMessage);
      break;
    }
    hopCount += 1;
    const lastHop = i === routers.length - 1;
    finalMessage = lastHop ? { text: "Delivered — each router made one local decision.", tone: "ok" } : undefined;
    push(
      `${router} sends the packet out ${winner.outgoingInterface} with TTL ${ttl}. The next router will repeat the same small decision.`,
      forwardingTable(router, routers, destinationIp, winner.destination),
      [4, 5],
      [{ id: "IP1", label: `TTL ${ttl}`, linkId: out, t: lastHop ? 1 : 0.55, kind: "data", state: lastHop ? "delivered" : "flying" }],
      finalMessage,
    );
    if (lastHop) { delivered = true; break; }
  }
  return {
    title: "IP Forwarding",
    pseudocode: ["receive packet at router", "find every matching route", "choose the longest matching prefix", "decrement TTL; drop if it reaches zero", "forward through the chosen interface"],
    stats: [
      { label: "Hops", value: String(hopCount) },
      { label: "TTL left", value: String(Math.max(0, ttl)) },
      { label: "Destination", value: destinationIp },
      { label: "Result", value: delivered ? "Delivered" : "Dropped", tone: delivered ? "mint" : "coral" },
    ],
    steps,
  };
}

function activeEdges(params: RoutingParams, ignoreLinkDown = false): Edge[] {
  const { links, nodes } = downSets(params.faults);
  return graphEdges(params).filter((e) => (ignoreLinkDown || !links.has(e.id)) && !nodes.has(e.from) && !nodes.has(e.to));
}
function neighbors(ids: string[], edges: Edge[]) {
  const out: Record<string, { id: string; cost: number; linkId: string }[]> = Object.fromEntries(ids.map((id) => [id, []]));
  for (const e of edges) { out[e.from]?.push({ id: e.to, cost: e.cost, linkId: e.id }); out[e.to]?.push({ id: e.from, cost: e.cost, linkId: e.id }); }
  return out;
}
function initialVectors(ids: string[], edges: Edge[]): Record<string, VectorTable> {
  const ns = neighbors(ids, edges);
  return Object.fromEntries(ids.map((from) => [from, Object.fromEntries(ids.map((to) => {
    if (from === to) return [to, { metric: 0, nextHop: "self", path: [from] }];
    const direct = ns[from]?.find((n) => n.id === to);
    return [to, direct ? { metric: direct.cost, nextHop: to, path: [from, to] } : { metric: RIP_INFINITY, nextHop: "—", path: [] }];
  }))]));
}
function cloneVectors(vectors: Record<string, VectorTable>) { return JSON.parse(JSON.stringify(vectors)) as Record<string, VectorTable>; }

function updateRound(ids: string[], edges: Edge[], previous: Record<string, VectorTable>) {
  const ns = neighbors(ids, edges);
  const next = cloneVectors(previous);
  const changed: { from: string; to: string; old: number; value: number; via: string }[] = [];
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) { next[from][to] = { metric: 0, nextHop: "self", path: [from] }; continue; }
      let best: VectorRow = { metric: RIP_INFINITY, nextHop: "—", path: [] };
      for (const n of ns[from] ?? []) {
        const advertised = previous[n.id][to];
        const candidate = Math.min(RIP_INFINITY, n.cost + advertised.metric);
        if (candidate < best.metric) best = { metric: candidate, nextHop: n.id, path: candidate >= RIP_INFINITY ? [] : [from, ...advertised.path] };
      }
      const old = previous[from][to];
      if (best.metric > old.metric) {
        // A normal healthy round never makes a route worse. During a failure it
        // may, and preserving it is exactly what exposes count-to-infinity.
        next[from][to] = best;
      } else if (best.metric < old.metric) next[from][to] = best;
      else next[from][to] = old;
      if (next[from][to].metric !== old.metric) changed.push({ from, to, old: old.metric, value: next[from][to].metric, via: next[from][to].nextHop });
    }
  }
  return { next, changed };
}

function tablesFromVectors(ids: string[], vectors: Record<string, VectorTable>, changed: Set<string>, final: boolean): RoutingTable[] {
  return ids.map((router) => ({
    id: `table-${router}`,
    title: `${router} distance vector`,
    routerId: router,
    entries: ids.map((destination) => {
      const row = vectors[router][destination];
      return { destination, nextHop: row.nextHop, outgoingInterface: row.nextHop === "—" || row.nextHop === "self" ? "—" : `to ${row.nextHop}`, metric: row.metric, path: row.path, state: changed.has(`${router}:${destination}`) ? "changed" : final ? "final" : "idle" };
    }),
  }));
}

function dvStep(params: RoutingParams, ids: string[], vectors: Record<string, VectorTable>, round: number, changedRows: { from: string; to: string; old: number; value: number; via: string }[], description: string, codeLines: number[], converged: boolean, update?: { from: string; to: string }, message?: StepMessage): RoutingStep {
  const packet: Packet[] = update ? [{ id: `vector-${round}-${update.from}-${update.to}`, label: "DV", linkId: graphEdges(params).find((e) => (e.from === update.from && e.to === update.to) || (e.from === update.to && e.to === update.from))?.id ?? "", t: 0.5, kind: "control", state: "flying" }] : [];
  const changedSet = new Set(changedRows.map((c) => `${c.from}:${c.to}`));
  const badges = Object.fromEntries(ids.map((id) => [id, `best ${Math.min(...Object.values(vectors[id]).map((r) => r.metric))}`]));
  return {
    panels: [panelFor(params, packet, badges)],
    tables: tablesFromVectors(ids, vectors, changedSet, converged),
    round,
    converged,
    updates: update && packet[0].linkId ? [{ packet: packet[0], from: update.from, to: update.to, kind: "vector" }] : undefined,
    description,
    codeLines,
    message,
  };
}

function distanceVectorProgram(params: RoutingParams): RoutingProgram {
  const ids = routingRouters(params.routerCount).filter((id) => !downSets(params.faults).nodes.has(id));
  const cut = params.faults.find((f): f is Extract<Fault, { kind: "linkDown" }> => f.kind === "linkDown");
  const healthyEdges = activeEdges(params, Boolean(cut));
  const active = activeEdges(params);
  let vectors = initialVectors(ids, healthyEdges);
  const steps: RoutingStep[] = [dvStep(params, ids, vectors, 0, [], "At first, each router trusts only itself and the neighbours connected directly to it. Every other destination is a blank space — represented by RIP's 16, unreachable.", [1, 2], false)];
  let round = 0;
  let changed: { from: string; to: string; old: number; value: number; via: string }[] = [];
  do {
    round += 1;
    const result = updateRound(ids, healthyEdges, vectors);
    vectors = result.next; changed = result.changed;
    const sample = changed[0];
    steps.push(dvStep(params, ids, vectors, round, changed, sample ? `${sample.from} now reaches ${sample.to} for ${sample.value} via ${sample.via}, better than ${sample.old === RIP_INFINITY ? "∞" : sample.old}. That is the Bellman-Ford rule turning a neighbour's news into a local route.` : "Every advertised vector agrees with the routes already written down. No router can improve a path this round.", [3, 4], changed.length === 0, healthyEdges[0] ? { from: healthyEdges[0].from, to: healthyEdges[0].to } : undefined, changed.length === 0 ? { text: `Converged after ${round} rounds`, tone: "ok" } : { text: `Round ${round} — ${changed.length} entries changed`, tone: "info" }));
  } while (changed.length > 0 && round < RIP_INFINITY + ids.length);
  const stableRounds = round;

  if (cut) {
    const cutEdge = graphEdges(params).find((e) => e.id === cut.id);
    if (cutEdge) {
      steps.push(dvStep(params, ids, vectors, round, [], `The ${cutEdge.from}–${cutEdge.to} link has failed. There is no instant global map: routers must discover the change from the vectors they hear next.`, [5], false, undefined, { text: `Link ${cut.id} is down — reconverging`, tone: "error" }));
      // A router cannot keep forwarding through its failed neighbour, but its
      // neighbour's *last advertisement* is still what the first exchange sees.
      const advertised = cloneVectors(vectors);
      for (const from of [cutEdge.from, cutEdge.to]) {
        for (const destination of ids) if (vectors[from]?.[destination]?.nextHop === (from === cutEdge.from ? cutEdge.to : cutEdge.from)) vectors[from][destination] = { metric: RIP_INFINITY, nextHop: "—", path: [] };
      }
      let previousAdvertisement = advertised;
      let countRound = 0;
      do {
        countRound += 1; round += 1;
        const result = updateRound(ids, active, previousAdvertisement);
        vectors = result.next; changed = result.changed;
        const sample = changed.find((c) => c.value > c.old) ?? changed[0];
        steps.push(dvStep(params, ids, vectors, round, changed, sample ? `${sample.from} believes ${sample.via} can still reach ${sample.to}, so the metric creeps from ${sample.old === RIP_INFINITY ? "∞" : sample.old} to ${sample.value}. Neither router can see the loop in a plain distance vector.` : "The remaining advertisements no longer improve anything.", [3, 4], changed.length === 0, active[0] ? { from: active[0].from, to: active[0].to } : undefined, changed.length === 0 ? { text: `Reconverged after ${countRound} recovery rounds`, tone: "ok" } : sample && sample.value >= RIP_INFINITY ? { text: "16 means unreachable — RIP stops the count-to-infinity climb.", tone: "error" } : { text: `Count to infinity: round ${countRound}`, tone: "warn" }));
        previousAdvertisement = cloneVectors(vectors);
      } while (changed.length > 0 && countRound < RIP_INFINITY + ids.length);
    }
  }
  const final = steps.at(-1)!;
  return {
    title: "Distance Vector Routing",
    pseudocode: ["for every destination: self = 0; neighbours = link cost; others = ∞", "send this distance vector to every neighbour", "for each neighbour v, compute c(x,v) + D(v,y)", "keep the smallest metric and remember its next hop", "repeat until a full round changes no entry"],
    stats: [
      { label: "Routers", value: String(ids.length) },
      { label: "Rounds", value: String(stableRounds) },
      { label: "Converged", value: final.converged ? "yes" : "recovering", tone: final.converged ? "mint" : "amber" },
      { label: "Ceiling", value: `${RIP_INFINITY} = unreachable` },
    ],
    steps,
  };
}

// --- timeline labels and Predict questions (ARCHITECTURE.md §9a) ------------

const metricText = (m: number) => (m >= RIP_INFINITY ? "16 (unreachable)" : String(m));

function annotateForwarding(prog: RoutingProgram): RoutingProgram {
  let askedMatch = false;
  let askedTtl = false;
  prog.steps.forEach((st, i) => {
    const table = st.tables[0];
    const router = table?.routerId ?? "?";
    const codes = st.codeLines ?? [];
    const pk = st.panels[0]?.packets[0];
    if (codes[0] === 1) st.label = `at ${router}`;
    else if (codes.join() === "2,3") {
      st.label = `${router} match`;
      const winner = table.entries.find((e) => e.state === "changed");
      if (winner && !askedMatch) {
        askedMatch = true;
        const dest = prog.stats.find((x) => x.label === "Destination")?.value ?? "the destination";
        st.predict = ask(
          `${router} has three routes. Which one does it use for ${dest}?`,
          winner.destination,
          table.entries.map((e) => e.destination).concat(["0.0.0.0/0"]),
          "Longest-prefix match: of every route that matches, the one with the most network bits wins, because it is the most specific.",
          i,
        );
      }
    } else if (codes.join() === "4,5") {
      st.label = pk?.state === "delivered" ? "✓ server" : `${router} →`;
      const ttl = Number(pk?.label.replace("TTL ", ""));
      if (!askedTtl && Number.isFinite(ttl)) {
        askedTtl = true;
        st.predict = ask(
          `The packet arrived at ${router} with TTL ${ttl + 1}. What TTL does it leave with?`,
          String(ttl),
          near(ttl, [1, -1, 2]).concat(["64"]),
          "Every router decrements TTL by one before forwarding, so a looping packet eventually dies instead of circling forever.",
          ttl,
        );
      }
    } else if (st.message?.tone === "error") {
      st.label = codes[0] === 4 ? "TTL 0" : codes[0] === 2 ? "no route" : "✕ drop";
      if (codes[0] === 5)
        st.predict = ask(
          `${router}'s outgoing link is down, and its route is static. What happens to the packet?`,
          "Dropped — static routes do not find detours",
          ["It is sent back to the PC", "The router finds another path", "It waits in the queue until the link returns"],
          "A static route is a sentence someone typed. Nothing re-computes it when the link underneath fails.",
          2,
        );
      if (codes[0] === 4)
        st.predict = ask(
          `${router} decrements TTL and it hits 0. What does the router do?`,
          "Discards the packet",
          ["Forwards it anyway", "Resets TTL to 64", "Sends it back one hop"],
          "TTL 0 means the packet has lived long enough. The router drops it (and would send an ICMP Time Exceeded back).",
          1,
        );
    }
  });
  return prog;
}

function metricOf(st: RoutingStep, router: string, dest: string) {
  return st.tables.find((t) => t.routerId === router)?.entries.find((e) => e.destination === dest)?.metric;
}

function annotateDistanceVector(prog: RoutingProgram, params: RoutingParams): RoutingProgram {
  const steps = prog.steps;
  const ids = steps[0]?.tables.map((t) => t.routerId!) ?? [];
  const first = ids[0];
  const far = ids.at(-1)!;
  const cutAt = steps.findIndex((s) => s.message?.tone === "error" && s.codeLines?.[0] === 5);
  const stableRounds = Number(prog.stats.find((x) => x.label === "Rounds")?.value ?? 0);
  steps.forEach((st, i) => {
    const recovering = cutAt >= 0 && i > cutAt;
    if (i === 0) st.label = "start";
    else if (i === cutAt) st.label = "✂ cut";
    else if (recovering) st.label = st.converged ? "re-settled" : `recover ${st.round - stableRounds}`;
    else st.label = st.converged ? "converged" : `round ${st.round}`;
  });
  // Round 1: what does the first router learn about the router two hops away?
  const r1 = steps.findIndex((s) => s.round === 1);
  const two = ids[2];
  if (r1 > 0 && two) {
    const m = metricOf(steps[r1], first, two);
    const before = metricOf(steps[r1 - 1], first, two);
    if (m !== undefined && before !== undefined)
      steps[r1].predict = ask(
        `After ${ids[1]} shares its vector once, what is ${first}'s cost to ${two}?`,
        metricText(m),
        [metricText(before), ...near(m, [1, -1, 2]).map(Number).map(metricText)],
        `${first} adds its link cost to ${ids[1]} to what ${ids[1]} advertises for ${two}: c(${first},${ids[1]}) + D(${ids[1]},${two}).`,
        r1,
      );
  }
  // How many rounds until quiet?
  const conv = steps.findIndex((s) => s.converged);
  if (conv > 0)
    steps[conv].predict = ask(
      `With ${ids.length} routers in a chain, how many rounds until a whole round changes nothing?`,
      String(stableRounds),
      near(stableRounds, [-1, 1, 2]),
      `News travels one hop per round. It takes ${stableRounds - 1} rounds to reach the far end of the chain, and one more round in which nothing changes to know it is over.`,
      ids.length,
    );
  // After the cut, where does the first router end up for the far one?
  if (cutAt >= 0) {
    const last = steps.at(-1)!;
    const m = metricOf(last, first, far);
    if (m !== undefined && steps.length - 1 > cutAt) {
      const cutId = params.faults.find((f) => f.kind === "linkDown");
      steps[steps.length - 1].predict = ask(
        `${cutId && "id" in cutId ? cutId.id : "A link"} is down. When the routers settle, what does ${first} list as its cost to ${far}?`,
        metricText(m),
        [metricText(metricOf(steps[cutAt], first, far) ?? 1), metricText(RIP_INFINITY), "0", String(Math.max(1, (m % RIP_INFINITY) + 3))],
        m >= RIP_INFINITY
          ? "The chain is split, so there is no path at all. RIP only knows that once the metric has counted all the way up to 16."
          : "A path still exists, so the routers settle on it — but only after the bad news has spread one hop per round.",
        cutAt,
      );
    }
  }
  return prog;
}

/** Compile one deterministic routing experiment into player frames. */
export function runRoutingOperation(params: RoutingParams): RoutingProgram {
  const safe = { ...ROUTING_DEFAULTS, ...params, routerCount: Math.max(MIN_ROUTERS, Math.min(MAX_ROUTERS, params.routerCount)), faults: params.faults ?? [], linkCosts: params.linkCosts ?? {} };
  return safe.op === "ipForwarding" ? annotateForwarding(forwardingProgram(safe)) : annotateDistanceVector(distanceVectorProgram(safe), safe);
}
