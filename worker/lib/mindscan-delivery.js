import { buildMindscanDeliveryFacts } from '../../lib/tarot/mindscan-reading.mjs';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { getAmbientAiLocale } from './ai-locale-context.js';
import { callGeminiText } from './gemini.js';
import { createHttpError } from './http.js';

const paragraphs = value => String(value || '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
const SUMMARY = ['emotionalTemperatureText', 'corePsychology', 'contactChance', 'relationFlow', 'reApproachChance',
  'recommendedAction', 'relationshipStage', 'silenceDriver', 'situationPressure', 'emotionalNeed'];
const FIELDS = [
  ['meaning', '카드 상징과 위치의 질문', 'cardMeaning', 'positionMeaning'],
  ['emotion', '생활에서 드러나는 감정과 반대 조건', 'emotionalReading', 'hiddenMessage'],
  ['action', '주의점과 현실적인 행동', 'caution', 'advice'],
];
function seed(body) {
  const facts = buildMindscanDeliveryFacts(body.pairs, body.question, getAmbientAiLocale() || body.locale || 'ko');
  if (!facts.ok) throw createHttpError(400, '질문과 카드 5쌍을 확인해 주세요.', { reason: facts.reason });
  const tasks = facts.sectionInputs.flatMap((section, index) => FIELDS.map(([key, title]) => ({
    id: `section-${index}-${key}`, title: `${section.positionLabel}: ${title}`, sectionIndex: index, field: key, minChars: 1000,
    prompt: `${index + 1}번 ${section.positionLabel}의 ${title}만 해설한다. 메인/보조 카드와 정역방향은 확정 입력을 따른다. 최소 두 문단으로 작성한다. 마지막 문단은 ${key === 'meaning' ? '위치의 질문과 연결' : key === 'emotion' ? '숨은 조건과 단정할 수 없는 이유' : '실행할 행동과 확인 기준'}이다.`,
  })));
  tasks.push({ id: 'intro', title: '질문의 핵심과 해석 기준', prompt: '질문의 핵심과 일곱 위치를 함께 읽는 기준을 설명한다.', minChars: 1000 },
    { id: 'summary', title: '관계 흐름 종합', prompt: `정확히 열 문단으로 ${SUMMARY.join(', ')}를 순서대로 해설한다. 한 문단은 한 항목이며 항목명/번호 없이 본문만 쓴다. 감정과 연락 가능성을 확정하거나 확률로 만들지 않는다.`, minChars: 2000 },
    { id: 'masterAdvice', title: '현실적인 실천 계획', prompt: '지금의 관계에서 실행할 계획과 중단/재검토 기준을 설명한다.', minChars: 1200 },
    { id: 'closing', title: '마지막 상담 편지', prompt: '전체 조건을 종합해 질문에 답하고 선택의 여지를 남기는 상담 편지를 쓴다.', minChars: 800 });
  return { ...facts, tasks, minBodyChars: 20000 };
}
function render(state) {
  const text = id => state.parts[id] || '';
  const sections = state.base.sections.map((base, index) => {
    const section = { ...base, content: '', summary: '', detail: [] };
    for (const [key, , first, last] of FIELDS) {
      const chunks = paragraphs(text(`section-${index}-${key}`));
      section[first] = chunks.slice(0, -1).join('\n\n'); section[last] = chunks.slice(-1).join('\n\n');
    }
    return section;
  });
  const summary = paragraphs(text('summary'));
  const summaryCard = { ...state.base.summaryCard, ...Object.fromEntries(SUMMARY.map((key, i) => [key, summary[i] || ''])) };
  const reading = { ...state.base, source: 'llm', intro: text('intro'), sections, summaryCard,
    innerHeartSummary: { emotionalTemperature: summaryCard.emotionalTemperatureText, hiddenCore: summaryCard.corePsychology,
      contactPossibility: summaryCard.contactChance, relationshipRisk: summaryCard.situationPressure,
      recommendedAttitude: summaryCard.recommendedAction, finalFlow: summaryCard.relationFlow, oracleMessage: text('closing') },
    masterAdvice: text('masterAdvice'), closing: text('closing'), oneLineConclusion: '',
  };
  return { ...reading, reading, requestId: state.body.requestId, resumeInputs: state.body, locale: state.locale,
    deliverySections: state.tasks.filter(task => state.parts[task.id]).map(task => ({ key: task.id, title: task.title, body: text(task.id) })) };
}
export function deliverMindscan(request, env, auth, body, verify) {
  return runPaidNarrativeDelivery(request, env, auth, body, { featureKey: 'tarot-mindscan', reportType: 'mindscan', seed, verify, render,
    produce: async (task, state) => {
      const ai = await callGeminiText(env, `${state.prompt}\n[이번 부분 ${task.id}] ${task.prompt}\nJSON {"evidenceHash":"${state.evidenceHash}","body":"본문"}만 출력한다. 제목·기호·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.25)}자. 짧은 문단으로 나누고 같은 문장을 반복하지 않는다.`, {
        timeoutMs: 45000, maxOutputTokens: 9500, thinkingBudget: 0, temperature: 0.55,
        fallbackToWorkersAI: false, responseMimeType: 'application/json',
      });
      if (!ai?.ok || ai.truncated || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
      let value; try { value = JSON.parse(ai.text); } catch { return null; }
      const count = paragraphs(value.body).length;
      if ((task.sectionIndex !== undefined && count < 2) || (task.id === 'summary' && count !== 10)) return null;
      return value;
    },
  });
}
