// The board behind everything.
//
// Signal & Wire used an animated WebGL orb field. A chalkboard wants the
// opposite: something completely still, because a real board does not glow or
// drift. So this is static CSS and one SVG turbulence filter — eraser smudges
// where someone wiped it down, chalk dust caught in the grain, and a vignette
// so the corners fall away. No canvas, no requestAnimationFrame, no WebGL
// fallback to worry about.

export function BoardBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 h-full w-full overflow-hidden">
      {/* Eraser smudges — arcs of chalk that never quite came off. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(52% 34% at 22% 26%, rgba(243,241,231,0.055), transparent 68%),
            radial-gradient(44% 30% at 78% 68%, rgba(243,241,231,0.045), transparent 70%),
            radial-gradient(38% 26% at 62% 14%, rgba(240,210,100,0.035), transparent 72%),
            radial-gradient(46% 32% at 12% 82%, rgba(143,203,224,0.03), transparent 72%)
          `,
        }}
      />

      {/* Chalk dust in the grain of the slate. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" aria-hidden>
        <filter id="chalk-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#chalk-grain)" />
      </svg>

      {/* Vignette — the frame of the board. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 40%, transparent 55%, rgba(0,0,0,0.34) 100%)",
        }}
      />
    </div>
  );
}
