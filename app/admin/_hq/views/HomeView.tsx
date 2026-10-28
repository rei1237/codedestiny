"use client";

// 별빛 운영본부 · 운영 홈. 보여 주기만 하는 화면 — 데이터는 /admin(실제 API)과 /admin/hq-demo(픽스처)가 넣는다.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellRing, CalendarRange, Coins, RefreshCw, Sparkles, Trophy } from "lucide-react";
import OperationsGuild from "../OperationsGuild";
import { isActiveOperationsQuest } from "@/lib/admin-operations.mjs";
import { adminButton, adminChip } from "../../_components/ui";
import { HQ_ART } from "../art";
import { SvgBarChart, SvgLineChart } from "../charts";
import {
  EmptyState,
  HqImage,
  HqPanel,
  IntegrationPending,
  KeeperLine,
  RankEmblem,
  StatTile,
  StatusBadge,
  Tabs,
  XpBar,
} from "../components";
import { changeRate, formatAgo, formatDateKey, formatKRW, formatNumber, formatRate, formatXp } from "../format";
import { QuestRow } from "../quest-bits";
import type { HqSummary } from "../types";

export const HOME_RANGES = [
  { id: "today", label: "오늘" },
  { id: "7d", label: "최근 7일" },
  { id: "week", label: "이번 주" },
  { id: "28d", label: "최근 28일" },
  { id: "campaign", label: "캠페인 기간" },
] as const;

const SOURCE_LABEL: Record<string, string> = { task: "작업", revenue: "매출", traffic: "참여" };

type TrendMetric = "netKRW" | "xp" | "questsDone";

