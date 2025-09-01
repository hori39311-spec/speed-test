import React, { useCallback, useMemo, useRef, useState } from "react";

// -------------------- Config --------------------
const TEST_CONFIG = {
  latencySamples: 6,
  latencyEndpoint: "https://httpbin.org/get",
  download: {
    totalBytes: 30 * 1024 * 1024, // 30 MB for mobile friendliness
    parallel: 3,
    endpoints: [
      (n) => `https://speed.cloudflare.com/__down?bytes=${n}`,
      (n) => `https://httpbin.org/bytes/${n}`,
    ],
  },
  upload: {
    totalBytes: 4 * 1024 * 1024,
    endpoint: "https://httpbin.org/post",
  },
};

const fmtMbps = (bps) => (bps / 1_000_000).toFixed(2);
const fmtMs = (ms) => Math.max(0, ms).toFixed(0);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function safeRandomBytes(n) {
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
        <span className="bg-white px-3 text-sm uppercase tracking-wider text-gray-500">
          Results
        </span>
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
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [jitterMs, setJitterMs] = useState(null);
  const [downloadMbps, setDownloadMbps] = useState(null);
  const [uploadMbps, setUploadMbps] = useState(null);
  const [progress, setProgress] = useState(0);
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

  // ---------------- Core Tests ----------------
  const measureLatency = useCallback(async () => {
    const samples = [];
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

    async function oneStream(idx) {
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
    return parts.join(" | ");
  }, [downloadMbps, uploadMbps, latencyMs, jitterMs]);

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText || "Speed test results");
    } catch {}
  }

  const meterColor = (value) => {
    if (value == null) return "bg-gray-200";
    if (value > 200 * 1_000_000) return "bg-green-500";
    if (value > 50 * 1_000_000) return "bg-emerald-500";
    if (value > 10 * 1_000_000) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className="min-h-screen w-full bg-white text-gray-900">
      {/* a teljes JSX, amit korábban küldtél */}
    </div>
  );
}
