import * as models from "./models.js";
import { PAID_NARRATIVE_SERVER_RESUME_KEYS } from "./paid-narrative-adapters.js";

// 2026-11-19 R2b: paid-delivery-stuck.js 의 publicRetryState 와 같은 판정. 이 가드는 공용 스위퍼(service-execution-task)가
// 읽으므로 mongoose 를 끌어오는 그 모듈을 import 하지 않고 여기서 직접 본다(표지 없음·환불 시작·창 경과 → false, fail-closed).
// llmMeta.retryable 표지로 다시 시도를 보류하는 실행 가드 기능 키. 여기 없는 기능은 보류 중이어도 기존 정책(missing → 환불)이다.
const RETRY_WINDOW_FEATURES = new Set(["neo-operation-room-consultation", "astrology-ai-consultation"]);
function neoRetryWindowOpen(doc, now) {
  const meta = doc?.llmMeta, retryable = meta?.retryable;
  if (doc?.status !== "generation_failed" || !retryable) return false;
  if (meta.deliveryRefund || meta.refundEligibleAt || meta.billingCleanupPending) return false;
  return new Date(retryable.refundAt ?? NaN).getTime() > now;
}

// 2026-11-19 R6: 흑월의 다시 시도 보류 표지(metadata.retryable). heukwol.js 의 heukwolRetryWindowOpen 과 같은 판정을
// 같은 이유(공용 스위퍼가 읽는 모듈)로 여기서 직접 본다. 표지 없음·환불 시작·마감 없음·창 경과 → false(fail-closed = 환불).
function heukwolRetryWindowOpen(doc, now) {
  const retryable = doc?.metadata?.retryable;
  if (doc?.status !== "pending" || !retryable) return false;
  if (doc.refundStatus && doc.refundStatus !== "none") return false;
  return new Date(retryable.refundAt ?? NaN).getTime() > now;
}

// 2026-11-21 C1: paid-narrative executions (paid-narrative-delivery.js) live in this collection with no
// sourceTransactionId/paymentRef, so the sweep's refunders cannot prove a restore (runCoinRefund skips,
// card cancel has no ref). A run that can no longer progress on its own is therefore "held": it stays
// pending (browser resume and the free retry read status pending), nextRetryAt moves to the retry-first
// refund point (created + 7 days, docs/handoff/paid-retry-delivery-2026-11-19.md) and the C2 settle
// refunds it there or on a customer request. Exhaustion mirrors paid-narrative-delivery.js limited/v2Exhausted;
// The server resume window mirrors paid-narrative-recovery-task.js MAX_AGE_MS. A run still progressing stays recoverable.
// 2026-11-28: the window from createdAt is 6 days (was 24h), one day short of the 7-day refund point, so the
// cron keeps resuming a stalled run while the customer still waits for it; the per-part attempt budget, not
// this window, bounds provider cost. A customer retry still opens 24h from that retry.
const PAID_NARRATIVE_FEATURES = new Set(["pet-saju-ai-consultation", "pet-compatibility-ai", "animal-totem-basic", "animal-totem-deep", "dream-psycho-analysis", "geomancy", "yoga-guru-per-use", "compat-saju-compatibility", "tarot-prompt-maker", "tarot-prompt-maker-standard", "tarot-prompt-maker-deep", "tarot-prompt-maker-master", "tarot-mindscan", "tarot-love-relationship"]);
const DAY_MS = 86400000, PAID_NARRATIVE_REFUND_AFTER_MS = 7 * DAY_MS;
export const PAID_NARRATIVE_SERVER_RESUME_WINDOW_MS = PAID_NARRATIVE_REFUND_AFTER_MS - DAY_MS;
const PAID_NARRATIVE_RETRY_RESUME_WINDOW_MS = DAY_MS;
function isPaidNarrativeExecution(execution) {
  return Boolean(execution?.metadata?.paidNarrative?.tasks) && (PAID_NARRATIVE_FEATURES.has(execution.featureKey)
    || PAID_NARRATIVE_SERVER_RESUME_KEYS.includes(`${execution.featureKey}|${execution.reportType}`));
}
export { isPaidNarrativeExecution };
export function paidNarrativeHoldCode(execution, { includeResumable = true, now = Date.now() } = {}) {
  if (!isPaidNarrativeExecution(execution)) return "";
  const state = execution.metadata.paidNarrative, retry = execution.metadata.paidNarrativeRetry || {};
  const tasks = Array.isArray(state.tasks) ? state.tasks : [], parts = state.parts || {}, attempts = state.attempts || {};
  // C2: the refund settle held the run for an operator (no restorable evidence, or an unconfirmed self-refund); keep its code.
  if (retry.heldAt) return /^PAID_NARRATIVE_[A-Z_]{1,60}$/.test(retry.holdCode || "") ? retry.holdCode : "PAID_NARRATIVE_REFUND_EVIDENCE_MISSING";
  if (state.exhaustionClaimed) return "PAID_NARRATIVE_EXHAUSTION_CLAIMED";
  if (execution.metadata.paidNarrativeRecovery?.reviewRequired === true) return "PAID_NARRATIVE_REVIEW_REQUIRED";
  const ready = tasks.length > 0 && tasks.every(task => parts[task.id]);
  const exhausted = !ready && (state.deliveryPlanVersion === 2
    ? tasks.every(task => parts[task.id] || (attempts[task.id] || 0) >= 4)
    : tasks.some(task => !parts[task.id] && (attempts[task.id] || 0) >= 2));
  if (exhausted) return "PAID_NARRATIVE_EXHAUSTED";
  // A customer retry (C2 /api/paid-narrative/retry) opens a fresh resume window from that retry.
  const created = new Date(execution.createdAt ?? NaN).getTime() || 0, reopened = new Date(retry.reopenedAt ?? NaN).getTime() || 0;
  const openUntil = Math.max(created ? created + PAID_NARRATIVE_SERVER_RESUME_WINDOW_MS : 0, reopened ? reopened + PAID_NARRATIVE_RETRY_RESUME_WINDOW_MS : 0);
  if (openUntil > 0 && now > openUntil) return "PAID_NARRATIVE_RESUME_WINDOW_CLOSED";
  // includeResumable gate: an explicit close of a run with nothing saved is not retried, and not refunded here either.
  if (!includeResumable && Object.keys(parts).length === 0) return "PAID_NARRATIVE_CLOSE_REQUESTED";
  return "";
}
// Next sweep look for a held run: the 7-day refund point, or daily once that point has passed.
export function paidNarrativeHoldUntil(execution, now = Date.now()) {
  const created = new Date(execution?.createdAt ?? NaN).getTime();
  const refundAt = created + PAID_NARRATIVE_REFUND_AFTER_MS;
  return new Date(Number.isFinite(refundAt) && refundAt > now + 600000 ? refundAt : now + DAY_MS);
}

