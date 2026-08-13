// ---------------------------------------------------------------------------
// Record mode — the layout for screen-recording a lesson.
//
// A study tool and a course video want opposite things. Studying wants the
// sidebar, the breadcrumb, the step list. Recording wants the animation as
// large as the frame allows and nothing else competing with the presenter's
// voice.
//
// State lives here rather than in the URL because a static export cannot read
// search params during prerender without a Suspense boundary. `?record=1` is
// still honoured — it is applied on mount, client-side — so each topic can be
// bookmarked pre-configured.
// ---------------------------------------------------------------------------

import { create } from "zustand";

interface RecordState {
  on: boolean;
  /** Caption bar under the animation. On by default; N toggles it. */
  captions: boolean;
  /** Letterbox guide so every topic is framed identically. */
  guide: boolean;
  toggle: () => void;
  setOn: (on: boolean) => void;
  toggleCaptions: () => void;
  toggleGuide: () => void;
  /** Reads ?record=1 / ?captions=0 / ?guide=1 once, on mount. */
  initFromUrl: () => void;
}

const truthy = (v: string | null) => v === "1" || v === "true";

export const useRecordStore = create<RecordState>((set) => ({
  on: false,
  captions: true,
  guide: false,
  toggle: () => set((s) => ({ on: !s.on })),
  setOn: (on) => set({ on }),
  toggleCaptions: () => set((s) => ({ captions: !s.captions })),
  toggleGuide: () => set((s) => ({ guide: !s.guide })),
  initFromUrl: () => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (!q.has("record")) return;
    set({
      on: truthy(q.get("record")),
      captions: q.has("captions") ? truthy(q.get("captions")) : true,
      guide: q.has("guide") ? truthy(q.get("guide")) : false,
    });
  },
}));
