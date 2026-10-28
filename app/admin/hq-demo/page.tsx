"use client";

// /admin/hq-demo — 별빛 운영본부 데모(픽스처) 화면. 스크린샷·디자인 검증용이며 API 를 부르지 않는다.
// 🔴 숫자는 모두 지어낸 예시다. 메뉴에는 넣지 않는다. ?screen=home|quests|detail|growth|connections|states

import { useEffect, useState } from "react";
import AdminErrorState from "../_components/AdminErrorState";
import type { AdminErrorView } from "../_lib/admin-api";
import { EmptyState, HqNotice, HqPanel, IntegrationPending, LevelUpBurst, LoadingBlock, Tabs } from "../_hq/components";
import { HQ_ART } from "../_hq/art";
import { readQuery, writeQuery } from "../_hq/useHqResource";
import ConnectionsView from "../_hq/views/ConnectionsView";
import GrowthView from "../_hq/views/GrowthView";
import HomeView from "../_hq/views/HomeView";
import QuestDetailView from "../_hq/views/QuestDetailView";
import QuestsView, { EMPTY_FILTERS, type QuestFilters, type QuestViewMode } from "../_hq/views/QuestsView";
import type { Tone } from "../_hq/types";
import {
  DEMO_ACHIEVEMENTS,
  DEMO_BACKFILL,
  DEMO_BUNDLES,
  DEMO_CONNECTIONS,
  DEMO_DETAIL,
  DEMO_META,
  DEMO_QUESTS,
  DEMO_SUMMARY,
  DEMO_TODAY,
  DEMO_TRAFFIC_PENDING,
  DEMO_XP,
} from "./fixtures";

type Screen = "home" | "quests" | "detail" | "growth" | "connections" | "states";

const SCREENS: { id: Screen; label: string }[] = [
  { id: "home", label: "홈" },
  { id: "quests", label: "퀘스트" },
  { id: "detail", label: "퀘스트 상세" },
  { id: "growth", label: "성과" },
  { id: "connections", label: "연결 상태" },
  { id: "states", label: "상태 모음" },
];

const DEMO_ERROR: AdminErrorView = {
  message: "운영본부 요약을 불러오지 못했습니다. 서버가 잠시 응답하지 않았습니다(데모 오류).",
  retryable: true,
  diagnostic: "요청 ID demo-0000 · 단계 demo",
};

const DEMO_SAVE_NOTE = "데모 화면이라 저장하지 않습니다.";

