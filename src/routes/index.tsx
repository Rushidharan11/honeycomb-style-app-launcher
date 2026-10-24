import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { panWithFinger, wrapCoordinate, type Point } from "@/lib/honeycomb-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hive — Honeycomb App Launcher" },
      { name: "description", content: "A one-handed honeycomb launcher with fluid touch magnification." },
      { property: "og:title", content: "Hive — Honeycomb App Launcher" },
      { property: "og:description", content: "A one-handed honeycomb launcher with fluid touch magnification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Launcher,
});

const APPS = [
  ["Phone", "📞"], ["Messages", "💬"], ["Mail", "✉️"], ["Safari", "🧭"], ["Music", "🎵"],
  ["Photos", "🌸"], ["Camera", "📷"], ["Maps", "🗺️"], ["Weather", "⛅"], ["Clock", "⏰"],
  ["Calendar", "📅"], ["Notes", "📝"], ["Wallet", "💳"], ["Health", "❤️"], ["Fitness", "🏃"],
  ["Podcasts", "🎙️"], ["Books", "📚"], ["News", "📰"], ["Stocks", "📈"], ["Home", "🏠"],
  ["Settings", "⚙️"], ["Files", "📁"], ["Translate", "🌐"], ["Store", "🛍️"], ["TV", "📺"],
  ["Games", "🎮"], ["Chess", "♟️"], ["Calculator", "🧮"], ["Compass", "🧭"], ["Voice", "🎤"],
  ["Shortcuts", "⚡"], ["Reminders", "✅"], ["Contacts", "👤"], ["Find", "📍"], ["Pizza", "🍕"],
  ["Coffee", "☕"], ["Travel", "✈️"], ["Bike", "🚲"], ["Plants", "🌿"], ["Pets", "🐾"],
  ["Art", "🎨"], ["Film", "🎬"], ["Space", "🚀"], ["Mind", "🧘"], ["Sleep", "🌙"],
  ["Recipes", "🍳"], ["Bank", "🏦"], ["Chat", "🗨️"], ["Docs", "📄"], ["Cloud", "☁️"],
  ["Radio", "📻"], ["Gift", "🎁"], ["Code", "💻"], ["Lock", "🔒"], ["Star", "⭐"],
  ["Sun", "☀️"], ["Fire", "🔥"], ["Wave", "🌊"], ["Leaf", "🍃"], ["Gem", "💎"],
  ["Key", "🔑"], ["Bell", "🔔"], ["Flag", "🚩"], ["Puzzle", "🧩"], ["Dice", "🎲"],
  ["Tea", "🍵"], ["Apple", "🍎"], ["Bolt", "🔋"], ["Globe", "🌍"], ["Mic", "🎧"],
];
const HUES = [25, 55, 145, 200, 240, 330, 10, 170, 85, 280];
const COLS = 7;

