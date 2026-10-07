import { salvageTruncatedJsonObject } from "../../lib/llm-text.js";
import { PAID_LLM_PARTS_PER_REQUEST } from "./sync-llm-timeout.js";
import { createHash, randomUUID } from "node:crypto";
import { ServiceExecutionTransaction } from "./models.js";
import { withMongoRetry } from "./db.js";
import { json } from "./http.js";
import { getAmbientAiLocale, runWithAiLocale } from "./ai-locale-context.js";
import { callGeminiJsonWithRetry } from "./structured-consultation.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage } from "./paid-report-quality.js";
import { selectNarrativeCandidate, narrativeRepairTask, normalizeNarrativeBody, NARRATIVE_RESPONSE_SCHEMA } from "./paid-narrative-candidate.js";
import { runWithPaidGenerationContext, getPaidGenerationRaw } from "./paid-generation-context.js";

const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const failure = resultId => Object.assign(new Error("Result storage unavailable"), { code: "RESULT_STORAGE_UNAVAILABLE", resultId });
const cleanBody = body => JSON.parse(JSON.stringify(body, (key, value) => /^(?:premiumAccessToken|_premiumAccessToken|token|accessToken|authorization)$/i.test(key) ? undefined : value));
// Top-level checkout evidence a gate adds to the route body after payment. The
// executionKey already binds the purchase (user, feature, requestId), so these keys
// never make a different input; a key missing from this list still does.
const EVIDENCE_KEYS = new Set(["transactionId", "purchaseId", "paymentId", "orderId", "merchantUid", "impUid", "idempotencyKey", "ledgerId",
  "accessGrant", "consume", "payment", "paymentContext", "_paymentContext", "accessDecision", "paidAccess"]);
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const paidNarrativeInputHash = body => hash(stable(Object.fromEntries(Object.entries(cleanBody(body)).filter(([key]) => !EVIDENCE_KEYS.has(key)))));
export const paidNarrativeExecutionKey = (userId, featureKey, requestId) => `paid-narrative:${hash([String(userId), featureKey, requestId])}`;
export { cleanBody as cleanPaidNarrativeBody };
// One insert shape for the route and for an intent the cron proved paid
// (paid-narrative-intent.js), so both land in the same record under the unique key.
// No updatedAt: schema timestamps add $set.updatedAt to every update, and MongoDB
// rejects a path under both $set and $setOnInsert (code 40).
export function paidNarrativeInsert({ userId, executionKey, featureKey, reportType, original, seeded, locale, lock, now, timeoutAt, metadata = {} }) {
  const state = { ...seeded, body: cleanBody(original), evidenceHash: hash(seeded), locale, parts: {}, attempts: {} };
  return {
    userId, executionKey, featureKey, reportType,
    reportId: typeof original.sessionId === "string" && original.sessionId ? original.sessionId : executionKey,
    sessionId: typeof original.sessionId === "string" ? original.sessionId : "",
    idempotencyKey: original.requestId,
    status: "pending", premiumStatus: "generating", metadata: { ...metadata, paidNarrative: state }, lock,
    timeoutAt, createdAt: now,
  };
}
// measure is an adapter's own body length for structured parts (a JSON string's
// syntax is not reading text). Without one, the shared narrative count applies.
// Length targets guide generation; accepted parts and persisted reread decide delivery.
const ready = state => state.tasks.length > 0 && state.tasks.every(task => state.parts[task.id]);
const limited = state => state.tasks.some(task => !state.parts[task.id] && state.attempts[task.id] >= 2);
const reviewRequired = state => limited(state);

