"use client";

// Adapted from Animmaster: Background Animations/9 ("faulty terminal" shader)
//
// A dot-matrix of chalk dust drifting across the board behind the landing
// hero. The field is domain-warped noise sampled on a grid of cells, each cell
// drawn as a 5×5 dot glyph — so it reads as a grid of nodes lighting up, which
// is quietly on-topic for a networks course. The pointer sends a ripple
// through it; on load the cells fill in at random.
//
// What changed from the demo, and why:
// - CRT effects stripped: flicker, glitch displacement, barrel curvature,
//   scanline bars, chromatic aberration, dither. A chalkboard is not a
//   monitor, and every one of them cost fragment work.
// - The 9-tap neighbourhood blur is gone. The demo ran the whole fbm pattern
//   nine extra times per pixel to fake a glow; one sample with a gain term
//   looks the same at this brightness and is ~9× cheaper.
// - DPR capped at 1 and frames capped at 30fps — the field moves slowly, so
//   nobody can see the difference, but a laptop fan can.
// - Stops rendering when scrolled off-screen or the tab is hidden, draws one
//   still frame under prefers-reduced-motion, and bows out silently if WebGL
//   is unavailable (the static BoardBackground is still there underneath).
// - Pointer is tracked on window, since the hero copy sits on top of the
//   canvas and would otherwise swallow every mousemove.

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;

uniform float iTime;
uniform vec2  uAspect;
uniform vec2  uGrid;
uniform vec2  uMouse;
uniform float uMouseOn;
uniform float uLoad;
uniform vec3  uBase;
uniform vec3  uTint;
uniform float uGain;

float t;

float noise(vec2 p) {
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(t * 0.090909))) + 0.2;
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float fbm(vec2 p) {
  p *= 1.1;
  float f = 0.0, amp = 0.5;
  f += amp * noise(p); p = rot(t * 0.02) * p * 2.0; amp *= 0.454545;
  f += amp * noise(p); p = rot(t * 0.02) * p * 2.0; amp *= 0.454545;
  f += amp * noise(p);
  return f;
}

float pattern(vec2 p) {
  vec2 q = vec2(fbm(p + 1.0), fbm(rot(0.1 * t) * p + 1.0));
  vec2 r = vec2(fbm(rot(0.1) * q), fbm(q));
  return fbm(p + r);
}

void main() {
  t = iTime * 0.333333;
  vec2 p = vUv * uAspect;
  vec2 cell = floor(p * uGrid) / uGrid;

  float intensity = pattern(cell * 0.1) * 1.3 - 0.03;

  if (uMouseOn > 0.5) {
    float d = distance(cell, uMouse * uAspect);
    float pull = exp(-d * 8.0) * 5.0;
    intensity += pull + sin(d * 20.0 - iTime * 5.0) * 0.1 * pull;
  }

  float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  intensity *= smoothstep(0.0, 1.0, clamp((uLoad - rnd * 0.8) / 0.2, 0.0, 1.0));

  // 5×5 dot glyph inside each cell, brighter toward its lower-right like
  // chalk catching the light.
  vec2 g = fract(p * uGrid) * 1.2;
  float inside = step(g.x, 1.0) * step(g.y, 1.0);
  vec2 d5 = vec2(g.x * 5.0, (1.0 - g.y) * 5.0);
  vec2 ij = floor(d5) - 2.0;
  float on = step(0.32, intensity - dot(ij, ij) * 0.0625);
  float glyph = on * (0.2 + fract(d5.y) * 0.8) * (0.75 + fract(d5.x) * 0.25) * inside;

  gl_FragColor = vec4(uBase + uTint * glyph * uGain, 1.0);
}
`;

const hex = (h: string) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

interface ChalkFieldProps {
  className?: string;
  /** Dot colour. Chalk white by default. */
  tint?: string;
  /** Board colour the dots are drawn onto. */
  base?: string;
  /** How bright the dust is. Keep it low — this sits behind copy. */
  gain?: number;
}

export function ChalkField({ className, tint = "#F3F1E7", base = "#24503F", gain = 0.14 }: ChalkFieldProps) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block";
    el.appendChild(canvas);

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      canvas.remove();
      return;
    }

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    if (!vs || !fs) {
      canvas.remove();
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove();
      return;
    }
    gl.useProgram(prog);

    // One oversized triangle covers the viewport — no index buffer needed.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uTime = u("iTime");
    const uAspect = u("uAspect");
    const uGrid = u("uGrid");
    const uMouse = u("uMouse");
    const uMouseOn = u("uMouseOn");
    const uLoad = u("uLoad");
    gl.uniform3fv(u("uBase"), hex(base));
    gl.uniform3fv(u("uTint"), hex(tint));
    gl.uniform1f(u("uGain"), gain);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    gl.uniform1f(uMouseOn, !reduce && finePointer ? 1 : 0);

    const resize = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      // Keep cells square whatever the hero's shape: ~30px cells.
      const aspect = w / h;
      gl.uniform2f(uAspect, aspect, 1);
      gl.uniform2f(uGrid, h / 30, h / 30);
      if (reduce) draw(performance.now());
    };

    const mouse = { x: 0.5, y: 0.5 };
    const smooth = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
    };

    const offset = Math.random() * 100;
    let loadStart = 0;
    const draw = (now: number) => {
      if (!loadStart) loadStart = now;
      smooth.x += (mouse.x - smooth.x) * 0.08;
      smooth.y += (mouse.y - smooth.y) * 0.08;
      gl.uniform1f(uTime, (now * 1e-3 + offset) * 0.45);
      gl.uniform1f(uLoad, reduce ? 1 : Math.min((now - loadStart) / 2000, 1));
      gl.uniform2f(uMouse, smooth.x, smooth.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    let last = 0;
    let visible = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / 30) return;
      last = now;
      draw(now);
    };
    const start = () => {
      if (reduce || raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(el);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });

    resize();
    if (reduce) draw(performance.now());
    else start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [tint, base, gain]);

  return <div ref={host} aria-hidden className={className} />;
}
