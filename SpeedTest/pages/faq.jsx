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

/* ==== FAQ PAGE ==== */
export default function FAQPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Internet Speed Test — FAQ</h1>
          <p className="mt-2 text-gray-400 text-lg">Answers to common questions</p>
        </header>

        <div className="grid gap-6">
          <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-white">How does this speed test work?</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              We measure download and upload throughput in your browser using parallel requests, and estimate latency & jitter with repeated probes.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-white">What is a good internet speed?</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              For HD streaming and calls, ~25 Mbps down and 5 Mbps up are usually enough. For gaming or 4K streaming, more bandwidth helps.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-white">Why do results vary?</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Wi‑Fi quality, network congestion, and distance to servers can affect results. Try a wired connection for consistency.
            </p>
          </article>
        </div>

        <footer className="mt-12 text-center text-xs text-gray-500">
          Made with ❤️ — no trackers, no cookies.
        </footer>
      </div>
    </div>
  );
}
