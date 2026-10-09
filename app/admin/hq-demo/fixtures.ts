// 🔴 데모 전용 픽스처 — /admin/hq-demo 화면과 스크린샷 검증에서만 쓴다. 운영 화면은 이 파일을 import 하지 않는다.
// 숫자는 모두 지어낸 예시이며 실제 매출·주문·사용자와 무관하다.

import type { BackfillPreview } from "../_hq/views/GrowthView";
import type {
  Achievement,
  ConnectionsResponse,
  HqSummary,
  LedgerRow,
  Quest,
  QuestDetail,
  QuestMeta,
  TrafficData,
  WorkBundle,
  XpResponse,
  XpState,
} from "../_hq/types";

export const DEMO_TODAY = "2026-10-14";

const GA4_STEPS = [
  "GA4 관리 → 속성 액세스 관리에서 서비스 계정 이메일을 '뷰어'로 추가합니다.",
  "wrangler secret put GA4_SERVICE_ACCOUNT_JSON (서비스 계정 JSON 키 전체)",
  "wrangler secret put GA4_PROPERTY_ID (숫자 속성 ID)",
  "GA4 관리 → 데이터 필터에서 내부 트래픽 필터를 '활성'으로 둡니다.",
];

export const DEMO_META: QuestMeta = {
  statuses: { scheduled: "예정", in_progress: "진행 중", review: "검토 대기", done: "완료", on_hold: "보류", cancelled: "취소", archived: "원본에서 빠짐" },
  stages: { copy: "원고", asset: "에셋", scheduled: "예약", published: "공개", observed: "성과 관측" },
  kinds: {
    copy: { label: "원고 작성", game: "주문서 집필", required: ["copy_ready"], minutes: 30, xp: 30 },
    production: { label: "원본 제작", game: "별빛 공방", required: ["asset_file"], minutes: 60, xp: 60 },
    publish: { label: "채널 발행", game: "전령 파견", required: ["public_url"], minutes: 15, xp: 20 },
    analysis: { label: "캠페인 분석", game: "별자리 해석", required: ["report"], minutes: 30, xp: 30 },
    improvement: { label: "상세 개선·문제 해결", game: "결계 수리", required: ["report"], minutes: 60, xp: 60 },
    auto_publish_check: { label: "자동 발행 확인", game: "자동 전령 확인", required: [], minutes: 5, xp: 0 },
  },
  channels: { naver_blog: "네이버 블로그", tiktok: "TikTok", youtube_shorts: "YouTube Shorts", x: "X", threads_existing_worker: "Threads(자동)", internal_review: "내부 검토", production: "제작", custom: "기타" },
  evidenceTypes: {
    copy_ready: { label: "원고 준비", stage: "copy", manual: true },
    asset_file: { label: "에셋 파일", stage: "asset", manual: true },
    reservation: { label: "예약 화면", stage: "scheduled", manual: true },
    public_url: { label: "공개 URL", stage: "published", manual: true },
    metrics: { label: "성과 수치", stage: "observed", manual: true },
    report: { label: "보고서", stage: "observed", manual: true },
    auto_publish: { label: "자동 발행 기록", stage: "published", manual: false },
  },
  sourceStatuses: { planned: "계획됨", ready: "준비됨", published: "발행됨" },
  campaign: { id: "growth-20261012", title: "4주 성장 캠페인", period: { start: "2026-10-12", end: "2026-11-08" }, planVersion: "demo-plan-v1" },
};

function quest(partial: Partial<Quest> & Pick<Quest, "id" | "title" | "kind" | "channel" | "plannedDate">): Quest {
  const kind = DEMO_META.kinds[partial.kind];
  return {
    origin: "campaign_plan",
    campaignId: "growth-20261012",
    parentId: null,
    kindLabel: kind?.label || partial.kind,
    kindGame: kind?.game || "",
    estimatedMinutes: kind?.minutes || 30,
    contentId: null,
    channelLabel: DEMO_META.channels[partial.channel] || partial.channel,
    language: "ko",
    plannedTime: "18:00",
    plannedAt: `${partial.plannedDate}T09:00:00.000Z`,
    targetAt: null,
    dueAt: null,
    dueDate: partial.plannedDate,
    status: "scheduled",
    statusLabel: "예정",
    overdue: false,
    stage: null,
    stageLabel: "시작 전",
    sourceStatus: "planned",
    sourceStatusLabel: "계획됨",
    scriptRef: null,
    requiredEvidence: kind?.required || [],
    evidenceTypes: [],
    missingEvidence: kind?.required || [],
    automation: null,
    baseXp: kind?.xp || 0,
    xp: null,
    xpVerifiedAt: null,
    doneAt: null,
    version: 1,
    sourceChanged: false,
    updatedAt: `${partial.plannedDate}T00:00:00.000Z`,
    ...partial,
  };
}

