// 별빛 운영본부 API 응답 형태(worker/routes/admin-hq.js 가 정본).
// 🔴 화면은 이 값을 "보여 주기만" 한다. XP·금액·레벨을 화면에서 계산해 서버로 보내는 경로는 없다.

export type Tone = "ok" | "warn" | "err" | "info" | "muted" | "accent";

export interface XpState {
  totalXp: number;
  level: number;
  title: string;
  rankTier: number;
  levelStartXp: number;
  nextLevelXp: number;
  intoLevel: number;
  needForNext: number;
  progress: number;
  peakLevel: number;
  peakXp: number;
  ackLevel: number;
  pendingLevelUp: { from: number; to: number } | null;
  bySource: { task: number; revenue: number; traffic: number };
  byMastery: Record<string, number>;
  ruleVersion: string;
  updatedAt: string | null;
  todayXp?: number;
}

export interface Period {
  range: string;
  label: string;
  fromDate: string;
  toDate: string;
  prevFrom: string;
  prevTo: string;
  today: string;
  timeZone: string;
}

export interface Quest {
  id: string;
  origin: string;
  campaignId: string | null;
  parentId: string | null;
  kind: string;
  kindLabel: string;
  kindGame: string;
  estimatedMinutes: number;
  contentId: string | null;
  channel: string;
  channelLabel: string;
  language: string;
  title: string;
  topic?: string;
  plannedDate: string;
  plannedTime: string | null;
  plannedAt: string | null;
  targetAt: string | null;
  dueAt: string | null;
  dueDate: string;
  status: string;
  statusLabel: string;
  overdue: boolean;
  stage: string | null;
  stageLabel: string;
  sourceStatus: string | null;
  sourceStatusLabel: string | null;
  scriptRef: { file: string; heading: string } | null;
  requiredEvidence: string[];
  evidenceTypes: string[];
  missingEvidence: string[];
  automation: { kind: string } | null;
  baseXp: number;
  xp: { date: string; awarded: number; capped: boolean } | null;
  xpVerifiedAt: string | null;
  doneAt: string | null;
  version: number;
  sourceChanged: boolean;
  updatedAt: string | null;
}

export interface WorkBundle {
  minutes: number;
  used: number;
  xp: number;
  quests: { id: string; title: string; minutes: number; kindLabel: string; overdue: boolean }[];
}

export interface QuestMeta {
  statuses: Record<string, string>;
  stages: Record<string, string>;
  kinds: Record<string, { label: string; game: string; required: string[]; minutes: number; xp: number }>;
  channels: Record<string, string>;
  evidenceTypes: Record<string, { label: string; stage: string; manual: boolean }>;
  sourceStatuses: Record<string, string>;
  campaign: { id: string; title: string; period: { start: string; end: string }; planVersion: string };
}

export interface LedgerRow {
  id: string;
  bucket: string;
  delta: number;
  target: number;
  sourceType: "task" | "revenue" | "traffic" | string;
  sourceLabel: string;
  mastery: string | null;
  masteryLabel: string | null;
  sourceIds: string[];
  stage: string | null;
  reason: string | null;
  correction: boolean;
  ruleVersion: string;
  occurredAt: string;
  processedAt: string;
  actor: string;
}

export interface Achievement {
  key: string;
  game: string;
  label: string;
  hint: string;
  unlocked: boolean;
  achievedAt: string | null;
}

export interface Suggestion {
  id: string;
  tone: "err" | "warn" | "info";
  title: string;
  body: string;
  evidence: { source: string; period: string | null; count?: number };
  action: { label: string; href: string };
}

export interface HqAlert {
  id: string;
  tone: "err" | "warn";
  label: string;
  count: number;
  href: string;
}

export interface ThreadsJob {
  type: string;
  label: string;
  time: string;
  state: string;
  stateLabel: string;
  note: string;
  postIds: string[];
}

export interface ThreadsDay {
  mode: string;
  allConfirmed: boolean;
  attention: boolean;
  jobs: ThreadsJob[];
}

export interface TrendPoint {
  date: string;
  netKRW: number;
  orders: number;
  xp: number;
  questsDone: number;
  engagedSessions: number | null;
}

export interface RevenueMetrics {
  grossKRW: number;
  refundedKRW: number;
  netKRW: number;
  orders: number;
  held: Record<string, number>;
  excluded: Record<string, number>;
  currencies: Record<string, number>;
  settlementKRW: null;
  profitKRW: null;
}

