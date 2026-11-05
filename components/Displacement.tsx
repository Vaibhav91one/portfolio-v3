"use client";

import { useEffect, useRef, type RefObject } from "react";

// Adapted from Canvas UI "Displacement" (https://canvasui.dev/docs/components/displacement, David Haz).
// The original captures live HTML through the experimental html-in-canvas API (Chrome behind a flag only).
// Here the source is a 2D canvas painted by `paint`, so it runs in every WebGL2 browser.

export type DisplacementOptions = {
  /** Cells across the width (4 to 100). */
  grid?: number;
  /** Width to height ratio of each cell (0.25 to 4). */
  cellAspect?: number;
  /** Cursor influence radius as a fraction of the grid (0.02 to 1). */
  radius?: number;
  /** How hard cursor movement pushes cells (0 to 1). */
  strength?: number;
  /** Min cursor speed (CSS px/s) before cells react. */
  threshold?: number;
  /** How slowly cells return to rest, per frame (0.5 to 0.99). */
  relaxation?: number;
  /** How far displaced cells shift the content (0 to 4). */
  shift?: number;
  /** Chromatic aberration inside displaced cells (0 to 3). */
  aberration?: number;
  /** Film grain over displaced cells (0 to 1). */
  grain?: number;
  grainSize?: number;
  grainSpeed?: number;
  /** Random scramble on load that relaxes into place (0 to 3). */
  scramble?: number;
};