export const DEMO_QUESTS: Quest[] = [
  quest({ id: "q_demo00000000000000000001", title: "V01 영상 제작 · 이번 주 별자리", kind: "production", channel: "production", plannedDate: "2026-10-13", status: "done", statusLabel: "완료", stage: "asset", stageLabel: "에셋", missingEvidence: [], evidenceTypes: ["asset_file"], xp: { date: "2026-10-13", awarded: 60, capped: false }, doneAt: "2026-10-13T08:10:00.000Z", contentId: "V01" }),
  quest({ id: "q_demo00000000000000000002", parentId: "q_demo00000000000000000001", title: "V01 TikTok 발행", kind: "publish", channel: "tiktok", plannedDate: "2026-10-14", plannedTime: "19:00", status: "in_progress", statusLabel: "진행 중", stage: "scheduled", stageLabel: "예약", contentId: "V01" }),
  quest({ id: "q_demo00000000000000000003", parentId: "q_demo00000000000000000001", title: "V01 YouTube Shorts 발행", kind: "publish", channel: "youtube_shorts", plannedDate: "2026-10-14", plannedTime: "20:00", contentId: "V01" }),
  quest({ id: "q_demo00000000000000000004", title: "블로그 원고 · 사주로 보는 가을 루틴", kind: "copy", channel: "naver_blog", plannedDate: "2026-10-12", status: "review", statusLabel: "검토 대기", overdue: true, stage: "copy", stageLabel: "원고" }),
  quest({ id: "q_demo00000000000000000005", title: "Threads 오전 발행 확인", kind: "auto_publish_check", channel: "threads_existing_worker", plannedDate: "2026-10-14", plannedTime: "08:30", automation: { kind: "threads" }, status: "done", statusLabel: "완료", missingEvidence: [], baseXp: 0 }),
  quest({ id: "q_demo00000000000000000006", title: "1주차 캠페인 분석", kind: "analysis", channel: "internal_review", plannedDate: "2026-10-18", sourceChanged: true }),
  quest({ id: "q_demo00000000000000000007", title: "X 스레드 · 영냥이의 한 줄 운세", kind: "publish", channel: "x", plannedDate: "2026-10-16", plannedTime: "12:00", language: "en" }),
  quest({ id: "q_demo00000000000000000008", title: "결제창 이탈 문구 개선", kind: "improvement", channel: "custom", plannedDate: "2026-10-15", status: "on_hold", statusLabel: "보류" }),
];

export const DEMO_BUNDLES: WorkBundle[] = [
  { minutes: 30, used: 30, xp: 30, quests: [{ id: "q_demo00000000000000000004", title: "블로그 원고 · 사주로 보는 가을 루틴", minutes: 30, kindLabel: "원고 작성", overdue: true }] },
  { minutes: 60, used: 45, xp: 50, quests: [{ id: "q_demo00000000000000000004", title: "블로그 원고 · 사주로 보는 가을 루틴", minutes: 30, kindLabel: "원고 작성", overdue: true }, { id: "q_demo00000000000000000002", title: "V01 TikTok 발행", minutes: 15, kindLabel: "채널 발행", overdue: false }] },
];

export const DEMO_XP_STATE: XpState = {
  totalXp: 455,
  level: 4,
  title: "별빛 견습생",
  rankTier: 0,
  levelStartXp: 420,
  nextLevelXp: 640,
  intoLevel: 35,
  needForNext: 220,
  progress: 35 / 220,
  peakLevel: 4,
  peakXp: 455,
  ackLevel: 4,
  pendingLevelUp: null,
  bySource: { task: 290, revenue: 165, traffic: 0 },
  byMastery: { content: 140, production: 120, analysis: 30 },
  ruleVersion: "ops-xp-v1",
  updatedAt: "2026-10-14T03:00:00.000Z",
  todayXp: 20,
};

