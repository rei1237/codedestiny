import { createHash } from 'node:crypto';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { isPaidResultRevoked } from './paid-result-revocation.js';
import { json } from './http.js';

// A repeated question on the same purchased report reuses its saved answer.
// The original report remains authoritative; no new purchase is made here.
export async function deliverExpertFollowUp({ request, env, auth, consultation, message, featureKey, model, generate, render }) {
  const receipt = createHash('sha256').update(JSON.stringify([featureKey, consultation.id, message])).digest('hex');
  const filter = { id: consultation.id, userId: String(auth.userId), status: 'completed' };
  const marker = 'llmMeta.followUpReceipts.' + receipt;
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
    const current = await model.findOne(filter).lean();
    if (!current) throw Error('RESULT_STORAGE_UNAVAILABLE');
    if (!current.llmMeta?.followUpReceipts?.[receipt]) {
      const updated = await model.findOneAndUpdate({ ...filter, [marker]: { $ne: true } }, {
        $push: { messages: { $each: [{ role: 'user', content: result.question, createdAt: new Date() }, { role: 'assistant', content: result.answer, createdAt: new Date() }] } },
        $set: { [marker]: true },
      }, { new: true }).lean();
      // A competing attachment can win; only the confirmed marker below proves delivery.
      if (updated === undefined) throw Error('RESULT_STORAGE_UNAVAILABLE');
    }
    const confirmed = await model.findOne(filter).lean();
    if (!confirmed?.llmMeta?.followUpReceipts?.[receipt] || !confirmed.messages?.some(item => item.role === 'assistant' && item.content === result.answer)) throw Error('RESULT_STORAGE_UNAVAILABLE');
    return json({ ...render(confirmed), saved: true });
  } catch (error) {
    if (error.status === 403) return json({ ok: false, reason: 'PAYMENT_REVOKED', retryable: false }, { status: 403 });
    return json({ ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE', retryable: true, message: '같은 질문의 저장된 답변을 다시 확인해 주세요.' }, { status: 503 });
  }
}
