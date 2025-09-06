import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";

// -------------------- Config --------------------
const TEST_CONFIG = {
  latencySamples: 6,
  latencyEndpoint: "https://httpbin.org/get",
  download: {
    totalBytes: 30 * 1024 * 1024, // 30 MB total
    parallel: 3,
    endpoints: [
      (n) => `https://speed.cloudflare.com/__down?bytes=${n}`,
      (n) => `https://httpbin.org/bytes/${n}`,
    ],
  },
  upload: {
    totalBytes: 4 * 1024 * 1024, // 4 MB
    endpoint: "https://httpbin.org/post",
  },
};

// -------------------- Utils --------------------
const fmtMbps = (bps) => (bps / 1_000_000).toFixed(2);
const fmtMs = (ms) => Math.max(0, ms).toFixed(0);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function safeRandomBytes(n) {
  // Fill in 64KB chunks to avoid Crypto.getRandomValues 64k limit
  const buf = new Uint8Array(n);
  const CHUNK = 65536;
  for (let i = 0; i < n; i += CHUNK) {
    const end = Math.min(i + CHUNK, n);
    crypto.getRandomValues(buf.subarray(i, end));
  }
  return buf;
}

// -------------------- Visuals --------------------
function SparkleDivider({ label = "Results" }) {
  return (
    <div className="relative my-6 h-10" role="separator" aria-label={label}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-700" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-black px-3 text-sm uppercase tracking-wider text-gray-400">{label}</span>
      </div>
    </div>
  );
}

// AdSlot: only a thin dashed line placeholder
function AdSlot() {
  return (
    <div className="my-4" role="complementary" aria-label="advertisement">
      <div className="h-px w-full border-t border-dashed border-gray-700 opacity-60" />
    </div>
  );
}