export default function AdminHqDemoPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [questView, setQuestView] = useState<QuestViewMode>("list");
  const [anchor, setAnchor] = useState(DEMO_TODAY);
  const [filters, setFilters] = useState<QuestFilters>(EMPTY_FILTERS);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const params = readQuery();
    const requested = params.get("screen");
    if (SCREENS.some((item) => item.id === requested)) setScreen(requested as Screen);
    const view = params.get("view");
    if (view === "list" || view === "week" || view === "month" || view === "kanban") setQuestView(view);
  }, []);

  const change = (next: Screen) => {
    setScreen(next);
    setNotice(null);
    writeQuery({ screen: next === "home" ? null : next });
  };
  const demoNotice = () => setNotice({ tone: "info", text: DEMO_SAVE_NOTE });

  return (
    <div className="space-y-4">
      <div role="note" className="cd-hq-panel2 flex flex-wrap items-center justify-between gap-2 rounded-[var(--cd-adm-radius)] border border-dashed border-[var(--cd-adm-warn)] px-3 py-2 text-[13px]">
        <span><strong className="cd-hq-tone-warn">데모 화면</strong> · 지어낸 예시 데이터입니다. 실제 매출·주문·XP 와 무관하며 아무것도 저장하지 않습니다.</span>
        <button type="button" className="cd-hq-focus min-h-[44px] rounded-[var(--cd-adm-radius)] px-2 text-[12px] underline" onClick={() => setBurst(true)}>레벨업 연출 보기</button>
      </div>
      <div className="overflow-x-auto">
        <Tabs<Screen> label="데모 화면" value={screen} onChange={change} items={SCREENS} />
      </div>

      <div role="tabpanel">
        {screen === "home" ? (
          <HomeView data={DEMO_SUMMARY} range="7d" onRangeChange={demoNotice} onRefresh={demoNotice} onTrendSelect={demoNotice} ga4Steps={DEMO_TRAFFIC_PENDING.setup} />
        ) : null}

        {screen === "quests" ? (
          <QuestsView
            items={DEMO_QUESTS}
            meta={DEMO_META}
            bundles={DEMO_BUNDLES}
            today={DEMO_TODAY}
            view={questView}
            onViewChange={setQuestView}
            anchor={anchor}
            onAnchorChange={setAnchor}
            filters={filters}
            onFiltersChange={setFilters}
            onOpen={() => change("detail")}
          />
        ) : null}

        {screen === "detail" ? (
          <HqPanel title={DEMO_DETAIL.quest.title} game={DEMO_DETAIL.quest.kindGame}>
            <QuestDetailView
              detail={DEMO_DETAIL}
              notice={notice}
              onTransition={demoNotice}
              onAddEvidence={async () => { demoNotice(); return false; }}
              onSetTarget={demoNotice}
              onOpenRelated={demoNotice}
            />
          </HqPanel>
        ) : null}

        {screen === "growth" ? (
          <GrowthView
            xp={DEMO_XP}
            summary={DEMO_SUMMARY}
            traffic={DEMO_TRAFFIC_PENDING}
            achievements={DEMO_ACHIEVEMENTS}
            revenueSince="2026-10-12"
            onSaveGoals={async () => DEMO_SAVE_NOTE}
            onPreviewBackfill={async () => DEMO_BACKFILL}
            onApplyBackfill={async () => { throw new Error(DEMO_SAVE_NOTE); }}
          />
        ) : null}

        {screen === "connections" ? (
          <ConnectionsView data={DEMO_CONNECTIONS} notice={notice} onSync={demoNotice} onSyncPlan={demoNotice} />
        ) : null}

        {screen === "states" ? (
          <div className="cd-hq-page grid gap-4 lg:grid-cols-2">
            <HqPanel title="불러오는 중" game="로딩"><LoadingBlock lines={4} label="운영본부를 여는 중" /></HqPanel>
            <HqPanel title="불러오기 실패" game="오류"><AdminErrorState view={DEMO_ERROR} onRetry={demoNotice} /></HqPanel>
            <HqPanel title="빈 상태" game="빈 하늘">
              <EmptyState title="오늘 남은 퀘스트가 없습니다" body="이번 주 일정에서 다음 작업을 골라 보세요." art={HQ_ART.yeongnyangiCelebrateAvatar} />
            </HqPanel>
            <HqPanel title="연동 필요" game="관측 대기">
              <IntegrationPending title="GA4 Data API" missing={DEMO_TRAFFIC_PENDING.traffic.missing} steps={DEMO_TRAFFIC_PENDING.setup} />
            </HqPanel>
            <HqPanel title="알림 톤" game="전령 문장" className="lg:col-span-2">
              <div className="space-y-2">
                <HqNotice tone="ok">퀘스트를 완료했습니다. +20 XP</HqNotice>
                <HqNotice tone="warn">완료하려면 증빙이 필요합니다: 공개 URL</HqNotice>
                <HqNotice tone="err">다른 집계가 진행 중입니다. 잠시 뒤 다시 시도해 주세요.</HqNotice>
                <HqNotice tone="info">{DEMO_SAVE_NOTE}</HqNotice>
              </div>
            </HqPanel>
          </div>
        ) : null}
      </div>

      {burst ? <LevelUpBurst from={4} to={5} title="운명 기록가" onClose={() => setBurst(false)} /> : null}
    </div>
  );
}
