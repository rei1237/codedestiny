import { createHash, randomUUID } from "node:crypto";
import { ServiceExecutionTransaction } from "./models.js";
import { connectDb } from "./db.js";
import { json } from "./http.js";
import { getAmbientAiLocale, runWithAiLocale } from "./ai-locale-context.js";
import { callGeminiJsonWithRetry } from "./structured-consultation.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage } from "./paid-report-quality.js";

const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const failure = resultId => Object.assign(new Error("Result storage unavailable"), { code: "RESULT_STORAGE_UNAVAILABLE", resultId });
const cleanBody = body => JSON.parse(JSON.stringify(body, (key, value) => /^(?:premiumAccessToken|_premiumAccessToken|token|accessToken|authorization)$/i.test(key) ? undefined : value));
const ready = state => state.tasks.every(task => state.parts[task.id])
  && countPaidReportBodyChars(Object.values(state.parts).join("\n")) >= state.minBodyChars;
const limited = state => state.tasks.some(task => !state.parts[task.id] && state.attempts[task.id] >= 3);

async function find(env, filter) {
  try { await connectDb(env); return await ServiceExecutionTransaction.findOne(filter).sort({ createdAt: -1 }).lean(); }
  catch { throw failure(filter.executionKey || "pending"); }
}
async function save(filter, fields) {
  try {
    const written = await ServiceExecutionTransaction.findOneAndUpdate(filter, { $set: fields }, { returnDocument: "after" }).lean();
    if (!written) throw failure(filter.executionKey);
    const confirmed = await ServiceExecutionTransaction.findOne({ userId: filter.userId, executionKey: filter.executionKey }).lean();
    for (const [key, value] of Object.entries(fields)) if (JSON.stringify(confirmed?.[key]) !== JSON.stringify(value)) throw failure(filter.executionKey);
    return confirmed;
  } catch { throw failure(filter.executionKey); }
}
async function revoked(doc, featureKey, body) {
  return ["refunded", "cancelled"].includes(doc?.status) || await isPaidResultRevoked(doc.userId, featureKey, [doc.executionKey, body.requestId, body.transactionId, body.purchaseId, body.paymentId, body.sessionId]);
}
function respond(doc, render) {
  const state = doc.metadata.paidNarrative;
  if (doc.premiumStatus === "completed") return json({ ...doc.metadata.result, ok: true, status: "completed", resultId: doc.executionKey, saved: true });
  return json({ ...render(state), ok: true, status: ready(state) ? "delivery_pending" : Object.keys(state.parts).length ? "partial" : "generating",
    saved: false, retryable: !limited(state), resultId: doc.executionKey, resumeBody: { resumeResultId: doc.executionKey },
    completedParts: Object.keys(state.parts), totalParts: state.tasks.length,
  }, { status: 202 });
}

