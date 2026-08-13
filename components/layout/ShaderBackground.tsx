"use client";

// Animated WebGL orb field behind every screen at low opacity. Same shader the
// DSA visualizer used, retuned from ember/coral to the Signal & Wire accents:
// cyan (data), violet (control plane), mint (delivered). Degrades to a flat
// background if WebGL is unavailable.

import { useEffect, useRef } from "react";

const VERT = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

void main() {
  vec2 uv = v_texCoord;
  vec2 mouse = u_mouse / u_resolution;

  vec3 color1 = vec3(0.000, 0.055, 0.071);
  vec3 color2 = vec3(0.020, 0.090, 0.110);
  vec3 color3 = vec3(0.055, 0.020, 0.100);

  vec3 bg = mix(color1, color2, uv.y);
  bg = mix(bg, color3, uv.x * (1.0 - uv.y));

  // cyan — data
  vec2 pos1 = vec2(0.2, 0.8) + vec2(cos(u_time * 0.2), sin(u_time * 0.3)) * 0.05;
  pos1 += (mouse - 0.5) * 0.05;
  float glow1 = smoothstep(0.5, 0.0, length(uv - pos1));
  bg += vec3(0.133, 0.827, 0.933) * glow1 * 0.15;

  // violet — control plane
  vec2 pos2 = vec2(0.8, 0.2) + vec2(sin(u_time * 0.25), cos(u_time * 0.15)) * 0.07;
  pos2 += (mouse - 0.5) * 0.03;
  float glow2 = smoothstep(0.4, 0.0, length(uv - pos2));
  bg += vec3(0.655, 0.545, 0.980) * glow2 * 0.12;

  // mint — delivered
  vec2 pos3 = vec2(0.7, 0.5) + vec2(cos(u_time * 0.4), sin(u_time * 0.2)) * 0.04;
  pos3 += (mouse - 0.5) * 0.02;
  float glow3 = smoothstep(0.3, 0.0, length(uv - pos3));
  bg += vec3(0.204, 0.788, 0.541) * glow3 * 0.08;

  float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  bg += (n - 0.5) * 0.02;

  gl_FragColor = vec4(bg, 1.0);
}`;

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    syncSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(canvas);

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    function onMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        mouse.y = (1 - (e.clientY - rect.top) / rect.height) * canvas.height;
      }
    }
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    function render(t: number) {
      if (!ro) syncSize();
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) gl!.uniform1f(uTime, t * 0.001);
      if (uRes) gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      if (uMouse) gl!.uniform2f(uMouse, mouse.x, mouse.y);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      ro?.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-40">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