function Launcher() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 800 });
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [opened, setOpened] = useState<string | null>(null);
  const drag = useRef<{ start: Point; origin: Point; moved: boolean; id: number } | null>(null);
  const vel = useRef({ x: 0, y: 0, point: { x: 0, y: 0 }, t: 0 });
  const raf = useRef(0);
  const panRef = useRef(pan);
  const target = useRef<Point>(pan);
  const updatePan = (next: Point) => { panRef.current = next; setPan(next); };

  // One continuous rAF loop: the rendered pan eases toward the target every
  // frame, so drags, flicks and wheel scrolls all glide without jumps.
  const ensureLoop = () => {
    if (raf.current) return;
    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min(48, now - previous);
      previous = now;
      const cur = panRef.current;
      const tgt = target.current;
      // exponential catch-up: smooth, frame-rate independent, never overshoots
      const k = 1 - Math.exp(-dt / 70);
      const next = { x: cur.x + (tgt.x - cur.x) * k, y: cur.y + (tgt.y - cur.y) * k };
      updatePan(next);
      if (Math.hypot(tgt.x - next.x, tgt.y - next.y) > 0.05 || drag.current) {
        raf.current = requestAnimationFrame(step);
      } else {
        updatePan(tgt);
        raf.current = 0;
      }
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Responsive scale: adapts honeycomb density to the phone's width.
  const scale = Math.min(1.15, Math.max(0.78, size.w / 390));
  const BASE = 46 * scale; // icon diameter
  const GAP_X = 54 * scale;
  const GAP_Y = 47 * scale;
  const TOP = 70 * scale;
  const rows = Math.ceil(APPS.length / COLS);
  const gridW = COLS * GAP_X;
  const offX = (size.w - gridW) / 2 + GAP_X / 2 - GAP_X / 4;
  const gridH = rows * GAP_Y;

  const pos = (e: React.PointerEvent) => {
    const b = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };

  const icons = APPS.flatMap(([name, emoji], i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    const baseX = wrapCoordinate(offX + c * GAP_X + (r % 2 ? GAP_X / 2 : 0) + pan.x, gridW);
    const baseY = wrapCoordinate(TOP + r * GAP_Y + pan.y, gridH);
    const copies = [];
    for (let tileY = -1; tileY <= Math.ceil(size.h / gridH); tileY++) {
      for (let tileX = -1; tileX <= Math.ceil(size.w / gridW); tileX++) {
    const x = baseX + tileX * gridW;
    const y = baseY + tileY * gridH;
    if (x < -100 || x > size.w + 100 || y < -100 || y > size.h + 100) continue;
    let scale = 0.85, dx = 0, dy = 0;
    if (touch) {
      const vx = x - touch.x, vy = y - touch.y;
      const d = Math.hypot(vx, vy);
      const f = Math.exp(-(d * d) / (2 * 75 * 75));
      scale = 0.85 + f * 1.15;
      const push = f * 34;
      if (d > 1) { dx = (vx / d) * push; dy = (vy / d) * push; }
    } else {
      // gentle edge falloff like watchOS
      const ey = Math.min(y, size.h - y) / 80;
      scale = 0.6 + Math.min(1, Math.max(0, ey)) * 0.4;
    }
    copies.push({ name, emoji, i, key: `${i}:${tileX}:${tileY}`, x: x + dx, y: y + dy, scale });
      }
    }
    return copies;
  });

  const nearest = touch
    ? icons.reduce((a, b) => (Math.hypot(b.x - touch.x, b.y - touch.y) < Math.hypot(a.x - touch.x, a.y - touch.y) ? b : a))
    : null;

  // Imperative hit-test for tap-to-open: pointerup can fire before React
  // re-renders the pointerdown state, so compute from refs instead of state.
  const nearestAt = (panV: Point, p: Point) => {
    let best: { name: string; d: number } | null = null;
    for (let i = 0; i < APPS.length; i++) {
      const r = Math.floor(i / COLS), c = i % COLS;
      const bx = wrapCoordinate(offX + c * GAP_X + (r % 2 ? GAP_X / 2 : 0) + panV.x, gridW);
      const by = wrapCoordinate(TOP + r * GAP_Y + panV.y, gridH);
      for (let ty = -1; ty <= Math.ceil(size.h / gridH); ty++) {
        for (let tx = -1; tx <= Math.ceil(size.w / gridW); tx++) {
          const d = Math.hypot(bx + tx * gridW - p.x, by + ty * gridH - p.y);
          if (d < 50 && (!best || d < best.d)) best = { name: APPS[i][0] as string, d };
        }
      }
    }
    return best;
  };

  return (
    <div className="hive-stage">
    <div
      ref={ref}
      className="hive-surface hive-frame touch-none select-none overflow-hidden"
      onPointerDown={(e) => {
        if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
        const p = pos(e);
        setTouch(p);
        drag.current = { start: p, origin: panRef.current, moved: false, id: e.pointerId };
        vel.current = { x: 0, y: 0, point: p, t: performance.now() };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const p = pos(e);
        if (e.pointerType === "mouse" && !drag.current) { setTouch(p); return; }
        if (!drag.current || drag.current.id !== e.pointerId) return;
        setTouch(p);
        if (Math.hypot(p.x - drag.current.start.x, p.y - drag.current.start.y) > 8) drag.current.moved = true;
        if (drag.current.moved) {
          target.current = panWithFinger(drag.current.origin, drag.current.start, p);
          ensureLoop();
        }
        const now = performance.now();
        const dt = Math.max(1, now - vel.current.t);
        vel.current = { x: 0.8 * ((p.x - vel.current.point.x) / dt) + 0.2 * vel.current.x, y: 0.8 * ((p.y - vel.current.point.y) / dt) + 0.2 * vel.current.y, point: p, t: now };
      }}
      onPointerUp={(e) => {
        if (!drag.current || drag.current.id !== e.pointerId) return;
        const moved = drag.current?.moved;
        if (!moved) {
          const hit = nearestAt(panRef.current, pos(e));
          if (hit) setOpened(hit.name);
        }
        drag.current = null;
        setTouch(null);
        if (!moved || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const fresh = performance.now() - vel.current.t < 100;
        let vx = fresh ? vel.current.x : 0, vy = fresh ? vel.current.y : 0;
        if (Math.hypot(vx, vy) < 0.05) return;
        // momentum: keep pushing the target forward with decay while easing
        // the rendered pan toward it, so the glide continues the drag smoothly.
        let previous = performance.now();
        const glide = (now: number) => {
          if (drag.current) { raf.current = 0; return; } // a new touch takes over
          const dt = Math.min(48, now - previous);
          previous = now;
          target.current = { x: target.current.x + vx * dt, y: target.current.y + vy * dt };
          const cur = panRef.current;
          const tgt = target.current;
          const k = 1 - Math.exp(-dt / 70);
          updatePan({ x: cur.x + (tgt.x - cur.x) * k, y: cur.y + (tgt.y - cur.y) * k });
          const decay = Math.pow(0.94, dt / 16);
          vx *= decay; vy *= decay;
          if (Math.hypot(vx, vy) < 0.012 && Math.hypot(tgt.x - cur.x, tgt.y - cur.y) < 0.05) {
            updatePan(tgt);
            raf.current = 0;
            return;
          }
          raf.current = requestAnimationFrame(glide);
        };
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(glide);
      }}
      onPointerCancel={() => { drag.current = null; setTouch(null); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setTouch(null); }}
      onWheel={(e) => {
        target.current = { x: target.current.x - e.deltaX, y: target.current.y - e.deltaY };
        ensureLoop();
      }}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-4 text-center text-xs tracking-[0.3em] text-muted-foreground">
        HIVE
      </div>
      {icons.map((a) => {
        const hot = nearest?.key === a.key;
        return (
          <div
            key={a.key}
            data-app={a.name}
            className="hive-icon absolute flex items-center justify-center rounded-full"
            style={{
              width: BASE, height: BASE,
              willChange: "transform",
              transform: `translate(${a.x - BASE / 2}px, ${a.y - BASE / 2}px) scale(${a.scale})`,
              zIndex: Math.round(a.scale * 10),
              ["--h" as string]: HUES[a.i % HUES.length],
              outline: hot ? "2px solid var(--foreground)" : "none",
              outlineOffset: 2,
            }}
          >
            <span className="text-xl">{a.emoji}</span>
          </div>
        );
      })}
      {nearest && (
        <div className="hive-label pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 rounded-full px-4 py-1 text-sm font-medium">
          {nearest.name}
        </div>
      )}
      {opened && (
        <div
          className="hive-open absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
          onPointerDown={(e) => { e.stopPropagation(); setOpened(null); }}
        >
          <div className="text-7xl">{APPS.find((a) => a[0] === opened)?.[1]}</div>
          <div className="text-2xl font-semibold">{opened}</div>
          <div className="text-sm text-muted-foreground">Tap to return</div>
        </div>
      )}
    </div>
    </div>
  );
}
