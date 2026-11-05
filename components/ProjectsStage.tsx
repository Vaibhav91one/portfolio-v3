"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { projects } from "@/data/projects";
import { CAROUSEL_AT, HERO_POSE, POSES, cardSize, carouselPos, ramp } from "./stack";

export type StageApi = {
  /** Draw the scene for scroll progress P (0..1). Pure function of P, so any frame can be redrawn. */
  render: (P: number) => void;
  setVisible: (v: boolean) => void;
};

const N = projects.length;
const PILE = POSES.length + 1; // 4 trail cards + the hero card
const DIST = 1000; // camera distance; the z=0 plane maps 1:1 to CSS px
const BEND_R = 1600; // cylinder radius in px: smaller = stronger curve
const GAP = 0.12; // gap between panels, share of panel width
const PANEL_ASPECT = 2.39; // cinematic anamorphic; recordings are centre-cropped to it (cover fit)

// phases of scroll progress
const FAN_AT = 0.04;
const FAN_LEN = 0.26;
const SLIDE_AT = 0.14;
const SLIDE_LEN = 0.2;
const BEND_AT = 0.22;
const BEND_LEN = 0.18;

const VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uBend;
  uniform float uR;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    wp.z -= uBend * (wp.x * wp.x) / (2.0 * uR); // outer edges recede, so they shrink: a cylinder seen from inside
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform vec2 uFrontUv;
  uniform vec2 uBackUv;
  uniform float uSlide;
  void main() {
    // photo and video are one vertical strip behind a fixed window: sliding it up pushes the photo out of the frame
    // while the video enters right behind it, so there is never a gap. Both samples are taken outside the branch so
    // the mip derivatives stay continuous across the seam.
    float u = vUv.y - uSlide;
    vec4 a = texture2D(uFront, (vec2(vUv.x, u) - 0.5) * uFrontUv + 0.5);
    vec4 b = texture2D(uBack, (vec2(vUv.x, u + 1.0) - 0.5) * uBackUv + 0.5);
    vec4 c = u >= 0.0 ? a : b;
    gl_FragColor = vec4(c.rgb, 1.0); // raw sRGB in, raw sRGB out: same as <img>/<video>, and no double encode on video
  }
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** object-fit: cover as a uv scale around the centre */
const coverUv = (texAspect: number, planeAspect: number, out: THREE.Vector2) =>
  planeAspect > texAspect ? out.set(1, texAspect / planeAspect) : out.set(planeAspect / texAspect, 1);

type Panel = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  frontAspect: number;
  backAspect: number;
  video?: HTMLVideoElement;
  videoTex?: THREE.VideoTexture;
  posterTex: THREE.Texture;
  wantPlay: boolean;
};

/**
 * One WebGL canvas: 7 planes. The first 5 start exactly on the hero's photo pile, fan out into a row while flipping
 * (photo front, project video back) and then bend onto a cylinder. A scroll-driven carousel then moves the row.
 */
