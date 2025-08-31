import React, { useCallback, useMemo, useRef, useState } from "react";

// -------------------- Config --------------------
const TEST_CONFIG = {
  latencySamples: 6,
  latencyEndpoint: "https://httpbin.org/get",
  download: {
    totalBytes: 30 * 1024 * 1024, // 30 MB for mobile friendliness
    parallel: 3,
    endpoints: [
      (n: number) => `https://speed.cloudflare.com/__down?bytes=${n}`,
      (n: number) => `https://httpbin.org/bytes/${n}`,
    ],
  },
  upload: {
    totalBytes: 4 * 1024 * 1024, // 4 MB payload to avoid crypto.getRandomValues limit
    endpoint: "https://httpbin.org/post",
  },
};

// Utility: format Mbps and ms
const fmtMbps = (bps: number) => (bps / 1_000_000).toFixed(2);
const fmtMs = (ms: number) => Math.max(0, ms).toFixed(0);

// Utility: sleep
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Generate pseudo-random data without exceeding crypto limit
function safeRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  const chunk = 65536;
  for (let i = 0; i < n; i += chunk) {
    const end = Math.min(i + chunk, n);
    crypto.getRandomValues(buf.subarray(i, end));
  }
  return buf;
}

function SparkleDivider() {
  return (
    <div className="relative my-6 h-10">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-sm uppercase tracking-wider text-gray-500">Results</span>
      </div>
    </div>
  );
}

function AdSlot() {
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 text-gray-400">
      Ad Slot
    </div>
  );
}

