"use client";

// Footer transport: play / step / scrub, plus the program's stat badges.
//
// Written once for every engine. Each store's state structurally satisfies
// PlayerSnapshot, so `use={useNetStore}` / `use={useLayerStore}` both work
// without a per-engine wrapper component.

import { Icon } from "@/components/ui/Icon";
import { SPEED_STOPS, type PlayerSnapshot } from "@/lib/createPlayerStore";

const TONE: Record<string, string> = {
  signal: "border-primary/40 bg-primary/10 text-primary",
  amber: "border-amber/40 bg-amber/10 text-amber",
  mint: "border-mint/40 bg-mint/10 text-mint",
  coral: "border-coral/40 bg-coral/10 text-coral",
};

export function PlayerControls({ use }: { use: () => PlayerSnapshot }) {
  const s = use();
  const program = s.program;
  const total = program?.steps.length ?? 0;
  const hasProgram = !!program;
  const speedIdx = Math.max(0, SPEED_STOPS.indexOf(s.speed));

  return (
    <footer className="fixed bottom-0 z-50 flex h-14 w-full items-center gap-3 border-t border-outline-variant bg-surface-container-lowest px-3 sm:px-gutter">
      {/* Left: stat badges (flex-1 spacer keeps the centre cluster centred) */}
      <div className="flex flex-1 items-center justify-start overflow-hidden">
        <div className="hidden items-center gap-2 overflow-x-auto sm:flex">
          {program ? (
            program.stats.map((st) => (
              <div
                key={st.label}
                title={st.label}
                className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1 font-code-snippet text-code-snippet ${
                  TONE[st.tone ?? "signal"]
                }`}
              >
                <span className="opacity-60">{st.label}</span>
                <span className="font-bold">{st.value}</span>
              </div>
            ))
          ) : (
            <span className="font-label-caps text-label-caps text-on-surface-variant/50">Run an operation</span>
          )}
        </div>
      </div>

      {/* Centre: transport + speed */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1 border border-outline-variant bg-surface-container p-1">
          <Btn title="Reset to start" icon="skip_previous" onClick={s.toStart} disabled={!hasProgram} />
          <Btn title="Step back" icon="fast_rewind" onClick={s.stepBack} disabled={!hasProgram} />
          <button
            onClick={s.togglePlay}
            disabled={!hasProgram}
            title={s.isPlaying ? "Pause" : "Play"}
            className="flex items-center gap-1 bg-primary-container px-3 py-1 font-label-caps text-label-caps text-surface transition-colors hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
          >
            <Icon name={s.isPlaying ? "pause" : "play_arrow"} className="text-[18px]" />
            <span className="hidden sm:inline">{s.isPlaying ? "PAUSE" : "PLAY"}</span>
          </button>
          <Btn title="Step forward" icon="fast_forward" onClick={s.stepForward} disabled={!hasProgram} />
          <Btn title="Jump to end" icon="skip_next" onClick={s.toEnd} disabled={!hasProgram} />
        </div>

        <div className="flex items-center gap-2">
          <Icon name="speed" className="text-[16px] text-on-surface-variant" />
          <input
            type="range"
            min={0}
            max={SPEED_STOPS.length - 1}
            step={1}
            value={speedIdx}
            onChange={(e) => s.setSpeed(SPEED_STOPS[parseInt(e.target.value, 10)])}
            title={`Speed: ${s.speed}x`}
            aria-label="Playback speed"
            className="speed-slider h-1 w-16 cursor-pointer appearance-none rounded-full bg-surface-container-high accent-primary sm:w-24"
          />
          <span className="w-7 shrink-0 font-mono text-[12px] font-bold text-on-surface-variant">{s.speed}x</span>
        </div>
      </div>

      {/* Right: progress */}
      <div className="flex flex-1 items-center justify-end">
        <div className="hidden items-center gap-3 sm:flex sm:min-w-[120px]">
          {hasProgram && (
            <>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((s.stepIndex + 1) / total) * 100}%` }}
                />
              </div>
              <span className="whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                {s.stepIndex + 1}/{total}
              </span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}

function Btn({
  title,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1 text-secondary-fixed-dim transition-colors hover:bg-surface-variant hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name={icon} />
    </button>
  );
}
