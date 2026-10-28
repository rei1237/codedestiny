"use client";

// /admin/growth — 성장 기록 · 성과와 XP. ?date=YYYY-MM-DD 면 그날 원장만 먼저 보여 준다.

import { useCallback, useEffect, useState } from "react";
import AdminErrorState from "../_components/AdminErrorState";
import { adminFetch } from "../_lib/admin-api";
import { LoadingBlock } from "../_hq/components";
import { formatDateKey, formatXp } from "../_hq/format";
import { describeHqError, readQuery, useHqResource } from "../_hq/useHqResource";
import GrowthView, { type BackfillPreview, type GrowthGoals } from "../_hq/views/GrowthView";
import type { Achievement, HqSummary, TrafficData, XpResponse } from "../_hq/types";

interface SettingsResponse { settings: { revenueSince: string | null; goals: GrowthGoals } }

export default function AdminGrowthPage() {
  const [highlightDate, setHighlightDate] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const date = readQuery().get("date") || "";
    setHighlightDate(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null);
  }, []);

  const xp = useHqResource<XpResponse>("/api/admin/hq/xp?limit=200", "XP 기록을 불러오지 못했습니다.");
  const summary = useHqResource<HqSummary>("/api/admin/hq/summary?range=28d", "최근 기록을 불러오지 못했습니다.");
  const traffic = useHqResource<{ traffic: TrafficData; setup: string[] }>("/api/admin/hq/traffic?range=28d", "참여 세션 기록을 불러오지 못했습니다.");
  const achievements = useHqResource<{ items: Achievement[] }>("/api/admin/hq/achievements", "업적을 불러오지 못했습니다.");
  const settings = useHqResource<SettingsResponse>("/api/admin/hq/settings", "설정을 불러오지 못했습니다.");
  const { reload: reloadXp } = xp;
  const { reload: reloadSummary } = summary;
  const { reload: reloadSettings } = settings;

  const onSaveGoals = useCallback(async (goals: GrowthGoals) => {
    try {
      await adminFetch("/api/admin/hq/settings", { method: "PATCH", body: { goals } });
      reloadSummary();
      return null;
    } catch (caught) {
      return describeHqError(caught, "목표를 저장하지 못했습니다.").message;
    }
  }, [reloadSummary]);

  const onPreviewBackfill = useCallback(async (since: string) => {
    try {
      return await adminFetch<BackfillPreview>("/api/admin/hq/xp/backfill", { method: "POST", body: { since, dryRun: true } });
    } catch (caught) {
      throw new Error(describeHqError(caught, "미리보기를 만들지 못했습니다.").message);
    }
  }, []);

  const onApplyBackfill = useCallback(async (since: string) => {
    try {
      const result = await adminFetch<{ since: string; complete: boolean; revenueXp: number }>("/api/admin/hq/xp/backfill", { method: "POST", body: { since, dryRun: false, confirm: true } });
      reloadXp();
      reloadSettings();
      reloadSummary();
      return `${formatDateKey(result.since)} 이후 기준으로 매출 XP 를 ${formatXp(result.revenueXp)}로 맞췄습니다.${result.complete ? "" : " 남은 주문은 다음 집계에서 이어 반영됩니다."}`;
    } catch (caught) {
      throw new Error(describeHqError(caught, "백필을 적용하지 못했습니다.").message);
    }
  }, [reloadXp, reloadSettings, reloadSummary]);

  if (xp.error && !xp.data) return <AdminErrorState view={xp.error} onRetry={xp.reload} retrying={xp.loading} />;
  if (!xp.data || highlightDate === undefined) {
    return <div className="cd-adm-card rounded-[var(--cd-adm-radius-lg)] p-4"><LoadingBlock lines={6} label="성장 기록을 여는 중" /></div>;
  }

  const sideErrors = [summary, traffic, achievements, settings].filter((resource) => resource.error);
  return (
    <>
      {sideErrors.map((resource) => (
        <div key={resource.error!.message} className="mb-3"><AdminErrorState view={resource.error!} onRetry={resource.reload} retrying={resource.loading} compact /></div>
      ))}
      <GrowthView
        xp={xp.data}
        summary={summary.data}
        traffic={traffic.data}
        achievements={achievements.data?.items || []}
        revenueSince={settings.data?.settings.revenueSince ?? null}
        highlightDate={highlightDate}
        onSaveGoals={summary.data ? onSaveGoals : undefined}
        onPreviewBackfill={settings.data ? onPreviewBackfill : undefined}
        onApplyBackfill={settings.data ? onApplyBackfill : undefined}
      />
    </>
  );
}
