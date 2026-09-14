import * as models from "./models.js";

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

export async function inspectCheckpointBeforeTimeoutRefund(execution) {
  // An already-started refund must finish its existing idempotent settlement.
  if (execution.refundStatus && execution.refundStatus !== "none") return "unmanaged";
  if (execution.featureKey === "tarot-celestial-harmony" && execution.metadata?.celestialDelivery?.delivery) return "recoverable";
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
    if (["delivery_pending", "partial"].includes(doc.status)) return "recoverable";
    if (doc.status === "generating" && (doc.llmMeta?.resumeBody || doc.llmMeta?.attempts
      || doc.llmMeta?.waveInFlight || doc.llmMeta?.unknownAttempt || doc.sections?.some(section => section.body))) return "recoverable";
    return "missing";
  } catch { return "unknown"; }
}
