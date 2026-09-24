"use client";

// The Setup drawer for engines that describe their inputs as data
// (engines/controls.ts). Text and number inputs commit on Enter or blur;
// selects and chips commit at once — the same rules as the hand-written
// sidebars, because it is built from the same Field primitives.

import { Chips, Field, NumberInput, Select, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import type { ControlSet } from "@/engines/controls";

interface Props {
  set: ControlSet;
  params: Record<string, unknown>;
  run: (patch: Record<string, unknown>) => void;
}

export function ParamSidebar({ set, params, run }: Props) {
  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name={set.icon} className="text-[16px] text-primary" />
          <h2 className="font-hand text-[21px] font-bold text-primary">{set.title}</h2>
        </div>

        {set.controls.map((c) => {
          const v = params[c.key];
          switch (c.type) {
            case "number":
              return (
                <Field key={c.key} label={c.label} hint={c.hint}>
                  <NumberInput value={Number(v)} min={c.min} max={c.max} step={c.step} suffix={c.suffix} onCommit={(n) => run({ [c.key]: n })} />
                </Field>
              );
            case "text": {
              const re = c.pattern ? new RegExp(c.pattern) : null;
              return (
                <Field key={c.key} label={c.label} hint={c.hint}>
                  <TextInput
                    value={String(v ?? "")}
                    maxLength={c.maxLength}
                    placeholder={c.placeholder}
                    invalid={re ? !re.test(String(v ?? "")) : false}
                    onCommit={(t) => {
                      if (!re || re.test(t)) run({ [c.key]: t });
                    }}
                  />
                </Field>
              );
            }
            case "select":
              return (
                <Field key={c.key} label={c.label} hint={c.hint}>
                  <Select value={String(v)} options={c.options} onChange={(s) => run({ [c.key]: s })} />
                </Field>
              );
            case "chips":
              return (
                <Field key={c.key} label={c.label} hint={c.hint}>
                  <Chips value={v as string | number} options={c.options} columns={c.columns} onChange={(s) => run({ [c.key]: s })} />
                </Field>
              );
          }
        })}

        {set.tryThis && (
          <div className="rounded-md border-l-[3px] border-coral/70 bg-coral/[0.07] px-2.5 py-2">
            <p className="font-label-caps text-[12px] uppercase tracking-wider text-coral">Try this</p>
            <p className="mt-1 font-body-sm text-[13px] leading-snug text-on-surface-variant/85">{set.tryThis}</p>
          </div>
        )}

        <button
          onClick={() => run({})}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-primary py-2.5 font-sans text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface active:scale-[0.98]"
        >
          <Icon name="play_circle" className="text-[18px]" /> Re-run
        </button>
      </div>
    </aside>
  );
}
