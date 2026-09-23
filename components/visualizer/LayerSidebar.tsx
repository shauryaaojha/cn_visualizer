"use client";

// Type your own message and your own addressing, and the animation is about
// your data: the bits on the wire are its real ASCII, the IPs and ports appear
// inside the headers that carry them, and the overhead figures are recomputed
// from what you actually sent. (What each header means is on the stage now —
// click any header to inspect it — so the old legend is gone from here.)

import { Icon } from "@/components/ui/Icon";
import { Field, NumberInput, TextInput } from "@/components/ui/Field";
import { useLayerStore } from "@/lib/layerStore";

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
          <h2 className="font-hand text-[21px] font-bold text-primary">Your packet</h2>
        </div>


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