export const DEMO_LEDGER: LedgerRow[] = [
  { id: "task:2026-10-14:content#r1", bucket: "task:2026-10-14:content", delta: 20, target: 20, sourceType: "task", sourceLabel: "작업", mastery: "content", masteryLabel: "콘텐츠", sourceIds: ["q_demo00000000000000000002"], stage: "published", reason: "퀘스트 완료 검증", correction: false, ruleVersion: "ops-xp-v1", occurredAt: "2026-10-14T02:00:00.000Z", processedAt: "2026-10-14T02:00:05.000Z", actor: "demo" },
  { id: "revenue:cumulative#r3", bucket: "revenue:cumulative", delta: -5, target: 165, sourceType: "revenue", sourceLabel: "매출", mastery: null, masteryLabel: null, sourceIds: ["demo-order-3"], stage: null, reason: "부분 환불 정정", correction: true, ruleVersion: "ops-xp-v1", occurredAt: "2026-10-13T11:00:00.000Z", processedAt: "2026-10-13T11:10:00.000Z", actor: "cron" },
  { id: "revenue:cumulative#r2", bucket: "revenue:cumulative", delta: 170, target: 170, sourceType: "revenue", sourceLabel: "매출", mastery: null, masteryLabel: null, sourceIds: ["demo-order-1", "demo-order-2"], stage: null, reason: "실결제·제공 확인", correction: false, ruleVersion: "ops-xp-v1", occurredAt: "2026-10-13T06:00:00.000Z", processedAt: "2026-10-13T06:10:00.000Z", actor: "cron" },
  { id: "task:2026-10-13:production#r1", bucket: "task:2026-10-13:production", delta: 60, target: 60, sourceType: "task", sourceLabel: "작업", mastery: "production", masteryLabel: "제작", sourceIds: ["q_demo00000000000000000001"], stage: "asset", reason: "퀘스트 완료 검증", correction: false, ruleVersion: "ops-xp-v1", occurredAt: "2026-10-13T08:10:00.000Z", processedAt: "2026-10-13T08:10:03.000Z", actor: "demo" },
];

export const DEMO_ACHIEVEMENTS: Achievement[] = [
  { key: "first_quest", game: "첫 별빛", label: "첫 퀘스트 완료", hint: "증빙과 함께 퀘스트 1개 완료", unlocked: true, achievedAt: "2026-10-13T08:10:00.000Z" },
  { key: "first_paid", game: "첫 금화", label: "첫 실결제 제공", hint: "실결제 후 제공까지 확인된 주문 1건", unlocked: true, achievedAt: "2026-10-13T06:00:00.000Z" },
  { key: "week_streak", game: "일곱 밤의 등불", label: "7일 연속 작업", hint: "7일 연속으로 작업 XP 기록", unlocked: false, achievedAt: null },
];

const trend = Array.from({ length: 7 }, (_, index) => {
  const day = 8 + index;
  return { date: `2026-10-${String(day).padStart(2, "0")}`, netKRW: [0, 12900, 0, 25800, 9900, 38700, 19800][index], orders: [0, 1, 0, 2, 1, 3, 2][index], xp: [0, 60, 0, 125, 45, 205, 20][index], questsDone: [0, 1, 0, 2, 1, 3, 1][index], engagedSessions: null };
});