// Every raw op is its own withMongoRetry unit because the cron resume path reaches
// this engine (verify:cron-mongo-op-coverage). Reads may retry; writes keep
// { retries: 0 } so a lost reply is settled by the confirming read, not a rewrite.
async function find(env, filter) {
  try { return await withMongoRetry(env, () => ServiceExecutionTransaction.findOne(filter).sort({ createdAt: -1 }).lean()); }
  catch { throw failure(filter.executionKey || "pending"); }
}
async function save(env, filter, fields) {
  try {
    const written = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate({ ...filter, "lock.until": { $gt: new Date() } }, { $set: fields }, { returnDocument: "after" }).lean(), { retries: 0 });
    if (!written) throw failure(filter.executionKey);
    const confirmed = await withMongoRetry(env, () => ServiceExecutionTransaction.findOne({ userId: filter.userId, executionKey: filter.executionKey }).lean());
    for (const [key, value] of Object.entries(fields)) if (JSON.stringify(confirmed?.[key]) !== JSON.stringify(value)) throw failure(filter.executionKey);
    return confirmed;
  } catch { throw failure(filter.executionKey); }
}
async function revoked(env, doc, featureKey, body) {
  return ["refunded", "cancelled"].includes(doc?.status) || await withMongoRetry(env, () => isPaidResultRevoked(doc.userId, featureKey, [doc.executionKey, body.requestId, body.transactionId, body.purchaseId, body.paymentId, body.sessionId, doc.metadata?.paidNarrativeProof?.transactionId]));
}
function respond(doc, render, busy = false, measure) {
  const state = doc.metadata.paidNarrative;
  if (state.failureResult) return json(state.failureResult, { status: 500 });
  if (state.exhaustionClaimed) return json({ ok: false, code: "RESULT_STORAGE_UNAVAILABLE", reason: "DELIVERY_REVIEW_REQUIRED", resultId: doc.executionKey, retryable: false, paymentRetainedForRetry: true }, { status: 503 });
  if (doc.premiumStatus === "completed") return json({ ...doc.metadata.result, ok: true, status: "completed", resultId: doc.executionKey, saved: true });
  return json({ ...render(state), ok: true, status: ready(state, measure) ? "delivery_pending" : Object.keys(state.parts).length ? "partial" : "generating",
    saved: false, retryable: !reviewRequired(state, measure), reviewRequired: reviewRequired(state, measure),
    ...(reviewRequired(state, measure) ? { code: "DELIVERY_REVIEW_REQUIRED", nextAction: "support" } : {}),
    resultId: doc.executionKey, resumeBody: { resumeResultId: doc.executionKey },
    completedParts: Object.keys(state.parts), totalParts: state.tasks.length, busy, retryAfterMs: busy ? 5000 : 1000,
  }, { status: 202 });
}

