"use client";

// Type your own message and your own addressing, and the animation is about
// your data: the bits on the wire are its real ASCII, the IPs and ports appear
// inside the headers that carry them, and the overhead figures are recomputed
// from what you actually sent.

import { Icon } from "@/components/ui/Icon";
import { Field, NumberInput, TextInput } from "@/components/ui/Field";
import { SidebarTabs } from "@/components/visualizer/SidebarTabs";
import { useLayerStore } from "@/lib/layerStore";

const LEGEND = [
  {
    label: "AH / PH / SH",
    tone: "text-violet border-violet/50 bg-violet/10",
    what: "OSI layers 7–6–5. In the real TCP/IP stack these three are one layer and add no header at all.",
  },
  { label: "TCP", tone: "text-amber border-amber/50 bg-amber/10", what: "Ports, sequence and ACK numbers. 20 bytes." },
  {
    label: "IP",
    tone: "text-primary border-primary/50 bg-primary/10",
    what: "Source and destination IP, TTL. 20 bytes — the only header routers read.",
  },
  {
    label: "MAC / FCS",
    tone: "text-mint border-mint/50 bg-mint/10",
    what: "Local hop addressing plus a CRC. Rewritten at every hop.",
  },
];

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const validIp = (s: string) => IPV4.test(s) && s.split(".").every((o) => Number(o) <= 255);

export function LayerSidebar() {
  const params = useLayerStore((s) => s.params);
  const run = useLayerStore((s) => s.run);

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name="layers" className="text-[16px] text-primary" />
          <h2 className="font-hand text-[21px] font-bold text-primary">Encapsulation</h2>
        </div>

        <SidebarTabs />

        <Field label="Message" hint="Press Enter to send it down the stack. Its real ASCII appears on the wire.">
          <TextInput
            value={params.message}
            maxLength={40}
            placeholder="HELLO"
            onCommit={(message) => run({ message: message || "HELLO" })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Source IP">
            <TextInput
              value={params.srcIp}
              maxLength={15}
              invalid={!validIp(params.srcIp)}
              onCommit={(srcIp) => run({ srcIp: validIp(srcIp) ? srcIp : params.srcIp })}
            />
          </Field>
          <Field label="Dest IP">
            <TextInput
              value={params.dstIp}
              maxLength={15}
              invalid={!validIp(params.dstIp)}
              onCommit={(dstIp) => run({ dstIp: validIp(dstIp) ? dstIp : params.dstIp })}
            />
          </Field>
          <Field label="Source port">
            <NumberInput
              value={params.srcPort}
              min={1}
              max={65535}
              onCommit={(srcPort) => run({ srcPort })}
            />
          </Field>
          <Field label="Dest port">
            <NumberInput
              value={params.dstPort}
              min={1}
              max={65535}
              onCommit={(dstPort) => run({ dstPort })}
            />
          </Field>
        </div>

        <div>
          <label className="mb-1.5 block font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant/70">
            Headers
          </label>
          <div className="flex flex-col gap-1.5">
            {LEGEND.map((l) => (
              <div key={l.label} className="rounded-md border border-outline-variant px-2 py-1.5">
                <span
                  className={`inline-block rounded-sm border px-1.5 py-px font-mono text-[12px] font-bold ${l.tone}`}
                >
                  {l.label}
                </span>
                <p className="mt-1 font-body-sm text-[13px] leading-snug text-on-surface-variant/75">{l.what}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border-l-[3px] border-coral/70 bg-coral/[0.07] px-2.5 py-2">
          <p className="font-label-caps text-[12px] uppercase tracking-wider text-coral">Try this</p>
          <p className="mt-1 font-body-sm text-[13px] leading-snug text-on-surface-variant/85">
            Send a single character. It still leaves as a 64-byte frame — Ethernet pads anything shorter. Layering is
            not free; it is bought with overhead.
          </p>
        </div>

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
