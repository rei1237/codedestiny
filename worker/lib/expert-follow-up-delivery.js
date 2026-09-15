import { createHash } from 'node:crypto';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { ServiceExecutionTransaction } from './models.js';
import { isPaidResultRevoked } from './paid-result-revocation.js';
import { json } from './http.js';

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
export async function recoverSavedExpertFollowUps({ auth, consultation, featureKey, model }) {
  const filter = { id: consultation.id, userId: String(auth.userId), status: 'completed' };
  try {
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
      current = await attachSavedAnswer({ model, filter, current, receipt, result });
    }
    return current;
  } catch { throw Object.assign(Error('RESULT_STORAGE_UNAVAILABLE'), { code: 'RESULT_STORAGE_UNAVAILABLE' }); }
}

// A repeated question on the same purchased report reuses its saved answer.
// The original report remains authoritative; no new purchase is made here.
export async function deliverExpertFollowUp({ request, env, auth, consultation, message, featureKey, model, generate, render }) {
  const receipt = createHash('sha256').update(JSON.stringify([featureKey, consultation.id, message])).digest('hex');
  const filter = { id: consultation.id, userId: String(auth.userId), status: 'completed' };
  const verify = async () => {
    const tokens = [consultation.idempotencyKey, consultation.paymentId, consultation.id];
    if (await isPaidResultRevoked(auth.userId, featureKey, tokens)) throw Object.assign(new Error('PAYMENT_REVOKED'), { status: 403 });
  };
  try {
    await verify();
    const response = await runPaidNarrativeDelivery(request, env, auth, { requestId: 'follow-up:' + receipt, sessionId: consultation.id, message }, {
      featureKey, reportType: 'expertFollowUp', verify,
      seed: async () => ({ input: consultation, prompt: '', minBodyChars: 180, tasks: [{ id: 'answer', prompt: '', minChars: 180 }] }),
      produce: async (_task, state) => {
        const answer = await generate(state.input, state.body.message);
        if (!answer?.text || answer.truncated || answer.isMock || /mock/i.test(`${answer.provider || ''} ${answer.model || ''}`) || !/[.!?。？！]["'”’)]?\s*$/u.test(answer.text)) return null;
        return { evidenceHash: state.evidenceHash, body: answer.text };
      },
      render: state => ({ answer: state.parts.answer || '', question: state.body.message }),
    });
    const result = await response.json();
    if (response.status !== 200 || !result.saved) return json({ ...result, ok: false }, { status: response.status });
    await verify();
    let current = await model.findOne(filter).lean();
    if (!current) throw Error('RESULT_STORAGE_UNAVAILABLE');
    current = await attachSavedAnswer({ model, filter, current, receipt, result });
    return json({ ...render(current), saved: true });
  } catch (error) {
    if (error.status === 403) return json({ ok: false, reason: 'PAYMENT_REVOKED', retryable: false }, { status: 403 });
    return json({ ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE', retryable: true, message: '같은 질문의 저장된 답변을 다시 확인해 주세요.' }, { status: 503 });
  }
}