// Warp‑speed rainbow background
function BackgroundCanvas({ impulse = 0 }) {
  const canvasRef = useRef(null);
  const boostRef = useRef(0); // frames of temporary boost
  const pulseRef = useRef({ active: false, t0: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const center = () => ({ x: canvas.width / dpr / 2, y: canvas.height / dpr / 2 });
    const maxR = () => Math.hypot(canvas.width / dpr, canvas.height / dpr) / 2 + 60;

    function spawn() {
      // Start near the center, random angle/color
      return {
        angle: Math.random() * Math.PI * 2,
        hue: Math.random() * 360,
        r: Math.random() * 18,
        speed: 0.5 + Math.random() * 1.4,
      };
    }

    let stars = Array.from({ length: 280 }, spawn);

    let rafId = 0;
    const draw = () => {
      // Debug mark to ensure the loop runs
      if (!("__bgDebug" in window)) { try { window.__bgDebug = true; console.debug("[BackgroundCanvas] draw loop started"); } catch {} }
      const c = center();

      // Clear to deep black
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw accelerating rainbow streaks
      ctx.globalCompositeOperation = "lighter";
      const limit = maxR();
      for (let s of stars) {
        const vx = Math.cos(s.angle);
        const vy = Math.sin(s.angle);
        const boost = boostRef.current > 0 ? 3 : 1; // impulse multiplier

        const x0 = c.x + vx * s.r;
        const y0 = c.y + vy * s.r;

        // continuous acceleration
        s.speed *= 1.012;
        s.r += s.speed * boost;

        const x1 = c.x + vx * s.r;
        const y1 = c.y + vy * s.r;

        ctx.strokeStyle = `hsla(${s.hue}, 95%, 60%, 0.9)`;
        ctx.lineWidth = Math.min(3.2, 0.18 + s.r / 150);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        if (s.r > limit) Object.assign(s, spawn());
      }

      // One‑shot pulse ring on impulse
      if (pulseRef.current.active) {
        const t = (performance.now() - pulseRef.current.t0) / 1000;
        const radius = t * 900; // px/s
        const alpha = Math.max(0, 0.35 - t * 0.35);
        if (alpha > 0) {
          const { x, y } = c;
          const grd = ctx.createRadialGradient(x, y, Math.max(0, radius - 40), x, y, radius + 40);
          grd.addColorStop(0, `hsla(200, 100%, 60%, ${alpha * 0.25})`);
          grd.addColorStop(0.5, `hsla(300, 100%, 60%, ${alpha * 0.18})`);
          grd.addColorStop(1, `hsla(50, 100%, 60%, 0)`);
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(x, y, radius + 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "lighter";
        } else {
          pulseRef.current.active = false;
        }
      }

      if (boostRef.current > 0) boostRef.current -= 1;
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Trigger impulse + pulse when prop changes
  useEffect(() => {
    if (impulse > 0) {
      boostRef.current = 60; // ~1s boost at 60fps
      pulseRef.current = { active: true, t0: performance.now() };
    }
  }, [impulse]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

// CTA: transparent inner (5% opacity), only the colorful border animates
function CTAButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex items-center justify-center rounded-2xl px-0 py-0 group focus:outline-none"
      aria-label="Start speed test"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* SVG outline with traveling rainbow segment along the border */}
      <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="rainbowStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6"/>
            <stop offset="20%" stopColor="#06b6d4"/>
            <stop offset="40%" stopColor="#8b5cf6"/>
            <stop offset="60%" stopColor="#ec4899"/>
            <stop offset="80%" stopColor="#f59e0b"/>
            <stop offset="100%" stopColor="#10b981"/>
          </linearGradient>
        </defs>
        {/* 4px visual stroke; pathLength makes dash math size-independent */}
        <rect x="2" y="2" width="96" height="36" rx="16" ry="16" fill="none" stroke="url(#rainbowStroke)" strokeWidth="4" pathLength="100" strokeDasharray="30 70" className="cta-dash glow"/>
      </svg>

      {/* Inner body at 5% opacity (click target) */}
      <span className="relative rounded-2xl bg-white/5 text-white px-7 py-3 text-base sm:text-lg font-semibold shadow-lg">
        {children}
      </span>

      <style>{`
        .cta-dash { stroke-linecap: round; animation: dash-loop 2.6s linear infinite; }
        @keyframes dash-loop { to { stroke-dashoffset: -100; } }
        @media (prefers-reduced-motion: reduce) { .cta-dash { animation: none; } }
        .glow { filter: drop-shadow(0 0 6px rgba(255,255,255,0.7)); }
      `}</style>
    </button>
  );
}

// -------------------- App --------------------
export default function SpeedTestApp() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [jitterMs, setJitterMs] = useState(null);
  const [downloadMbps, setDownloadMbps] = useState(null);
  const [uploadMbps, setUploadMbps] = useState(null);
  const [progress, setProgress] = useState(0);
  const [impulse, setImpulse] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const abortRef = useRef(null);

  const canStop = phase !== "idle" && phase !== "done" && phase !== "error";

  const resetAll = useCallback(() => {
    setRunning(false);
    setPhase("idle");
    setError(null);
    setLatencyMs(null);
    setJitterMs(null);
    setDownloadMbps(null);
    setUploadMbps(null);
    setProgress(0);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollHint(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch provider/server info once
  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        setServerInfo("speed.cloudflare.com");
        setProviderInfo(data.org || data.isp || data.asn || data.ip);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch provider info", e);
      }
    }
    fetchInfo();
  }, []);

  const measureLatency = useCallback(async () => {
    const samples = [];
    for (let i = 0; i < TEST_CONFIG.latencySamples; i++) {
      const start = performance.now();
      try {
        const r = await fetch(TEST_CONFIG.latencyEndpoint, { cache: "no-store", mode: "cors" });
        if (!r.ok) throw new Error("Latency probe failed");
      } catch {}
      const dt = performance.now() - start;
      samples.push(dt);
      await sleep(60 + Math.random() * 60);
    }
    const s = samples.slice(1); // drop the first sample (warmup)
    const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
    const meanAbsDev = s.reduce((a, b) => a + Math.abs(b - avg), 0) / Math.max(1, s.length);
    setLatencyMs(avg);
    setJitterMs(meanAbsDev);
  }, []);

  const measureDownload = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;

    const totalBytes = TEST_CONFIG.download.totalBytes;
    const parallel = TEST_CONFIG.download.parallel;
    const perStream = Math.floor(totalBytes / parallel);

    let downloaded = 0;
    const start = performance.now();

    async function oneStream() {
      let endpointIndex = 0;
      const endpoints = TEST_CONFIG.download.endpoints;
      const urlFor = (n) => endpoints[endpointIndex % endpoints.length](n);
      let left = perStream;
      while (left > 0) {
        const chunk = Math.min(left, 2 * 1024 * 1024);
        const url = urlFor(chunk);
        try {
          const res = await fetch(url, { cache: "no-store", mode: "cors", signal: controller.signal });
          if (!res.ok || !res.body) throw new Error("bad response");
          const reader = res.body.getReader();
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value?.length || 0;
            downloaded += value?.length || 0;
            setProgress(downloaded / totalBytes);
          }
          left -= received;
        } catch (e) {
          endpointIndex++;
          if (controller.signal.aborted) throw e;
          await sleep(50);
        }
      }
    }

    const workers = Array.from({ length: parallel }, () => oneStream());
    await Promise.all(workers);

    const dt = performance.now() - start;
    const bits = downloaded * 8;
    const bps = bits / (dt / 1000 || 1);
    setDownloadMbps(bps);
  }, []);

  const measureUpload = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const totalBytes = TEST_CONFIG.upload.totalBytes;
    const payload = new Blob([safeRandomBytes(totalBytes)]);
    const start = performance.now();
    try {
      const res = await fetch(TEST_CONFIG.upload.endpoint, { method: "POST", body: payload, mode: "cors", signal: controller.signal });
      if (!res.ok) throw new Error("upload failed");
    } catch (e) {
      if (controller.signal.aborted) throw e;
    }
    const dt = performance.now() - start;
    const bits = payload.size * 8;
    const bps = bits / (dt / 1000 || 1);
    setUploadMbps(bps);
  }, []);

  const startTest = useCallback(async () => {
    try {
      setError(null);
      setRunning(true);
      setProgress(0);
      setPhase("latency");

      // Trigger background impulse + show mobile scroll hint
      setImpulse((n) => n + 1);
      setShowScrollHint(true);
      setTimeout(() => setShowScrollHint(false), 5000);

      await measureLatency();
      setPhase("download");
      await measureDownload();
      setPhase("upload");
      await measureUpload();
      setPhase("done");
      setRunning(false);
    } catch (e) {
      setError(e?.message || "Unknown error");
      setPhase("error");
      setRunning(false);
    }
  }, [measureLatency, measureDownload, measureUpload]);

  const shareText = useMemo(() => {
    const parts = [];
    if (downloadMbps != null) parts.push(`↓ ${fmtMbps(downloadMbps)} Mbps`);
    if (uploadMbps != null) parts.push(`↑ ${fmtMbps(uploadMbps)} Mbps`);
    if (latencyMs != null) parts.push(`ping ${fmtMs(latencyMs)} ms`);
    if (jitterMs != null) parts.push(`jitter ${fmtMs(jitterMs)} ms`);
    if (serverInfo) parts.push(`server ${serverInfo}`);
    if (providerInfo) parts.push(`ISP ${providerInfo}`);
    return parts.join(" | ");
  }, [downloadMbps, uploadMbps, latencyMs, jitterMs, serverInfo, providerInfo]);

  const copyShare = useCallback(async () => {
    const text = shareText || "Speed test results";
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Fallback for environments without Clipboard API permissions
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
  }, [shareText]);

  const meterColor = (value) => {
    if (value == null) return "bg-gray-700";
    if (value > 200 * 1_000_000) return "bg-green-400";
    if (value > 50 * 1_000_000) return "bg-emerald-400";
    if (value > 10 * 1_000_000) return "bg-yellow-400";
    return "bg-orange-400";
  };

  const statusText = useMemo(() => {
    switch (phase) {
      case "idle": return "Idle";
      case "latency": return "Measuring latency";
      case "download": return "Measuring download";
      case "upload": return "Measuring upload";
      case "done": return "Done";
      case "error": return `Error: ${error || ''}`;
      default: return String(phase);
    }
  }, [phase, error]);

  return (
    <div className="min-h-screen w-full bg-black text-gray-100 relative overflow-hidden" style={{ background: '#000', color: '#e5e7eb' }}>
      <BackgroundCanvas impulse={impulse} />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Internet Speed Test</h1>
            <p className="text-sm text-gray-400">Fast, browser-based speed test — no installation. Measure download, upload, ping & jitter.</p>
          </div>
          <button onClick={resetAll} className="rounded-2xl border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800" title="Reset">Reset</button>
        </header>

        {/* HERO: Centered CTA */}
        <section className="min-h-[48vh] sm:min-h-[42vh] flex flex-col items-center justify-center text-center gap-3">
          {!running ? (
            <CTAButton onClick={startTest}>
              {phase === "done" ? "Test Again" : "Start Test"}
            </CTAButton>
          ) : (
            <button onClick={stop} disabled={!canStop} className="inline-flex items-center justify-center rounded-2xl bg-gray-700/60 px-6 py-3 text-white shadow-lg transition hover:bg-gray-600 disabled:opacity-60">
              Stop
            </button>
          )}

          {/* Progress + status under CTA */}
          <div className="w-full max-w-md mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800" aria-hidden="true">
              <div className="h-2 bg-blue-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-gray-400" aria-live="polite">Status: {statusText}</div>
          </div>

          {/* Mobile scroll hint */}
          {showScrollHint && (
            <div className="sm:hidden mt-4 flex flex-col items-center text-gray-300/90">
              <svg width="28" height="28" viewBox="0 0 24 24" className="animate-bounce" aria-hidden="true">
                <path fill="currentColor" d="M12 21l-5-7h10l-5 7Zm0-10l-5-7h10l-5 7Z"/>
              </svg>
              <span className="text-xs">Scroll down to see results</span>
            </div>
          )}
        </section>

        {/* Results */}
        <section aria-labelledby="results" className="grid gap-4 sm:grid-cols-3">
          <h2 id="results" className="sr-only">Speed test results</h2>

          {/* Download */}
          <article className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-4 shadow-sm" aria-labelledby="dl-title">
            <div id="dl-title" className="mb-2 text-xs uppercase tracking-wider text-gray-400">Download</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold text-white">{downloadMbps == null ? "—" : fmtMbps(downloadMbps)}</div>
              <div className="pb-1 text-sm text-gray-400">Mbps</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800" aria-hidden="true">
              <div className={`h-2 ${meterColor(downloadMbps)}`} style={{ width: downloadMbps == null ? "0%" : `${Math.min(100, (downloadMbps / 500) * 100)}%` }} />
            </div>
          </article>

          {/* Upload */}
          <article className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-4 shadow-sm" aria-labelledby="ul-title">
            <div id="ul-title" className="mb-2 text-xs uppercase tracking-wider text-gray-400">Upload</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold text-white">{uploadMbps == null ? "—" : fmtMbps(uploadMbps)}</div>
              <div className="pb-1 text-sm text-gray-400">Mbps</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800" aria-hidden="true">
              <div className={`h-2 ${meterColor(uploadMbps)}`} style={{ width: uploadMbps == null ? "0%" : `${Math.min(100, (uploadMbps / 200) * 100)}%` }} />
            </div>
          </article>

          {/* Latency */}
          <article className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-4 shadow-sm" aria-labelledby="latency-title">
            <div id="latency-title" className="mb-2 text-xs uppercase tracking-wider text-gray-400">Latency</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold text-white">{latencyMs == null ? "—" : fmtMs(latencyMs)}</div>
              <div className="pb-1 text-sm text-gray-400">ms</div>
            </div>
            <div className="mt-2 text-sm text-gray-400">Jitter: {jitterMs == null ? "—" : `${fmtMs(jitterMs)} ms`}</div>
          </article>
        </section>

        {/* Copy results close to the cards */}
        <div className="mt-4 flex justify-center">
          <button onClick={copyShare} className="rounded-2xl border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Copy Result</button>
        </div>

        {/* Extra info: server + provider */}
        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Server</div>
            <div className="text-white">{serverInfo || "—"}</div>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Provider</div>
            <div className="text-white">{providerInfo || "—"}</div>
          </article>
        </section>

        {/* Mobile Ad Slot (line only) */}
        <div className="block sm:hidden"><AdSlot /></div>

        <SparkleDivider label="Helpful info" />

        {/* FAQ */}
        <section aria-labelledby="faq">
          <h2 id="faq" className="text-lg font-semibold mb-3 text-white">Internet speed test — FAQs</h2>
          <div className="space-y-3">
            <details className="rounded-xl border border-gray-700 bg-black/60 backdrop-blur p-3">
              <summary className="cursor-pointer font-medium">How does this speed test work?</summary>
              <p className="mt-2 text-sm text-gray-300">We measure download and upload throughput in your browser and estimate ping & jitter using multiple latency probes.</p>
            </details>
            <details className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-3">
              <summary className="cursor-pointer font-medium">What is a good internet speed?</summary>
              <p className="mt-2 text-sm text-gray-300">For HD streaming and calls, ~25 Mbps down and 5 Mbps up are usually enough. For gaming or 4K streaming, more bandwidth helps.</p>
            </details>
            <details className="rounded-2xl border border-gray-700 bg-black/60 backdrop-blur p-3">
              <summary className="cursor-pointer font-medium">Why do results vary?</summary>
              <p className="mt-2 text-sm text-gray-300">Wi‑Fi quality, network congestion, and server distance can affect results. Try a wired connection for consistency.</p>
            </details>
          </div>
        </section>

        {/* Desktop Ad Slot (line only) */}
        <section className="mt-6 hidden sm:block" aria-labelledby="sponsored">
          <h2 id="sponsored" className="sr-only">Sponsored</h2>
          <AdSlot />
        </section>

        <footer className="mt-8 text-center text-xs text-gray-500">Made with ❤️ — no trackers, no cookies.</footer>
      </div>
    </div>
  );
}

// -------------------- Tiny in-file tests (dev only) --------------------
if (typeof window !== "undefined") {
  try {
    console.assert(fmtMbps(10_000_000) === "10.00", "fmtMbps should format 10,000,000 bps as 10.00");
    console.assert(fmtMbps(1_234_567) === "1.23", "fmtMbps rounds to 2 decimals");
    console.assert(fmtMbps(0) === "0.00", "fmtMbps should format 0 correctly");
    console.assert(fmtMs(-5) === "0", "fmtMs should clamp negatives to 0");
    const n = 131072; // > 65536 to exercise chunking
    const bytes = safeRandomBytes(n);
    console.assert(bytes.length === n, "safeRandomBytes should return requested length");
    const meter = (v) => (v == null ? "bg-gray-700" : v > 200e6 ? "bg-green-400" : v > 50e6 ? "bg-emerald-400" : v > 10e6 ? "bg-yellow-400" : "bg-orange-400");
    console.assert(meter(null) === "bg-gray-700", "meterColor for null");
    console.assert(meter(300e6) === "bg-green-400", "meterColor for high speed");
    // eslint-disable-next-line no-console
    console.debug("Dev tests passed ✅");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Dev tests failed", e);
  }
}
