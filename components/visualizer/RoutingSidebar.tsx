"use client";

import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Chips, Field, NumberInput, Select } from "@/components/ui/Field";
import { SidebarTabs } from "@/components/visualizer/SidebarTabs";
import { MAX_ROUTERS, MIN_ROUTERS, routingLinks, routingRouters, suggestedRoutingCut } from "@/engines/routingEngine";
import { useRoutingStore } from "@/lib/routingStore";
import type { Fault } from "@/types/visualization";

export function RoutingSidebar() {
  const params = useRoutingStore((s) => s.params);
  const run = useRoutingStore((s) => s.run);
  const routers = routingRouters(params.routerCount);
  const links = useMemo(() => routingLinks(params.routerCount, params.linkCosts), [params.routerCount, params.linkCosts]);
  const cut = params.faults.find((f) => f.kind === "linkDown");
  const down = params.faults.find((f) => f.kind === "nodeDown");
  const loss = params.faults.find((f) => f.kind === "packetLoss");
  const isForwarding = params.op === "ipForwarding";
  const setFaults = (next: Fault[]) => run({ faults: next });
  const keep = (kind: Fault["kind"]) => params.faults.filter((f) => f.kind !== kind);
  const setRouters = (routerCount: number) => run({ routerCount, faults: [], linkCosts: {} });

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name={isForwarding ? "alt_route" : "sync"} className="text-[16px] text-primary" />
          <h2 className="font-hand text-[21px] font-bold text-primary">{isForwarding ? "Forwarding" : "Routing algorithms"}</h2>
        </div>
        <SidebarTabs />
        <Field label="Routers" hint="Changing the network rebuilds its real route tables.">
          <Chips value={params.routerCount} onChange={setRouters} columns={4} options={Array.from({ length: MAX_ROUTERS - MIN_ROUTERS + 1 }, (_, i) => ({ value: MIN_ROUTERS + i, label: String(MIN_ROUTERS + i) }))} />
        </Field>
        {isForwarding ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Source"><Select value={params.source} onChange={(source) => run({ source })} options={[{ value: "PC", label: "PC" }, { value: "Server", label: "Server" }]} /></Field>
              <Field label="Destination"><Select value={params.destination} onChange={(destination) => run({ destination })} options={[{ value: "Server", label: "Server" }, { value: "PC", label: "PC" }]} /></Field>
            </div>
            <Field label="TTL"><NumberInput value={params.ttl} onCommit={(ttl) => run({ ttl })} min={1} max={32} /></Field>
          </>
        ) : (
          <Field label="Link costs" hint="Bellman-Ford recomputes every route from these costs.">
            <div className="flex flex-col gap-1.5">{links.map((link) => <div key={link.id} className="grid grid-cols-[1fr_72px] items-center gap-2"><span className="font-mono text-[13px] text-on-surface-variant">{link.id.replace("r-", "").replaceAll("-", " ↔ ")}</span><NumberInput value={link.cost} onCommit={(cost) => run({ linkCosts: { ...params.linkCosts, [link.id]: cost } })} min={1} max={15} /></div>)}</div>
          </Field>
        )}
        <div className="flex flex-col gap-2 border-t border-outline-variant pt-md">
          <label className="flex items-center gap-1.5 font-label-caps text-[12px] uppercase tracking-[0.08em] text-coral"><Icon name="warning" className="text-[14px]" /> Faults</label>
          <Field label="Cut link"><Select value={cut?.id ?? ""} onChange={(id) => setFaults(id ? [...keep("linkDown"), { kind: "linkDown", id }] : keep("linkDown"))} options={[{ value: "", label: "— all links healthy —" }, ...links.map((link) => ({ value: link.id, label: `${link.id.replace("r-", "").replaceAll("-", " ↔ ")}${link.id === suggestedRoutingCut(params.routerCount) ? "  ★" : ""}` }))]} /></Field>
          <Field label="Down router"><Select value={down?.id ?? ""} onChange={(id) => setFaults(id ? [...keep("nodeDown"), { kind: "nodeDown", id }] : keep("nodeDown"))} options={[{ value: "", label: "— all routers up —" }, ...routers.map((id) => ({ value: id, label: `Router ${id}` }))]} /></Field>
          {isForwarding && <Field label="Packet loss"><Select value={String(loss?.rate ?? 0)} onChange={(rate) => setFaults(Number(rate) ? [...keep("packetLoss"), { kind: "packetLoss", rate: Number(rate) }] : keep("packetLoss"))} options={[{ value: "0", label: "— no loss —" }, { value: "0.25", label: "25% deterministic" }, { value: "0.5", label: "50% deterministic" }]} /></Field>}
        </div>
        <button onClick={() => run()} className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-primary py-2.5 font-sans text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface active:scale-[0.98]"><Icon name="play_circle" className="text-[18px]" /> Re-run</button>
      </div>
    </aside>
  );
}
