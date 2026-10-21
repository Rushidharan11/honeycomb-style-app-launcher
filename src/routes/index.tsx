import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
  const [scroll, setScroll] = useState(0);
  const [opened, setOpened] = useState<string | null>(null);
  const drag = useRef<{ y: number; s: number; moved: boolean } | null>(null);
  const vel = useRef({ v: 0, y: 0, t: 0 });
  const raf = useRef(0);
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
  const contentH = rows * GAP_Y + 120;
  const maxScroll = Math.max(0, contentH - size.h);

  const pos = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };

  const icons = APPS.map(([name, emoji], i) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    const x = offX + c * GAP_X + (r % 2 ? GAP_X / 2 : 0);
    const y = 70 + r * GAP_Y - scroll;
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
    return { name, emoji, i, x: x + dx, y: y + dy, scale };
  });

  const nearest = touch
    ? icons.reduce((a, b) => (Math.hypot(b.x - touch.x, b.y - touch.y) < Math.hypot(a.x - touch.x, a.y - touch.y) ? b : a))
    : null;

  return (
    <div
      ref={ref}
      className="hive-surface fixed inset-0 touch-none select-none overflow-hidden"
      onPointerDown={(e) => {
        const p = pos(e);
        cancelAnimationFrame(raf.current);
        setTouch(p);
        drag.current = { y: p.y, s: scroll, moved: false };
        vel.current = { v: 0, y: p.y, t: performance.now() };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const p = pos(e);
        if (e.pointerType === "mouse" && !drag.current) { setTouch(p); return; }
        if (!drag.current) return;
        setTouch(p);
        const dy = p.y - drag.current.y;
        if (Math.abs(dy) > 8) drag.current.moved = true;
        if (drag.current.moved) {
          // content moves with the finger: scroll opposite to finger delta, with rubber-band edges
          let s = drag.current.s - dy;
          if (s < 0) s = s * 0.35;
          else if (s > maxScroll) s = maxScroll + (s - maxScroll) * 0.35;
          setScroll(s);
        }
        const now = performance.now();
        const dt = Math.max(1, now - vel.current.t);
        vel.current = { v: 0.8 * ((vel.current.y - p.y) / dt) + 0.2 * vel.current.v, y: p.y, t: now };
      }}
      onPointerUp={() => {
        const moved = drag.current?.moved;
        if (!moved && nearest && touch && Math.hypot(nearest.x - touch.x, nearest.y - touch.y) < 50) setOpened(nearest.name ?? null);
        drag.current = null;
        setTouch(null);
        // momentum + spring back
        let v = moved ? vel.current.v * 16 : 0;
        const step = () => {
          let done = false;
          setScroll((s) => {
            let n = s + v;
            v *= 0.94;
            if (n < 0) { n = n * 0.8; v *= 0.5; }
            else if (n > maxScroll) { n = maxScroll + (n - maxScroll) * 0.8; v *= 0.5; }
            const out = n < -0.5 || n > maxScroll + 0.5;
            if (Math.abs(v) < 0.2 && !out) { done = true; return Math.min(maxScroll, Math.max(0, n)); }
            return n;
          });
          if (!done) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
      }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setTouch(null); }}
      onWheel={(e) => setScroll((s) => Math.min(maxScroll, Math.max(0, s + e.deltaY)))}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-4 text-center text-xs tracking-[0.3em] text-muted-foreground">
        HIVE
      </div>
      {icons.map((a) => {
        const hot = nearest?.i === a.i;
        return (
          <div
            key={a.i}
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
