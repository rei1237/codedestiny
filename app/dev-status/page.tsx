"use client";

import { useEffect, useMemo, useState } from "react";

type DevStatusPayload = {
  ok: boolean;
  serverTime: string;
  nodeEnv: string;
  node: string;
  request?: { pathname?: string; search?: string };
  git?: {
    branch: string | null;
    commit: string | null;
    status: string | null;
    diffStat: string | null;
  };
};

const DEV_STATUS_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    fetchFailed: "상태 정보를 불러오지 못했습니다.",
  },
  en: {
    fetchFailed: "failed to fetch",
  },
  ja: {
    fetchFailed: "状態情報を取得できませんでした。",
  },
} as const;

export default function DevStatusPage() {
  const [payload, setPayload] = useState<DevStatusPayload | null>(null);
  const [error, setError] = useState<string>("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const pretty = useMemo(() => {
    if (!payload) return "";
    return JSON.stringify(payload, null, 2);
  }, [payload]);

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    let failureStreak = 0;

    async function tick() {
      try {
        const res = await fetch("/api/dev/status", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as DevStatusPayload;
        if (!alive) return;
        setPayload(json);
        setError("");
        setLastUpdatedAt(Date.now());
        failureStreak = 0;
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : DEV_STATUS_PAGE_TEXT_TRANSLATIONS.en.fetchFailed);
        failureStreak += 1;
      } finally {
        if (!alive) return;
        // 연속 실패(네트워크·429·Cloudflare 1015)에서는 지수 백오프로 요청 폭주를 막는다. 정상 시 1초 폴링.
        const delay = failureStreak > 0 ? Math.min(30000, 1000 * 2 ** failureStreak) : 1000;
        timer = window.setTimeout(tick, delay);
      }
    }

    void tick();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-emerald-400/25 bg-slate-950/60 p-5 shadow-[0_0_0_1px_rgba(16,185,129,.12),0_18px_45px_rgba(15,23,42,.55)] backdrop-blur-md sm:p-7">
        <header className="mb-5 flex flex-col gap-3 border-b border-emerald-400/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-emerald-200">DEV STATUS</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">개발 상태 실시간 창</h1>
            <p className="mt-1 text-sm text-slate-300">`/api/dev/status`를 1초마다 조회해 현재 상태를 표시합니다.</p>
          </div>
          <div className="text-xs text-slate-300">
            마지막 갱신:{" "}
            <span className="font-semibold text-white">
              {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("ko-KR") : "-"}
            </span>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error} (개발 모드가 아니면 404가 정상입니다)
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">요약</h2>
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-slate-400">serverTime</dt>
              <dd className="font-mono text-slate-100">{payload?.serverTime ?? "-"}</dd>
              <dt className="text-slate-400">nodeEnv</dt>
              <dd className="font-mono text-slate-100">{payload?.nodeEnv ?? "-"}</dd>
              <dt className="text-slate-400">node</dt>
              <dd className="font-mono text-slate-100">{payload?.node ?? "-"}</dd>
              <dt className="text-slate-400">branch</dt>
              <dd className="font-mono text-slate-100">{payload?.git?.branch ?? "-"}</dd>
              <dt className="text-slate-400">commit</dt>
              <dd className="font-mono text-slate-100">
                {payload?.git?.commit ? payload.git.commit.slice(0, 12) : "-"}
              </dd>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">git diff --stat</h2>
            <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-700/70 bg-slate-950/60 p-3 text-xs text-slate-200">
              {payload?.git?.diffStat || "(no changes)"}
            </pre>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">git status --porcelain -b</h2>
          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-700/70 bg-slate-950/60 p-3 text-xs text-slate-200">
            {payload?.git?.status || "(unavailable)"}
          </pre>
        </section>

        <section className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">raw json</h2>
          <pre className="max-h-[420px] overflow-auto rounded-lg border border-slate-700/70 bg-slate-950/60 p-3 text-xs text-slate-200">
            {pretty || "(loading...)"}
          </pre>
        </section>

        <p className="mt-4 text-xs text-slate-400">
          보안상 이 페이지/엔드포인트는 개발 모드에서만 동작합니다. (production에서는 404)
        </p>
      </div>
    </main>
  );
}

