"use client";

// 별빛 퀘스트 · 마케팅 일정. 같은 퀘스트 목록을 리스트·주간·월간·칸반 네 가지로 본다.
// 🔴 끌어 옮기기(드래그) 대신 드로어의 "상태 이동" 버튼을 쓴다 — 터치·키보드에서도 같은 동작.

import { useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Rows3 } from "lucide-react";
import { ADMIN_INPUT, adminButton, adminChip } from "../../_components/ui";
import { HQ_ART } from "../art";
import { EmptyState, HqPanel, StatusBadge, Tabs } from "../components";
import { addDays, formatDateKey, formatNumber, formatXp, weekStart } from "../format";
import { QuestBadges, QuestRow, STATUS_TONE, questTone } from "../quest-bits";
import type { Quest, QuestMeta, WorkBundle } from "../types";

export type QuestViewMode = "list" | "week" | "month" | "kanban";

export interface QuestFilters {
  channel: string;
  language: string;
  kind: string;
  status: string;
  overdue: boolean;
}

export const EMPTY_FILTERS: QuestFilters = { channel: "", language: "", kind: "", status: "", overdue: false };

const KANBAN_COLUMNS = ["scheduled", "in_progress", "review", "done", "on_hold"];
const LANGUAGE_LABELS: Record<string, string> = { ko: "한국어", en: "영어", ja: "일본어" };

export function applyQuestFilters(items: Quest[], filters: QuestFilters): Quest[] {
  return items.filter((quest) => (
    (!filters.channel || quest.channel === filters.channel)
    && (!filters.language || quest.language === filters.language)
    && (!filters.kind || quest.kind === filters.kind)
    && (!filters.status || quest.status === filters.status)
    && (!filters.overdue || (quest.overdue && quest.status !== "done"))
  ));
}

function groupByDate(items: Quest[]) {
  const map = new Map<string, Quest[]>();
  for (const quest of items) {
    const list = map.get(quest.plannedDate) || [];
    list.push(quest);
    map.set(quest.plannedDate, list);
  }
  for (const list of map.values()) list.sort((a, b) => String(a.plannedTime || "").localeCompare(String(b.plannedTime || "")) || a.id.localeCompare(b.id));
  return map;
}

export interface QuestsViewProps {
  items: Quest[];
  meta: QuestMeta;
  bundles: WorkBundle[];
  today: string;
  view: QuestViewMode;
  onViewChange: (view: QuestViewMode) => void;
  anchor: string;
  onAnchorChange: (date: string) => void;
  filters: QuestFilters;
  onFiltersChange: (filters: QuestFilters) => void;
  onOpen: (id: string) => void;
  /** from/to 로 범위를 좁혀 들어왔을 때 보여 줄 안내와 해제. */
  rangeNote?: string | null;
  onClearRange?: () => void;
}

