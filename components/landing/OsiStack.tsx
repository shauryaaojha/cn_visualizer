"use client";

// Adapted from Animmaster: Scroll Animation/18 (3D stack motion)
//
// The OSI model drawn the way every textbook draws it — seven slabs in an
// isometric stack — except you build it. Scrolling drops each layer onto the
// pile, spinning down into place, Physical first and Application last. The
// list beside it is the readable half: it names the layer that just landed
// and what it calls its data.
//
// What changed from the demo:
// - The demo flies a tunnel of card copies through the camera. Here the same
//   ingredients — an isometric rotate3d frame, cards travelling along z, a
//   rotationZ unwind — land the cards on a pile instead, so the motion ends in
//   a diagram rather than an effect.
// - GSAP ScrollTrigger + Lenis → framer-motion useScroll on the landing page's
//   own scroll container. No smooth-scroll hijacking.
// - Text never sits on a card seen edge-on or from behind (the previous ring
//   showed mirrored, skewed labels). The slabs carry short labels on their
//   top face; everything you need to read is in the flat list.
// - prefers-reduced-motion: the finished stack, no drop-in.

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { Icon } from "@/components/ui/Icon";
import { PALETTE } from "@/lib/palette";

// Bottom of the stack first — the order they land in.
const LAYERS = [
  { n: 1, name: "Physical", pdu: "Bits", eg: "Copper · Fibre · Radio", color: PALETTE.fail },
  { n: 2, name: "Data Link", pdu: "Frame", eg: "Ethernet · PPP", color: PALETTE.ok },
  { n: 3, name: "Network", pdu: "Packet", eg: "IP · ICMP", color: PALETTE.control },
  { n: 4, name: "Transport", pdu: "Segment", eg: "TCP · UDP", color: PALETTE.note },
  { n: 5, name: "Session", pdu: "Data", eg: "RPC · NetBIOS", color: PALETTE.data },
  { n: 6, name: "Presentation", pdu: "Data", eg: "TLS · JPEG · UTF-8", color: PALETTE.data },
  { n: 7, name: "Application", pdu: "Data", eg: "HTTP · DNS · SMTP", color: PALETTE.data },
];
const GAP = 46;
const WINDOW = 0.13;
const startOf = (i: number) => 0.05 + i * 0.115;
const OSI_HREF = "/topics/fundamentals/layering/osi-model";

export function OsiStack({ scroller }: { scroller: RefObject<HTMLElement | null> }) {
  const reduce = useReducedMotion() ?? false;
  const section = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    container: scroller,
    target: section,
    offset: ["start start", "end end"],
  });

  // How many layers have landed, for the list and the caption.
  const [landed, setLanded] = useState(reduce ? LAYERS.length : 0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const n = LAYERS.filter((_, i) => p >= startOf(i) + WINDOW * 0.7).length;
    setLanded((v) => (v === n ? v : n));
  });
  const shown = reduce ? LAYERS.length : landed;
  const top = shown > 0 ? LAYERS[shown - 1] : null;

  return (
    <section ref={section} className={reduce ? "" : "relative h-[180vh]"}>
      <div
        className={`${reduce ? "" : "sticky top-0 h-[calc(100dvh-64px)]"} mx-auto grid w-full max-w-6xl items-center gap-8 px-margin py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}
      >
        {/* the readable half */}
        <div className="order-2 md:order-1">
          <p className="mb-2 font-label-caps text-label-caps uppercase text-primary">Unit 1 · Layering</p>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Build the stack.</h2>
          <p className="mt-2 max-w-md font-body-md text-body-md text-on-surface-variant">
            Seven layers, laid down from the wire up. Each one wraps what the layer above hands it.
          </p>

          <ol className="mt-6 flex flex-col-reverse gap-1">
            {LAYERS.map((l, i) => {
              const on = i < shown;
              const latest = i === shown - 1;
              return (
                <li
                  key={l.n}
                  className={`flex items-baseline gap-3 rounded-md px-3 py-1.5 transition-[opacity,background-color] duration-300 ${
                    latest ? "bg-surface-container-high" : ""
                  } ${on ? "opacity-100" : "opacity-35"}`}
                >
                  <span className="w-7 font-mono text-[13px]" style={{ color: l.color }}>
                    L{l.n}
                  </span>
                  <span className="font-hand text-[20px] font-bold text-on-surface">{l.name}</span>
                  <span className="ml-auto font-mono text-[13px] text-on-surface-variant">{l.pdu}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p aria-live="polite" className="font-sans text-[15px] text-on-surface-variant">
              {top ? (
                <>
                  <span className="font-semibold text-on-surface">L{top.n} {top.name}</span> · {top.eg}
                </>
              ) : (
                "Scroll to lay the first layer."
              )}
            </p>
            <Link
              href={OSI_HREF}
              className="group flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 font-sans text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface"
            >
              Open the OSI visualizer
              <Icon name="east" className="text-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* the 3D half */}
        <div
          aria-hidden
          className="order-1 flex h-[300px] items-center justify-center [perspective:1600px] md:order-2 md:h-full"
        >
          {/* Scale and the isometric tilt live on separate elements: Tailwind's
              scale utilities write the whole transform and would erase it. */}
          <div className="scale-[0.72] [transform-style:preserve-3d] md:scale-100">
            <div
              className="relative h-[210px] w-[340px] [transform-style:preserve-3d]"
              style={{ transform: "rotateX(58deg) rotateZ(-42deg)" }}
            >
              {LAYERS.map((l, i) => (
                <Slab key={l.n} layer={l} index={i} progress={scrollYProgress} still={reduce} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slab({
  layer,
  index,
  progress,
  still,
}: {
  layer: (typeof LAYERS)[number];
  index: number;
  progress: MotionValue<number>;
  still: boolean;
}) {
  const a = startOf(index);
  const b = a + WINDOW;
  const rest = index * GAP;
  // Drop in from above the pile, unwinding the demo's rotationZ as it falls.
  const z = useTransform(progress, [a, b], [rest + 700, rest], { clamp: true });
  const rotateZ = useTransform(progress, [a, b], [-130, 0], { clamp: true });
  // Function form on purpose: framer-motion hardware-accelerates a plain
  // opacity range via native ScrollTimeline, which mis-maps this nested
  // scroll container and left the top slabs stuck near-transparent.
  const opacity = useTransform(progress, (p) => Math.min(Math.max((p - a) / (WINDOW * 0.25), 0), 1));

  return (
    <motion.div
      className="absolute inset-0 flex items-end justify-between rounded-lg border-2 bg-surface-container px-4 py-3"
      style={{
        z: still ? rest : z,
        rotateZ: still ? 0 : rotateZ,
        opacity: still ? 1 : opacity,
        borderColor: layer.color,
        // A darker lip under each slab reads as thickness in isometric view.
        boxShadow: `6px 6px 0 0 ${PALETTE.boardDeep}`,
      }}
    >
      <span className="font-hand text-[26px] font-bold leading-none text-on-surface">{layer.name}</span>
      <span className="font-mono text-[28px] font-semibold leading-none" style={{ color: layer.color }}>
        {layer.n}
      </span>
    </motion.div>
  );
}