export const DEMO_SUMMARY: HqSummary = {
  generatedAt: "2026-10-14T03:00:00.000Z",
  period: { range: "7d", label: "최근 7일", fromDate: "2026-10-08", toDate: DEMO_TODAY, prevFrom: "2026-10-01", prevTo: "2026-10-07", today: DEMO_TODAY, timeZone: "Asia/Seoul" },
  xp: DEMO_XP_STATE,
  alerts: [
    { id: "undelivered", tone: "err", label: "결제 후 미제공", count: 1, href: "/admin/orders/?queue=undelivered" },
    { id: "refund_check", tone: "warn", label: "확인할 환불", count: 2, href: "/admin/orders/?queue=refund_check" },
  ],
  focus: DEMO_QUESTS.filter((item) => ["q_demo00000000000000000004", "q_demo00000000000000000002", "q_demo00000000000000000003"].includes(item.id)),
  upcoming: DEMO_QUESTS.filter((item) => ["q_demo00000000000000000008", "q_demo00000000000000000007"].includes(item.id)),
  bundles: DEMO_BUNDLES,
  metrics: {
    revenue: { grossKRW: 107100, refundedKRW: 9900, netKRW: 97200, orders: 9, held: { delivery_pending: 1, refund_unknown: 2 }, excluded: { test_account: 1 }, currencies: { KRW: 8, USD: 1 }, settlementKRW: null, profitKRW: null },
    previous: { grossKRW: 64500, refundedKRW: 0, netKRW: 64500, orders: 5 },
    delivery: { orders: 9, awaitingDelivery: 1, delivered: 8, held: { delivery_pending: 1 } },
    traffic: { status: "integration_pending", statusLabel: "연동 대기", engagedSessions: null },
    funnel: { checkout_opened: 120, checkout_option_click: 64, checkout_pg_opened: 31, checkout_dismissed: 18 },
  },
  trend,
  campaign: { id: "growth-20261012", title: "4주 성장 캠페인", period: { start: "2026-10-12", end: "2026-11-08" }, planVersion: "demo-plan-v1", total: 132, done: 9, autoConfirmed: 5, autoTotal: 6 },
  threadsToday: {
    mode: "auto",
    allConfirmed: false,
    attention: true,
    jobs: [
      { type: "morning", label: "오전", time: "08:30", state: "confirmed", stateLabel: "자동 확인", note: "", postIds: ["demo-post-1"] },
      { type: "noon", label: "점심", time: "12:00", state: "needs_check", stateLabel: "확인 필요", note: "발행 응답이 불확실합니다", postIds: [] },
      { type: "evening", label: "저녁", time: "20:30", state: "waiting", stateLabel: "발행 전", note: "", postIds: [] },
    ],
  },
  threadsError: null,
  recentXp: DEMO_LEDGER.slice(0, 3),
  achievements: DEMO_ACHIEVEMENTS,
  suggestions: [
    { id: "undelivered", tone: "err", title: "결제 후 아직 제공되지 않은 주문이 1건 있습니다", body: "제공 원천을 확인하고 필요하면 복구를 실행하세요.", evidence: { source: "ops_revenue_facts", period: "최근 7일", count: 1 }, action: { label: "미제공 주문 보기", href: "/admin/orders/?queue=undelivered" } },
    { id: "overdue", tone: "warn", title: "기한이 지난 원고가 1개 있습니다", body: "30분 묶음으로 오늘 처리할 수 있습니다.", evidence: { source: "ops_quests", period: null, count: 1 }, action: { label: "퀘스트 보기", href: "/admin/quests/?filter=overdue" } },
  ],
  goals: { weeklyNetKRW: 200000, weeklyPublishes: 12, weeklyEngagedSessions: null },
  lastSync: "2026-10-14T02:50:00.000Z",
};

export const DEMO_DETAIL: QuestDetail = {
  quest: DEMO_QUESTS[1],
  evidence: [
    { id: "ev_demo1", type: "copy_ready", label: "원고 준비", verification: "manual", verificationLabel: "수동 확인", value: { ref: "week01.md#v01", note: "자막 최종본" }, source: "admin", actor: "demo", createdAt: "2026-10-13T09:00:00.000Z" },
    { id: "ev_demo2", type: "reservation", label: "예약 화면", verification: "manual", verificationLabel: "수동 확인", value: { note: "19:00 예약 완료" }, source: "admin", actor: "demo", createdAt: "2026-10-14T01:00:00.000Z" },
  ],
  history: [{ at: "2026-10-14T01:00:00.000Z", actor: "demo", from: "scheduled", to: "in_progress", reason: null }],
  sourceHistory: [{ at: "2026-10-09T12:00:00.000Z", planVersion: "demo-plan-v1", kind: "created", changes: null }],
  automationStatus: null,
  note: null,
  owner: null,
  parent: DEMO_QUESTS[0],
  children: [],
  meta: DEMO_META,
};

export const DEMO_TRAFFIC_PENDING: { traffic: TrafficData; setup: string[] } = {
  traffic: { source: "ga4", status: "integration_pending", statusLabel: "연동 대기", missing: ["GA4_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"], metric: {}, rule: { sessionsPerXp: 10, dailyCap: 50 }, lastSuccessAt: null, lastError: null, timeZoneMismatch: false, rows: [], attribution: { label: "귀속 미확인", note: "UTM 이 없는 방문은 캠페인 성과로 세지 않습니다." } },
  setup: GA4_STEPS,
};

const LEVEL_TITLES = [{ from: 1, title: "별빛 견습생" }, { from: 5, title: "운명 기록가" }, { from: 10, title: "별의 안내자" }, { from: 20, title: "천체 설계자" }, { from: 30, title: "운명 길드장" }];

function startXp(level: number) {
  return 100 * (level - 1) + 20 * (level - 1) * (level - 2);
}

