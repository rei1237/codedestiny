import { narrativePriorDigest, normalizeNarrativeBody, parseNarrativeResponse, NARRATIVE_RESPONSE_SCHEMA } from './paid-narrative-candidate.js';
import { buildMindscanDeliveryFacts } from '../../lib/tarot/mindscan-reading.mjs';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { getAmbientAiLocale } from './ai-locale-context.js';
import { callGeminiText } from './gemini.js';
import { normalizeNarrativeParagraphs } from './narrative-format.js';
import { countPaidReportBodyChars, dropRepeatedReportSentences, hasRepeatedReportPassage } from './paid-report-quality.js';
import { createHttpError } from './http.js';
import { bindPaidTarotDraw } from './paid-tarot-draw.js';
import { buildTarotPositionPin, findTarotProseViolation, TAROT_SHARED_RULE_BLOCK } from '../../lib/tarot/paid-reading-contract.mjs';

const paragraphs = value => String(value || '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
const SUMMARY = ['emotionalTemperatureText', 'corePsychology', 'contactChance', 'relationFlow', 'reApproachChance',
  'recommendedAction', 'relationshipStage', 'silenceDriver', 'situationPressure', 'emotionalNeed'];
const FIELDS = [
  ['meaning', '카드 상징과 위치의 질문', 'cardMeaning', 'positionMeaning'],
  ['emotion', '생활에서 드러나는 감정과 반대 조건', 'emotionalReading', 'hiddenMessage'],
  ['action', '주의점과 현실적인 행동', 'caution', 'advice'],
];
// The pairs must be the server draw the body names (paid-tarot-draw.js), checked before any build.
async function seed(env, userId, body) {
  await bindPaidTarotDraw(env, { featureKey: 'tarot-mindscan', owner: userId, body });
  const facts = buildMindscanDeliveryFacts(body.pairs, body.question, getAmbientAiLocale() || body.locale || 'ko');
  if (!facts.ok) throw createHttpError(400, '질문과 카드 5쌍을 확인해 주세요.', { reason: facts.reason });
  // One call per position; render splits its paragraphs into the three FIELDS in order.
  // 5,000원 상품: 1700 ×5 + 900 + 1600 + 1000 + 700 = 12,700자. 분량은 목표이고 짧아도 완결된 부분은 전달한다.
  const tasks = facts.sectionInputs.map((section, index) => ({
    id: `section-${index}`, title: section.positionLabel, sectionIndex: index, minChars: 1700,
    prompt: `${index + 1}번 ${section.positionLabel}을 해설한다. 메인/보조 카드와 정역방향은 확정 입력을 따른다. 소제목 없이 여섯 문단으로 쓴다. 첫 두 문단은 ${FIELDS[0][1]}이고 위치의 질문과 연결하며 끝난다. 다음 두 문단은 ${FIELDS[1][1]}이고 숨은 조건과 단정할 수 없는 이유로 끝난다. 마지막 두 문단은 ${FIELDS[2][1]}이고 실행할 행동과 확인 기준으로 끝난다.\n${buildTarotPositionPin({ label: section.positionLabel, question: section.positionQuestion,
      cards: [{ role: '메인', name: section.mainCard.nameKo, orientation: section.orientation }, { role: '보조', name: section.subCard.nameKo }] })}`,
  }));
  tasks.push({ id: 'intro', title: '질문의 핵심과 해석 기준', prompt: '질문의 핵심과 다섯 위치를 함께 읽는 기준을 설명한다.', minChars: 900 },
    { id: 'summary', title: '관계 흐름 종합', prompt: `정확히 열 문단으로 ${SUMMARY.join(', ')}를 순서대로 해설한다. 한 문단은 한 항목이며 항목명/번호 없이 본문만 쓴다. 감정과 연락 가능성을 확정하거나 확률로 만들지 않는다.`, minChars: 1600 },
    { id: 'masterAdvice', title: '현실적인 실천 계획', prompt: '지금의 관계에서 실행할 계획과 중단/재검토 기준을 설명한다.', minChars: 1000 },
    { id: 'closing', title: '마지막 상담 편지', prompt: '전체 조건을 종합해 질문에 답하고 선택의 여지를 남기는 상담 편지를 쓴다.', minChars: 700 });
  return { ...facts, prompt: `${facts.prompt}\n${TAROT_SHARED_RULE_BLOCK}`, tasks };
}
// The stored cards a part may name. Each position reads its own pair; a state seeded under the former
// seven positions reused cards, so a card stored both ways is checked for presence only. Positions hold a main and a sub card and are not checked.
// A state with no stored draw has nothing to check against; every seeded delivery holds one.
function drawnEvidence(state) {
  if (!state.sectionInputs?.length) return null;
  const seen = new Map();
  for (const section of state.sectionInputs) for (const card of [section.mainCard, section.subCard]) {
    const before = seen.get(card?.nameKo);
    if (card?.nameKo) seen.set(card.nameKo, before === undefined || before === section.orientation ? section.orientation : 'either');
  }
  return { drawn: [...seen].map(([name, orientation]) => ({ name, orientation })) };
}
// A position part's paragraphs in three ordered groups, one per field; a state seeded
// before the merge stored each field as its own part (section-0-meaning).
function fieldChunks(state, index) {
  const whole = paragraphs(state.parts[`section-${index}`]);
  if (!whole.length) return FIELDS.map(([key]) => paragraphs(state.parts[`section-${index}-${key}`]));
  const size = Math.floor(whole.length / FIELDS.length), extra = whole.length % FIELDS.length;
  let start = 0;
  return FIELDS.map((_, i) => whole.slice(start, start += size + (i < extra ? 1 : 0)));
}
function render(state) {
  const text = id => state.parts[id] || '';
  const sections = state.base.sections.map((base, index) => {
    const section = { ...base, content: '', summary: '', detail: [] };
    const groups = fieldChunks(state, index);
    for (const [i, [, , first, last]] of FIELDS.entries()) {
      const chunks = groups[i];
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
// The paid-intent task seeds a proven intent with the same function.
export { seed as seedMindscanNarrative };
export function deliverMindscan(request, env, auth, body, verify) {
  return runPaidNarrativeDelivery(request, env, auth, body, { ...mindscanNarrativeAdapter(env), seed: original => seed(env, auth.userId, original), verify });
}
// The route and the server resume task share render and produce.
export function mindscanNarrativeAdapter(env) {
  return { featureKey: 'tarot-mindscan', reportType: 'mindscan', render,
    produce: async (task, state) => {
      const ai = await callGeminiText(env, `${state.prompt}\n[이번 부분 ${task.id}] ${task.prompt}${narrativePriorDigest(state, task)}\nJSON {"body":"본문"}만 출력한다. 제목·기호·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.3)}~${Math.ceil(task.minChars * 1.5)}자. 짧은 문단으로 나누고 같은 문장을 반복하지 않는다.`, {
        timeoutMs: 45000, maxOutputTokens: 9500, thinkingBudget: 0, temperature: 0.55,
        fallbackToWorkersAI: false, responseMimeType: 'application/json', responseSchema: NARRATIVE_RESPONSE_SCHEMA,
      });
      if (!ai?.ok || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
      const value = parseNarrativeResponse(ai.text, state.evidenceHash);
      if (!value || typeof value.body !== 'string' || !value.body.trim()) return null;
      // Drop sentences already given before fixing the paragraph count, so render never shifts fields.
      const prior = Object.entries(state.parts || {}).filter(([id]) => id !== task.id).map(([, body]) => body).join('\n');
      value.body = dropRepeatedReportSentences(normalizeNarrativeBody(value.body), prior);
      if (!countPaidReportBodyChars(value.body) || hasRepeatedReportPassage(value.body)) return null;
      // A merged position part needs a paragraph per field (six asked); a legacy field part needs two.
      const least = task.field ? 2 : FIELDS.length, asked = task.field ? 2 : FIELDS.length * 2;
      if (task.id === 'summary') value.body = normalizeNarrativeParagraphs(value.body, 10);
      else if (task.sectionIndex !== undefined && paragraphs(value.body).length < asked) value.body = normalizeNarrativeParagraphs(value.body, asked);
      const count = paragraphs(value.body).length;
      if ((task.sectionIndex !== undefined && count < least) || (task.id === 'summary' && count !== 10)) return null;
      const evidence = drawnEvidence(state);
      if (evidence && findTarotProseViolation(value.body, evidence)) return null;
      return value;
    },
  };
}
