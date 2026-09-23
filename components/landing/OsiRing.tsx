"use client";

// Adapted from Animmaster: 3D Animation/7 (scroll-scrubbed 3D carousel ring)
//
// The seven OSI layers stand on a ring. Scrolling turns it, bringing each
// layer to the front in order — Application first, Physical last — which is
// the direction data travels on the way down the stack when it is
// encapsulated. The caption names whichever layer is facing you.
//
// What changed from the demo:
// - GSAP ScrollTrigger + ScrollSmoother → framer-motion useScroll against the
//   landing page's own scroll container. No scroll hijacking, no smoother,
//   no locked wheel — the page scrolls like a page.
// - Image cards → layer cards (number, name, PDU, example protocols).
// - The demo dimmed every card with a CSS filter each frame; here each card's
//   opacity is derived from how squarely it faces the viewer, which is both
//   cheaper and actually meaningful.
// - The fly-through "preview grid" click sequence is dropped; the ring links
//   straight to the OSI visualizer that teaches this properly.
// - prefers-reduced-motion: no spinning geometry, just the seven layers as a
//   flat stack.

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

const LAYERS = [
  { n: 7, name: "Application", pdu: "Data", carries: "carries data", eg: "HTTP · DNS · SMTP" },
  { n: 6, name: "Presentation", pdu: "Data", carries: "carries data", eg: "TLS · JPEG · UTF-8" },
  { n: 5, name: "Session", pdu: "Data", carries: "carries data", eg: "RPC · NetBIOS" },
  { n: 4, name: "Transport", pdu: "Segment", carries: "makes a segment", eg: "TCP · UDP" },
  { n: 3, name: "Network", pdu: "Packet", carries: "makes a packet", eg: "IP · ICMP" },
  { n: 2, name: "Data Link", pdu: "Frame", carries: "makes a frame", eg: "Ethernet · PPP" },
  { n: 1, name: "Physical", pdu: "Bits", carries: "sends bits", eg: "Copper · Fibre · Radio" },
];
const STEP = 360 / LAYERS.length;
const RADIUS = 340;
const OSI_HREF = "/topics/fundamentals/layering/osi-model";

interface OsiRingProps {
  /** The landing page scrolls inside its own container, not the window. */
  scroller: RefObject<HTMLElement | null>;
}

export function OsiRing({ scroller }: OsiRingProps) {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    container: scroller,
    target: section,
    offset: ["start start", "end end"],
  });
  // Face layer 7 at the top of the section and layer 1 at the bottom.
  const rotateY = useTransform(scrollYProgress, [0, 1], [0, -STEP * (LAYERS.length - 1)]);
  const tilt = useTransform(scrollYProgress, [0, 1], [3, -3]);
  const [front, setFront] = useState(0);
  useMotionValueEvent(rotateY, "change", (v) => {
    const i = Math.min(LAYERS.length - 1, Math.max(0, Math.round(-v / STEP)));
    setFront((f) => (f === i ? f : i));
  });

  if (reduce) {
    return (
      <section className="mx-auto w-full max-w-6xl px-margin py-24">
        <Heading />
        <ol className="mt-10 grid gap-2">
          {LAYERS.map((l) => (
            <li key={l.n} className="flex items-baseline gap-4 rounded-md bg-surface-container-low px-5 py-3">
              <span className="font-mono text-[14px] text-primary">L{l.n}</span>
              <span className="font-hand text-[22px] font-bold text-on-surface">{l.name}</span>
              <span className="ml-auto font-mono text-[13px] text-on-surface-variant">{l.pdu}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const current = LAYERS[front];

  return (
    <section ref={section} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-[calc(100dvh-64px)] flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-margin pt-16">
          <Heading />
        </div>

        <div className="relative flex flex-1 origin-center scale-[0.62] items-center justify-center [perspective:1400px] md:scale-100">
          <motion.div
            className="relative h-[280px] w-[210px] [transform-style:preserve-3d]"
            style={{ rotateY, rotateX: tilt, rotateZ: tilt }}
          >
            {LAYERS.map((l, i) => (
              <Card key={l.n} layer={l} index={i} rotateY={rotateY} />
            ))}
          </motion.div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-margin pb-12">
          <p aria-live="polite" className="font-hand text-[clamp(28px,3.4vw,44px)] font-bold leading-none">
            <span className="mr-3 font-mono text-[0.45em] text-primary">L{current.n}</span>
            {current.name}
            <span className="ml-3 font-sans text-[0.42em] font-semibold text-on-surface-variant">
              {current.carries}
            </span>
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
    </section>
  );
}

function Heading() {
  return (
    <div className="max-w-xl">
      <p className="mb-2 font-label-caps text-label-caps uppercase text-primary">Unit 1 · Layering</p>
      <h2 className="font-headline-lg text-headline-lg text-on-surface">Scroll down the stack.</h2>
      <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
        Seven layers, in the order your data meets them on the way out.
      </p>
    </div>
  );
}

function Card({
  layer,
  index,
  rotateY,
}: {
  layer: (typeof LAYERS)[number];
  index: number;
  rotateY: MotionValue<number>;
}) {
  // cos of the card's angle to the viewer: 1 facing front, -1 facing away.
  const facing = useTransform(rotateY, (r) => Math.cos(((r + index * STEP) * Math.PI) / 180));
  const opacity = useTransform(facing, [-1, 0, 1], [0.12, 0.35, 1]);
  return (
    <motion.div
      className="absolute inset-0 flex flex-col rounded-lg border border-outline-variant bg-surface-container p-5"
      style={{ transform: `rotateY(${index * STEP}deg) translateZ(${RADIUS}px)`, opacity }}
    >
      <span className="font-mono text-[44px] font-semibold leading-none text-primary">{layer.n}</span>
      <span className="mt-auto font-hand text-[28px] font-bold leading-tight text-on-surface">{layer.name}</span>
      <span className="mt-2 font-mono text-[13px] text-note">{layer.pdu}</span>
      <span className="mt-1 font-sans text-[13px] text-on-surface-variant">{layer.eg}</span>
    </motion.div>
  );
}
