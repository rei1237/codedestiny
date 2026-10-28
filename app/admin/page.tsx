"use client";

// /admin — 별빛 운영본부 홈. 롤백(classic) 상태면 예전처럼 /admin/content 로 보낸다.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminErrorState from "./_components/AdminErrorState";
import { adminFetch } from "./_lib/admin-api";
import { LevelUpBurst, LoadingBlock } from "./_hq/components";
import { readQuery, useHqResource, writeQuery } from "./_hq/useHqResource";
import { useAdminUiMode } from "./_hq/ui-mode";
import HomeView, { HOME_RANGES } from "./_hq/views/HomeView";
import type { HqSummary } from "./_hq/types";

const RANGE_IDS = new Set<string>(HOME_RANGES.map((item) => item.id));

export default function AdminHqHomePage() {
  const router = useRouter();
  const { mode } = useAdminUiMode();
  const [range, setRange] = useState<string | null>(null);
  const [burstDismissed, setBurstDismissed] = useState(false);

  useEffect(() => {
    const requested = readQuery().get("range") || "";
    setRange(RANGE_IDS.has(requested) ? requested : "7d");
  }, []);

  useEffect(() => {
    if (mode === "classic") router.replace("/admin/content/");
  }, [mode, router]);

  const summary = useHqResource<HqSummary>(
    mode === "hq" && range ? `/api/admin/hq/summary?range=${range}` : null,
    "운영본부 요약을 불러오지 못했습니다.",
  );

  const onRangeChange = useCallback((next: string) => {
    setRange(next);
    writeQuery({ range: next === "7d" ? null : next });
  }, []);

  const onTrendSelect = useCallback((date: string, metric: string) => {
    router.push(metric === "questsDone" ? `/admin/quests/?from=${date}&to=${date}` : `/admin/growth/?date=${date}`);
  }, [router]);

  // 레벨업 연출은 서버 ackLevel 기준으로 한 번만. 닫으면 서버에 확인을 남긴다(실패해도 이번 화면에서는 다시 띄우지 않는다).
  const pending = summary.data?.xp.pendingLevelUp || null;
  const closeBurst = useCallback(() => {
    setBurstDismissed(true);
    adminFetch("/api/admin/hq/xp/ack", { method: "POST", body: {} }).catch(() => {});
  }, []);

  if (mode === "classic") return <LoadingBlock lines={1} label="예전 관리자 화면으로 이동하는 중" />;

  if (summary.error && !summary.data) {
    return <AdminErrorState view={summary.error} onRetry={summary.reload} retrying={summary.loading} />;
  }

  if (!summary.data) {
    return (
      <div className="cd-hq-page space-y-4">
        <div className="cd-hq-hero p-6"><LoadingBlock lines={3} label="운영본부를 여는 중" /></div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="cd-adm-card rounded-[var(--cd-adm-radius-lg)] p-4 lg:col-span-8"><LoadingBlock lines={5} /></div>
          <div className="cd-adm-card rounded-[var(--cd-adm-radius-lg)] p-4 lg:col-span-4"><LoadingBlock lines={4} /></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {summary.error ? <div className="mb-3"><AdminErrorState view={summary.error} onRetry={summary.reload} retrying={summary.loading} compact /></div> : null}
      <HomeView
        data={summary.data}
        range={range || "7d"}
        onRangeChange={onRangeChange}
        onRefresh={summary.reload}
        refreshing={summary.loading}
        onTrendSelect={onTrendSelect}
      />
      {pending && !burstDismissed ? (
        <LevelUpBurst from={pending.from} to={pending.to} title={summary.data.xp.title} onClose={closeBurst} />
      ) : null}
    </>
  );
}
