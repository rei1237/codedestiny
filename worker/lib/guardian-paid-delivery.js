import { createHash } from 'node:crypto';
import { ServiceExecutionTransaction } from './models.js';
import { connectDb } from './db.js';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { buildGuardianFortuneContext } from './guardian-fortune-context.js';
import { generateGuardianFortuneWithConfiguredLLM } from './guardian-fortune-llm.js';
import { shouldUseRealGuardianFortuneLLM } from './guardian-fortune-llm-policy.js';
import { GUARDIAN_FORTUNE_PAID_FEATURE_KEY } from './guardian-fortune-usage.js';

const featureKey = GUARDIAN_FORTUNE_PAID_FEATURE_KEY;
const executionId = (userId, requestId) => 'paid-narrative:' + createHash('sha256').update(JSON.stringify([String(userId), featureKey, requestId])).digest('hex');
const unavailable = requestId => ({ ok: false, status: 503, error: 'RESULT_STORAGE_UNAVAILABLE', message: '저장된 상담을 확인하고 있어요. 같은 상담으로 다시 시도해 주세요.', requestId, retryable: true, paymentRetainedForRetry: true });

// Paid conversation turns use the same existing private execution collection as
// reports. Free conversations retain their own usage and generation contract.
export async function deliverGuardianPaid({ env, input, userId, requestId, resolvePaidAccess, resumeOnly = false, readOnly = false,
  contextBuilder = buildGuardianFortuneContext, generator = generateGuardianFortuneWithConfiguredLLM, contextOptions = {} }) {
  if (!userId) return null;
  try {
    await connectDb(env);
    const found = await ServiceExecutionTransaction.findOne({ userId, featureKey, ...(requestId ? { executionKey: executionId(userId, requestId) } : {}) }).sort({ createdAt: -1 }).lean();
    if (resumeOnly && !found) return null;
    if (readOnly && !found) return { ok: false, status: 404, error: 'RESULT_NOT_FOUND' };
    if (!found?.metadata?.paidNarrative?.parts?.answer && String(env.NODE_ENV).toLowerCase() !== 'test' && !shouldUseRealGuardianFortuneLLM({ env, userId })) {
      return { ...unavailable(requestId), error: 'LLM_NOT_CONFIGURED', retryable: false, message: '상담 생성 연결을 확인하고 있어요. 기존 결제 내역을 보존했습니다.' };
    }
    const body = found ? { resumeResultId: found.executionKey } : { ...input, requestId };
    const response = await runPaidNarrativeDelivery(new Request('https://internal.invalid/api/fortune/guardian/generate' + (readOnly ? '?resultId=' + encodeURIComponent(found.executionKey) : ''), { method: readOnly ? 'GET' : 'POST' }), env, { userId }, body, {
      featureKey, reportType: 'guardianPaidTurn',
      verify: async original => {
        const proof = await resolvePaidAccess({ userId, requestId: original.requestId });
        if (!proof?.ok) throw Object.assign(Error('결제 내역을 확인하지 못했어요.'), { accessStatus: proof?.degraded ? 503 : 403 });
      },
      seed: async original => {
        const calculated = await contextBuilder(original, contextOptions);
        if (!calculated?.ok || calculated.context?.availableSystems?.length !== 1 || calculated.context.availableSystems[0] !== original.category) throw Object.assign(Error('계산 근거를 확인하지 못했어요.'), { accessStatus: 422 });
        return { input: original, context: calculated.context, prompt: '', minBodyChars: 1, tasks: [{ id: 'answer', prompt: '', minChars: 1 }] };
      },
      produce: async (_task, state) => {
        // Development stays mock-only. Production must never silently sell a
        // mock or deterministic fallback as a completed paid LLM consultation.
        if (String(env.NODE_ENV).toLowerCase() !== 'test' && !shouldUseRealGuardianFortuneLLM({ env, userId })) return null;
        const generated = await generator({ input: state.input, context: state.context, env, requestId, userId, generationSource: 'paid', singleAttempt: true });
        if (!generated?.result || generated.usedFallback || generated.isMock || generated.deliverable === false) return null;
        return { evidenceHash: state.evidenceHash, body: JSON.stringify(generated.result) };
      },
      render: state => ({ result: state.parts.answer ? JSON.parse(state.parts.answer) : null, generationSource: 'paid', requestId: state.body.requestId, resumeInputs: state.input }),
    });
    const payload = await response.json();
    if (response.status === 202) return { ...payload, ok: false, status: 202, error: 'DELIVERY_PENDING', message: payload.retryable === false ? '상담 생성을 완료하지 못했어요. 기존 결제 내역을 기준으로 확인이 필요합니다.' : '같은 상담의 저장된 답변을 이어서 확인하고 있어요.', paymentRetainedForRetry: true };
    return { ...payload, status: response.status, ...(response.status >= 400 ? { error: payload.reason || payload.code } : {}) };
  } catch (error) {
    if (error.accessStatus) return { ok: false, status: error.accessStatus, error: error.accessStatus === 403 ? 'PAYMENT_REVOKED' : 'PAID_ACCESS_VERIFY_RETRYABLE', message: error.message, requestId, retryable: error.accessStatus === 503 };
    return unavailable(requestId);
  }
}
