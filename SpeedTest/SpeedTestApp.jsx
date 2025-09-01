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
    totalBytes: 4 * 1024 * 1024, // 4 MB payload to avoid crypto.getRandomValues limit
    endpoint: "https://httpbin.org/post",
  },
};

// Utility: format Mbps and ms
const fmtMbps = (bps) => (bps / 1_000_000).toFixed(2);
const fmtMs = (ms) => Math.max(0, ms).toFixed(0);

// Utility: sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Generate pseudo-random data without exceeding crypto limit
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

export default function
