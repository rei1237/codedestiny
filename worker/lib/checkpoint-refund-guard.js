import * as models from "./models.js";
import { PAID_NARRATIVE_SERVER_RESUME_KEYS } from "./paid-narrative-adapters.js";
import { publicRetryState } from "./paid-delivery-stuck.js";

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
    // 창이 지나거나 환불이 예약되면 publicRetryState 가 null 이라 아래 기존 정책(missing)으로 환불된다. 명시적 종료(includeResumable=false)는 그대로.
    if (includeResumable && execution.featureKey === "neo-operation-room-consultation" && doc.status === "generation_failed" && publicRetryState(doc, Date.now())) return "recoverable";
    if (["delivery_pending", "partial"].includes(doc.status)) return "recoverable";
    if (doc.status === "generating" && (doc.llmMeta?.resumeBody || doc.llmMeta?.attempts
      || doc.llmMeta?.waveInFlight || doc.llmMeta?.unknownAttempt || doc.sections?.some(section => section.body))) return "recoverable";
    return "missing";
  } catch { return "unknown"; }
}
