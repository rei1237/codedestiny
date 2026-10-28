"use client";

// 성장 기록 · 성과와 XP. 운영 XP 는 고객 월정석·이용권과 별개의 내부 지표다.
// 🔴 XP·금액은 서버 원장을 보여 주기만 한다. 목표값과 백필 시작일만 바꿀 수 있고, 백필은 미리보기 → 확인 두 단계다.

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, History, Target } from "lucide-react";
import { ADMIN_INPUT, adminButton } from "../../_components/ui";
import { HQ_ART } from "../art";
import { SvgBarChart, SvgLineChart } from "../charts";
import {
  EmptyState,
  HqNotice,
  HqPageHeader,
  HqPanel,
  IntegrationPending,
  KeeperLine,
  RankEmblem,
  StatTile,
  StatusBadge,
  Tabs,
  XpBar,
} from "../components";
import { formatAgo, formatDateKey, formatDateTime, formatKRW, formatNumber, formatXp, kstToday } from "../format";
import { FunnelList } from "./HomeView";
import type { Achievement, HqSummary, LedgerRow, Tone, TrafficData, XpResponse } from "../types";

export interface GrowthGoals { weeklyNetKRW: number | null; weeklyPublishes: number | null; weeklyEngagedSessions: number | null }

export interface BackfillPreview {
  dryRun: true;
  currentSince: string | null;
  currentRevenueXp: number;
  preview: { since: string; orders: number; counts: { counted: number; held: number; excluded: number }; holdReasons: Record<string, number>; netKRW: number; targetXp: number; truncated: boolean };
  deltaXp: number;
  holdLabels: Record<string, string>;
}

export interface GrowthViewProps {
  xp: XpResponse;
  summary: HqSummary | null;
  traffic: { traffic: TrafficData; setup: string[] } | null;
  achievements: Achievement[];
  revenueSince: string | null;
  highlightDate?: string | null;
  onSaveGoals?: (goals: GrowthGoals) => Promise<string | null>;
  onPreviewBackfill?: (since: string) => Promise<BackfillPreview>;
  onApplyBackfill?: (since: string) => Promise<string>;
}

type LedgerFilter = "all" | "task" | "revenue" | "traffic";

const SOURCE_LABEL: Record<string, string> = { task: "작업", revenue: "매출", traffic: "참여" };

function ledgerDate(row: LedgerRow) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.occurredAt));
}