// These routes store the authoritative result before closing the payment execution.
// A lost close response or a paused checkpoint is not evidence of generation failure.
const RESULT_MODELS = Object.freeze({
  "human-design-report": "HumanDesignReport",
  "destiny-compass-deep-report": "DestinyCompassReport",
  "nakshatra-ai-consultation": "NakshatraAiConsultation",
  "astrology-ai-consultation": "AstrologyAiConsultation",
  "neo-operation-room-consultation": "NeoOperationRoomConsultation",
  "ziwei-deep-pdf": "ZiweiDeepReport",
  "relationship-boundary-test": "RelationshipBoundaryTest",
});

export async function inspectCheckpointBeforeTimeoutRefund(execution, { includeResumable = true } = {}) {
  // An already-started refund must finish its existing idempotent settlement.
  if (execution.refundStatus && execution.refundStatus !== "none"
    && (includeResumable || execution.refundRequestedAt)) return "unmanaged";
  if (includeResumable && execution.featureKey === "heukwol-warning-consultation"
    && execution.metadata?.analysis && Array.isArray(execution.metadata.chapters)
    && (execution.metadata.attempts || 0) < 3) return "recoverable";
  // 다시 시도 창 안의 보류 건은 타임아웃 스위프가 환불하지 않는다. 명시적 종결(고객 환불 요청·창 만료 정산)은 includeResumable=false 라 바로 환불한다.
  if (includeResumable && execution.featureKey === "heukwol-warning-consultation"
    && heukwolRetryWindowOpen(execution, Date.now())) return "recoverable";
  // Resume adapters define the exact paid product/report pairs that can have
  // persisted narrative checkpoints. Never infer a match from reportType alone.
  if (isPaidNarrativeExecution(execution)) {
    // C2: an explicit settle (7-day point or customer refund request) that proved its payment evidence refunds.
    if (!includeResumable && execution.metadata.paidNarrativeRetry?.refundApprovedAt) return "unmanaged";
    if (paidNarrativeHoldCode(execution, { includeResumable })) return "held";
    if (includeResumable || Object.keys(execution.metadata.paidNarrative.parts || {}).length > 0) return "recoverable";
  }
  if (execution.featureKey === "tarot-celestial-harmony" && execution.metadata?.celestialDelivery?.delivery && !execution.metadata.celestialDelivery.failed && (includeResumable || Object.keys(execution.metadata.celestialDelivery.delivery.parts || {}).length > 0)) return "recoverable";
  const modelName = RESULT_MODELS[execution.featureKey];
  if (!modelName) return "unmanaged";
  const id = execution.reportId || execution.sessionId || execution.metadata?.reportId;
  if (!id || !execution.userId) return "unknown";
  try {
    const doc = await models[modelName].findOne({ userId: execution.userId, id })
      .select("status idempotencyKey billingRequestId llmMeta sections").lean();
    if (!doc) return "missing";
    const requestId = String(execution.idempotencyKey || "");
    if (!requestId || ![doc.idempotencyKey, doc.billingRequestId].filter(Boolean).map(String).includes(requestId)) return "unknown";
    if (doc.status === "completed") return "completed";
    // 2026-11-19 R2b 다시 시도 우선: 네오 첫 브리핑의 다시 시도 가능 실패는 창(생성 + 7일) 안·환불 전에만 타임아웃 환불을 미룬다.
    // 창이 지나거나 환불이 예약되면 neoRetryWindowOpen 이 false 라 아래 기존 정책(missing)으로 환불된다. 명시적 종료(includeResumable=false)는 그대로.
    // 2026-11-20 R10: 점성술도 같은 llmMeta.retryable 표지를 쓴다(생성 + 7일 창 안의 보류는 타임아웃 환불 대상이 아니다).
    if (includeResumable && RETRY_WINDOW_FEATURES.has(execution.featureKey) && doc.status === "generation_failed" && neoRetryWindowOpen(doc, Date.now())) return "recoverable";
    if (["delivery_pending", "partial"].includes(doc.status)) return "recoverable";
    if (doc.status === "generating" && (doc.llmMeta?.resumeBody || doc.llmMeta?.attempts
      || doc.llmMeta?.waveInFlight || doc.llmMeta?.unknownAttempt || doc.sections?.some(section => section.body))) return "recoverable";
    return "missing";
  } catch { return "unknown"; }
}