export default function QuestsView(props: QuestsViewProps) {
  const { items, meta, bundles, today, view, onViewChange, anchor, onAnchorChange, filters, onFiltersChange, onOpen, rangeNote, onClearRange } = props;
  const filtered = useMemo(() => applyQuestFilters(items, filters), [items, filters]);
  const counts = useMemo(() => {
    const open = items.filter((quest) => ["scheduled", "in_progress", "review"].includes(quest.status));
    return {
      today: open.filter((quest) => quest.plannedDate === today).length,
      overdue: items.filter((quest) => quest.overdue && quest.status !== "done").length,
      review: items.filter((quest) => quest.status === "review").length,
      done: items.filter((quest) => quest.status === "done").length,
    };
  }, [items, today]);
  const channels = useMemo(() => Array.from(new Set(items.map((quest) => quest.channel))), [items]);
  const languages = useMemo(() => Array.from(new Set(items.map((quest) => quest.language).filter(Boolean))), [items]);
  const kinds = useMemo(() => Array.from(new Set(items.map((quest) => quest.kind))), [items]);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const set = (patch: Partial<QuestFilters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryChip label="오늘 남은 작업" value={counts.today} />
        <SummaryChip label="기한 경과" value={counts.overdue} tone={counts.overdue ? "err" : undefined} onClick={() => set({ overdue: !filters.overdue })} pressed={filters.overdue} />
        <SummaryChip label="검토 대기" value={counts.review} tone={counts.review ? "info" : undefined} onClick={() => set({ status: filters.status === "review" ? "" : "review" })} pressed={filters.status === "review"} />
        <SummaryChip label="완료" value={counts.done} tone="ok" />
      </div>

      {bundles.length ? (
        <HqPanel title="짧게 끝낼 업무 묶음" game="원정 준비">
          <ul className="grid gap-2 sm:grid-cols-3">
            {bundles.map((bundle) => (
              <li key={bundle.minutes} className="cd-hq-panel2 rounded-[var(--cd-adm-radius)] p-3 text-[13px]">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-[var(--cd-adm-ink)]">{bundle.minutes}분 묶음 <span className="cd-hq-quiet cd-hq-num font-normal">({bundle.used}분)</span></span>
                  <span className="cd-hq-num cd-hq-tone-accent">{formatXp(bundle.xp, { signed: true })}</span>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {bundle.quests.length ? bundle.quests.map((item) => (
                    <li key={item.id}>
                      <button type="button" className="cd-hq-focus min-h-[32px] w-full rounded text-left text-[var(--cd-adm-ink)] underline-offset-2 hover:underline" onClick={() => onOpen(item.id)}>
                        {item.title} <span className="cd-hq-quiet">· {item.kindLabel} {item.minutes}분{item.overdue ? " · 기한 경과" : ""}</span>
                      </button>
                    </li>
                  )) : <li className="cd-hq-quiet">맞는 작업 없음</li>}
                </ul>
              </li>
            ))}
          </ul>
        </HqPanel>
      ) : null}

      <div className="cd-adm-card rounded-[var(--cd-adm-radius-lg)]">
        <div className="px-2 pt-1">
          <Tabs<QuestViewMode>
            label="보기 방식"
            value={view}
            onChange={onViewChange}
            items={[
              { id: "list", label: "리스트", icon: List },
              { id: "week", label: "주간", icon: Rows3 },
              { id: "month", label: "월간", icon: CalendarDays },
              { id: "kanban", label: "칸반", icon: Columns3 },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 border-b border-[var(--cd-adm-line)] px-4 py-3" role="group" aria-label="필터">
          <FilterSelect label="채널" value={filters.channel} onChange={(value) => set({ channel: value })} options={channels.map((key) => [key, meta.channels[key] || key])} />
          <FilterSelect label="언어" value={filters.language} onChange={(value) => set({ language: value })} options={languages.map((key) => [key, LANGUAGE_LABELS[key] || key])} />
          <FilterSelect label="작업 종류" value={filters.kind} onChange={(value) => set({ kind: value })} options={kinds.map((key) => [key, meta.kinds[key] ? `${meta.kinds[key].label} · ${meta.kinds[key].game}` : key])} />
          <FilterSelect label="상태" value={filters.status} onChange={(value) => set({ status: value })} options={Object.entries(meta.statuses).filter(([key]) => key !== "archived")} />
          <button type="button" className={`${adminChip(filters.overdue)} min-h-[40px]`} aria-pressed={filters.overdue} onClick={() => set({ overdue: !filters.overdue })}>기한 경과만</button>
          {activeFilters ? <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={() => onFiltersChange(EMPTY_FILTERS)}>필터 해제</button> : null}
          <p className="cd-hq-quiet ml-auto text-[12px]" aria-live="polite">{formatNumber(filtered.length)}개 표시 / 전체 {formatNumber(items.length)}개</p>
        </div>
        {rangeNote ? (
          <p className="flex flex-wrap items-center gap-2 border-b border-[var(--cd-adm-line)] px-4 py-2 text-[13px]">
            <StatusBadge tone="info" label="기간 지정" /> <span className="text-[var(--cd-adm-ink)]">{rangeNote}</span>
            {onClearRange ? <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={onClearRange}>전체 기간 보기</button> : null}
          </p>
        ) : null}
        <div className="p-3 sm:p-4" role="tabpanel">
          {!items.length ? (
            <EmptyState art={HQ_ART.yeoniLibrary} title="아직 불러온 퀘스트가 없습니다" body="연결 상태 화면에서 '캠페인 일정 가져오기'를 실행하면 4주 캠페인 퀘스트가 생깁니다." />
          ) : !filtered.length ? (
            <EmptyState title="조건에 맞는 퀘스트가 없습니다" body="필터를 바꾸거나 해제해 보세요." action={<button type="button" className={adminButton("neutral")} onClick={() => onFiltersChange(EMPTY_FILTERS)}>필터 해제</button>} />
          ) : view === "list" ? (
            <ListView items={filtered} today={today} onOpen={onOpen} />
          ) : view === "week" ? (
            <WeekView items={filtered} anchor={anchor} today={today} onAnchorChange={onAnchorChange} onOpen={onOpen} />
          ) : view === "month" ? (
            <MonthView items={filtered} anchor={anchor} today={today} onAnchorChange={onAnchorChange} onOpen={onOpen} />
          ) : (
            <KanbanView items={filtered} meta={meta} onOpen={onOpen} />
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, tone, onClick, pressed }: { label: string; value: number; tone?: "err" | "info" | "ok"; onClick?: () => void; pressed?: boolean }) {
  const inner = (
    <>
      <span className="cd-hq-quiet block text-[12px]">{label}</span>
      <span className={`cd-hq-num block text-lg font-bold ${tone ? `cd-hq-tone-${tone}` : "text-[var(--cd-adm-ink)]"}`}>{formatNumber(value)}</span>
    </>
  );
  if (!onClick) return <div className="cd-hq-panel2 rounded-[var(--cd-adm-radius)] px-3 py-2">{inner}</div>;
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`cd-hq-row px-3 py-2 ${pressed ? "border-[var(--cd-adm-accent)]" : ""}`}>
      {inner}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="flex min-w-[120px] flex-col gap-1 text-[12px]">
      <span className="cd-hq-quiet">{label}</span>
      <select className={`${ADMIN_INPUT} min-h-[40px]`} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">전체</option>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function ListView({ items, today, onOpen }: { items: Quest[]; today: string; onOpen: (id: string) => void }) {
  const groups = useMemo(() => Array.from(groupByDate(items).entries()).sort(([a], [b]) => a.localeCompare(b)), [items]);
  return (
    <div className="space-y-4">
      {groups.map(([date, quests]) => (
        <section key={date} aria-label={formatDateKey(date)}>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--cd-adm-ink)]">
            <span className="cd-hq-num">{formatDateKey(date)}</span>
            {date === today ? <StatusBadge tone="accent" label="오늘" /> : null}
            <span className="cd-hq-quiet font-normal">{quests.length}개</span>
          </h3>
          <ul className="space-y-2">
            {quests.map((quest) => <li key={quest.id}><QuestRow quest={quest} onOpen={onOpen} showDate={false} /></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PeriodNav({ label, onPrev, onNext, onToday }: { label: string; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button type="button" className={`${adminButton("neutral", { size: "sm" })} min-h-[40px] min-w-[40px]`} onClick={onPrev} aria-label="이전"><ChevronLeft aria-hidden="true" size={16} /></button>
      <p className="cd-hq-num min-w-[9rem] text-center text-sm font-semibold text-[var(--cd-adm-ink)]" aria-live="polite">{label}</p>
      <button type="button" className={`${adminButton("neutral", { size: "sm" })} min-h-[40px] min-w-[40px]`} onClick={onNext} aria-label="다음"><ChevronRight aria-hidden="true" size={16} /></button>
      <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={onToday}>오늘</button>
    </div>
  );
}

function CompactQuest({ quest, onOpen }: { quest: Quest; onOpen: (id: string) => void }) {
  const tone = questTone(quest);
  return (
    <button type="button" className="cd-hq-row px-2 py-1.5 text-[12px]" onClick={() => onOpen(quest.id)} aria-label={`${quest.title} · ${quest.statusLabel}${quest.overdue && quest.status !== "done" ? " · 기한 경과" : ""}`}>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`inline-block h-2 w-2 flex-none rounded-full bg-current cd-hq-tone-${tone}`} />
        <span className="cd-hq-num cd-hq-quiet flex-none">{quest.plannedTime || ""}</span>
      </span>
      <span className="mt-0.5 line-clamp-2 block text-[var(--cd-adm-ink)]">{quest.title}</span>
      <span className="cd-hq-quiet block truncate">{quest.channelLabel} · {quest.statusLabel}</span>
    </button>
  );
}

function WeekView({ items, anchor, today, onAnchorChange, onOpen }: { items: Quest[]; anchor: string; today: string; onAnchorChange: (date: string) => void; onOpen: (id: string) => void }) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const groups = groupByDate(items);
  return (
    <div>
      <PeriodNav label={`${formatDateKey(days[0])} ~ ${formatDateKey(days[6])}`} onPrev={() => onAnchorChange(addDays(start, -7))} onNext={() => onAnchorChange(addDays(start, 7))} onToday={() => onAnchorChange(today)} />
      <ol className="grid gap-2 lg:grid-cols-7">
        {days.map((day) => {
          const quests = groups.get(day) || [];
          return (
            <li key={day} className={`cd-hq-panel2 min-w-0 rounded-[var(--cd-adm-radius)] p-2 ${day === today ? "ring-1 ring-[var(--cd-adm-accent)]" : ""}`}>
              <h3 className="mb-1.5 flex items-center justify-between gap-1 text-[12px] font-semibold text-[var(--cd-adm-ink)]">
                <span className="cd-hq-num">{formatDateKey(day)}</span>
                <span className="cd-hq-quiet font-normal">{quests.length ? `${quests.length}개` : ""}</span>
              </h3>
              {quests.length ? (
                <ul className="space-y-1.5">{quests.map((quest) => <li key={quest.id}><CompactQuest quest={quest} onOpen={onOpen} /></li>)}</ul>
              ) : <p className="cd-hq-quiet text-[12px]">일정 없음</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MonthView({ items, anchor, today, onAnchorChange, onOpen }: { items: Quest[]; anchor: string; today: string; onAnchorChange: (date: string) => void; onOpen: (id: string) => void }) {
  const monthKey = anchor.slice(0, 7);
  const first = `${monthKey}-01`;
  const gridStart = weekStart(first);
  const nextMonth = (() => { const [y, m] = monthKey.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; })();
  const prevMonth = (() => { const [y, m] = monthKey.split("-").map(Number); return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`; })();
  const cells: string[] = [];
  for (let day = gridStart; day < nextMonth || cells.length % 7 !== 0; day = addDays(day, 1)) cells.push(day);
  const groups = groupByDate(items);
  const [year, month] = monthKey.split("-").map(Number);
  return (
    <div>
      <PeriodNav label={`${year}년 ${month}월`} onPrev={() => onAnchorChange(prevMonth)} onNext={() => onAnchorChange(nextMonth)} onToday={() => onAnchorChange(today)} />
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]" aria-hidden="true">
        {"월화수목금토일".split("").map((label) => <span key={label} className="cd-hq-quiet py-1">{label}</span>)}
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const quests = groups.get(day) || [];
          const inMonth = day.startsWith(monthKey);
          const overdue = quests.some((quest) => quest.overdue && quest.status !== "done");
          const done = quests.filter((quest) => quest.status === "done").length;
          return (
            <li key={day} className={`min-h-[64px] min-w-0 rounded-[var(--cd-adm-radius)] border border-[var(--cd-adm-line)] p-1 sm:min-h-[96px] sm:p-1.5 ${inMonth ? "bg-[var(--cd-adm-surface)]" : "opacity-50"} ${day === today ? "ring-1 ring-[var(--cd-adm-accent)]" : ""}`}>
              <p className="cd-hq-num flex items-center justify-between text-[11px] text-[var(--cd-adm-ink)]">
                <span>{Number(day.slice(8))}</span>
                {quests.length ? <span className={overdue ? "cd-hq-tone-err" : "cd-hq-quiet"}>{done}/{quests.length}</span> : null}
              </p>
              {quests.length ? (
                <>
                  <ul className="mt-1 hidden space-y-0.5 sm:block">
                    {quests.slice(0, 3).map((quest) => (
                      <li key={quest.id}>
                        <button type="button" className="cd-hq-focus block min-h-[22px] w-full truncate rounded text-left text-[11px] text-[var(--cd-adm-ink)] hover:underline" onClick={() => onOpen(quest.id)} title={quest.title}>
                          <span aria-hidden="true" className={`mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle cd-hq-tone-${questTone(quest)}`} />
                          {quest.title}
                        </button>
                      </li>
                    ))}
                    {quests.length > 3 ? <li className="cd-hq-quiet text-[11px]">외 {quests.length - 3}개</li> : null}
                  </ul>
                  <button type="button" className="cd-hq-focus mt-1 block min-h-[28px] w-full rounded text-[11px] text-[var(--cd-adm-ink)] sm:hidden" onClick={() => onAnchorChange(day)} aria-label={`${formatDateKey(day)} 주간 보기로`}>
                    {quests.length}개
                  </button>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="cd-hq-quiet mt-2 text-[12px]">휴대폰에서는 날짜의 개수를 누르면 그 주로 이동합니다. 주간 탭에서 자세히 볼 수 있습니다.</p>
    </div>
  );
}

function KanbanView({ items, meta, onOpen }: { items: Quest[]; meta: QuestMeta; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {KANBAN_COLUMNS.map((status) => {
        const quests = items.filter((quest) => quest.status === status);
        return (
          <section key={status} aria-label={meta.statuses[status] || status} className="cd-hq-panel2 min-w-0 rounded-[var(--cd-adm-radius)] p-2">
            <h3 className="mb-2 flex items-center justify-between gap-2 px-1">
              <StatusBadge tone={STATUS_TONE[status] || "muted"} label={meta.statuses[status] || status} />
              <span className="cd-hq-num cd-hq-quiet text-[12px]">{quests.length}</span>
            </h3>
            {quests.length ? (
              <ul className="space-y-1.5">
                {quests.slice(0, 60).map((quest) => (
                  <li key={quest.id}>
                    <button type="button" className="cd-hq-row px-2.5 py-2 text-[12px]" onClick={() => onOpen(quest.id)}>
                      <span className="cd-hq-quiet cd-hq-num block">{formatDateKey(quest.plannedDate)} {quest.plannedTime || ""} · {quest.channelLabel}</span>
                      <span className="mt-0.5 block text-[13px] font-semibold text-[var(--cd-adm-ink)]">{quest.title}</span>
                      {quest.overdue || quest.automation || quest.sourceChanged ? <span className="mt-1 block"><QuestBadges quest={quest} /></span> : null}
                    </button>
                  </li>
                ))}
                {quests.length > 60 ? <li className="cd-hq-quiet px-1 text-[12px]">외 {quests.length - 60}개 — 리스트 보기에서 확인하세요</li> : null}
              </ul>
            ) : <p className="cd-hq-quiet px-1 text-[12px]">없음</p>}
          </section>
        );
      })}
    </div>
  );
}
