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
const BASE = 46; // icon diameter
const GAP_X = 54;
const GAP_Y = 47;

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
  const updatePan = (next: Point) => { panRef.current = next; setPan(next); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    const r = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

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
    const baseY = wrapCoordinate(70 + r * GAP_Y + pan.y, gridH);
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

  return (
    <div
      ref={ref}
      className="hive-surface fixed inset-0 touch-none select-none overflow-hidden"
      onPointerDown={(e) => {
        if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
        const p = pos(e);
        cancelAnimationFrame(raf.current);
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
          updatePan(panWithFinger(drag.current.origin, drag.current.start, p));
        }
        const now = performance.now();
        const dt = Math.max(1, now - vel.current.t);
        vel.current = { x: 0.8 * ((p.x - vel.current.point.x) / dt) + 0.2 * vel.current.x, y: 0.8 * ((p.y - vel.current.point.y) / dt) + 0.2 * vel.current.y, point: p, t: now };
      }}
      onPointerUp={(e) => {
        if (!drag.current || drag.current.id !== e.pointerId) return;
        const moved = drag.current?.moved;
        if (!moved && nearest && touch && Math.hypot(nearest.x - touch.x, nearest.y - touch.y) < 50) setOpened(nearest.name ?? null);
        drag.current = null;
        setTouch(null);
        if (!moved || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const fresh = performance.now() - vel.current.t < 100;
        let vx = fresh ? vel.current.x : 0, vy = fresh ? vel.current.y : 0;
        let previous = performance.now();
        const step = (now: number) => {
          const dt = Math.min(32, now - previous);
          previous = now;
          updatePan({ x: panRef.current.x + vx * dt, y: panRef.current.y + vy * dt });
          const decay = Math.pow(0.94, dt / 16);
          vx *= decay; vy *= decay;
          if (Math.hypot(vx, vy) < 0.012) return;
          raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
      }}
      onPointerCancel={() => { drag.current = null; setTouch(null); cancelAnimationFrame(raf.current); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setTouch(null); }}
      onWheel={(e) => { cancelAnimationFrame(raf.current); updatePan({ x: panRef.current.x - e.deltaX, y: panRef.current.y - e.deltaY }); }}
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
  );
}
