"use client";

import { useEffect, useMemo, useState } from "react";

type VersionPayload = {
  commit?: string;
  commitShort?: string;
  branch?: string;
  builtAt?: string;
  buildTime?: string;
  deploymentMode?: string;
  source?: string;
};

type HeaderProbeResult = {
  path: string;
  status: number;
  cacheControl: string;
  cdnCacheControl: string;
  cfCdnCacheControl: string;
  contentType: string;
};

function pickHeaders(headers: Headers) {
  return {
    cacheControl: headers.get("cache-control") || "",
    cdnCacheControl: headers.get("cdn-cache-control") || "",
    cfCdnCacheControl: headers.get("cloudflare-cdn-cache-control") || "",
    contentType: headers.get("content-type") || "",
  };
}

function findNextStaticSamplePath(): string {
  if (typeof document === "undefined") return "";

  const scriptElements = Array.from(document.querySelectorAll("script[src]"));
  for (const scriptElement of scriptElements) {
    const src = String(scriptElement.getAttribute("src") || "").trim();
    if (!src.includes("/_next/static/")) continue;

    try {
      const parsed = new URL(src, window.location.origin);
      return `${parsed.pathname}${parsed.search || ""}`;
    } catch {
      continue;
    }
  }

  return "";
}

async function probeHeaders(path: string): Promise<HeaderProbeResult> {
  const probePath = path.includes("?") ? `${path}&_probe=${Date.now()}` : `${path}?_probe=${Date.now()}`;
  const response = await fetch(probePath, {
    cache: "no-store",
    method: "GET",
  });

  const selected = pickHeaders(response.headers);
  return {
    path,
    status: response.status,
    ...selected,
  };
}

export default function AdminCacheStatusPage() {
  const [version, setVersion] = useState<VersionPayload | null>(null);
  const [probes, setProbes] = useState<HeaderProbeResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const titleVersion = useMemo(() => {
    if (!version) return "-";
    return String(version.commitShort || version.commit || "-");
  }, [version]);

  async function runChecks() {
    setLoading(true);
    setError("");

    try {
      const versionRes = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!versionRes.ok) {
        throw new Error(`version.json ${versionRes.status} ${versionRes.statusText}`);
      }

      const versionJson = (await versionRes.json()) as VersionPayload;
      setVersion(versionJson);

      const paths = [
        "/",
        "/index.html",
        "/version.json",
        "/service-worker.js",
        "/icons/꿀꿀 운세 로고.webp",
        "/api/health",
      ];

      const nextStaticPath = findNextStaticSamplePath();
      if (nextStaticPath) {
        paths.push(nextStaticPath);
      }

      const settled = await Promise.allSettled(paths.map((path) => probeHeaders(path)));
      const nextProbes: HeaderProbeResult[] = settled.map((item, index) => {
        if (item.status === "fulfilled") return item.value;
        return {
          path: paths[index],
          status: 0,
          cacheControl: "",
          cdnCacheControl: "",
          cfCdnCacheControl: "",
          contentType: item.reason instanceof Error ? item.reason.message : "probe_failed",
        };
      });

      setProbes(nextProbes);
      setLastCheckedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "cache status check failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runChecks();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-cyan-500/25 bg-slate-900/75 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <header className="mb-5 flex flex-col gap-3 border-b border-slate-700 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300">ADMIN CACHE STATUS</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">배포 버전 및 캐시 헤더 진단</h1>
            <p className="mt-1 text-sm text-slate-300">현재 도메인 기준으로 version.json과 핵심 경로 응답 헤더를 실시간 점검합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void runChecks();
              }}
              disabled={loading}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "점검 중..." : "다시 점검"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mb-5 rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">현재 배포 버전</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-slate-400">commit</dt>
            <dd className="font-mono text-slate-100">{titleVersion}</dd>
            <dt className="text-slate-400">branch</dt>
            <dd className="font-mono text-slate-100">{version?.branch || "-"}</dd>
            <dt className="text-slate-400">builtAt</dt>
            <dd className="font-mono text-slate-100">{version?.builtAt || version?.buildTime || "-"}</dd>
            <dt className="text-slate-400">deployment</dt>
            <dd className="font-mono text-slate-100">{version?.deploymentMode || "-"}</dd>
            <dt className="text-slate-400">lastChecked</dt>
            <dd className="font-mono text-slate-100">
              {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString("ko-KR") : "-"}
            </dd>
          </dl>
        </section>

        <section className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">캐시 헤더 샘플</h2>
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-300">
                <th className="px-2 py-2">Path</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Cache-Control</th>
                <th className="px-2 py-2">CDN-Cache-Control</th>
                <th className="px-2 py-2">Cloudflare-CDN-Cache-Control</th>
                <th className="px-2 py-2">Content-Type</th>
              </tr>
            </thead>
            <tbody>
              {probes.map((item) => (
                <tr key={item.path} className="border-b border-slate-800 align-top text-slate-100">
                  <td className="px-2 py-2 font-mono">{item.path}</td>
                  <td className="px-2 py-2 font-mono">{item.status || "ERR"}</td>
                  <td className="px-2 py-2 font-mono">{item.cacheControl || "-"}</td>
                  <td className="px-2 py-2 font-mono">{item.cdnCacheControl || "-"}</td>
                  <td className="px-2 py-2 font-mono">{item.cfCdnCacheControl || "-"}</td>
                  <td className="px-2 py-2 font-mono">{item.contentType || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
