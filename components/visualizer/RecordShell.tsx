"use client";

// The presenter layout, for screen-recording a lesson.
//
// Everything that helps you study gets in the way of a video: the sidebar, the
// breadcrumb, the step list, the stat badges. All of it goes, the animation
// grows to fill the frame (FitStage lifts its scale cap in record mode, which
// thickens every chalk stroke inside the canvas as a side effect — useful,
// because thin dashed lines are the first thing a video codec smears), and
// what's left is a title, the animation, a caption and controls that fade out
// when the presenter stops touching the mouse.
//
// Nothing here autoplays. She steps as she talks.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";
import { useRecordStore } from "@/lib/recordStore";

/** Controls hide this long after the last mouse movement. */
const IDLE_MS = 2400;

function useIdle(ms: number) {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), ms);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ms]);

  return idle;
}

export function RecordShell({
  title,
  canvas,
  use,
}: {
  title: string;
  canvas: ReactNode;
  use: () => PlayerSnapshot;
}) {
  const s = use();
  const { captions, guide, toggle, toggleCaptions } = useRecordStore();
  const idle = useIdle(IDLE_MS);
  const steps = s.program?.steps ?? [];
  const current = steps[s.stepIndex];

  // Nothing autoplays here. Entering record mode, or landing on a topic while
  // already in it, leaves the animation parked on frame 1 until she presses
  // play — otherwise the first sentence of narration races the animation.
  const { pause, toStart, program } = s;
  useEffect(() => {
    pause();
    toStart();
  }, [program, pause, toStart]);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      {/* Title, small and out of the way — it gives the frame context when a
          viewer scrubs into the middle of the video. */}
      <div className="shrink-0 px-10 pt-6">
        <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>
        <div className="chalk-underline mt-1" />
      </div>

      {/* The animation gets everything that's left. */}
      <div className="relative min-h-0 flex-1">{canvas}</div>

      {/* Caption — fixed height, so the frame never jumps between steps. */}
      {captions && (
        <div className="mx-10 mb-4 flex h-[132px] shrink-0 items-center gap-4 rounded-lg border-[2.5px] border-dashed border-note/60 bg-note/[0.08] px-6 backdrop-blur-sm">
          <span className="shrink-0 text-[30px] leading-none">👨‍🏫</span>
          <p className="scroll-thin max-h-[112px] overflow-y-auto font-body-lg text-[21px] leading-[1.45] text-on-surface">
            {current?.description ?? "Press Play to begin."}
          </p>
        </div>
      )}

      {/* Controls — visible on movement, gone while she talks. */}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center pb-5 transition-opacity duration-500 ${
          idle ? "opacity-0" : "opacity-100"
        }`}
        style={captions ? { bottom: 148 } : undefined}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border-[2px] border-dashed border-outline-variant bg-surface-container/90 px-3 py-2 backdrop-blur-md">
          <RBtn icon="skip_previous" label="First" onClick={s.toStart} />
          <RBtn icon="fast_rewind" label="Back" onClick={s.stepBack} />
          <button
            onClick={s.togglePlay}
            className="flex items-center gap-1.5 rounded-full border-[2px] border-primary px-5 py-1.5 font-hand text-[17px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface"
          >
            <Icon name={s.isPlaying ? "pause" : "play_arrow"} className="text-[22px]" />
            {s.isPlaying ? "Pause" : "Play"}
          </button>
          <RBtn icon="fast_forward" label="Forward" onClick={s.stepForward} />
          <RBtn icon="skip_next" label="Last" onClick={s.toEnd} />

          <span className="mx-2 w-16 text-center font-mono text-[14px] font-bold text-on-surface-variant">
            {s.stepIndex + 1} / {steps.length || 1}
          </span>

          <span className="mx-1 h-6 w-px bg-outline-variant" />
          <RBtn icon={captions ? "subtitles" : "subtitles_off"} label="Captions (N)" onClick={toggleCaptions} />
          <RBtn icon="close_fullscreen" label="Leave record mode (P)" onClick={toggle} />
        </div>
      </div>

      {/* 16:9 framing guide — align the capture once, then leave it on every topic. */}
      {guide && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
          <div className="aspect-video h-full max-h-full w-full max-w-full border-2 border-dashed border-coral/50">
            <span className="absolute left-2 top-2 rounded bg-coral/20 px-2 py-0.5 font-mono text-[11px] text-coral">
              16:9 guide — G to hide
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/10 hover:text-primary"
    >
      <Icon name={icon} className="text-[20px]" />
    </button>
  );
}