export default function GrowthView({ xp, summary, traffic, achievements, revenueSince, highlightDate, onSaveGoals, onPreviewBackfill, onApplyBackfill }: GrowthViewProps) {
  const { state, rules } = xp;
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const [dateOnly, setDateOnly] = useState<string | null>(highlightDate || null);
  const ledger = useMemo(
    () => xp.ledger.filter((row) => (ledgerFilter === "all" || row.sourceType === ledgerFilter) && (!dateOnly || ledgerDate(row) === dateOnly)),
    [xp.ledger, ledgerFilter, dateOnly],
  );
  const total = Math.max(1, state.bySource.task + state.bySource.revenue + state.bySource.traffic);
  const trafficData = traffic?.traffic || null;
  const trafficPending = trafficData?.status === "integration_pending";
  const nextTitle = xp.titles.find((item) => item.from > state.level) || null;
  const upcomingLevels = xp.levels.filter((row) => row.level > state.level).slice(0, 5);

  return (
    <div className="cd-hq-page space-y-4">
      <HqPageHeader game="성장 기록" label="성과와 XP" description="검증된 작업·실결제·참여로만 쌓이는 운영 XP 입니다. 고객 월정석·이용권과 섞이지 않습니다." />

      <div className="grid gap-4 lg:grid-cols-12">
        <HqPanel title="현재 레벨" game="별빛 문장" hair className="lg:col-span-5">
          <div className="flex items-center gap-4">
            <RankEmblem tier={state.rankTier} size={72} />
            <div className="min-w-0 flex-1">
              <XpBar state={state} />
              <p className="cd-hq-quiet mt-2 text-[12px]">
                누적 <span className="cd-hq-num text-[var(--cd-adm-ink)]">{formatXp(state.totalXp)}</span> · 최고 레벨 <span className="cd-hq-num text-[var(--cd-adm-ink)]">Lv {state.peakLevel}</span>
                {state.peakLevel > state.level ? <span> (환불 정정으로 현재 레벨이 최고보다 낮습니다)</span> : null}
              </p>
              {nextTitle ? <p className="cd-hq-quiet mt-1 text-[12px]">다음 칭호: Lv {nextTitle.from} {nextTitle.title}</p> : null}
            </div>
          </div>
          <p className="cd-hq-quiet mt-3 text-[11px]">규칙 {rules.version} · 필요 XP {xp.formula.toNext} · 진입 기준 {xp.formula.start}</p>
        </HqPanel>

        <HqPanel title="출처별 XP" game="세 갈래 별빛" className="lg:col-span-7">
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="작업" value={formatXp(state.bySource.task)} sub={`하루 최대 ${formatXp(rules.dailyTaskCap)}`} />
            <StatTile label="매출" value={formatXp(state.bySource.revenue)} sub={`환불 차감 ${formatKRW(rules.revenue.krwPerStep)}마다 ${formatXp(rules.revenue.xpPerStep)}`} />
            <StatTile
              label="참여"
              value={trafficPending ? "—" : formatXp(state.bySource.traffic)}
              badge={trafficPending ? <StatusBadge tone="warn" label="연동 대기" /> : undefined}
              sub={`유효 세션 ${rules.traffic.sessionsPerXp}회마다 1 XP · 하루 최대 ${rules.traffic.dailyCap}`}
            />
          </div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[var(--cd-adm-field)]" role="img" aria-label={`작업 ${Math.round((state.bySource.task / total) * 100)}%, 매출 ${Math.round((state.bySource.revenue / total) * 100)}%, 참여 ${Math.round((state.bySource.traffic / total) * 100)}%`}>
            <span style={{ width: `${(state.bySource.task / total) * 100}%`, background: "var(--cd-adm-accent)" }} />
            <span style={{ width: `${(state.bySource.revenue / total) * 100}%`, background: "var(--cd-adm-gold)" }} />
            <span style={{ width: `${(Math.max(0, state.bySource.traffic) / total) * 100}%`, background: "var(--cd-adm-ok)" }} />
          </div>
          {Object.keys(state.byMastery || {}).length ? (
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
              {Object.entries(state.byMastery).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-2"><span className="cd-hq-quiet">{xp.masteryLabels[key] || key}</span><span className="cd-hq-num text-[var(--cd-adm-ink)]">{formatXp(value)}</span></li>
              ))}
            </ul>
          ) : null}
        </HqPanel>
      </div>

      {summary ? (
        <HqPanel title="최근 28일 기록" game="별의 궤적">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-[var(--cd-adm-ink)]">일별 운영 XP</h3>
              <SvgLineChart title="일별 운영 XP" points={summary.trend.map((point) => ({ key: point.date, value: point.xp }))} format={(value) => formatXp(value)} onSelect={setDateOnly} />
            </div>
            <div>
              <h3 className="mb-1 text-[13px] font-semibold text-[var(--cd-adm-ink)]">일별 환불 차감 결제액</h3>
              <SvgBarChart title="일별 환불 차감 결제액" points={summary.trend.map((point) => ({ key: point.date, value: point.netKRW }))} format={formatKRW} onSelect={setDateOnly} />
            </div>
          </div>
          <p className="cd-hq-quiet mt-2 text-[12px]">점·막대를 누르면 아래 XP 원장이 그날 기록만 보여 줍니다.</p>
          {summary.metrics.funnel && Object.keys(summary.metrics.funnel).length ? (
            <div className="mt-4">
              <h3 className="text-[13px] font-semibold text-[var(--cd-adm-ink)]">결제 퍼널(1차 수집)</h3>
              <FunnelList funnel={summary.metrics.funnel} paid={summary.metrics.revenue.orders} />
              <p className="cd-hq-quiet mt-1 text-[11px]">분모는 결제창 열림입니다. 실결제는 서버 결제 기록 기준이라 결제창을 거치지 않은 주문도 포함될 수 있습니다.</p>
            </div>
          ) : null}
        </HqPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <HqPanel
          title="XP 원장"
          game="별빛 원장"
          className="lg:col-span-7"
          action={dateOnly ? <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={() => setDateOnly(null)}>{formatDateKey(dateOnly)} 필터 해제</button> : undefined}
        >
          <Tabs<LedgerFilter>
            label="원장 출처"
            value={ledgerFilter}
            onChange={setLedgerFilter}
            items={[{ id: "all", label: "전체" }, { id: "task", label: "작업" }, { id: "revenue", label: "매출" }, { id: "traffic", label: "참여" }]}
          />
          <div role="tabpanel" className="mt-3">
            {ledger.length ? (
              <ul className="divide-y divide-[var(--cd-adm-line)]">
                {ledger.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 text-[var(--cd-adm-ink)]">
                        {row.sourceLabel || SOURCE_LABEL[row.sourceType] || row.sourceType}{row.masteryLabel ? ` · ${row.masteryLabel}` : ""}
                        {row.correction ? <StatusBadge tone="warn" label="정정" /> : null}
                      </span>
                      <span className="cd-hq-quiet block text-[11px]">{formatDateTime(row.occurredAt)} · {row.reason || row.bucket} · 근거 {row.sourceIds.length}건 · {row.ruleVersion}</span>
                    </span>
                    <span className={`cd-hq-num flex-none font-semibold ${row.delta < 0 ? "cd-hq-tone-err" : "cd-hq-tone-ok"}`}>{formatXp(row.delta, { signed: true })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={dateOnly ? "그날 쌓인 XP 기록이 없습니다" : "아직 XP 기록이 없습니다"} body="퀘스트를 증빙과 함께 완료하거나, 실결제가 제공까지 확인되면 쌓입니다." art={HQ_ART.yeongnyangiFocus} />
            )}
          </div>
        </HqPanel>

        <div className="space-y-4 lg:col-span-5">
          <HqPanel title="레벨과 칭호" game="별자리 표">
            <table className="w-full text-[13px]">
              <caption className="sr-only">칭호별 진입 레벨과 필요 XP</caption>
              <thead><tr className="cd-hq-quiet text-left text-[12px]"><th scope="col" className="py-1 font-normal">레벨</th><th scope="col" className="py-1 font-normal">칭호</th><th scope="col" className="py-1 text-right font-normal">누적 XP</th></tr></thead>
              <tbody>
                {xp.rankTiers.map((level, index) => {
                  const row = xp.levels.find((item) => item.level === level);
                  const reached = state.level >= level;
                  return (
                    <tr key={level} className="border-t border-[var(--cd-adm-line)]">
                      <td className="py-1.5"><span className="flex items-center gap-2"><RankEmblem tier={index} size={24} /><span className="cd-hq-num text-[var(--cd-adm-ink)]">Lv {level}</span></span></td>
                      <td className="py-1.5 text-[var(--cd-adm-ink)]">{row?.title || ""} {reached ? <StatusBadge tone="ok" label="도달" /> : null}</td>
                      <td className="cd-hq-num py-1.5 text-right text-[var(--cd-adm-ink)]">{formatNumber(row?.startXp ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {upcomingLevels.length ? (
              <p className="cd-hq-quiet mt-2 text-[12px]">다음 레벨: {upcomingLevels.map((row) => `Lv ${row.level} ${formatNumber(row.startXp)}`).join(" · ")}</p>
            ) : null}
          </HqPanel>

          <HqPanel title="업적" game="별자리 기록">
            <ul className="space-y-2">
              {achievements.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-[13px]">
                  <StatusBadge tone={item.unlocked ? "ok" : "muted"} label={item.unlocked ? "달성" : "미달성"} />
                  <span className="min-w-0">
                    <span className="text-[var(--cd-adm-ink)]">{item.game} · {item.label}</span>
                    <span className="cd-hq-quiet block text-[11px]">{item.unlocked ? `${formatDateTime(item.achievedAt)} 달성` : item.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="cd-hq-quiet mt-2 text-[11px]">업적은 장식 보상이며 XP 를 주지 않습니다.</p>
          </HqPanel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HqPanel title="유효 참여 세션" game="관측소 · GA4" action={trafficData?.lastSuccessAt ? <span className="cd-hq-quiet text-[12px]">마지막 수집 {formatAgo(trafficData.lastSuccessAt)}</span> : undefined}>
          {trafficPending ? (
            <div className="space-y-3">
              <KeeperLine art={HQ_ART.neoGuardian} name="네오">GA4 가 아직 연결되지 않았습니다. 연결 전까지 참여 XP 는 0 이 아니라 &quot;연동 대기&quot;로 둡니다.</KeeperLine>
              <IntegrationPending title="GA4 Data API" missing={trafficData?.missing || []} steps={traffic?.setup || []} />
            </div>
          ) : !trafficData ? (
            <p className="cd-hq-quiet text-[13px]">참여 세션 기록을 아직 불러오지 못했습니다.</p>
          ) : (
            <div className="space-y-3">
              <p className="flex flex-wrap items-center gap-2 text-[13px]">
                <StatusBadge tone={trafficData.status === "connected" ? "ok" : trafficData.status === "error" ? "err" : "muted"} label={trafficData.statusLabel} />
                {trafficData.timeZoneMismatch ? <StatusBadge tone="warn" label="GA4 속성 시간대가 KST 가 아님" /> : null}
                {trafficData.lastError ? <span className="cd-hq-tone-err">{trafficData.lastError.message}</span> : null}
              </p>
              {trafficData.rows.length ? (
                <SvgBarChart
                  title="일별 유효 참여 세션"
                  points={trafficData.rows.map((row) => ({ key: row.date, value: row.engagedSessions }))}
                  format={(value) => `${formatNumber(value)}회`}
                />
              ) : <p className="cd-hq-quiet text-[13px]">아직 수집된 날이 없습니다.</p>}
              <p className="cd-hq-quiet text-[11px]">{trafficData.attribution.label} — {trafficData.attribution.note}</p>
            </div>
          )}
        </HqPanel>

        <div className="space-y-4">
          {summary && onSaveGoals ? <GoalsPanel goals={summary.goals} onSave={onSaveGoals} /> : null}
          {onPreviewBackfill && onApplyBackfill ? <BackfillPanel revenueSince={revenueSince} onPreview={onPreviewBackfill} onApply={onApplyBackfill} /> : null}
        </div>
      </div>

      <p className="cd-hq-quiet text-[12px]">주문별 XP 반영·보류 사유는 <Link href="/admin/orders/" className="cd-hq-focus underline">주문과 결제</Link> 화면의 각 주문에서 볼 수 있습니다.</p>
    </div>
  );
}

function GoalsPanel({ goals, onSave }: { goals: GrowthGoals; onSave: (goals: GrowthGoals) => Promise<string | null> }) {
  const [form, setForm] = useState({
    weeklyNetKRW: goals.weeklyNetKRW == null ? "" : String(goals.weeklyNetKRW),
    weeklyPublishes: goals.weeklyPublishes == null ? "" : String(goals.weeklyPublishes),
    weeklyEngagedSessions: goals.weeklyEngagedSessions == null ? "" : String(goals.weeklyEngagedSessions),
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);
  const toValue = (value: string) => (value.trim() === "" ? null : Number(value));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const error = await onSave({ weeklyNetKRW: toValue(form.weeklyNetKRW), weeklyPublishes: toValue(form.weeklyPublishes), weeklyEngagedSessions: toValue(form.weeklyEngagedSessions) });
    setNotice(error ? { tone: "err", text: error } : { tone: "ok", text: "주간 목표를 저장했습니다." });
    setBusy(false);
  };
  const field = (key: keyof typeof form, label: string, unit: string) => (
    <label className="block text-[12px]">
      <span className="cd-hq-quiet">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input type="number" min={0} inputMode="numeric" className={`${ADMIN_INPUT} min-h-[44px] w-full`} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder="비워 두면 목표 없음" />
        <span className="cd-hq-quiet flex-none">{unit}</span>
      </span>
    </label>
  );
  return (
    <HqPanel title="주간 목표" game="다음 별자리" action={<Target aria-hidden="true" size={16} className="cd-hq-quiet" />}>
      <form className="space-y-2" onSubmit={submit}>
        {notice ? <HqNotice tone={notice.tone}>{notice.text}</HqNotice> : null}
        {field("weeklyNetKRW", "환불 차감 결제액", "원")}
        {field("weeklyPublishes", "채널 발행", "건")}
        {field("weeklyEngagedSessions", "유효 참여 세션", "회")}
        <button type="submit" className={adminButton("primary", { size: "sm" })} disabled={busy}>목표 저장</button>
      </form>
    </HqPanel>
  );
}

function BackfillPanel({ revenueSince, onPreview, onApply }: { revenueSince: string | null; onPreview: (since: string) => Promise<BackfillPreview>; onApply: (since: string) => Promise<string> }) {
  const [since, setSince] = useState(revenueSince || "2026-10-12");
  const [preview, setPreview] = useState<BackfillPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);

  const runPreview = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setConfirming(false);
    try {
      setPreview(await onPreview(since));
    } catch (caught) {
      setPreview(null);
      setNotice({ tone: "err", text: caught instanceof Error ? caught.message : "미리보기를 만들지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    setNotice(null);
    try {
      setNotice({ tone: "ok", text: await onApply(since) });
      setPreview(null);
      setConfirming(false);
    } catch (caught) {
      setNotice({ tone: "err", text: caught instanceof Error ? caught.message : "백필을 적용하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <HqPanel title="과거 매출 XP 반영" game="지난 별빛 모으기" action={<History aria-hidden="true" size={16} className="cd-hq-quiet" />}>
      <div className="space-y-3 text-[13px]">
        <p className="cd-hq-quiet">지정한 날짜 이후의 실결제를 다시 판정해 매출 XP 를 맞춥니다. 먼저 미리보기로 바뀔 값을 확인하세요. 과거 레벨업 연출은 다시 나오지 않습니다.</p>
        <p className="text-[var(--cd-adm-ink)]">현재 반영 시작일: <span className="cd-hq-num">{revenueSince ? formatDateKey(revenueSince) : "설정 안 됨"}</span></p>
        {notice ? <HqNotice tone={notice.tone}>{notice.text}</HqNotice> : null}
        <form className="flex flex-wrap items-end gap-2" onSubmit={runPreview}>
          <label className="text-[12px]">
            <span className="cd-hq-quiet">시작 날짜</span>
            <input type="date" min="2024-01-01" max={kstToday()} className={`${ADMIN_INPUT} mt-1 block min-h-[44px]`} value={since} onChange={(event) => { setSince(event.target.value); setPreview(null); }} required />
          </label>
          <button type="submit" className={adminButton("neutral", { size: "sm" })} disabled={busy}><Eye aria-hidden="true" size={14} /> 미리보기</button>
        </form>
        {preview ? (
          <div className="cd-hq-panel2 space-y-2 rounded-[var(--cd-adm-radius)] p-3" aria-live="polite">
            <p className="font-semibold text-[var(--cd-adm-ink)]">{formatDateKey(preview.preview.since)} 이후 실결제 {formatNumber(preview.preview.orders)}건{preview.preview.truncated ? " (5,000건까지만 계산)" : ""}</p>
            <ul className="grid grid-cols-3 gap-2 text-center">
              <li><span className="cd-hq-quiet block text-[11px]">반영</span><span className="cd-hq-num cd-hq-tone-ok">{formatNumber(preview.preview.counts.counted)}</span></li>
              <li><span className="cd-hq-quiet block text-[11px]">보류</span><span className="cd-hq-num cd-hq-tone-warn">{formatNumber(preview.preview.counts.held)}</span></li>
              <li><span className="cd-hq-quiet block text-[11px]">제외</span><span className="cd-hq-num text-[var(--cd-adm-ink)]">{formatNumber(preview.preview.counts.excluded)}</span></li>
            </ul>
            {Object.keys(preview.preview.holdReasons).length ? (
              <ul className="cd-hq-quiet text-[12px]">
                {Object.entries(preview.preview.holdReasons).map(([key, count]) => <li key={key}>{preview.holdLabels[key] || key}: {formatNumber(count)}건</li>)}
              </ul>
            ) : null}
            <p className="text-[var(--cd-adm-ink)]">환불 차감 결제액 <span className="cd-hq-num">{formatKRW(preview.preview.netKRW)}</span> → 매출 XP <span className="cd-hq-num">{formatXp(preview.preview.targetXp)}</span></p>
            <p className="text-[var(--cd-adm-ink)]">지금 대비 변화 <span className={`cd-hq-num font-semibold ${preview.deltaXp < 0 ? "cd-hq-tone-err" : "cd-hq-tone-ok"}`}>{formatXp(preview.deltaXp, { signed: true })}</span></p>
            {!confirming ? (
              <button type="button" className={adminButton("warn", { size: "sm" })} onClick={() => setConfirming(true)} disabled={busy}>이 기준으로 적용…</button>
            ) : (
              <div className="space-y-2">
                <p className="cd-hq-tone-warn text-[12px]">반영 시작일을 {formatDateKey(since)}로 바꾸고 매출 XP 를 다시 계산합니다. 원장에는 차이만 정정 기록으로 남습니다.</p>
                <div className="flex gap-2">
                  <button type="button" className={adminButton("warn", { size: "sm" })} onClick={apply} disabled={busy}>적용 확인</button>
                  <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={() => setConfirming(false)} disabled={busy}>취소</button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </HqPanel>
  );
}
