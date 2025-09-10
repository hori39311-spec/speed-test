import React, { useRef, useEffect, useState } from "react";

/* ==== Background (warp effect) ==== */
function BackgroundCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => ({ angle: Math.random() * Math.PI * 2, hue: Math.random() * 360, r: Math.random() * 18, speed: 0.5 + Math.random() * 1.4 });
    let stars = Array.from({ length: 240 }, spawn);

    const draw = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const c = { x: canvas.width / dpr / 2, y: canvas.height / dpr / 2 };
      for (let s of stars) {
        const vx = Math.cos(s.angle);
        const vy = Math.sin(s.angle);
        const x0 = c.x + vx * s.r;
        const y0 = c.y + vy * s.r;
        s.speed *= 1.01;
        s.r += s.speed;
        const x1 = c.x + vx * s.r;
        const y1 = c.y + vy * s.r;
        ctx.strokeStyle = `hsla(${s.hue},95%,60%,0.9)`;
        ctx.lineWidth = Math.min(3, 0.2 + s.r / 150);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        if (s.r > Math.hypot(c.x, c.y)) Object.assign(s, spawn());
      }
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

/* ==== VPN & SPEED PAGE ==== */
export default function VPNandSpeedPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-black text-gray-100 relative overflow-hidden">
      <BackgroundCanvas />

      {/* Top bar with back + menu */}
      <div className="absolute top-4 left-4 z-20">
        <a href="/" className="px-3 py-1.5 rounded-xl bg-gray-800 text-sm hover:bg-gray-700">← Back</a>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
          aria-label="Menu"
        >
          ☰
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-black/80 border border-gray-700 rounded-xl shadow-lg p-2 text-sm">
            <a href="/faq" className="block px-3 py-2 hover:bg-gray-800 rounded">FAQ</a>
            <a href="/blog" className="block px-3 py-2 hover:bg-gray-800 rounded">Blog</a>
            <a href="/vpn-and-speed" className="block px-3 py-2 hover:bg-gray-800 rounded">VPN & Speed</a>
            <a href="/internet-providers" className="block px-3 py-2 hover:bg-gray-800 rounded">Internet Providers</a>
            <a href="/glossary" className="block px-3 py-2 hover:bg-gray-800 rounded">Glossary</a>
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-16">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">VPN and Speed</h1>
          <p className="mt-2 text-gray-400 text-lg">Understanding how VPN affects internet speed</p>
        </header>

        <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-2 text-white">Do VPNs slow down your internet?</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            A VPN adds encryption and routing, which can reduce speed slightly. Top providers use fast protocols (WireGuard, NordLynx), smart routing, and nearby servers to keep the impact minimal.
          </p>
          <ul className="mt-4 list-disc pl-6 text-gray-300 text-lg space-y-1">
            <li>Pick a server geographically close to you.</li>
            <li>Use modern protocols (WireGuard / NordLynx).</li>
            <li>Test at different times of day to avoid congestion.</li>
          </ul>
        </article>

        <div className="grid gap-4 mt-6">
          <article className="rounded-2xl border border-gray-800 bg-black/50 p-5">
            <h3 className="text-lg font-semibold text-white">When can VPN be faster?</h3>
            <p className="text-gray-300 mt-1">Rarely, but it can bypass ISP throttling or choose a better route to a destination.</p>
          </article>
          <article className="rounded-2xl border border-gray-800 bg-black/50 p-5">
            <h3 className="text-lg font-semibold text-white">How to benchmark fairly</h3>
            <p className="text-gray-300 mt-1">Run multiple tests with and without VPN, same server region, similar time window.</p>
          </article>
        </div>

        <footer className="mt-12 text-center text-xs text-gray-500">Made with ❤️ — no trackers, no cookies.</footer>
      </div>
    </div>
  );
}