export default function SpeedTestApp() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "latency" | "download" | "upload" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [jitterMs, setJitterMs] = useState<number | null>(null);
  const [downloadMbps, setDownloadMbps] = useState<number | null>(null);
  const [uploadMbps, setUploadMbps] = useState<number | null>(null);

  const [progress, setProgress] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);

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

  // --------------- Core Tests ---------------
  const measureLatency = useCallback(async () => {
    const samples: number[] = [];
    for (let i = 0; i < TEST_CONFIG.latencySamples; i++) {
      const start = performance.now();
      try {
        const r = await fetch(TEST_CONFIG.latencyEndpoint, {
          cache: "no-store",
          mode: "cors",
        });
        if (!r.ok) throw new Error("Latency probe failed");
      } catch {}
      const dt = performance.now() - start;
      samples.push(dt);
      await sleep(60 + Math.random() * 60);
    }
    const s = samples.slice(1);
    const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
    const meanAbsDev =
      s.reduce((a, b) => a + Math.abs(b - avg), 0) / Math.max(1, s.length);
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

    async function oneStream(idx: number) {
      let endpointIndex = 0;
      const endpoints = TEST_CONFIG.download.endpoints;
      const urlFor = (n: number) => endpoints[endpointIndex % endpoints.length](n);
      let left = perStream;
      while (left > 0) {
        const chunk = Math.min(left, 2 * 1024 * 1024);
        const url = urlFor(chunk);
        try {
          const res = await fetch(url, {
            cache: "no-store",
            mode: "cors",
            signal: controller.signal,
          });
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

    const workers = Array.from({ length: parallel }, (_, i) => oneStream(i));
    await Promise.all(workers);

    const dt = performance.now() - start;
    const bits = downloaded * 8;
    const bps = bits / (dt / 1000);
    setDownloadMbps(bps);
  }, []);

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
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("upload failed");
    } catch (e) {
      if (controller.signal.aborted) throw e;
    }
    const dt = performance.now() - start;
    const bits = payload.size * 8;
    const bps = bits / (dt / 1000);
    setUploadMbps(bps);
  }, []);

  const startTest = useCallback(async () => {
    try {
      setError(null);
      setRunning(true);
      setProgress(0);

      setPhase("latency");
      await measureLatency();

      setPhase("download");
      await measureDownload();

      setPhase("upload");
      await measureUpload();

      setPhase("done");
      setRunning(false);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
      setPhase("error");
      setRunning(false);
    }
  }, [measureLatency, measureDownload, measureUpload]);

  const shareText = useMemo(() => {
    const parts = [] as string[];
    if (downloadMbps != null) parts.push(`↓ ${fmtMbps(downloadMbps)} Mbps`);
    if (uploadMbps != null) parts.push(`↑ ${fmtMbps(uploadMbps)} Mbps`);
    if (latencyMs != null) parts.push(`ping ${fmtMs(latencyMs)} ms`);
    if (jitterMs != null) parts.push(`jitter ${fmtMs(jitterMs)} ms`);
    return parts.join(" | ");
  }, [downloadMbps, uploadMbps, latencyMs, jitterMs]);

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText || "Speed test results");
    } catch {}
  }

  const meterColor = (value: number | null) => {
    if (value == null) return "bg-gray-200";
    if (value > 200 * 1_000_000) return "bg-green-500";
    if (value > 50 * 1_000_000) return "bg-emerald-500";
    if (value > 10 * 1_000_000) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className="min-h-screen w-full bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Internet Speed Test</h1>
            <p className="text-sm text-gray-600">Fast, browser-based speed test — no installation.</p>
          </div>
          <button
            onClick={resetAll}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
            title="Reset"
          >
            Reset
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Download */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">Download</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold">
                {downloadMbps == null ? "—" : fmtMbps(downloadMbps)}
              </div>
              <div className="pb-1 text-sm text-gray-500">Mbps</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-2 ${meterColor(downloadMbps)}`}
                style={{ width: downloadMbps == null ? "0%" : `${Math.min(100, (downloadMbps / 500) * 100)}%` }}
              />
            </div>
          </div>

          {/* Upload */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">Upload</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold">
                {uploadMbps == null ? "—" : fmtMbps(uploadMbps)}
              </div>
              <div className="pb-1 text-sm text-gray-500">Mbps</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-2 ${meterColor(uploadMbps)}`}
                style={{ width: uploadMbps == null ? "0%" : `${Math.min(100, (uploadMbps / 200) * 100)}%` }}
              />
            </div>
          </div>

          {/* Latency/Jitter */}
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">Latency</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold">{latencyMs == null ? "—" : fmtMs(latencyMs)}</div>
              <div className="pb-1 text-sm text-gray-500">ms</div>
            </div>
            <div className="mt-2 text-sm text-gray-600">Jitter: {jitterMs == null ? "—" : `${fmtMs(jitterMs)} ms`}</div>
          </div>
        </div>

        {/* Mobile Ad Slot between Download & Upload */}
        <div className="my-4 block sm:hidden">
          <AdSlot />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {!running ? (
            <button
              onClick={startTest}
              className="inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
            >
              {phase === "done" ? "Test Again" : "Start Test"}
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={!canStop}
              className="inline-flex items-center justify-center rounded-2xl bg-gray-800 px-6 py-3 text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
            >
              Stop
            </button>
          )}

          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 bg-blue-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Status: {phase === "idle" && "idle"}
              {phase === "latency" && "measuring latency"}
              {phase === "download" && "measuring download"}
              {phase === "upload" && "measuring upload"}
              {phase === "done" && "done"}
              {phase === "error" && `error: ${error}`}
            </div>
          </div>

          <button
            onClick={copyShare}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Copy Result
          </button>
        </div>

        <SparkleDivider />

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-4">
            <h3 className="mb-2 text-base font-semibold">Tips for accurate results</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
              <li>Close downloads/streams running in the background.</li>
              <li>Try with a wired connection instead of Wi‑Fi.</li>
              <li>Run multiple tests and take the average.</li>
              <li>Use nearby endpoints for better ping.</li>
            </ul>
          </div>

          {/* Desktop Ad Slot */}
          <div className="hidden rounded-2xl border border-gray-200 p-4 sm:block">
            <AdSlot />
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Made with ❤️ — no trackers, no cookies.
        </footer>
      </div>
    </div>
  );
}
