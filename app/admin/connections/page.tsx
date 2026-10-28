"use client";

// /admin/connections — 관측소 연결 · 연결 상태.

import { useCallback, useState } from "react";
import AdminErrorState from "../_components/AdminErrorState";
import { adminFetch } from "../_lib/admin-api";
import { LoadingBlock } from "../_hq/components";
import { describeHqError, useHqResource } from "../_hq/useHqResource";
import ConnectionsView from "../_hq/views/ConnectionsView";
import type { ConnectionsResponse, Tone } from "../_hq/types";

interface SyncResponse { steps: Record<string, { ok: boolean; error?: string }> }
interface PlanSyncResponse { counts: { created: number; updated: number; archived: number; restored: number; unchanged: number } }

export default function AdminConnectionsPage() {
  const connections = useHqResource<ConnectionsResponse>("/api/admin/hq/connections", "연결 상태를 불러오지 못했습니다.");
  const { reload } = connections;
  const [busy, setBusy] = useState<"sync" | "full" | "plan" | null>(null);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);

  const onSync = useCallback(async (full: boolean) => {
    setBusy(full ? "full" : "sync");
    setNotice(null);
    try {
      const result = await adminFetch<SyncResponse>("/api/admin/hq/sync", { method: "POST", body: { full } });
      const failed = Object.entries(result.steps || {}).filter(([, step]) => !step.ok);
      setNotice(failed.length
        ? { tone: "warn", text: `재집계를 마쳤지만 ${failed.length}개 원천이 실패했습니다: ${failed.map(([id, step]) => `${id}(${step.error || "오류"})`).join(", ")}` }
        : { tone: "ok", text: full ? "전체 기간을 다시 계산했습니다." : "재집계를 마쳤습니다." });
      reload();
    } catch (caught) {
      setNotice({ tone: "err", text: describeHqError(caught, "재집계하지 못했습니다.").message });
    } finally {
      setBusy(null);
    }
  }, [reload]);

  const onSyncPlan = useCallback(async () => {
    setBusy("plan");
    setNotice(null);
    try {
      const { counts } = await adminFetch<PlanSyncResponse>("/api/admin/hq/quests/sync", { method: "POST", body: {} });
      setNotice({ tone: "ok", text: `원본 일정을 맞췄습니다 — 새로 ${counts.created} · 변경 ${counts.updated} · 보관 ${counts.archived} · 복원 ${counts.restored} · 그대로 ${counts.unchanged}` });
      reload();
    } catch (caught) {
      setNotice({ tone: "err", text: describeHqError(caught, "원본 일정을 맞추지 못했습니다.").message });
    } finally {
      setBusy(null);
    }
  }, [reload]);

  if (connections.error && !connections.data) return <AdminErrorState view={connections.error} onRetry={reload} retrying={connections.loading} />;
  if (!connections.data) return <div className="cd-adm-card rounded-[var(--cd-adm-radius-lg)] p-4"><LoadingBlock lines={6} label="연결 상태를 확인하는 중" /></div>;
  return <ConnectionsView data={connections.data} busy={busy} notice={notice} onSync={onSync} onSyncPlan={onSyncPlan} />;
}
