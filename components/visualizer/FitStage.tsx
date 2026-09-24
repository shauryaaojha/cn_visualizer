"use client";

// Fit-to-screen stage for visualizer canvases. Measures the available area and
// the natural (unscaled) size of its content, then CSS-scales the content down
// so the WHOLE visualization is always on screen — add a fifth panel and the
// animation shrinks to fit instead of overflowing into scrollbars. Never scales
// above STUDY_MAX_SCALE (RECORD_MAX_SCALE while recording).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRecordStore } from "@/lib/recordStore";

/** How far the artwork may grow once record mode strips the chrome away. */
const RECORD_MAX_SCALE = 2;
/**
 * How far it may grow on a normal screen. This used to be 1, which left a
 * 1440px monitor showing a postage-stamp diagram inside a sea of empty board
 * while the sidebar and chips competed for attention. The animation is the
 * lesson — it should be the biggest thing on the page.
 */
const STUDY_MAX_SCALE = 1.6;
/**
 * On a phone, fitting a 900px diagram into 375px would shrink the text to
 * a third of its size. Below this width the stage stops shrinking at
 * PHONE_MIN_SCALE and lets you pan instead.
 */
const PHONE_WIDTH = 640;
const PHONE_MIN_SCALE = 0.62;

interface FitStageProps {
  children: ReactNode;
  /** Breathing room (px) kept around the content. */
  padding?: number;
  /**
   * Cap on the scale factor. 1 by default — never blow the artwork up on a
   * normal screen. Record mode raises it so the animation grows to fill the
   * video frame once the surrounding chrome is gone, which also thickens every
   * chalk border inside the canvas for free, since a CSS transform scales
   * stroke widths along with everything else.
   */
  maxScale?: number;
  className?: string;
}

export function FitStage({ children, padding = 20, maxScale, className }: FitStageProps) {
  const recording = useRecordStore((s) => s.on);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  // Canvases never pass this — they just inherit the right behaviour.
  const cap = maxScale ?? (recording ? RECORD_MAX_SCALE : STUDY_MAX_SCALE);

  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      // offsetWidth/Height ignore the CSS transform — always the natural size.
      const cw = inner.offsetWidth;
      const ch = inner.offsetHeight;
      if (!cw || !ch) return;
      let s = Math.min(cap, (outer.clientWidth - padding) / cw, (outer.clientHeight - padding) / ch);
      if (!recording && outer.clientWidth < PHONE_WIDTH) s = Math.max(s, PHONE_MIN_SCALE);
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
      setNatural((n) => (n.w === cw && n.h === ch ? n : { w: cw, h: ch }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [padding, cap, recording]);

  return (
    <div ref={outerRef} className={`scroll-thin flex h-full w-full overflow-auto overscroll-contain ${className ?? ""}`}>
      {/* The sizer takes the scaled size, so a stage larger than the screen
          scrolls (phones) and a smaller one is centred by margin:auto. */}
      <div className="m-auto shrink-0" style={{ width: natural.w * scale || undefined, height: natural.h * scale || undefined }}>
        <div
          ref={innerRef}
          className="w-max origin-top-left transition-transform duration-300 ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
