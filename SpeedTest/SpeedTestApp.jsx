import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";

/* ==================== Config ==================== */
const TEST_CONFIG = {
  latencySamples: 6,
  latencyEndpoint: "https://httpbin.org/get",
  download: {
    totalBytes: 30 * 1024 * 1024, // 30 MB
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

/* ==================== Utils ==================== */
const fmtMbps = (bps) => (bps / 1_000_000).toFixed(2);
const fmtMs = (ms) => Math.max(0, ms).toFixed(0);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function safeRandomBytes(n) {
  const buf = new Uint8Array(n);
  const CHUNK = 65536; // avoid getRandomValues 64KB entropy cap
  for (let i = 0; i < n; i += CHUNK) {
    const end = Math.min(i + CHUNK, n);
    crypto.getRandomValues(buf.subarray(i, end));
  }
  return buf;
}

/* ==================== Background (warp effect) ==================== */
function BackgroundCanvas({ impulse = 0 }) {
  const canvasRef = useRef(null);
  const boostRef = useRef(0);
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
      return {
        angle: Math.random() * Math.PI * 2,
        hue: Math.random() * 360,
        r: Math.random() * 18,
        speed: 0.5 + Math.random() * 1.4,
      };
    }

    let stars = Array.from({ length: 300 }, spawn);
    let rafId = 0;

    const draw = () => {
      const c = center();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "lighter";
      const limit = maxR();
      for (let s of stars) {
        const vx = Math.cos(s.angle);
        const vy = Math.sin(s.angle);
        const boost = boostRef.current > 0 ? 3 : 1;

        const x0 = c.x + vx * s.r;
        const y0 = c.y + vy * s.r;
        s.speed *= 1.012; // continuous acceleration
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

      if (pulseRef.current.active) {
        const t = (performance.now() - pulseRef.current.t0) / 1000;
        const radius = t * 900;
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

  useEffect(() => {
    if (impulse > 0) {
      boostRef.current = 60; // ~1s boost @60fps
      pulseRef.current = { active: true, t0: performance.now() };
    }
  }, [impulse]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

/* ==================== CTA Button ==================== */
function CTAButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex items-center justify-center rounded-2xl px-0 py-0 group focus:outline-none"
      aria-label="Start speed test"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
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
        <rect x="2" y="2" width="96" height="36" rx="16" ry="16" fill="none" stroke="url(#rainbowStroke)" strokeWidth="4" pathLength="100" strokeDasharray="30 70" className="cta-dash glow"/>
      </svg>
      <span className="relative rounded-2xl bg-white/5 text-white px-7 py-3 text-base sm:text-lg font-semibold shadow-lg">
        {children}
      </span>
      <style>{`
        .cta-dash { stroke-linecap: round; animation: dash-loop 2.6s linear infinite; }
        @keyframes dash-loop { to { stroke-dashoffset: -100; } }
        @media (prefers-reduced-motion: reduce) { .cta-dash { animation: none; } }
        .glow { filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)); }
      `}</style>
    </button>
  );
}

/* ==================== Affiliate ==================== */
function AffiliateCard({ title, desc, tag, logo, ctaHref, ctaText = "Learn more →" }) {
  return (
    <div className="group relative flex flex-col items-center text-center overflow-hidden rounded-2xl border border-gray-700 bg-black/70 backdrop-blur px-5 py-6 affiliate-glow min-h-[180px]">
      {logo && (
        <div className="flex items-center justify-center mb-4">
          <img
            src={logo}
            alt={`${title} logo`}
            className="h-16 w-auto select-none"
            loading="eager"
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm uppercase tracking-wider text-gray-400">{tag}</div>
        <div className="mt-0.5 font-semibold text-white leading-tight">{title}</div>
        <div className="text-sm text-gray-200 leading-snug mt-1 space-y-1">{desc}</div>
        {ctaHref && (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-block rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-semibold hover:bg-blue-500 transition"
          >
            {ctaText}
          </a>
        )}
      </div>
      <style>{`
        .affiliate-glow { box-shadow: 0 0 12px rgba(0, 200, 255, 0.3); animation: pulseGlow 4s ease-in-out infinite; }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 6px rgba(255, 0, 150, 0.4); }
          25% { box-shadow: 0 0 12px rgba(0, 200, 255, 0.5); }
          50% { box-shadow: 0 0 18px rgba(0, 255, 120, 0.5); }
          75% { box-shadow: 0 0 12px rgba(255, 180, 0, 0.5); }
          100% { box-shadow: 0 0 6px rgba(255, 0, 150, 0.4); }
        }
      `}</style>
    </div>
  );
}

function AdSlot() {
  return (
    <div className="my-4 grid gap-4 sm:grid-cols-2" role="complementary" aria-label="affiliate-offers">
      <AffiliateCard
        title="NordVPN — Exclusive Deal"
        desc={
          <>
            <p>Protect 10 devices with one deal!</p>
            <p>Get 75% off NordVPN's 2-year plan + 3 extra months</p>
            <p className="mt-1 text-green-400 font-semibold">From <span className="line-through text-gray-400">€11.59</span> <span className="text-white">€3.09</span>/month</p>
          </>
        }
        tag="VPN"
        logo="/nordvpn-logo.svg"
        ctaHref="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=131269&url_id=902"
        ctaText="Get NordVPN Deal"
      />
      <AffiliateCard
        title="eSIM for travelers"
        desc="Instant data in 190+ countries."
        tag="eSIM"
      />
    </div>
  );
}

/* ==================== App ==================== */
export default function SpeedTestApp() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    const onScroll = () => setShowScrollHint(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Provider & server info
  useEffect(() => {
    async function fetchInfo() {
      let cityCountry = "";
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        setProviderInfo(ipData.org || ipData.isp || ipData.asn || ipData.network || ipData.ip);
        if (ipData.city && ipData.country_name) cityCountry = `${ipData.city}, ${ipData.country_name}`;
        else if (ipData.country_name) cityCountry = ipData.country_name;
      } catch {}

      try {
        const traceRes = await fetch("https://speed.cloudflare.com/cdn-cgi/trace");
        const text = await traceRes.text();
        const map = Object.fromEntries(
          text
            .trim()
            .split("\n")
            .map((line) => line.split("=").map((s) => s.trim()))
            .filter(([k, v]) => k && v)
        );
        const colo = map.colo || "?";
        const loc = map.loc || "";

        let countryName = loc;
        try {
          if (loc) {
            const countryRes = await fetch(`https://restcountries.com/v3.1/alpha/${loc}`);
            const countryData = await countryRes.json();
            if (Array.isArray(countryData) && countryData[0]?.name?.common) {
              countryName = countryData[0].name.common;
            }
          }
        } catch {}

        const fallback = countryName ? `Cloudflare POP ${colo} (${countryName})` : `Cloudflare POP ${colo}`;
        setServerInfo(cityCountry || fallback);
      } catch {
        setServerInfo(cityCountry || "Cloudflare (trace unavailable)");
      }
    }
    fetchInfo();
  }, []);

  // Latency
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
    const s = samples.slice(1); // drop warm-up
    const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
    const meanAbsDev = s.reduce((a, b) => a + Math.abs(b - avg), 0) / Math.max(1, s.length);
    setLatencyMs(avg);
    setJitterMs(meanAbsDev);
  }, []);

  // Download
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
            const len = value?.length || 0;
            received += len;
            downloaded += len;
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

  // Upload
  const measureUpload = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const totalBytes = TEST_CONFIG.upload.totalBytes;
    const payload = new Blob([safeRandomBytes(totalBytes)]);
    const start = performance.now();
    try {
      const res = await fetch(TEST_CONFIG.upload.endpoint, {
        method: "POST",
        body: payload,
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/octet-stream" },
      });
      if (!res.ok) throw new Error("upload failed");
    } catch (e) {
      if (controller.signal.aborted) throw e;
    }
    const dt = performance.now() - start || 1;
    const bits = payload.size * 8;
    const bps = bits / (dt / 1000);
    setUploadMbps(bps);
  }, []);

  // Start/Stop
  const startTest = useCallback(async () => {
    try {
      setError(null);
      setRunning(true);
      setProgress(0);
      setPhase("latency");

      setImpulse((n) => n + 1); // kick background pulse
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

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

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
    } catch {
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
    if (value == null) return "bg-gray-800";
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

  /* ============== Render ============== */
  return (
    <div className="min-h-screen w-full bg-black text-gray-100 relative overflow-hidden">
      <BackgroundCanvas impulse={impulse} />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Internet Speed Test</h1>
            <p className="text-sm text-gray-400">Fast, browser-based speed test — download, upload, ping & jitter.</p>
          </div>
          {/* Hamburger menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-md border border-gray-700 hover:bg-gray-800" aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <button className="fixed inset-0 z-40 bg-black/40" aria-label="Close menu overlay" onClick={() => setMenuOpen(false)} />
                <div className="fixed right-4 top-16 z-50 w-56 bg-black border border-gray-700 rounded-xl shadow-lg">
                  <a href="/faq" className="block px-4 py-2 text-sm hover:bg-gray-800" onClick={() => setMenuOpen(false)}>FAQ</a>
                  <a href="/blog" className="block px-4 py-2 text-sm hover:bg-gray-800" onClick={() => setMenuOpen(false)}>Blog</a>
                  <a href="/vpn-and-speed" className="block px-4 py-2 text-sm hover:bg-gray-800" onClick={() => setMenuOpen(false)}>VPN and Speed</a>
                  <a href="/internet-providers" className="block px-4 py-2 text-sm hover:bg-gray-800" onClick={() => setMenuOpen(false)}>Internet Providers</a>
                  <a href="/glossary" className="block px-4 py-2 text-sm hover:bg-gray-800" onClick={() => setMenuOpen(false)}>Glossary</a>
                </div>
              </>
            )}
          </div>
        </header>

        {/* HERO CTA */}
        <section className={`min-h-[48vh] sm:min-h-[42vh] flex flex-col items-center justify-center text-center gap-3 ${menuOpen ? 'mt-24' : ''}`}>
          {!running ? (
            <CTAButton onClick={startTest}>
              {phase === "done" ? "Test Again" : "Start Test"}
            </CTAButton>
          ) : (
            <button onClick={stop} disabled={!canStop} className="inline-flex items-center justify-center rounded-2xl bg-gray-700/60 px-6 py-3 text-white shadow-lg transition hover:bg-gray-600 disabled:opacity-60">
              Stop
            </button>
          )}

          {/* Progress + status */}
          <div className="w-full max-w-md mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-900" aria-hidden="true">
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
          <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-4 shadow-sm" aria-labelledby="dl-title">
            <div id="dl-title" className="mb-2 text-xs uppercase tracking-wider text-gray-400">Download</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold text-white">{downloadMbps == null ? "—" : fmtMbps(downloadMbps)}</div>
              <div className="pb-1 text-sm text-gray-400">Mbps</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-900" aria-hidden="true">
              <div className={`${"h-2 " + (downloadMbps == null ? "bg-gray-800" : (downloadMbps > 200*1_000_000 ? "bg-green-400" : downloadMbps > 50*1_000_000 ? "bg-emerald-400" : downloadMbps > 10*1_000_000 ? "bg-yellow-400" : "bg-orange-400"))}`} style={{ width: downloadMbps == null ? "0%" : `${Math.min(100, (downloadMbps / 500) * 100)}%` }} />
            </div>
            <div className="mt-3">
              <button onClick={copyShare} className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900">Copy Result</button>
            </div>
          </article>

          {/* Upload */}
          <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-4 shadow-sm" aria-labelledby="ul-title">
            <div id="ul-title" className="mb-2 text-xs uppercase tracking-wider text-gray-400">Upload</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold text-white">{uploadMbps == null ? "—" : fmtMbps(uploadMbps)}</div>
              <div className="pb-1 text-sm text-gray-400">Mbps</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-900" aria-hidden="true">
              <div className={`${"h-2 " + (uploadMbps == null ? "bg-gray-800" : (uploadMbps > 200*1_000_000 ? "bg-green-400" : uploadMbps > 50*1_000_000 ? "bg-emerald-400" : uploadMbps > 10*1_000_000 ? "bg-yellow-400" : "bg-orange-400"))}`} style={{ width: uploadMbps == null ? "0%" : `${Math.min(100, (uploadMbps / 200) * 100)}%` }} />
            </div>
          </article>

          {/* Latency */}
          <article className="rounded-2xl border border-gray-800 bg-black/60 backdrop-blur p-4 shadow-sm" aria-labelledby="latency-title">
            <div id="latency-title" className="mb-2 text-xs uppercase tracking-wider text-gray-400">Latency</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold text-white">{latencyMs == null ? "—" : fmtMs(latencyMs)}</div>
              <div className="pb-1 text-sm text-gray-400">ms</div>
            </div>
            <div className="mt-2 text-sm text-gray-400">Jitter: {jitterMs == null ? "—" : `${fmtMs(jitterMs)} ms`}</div>
          </article>
        </section>

        {/* Server + Provider (inline text) */}
        <p className="mt-3 text-xs text-gray-400">Server: {serverInfo || "—"} • Provider: {providerInfo || "—"}</p>

        {/* Mobile Affiliate */}
        <div className="block sm:hidden"><AdSlot /></div>

        {/* Desktop Affiliate above (FAQ removed) */}
        <section id="sponsored-section" className="mt-6 hidden sm:block" aria-labelledby="sponsored">
          <h2 id="sponsored" className="sr-only">Sponsored</h2>
          <AdSlot />
        </section>

        <footer className="mt-8 text-center text-xs text-gray-500">Made with ❤️ — no trackers, no cookies.</footer>
      </div>
    </div>
  );
}

/* ==================== Tiny tests (dev only) ==================== */
if (typeof window !== "undefined") {
  try {
    console.assert(fmtMbps(10_000_000) === "10.00", "fmtMbps formats 10,000,000 bps as 10.00");
    console.assert(fmtMs(-5) === "0", "fmtMs clamps negatives to 0");
    const sampleTrace = "colo=BUD\nloc=HU\nip=1.2.3.4";
    const sampleMap = Object.fromEntries(sampleTrace.split("\n").map(l => l.split("=")).filter(([k,v])=>k&&v));
    console.assert(sampleMap.colo === "BUD" && sampleMap.loc === "HU" && sampleMap.ip === "1.2.3.4", "trace parser ok");
  } catch (e) {
    console.warn("Dev tests failed", e);
  }
}
