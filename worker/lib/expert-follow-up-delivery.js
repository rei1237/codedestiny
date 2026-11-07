import { normalizeNarrativeBody, completeNarrativeBody } from './paid-narrative-candidate.js';
import { createHash } from 'node:crypto';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { ServiceExecutionTransaction } from './models.js';
import { isPaidResultRevoked } from './paid-result-revocation.js';
import { json } from './http.js';
import { runWithAiLocale, storedAiLocale } from './ai-locale-context.js';
import { compactFollowupMessages } from './followup-context.js';

const receiptFrom = doc => {
  const requestId = String(doc?.metadata?.paidNarrative?.body?.requestId || '');
  return /^follow-up:[a-f0-9]{64}$/.test(requestId) ? requestId.slice('follow-up:'.length) : '';
};

async function attachSavedAnswer({ model, filter, current, receipt, result }) {
  const marker = 'llmMeta.followUpReceipts.' + receipt;
  if (!current.llmMeta?.followUpReceipts?.[receipt]) {
    const updated = await model.findOneAndUpdate({ ...filter, [marker]: { $ne: true } }, {
      $push: { messages: { $each: [{ role: 'user', content: result.question, createdAt: new Date() }, { role: 'assistant', content: result.answer, createdAt: new Date() }] } },
      $set: { [marker]: true },
    }, { new: true }).lean();
    if (updated === undefined) throw Error('RESULT_STORAGE_UNAVAILABLE');
  }
  const confirmed = await model.findOne(filter).lean();
  if (!confirmed?.llmMeta?.followUpReceipts?.[receipt] || !confirmed.messages?.some(item => item.role === 'assistant' && item.content === result.answer)) throw Error('RESULT_STORAGE_UNAVAILABLE');
  return confirmed;
}

// A result GET is also a recovery boundary. It attaches answers that were
// durably saved before the original request died, without generating again.
export async function recoverSavedExpertFollowUps({ auth, consultation, featureKey, model, verifyAccess }) {
  const filter = { id: consultation.id, userId: String(auth.userId), status: 'completed' };
  try {
    if (verifyAccess) await verifyAccess();
    const tokens = [consultation.idempotencyKey, consultation.paymentId, consultation.id];
    if (await isPaidResultRevoked(auth.userId, featureKey, tokens)) return consultation;
    const saved = await ServiceExecutionTransaction.find({
      userId: String(auth.userId), featureKey, reportType: 'expertFollowUp', status: 'success', premiumStatus: 'completed',
      $or: [{ reportId: consultation.id }, { sessionId: consultation.id }, { 'metadata.paidNarrative.body.sessionId': consultation.id }],
    }).sort({ createdAt: 1 }).limit(20).lean();
    let current = consultation;
    for (const doc of saved) {
      const receipt = receiptFrom(doc);
      const result = doc?.metadata?.result;
      if (!receipt || typeof result?.question !== 'string' || typeof result?.answer !== 'string' || !result.answer) continue;
      if (verifyAccess) await verifyAccess();
      current = await attachSavedAnswer({ model, filter, current, receipt, result });
    }
    return current;
  } catch (error) {
    if (verifyAccess && error?.status) throw error;
    throw Object.assign(Error('RESULT_STORAGE_UNAVAILABLE'), { code: 'RESULT_STORAGE_UNAVAILABLE' });
  }
}

// A repeated question on the same purchased report reuses its saved answer.
// The original report remains authoritative; no new purchase is made here.
export async function deliverExpertFollowUp({ request, env, auth, consultation, message, featureKey, model, generate, render, verifyAccess }) {
  if (consultation.accessSource === 'toss' && typeof verifyAccess !== 'function') return json({ ok: false, reason: 'RESULT_NOT_FOUND' }, { status: 404 });
  const receipt = createHash('sha256').update(JSON.stringify([featureKey, consultation.id, message])).digest('hex');
  const filter = { id: consultation.id, userId: String(auth.userId), status: 'completed' };
  const verify = async () => {
    if (verifyAccess) await verifyAccess();
    const tokens = [consultation.idempotencyKey, consultation.paymentId, consultation.id];
    if (await isPaidResultRevoked(auth.userId, featureKey, tokens)) throw Object.assign(new Error('PAYMENT_REVOKED'), { status: 403 });
  };
  try {
    await verify();
    const adapter = expertFollowUpNarrativeAdapter({ featureKey, verify, consultation, generate });
    // Only the trusted native route supplies both the saved source and its
    // order verifier; request data alone cannot choose a payment authority.
    if (consultation.accessSource === 'toss' && verifyAccess) adapter.generationOrigin = 'toss';
    const response = await runPaidNarrativeDelivery(request, env, auth, { requestId: 'follow-up:' + receipt, sessionId: consultation.id, message }, adapter);
    const result = await response.json();
    if (response.status !== 200 || !result.saved) return json({ ...result, ok: false }, { status: response.status });
    await verify();
    let current = await model.findOne(filter).lean();
    if (!current) throw Error('RESULT_STORAGE_UNAVAILABLE');
    current = await attachSavedAnswer({ model, filter, current, receipt, result });
    return json({ ...render(current), saved: true });
  } catch (error) {
    if (verifyAccess && error?.status) return json({ ok: false, reason: error.code || 'ACCESS_DENIED', retryable: error.status >= 500 || error.status === 429 }, { status: error.status });
    if (error.status === 403) return json({ ok: false, reason: 'PAYMENT_REVOKED', retryable: false }, { status: 403 });
    return json({ ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE', retryable: true, message: '같은 질문의 저장된 답변을 다시 확인해 주세요.' }, { status: 503 });
  }
}

export function expertFollowUpNarrativeAdapter({ featureKey, generate, consultation, verify = async () => { throw new Error("SERVER_RESUME_ONLY"); } }) {
  return {
      featureKey, reportType: 'expertFollowUp', verify,
      seed: async () => ({ input: consultation, prompt: '', minBodyChars: 180, tasks: [{ id: 'answer', prompt: '', minChars: 180 }] }),
      produce: async (_task, state) => {
        const boundedInput = { ...state.input, messages: compactFollowupMessages(state.input?.messages, { maxChars: 16000, recent: 2 }) };
        const answer = await runWithAiLocale(storedAiLocale(state.input), () => generate(boundedInput, state.body.message));
        if (!answer?.text || answer.isMock || /mock/i.test(`${answer.provider || ''} ${answer.model || ''}`)) return null;
        const body = normalizeNarrativeBody(answer.text);
        return completeNarrativeBody(body) ? { evidenceHash: state.evidenceHash, body, rawText: answer.rawText || answer.text } : null;
      },
      render: state => ({ answer: state.parts.answer || '', question: state.body.message }),
  };
}
