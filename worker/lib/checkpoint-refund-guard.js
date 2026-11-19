import * as models from "./models.js";
import { PAID_NARRATIVE_SERVER_RESUME_KEYS } from "./paid-narrative-adapters.js";

// 2026-11-19 R2b: paid-delivery-stuck.js 의 publicRetryState 와 같은 판정. 이 가드는 공용 스위퍼(service-execution-task)가
// 읽으므로 mongoose 를 끌어오는 그 모듈을 import 하지 않고 여기서 직접 본다(표지 없음·환불 시작·창 경과 → false, fail-closed).
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
  if ((includeResumable || Object.keys(execution.metadata?.paidNarrative?.parts || {}).length > 0) && execution.metadata?.paidNarrative?.tasks
    && PAID_NARRATIVE_SERVER_RESUME_KEYS.includes(`${execution.featureKey}|${execution.reportType}`)) return "recoverable";
  if (execution.featureKey === "tarot-celestial-harmony" && execution.metadata?.celestialDelivery?.delivery && !execution.metadata.celestialDelivery.failed && (includeResumable || Object.keys(execution.metadata.celestialDelivery.delivery.parts || {}).length > 0)) return "recoverable";
  if (["pet-saju-ai-consultation", "pet-compatibility-ai", "animal-totem-basic", "animal-totem-deep", "dream-psycho-analysis", "geomancy", "yoga-guru-per-use", "compat-saju-compatibility", "tarot-prompt-maker", "tarot-prompt-maker-standard", "tarot-prompt-maker-deep", "tarot-prompt-maker-master", "tarot-mindscan", "tarot-love-relationship"].includes(execution.featureKey) && execution.metadata?.paidNarrative?.tasks) return "recoverable";
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
    if (includeResumable && execution.featureKey === "neo-operation-room-consultation" && doc.status === "generation_failed" && neoRetryWindowOpen(doc, Date.now())) return "recoverable";
    if (["delivery_pending", "partial"].includes(doc.status)) return "recoverable";
    if (doc.status === "generating" && (doc.llmMeta?.resumeBody || doc.llmMeta?.attempts
      || doc.llmMeta?.waveInFlight || doc.llmMeta?.unknownAttempt || doc.sections?.some(section => section.body))) return "recoverable";
    return "missing";
  } catch { return "unknown"; }
}