export interface HqSummary {
  generatedAt: string;
  period: Period;
  xp: XpState;
  alerts: HqAlert[];
  focus: Quest[];
  upcoming: Quest[];
  bundles: WorkBundle[];
  metrics: {
    revenue: RevenueMetrics;
    previous: { grossKRW: number; refundedKRW: number; netKRW: number; orders: number };
    delivery: { orders: number; awaitingDelivery: number; delivered: number; held: Record<string, number> };
    traffic: { status: TrafficStatus; statusLabel: string; engagedSessions: number | null };
    funnel: Record<string, number> | null;
  };
  trend: TrendPoint[];
  campaign: { id: string; title: string; period: { start: string; end: string }; planVersion: string; total: number; done: number; autoConfirmed: number; autoTotal: number };
  threadsToday: ThreadsDay | null;
  threadsError: string | null;
  recentXp: LedgerRow[];
  achievements: Achievement[];
  suggestions: Suggestion[];
  goals: { weeklyNetKRW: number | null; weeklyPublishes: number | null; weeklyEngagedSessions: number | null };
  lastSync: string | null;
}

export type TrafficStatus = "integration_pending" | "error" | "connected" | "waiting_first_sync";

export interface TrafficData {
  source: string;
  status: TrafficStatus;
  statusLabel: string;
  missing: string[];
  metric: Record<string, unknown>;
  rule: { sessionsPerXp: number; dailyCap: number };
  lastSuccessAt: string | null;
  lastError: { message: string; at?: string; code?: string } | null;
  timeZoneMismatch: boolean;
  rows: { date: string; engagedSessions: number; sessions: number | null; status: string; statusLabel: string; revision: number; corrected: boolean; xp: number }[];
  attribution: { label: string; note: string };
}

export interface ConnectionRow {
  id: string;
  label: string;
  game: string;
  detail: string;
  status: "never" | "integration_pending" | "error" | "stale" | "ok";
  statusLabel: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lagMinutes: number | null;
  lastError: { message: string; at?: string; code?: string } | null;
  window: { since?: string; until?: string } | null;
  counts: Record<string, number> | null;
  missing: string[];
  planVersion: string | null;
}

export interface ConnectionsResponse {
  sources: ConnectionRow[];
  ga4: { ready: boolean; missing: string[]; steps: string[] };
  threads: { mode: string; readOnly: boolean; note: string };
  plan: { campaignId: string; planVersion: string; rows: number; sources: Record<string, unknown> };
  cron: { schedule: string; note: string };
}

export interface XpRules {
  version: string;
  task: Record<string, number>;
  mastery: Record<string, string>;
  dailyTaskCap: number;
  revenue: { krwPerStep: number; xpPerStep: number };
  traffic: { sessionsPerXp: number; dailyCap: number };
}

export interface XpResponse {
  state: XpState;
  ledger: LedgerRow[];
  revenueXp: number;
  rules: XpRules;
  masteryLabels: Record<string, string>;
  titles: { from: number; title: string }[];
  rankTiers: number[];
  levels: { level: number; startXp: number; toNext: number; title: string }[];
  formula: { toNext: string; start: string };
}

export interface RevenueFact {
  id: string;
  merchantUid: string;
  paidAt: string | null;
  currency: string;
  amountOriginal: number | null;
  amountKRW: number | null;
  fxBasis: { kind: string; rate?: number } | null;
  refundedKRW: number;
  refundState: string;
  refundCount: number;
  netKRW: number;
  delivery: { state: string; source?: string } | null;
  deliveryLabel: string | null;
  xpState: "counted" | "held" | "excluded";
  xpStateLabel: string;
  holdReason: string | null;
  holdLabel: string | null;
  excludeReason: string | null;
  excludeLabel: string | null;
  fulfillmentAlertCount: number;
  productId: string | null;
  featureKey: string | null;
  updatedAt: string | null;
}

export interface QuestEvidence {
  id: string;
  type: string;
  label: string;
  verification: "auto" | "manual" | string;
  verificationLabel: string;
  value: { url?: string | null; note?: string | null; ref?: string | null; [key: string]: unknown } | null;
  source: string | null;
  actor: string | null;
  createdAt: string;
}

export interface QuestHistoryEntry {
  at: string;
  actor?: string;
  kind?: string;
  from?: string | null;
  to?: string | null;
  reason?: string | null;
}

export interface QuestSourceHistoryEntry {
  at: string;
  planVersion?: string;
  kind: "created" | "changed" | "removed" | "restored" | string;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}

export interface QuestDetail {
  quest: Quest;
  evidence: QuestEvidence[];
  history: QuestHistoryEntry[];
  sourceHistory: QuestSourceHistoryEntry[];
  automationStatus: Record<string, unknown> | null;
  note: string | null;
  owner: string | null;
  parent: Quest | null;
  children: Quest[];
  meta: QuestMeta;
}

export interface EvidenceInput {
  type: string;
  url?: string;
  note?: string;
  ref?: string;
}
