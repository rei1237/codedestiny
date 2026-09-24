import { buildOracleConsultationPrompt, validateOracleConsultationInput, resolveOracleConsultationTargetChars } from '../../lib/tarot/oracle-consultation.mjs';
import { ORACLE_CONSULTATION_TIERS, resolveOracleConsultationTier } from '../../lib/tarot/oracle-consultation-pricing.mjs';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { ServiceExecutionTransaction } from './models.js';
import { connectDb } from './db.js';
import { getAmbientAiLocale } from './ai-locale-context.js';
import { callGeminiText } from './gemini.js';
import { createHttpError, json } from './http.js';

const GENERAL = [
  ['coreQuestion', '질문을 해석하는 기준', 1200], ['bigPicture', '전체 배열의 흐름', 2500],
  ['tension', '카드 사이의 긴장과 반대 조건', 2000], ['categoryFocus', '질문 주제에 맞춘 심화 해석', 2500],
  ['caution', '주의점과 현실의 확인 기준', 1500], ['closingLine', '상담을 맺는 조언', 500],
  ['timeline.now', '현재 국면의 근거', 1000], ['timeline.near', '가까운 흐름의 조건', 1000],
  ['timeline.turning', '변화의 분기점과 확인 신호', 1000],
  ['action.0', '오늘 실천할 행동과 확인 방법', 500], ['action.1', '일주일 동안 점검할 행동', 500],
  ['action.2', '선택을 다시 검토할 기준', 500],
];
const paragraphs = body => String(body || '').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);

function seedOracle(body, env) {
  const validated = validateOracleConsultationInput(body);
  if (!validated.ok) throw createHttpError(400, '카드 정보를 확인해 주세요.', { reason: validated.reason });
  const input = validated.data;
  const built = buildOracleConsultationPrompt({ ...input, locale: getAmbientAiLocale() || body.locale || 'ko', env });
  const tasks = GENERAL.map(([id, title, minChars]) => ({ id, title, prompt: title, minChars }));
  const cardMinimum = Math.max(1100, Math.ceil(6500 / input.cards.length));
  const segments = Math.ceil(cardMinimum / 2200);
  input.cards.forEach((card, index) => {
    for (let part = 0; part < segments; part += 1) tasks.push({
      id: `card.${index}.${part}`, title: card.positionLabel, cardIndex: index, part,
      prompt: `${card.index}번 ${card.positionLabel}, ${segments}개 부분 중 ${part + 1}번째 해석. 카드의 정체성과 정역방향을 그대로 유지한다. 포지션 의미와 질문의 실제 조건을 연결한다. 최소 두 문단으로 쓰고 마지막 문단은 이 해석에 따른 현실적인 행동 조언이다.`,
      minChars: Math.ceil(cardMinimum / segments),
    });
  });
  const pairs = input.cards.length < 3 ? [] : Array.from({ length: Math.min(3, input.cards.length - 1) }, (_, i) => [0, i + 1]);
  pairs.forEach(([a, b], index) => tasks.push({ id: `synergy.${index}`, title: `${a + 1}번 × ${b + 1}번`,
    prompt: `${a + 1}번과 ${b + 1}번 카드의 관계를 함께 해석한다. 각 카드의 단독 설명을 반복하지 말고 두 카드가 만날 때 달라지는 조건을 설명한다.`, minChars: 600 }));
  return { input, pairs, segments, tasks, systemPrompt: built.systemPrompt,
    // Keep canonical card/topic facts; the old whole-report JSON/short field limits
    // are replaced by the bounded part contract below.
    prompt: built.userPrompt.split('[출력 형식]')[0],
    minBodyChars: Math.max(20000, resolveOracleConsultationTargetChars(input.cards.length, env)) };
}

function renderOracle(state) {
  const text = id => state.parts[id] || '';
  const consultation = Object.fromEntries(GENERAL.filter(([id]) => !id.includes('.')).map(([id]) => [id, text(id)]));
  consultation.timeline = Object.fromEntries(['now', 'near', 'turning'].map(id => [id, text(`timeline.${id}`)]));
  consultation.actions = [0, 1, 2].map(index => text(`action.${index}`)).filter(Boolean);
  consultation.positionReadings = state.input.cards.map((card, index) => {
    const chunks = Array.from({ length: state.segments }, (_, part) => paragraphs(text(`card.${index}.${part}`)));
    return { positionOrder: card.index, headline: card.positionLabel,
      reading: chunks.flatMap(chunk => chunk.slice(0, -1)).join('\n\n'),
      positionAdvice: chunks.flatMap(chunk => chunk.slice(-1)).join('\n\n') };
  });
  consultation.cardSynergies = state.pairs.map(([a, b], index) => ({ pairLabel: `${a + 1} × ${b + 1}`, insight: text(`synergy.${index}`) }));
  return { consultation, source: 'llm', accessVerified: true, requestId: state.body.requestId,
    locale: state.locale, resumeInputs: state.body,
    sections: state.tasks.filter(task => state.parts[task.id]).map(task => ({ key: task.id, title: task.title, body: state.parts[task.id] })) };
}

export async function deliverTarotOracle(request, env, auth, body, verify) {
  const resumeId = request.method === 'GET' ? new URL(request.url).searchParams.get('resultId') : body.resumeResultId;
  let featureKey = resolveOracleConsultationTier(body.cards?.length).featureKey;
  if (request.method === 'GET' || resumeId) {
    if (resumeId && (typeof resumeId !== 'string' || !/^[a-zA-Z0-9:_-]{8,120}$/.test(resumeId))) return json({ ok: false, reason: 'INVALID_RESULT_ID' }, { status: 422 });
    try {
      await connectDb(env);
      const existing = await ServiceExecutionTransaction.findOne({ userId: auth.userId,
        featureKey: { $in: ORACLE_CONSULTATION_TIERS.map(tier => tier.featureKey) },
        ...(resumeId ? { executionKey: resumeId } : { status: 'pending', 'metadata.paidNarrative': { $exists: true } }),
      }).sort({ createdAt: -1 }).lean();
      if (!existing) return json({ ok: false, reason: 'RESULT_NOT_FOUND' }, { status: 404 });
      featureKey = existing.featureKey;
    } catch { throw Object.assign(Error('Result storage unavailable'), { code: 'RESULT_STORAGE_UNAVAILABLE', resultId: resumeId || 'pending' }); }
  }
  return runPaidNarrativeDelivery(request, env, auth, body, {
    featureKey, reportType: 'tarotOracleConsultation', verify, seed: original => seedOracle(original, env), render: renderOracle,
    produce: async (task, state) => {
      const ai = await callGeminiText(env, `${state.prompt}\n[이번 부분 ${task.id}] ${task.prompt}\nJSON {"evidenceHash":"${state.evidenceHash}","body":"본문"}만 출력한다. 제목·목차·기호·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.3)}~${Math.ceil(task.minChars * 1.5)}자. 각 문단에 서로 다른 근거, 생활 사례, 반대 조건과 행동 조언을 배분한다. 다른 부분을 반복하지 않는다.`, {
        systemPrompt: state.systemPrompt, timeoutMs: 45000, maxOutputTokens: 9500, thinkingBudget: 0,
        temperature: 0.55, fallbackToWorkersAI: false, responseMimeType: 'application/json',
      });
      if (!ai?.ok || ai.truncated || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
      let value; try { value = JSON.parse(ai.text); } catch { return null; }
      if (task.cardIndex !== undefined && paragraphs(value?.body).length < 2) return null;
      return value;
    },
  });
}
