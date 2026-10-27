"use client";

// 관측소 연결 · 연결 상태. 원천마다 연결 여부·마지막 성공·집계 기간·지연·오류를 보여 주고 재집계를 연다.
// 🔴 Threads 는 기록을 읽기만 한다. 이 화면에는 발행(/run)을 부르는 버튼이 없다.

import { RefreshCw } from "lucide-react";
import { adminButton } from "../../_components/ui";
import { HQ_ART } from "../art";
import { HqNotice, HqPageHeader, HqPanel, IntegrationPending, KeeperLine, StatusBadge } from "../components";
import { formatAgo, formatDateTime, formatNumber } from "../format";
import type { ConnectionRow, ConnectionsResponse, Tone } from "../types";

const STATUS_TONE: Record<ConnectionRow["status"], Tone> = { ok: "ok", stale: "warn", error: "err", integration_pending: "warn", never: "muted" };

function formatLag(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}분`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)}시간`;
  return `${Math.round(minutes / 1440)}일`;
}

export interface ConnectionsViewProps {
  data: ConnectionsResponse;
  busy?: "sync" | "full" | "plan" | null;
  notice?: { tone: Tone; text: string } | null;
  onSync?: (full: boolean) => void;
  onSyncPlan?: () => void;
}

export default function ConnectionsView({ data, busy = null, notice = null, onSync }: ConnectionsViewProps) {
  const activeSources = data.sources.filter(row => !/campaign|plan/i.test(row.id));
  const troubled = activeSources.filter((row) => row.status === "error" || row.status === "stale");
  return (
    <div className="cd-hq-page space-y-4">
      <HqPageHeader
        game="관측소 연결"
        label="연결 상태"
        description="결제·발행·분석 원천을 어디까지 읽어 왔는지 보여 줍니다. 숫자가 이상하면 여기부터 확인하세요."
        actions={onSync ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminButton("primary", { size: "sm" })} onClick={() => onSync(false)} disabled={Boolean(busy)} aria-busy={busy === "sync"}>
              <RefreshCw aria-hidden="true" size={14} className={busy === "sync" ? "motion-safe:animate-spin" : undefined} /> 재집계
            </button>
            <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={() => onSync(true)} disabled={Boolean(busy)} aria-busy={busy === "full"}>
              전체 기간 다시 계산
            </button>
          </div>
        ) : undefined}
      />

      {notice ? <HqNotice tone={notice.tone}>{notice.text}</HqNotice> : null}
      {troubled.length ? (
        <KeeperLine art={HQ_ART.neoGuardian} name="네오">
          {troubled.map((row) => row.label).join(", ")} 원천이 {troubled.some((row) => row.status === "error") ? "오류 상태" : "늦어지고"} 있습니다. 이 원천에 기대는 지표·XP 는 마지막 성공 시점 값입니다.
        </KeeperLine>
      ) : null}

      <HqPanel title="원천별 동기화" game="관측 기록">
        <ul className="space-y-2">
          {activeSources.map((row) => (
            <li key={row.id} className="cd-hq-panel2 rounded-[var(--cd-adm-radius)] p-3 text-[13px]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--cd-adm-ink)]">{row.game} · {row.label}</p>
                  <p className="cd-hq-quiet text-[12px]">{row.detail}</p>
                </div>
                <StatusBadge tone={STATUS_TONE[row.status]} label={row.statusLabel} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4">
                <div><dt className="cd-hq-quiet">마지막 성공</dt><dd className="cd-hq-num text-[var(--cd-adm-ink)]" title={formatDateTime(row.lastSuccessAt)}>{row.lastSuccessAt ? formatAgo(row.lastSuccessAt) : "없음"}</dd></div>
                <div><dt className="cd-hq-quiet">지연</dt><dd className="cd-hq-num text-[var(--cd-adm-ink)]">{formatLag(row.lagMinutes)}</dd></div>
                <div><dt className="cd-hq-quiet">마지막 실행</dt><dd className="cd-hq-num text-[var(--cd-adm-ink)]">{row.lastRunAt ? formatAgo(row.lastRunAt) : "없음"}</dd></div>
                <div><dt className="cd-hq-quiet">집계 기간</dt><dd className="cd-hq-num text-[var(--cd-adm-ink)]">{row.window?.since || row.window?.until ? `${row.window?.since ? formatDateTime(row.window.since) : "처음"} ~ ${row.window?.until ? formatDateTime(row.window.until) : "지금"}` : "—"}</dd></div>
              </dl>
              {row.counts && Object.keys(row.counts).length ? (
                <p className="cd-hq-quiet mt-1 text-[12px]">{Object.entries(row.counts).map(([key, value]) => `${key} ${formatNumber(value)}`).join(" · ")}</p>
              ) : null}
              {row.planVersion ? <p className="cd-hq-quiet mt-1 text-[12px]">계획 판 <code>{row.planVersion}</code></p> : null}
              {row.lastError ? <p className="cd-hq-tone-err mt-1 text-[12px]">{row.lastError.message}{row.lastError.at ? ` (${formatDateTime(row.lastError.at)})` : ""}</p> : null}
              {row.missing.length ? <p className="cd-hq-tone-warn mt-1 text-[12px]">필요한 설정: {row.missing.join(", ")}</p> : null}
            </li>
          ))}
        </ul>
        <p className="cd-hq-quiet mt-3 text-[12px]">자동 집계 주기 <code>{data.cron.schedule}</code> · {data.cron.note}</p>
      </HqPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <HqPanel title="GA4 유효 참여 세션" game="별빛 관측">
          {data.ga4.ready ? (
            <p className="flex items-center gap-2 text-[13px]"><StatusBadge tone="ok" label="자격 증명 준비됨" /> 다음 집계부터 일별 세션을 가져옵니다.</p>
          ) : (
            <IntegrationPending title="GA4 Data API" missing={data.ga4.missing} steps={data.ga4.steps} />
          )}
        </HqPanel>

        <HqPanel title="WordPress 작업실" game="연이의 편집 원정">
          <p className="text-sm">현재 집중 발행처입니다. 계정 상태는 편집기에서 직접 확인합니다. 자동 발행이나 통계 API 연결을 뜻하지 않습니다.</p>
          <a className={adminButton("primary")} href="/admin/wordpress/">작업실 열기</a>
          </HqPanel><HqPanel title="Threads 작업실" game="대화와 발행 기록">
            <p>현재 서버 설정: <code>{data.threads.mode}</code></p>
            <p>{data.threads.note}</p>
            <p>원고는 스튜디오에서 검토하고 공개는 직접 확인해요. 이 화면을 열어도 자동 발행 설정은 바뀌지 않아요.</p>
            <a className={adminButton("primary")} href="/admin/threads/">Threads 작업실 열기</a>
        </HqPanel>
      </div>
    </div>
  );
}