/** Must be synchronous (no awaits): a paint that resumes after another started would draw twice onto the same canvas. */
export type Paint = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const DEFAULTS: Required<DisplacementOptions> = {
  grid: 50,
  cellAspect: 1,
  radius: 0.1,
  strength: 0.1,
  threshold: 1000,
  relaxation: 0.9,
  shift: 1,
  aberration: 1.5,
  grain: 0.1,
  grainSize: 1,
  grainSpeed: 1,
  scramble: 1,
};

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uField;
uniform vec2 uResolution;
uniform float uShift;
uniform float uAberration;
uniform float uGrain;
uniform float uGrainPx;
uniform float uGrainTick;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main () {
  vec2 cuv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 offset = texture(uField, cuv).rg;
  vec2 push = offset * 0.02 * uShift;
  float ab = uAberration * 0.08;
  vec2 lo = vec2(0.001);
  vec2 hi = vec2(0.999);
  vec4 cr = texture(uContent, clamp(cuv - push * (1.0 + ab), lo, hi));
  vec4 cg = texture(uContent, clamp(cuv - push, lo, hi));
  vec4 cb = texture(uContent, clamp(cuv - push * (1.0 - ab), lo, hi));
  float alpha = (cr.a + cg.a + cb.a) / 3.0;
  vec3 col = vec3(cr.r * cr.a, cg.g * cg.a, cb.b * cb.a);
  col = min(col, vec3(alpha));
  float pushPx = length(push * uResolution);
  float gate = smoothstep(1.5, 18.0, pushPx);
  vec2 cell = floor(gl_FragCoord.xy / max(uGrainPx, 1.0));
  float gn = hash(cell + vec2(uGrainTick * 0.37, uGrainTick * 0.113));
  col += (gn - 0.5) * 0.3 * uGrain * gate * alpha;
  col = clamp(col, vec3(0.0), vec3(alpha));
  outColor = vec4(col, alpha);
}`;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Starts the effect on `output`; returns a cleanup fn, or null when WebGL2 is unavailable. */
function createDisplacement(
  output: HTMLCanvasElement,
  paint: Paint,
  config: Required<DisplacementOptions>,
  onReady?: () => void,
  host?: HTMLElement | null,
): (() => void) | null {
  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  const source = document.createElement("canvas");
  const sourceCtx = source.getContext("2d")!;

  const compile = (type: number, text: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Displacement shader error:", gl.getShaderInfoLog(shader));
    }
    return shader;
  };
  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const makeTexture = (filter: number) => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const contentTexture = makeTexture(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  const fieldTexture = makeTexture(gl.NEAREST);

  let cols = 0;
  let rows = 0;
  let rowScale = 1;
  let outW = 1;
  let outH = 1;
  let dpr = 1;
  let scrambled = false;
  let field = new Float32Array(0);
  let fieldDirty = false;
  let destroyed = false;

  function syncGrid() {
    const nextCols = Math.round(clamp(config.grid, 4, 100));
    const aspect = clamp(config.cellAspect, 0.25, 4);
    const nextRows = Math.max(2, Math.min(Math.round((nextCols * outH * aspect) / outW), 200));
    rowScale = (outH * nextCols) / (outW * nextRows);
    if (nextCols === cols && nextRows === rows) return;
    cols = nextCols;
    rows = nextRows;
    field = new Float32Array(cols * rows * 2);
    if (!scrambled && config.scramble > 0) {
      const amp = 40 * Math.min(config.scramble, 3);
      for (let i = 0; i < field.length; i++) field[i] = (Math.random() * 2 - 1) * amp;
    }
    scrambled = true;
    gl!.bindTexture(gl!.TEXTURE_2D, fieldTexture);
    gl!.pixelStorei(gl!.UNPACK_ALIGNMENT, 1);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RG32F, cols, rows, 0, gl!.RG, gl!.FLOAT, field);
    fieldDirty = false;
  }

  // Paint the scene into the 2D source canvas, then upload it as the content texture.
  let ready = false;
  function repaint() {
    if (destroyed) return;
    source.width = output.width; // also clears it
    source.height = output.height;
    sourceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(sourceCtx, outW, outH);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
    start(true);
    if (!ready) {
      ready = true;
      onReady?.();
    }
  }

  function syncCanvasSize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    outW = Math.max(1, output.clientWidth);
    outH = Math.max(1, output.clientHeight);
    output.width = Math.round(outW * dpr);
    output.height = Math.round(outH * dpr);
    syncGrid();
    repaint();
  }

  const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0, speed: 0, gate: 0, lastT: 0 };
  let tracking = false;

  function stepSimulation(delta: number): boolean {
    const decay = Math.pow(clamp(config.relaxation, 0.5, 0.995), delta * 60);
    let maxAbs = 0;
    for (let i = 0; i < field.length; i++) {
      const value = field[i] * decay;
      field[i] = value;
      const abs = Math.abs(value);
      if (abs > maxAbs) maxAbs = abs;
    }
    const injecting = tracking && (mouse.vX !== 0 || mouse.vY !== 0);
    if (injecting) {
      const gridX = mouse.x * cols;
      const gridY = mouse.y * rows;
      const maxDist = cols * clamp(config.radius, 0.02, 1);
      const maxSq = maxDist * maxDist;
      const gain = clamp(config.strength, 0, 1) * 100 * mouse.gate;
      for (let j = 0; j < rows; j++) {
        const dy = (gridY - j) * rowScale;
        for (let i = 0; i < cols; i++) {
          const dx = gridX - i;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxSq) {
            const power = Math.min(maxDist / Math.sqrt(distSq), 10);
            const idx = 2 * (i + cols * j);
            field[idx] += gain * mouse.vX * power;
            field[idx + 1] += gain * mouse.vY * power;
          }
        }
      }
    }
    const vDecay = Math.pow(0.9, delta * 60);
    mouse.vX *= vDecay;
    mouse.vY *= vDecay;
    if (Math.abs(mouse.vX) < 0.0001) mouse.vX = 0;
    if (Math.abs(mouse.vY) < 0.0001) mouse.vY = 0;
    fieldDirty = true;
    const alive = injecting || mouse.vX !== 0 || mouse.vY !== 0 || maxAbs > 0.03;
    if (!alive && maxAbs > 0) field.fill(0);
    return alive;
  }

  let time = 0;
  function render() {
    if (fieldDirty) {
      fieldDirty = false;
      gl!.bindTexture(gl!.TEXTURE_2D, fieldTexture);
      gl!.pixelStorei(gl!.UNPACK_ALIGNMENT, 1);
      gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, cols, rows, gl!.RG, gl!.FLOAT, field);
    }
    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, fieldTexture);
    gl!.uniform1i(uniforms.uField, 1);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    gl!.uniform1f(uniforms.uShift, clamp(config.shift, 0, 4));
    gl!.uniform1f(uniforms.uAberration, clamp(config.aberration, 0, 3));
    gl!.uniform1f(uniforms.uGrain, clamp(config.grain, 0, 1));
    gl!.uniform1f(uniforms.uGrainPx, Math.max(1, clamp(config.grainSize, 0.5, 4) * dpr * 1.5));
    gl!.uniform1f(uniforms.uGrainTick, Math.floor(time * clamp(config.grainSpeed, 0, 4) * 18));
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  let lastTime = performance.now();
  let running = false;
  let visible = true;
  let needsFrame = false;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    time += delta;
    const alive = stepSimulation(delta);
    render();
    if (!alive && !needsFrame) {
      running = false;
      return;
    }
    needsFrame = false;
    raf = requestAnimationFrame(frame);
  }

  function start(force = false) {
    if (force) needsFrame = true;
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // Pointer input is read on the parent so overlaid content still drives the effect.
  const pointerHost = host ?? output.parentElement ?? output; // the section, so text layered above still drives it
  function onPointerMove(event: PointerEvent) {
    const box = output.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const now = performance.now();
    if (!tracking) {
      tracking = true;
      mouse.prevX = x;
      mouse.prevY = y;
      mouse.speed = 0;
      mouse.gate = 0;
      mouse.lastT = now;
    }
    mouse.vX = x - mouse.prevX;
    mouse.vY = y - mouse.prevY;
    const dt = Math.max((now - mouse.lastT) / 1000, 0.001);
    mouse.lastT = now;
    const instSpeed = Math.hypot(mouse.vX * box.width, mouse.vY * box.height) / dt;
    mouse.speed += (instSpeed - mouse.speed) * Math.min(dt * 25, 1);
    const threshold = Math.max(config.threshold, 0);
    if (threshold <= 0) {
      mouse.gate = 1;
    } else {
      const step = clamp((mouse.speed - threshold) / threshold, 0, 1);
      mouse.gate = step * step * (3 - 2 * step);
    }
    mouse.prevX = x;
    mouse.prevY = y;
    mouse.x = x;
    mouse.y = y;
    start();
  }
  function onPointerLeave() {
    tracking = false;
    mouse.vX = 0;
    mouse.vY = 0;
    mouse.speed = 0;
    mouse.gate = 0;
  }
  // Scrolling moves the canvas under a still cursor; the next pointermove would read that as a huge
  // velocity and blast the whole area. Restart tracking instead.
  window.addEventListener("scroll", onPointerLeave, { passive: true });
  pointerHost.addEventListener("pointermove", onPointerMove, { passive: true });
  pointerHost.addEventListener("pointerleave", onPointerLeave, { passive: true });
  pointerHost.addEventListener("pointercancel", onPointerLeave, { passive: true });

  let resizeFrame = 0;
  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(syncCanvasSize);
  });
  resizeObserver.observe(output);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  syncCanvasSize();

  return () => {
    destroyed = true;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener("scroll", onPointerLeave);
    pointerHost.removeEventListener("pointermove", onPointerMove);
    pointerHost.removeEventListener("pointerleave", onPointerLeave);
    pointerHost.removeEventListener("pointercancel", onPointerLeave);
    gl.deleteTexture(contentTexture);
    gl.deleteTexture(fieldTexture);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteBuffer(quad);
  };
}

type Props = DisplacementOptions & {
  /** Draws the scene that gets displaced, in CSS pixels. Re-run on resize. */
  paint: Paint;
  /** Fires once the first frame is on screen, so the caller can hide its DOM fallback. */
  onReady?: () => void;
  className?: string;
  /** Element that receives the pointer events (default: the canvas's parent). */
  host?: RefObject<HTMLElement | null>;
};

/** Absolutely-positioned canvas that fills its (positioned) parent. Skipped under reduced motion. */
export default function Displacement({ paint, onReady, className, host, ...options }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ paint, onReady, options, host });

  useEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { paint, onReady, options, host } = latest.current;
    return createDisplacement(ref.current, paint, { ...DEFAULTS, ...options }, onReady, host?.current) ?? undefined;
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
