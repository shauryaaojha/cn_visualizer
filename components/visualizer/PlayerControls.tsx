"use client";

// Footer transport: Prev / Play / Next / Reset, plus the program's stat badges.
//
// Buttons follow vis.html's chalk convention — outlined and transparent at
// rest, filling solid on hover, as though the chalk got pressed harder. The
// progress rule runs the full width along the top edge of the bar, the way a
// teacher underlines how far through the lesson you are.

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
    <footer className="fixed bottom-0 z-50 h-14 w-full border-t-[1.5px] border-dashed border-outline-variant bg-surface-container-lowest/95 backdrop-blur-sm">
      {/* How far through the lesson you are. */}
      <div className="absolute left-0 top-0 h-[3px] w-full bg-white/[0.06]">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%`, boxShadow: "0 0 8px rgba(240,210,100,0.5)" }}
        />
      </div>

      <div className="flex h-full items-center gap-3 px-3 sm:px-gutter">
        {/* Left: stat badges */}
        <div className="flex flex-1 items-center justify-start overflow-hidden">
          <div className="scroll-thin hidden items-center gap-2 overflow-x-auto sm:flex">
            {program ? (
              program.stats.map((st) => (
                <div
                  key={st.label}
                  title={st.label}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md border-[1.5px] border-dashed px-2.5 py-1 font-code-snippet text-code-snippet ${
                    TONE[st.tone ?? "signal"]
                  }`}
                >
                  <span className="opacity-60">{st.label}</span>
                  <span className="font-bold">{st.value}</span>
                </div>
              ))
            ) : (
              <span className="font-hand text-[13px] text-on-surface-variant/60">Run an operation</span>
            )}
          </div>
        </div>

        {/* Centre: transport + speed */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Btn label="Prev" icon="fast_rewind" onClick={s.stepBack} disabled={!hasProgram} />
          <button
            onClick={s.togglePlay}
            disabled={!hasProgram}
            title={s.isPlaying ? "Pause" : "Play"}
            className="flex items-center gap-1 rounded-md border-[1.5px] border-primary px-3 py-1 font-hand text-[13px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface disabled:cursor-not-allowed disabled:opacity-35 sm:px-4"
          >
            <Icon name={s.isPlaying ? "pause" : "play_arrow"} className="text-[17px]" />
            <span className="hidden sm:inline">{s.isPlaying ? "Pause" : "Play"}</span>
          </button>
          <Btn label="Next" icon="fast_forward" onClick={s.stepForward} disabled={!hasProgram} />
          <Btn label="Reset" icon="refresh" onClick={s.toStart} disabled={!hasProgram} />

          <div className="ml-1 flex items-center gap-2">
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
              className="speed-slider h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/10 accent-primary sm:w-24"
            />
            <span className="w-7 shrink-0 font-mono text-[11px] font-bold text-on-surface-variant">{s.speed}x</span>
          </div>
        </div>

        {/* Right: step count */}
        <div className="flex flex-1 items-center justify-end">
          {hasProgram && (
            <span className="whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
              Step {s.stepIndex + 1} / {total}
            </span>
          )}
        </div>
      </div>
    </footer>
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
