"use client";

// Transport: Prev / Play / Next / Reset, plus the program's stat badges.
//
// This sits directly under the canvas now rather than pinned to the bottom of
// the viewport. The eye travels straight down — animation, then the controls
// that drive it, then the explanation — instead of triangulating across three
// corners of the screen.
//
// Buttons follow vis.html's chalk convention: outlined and transparent at rest,
// filling solid on hover, as though the chalk got pressed harder.

import { Icon } from "@/components/ui/Icon";
import { SPEED_STOPS, type PlayerSnapshot } from "@/lib/createPlayerStore";

const TONE: Record<string, string> = {
  signal: "border-primary/60 bg-primary/10 text-primary",
  amber: "border-amber/60 bg-amber/10 text-amber",
  mint: "border-mint/60 bg-mint/10 text-mint",
  coral: "border-coral/60 bg-coral/10 text-coral",
};

export function PlayerControls({ use }: { use: () => PlayerSnapshot }) {
  const s = use();
  const program = s.program;
  const total = program?.steps.length ?? 0;
  const hasProgram = !!program;
  const speedIdx = Math.max(0, SPEED_STOPS.indexOf(s.speed));
  const pct = hasProgram ? ((s.stepIndex + 1) / total) * 100 : 0;

  return (
    <div className="shrink-0 border-t-[1.5px] border-dashed border-outline-variant bg-surface-container-low/40">
      {/* How far through the lesson you are. */}
      <div className="h-[3px] w-full bg-white/[0.06]">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%`, boxShadow: "0 0 8px rgba(240,210,100,0.5)" }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-3 py-2 sm:px-gutter">
        {/* Transport, dead centre under the animation. */}
        <div className="flex shrink-0 items-center gap-2">
          <Btn label="Prev" icon="fast_rewind" onClick={s.stepBack} disabled={!hasProgram} />
          <button
            onClick={s.togglePlay}
            disabled={!hasProgram}
            title={s.isPlaying ? "Pause" : "Play"}
            className="flex items-center gap-1 rounded-md border-[1.5px] border-primary px-4 py-1 font-hand text-[14px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name={s.isPlaying ? "pause" : "play_arrow"} className="text-[17px]" />
            {s.isPlaying ? "Pause" : "Play"}
          </button>
          <Btn label="Next" icon="fast_forward" onClick={s.stepForward} disabled={!hasProgram} />
          <Btn label="Reset" icon="refresh" onClick={s.toStart} disabled={!hasProgram} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Icon name="speed" className="text-[15px] text-on-surface-variant" />
          <input
            type="range"
            min={0}
            max={SPEED_STOPS.length - 1}
            step={1}
            value={speedIdx}
            onChange={(e) => s.setSpeed(SPEED_STOPS[parseInt(e.target.value, 10)])}
            title={`Speed: ${s.speed}x`}
            aria-label="Playback speed"
            className="speed-slider h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
          />
          <span className="w-6 shrink-0 font-mono text-[11px] font-bold text-on-surface-variant">{s.speed}x</span>
          {hasProgram && (
            <span className="ml-1 whitespace-nowrap font-mono text-[11px] text-on-surface-variant/70">
              {s.stepIndex + 1}/{total}
            </span>
          )}
        </div>

        {/* Stat badges — the numbers this run produced. */}
        {program && program.stats.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5">
            {program.stats.map((st) => (
              <div
                key={st.label}
                title={st.label}
                className={`flex shrink-0 items-center gap-1.5 rounded-md border-[1.5px] border-dashed px-2 py-0.5 font-code-snippet text-[11px] ${
                  TONE[st.tone ?? "signal"]
                }`}
              >
                <span className="opacity-60">{st.label}</span>
                <span className="font-bold">{st.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded-md border-[1.5px] border-on-surface/70 px-2.5 py-1 font-hand text-[13px] font-bold text-on-surface transition-colors hover:bg-on-surface hover:text-surface disabled:cursor-not-allowed disabled:opacity-35"
    >
      <Icon name={icon} className="text-[15px]" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
