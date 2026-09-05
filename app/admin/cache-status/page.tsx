"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

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

type AdminCacheStatusCopy = {
  eyebrow: string;
  heading: string;
  summary: string;
  checking: string;
  recheck: string;
  checkFailed: string;
  versionTitle: string;
  cacheHeaderTitle: string;
  errorStatus: string;
};

const ADMIN_CACHE_STATUS_COPY_EN: AdminCacheStatusCopy = {
  eyebrow: "ADMIN CACHE STATUS",
  heading: "Deployment Version and Cache Header Diagnostics",
  summary: "Checks version.json and key route response headers in real time for the current domain.",
  checking: "Checking...",
  recheck: "Recheck",
  checkFailed: "Cache status check failed.",
  versionTitle: "Current Deployment Version",
  cacheHeaderTitle: "Cache Header Samples",
  errorStatus: "ERR",
};

const ADMIN_CACHE_STATUS_COPY: Record<LoadingLocale, AdminCacheStatusCopy> = {
  ko: {
    eyebrow: "관리자 캐시 상태",
    heading: "배포 버전 및 캐시 헤더 진단",
    summary: "현재 도메인 기준으로 version.json과 핵심 경로 응답 헤더를 실시간 점검합니다.",
    checking: "점검 중...",
    recheck: "다시 점검",
    checkFailed: "캐시 상태 점검에 실패했습니다.",
    versionTitle: "현재 배포 버전",
    cacheHeaderTitle: "캐시 헤더 샘플",
    errorStatus: "오류",
  },
  en: ADMIN_CACHE_STATUS_COPY_EN,
  ja: {
    eyebrow: "管理者キャッシュ状態",
    heading: "デプロイ版とキャッシュヘッダー診断",
    summary: "現在のドメインを基準に version.json と主要経路の応答ヘッダーをリアルタイムで確認します。",
    checking: "確認中...",
    recheck: "再確認",
    checkFailed: "キャッシュ状態の確認に失敗しました。",
    versionTitle: "現在のデプロイ版",
    cacheHeaderTitle: "キャッシュヘッダーサンプル",
    errorStatus: "エラー",
  },
  "zh-CN": {
    eyebrow: "管理员缓存状态",
    heading: "部署版本与缓存头诊断",
    summary: "按当前域名实时检查 version.json 与核心路径的响应头。",
    checking: "检查中...",
    recheck: "重新检查",
    checkFailed: "缓存状态检查失败。",
    versionTitle: "当前部署版本",
    cacheHeaderTitle: "缓存头样本",
    errorStatus: "错误",
  },
  "zh-TW": {
    eyebrow: "管理員快取狀態",
    heading: "部署版本與快取標頭診斷",
    summary: "依目前網域即時檢查 version.json 與核心路徑的回應標頭。",
    checking: "檢查中...",
    recheck: "重新檢查",
    checkFailed: "快取狀態檢查失敗。",
    versionTitle: "目前部署版本",
    cacheHeaderTitle: "快取標頭樣本",
    errorStatus: "錯誤",
  },
  vi: ADMIN_CACHE_STATUS_COPY_EN,
  hi: ADMIN_CACHE_STATUS_COPY_EN,
  es: ADMIN_CACHE_STATUS_COPY_EN,
  fr: ADMIN_CACHE_STATUS_COPY_EN,
  de: ADMIN_CACHE_STATUS_COPY_EN,
  nl: ADMIN_CACHE_STATUS_COPY_EN,
  ms: ADMIN_CACHE_STATUS_COPY_EN,
};

const ADMIN_CACHE_DATE_LOCALES: Record<LoadingLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  vi: "vi-VN",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  ms: "ms-MY",
};

function getAdminCacheStatusCopy(locale: LoadingLocale) {
  return ADMIN_CACHE_STATUS_COPY[locale] || ADMIN_CACHE_STATUS_COPY.en;
}

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
    } catch (e) {
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
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [version, setVersion] = useState<VersionPayload | null>(null);
  const [probes, setProbes] = useState<HeaderProbeResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const titleVersion = useMemo(() => {
    if (!version) return "-";
    return String(version.commitShort || version.commit || "-");
  }, [version]);
  const copy = getAdminCacheStatusCopy(locale);
  const dateLocale = ADMIN_CACHE_DATE_LOCALES[locale] || ADMIN_CACHE_DATE_LOCALES.en;

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
        "/api/version",
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
      setError(e instanceof Error ? e.message : copy.checkFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runChecks();
  }, []);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-cyan-500/25 bg-slate-900/75 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <header className="mb-5 flex flex-col gap-3 border-b border-slate-700 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300">{copy.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{copy.heading}</h1>
            <p className="mt-1 text-sm text-slate-300">{copy.summary}</p>
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
              {loading ? copy.checking : copy.recheck}
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="mb-5 rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">{copy.versionTitle}</h2>
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
              {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString(dateLocale) : "-"}
            </dd>
          </dl>
        </section>

        <section className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">{copy.cacheHeaderTitle}</h2>
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
                  <td className="px-2 py-2 font-mono">{item.status || copy.errorStatus}</td>
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
