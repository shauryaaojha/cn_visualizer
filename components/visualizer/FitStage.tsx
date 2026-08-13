"use client";

// Fit-to-screen stage for visualizer canvases. Measures the available area and
// the natural (unscaled) size of its content, then CSS-scales the content down
// so the WHOLE visualization is always on screen — add a fifth panel and the
// animation shrinks to fit instead of overflowing into scrollbars. Never scales
// above 1.

import { useEffect, useRef, useState, type ReactNode } from "react";

interface FitStageProps {
  children: ReactNode;
  /** Breathing room (px) kept around the content. */
  padding?: number;
  className?: string;
}

export function FitStage({ children, padding = 20, className }: FitStageProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      // offsetWidth/Height ignore the CSS transform — always the natural size.
      const cw = inner.offsetWidth;
      const ch = inner.offsetHeight;
      if (!cw || !ch) return;
      const s = Math.min(1, (outer.clientWidth - padding) / cw, (outer.clientHeight - padding) / ch);
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [padding]);

  return (
    <div
      ref={outerRef}
      className={`flex h-full w-full items-center justify-center overflow-hidden ${className ?? ""}`}
    >
      <div
        ref={innerRef}
        className="shrink-0 transition-transform duration-300 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