// Uses the existing execution collection; no provider call survives beyond its own
// bounded request, and every accepted part is confirmed before the next wave.
export async function runPaidNarrativeDelivery(request, env, auth, body, { featureKey, reportType, seed, verify, render, timeoutMs = 45000 }) {
  const userId = auth.userId;
  const params = new URL(request.url).searchParams;
  const resumeId = request.method === "GET" ? params.get("resultId") : body.resumeResultId;
  if (resumeId != null && (typeof resumeId !== "string" || !/^[a-zA-Z0-9:_-]{8,120}$/.test(resumeId))) return json({ ok: false, reason: "INVALID_RESULT_ID" }, { status: 422 });
  if (request.method !== "GET" && !resumeId && (typeof body.requestId !== "string" || body.requestId.length < 8 || body.requestId.length > 180)) return json({ ok: false, reason: "REQUEST_ID_REQUIRED" }, { status: 422 });
  const executionKey = resumeId || (request.method === "GET" ? "" : `paid-narrative:${hash([String(userId), featureKey, body.requestId])}`);
  let doc = await find(env, { userId, featureKey, ...(executionKey ? { executionKey } : { status: "pending", "metadata.paidNarrative": { $exists: true } }) });
  if (!doc && (request.method === "GET" || resumeId)) return json({ ok: false, reason: "RESULT_NOT_FOUND" }, { status: 404 });
  const original = doc?.metadata?.paidNarrative?.body || body;
  await verify(original);
  if (await revoked(doc || { userId, executionKey }, featureKey, original)) return json({ ok: false, retryable: false, reason: "PAYMENT_REVOKED" }, { status: 403 });
  if (doc && !resumeId && request.method !== "GET" && hash(cleanBody(body)) !== hash(original)) return json({ ok: false, reason: "INPUT_MISMATCH" }, { status: 409 });
  if (doc?.premiumStatus === "completed" || request.method === "GET") return respond(doc, render);
  const now = new Date(), token = randomUUID();
  const lock = { token, until: new Date(now.getTime() + 120000) };
  if (doc?.lock?.token && new Date(doc.lock.until) > now) return respond(doc, render);
  if (!doc) {
    const seeded = seed(original);
    const state = { ...seeded, body: cleanBody(original), evidenceHash: hash(seeded), locale: getAmbientAiLocale() || "ko", parts: {}, attempts: {} };
    try {
      const inserted = await ServiceExecutionTransaction.findOneAndUpdate({ userId, executionKey }, { $setOnInsert: {
        userId, executionKey, featureKey, reportType, reportId: executionKey, idempotencyKey: original.requestId,
        status: "pending", premiumStatus: "generating", metadata: { paidNarrative: state }, lock,
        timeoutAt: new Date(now.getTime() + 600000), createdAt: now, updatedAt: now,
      } }, { upsert: true, returnDocument: "after" }).lean();
      if (!inserted) throw failure(executionKey);
      doc = await find(env, { userId, executionKey });
      if (!doc?.metadata?.paidNarrative) throw failure(executionKey);
    } catch { throw failure(executionKey); }
  } else {
    try {
      const claim = await ServiceExecutionTransaction.findOneAndUpdate({ userId, executionKey, status: "pending", "lock.token": doc.lock?.token ?? null }, { $set: { lock } }, { returnDocument: "after" }).lean();
      if (!claim) return respond(doc, render);
      doc = claim;
    } catch { throw failure(executionKey); }
  }
  if (doc.lock.token !== token) return respond(doc, render);
  const filter = { userId, executionKey, status: "pending", "lock.token": token };
  let state = doc.metadata.paidNarrative;
  const persist = async () => { doc = await save(filter, { metadata: { ...doc.metadata, paidNarrative: structuredClone(state) } }); };
  try {
    const missing = state.tasks.filter(task => !state.parts[task.id] && (state.attempts[task.id] || 0) < 3).slice(0, 4);
    for (const task of missing) state.attempts[task.id] = (state.attempts[task.id] || 0) + 1;
    if (missing.length) await persist();
    let queue = Promise.resolve();
    const calls = await Promise.allSettled(missing.map(async task => {
      const prompt = `${state.prompt}\n\n[이번 호출 범위]\n${task.prompt}\nJSON {"evidenceHash":"${state.evidenceHash}","body":"본문"} 하나만 출력하세요. 본문은 제목·목차·마크다운·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.2)}~${Math.ceil(task.minChars * 1.4)}자입니다. 확정 계산값을 바꾸지 말고 근거 → 생활 패턴 → 반대 조건·주의점 → 행동 조언 순으로 짧은 문단을 나누세요. 반복으로 분량을 채우지 마세요.`;
      let ai;
      try {
        ai = await runWithAiLocale(state.locale, () => callGeminiJsonWithRetry(env, prompt, {
          systemPrompt: state.systemPrompt, taskType: "fortune", temperature: 0.55, attempts: 1,
          timeoutMs: Math.min(45000, Math.max(15000, Number(timeoutMs) || 45000)), baseTokens: 9500, capTokens: 9500, fallbackToWorkersAI: false,
        }));
      } catch { return; }
      let value;
      try { value = JSON.parse(ai?.text || ""); } catch { value = null; }
      if (!ai?.ok || ai.truncated || ai.isMock || /mock/i.test(`${ai.provider || ""} ${ai.model || ""}`)
        || value?.evidenceHash !== state.evidenceHash || typeof value.body !== "string" || countPaidReportBodyChars(value.body) < task.minChars) return;
      const accept = async () => {
        if (hasRepeatedReportPassage(value.body) || hasRepeatedReportPassage(Object.values(state.parts).join("\n") + "\n" + value.body)) return;
        state = { ...state, parts: { ...state.parts, [task.id]: value.body } };
        await persist();
      };
      queue = queue.then(accept, accept); await queue;
    }));
    const rejected = calls.find(call => call.status === "rejected"); if (rejected) throw rejected.reason;
    if (!ready(state)) return respond(doc, render);
    doc = await save(filter, { metadata: { ...doc.metadata, result: render(state) }, premiumStatus: "generating" });
    if (await revoked(doc, featureKey, original)) return json({ ok: false, retryable: false, reason: "PAYMENT_REVOKED" }, { status: 403 });
    doc = await save(filter, { status: "success", premiumStatus: "completed", deliveryStatus: "delivered", completedAt: new Date() });
    return respond(doc, render);
  } finally {
    await ServiceExecutionTransaction.updateOne({ userId, executionKey, "lock.token": token }, { $set: { "lock.token": "", "lock.until": null } }).catch(() => {});
  }
}
