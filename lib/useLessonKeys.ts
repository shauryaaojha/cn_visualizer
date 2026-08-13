"use client";

// Keyboard control for the whole lesson.
//
// The point is that a presenter never has to find a button mid-sentence: she
// talks, taps the space bar or an arrow, and keeps talking. Bindings are
// ignored while a sidebar input has focus, so typing a message or an IP does
// not scrub the animation.

import { useEffect } from "react";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";
import { useRecordStore } from "@/lib/recordStore";

export const LESSON_KEYS: { keys: string; does: string }[] = [
  { keys: "Space", does: "play / pause" },
  { keys: "← →", does: "step back / forward" },
  { keys: "Home End", does: "first / last step" },
  { keys: "R", does: "reset to the start" },
  { keys: "N", does: "captions on / off" },
  { keys: "G", does: "16:9 framing guide" },
  { keys: "P", does: "record mode on / off" },
  { keys: "F", does: "fullscreen" },
];

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useLessonKeys(s: PlayerSnapshot) {
  const record = useRecordStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          s.togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          s.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          s.stepBack();
          break;
        case "Home":
          e.preventDefault();
          s.toStart();
          break;
        case "End":
          e.preventDefault();
          s.toEnd();
          break;
        default:
          switch (e.key.toLowerCase()) {
            case "r":
              s.toStart();
              break;
            case "n":
              record.toggleCaptions();
              break;
            case "g":
              record.toggleGuide();
              break;
            case "p":
              record.toggle();
              break;
            case "f":
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen().catch(() => {});
              break;
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, record]);
}
