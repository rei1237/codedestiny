import { appendBasicFortunePersona } from './expert-character-personas.js';
import { narrativePriorDigest, normalizeNarrativeBody, parseNarrativeResponse } from './paid-narrative-candidate.js';
import { jsonSchemaFromExample } from './json-text-repair.js';
import { createHash } from 'node:crypto';
import { ServiceExecutionTransaction } from './models.js';
import { connectDb } from './db.js';
import { json } from './http.js';
import { callGeminiText } from './gemini.js';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { normalizeNarrativeEndings } from './narrative-format.js';
import { countPaidReportBodyChars, dropRepeatedReportSentences, hasRepeatedReportPassage } from './paid-report-quality.js';
import { cleanQuestionBody, questionEditorialContext } from './feature-question-quality.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const questionResponseSchema = jsonSchemaFromExample({ claims: [{ factId: '', value: '' }], body: '' });
// Calculated facts include numeric values; preserve their type for exact citation checks.
questionResponseSchema.properties.claims.items.properties.value = { anyOf: [{ type: 'STRING' }, { type: 'NUMBER' }] };
// Citations are metadata: an unbounded list spent the output budget and cut the body.
questionResponseSchema.properties.claims.maxItems = 5;
// Each part owns one scope; a title alone let every part restate the whole chart.
const HEADINGS = [
  ['질문의 핵심과 한 줄 답변', '첫 문장에 질문에 대한 한 줄 답변(어느 선택이 유리한지와 그 조건)을 쓰고 그 판단의 핵심 근거 두세 가지만 설명합니다. 계산값 전체를 나열하지 않습니다.'],
  ['타고난 기질과 반복되는 선택', '타고난 성향과 결정 습관만 다룹니다. 현재 시기나 행동 계획은 쓰지 않습니다.'],
  ['현재 흐름을 보여 주는 근거', '지금 시기에 작용하는 제공된 시기 근거만 설명합니다. 제공되지 않은 시기 값은 만들지 않습니다.'],
  ['강점과 활용할 자원', '질문과 관련해 활용할 강점과 자원만 다룹니다.'],
  ['관계에서 드러나는 패턴', '상사·동료·가족·연인 등 사람 사이에서 드러나는 패턴만 다룹니다. 일 전략은 쓰지 않습니다.'],
  ['일과 재물에서 확인할 조건', '일·수입·재물에 관한 조건과 확인 기준만 다룹니다.'],
  ['주의할 약점과 반대 가능성', '판단이 틀릴 수 있는 반대 조건과 약점만 다룹니다.'],
  ['가까운 변화와 시기 해석의 한계', '가까운 변화를 제공된 시기 근거로만 설명하고, 근거가 없으면 시기를 단정할 수 없다고 밝힙니다.'],
  ['현실적인 행동 계획', '행동 계획은 이 부분에서만 씁니다. 단계·기간·확인 기준을 제시합니다.'],
  ['종합 판단과 마지막 메시지', '1부의 한 줄 답변과 같은 결론을 다시 확인하고 앞 부분을 요약하되 문장을 그대로 반복하지 않습니다.'],
];
// Today in Korea, so "내년" is computed instead of guessed from a chart year.
const referenceDate = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

