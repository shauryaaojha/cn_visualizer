// ---------------------------------------------------------------------------
// routingFacts — Inspector cards for the routing canvas: a clicked router
// (its whole table, right now), a clicked link (its cost and which routes
// ride on it) and a clicked table row (how that metric was worked out).
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { NetLink, RoutingStep, RoutingTable, RoutingTableEntry } from "../types/visualization.ts";

const INF = 16;
const m = (x: number) => (x >= INF ? "∞ (16)" : String(x));

export function routeRowFact(e: RoutingTableEntry, t: RoutingTable, forwarding: boolean): FactSpec {
  const me = t.routerId ?? "?";
  if (forwarding) {
    const prefix = Number(e.destination.split("/")[1] ?? 0);
    return {
      lead:
        e.nextHop === "direct"
          ? `${e.destination} is plugged straight into ${me}, so packets for it are delivered on the local interface.`
          : `Packets for ${e.destination} leave ${me} through ${e.outgoingInterface} towards ${e.nextHop}.`,
      rows: [
        ["Prefix length", `/${prefix} — ${prefix} network bits`],
        ["Next hop", e.nextHop],
        ["Interface", e.outgoingInterface],
        ["Metric", String(e.metric)],
        ["State", e.state === "changed" ? "chosen for this packet" : e.state === "head" ? "matches, but less specific" : "does not match"],
      ],
      more: "When several rows match, the router picks the one with the longest prefix — it describes the destination most precisely.",
      remember: "Longest-prefix match beats metric: /24 wins over /8 whatever the numbers say.",
    };
  }
  const path = e.path && e.path.length ? e.path.join(" → ") : "none";
  return {
    lead:
      e.nextHop === "self"
        ? `${me} is always 0 away from itself.`
        : e.metric >= INF
          ? `${me} has no working route to ${e.destination} — RIP writes that as 16.`
          : `${me} reaches ${e.destination} by handing packets to ${e.nextHop}, for a total cost of ${e.metric}.`,
    rows: [
      ["Destination", e.destination],
      ["Next hop", e.nextHop],
      ["Metric", m(e.metric)],
      ["Path", path],
      ["This round", e.state === "changed" ? "just changed" : e.state === "final" ? "settled" : "unchanged"],
    ],
    more:
      e.nextHop !== "self" && e.metric < INF
        ? `Bellman-Ford: D(${me},${e.destination}) = min over neighbours v of c(${me},v) + D(v,${e.destination}). ${me} never sees the whole path — only its neighbours' totals.`
        : undefined,
    remember: "Distance vector = tell your neighbours everything you know, and trust what they tell you.",
  };
}

export function routerFact(id: string, st: RoutingStep): FactSpec {
  const t = st.tables.find((x) => x.routerId === id);
  const reach = t ? t.entries.filter((e) => e.metric < INF && e.nextHop !== "self").length : 0;
  const changed = t ? t.entries.filter((e) => e.state === "changed").map((e) => e.destination) : [];
  return {
    lead: t
      ? `Router ${id} knows ${reach} destination${reach === 1 ? "" : "s"} right now. Everything it knows came from its own links and its neighbours' vectors.`
      : `${id} is an end host. It hands every packet for another network to its default gateway.`,
    rows: t
      ? t.entries.map((e) => [e.destination, `${m(e.metric)} via ${e.nextHop}`] as [string, string])
      : undefined,
    chips: changed.length ? [{ label: "Changed this frame", items: changed }] : undefined,
    remember: "A router only ever decides the next hop. The whole path is an emergent result of every router doing the same.",
  };
}

export function routeLinkFact(l: NetLink, st: RoutingStep): FactSpec {
  const cost = l.label?.replace("cost ", "") ?? "?";
  const users = st.tables.flatMap((t) =>
    t.entries
      .filter((e) => e.path && e.path.length > 1 && e.path.some((p, i) => i > 0 && ((p === l.to && e.path![i - 1] === l.from) || (p === l.from && e.path![i - 1] === l.to))))
      .map((e) => `${t.routerId}→${e.destination}`),
  );
  return {
    lead:
      l.state === "down"
        ? `The ${l.from}–${l.to} link is down. Any route that used it has to be re-learned.`
        : `A link of cost ${cost}. A route's metric is the sum of the costs of every link on it.`,
    rows: [
      ["Ends", `${l.from} ↔ ${l.to}`],
      ["Cost", cost],
      ["State", l.state],
    ],
    chips: users.length ? [{ label: "Routes using it", items: users.slice(0, 12) }] : undefined,
    remember: "Change a cost in Setup and every table is recomputed from scratch.",
  };
}
