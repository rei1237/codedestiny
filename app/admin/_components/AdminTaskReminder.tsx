"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, ChevronDown, ShieldAlert, X } from "lucide-react";
import { formatDateKey } from "../_hq/format";
import type { HqSummary } from "../_hq/types";
import { useHqResource } from "../_hq/useHqResource";
import { adminButton } from "./ui";

// 인증된 관리자 셸에서만 조회한다. 기존 서버의 KST·미완료·우선순위 판정을 그대로 표시한다.
// 접힘은 셸이 유지되는 동안만 보존해, 새로 입장하면 다시 안내한다.
export default function AdminTaskReminder() {
  const [collapsed, setCollapsed] = useState(false);
  const reminder = useHqResource<HqSummary>("/api/admin/hq/summary?range=today", "할 일을 불러오지 못했어요.");
  const { reload } = reminder;

  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState === "visible") reload(); };
    const timer = window.setInterval(refreshVisible, 60_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [reload]);

  return (
    <section aria-label="할 일 알림" className="cd-adm-card mb-4 rounded-[var(--cd-adm-radius)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
          별빛 퀘스트 · 할 일 알림
        </h2>
        <button
          type="button"
          className={adminButton("neutral")}
          aria-expanded={!collapsed}
          aria-controls="admin-entry-tasks"
          onClick={() => {
            setCollapsed(!collapsed);
            if (collapsed) reminder.reload();
          }}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
          {collapsed ? "할 일 다시 보기" : "알림 접기"}
        </button>
      </div>
      {/* 운영 문제는 퀘스트 목록을 접어도 보인다. 조회 실패를 "문제 없음"으로 표시하지 않는다. */}
      <div role="alert" className="mt-2 space-y-2">
        {reminder.error ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--cd-adm-warn-ink)]">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <span>알림을 갱신하지 못했어요. 현재 상태를 다시 확인해 주세요.</span>
            <button type="button" className={adminButton("neutral")} disabled={reminder.loading} onClick={reminder.reload}>다시 시도</button>
          </div>
        ) : null}
        {reminder.data?.alerts.map((alert) => (
          <Link key={alert.id} href={alert.href} className={`cd-hq-focus flex min-h-[44px] flex-wrap items-center gap-2 rounded-[var(--cd-adm-radius)] bg-[var(--cd-adm-panel-2)] px-3 py-2 text-sm cd-hq-tone-${alert.tone}`}>
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <strong>확인 필요 · {alert.label} {alert.count}건</strong>
            <span>문제 확인하기</span>
          </Link>
        ))}
      </div>
      <div id="admin-entry-tasks" hidden={collapsed}>
        <div role="status" aria-live="polite" className="mt-2 text-sm text-[var(--cd-adm-ink-quiet)]">
          {reminder.loading && !reminder.data ? "오늘 확인할 일을 불러오고 있어요." : null}
          {reminder.data && !reminder.error ? (
            <p>{formatDateKey(reminder.data.period.today)} · 한국시간 기준. 기한이 지난 일, 오늘 할 일, 가까운 일정 순으로 최대 3개를 알려드려요.</p>
          ) : null}
        </div>
        {reminder.data ? (
          reminder.data.focus.length ? (
            <ul className="mt-3 space-y-1">
              {reminder.data.focus.map((quest) => (
                <li key={quest.id}>
                  <Link href={`/admin/quests/?id=${encodeURIComponent(quest.id)}`} className="cd-hq-focus flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--cd-adm-radius)] px-2 py-2 text-sm hover:bg-[var(--cd-adm-panel-2)]">
                    <span className={`font-semibold ${quest.overdue ? "text-[var(--cd-adm-warn-ink)]" : "text-[var(--cd-adm-ink-quiet)]"}`}>
                      {quest.overdue ? "기한 지남" : quest.dueDate === reminder.data?.period.today ? "오늘" : "예정"} · {formatDateKey(quest.dueDate)}
                    </span>
                    <span className="min-w-0 break-words">{quest.title}</span>
                    <span className="text-[var(--cd-adm-ink-quiet)]">퀘스트 이어하기</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm">오늘과 앞으로 3일 안에 확인할 미완료 일정이 없어요.</p>
        ) : null}
        <Link href="/admin/quests/" className={`${adminButton("primary")} mt-3`}>전체 할 일 보기</Link>
        <p className="mt-2 text-sm text-[var(--cd-adm-ink-quiet)]">화면을 보는 동안 1분마다 확인해요. 문제 알림은 목록을 접어도 표시돼요.</p>
      </div>
    </section>
  );
}
