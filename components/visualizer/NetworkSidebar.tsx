"use client";

// Left rail for netEngine leaves: pick the hosts, pick the endpoints, cut a
// link, re-run.
//
// Nothing here is a preset any more. Because the engine finds paths by BFS
// rather than following a written-down route, sender, receiver, host count and
// the severed link are all free variables — so this rail is where you set up
// your own experiment rather than replay mine.

import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Chips, Field, Select } from "@/components/ui/Field";
import { SidebarTabs } from "@/components/visualizer/SidebarTabs";
import { cuttableLinks, HOST_IDS, MAX_HOSTS, MIN_HOSTS, suggestedCut } from "@/engines/netEngine";
import { useNetStore } from "@/lib/netStore";
import type { Fault } from "@/types/visualization";

export function NetworkSidebar() {
  const params = useNetStore((s) => s.params);
  const run = useNetStore((s) => s.run);

  const ids = HOST_IDS.slice(0, params.hosts);
  const isTopo = params.op.startsWith("topo");
  const isComparison = params.op === "topoFailure" || params.op === "typeComparison" || params.op === "switchComparison";
  const isIntro = params.op === "introNetwork";

  const links = useMemo(
    () => cuttableLinks(params.op, params.hosts, params.from, params.to),
    [params.op, params.hosts, params.from, params.to],
  );

  const currentCut = params.faults.find((f) => f.kind === "linkDown");
  const cutId = currentCut && "id" in currentCut ? currentCut.id : "";

  const setCut = (id: string) => {
    const faults: Fault[] = id ? [{ kind: "linkDown", id }] : [];
    run({ faults });
  };

  /** Changing hosts can orphan the endpoints and the chosen cut — re-derive. */
  const setHosts = (hosts: number) => {
    const next = HOST_IDS.slice(0, hosts);
    const from = next.includes(params.from) ? params.from : next[0];
    const to = next.includes(params.to) ? params.to : next[next.length - 1];
    run({ hosts, from, to, faults: [] });
  };

  const setEndpoint = (which: "from" | "to", value: string) => {
    const other = which === "from" ? params.to : params.from;
    const patch =
      value === other
        ? { [which]: value, [which === "from" ? "to" : "from"]: ids.find((i) => i !== value)! }
        : { [which]: value };
    run({ ...patch, faults: [] });
  };

  const suggestion = suggestedCut(params.op, params.hosts, params.from, params.to);

  const categoryTitle = isIntro
    ? "Introduction"
    : params.op.startsWith("type")
      ? "Network Types"
      : params.op.startsWith("switch")
        ? "Switching"
        : "Topologies";

  const categoryIcon = isIntro
    ? "share"
    : params.op.startsWith("type")
      ? "public"
      : params.op.startsWith("switch")
        ? "call_split"
        : "hub";

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name={categoryIcon} className="text-[16px] text-primary" />
          <h2 className="font-hand text-[21px] font-bold text-primary">{categoryTitle}</h2>
        </div>

        <SidebarTabs />

        {isTopo && (
          <>
            <Field label="Hosts" hint="The same hosts get rewired for every layout.">
              <Chips
                value={params.hosts}
                onChange={setHosts}
                columns={5}
                options={Array.from({ length: MAX_HOSTS - MIN_HOSTS + 1 }, (_, i) => ({
                  value: MIN_HOSTS + i,
                  label: String(MIN_HOSTS + i),
                }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Sender">
                <Select
                  value={params.from}
                  onChange={(v) => setEndpoint("from", v)}
                  options={ids.map((i) => ({ value: i, label: i }))}
                />
              </Field>
              <Field label="Receiver">
                <Select
                  value={params.to}
                  onChange={(v) => setEndpoint("to", v)}
                  options={ids.map((i) => ({ value: i, label: i }))}
                />
              </Field>
            </div>
          </>
        )}

        {/* Faults — break the network on purpose */}
        {(isTopo || isIntro) && (
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 font-label-caps text-[12px] uppercase tracking-[0.08em] text-coral">
              <Icon name="warning" className="text-[14px]" /> Cut a link
            </label>
            {isComparison ? (
              <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant/75">
                This comparison already cuts the middle hop of each topology&apos;s route — that is the whole
                experiment.
              </p>
            ) : isIntro ? (
              <Select
                value={cutId}
                onChange={setCut}
                options={[
                  { value: "", label: "— all links healthy —" },
                  { value: "l1", label: "Alice → Switch (Link 1)" },
                  { value: "l2", label: "Switch → Bob (Link 2)" },
                ]}
              />
            ) : (
              <>
                <Select
                  value={cutId}
                  onChange={setCut}
                  options={[
                    { value: "", label: "— nothing cut —" },
                    ...links.map((l) => ({
                      value: l.id,
                      label: l.suggested ? `${l.label}  ★` : l.label,
                    })),
                  ]}
                />
                <p className="font-body-sm text-[13px] leading-snug text-on-surface-variant/60">
                  {cutId
                    ? cutId === suggestion
                      ? "★ the middle hop of the current route — the interesting one to break."
                      : "Not on the current route? Then nothing will change. That is a result too."
                    : "★ marks the middle hop of the route in use."}
                </p>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => run()}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-primary py-2.5 font-sans text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface active:scale-[0.98]"
        >
          <Icon name="play_circle" className="text-[18px]" /> Re-run
        </button>
      </div>
    </aside>
  );
}

