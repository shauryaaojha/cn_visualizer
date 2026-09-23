"use client";

import { useEffect, useRef } from "react";

interface PseudocodeBlockProps {
  pseudocode: string[];
  /** 1-based line numbers to light up. */
  activeLines: number[];
  fontSize?: number;
  autoScroll?: boolean;
  className?: string;
}

export function PseudocodeBlock({
  pseudocode,
  activeLines,
  fontSize = 12,
  autoScroll = true,
  className = "",
}: PseudocodeBlockProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);
  const firstLit = activeLines.length > 0 ? Math.min(...activeLines) : -1;

  useEffect(() => {
    if (!autoScroll) return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [firstLit, autoScroll]);

  const gutterCh = String(pseudocode.length).length + 1;

  return (
    <pre
      className={`scroll-thin overflow-x-auto rounded-md border border-outline-variant bg-black/20 p-2 font-code-snippet leading-relaxed ${className}`}
      style={{ fontSize }}
    >
      {pseudocode.map((line, i) => {
        const lit = activeLines.includes(i + 1);
        return (
          <div
            key={i}
            ref={i + 1 === firstLit ? activeRef : undefined}
            // A lit line is chalk pressed harder, not a highlighter swipe.
            className={`-mx-2 px-2 ${lit ? "bg-primary/[0.18] font-bold text-primary" : "text-on-surface-variant/75"}`}
          >
            <span
              className="mr-2 inline-block select-none text-right text-on-surface-variant/30"
              style={{ width: `${gutterCh}ch` }}
            >
              {i + 1}
            </span>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