export function questionFacts(value, path = 'chart', rows = []) {
  if (rows.length >= 100) return rows;
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      // Birth input identifies the person; it is never a calculated fact to cite.
      if (/token|authorization|payment|requestId|question|prompt|^user$|^birth/i.test(key)) continue;
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
      ...featureQuestionNarrativeAdapter(env, featureKey), featureKey,
      verify: async original => { proof = await verify(original); },
      seed: async original => {
        const { built, factsInput } = await prepare(original);
        const facts = questionFacts(factsInput);
        if (!facts.length) throw Object.assign(Error('상담의 계산 근거가 필요합니다.'), { status: 422, code: 'MISSING_CALCULATED_FACTS' });
        return { built: JSON.parse(JSON.stringify(built)), facts, paymentProof: proof,
          prompt: String(built.generatedPrompt || built.prompt || ''),
          systemPrompt: '각 점술 체계를 섞지 말고 제공된 계산값만 해설합니다. 시기 정보가 없으면 날짜를 지어내지 않습니다. 확률이나 타인의 마음을 단정하지 않고 근거와 반대 조건, 실행 가능한 선택을 제시합니다. 호칭은 처음부터 끝까지 \'당신\'으로 통일하고 HTML 태그를 쓰지 않습니다.',
          asOf: referenceDate(), minBodyChars: 20000,
          tasks: HEADINGS.map(([title, scope], index) => ({ id: `part-${index + 1}`, title, prompt: `${title}: ${scope}`, minChars: 2200 })),
        };
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

// The route and the server resume task share render and produce. Refunds stay
// on the route because refund() is bound to that request's payment context.
export function featureQuestionNarrativeAdapter(env, featureKey) {
  return {
    reportType: 'featureQuestionConsultation',
    // A 10-part consultation under its floor read as an unfinished answer (B6, B7).
    repairShortParts: true,
    // Persist the JSON shape, not undefined fields that BSON turns into null.
    render: state => JSON.parse(JSON.stringify({
      resultText: state.tasks.filter(task => state.parts[task.id]).map(task => `## ${task.title}\n\n${state.parts[task.id]}`).join('\n\n'),
      title: state.built.title, prompt: state.built.prompt, generatedPrompt: state.built.generatedPrompt || state.built.prompt,
      summaryIntent: state.built.summaryIntent || '', analysisAngles: state.built.analysisAngles || [],
      recommendedFollowUpQuestions: state.built.recommendedFollowUpQuestions || [],
      caution: state.built.caution, questionType: state.built.questionType,
      compatibilityUsed: Boolean(state.built.compatibilityUsed), compatibilityHint: state.built.compatibilityHint || '',
      featureKey, requestId: state.body.requestId, locale: state.locale,
      chargedCoins: state.paymentProof?.chargedCoins || 0, balanceAfter: state.paymentProof?.balanceAfter ?? null,
      paymentRetainedForRetry: true, resumeInputs: state.body,
      sections: state.tasks.filter(task => state.parts[task.id]).map(task => ({ key: task.id, title: task.title, body: state.parts[task.id] })),
    })),
    produce: async (task, state) => {
      const ai = await callGeminiText(env, `${state.prompt}\n\n[고정 계산 근거]\n${JSON.stringify(state.facts)}\n${state.asOf ? `[기준일] ${state.asOf}. 올해는 ${state.asOf.slice(0, 4)}년, 내년은 ${Number(state.asOf.slice(0, 4)) + 1}년입니다.\n` : ''}[이번 부분: ${task.id}] ${task.prompt || task.title}${narrativePriorDigest(state, task)}\nJSON {"claims":[{"factId":"fact-1","value":"해당 근거의 원래 값"}],"body":"상담 본문"}만 출력하세요. claims에는 실제 사용하는 계산 근거를 1~5개만 정확하게 복사합니다. 계산값 전체 요약을 부분마다 다시 쓰지 않습니다. 본문은 공백 제외 최소 ${task.minChars}자, 목표 2800~3200자입니다. 이 부분에 해당하는 근거와 구체적 생활 사례·반대 조건·행동을 각각 다른 문단으로 쓰고 마지막 문장을 완결합니다. 다른 부분은 쓰지 않습니다.`, {
        systemPrompt: await appendBasicFortunePersona(env, featureKey, state.systemPrompt + questionEditorialContext(state, task), { locale: state.locale }), timeoutMs: 45000, maxOutputTokens: 9500,
        thinkingBudget: 0, responseMimeType: 'application/json', fallbackToWorkersAI: false,
        responseSchema: questionResponseSchema,
      });
      if (!ai?.ok || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
      const parsed = parseNarrativeResponse(ai.text, state.evidenceHash);
      if (!parsed) return null;
      // Discard incorrect citation metadata without purchasing a new answer.
      parsed.claims = (Array.isArray(parsed.claims) ? parsed.claims : []).filter(claim => {
        const fact = state.facts.find(row => row.id === claim?.factId);
        return fact && JSON.stringify(fact.value) === JSON.stringify(claim.value);
      });
      if (typeof parsed.body !== 'string' || !parsed.body.trim()) return null;
      // A paragraph cut after a comma is unfinished: keep its finished sentences so the
      // engine's length check repairs it instead of closing it with a period (",.").
      parsed.body = dropRepeatedReportSentences(cleanQuestionBody(parsed.body, state).split(/\n\s*\n/u)
        .map(text => /[,，、]\s*$/u.test(text.trim()) ? normalizeNarrativeBody(text) : text).filter(text => text.trim()).join('\n\n'));
      if (!countPaidReportBodyChars(parsed.body) || hasRepeatedReportPassage(parsed.body)) return null;
      parsed.body = normalizeNarrativeEndings(parsed.body, state.locale);
      return parsed;
    },
  };
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