export default function ProjectsStage({ stack, onReady }: { stack: string[]; onReady: (api: StageApi) => void }) {
  const host = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = host.current!;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
    camera.position.z = DIST;
    const scene = new THREE.Scene();
    const raycaster = new THREE.Raycaster();
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.PlaneGeometry(1, 1, 64, 1);
    const ease = ramp;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let lastP = 0;
    let panels: Panel[] = [];

    const layout = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.fov = (2 * Math.atan(H / 2 / DIST) * 180) / Math.PI;
      camera.updateProjectionMatrix();
    };

    // a missing image must not take the whole stage down: fall back to a dark 1x1 card
    const blank = () => {
      const t = new THREE.DataTexture(new Uint8Array([20, 20, 20, 255]), 1, 1);
      t.needsUpdate = true;
      return t;
    };
    const load = async (src: string) => {
      const t = await loader.loadAsync(src).catch(blank);
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    };

    const ensureVideo = (p: Panel, k: number) => {
      if (p.video) return;
      const v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = projects[k].video;
      v.addEventListener("playing", () => {
        if (disposed || p.videoTex) return;
        p.videoTex = new THREE.VideoTexture(v);
        p.backAspect = v.videoWidth / v.videoHeight || 1;
        p.mesh.material.uniforms.uBack.value = p.videoTex; // poster until the first real frame
      });
      p.video = v;
    };

    const render = (P: number) => {
      if (disposed || !panels.length) return;
      lastP = P;
      const pw = Math.min(W * (W < H ? 0.86 : 0.62), H * 0.5 * PANEL_ASPECT);
      const ph = pw / PANEL_ASPECT;
      const step = pw * (1 + GAP);
      const card = cardSize(W, H);
      const bend = ease(clamp01((P - BEND_AT) / BEND_LEN));
      const pos = carouselPos(P, N);
      const centre = Math.round(pos);

      panels.forEach((p, k) => {
        const m = p.mesh;
        const t = ease(clamp01((P - FAN_AT - k * 0.012) / FAN_LEN));
        const f = k < PILE ? ease(clamp01((P - SLIDE_AT - k * 0.012) / SLIDE_LEN)) : 1; // late panels arrive already showing video

        // where this panel starts: its slot in the hero pile, or off to the right for the two extra panels
        const j = PILE - 1 - k; // pile index: hero (top) = 4 -> panel 0
        const pose = k >= PILE ? null : j === PILE - 1 ? HERO_POSE : POSES[j];
        const x0 = pose ? (pose.x * W) / 100 : W * 0.9 + step;
        const y0 = pose ? -(pose.y * H) / 100 : 0;
        const rot0 = pose ? -THREE.MathUtils.degToRad(pose.rot) : 0;
        const w0 = pose ? card.w : pw;
        const h0 = pose ? card.h : ph;
        const z0 = pose ? j * 3 : 0;

        const w = lerp(w0, pw, t);
        const h = lerp(h0, ph, t);
        m.position.set(lerp(x0, (k - pos) * step, t), lerp(y0, 0, t), lerp(z0, 0, t));
        m.rotation.set(0, 0, lerp(rot0, 0, t));
        m.scale.set(w, h, 1);

        const u = m.material.uniforms;
        u.uBend.value = bend;
        u.uSlide.value = f;
        coverUv(p.frontAspect, w / h, u.uFrontUv.value);
        coverUv(p.backAspect, w / h, u.uBackUv.value);

        // only the panels at the centre play; seven 60fps decodes at once would stutter
        const near = f > 0.02 && Math.abs(k - centre) <= 1;
        if (near) ensureVideo(p, k);
        if (p.video) {
          if (near && p.video.paused) void p.video.play().catch(() => {});
          else if (!near && !p.video.paused) p.video.pause();
        }
      });

      canvas.style.pointerEvents = P > CAROUSEL_AT ? "auto" : "none";
      renderer.render(scene, camera);
    };

    // open the project under the pointer, but not after a drag
    let down: { x: number; y: number } | null = null;
    const pick = (e: PointerEvent) => {
      raycaster.setFromCamera(new THREE.Vector2((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1), camera);
      const hit = raycaster.intersectObjects(panels.map((p) => p.mesh))[0];
      return hit ? (hit.object.userData.k as number) : -1;
    };
    const onDown = (e: PointerEvent) => void (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || lastP <= CAROUSEL_AT) return;
      const k = pick(e);
      if (k >= 0) window.open(projects[k].link, "_blank", "noopener");
    };
    const onMove = (e: PointerEvent) => void (canvas.style.cursor = lastP > CAROUSEL_AT && pick(e) >= 0 ? "pointer" : "default");
    const onLost = (e: Event) => e.preventDefault(); // allow the browser to restore the context
    const onRestored = () => render(lastP);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    const onResize = () => {
      layout();
      render(lastP);
    };
    window.addEventListener("resize", onResize);

    layout();
    (async () => {
      const fronts = [...stack, "/hero.jpg"]; // bottom to top of the pile
      const [frontTex, posterTex] = await Promise.all([
        Promise.all(fronts.map(load)),
        Promise.all(projects.map((p) => load(p.poster))),
      ]);
      if (disposed) return;
      panels = projects.map((_, k) => {
        const front = k < PILE ? frontTex[PILE - 1 - k] : posterTex[k];
        const poster = posterTex[k];
        const aspect = (t: THREE.Texture) => {
          const im = t.image as HTMLImageElement;
          return im.width / im.height;
        };
        const material = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            uFront: { value: front },
            uBack: { value: poster },
            uFrontUv: { value: new THREE.Vector2(1, 1) },
            uBackUv: { value: new THREE.Vector2(1, 1) },
            uBend: { value: 0 },
            uSlide: { value: 0 },
            uR: { value: BEND_R },
          },
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.k = k;
        scene.add(mesh);
        return { mesh, frontAspect: aspect(front), backAspect: aspect(poster), posterTex: poster, wantPlay: false };
      });
      render(0);
      onReady({
        render,
        setVisible: (v) => void (canvas.style.visibility = v ? "visible" : "hidden"),
      });
    })();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      panels.forEach((p) => {
        p.video?.pause();
        p.video?.removeAttribute("src");
        p.video?.load();
        p.videoTex?.dispose();
        p.posterTex.dispose();
        (p.mesh.material.uniforms.uFront.value as THREE.Texture).dispose();
        p.mesh.material.dispose();
      });
      geometry.dispose();
      renderer.dispose(); // no forceContextLoss: StrictMode remounts onto the same canvas and would get a dead context
    };
    // stack and onReady are stable for the lifetime of the stage (it mounts once the preloader hands over)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={host} aria-hidden className="absolute inset-0 z-[15] h-full w-full" style={{ visibility: "hidden" }} />;
}