// Uses the existing execution collection; no provider call survives beyond its own
// bounded request, and every accepted part is confirmed before the next wave.
export async function runPaidNarrativeDelivery(request, env, auth, body, { featureKey, reportType, seed, verify, render, produce, onExhausted, measureBody, completeBody, recoverSavedPart, savedOnly = false, timeoutMs = 45000, generationOrigin = "" }) {
  const userId = auth.userId;
  const params = new URL(request.url).searchParams;
  const resumeId = request.method === "GET" ? params.get("resultId") : body.resumeResultId;
  if (resumeId != null && (typeof resumeId !== "string" || !/^[a-zA-Z0-9:_-]{8,120}$/.test(resumeId))) return json({ ok: false, reason: "INVALID_RESULT_ID" }, { status: 422 });
  if (request.method !== "GET" && !resumeId && (typeof body.requestId !== "string" || body.requestId.length < 8 || body.requestId.length > 180)) return json({ ok: false, reason: "REQUEST_ID_REQUIRED" }, { status: 422 });
  const executionKey = resumeId || (request.method === "GET" ? "" : paidNarrativeExecutionKey(userId, featureKey, body.requestId));
  // A paid-intent record shares the collection but never carries paidNarrative.
  let doc = await find(env, { userId, featureKey, "metadata.paidNarrative": { $exists: true }, ...(executionKey ? { executionKey } : { status: "pending" }) });
  if (!doc && (request.method === "GET" || resumeId)) return json({ ok: false, reason: "RESULT_NOT_FOUND" }, { status: 404 });
  const original = doc?.metadata?.paidNarrative?.body || body;
  // A record the intent task created stores its server proof of this exact
  // purchase, and its body predates the checkout evidence the route verifier
  // reads. revoked() below still blocks a refunded or cancelled payment.
  if (!doc?.metadata?.paidNarrativeProof) await verify(original);
  if (await revoked(env, doc || { userId, executionKey }, featureKey, original)) return json({ ok: false, retryable: false, reason: "PAYMENT_REVOKED" }, { status: 403 });
  if (doc && !resumeId && request.method !== "GET" && paidNarrativeInputHash(body) !== paidNarrativeInputHash(original)) return json({ ok: false, reason: "INPUT_MISMATCH" }, { status: 409 });
  if (doc?.premiumStatus === "completed" || doc?.metadata?.paidNarrative?.exhaustionClaimed || request.method === "GET") return respond(doc, render, false, measureBody);
  const now = new Date(), token = randomUUID();
  const lock = { token, until: new Date(now.getTime() + 120000) };
  if (doc?.lock?.token && new Date(doc.lock.until) > now) return respond(doc, render, true, measureBody);
  if (!doc) {
    const seeded = await seed(original);
    const insert = paidNarrativeInsert({ userId, executionKey, featureKey, reportType, original, seeded, locale: getAmbientAiLocale() || "ko", lock, now, timeoutAt: new Date(now.getTime() + 600000) });
    try {
      const inserted = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate({ userId, executionKey }, { $setOnInsert: insert }, { upsert: true, returnDocument: "after" }).lean(), { retries: 0 });
      if (!inserted) throw failure(executionKey);
      doc = await find(env, { userId, executionKey });
      if (!doc?.metadata?.paidNarrative) throw failure(executionKey);
    } catch { throw failure(executionKey); }
  } else {
    try {
      const claim = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate({ userId, executionKey, status: "pending", "lock.token": doc.lock?.token ?? null }, { $set: { lock } }, { returnDocument: "after" }).lean(), { retries: 0 });
      if (!claim) return respond(doc, render, true, measureBody);
      doc = claim;
    } catch { throw failure(executionKey); }
  }
  if (doc.lock.token !== token) return respond(doc, render, true, measureBody);
  const filter = { userId, executionKey, status: "pending", "lock.token": token };
  let state = doc.metadata.paidNarrative;
  const persist = async () => { doc = await save(env, filter, { metadata: { ...doc.metadata, paidNarrative: structuredClone(state), paidNarrativeAlertedAt: null,
    // A crash after the checkpoint must not turn a saved-only review into a paid resume.
    paidNarrativeRecovery: savedOnly ? { ...doc.metadata.paidNarrativeRecovery, reviewRequired: true, code: "DELIVERY_REVIEW_REQUIRED" } : null },
    timeoutAt: new Date(Date.now() + 600000) }); };
  try {
    for (const task of state.tasks) {
      const draft = state.drafts?.[task.id] || (!state.parts[task.id] && recoverSavedPart?.(task, state));
      if (!state.parts[task.id] && draft) {
        const candidate = selectNarrativeCandidate(null, draft, { ...(completeBody && { complete: completeBody }), ...(measureBody && { measure: measureBody }) });
        if (candidate && !hasRepeatedReportPassage(Object.values(state.parts).join("\n") + "\n" + candidate)) { state.parts[task.id] = candidate; await persist(); }
      }
    }
    const missing = savedOnly ? [] : state.tasks.filter(task => !state.parts[task.id] && (state.attempts[task.id] || 0) < 2).slice(0, PAID_LLM_PARTS_PER_REQUEST);
    for (const task of missing) state.attempts[task.id] = (state.attempts[task.id] || 0) + 1;
    if (missing.length) await persist();
    let queue = Promise.resolve();
    const calls = await Promise.allSettled(missing.map(originalTask => runWithPaidGenerationContext({
      serviceId: featureKey, requestId: executionKey, sectionGroup: originalTask.id,
      attempt: state.attempts[originalTask.id], generationSource: (generationOrigin === "server" ? "server_" : "")
        + (state.drafts?.[originalTask.id] ? 'repair' : state.attempts[originalTask.id] > 1 ? 'recovery' : 'initial'),
    }, async () => {
      const draft = state.drafts?.[originalTask.id];
      const task = narrativeRepairTask(originalTask, draft);
      const prompt = `${state.prompt}\n\n[이번 호출 범위]\n${task.prompt}\nJSON {"evidenceHash":"${state.evidenceHash}","body":"본문"} 하나만 출력하세요. 본문은 제목·목차·마크다운·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.3)}~${Math.ceil(task.minChars * 1.5)}자입니다. 확정 계산값을 바꾸지 말고 근거 → 생활 패턴 → 반대 조건·주의점 → 행동 조언 순으로 짧은 문단을 나누세요. 반복으로 분량을 채우지 마세요.`;
      let ai, value;
      try {
        if (produce) {
          value = await runWithAiLocale(state.locale, () => produce(task, state));
          ai = value ? { ok: true } : null;
        } else {
          ai = await runWithAiLocale(state.locale, () => callGeminiJsonWithRetry(env, prompt, {
            systemPrompt: state.systemPrompt, taskType: "fortune", temperature: 0.55, attempts: 1,
            responseSchema: NARRATIVE_RESPONSE_SCHEMA,
            timeoutMs: Math.min(45000, Math.max(15000, Number(timeoutMs) || 45000)), baseTokens: 9500, capTokens: 9500, fallbackToWorkersAI: false,
          }));
          try { value = JSON.parse(ai?.text || ""); } catch { value = salvageTruncatedJsonObject(ai?.text || ""); }
          if (value && !value.evidenceHash) value.evidenceHash = state.evidenceHash;
        }
      } catch { ai = null; }
      const valid = ai?.ok && !ai.isMock && !/mock/i.test(`${ai.provider || ""} ${ai.model || ""}`)
        && value?.evidenceHash === state.evidenceHash && typeof value.body === "string" && countPaidReportBodyChars(value.body) > 0;
      const accept = async () => {
        const raw = getPaidGenerationRaw() || ai?.rawText || ai?.text || (value ? JSON.stringify(value) : "");
        if (raw) state.rawResponses = { ...state.rawResponses, [task.id]: raw };
        const edited = valid && !/^\s*[\[{]/.test(value.body)
          ? normalizeNarrativeBody(value.body) : value?.body;
        const body = valid && !hasRepeatedReportPassage(edited)
          && !hasRepeatedReportPassage(Object.values(state.parts).join("\n") + "\n" + edited) ? edited : null;
        const previous = draft && !hasRepeatedReportPassage(Object.values(state.parts).join("\n") + "\n" + draft) ? draft : null;
        const candidate = selectNarrativeCandidate(previous, body, { ...(completeBody && { complete: completeBody }), ...(measureBody && { measure: measureBody }) });
        // Preserve the existing producer acceptance for full structured results.
        // Short narratives/structured adapters use their own completeness check.
        const accepted = body && (measureBody || countPaidReportBodyChars)(body) >= task.minChars ? candidate || body : candidate;
        const chosen = accepted || candidate;
        if (!chosen || hasRepeatedReportPassage(chosen) || hasRepeatedReportPassage(Object.values(state.parts).join("\n") + "\n" + chosen)) { await persist(); return; }
        state = { ...state,
          drafts: { ...state.drafts, [task.id]: accepted ? null : candidate },
          parts: accepted ? { ...state.parts, [task.id]: accepted } : state.parts };
        await persist();
      };
      queue = queue.then(accept, accept); await queue;
    })));
    const rejected = calls.find(call => call.status === "rejected"); if (rejected) throw rejected.reason;
    if (!ready(state, measureBody)) {
      if (!savedOnly && limited(state) && onExhausted) {
        // Persist a single refund claim before any external side effect. An
        // uncertain refund response is for reconciliation, never another refund.
        state = { ...state, exhaustionClaimed: true };
        await persist();
        const failureResult = await onExhausted(state);
        state = { ...state, failureResult };
        await persist();
      }
      return respond(doc, render, false, measureBody);
    }
    doc = await save(env, filter, { metadata: { ...doc.metadata, result: render(state) }, premiumStatus: "generating" });
    if (await revoked(env, doc, featureKey, original)) return json({ ok: false, retryable: false, reason: "PAYMENT_REVOKED" }, { status: 403 });
    doc = await save(env, filter, { status: "success", premiumStatus: "completed", deliveryStatus: "delivered", completedAt: new Date(),
      ...(savedOnly ? { metadata: { ...doc.metadata, paidNarrativeRecovery: null } } : {}) });
    return respond(doc, render, false, measureBody);
  } finally {
    await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne({ userId, executionKey, "lock.token": token }, { $set: { "lock.token": "", "lock.until": null } }), { retries: 0 }).catch(() => {});
  }
}

// Cron entry for an execution the browser left unfinished. The record exists only
// after the product's verify() accepted this user and body, so verify is not rerun:
// product verifiers read request cookies or consume a pass. revoked() still blocks
// refunded or cancelled payments before any provider call and before completion.
// A resume never creates a record, so seed is unreachable and fails closed.
export function resumePaidNarrativeOnServer(env, doc, adapter) {
  const request = new Request("https://internal.invalid/paid-narrative/resume", { method: "POST" });
  return runPaidNarrativeDelivery(request, env, { userId: String(doc.userId) }, { resumeResultId: doc.executionKey }, {
    ...adapter, featureKey: doc.featureKey,
    // Token logs label cron calls server_* so their cost is separable from browser retries.
    generationOrigin: "server",
    verify: async () => {},
    seed: async () => { throw failure(doc.executionKey); },
  });
}
