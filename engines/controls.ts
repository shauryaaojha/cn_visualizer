// ---------------------------------------------------------------------------
// controls — the Setup drawer described as data.
//
// The newer engines (ladder, bit, frame, mac, journey) each export a
// `controlsFor(op)` that returns one of these. ParamSidebar renders it, so an
// engine adds an input by adding a line here rather than writing a sidebar.
// ---------------------------------------------------------------------------

interface Base {
  /** The params key this control writes. */
  key: string;
  label: string;
  hint?: string;
}

export type Control =
  | (Base & { type: "number"; min: number; max: number; step?: number; suffix?: string })
  | (Base & { type: "text"; maxLength?: number; placeholder?: string; /** Regex the value must match. */ pattern?: string })
  | (Base & { type: "select"; options: { value: string; label: string }[] })
  | (Base & { type: "chips"; options: { value: string | number; label: string }[]; columns?: number });

export interface ControlSet {
  title: string;
  icon: string;
  controls: Control[];
  /** "Try this" suggestion shown under the inputs. */
  tryThis?: string;
}
