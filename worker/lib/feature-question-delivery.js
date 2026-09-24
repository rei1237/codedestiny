import { createHash } from 'node:crypto';
import { ServiceExecutionTransaction } from './models.js';
import { connectDb } from './db.js';
import { json } from './http.js';
import { callGeminiText } from './gemini.js';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const HEADINGS = ['질문의 핵심과 한 줄 답변', '타고난 기질과 반복되는 선택', '현재 흐름을 보여 주는 근거', '강점과 활용할 자원', '관계에서 드러나는 패턴', '일과 재물에서 확인할 조건', '주의할 약점과 반대 가능성', '가까운 변화와 시기 해석의 한계', '현실적인 행동 계획', '종합 판단과 마지막 메시지'];

export function questionFacts(value, path = 'chart', rows = []) {
  if (rows.length >= 100) return rows;
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (/token|authorization|payment|requestId|question|prompt/i.test(key)) continue;
      questionFacts(child, `${path}.${key}`, rows);
      if (rows.length >= 100) break;
    }
  } else if ((typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.trim() && value.length <= 180)) {
    rows.push({ id: `fact-${rows.length + 1}`, path, value });
  }
  return rows;
}

export async function deliverFeatureQuestion(request, env, auth, supplied, { featureKey, prepare, verify, refund }) {
  try {
    const body = { ...supplied };
    if (request.method !== 'GET' && !body.resumeResultId && !body.requestId) body.requestId = `question:${hash([String(auth.userId), featureKey, body])}`;
    let proof;
    return await runPaidNarrativeDelivery(request, env, auth, body, {
      featureKey, reportType: 'featureQuestionConsultation',
      verify: async original => { proof = await verify(original); },
      seed: async original => {
        const { built, factsInput } = await prepare(original);
        const facts = questionFacts(factsInput);
        if (!facts.length) throw Object.assign(Error('상담의 계산 근거가 필요합니다.'), { status: 422, code: 'MISSING_CALCULATED_FACTS' });
        return { built, facts, paymentProof: proof,
          prompt: String(built.generatedPrompt || built.prompt || ''),
          systemPrompt: '각 점술 체계를 섞지 말고 제공된 계산값만 해설합니다. 시기 정보가 없으면 날짜를 지어내지 않습니다. 확률이나 타인의 마음을 단정하지 않고 근거와 반대 조건, 실행 가능한 선택을 제시합니다.',
          minBodyChars: 20000,
          tasks: HEADINGS.map((title, index) => ({ id: `part-${index + 1}`, title, prompt: title, minChars: 2200 })),
        };
      },
      render: state => ({
        resultText: state.tasks.filter(task => state.parts[task.id]).map(task => `## ${task.title}\n\n${state.parts[task.id]}`).join('\n\n'),
        title: state.built.title, prompt: state.built.prompt, generatedPrompt: state.built.generatedPrompt || state.built.prompt,
        summaryIntent: state.built.summaryIntent || '', analysisAngles: state.built.analysisAngles || [],
        recommendedFollowUpQuestions: state.built.recommendedFollowUpQuestions || [],
        caution: state.built.caution, questionType: state.built.questionType,
        compatibilityUsed: Boolean(state.built.compatibilityUsed), compatibilityHint: state.built.compatibilityHint,
        featureKey, requestId: state.body.requestId, locale: state.locale,
        chargedCoins: state.paymentProof?.chargedCoins || 0, balanceAfter: state.paymentProof?.balanceAfter,
        paymentRetainedForRetry: true, resumeInputs: state.body,
        sections: state.tasks.filter(task => state.parts[task.id]).map(task => ({ key: task.id, title: task.title, body: state.parts[task.id] })),
      }),
      produce: async (task, state) => {
        const ai = await callGeminiText(env, `${state.prompt}\n\n[고정 계산 근거]\n${JSON.stringify(state.facts)}\n[이번 부분: ${task.id}] ${task.title}\nJSON {"evidenceHash":"${state.evidenceHash}","claims":[{"factId":"fact-1","value":"해당 근거의 원래 값"}],"body":"상담 본문"}만 출력하세요. claims에는 실제 사용하는 계산 근거를 하나 이상 정확하게 복사합니다. 본문은 공백 제외 최소 ${task.minChars}자, 목표 2800~3200자입니다. 이 부분에 해당하는 근거와 구체적 생활 사례·반대 조건·행동을 각각 다른 문단으로 쓰고 마지막 문장을 완결합니다. 다른 부분은 쓰지 않습니다.`, {
          systemPrompt: state.systemPrompt, timeoutMs: 45000, maxOutputTokens: 9500,
          thinkingBudget: 0, responseMimeType: 'application/json', fallbackToWorkersAI: false,
        });
        if (!ai?.ok || ai.truncated || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
        let parsed; try { parsed = JSON.parse(ai.text); } catch { return null; }
        if (!Array.isArray(parsed.claims) || !parsed.claims.length || parsed.claims.some(claim => {
          const fact = state.facts.find(row => row.id === claim.factId);
          return !fact || JSON.stringify(fact.value) !== JSON.stringify(claim.value);
        })) return null;
        if (typeof parsed.body !== 'string' || !/[.!?。？！]["'”’)]?\s*$/u.test(parsed.body)) return null;
        return parsed;
      },
      onExhausted: async state => {
        const response = await refund(state.paymentProof, state.body);
        return response instanceof Response ? response.json() : response;
      },
    });
  } catch (error) {
    if (error?.response) return error.response;
    const storage = error?.code === 'RESULT_STORAGE_UNAVAILABLE' || !error?.status;
    return json({ ok: false, code: storage ? 'RESULT_STORAGE_UNAVAILABLE' : error.code || 'INVALID_QUESTION',
      message: storage ? '저장된 상담을 확인하고 있어요. 같은 상담으로 다시 시도해 주세요.' : error.message,
      resultId: error.resultId, retryable: storage, paymentRetainedForRetry: storage }, { status: storage ? 503 : error.status });
  }
}

export async function readFeatureQuestionRequest(request, env, auth, featureKey) {
  const supplied = request.method === 'GET' ? {} : await request.json();
  const resultId = request.method === 'GET' ? new URL(request.url).searchParams.get('resultId') : supplied.resumeResultId;
  if (request.method !== 'GET' && !resultId) return supplied;
  try {
    await connectDb(env);
    const doc = await ServiceExecutionTransaction.findOne({ userId: auth.userId, featureKey, ...(resultId ? { executionKey: resultId } : { status: 'pending', 'metadata.paidNarrative': { $exists: true } }) }).sort({ createdAt: -1 }).lean();
    if (!doc?.metadata?.paidNarrative?.body) return json({ ok: false, reason: 'RESULT_NOT_FOUND' }, { status: 404 });
    return { ...doc.metadata.paidNarrative.body, resumeResultId: doc.executionKey };
  } catch { return json({ ok: false, code: 'RESULT_STORAGE_UNAVAILABLE', retryable: true, paymentRetainedForRetry: true }, { status: 503 }); }
}