export const DEMO_XP: XpResponse = {
  state: DEMO_XP_STATE,
  ledger: DEMO_LEDGER,
  revenueXp: 165,
  rules: { version: "ops-xp-v1", task: { copy: 30, production: 60, publish: 20, analysis: 30, improvement: 60 }, mastery: {}, dailyTaskCap: 200, revenue: { krwPerStep: 1000, xpPerStep: 5 }, traffic: { sessionsPerXp: 10, dailyCap: 50 } },
  masteryLabels: { content: "콘텐츠", production: "제작", analysis: "분석", improvement: "개선" },
  titles: LEVEL_TITLES,
  rankTiers: [1, 5, 10, 20, 30, 40],
  levels: Array.from({ length: 40 }, (_, index) => {
    const level = index + 1;
    return { level, startXp: startXp(level), toNext: 100 + 40 * (level - 1), title: [...LEVEL_TITLES].reverse().find((item) => item.from <= level)?.title || "" };
  }),
  formula: { toNext: "100 + 40 × (L − 1)", start: "T(L) = 100(L − 1) + 20(L − 1)(L − 2)" },
};

export const DEMO_BACKFILL: BackfillPreview = {
  dryRun: true,
  currentSince: "2026-10-12",
  currentRevenueXp: 165,
  preview: { since: "2026-10-01", orders: 14, counts: { counted: 11, held: 2, excluded: 1 }, holdReasons: { delivery_pending: 1, refund_unknown: 1 }, netKRW: 151600, targetXp: 755, truncated: false },
  deltaXp: 590,
  holdLabels: { delivery_pending: "제공 대기", delivery_unknown: "제공 판정 불가", refund_unknown: "환불 확인 실패", fx_pending: "환산 근거 없음" },
};

export const DEMO_CONNECTIONS: ConnectionsResponse = {
  sources: [
    { id: "plan:growth-20261012", label: "캠페인 계획", game: "별자리 지도", detail: "marketing/campaigns/2026-10-12-growth (빌드 시 변환)", status: "ok", statusLabel: "정상", lastRunAt: "2026-10-14T02:50:00.000Z", lastSuccessAt: "2026-10-14T02:50:00.000Z", lagMinutes: 10, lastError: null, window: null, counts: { created: 0, updated: 0, unchanged: 132 }, missing: [], planVersion: "demo-plan-v1" },
    { id: "threads", label: "Threads 자동 발행 기록", game: "자동 전령 기록", detail: "idempotency_keys 읽기 전용", status: "ok", statusLabel: "정상", lastRunAt: "2026-10-14T02:50:00.000Z", lastSuccessAt: "2026-10-14T02:50:00.000Z", lagMinutes: 10, lastError: null, window: null, counts: { checked: 6 }, missing: [], planVersion: null },
    { id: "revenue", label: "결제·환불·제공", game: "별빛 금고", detail: "payments + 제공 원천 + PortOne 환불 조회", status: "error", statusLabel: "오류", lastRunAt: "2026-10-14T02:50:00.000Z", lastSuccessAt: "2026-10-14T01:10:00.000Z", lagMinutes: 110, lastError: { message: "PortOne 환불 조회 시간 초과(데모)", at: "2026-10-14T02:50:00.000Z" }, window: { since: "2026-10-12T00:00:00.000Z" }, counts: { scanned: 14, counted: 11, held: 2 }, missing: [], planVersion: null },
    { id: "traffic", label: "GA4 유효 참여 세션", game: "별빛 관측", detail: "GA4 Data API", status: "integration_pending", statusLabel: "연동 대기", lastRunAt: null, lastSuccessAt: null, lagMinutes: null, lastError: null, window: null, counts: null, missing: ["GA4_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"], planVersion: null },
    { id: "achievements", label: "업적", game: "별의 훈장", detail: "실제 기록의 최초 시각", status: "never", statusLabel: "아직 실행 안 됨", lastRunAt: null, lastSuccessAt: null, lagMinutes: null, lastError: null, window: null, counts: null, missing: [], planVersion: null },
  ],
  ga4: { ready: false, missing: ["GA4_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"], steps: GA4_STEPS },
  threads: { mode: "auto", readOnly: true, note: "자동 발행 기록(idempotency_keys)만 읽습니다. 발행 실행은 하지 않습니다." },
  plan: { campaignId: "growth-20261012", planVersion: "demo-plan-v1", rows: 96, sources: {} },
  cron: { schedule: "*/10 * * * *", note: "스테이징은 크론이 비어 있어 '재집계' 버튼으로 실행합니다." },
};
