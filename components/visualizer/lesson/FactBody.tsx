// Renders a FactSpec as an Inspector card body — the same layout the Layer
// canvas uses (lead sentence, real values, chips, "Remember" line), so every
// canvas's clickable parts read the same way.

import type { FactSpec } from "@/engines/lessonKit";
import type { Selection } from "@/lib/lessonUiStore";

export function FactBody({ spec, color }: { spec: FactSpec; color?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-on-surface">{spec.lead}</p>
      {spec.rows && spec.rows.length > 0 && (
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {spec.rows.map(([k, v]) => (
              <tr key={k} className="border-b border-outline-variant/50 last:border-0">
                <td className="py-1.5 pr-2 text-on-surface-variant">{k}</td>
                <td className="py-1.5 text-right font-mono text-on-surface">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {spec.chips?.map((c) => (
        <div key={c.label} className="flex flex-col gap-1">
          <span className="font-label-caps text-[11px] uppercase tracking-[0.08em] text-on-surface-variant/80">
            {c.label}
          </span>
          <div className="flex flex-wrap gap-1">
            {c.items.map((it) => (
              <span
                key={it}
                className="rounded border px-1.5 py-0.5 font-mono text-[12px] text-on-surface"
                style={{ borderColor: color ? `${color}88` : "var(--line)" }}
              >
                {it}
              </span>
            ))}
          </div>
        </div>
      ))}
      {spec.more && <p>{spec.more}</p>}
      {spec.remember && (
        <p className="rounded-md bg-surface-container-high px-3 py-2 text-[13px] text-on-surface">
          <span className="font-semibold text-note">Remember · </span>
          {spec.remember}
        </p>
      )}
    </div>
  );
}

/** A Selection whose body is a FactSpec. */
export function factSelection(key: string, kind: string, title: string, color: string | undefined, spec: FactSpec): Selection {
  return { key, kind, title, color, body: <FactBody spec={spec} color={color} /> };
}