export interface HomeViewProps {
  data: HqSummary;
  range: string;
  onRangeChange: (range: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** 추이 그래프의 날짜를 눌렀을 때(근거 화면으로 이동). */
  onTrendSelect?: (date: string, metric: TrendMetric) => void;
  ga4Steps?: string[];
}

export default function HomeView({ data, range, onRangeChange, onRefresh, refreshing = false, onTrendSelect, ga4Steps = [] }: HomeViewProps) {
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("netKRW");
  const { xp, metrics, campaign } = data;
  const revenue = metrics.revenue;
  const netRate = changeRate(revenue.netKRW, data.metrics.previous.netKRW);
  const trafficPending = metrics.traffic.status === "integration_pending";
  const heldCount = Object.values(revenue.held || {}).reduce((sum, value) => sum + value, 0);
  const campaignPct = campaign.total ? Math.round((campaign.done / campaign.total) * 100) : 0;
  const funnel = metrics.funnel;
  const focus = data.focus.filter(isActiveOperationsQuest);
  const upcoming = data.upcoming.filter(isActiveOperationsQuest);
  const alerts = data.alerts;

  return (
    <div className="cd-hq-page space-y-4">
      {/* 상단 — 레벨·진행률·오늘 XP·기간·동기화 */}
      <section className="cd-hq-hero p-4 sm:p-6" aria-labelledby="hq-hero-title">
        <HqImage art={HQ_ART.background} className="cd-hq-hero__bg" eager />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <RankEmblem tier={xp.rankTier} size={64} />
            <div className="min-w-0 flex-1">
              <h1 id="hq-hero-title" className="text-xl font-bold leading-tight text-[var(--cd-adm-ink)] sm:text-2xl">
                별빛 운영 길드 <span className="cd-hq-num">Lv {xp.level}</span> <span className="block text-base font-semibold sm:inline">{xp.title}</span>
              </h1>
              <div className="mt-2 max-w-md"><XpBar state={xp} /></div>
              <p className="cd-hq-quiet mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]">
                <span>오늘 <span className="cd-hq-num text-[var(--cd-adm-ink)]">{formatXp(xp.todayXp ?? 0, { signed: true })}</span></span>
                <span>최고 레벨 <span className="cd-hq-num text-[var(--cd-adm-ink)]">Lv {xp.peakLevel}</span></span>
                <span>누적 <span className="cd-hq-num text-[var(--cd-adm-ink)]">{formatXp(xp.totalXp)}</span></span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="집계 기간">
              {HOME_RANGES.map((item) => (
                <button key={item.id} type="button" className={`${adminChip(range === item.id)} min-h-[36px]`} aria-pressed={range === item.id} onClick={() => onRangeChange(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="cd-hq-quiet flex flex-wrap items-center gap-2 text-[12px]">
              <span className="cd-hq-num">{data.period.fromDate === data.period.toDate ? formatDateKey(data.period.fromDate) : `${formatDateKey(data.period.fromDate)} ~ ${formatDateKey(data.period.toDate)}`} · KST</span>
              <span>마지막 동기화 {formatAgo(data.lastSync)}</span>
              {onRefresh ? (
                <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={onRefresh} disabled={refreshing}>
                  <RefreshCw aria-hidden="true" size={14} className={refreshing ? "animate-spin motion-reduce:animate-none" : undefined} /> 새로 보기
                </button>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <OperationsGuild data={data} />

      {/* 최우선 알림 */}
      <section aria-labelledby="hq-alerts-title" className="space-y-2">
        <h2 id="hq-alerts-title" className="sr-only">최우선 알림</h2>
        {alerts.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link href={alert.href} className="cd-hq-row flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <BellRing aria-hidden="true" size={16} className={`cd-hq-tone-${alert.tone} flex-none`} />
                    <span className="min-w-0 text-sm font-semibold text-[var(--cd-adm-ink)]">{alert.label}</span>
                  </span>
                  <StatusBadge tone={alert.tone} label={`${formatNumber(alert.count)}건`} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm"><StatusBadge tone="ok" label="급한 알림 없음" /> <span className="cd-hq-quiet">미제공·복구 대기·확인할 환불·연동 장애가 없습니다.</span></p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {/* 오늘의 핵심 퀘스트 */}
          <HqPanel
            title="오늘의 핵심 퀘스트"
            game="별빛 퀘스트"
            hair
            action={<Link href="/admin/quests/" className={adminButton("neutral", { size: "sm" })}>퀘스트 게시판 <ArrowRight aria-hidden="true" size={14} /></Link>}
          >
            {focus.length ? (
              <ul className="space-y-2">
                {focus.map((quest) => <li key={quest.id}><QuestRow quest={quest} /></li>)}
              </ul>
            ) : (
              <EmptyState art={HQ_ART.yeongnyangiGuide} title="다음 한 걸음을 골라 주세요" body="위의 마스터에게 퀘스트를 받아 시작해요. 이전 SNS 일정은 기록 보관함에서 확인할 수 있어요." />
            )}
            {upcoming.length ? (
              <div className="mt-4">
                <h3 className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">곧 마감</h3>
                <ul className="mt-2 space-y-2">
                  {upcoming.slice(0, 4).map((quest) => <li key={quest.id}><QuestRow quest={quest} /></li>)}
                </ul>
              </div>
            ) : null}
          </HqPanel>

          {/* 지표 */}
          <HqPanel title="성과 지표" game={data.period.label}>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <StatTile label="결제액" value={formatKRW(revenue.grossKRW)} sub={`실결제 ${formatNumber(revenue.orders)}건`} />
              <StatTile label="환불액" value={formatKRW(revenue.refundedKRW)} sub="성공한 환불만" tone={revenue.refundedKRW ? "warn" : undefined} />
              <StatTile
                label="환불 차감 결제액"
                value={formatKRW(revenue.netKRW)}
                sub={`직전 같은 기간 대비 ${formatRate(netRate)}`}
                tone={netRate == null ? undefined : netRate >= 0 ? "ok" : "err"}
              />
              <StatTile
                label="제공 현황"
                value={<>{formatNumber(metrics.delivery.delivered)}<span className="cd-hq-quiet text-sm font-normal"> / {formatNumber(metrics.delivery.orders)}건</span></>}
                sub={metrics.delivery.awaitingDelivery ? `제공 대기 ${formatNumber(metrics.delivery.awaitingDelivery)}건` : "제공 대기 없음"}
                tone={metrics.delivery.awaitingDelivery ? "warn" : undefined}
              />
              <StatTile
                label="유효 참여 세션"
                value={metrics.traffic.engagedSessions == null ? "—" : formatNumber(metrics.traffic.engagedSessions)}
                badge={<StatusBadge tone={trafficPending ? "warn" : metrics.traffic.status === "error" ? "err" : metrics.traffic.status === "connected" ? "ok" : "muted"} label={metrics.traffic.statusLabel} />}
                sub="GA4 engagedSessions"
              />
              <StatTile
                label="XP 보류 주문"
                value={`${formatNumber(heldCount)}건`}
                sub="제공·환불·환율 확인 전에는 매출 XP 를 쌓지 않습니다"
                tone={heldCount ? "warn" : undefined}
              />
            </div>
            <p className="cd-hq-quiet mt-3 text-[12px]">정산액·이익은 원천 자료가 없어 &quot;자료 없음&quot;으로 둡니다. 금액은 거래 시점 원화 기준이며 해외 결제는 원통화를 주문 화면에서 확인할 수 있습니다.</p>
            {trafficPending ? <div className="mt-3"><IntegrationPending title="유효 참여 세션(GA4)" steps={ga4Steps} compact /></div> : null}
            {funnel && Object.keys(funnel).length ? (
              <div className="mt-4">
                <h3 className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">결제창 퍼널</h3>
                <FunnelList funnel={funnel} paid={revenue.orders} /><p className="cd-hq-quiet mt-2 text-xs">행동 이벤트 횟수와 서버의 고유 결제 건수입니다. 동일 사용자의 여정으로 연결되지 않아 구매율로 계산하지 않습니다.</p>
              </div>
            ) : null}
          </HqPanel>

          {/* 추이 */}
          <HqPanel title="주간 추이" game="별의 궤적">
            <Tabs<TrendMetric>
              label="추이 지표"
              value={trendMetric}
              onChange={setTrendMetric}
              items={[
                { id: "netKRW", label: "환불 차감 결제액", icon: Coins },
                { id: "xp", label: "운영 XP", icon: Sparkles },
                { id: "questsDone", label: "완료 퀘스트", icon: CalendarRange },
              ]}
            />
            <div className="mt-3" role="tabpanel">
              {data.trend.length ? (
                trendMetric === "netKRW" ? (
                  <SvgBarChart
                    title="일별 환불 차감 결제액"
                    points={data.trend.map((point) => ({ key: point.date, value: point.netKRW }))}
                    format={formatKRW}
                    onSelect={onTrendSelect ? (date) => onTrendSelect(date, "netKRW") : undefined}
                  />
                ) : trendMetric === "xp" ? (
                  <SvgLineChart
                    title="일별 운영 XP"
                    points={data.trend.map((point) => ({ key: point.date, value: point.xp }))}
                    format={(value) => formatXp(value)}
                    onSelect={onTrendSelect ? (date) => onTrendSelect(date, "xp") : undefined}
                  />
                ) : (
                  <SvgBarChart
                    title="일별 완료 퀘스트"
                    points={data.trend.map((point) => ({ key: point.date, value: point.questsDone }))}
                    format={(value) => `${formatNumber(value)}개`}
                    onSelect={onTrendSelect ? (date) => onTrendSelect(date, "questsDone") : undefined}
                  />
                )
              ) : (
                <EmptyState title="이 기간에는 기록이 없습니다" />
              )}
            </div>
          </HqPanel>

          {/* 캠페인 + Threads */}
          <div className="grid gap-4 md:grid-cols-2">
            <details className="cd-ops-archive"><summary>이전 캠페인 기록</summary>
              <p className="text-sm font-semibold text-[var(--cd-adm-ink)]">{campaign.title}</p>
              <p className="cd-hq-quiet cd-hq-num text-[12px]">{formatDateKey(campaign.period.start)} ~ {formatDateKey(campaign.period.end)} · 계획 {campaign.planVersion}</p>
              <div className="mt-3 cd-hq-xpbar" role="progressbar" aria-label="캠페인 퀘스트 완료율" aria-valuemin={0} aria-valuemax={campaign.total} aria-valuenow={campaign.done} aria-valuetext={`${campaignPct}%`}>
                <div className="cd-hq-xpbar__fill" style={{ width: `${campaignPct}%` }} />
              </div>
              <p className="cd-hq-num mt-2 text-sm text-[var(--cd-adm-ink)]">완료 {formatNumber(campaign.done)} / {formatNumber(campaign.total)} ({campaignPct}%)</p>
              <p className="cd-hq-quiet cd-hq-num text-[12px]">자동 발행 확인 {formatNumber(campaign.autoConfirmed)} / {formatNumber(campaign.autoTotal)}</p>
            </details>
            <HqPanel title="이번 원정의 목적" game="WordPress">
              <p className="text-sm">질문에 답하는 원문 → 검색 발견 → 상담 이동 → 확인된 결제.</p>
              <p className="cd-hq-quiet mt-3 text-sm">발행 수보다 독자에게 도움이 되는 한 편을 완성해요. 공개·예약은 WordPress에서 직접 결정합니다.</p>
              <Link href="/admin/wordpress/" className={`${adminButton("primary")} mt-3`}>편집 원정 이어가기 <ArrowRight size={16} aria-hidden="true" /></Link>
            </HqPanel>
          </div>
        </div>

        {/* 보조 열 */}
        <aside className="space-y-4 lg:col-span-4" aria-label="안내와 기록">
          <HqPanel title="Threads 대화 원정" game="연이의 작업실"><p className="text-sm">짧은 글을 검토하고 기존 발행 상태를 확인해요. 공개는 사용자 확인 후 진행합니다.</p><Link href="/admin/threads/" className={adminButton("primary")}>Threads 작업실 열기</Link></HqPanel>
          <HqPanel title="최근 XP 변동" game="별빛 원장" action={<Link href="/admin/growth/" className={adminButton("neutral", { size: "sm" })}>전체</Link>}>
            {data.recentXp.length ? (
              <ul className="space-y-2">
                {data.recentXp.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="text-[var(--cd-adm-ink)]">{row.sourceLabel || SOURCE_LABEL[row.sourceType] || row.sourceType}{row.masteryLabel ? ` · ${row.masteryLabel}` : ""}</span>
                      <span className="cd-hq-quiet block text-[11px]">{row.reason || row.bucket} · {formatAgo(row.processedAt)}</span>
                    </span>
                    <span className={`cd-hq-num flex-none font-semibold ${row.delta < 0 ? "cd-hq-tone-err" : "cd-hq-tone-ok"}`}>{formatXp(row.delta, { signed: true })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cd-hq-quiet text-sm">아직 쌓인 XP 기록이 없습니다.</p>
            )}
          </HqPanel>

          <HqPanel title="업적" game="별자리 기록" action={<Trophy aria-hidden="true" size={16} className="cd-hq-quiet" />}>
            <ul className="grid grid-cols-1 gap-2">
              {data.achievements.slice(0, 6).map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-[13px]">
                  <StatusBadge tone={item.unlocked ? "ok" : "muted"} label={item.unlocked ? "달성" : "미달성"} />
                  <span className="min-w-0">
                    <span className="text-[var(--cd-adm-ink)]">{item.game} · {item.label}</span>
                    <span className="cd-hq-quiet block text-[11px]">{item.unlocked ? formatAgo(item.achievedAt) : item.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          </HqPanel>
        </aside>
      </div>
    </div>
  );
}

const FUNNEL_STEPS = [
  { key: "checkout_opened", label: "결제창 열림" },
  { key: "checkout_option_click", label: "옵션 선택" },
  { key: "checkout_pg_opened", label: "결제사 창 열림" },
];

export function FunnelList({ funnel, paid }: { funnel: Record<string, number>; paid: number }) {
  const first = funnel.checkout_opened || 0;
  const rows = [...FUNNEL_STEPS.map((step) => ({ ...step, count: funnel[step.key] || 0 })), { key: "paid", label: "실결제(서버 기준)", count: paid }];
  return (
    <ol className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-[var(--cd-adm-ink)]">{row.label}</span>
          <span className="cd-hq-num cd-hq-quiet">
            {formatNumber(row.count)}{row.key === "paid" ? "건" : "회"}
          </span>
        </li>
      ))}
      {funnel.checkout_dismissed ? (
        <li className="flex items-center justify-between gap-2 text-[13px]">
          <span className="cd-hq-quiet">결제창 닫음</span>
          <span className="cd-hq-num cd-hq-quiet">{formatNumber(funnel.checkout_dismissed)}</span>
        </li>
      ) : null}
    </ol>
  );
}
