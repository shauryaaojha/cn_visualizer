"use client";

// Chalk-styled form primitives for the sidebars.
//
// Text and number inputs hold a local draft and only commit on Enter or blur.
// That matters: committing on every keystroke would recompile the program and
// restart playback mid-word. Selects and chip rows commit immediately, because
// there is no half-finished state to protect.

import { useEffect, useState, type ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant/70">
        {label}
      </label>
      {children}
      {hint && <p className="font-body-sm text-[13px] leading-snug text-on-surface-variant/60">{hint}</p>}
    </div>
  );
}

const BOX =
  "w-full rounded-md border border-outline-variant bg-black/20 px-2 py-1.5 font-mono text-[13px] text-on-surface outline-none transition-colors focus:border-primary";

export function TextInput({
  value,
  onCommit,
  placeholder,
  maxLength,
  invalid,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(value);
      }}
      className={`${BOX} ${invalid ? "border-coral text-coral" : ""}`}
    />
  );
}

export function NumberInput({
  value,
  onCommit,
  min,
  max,
  step,
  suffix,
}: {
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <div className="relative">
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(String(value));
        }}
        className={`${BOX} ${suffix ? "pr-10" : ""}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[12px] text-on-surface-variant/50">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${BOX} cursor-pointer appearance-none`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface-container text-on-surface">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A row of small segmented buttons — for short, mutually exclusive choices. */
export function Chips<T extends string | number>({
  value,
  onChange,
  options,
  columns = 4,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
  columns?: number;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            title={o.title ?? o.label}
            onClick={() => onChange(o.value)}
            className={`rounded-md border px-1 py-1 font-mono text-[13px] transition-colors ${
              on
                ? "border-primary bg-primary/15 text-primary"
                : " border-outline-variant text-on-surface-variant hover:border-primary/60 hover:text-on-surface"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
