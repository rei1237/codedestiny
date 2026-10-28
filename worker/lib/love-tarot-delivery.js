import { narrativePriorDigest, normalizeNarrativeBody, parseNarrativeResponse, NARRATIVE_RESPONSE_SCHEMA } from './paid-narrative-candidate.js';
import { buildLoveReadingPrompt } from '../../lib/tarot/love-reading-llm.mjs';
import { buildLoveConsultingHighlights } from '../../lib/tarot/love-reading-normalizer.mjs';
import { buildOutputLanguageDirective } from '../../lib/i18n/ai-locale.js';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { bindPaidTarotDraw } from './paid-tarot-draw.js';
import { buildTarotPositionPin, findTarotProseViolation, TAROT_SHARED_RULE_BLOCK } from '../../lib/tarot/paid-reading-contract.mjs';
import { getTarotCardByAnyId } from '../../lib/tarot/tarot-cards.mjs';
import { getAmbientAiLocale } from './ai-locale-context.js';
import { callGeminiText } from './gemini.js';
import { normalizeNarrativeParagraphs } from './narrative-format.js';
import { countPaidReportBodyChars, dropRepeatedReportSentences, hasRepeatedReportPassage } from './paid-report-quality.js';

const paragraphs = body => String(body || '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
const MATRIX = ['projectionGap', 'relationshipFrame', 'blockToOutcome', 'wholeStory', 'dominantSuit', 'majorArcanaSignal', 'reversedSignal', 'courtCardSignal'];
const MATRIX_SCOPE = ['내가 보는 관계와 상대가 보는 관계의 차이', '두 사람이 관계를 대하는 틀', '막힌 지점에서 결과로 이어지는 흐름', '여섯 카드가 함께 말하는 이야기', '가장 많이 나온 수트의 의미', '메이저 아르카나가 주는 신호', '역방향 카드가 주는 신호', '인물 카드가 주는 신호'];
const FINAL = ['instantMission', 'conversationTip', 'relationshipBoundary', 'nextSevenDays'];
// One call per card, overview, final advice and matrix: 9 parts. Each part returns fixed paragraphs
// that render splits into reading fields. 5,000원 상품: 1250 ×6 + 1800 + 1100 + 2200 = 12,600자.
// 분량은 목표이고 짧아도 완결된 부분은 전달한다.
// The cards must be the server draw the body names (paid-tarot-draw.js), checked before any build.
async function seed(env, userId, body, buildBase) {
  await bindPaidTarotDraw(env, { featureKey: 'tarot-love-relationship', owner: userId, body });
  const locale = getAmbientAiLocale() || body.locale || 'ko';
  const base = buildBase(body, locale);
  const tasks = base.reading.positionBreakdown.map((card, index) => ({ id: `card-${index}`, title: card.positionTitle, cardIndex: index, paragraphs: 4, minChars: 1250,
    prompt: `${index + 1}번 카드만 정확히 네 문단으로 해설한다. 첫 문단은 카드의 상징·방향·포지션 질문을 연결한 구체적인 생활 장면, 둘째 문단은 관계에서 드러나는 감정의 신호와 반대 조건, 셋째 문단은 사용자가 실행할 조언, 넷째 문단은 조심할 조건과 중단·재검토 기준이다. 다른 카드는 이름만 짧게 언급한다.\n${buildTarotPositionPin({ label: card.positionTitle,
      cards: [{ name: getTarotCardByAnyId(card.cardId)?.nameKo || card.cardName, orientation: card.orientation }] })}` }));
  tasks.push({ id: 'overview', title: '관계의 온도와 흐름', paragraphs: 3, minChars: 1800,
    prompt: '정확히 세 문단으로 현재 관계의 온도, 겉모습과 속마음의 간극, 현실 조건과 가까운 흐름을 순서대로 여섯 카드의 연결 근거와 함께 해석한다. 카드별 해설을 반복하지 않는다.' });
  tasks.push({ id: 'final', title: '실천과 계획', paragraphs: 4, minChars: 1100,
    prompt: '정확히 네 문단으로 오늘의 실천, 대화의 방법, 관계의 경계, 일주일의 계획을 순서대로 현실적인 조언과 반대 조건, 사례와 함께 설명한다.' });
  tasks.push({ id: 'matrix', title: '여섯 카드의 연결과 구성', paragraphs: 8, minChars: 2200,
    prompt: `정확히 여덟 문단으로 ${MATRIX_SCOPE.join(', ')}을 순서대로 해설한다. 고정 입력의 카드와 방향을 바꾸지 않는다.` });
  return { base, tasks,
    prompt: `${buildOutputLanguageDirective(locale)}\n${buildLoveReadingPrompt(base.reading, locale, { userQuestion: body.userQuestion }).split('[리딩 작성 형식]')[0]}\n${TAROT_SHARED_RULE_BLOCK}` };
}
// The stored cards a part may name. Naming another card, flipping an orientation or moving a card
// to another position title makes the answer a failed attempt within the two-attempt cap. A state
// with no stored draw has nothing to check against; every seeded delivery holds one.
function drawnEvidence(state) {
  const rows = state.base?.reading?.positionBreakdown, name = row => getTarotCardByAnyId(row.cardId)?.nameKo || row.cardName;
  if (!rows?.length) return null;
  return { drawn: rows.map(row => ({ name: name(row), orientation: row.orientation })), positions: new Map(rows.map(row => [row.positionTitle, name(row)])) };
}
// Records started before the 9-part layout keep rendering from their 21 part ids.
function render(state) {
  const text = id => state.parts[id] || '';
  const base = state.base.reading;
  const positionBreakdown = base.positionBreakdown.map((row, index) => {
    const card = paragraphs(text(`card-${index}`));
    const meaning = card.length ? card.slice(0, 2) : paragraphs(text(`card-${index}-meaning`));
    const action = card.length ? card.slice(2) : paragraphs(text(`card-${index}-action`));
    return { ...row, headline: row.positionTitle, summary: '', detail: meaning.slice(0, -1).join('\n\n'),
      relationshipInsight: meaning.slice(-1).join('\n\n'), advice: action.slice(0, -1).join('\n\n'), caution: action.slice(-1).join('\n\n') };
  });
  const overview = paragraphs(text('overview')), final = paragraphs(text('final'));
  const matrix = state.parts.matrix ? paragraphs(text('matrix')) : [...paragraphs(text('matrix-0')), ...paragraphs(text('matrix-1'))];
  const field = (rows, index, legacyId) => rows.length ? rows[index] || '' : text(legacyId);
  const reading = { ...base, overallVibe: field(overview, 0, 'overallVibe'), deepReading: field(overview, 1, 'deepReading'),
    realityAndFuture: field(overview, 2, 'realityAndFuture'), positionBreakdown,
    relationshipMatrix: { ...base.relationshipMatrix, ...Object.fromEntries(MATRIX.map((key, i) => [key, matrix[i] || ''])) },
    finalAdvice: Object.fromEntries(FINAL.map((id, i) => [id, field(final, i, id)])) };
  return { ...state.base, reading, consultingHighlights: buildLoveConsultingHighlights(reading), readingSource: 'llm', isRelationshipReading: true, api: 'love-reading',
    requestId: state.body.requestId, resumeInputs: state.body, locale: state.locale,
    deliverySections: state.tasks.filter(task => state.parts[task.id]).map(task => ({ key: task.id, title: task.title, body: text(task.id) })) };
}
// The paid-intent task seeds a proven intent with the same function.
export { seed as seedLoveTarot };
export function deliverLoveTarot(request, env, auth, body, verify, buildBase) {
  return runPaidNarrativeDelivery(request, env, auth, body, { ...loveTarotNarrativeAdapter(env), seed: original => seed(env, auth.userId, original, buildBase), verify });
}
// The route and the server resume task share render and produce.
export function loveTarotNarrativeAdapter(env) {
  return { featureKey: 'tarot-love-relationship', reportType: 'loveTarot', render,
    produce: async (task, state) => {
      const ai = await callGeminiText(env, `${state.prompt}\n[이번 부분 ${task.id}] ${task.prompt}${narrativePriorDigest(state, task)}\nJSON {"body":"본문"}만 출력한다. 문단은 빈 줄로 나누고 번호·항목명을 붙이지 않는다. 제목·기호·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.3)}~${Math.ceil(task.minChars * 1.5)}자. 같은 문장을 반복하지 않는다.`, {
        timeoutMs: 45000, maxOutputTokens: 9500, thinkingBudget: 0, temperature: 0.55, responseMimeType: 'application/json', responseSchema: NARRATIVE_RESPONSE_SCHEMA, fallbackToWorkersAI: false,
      });
      if (!ai?.ok || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
      const value = parseNarrativeResponse(ai.text, state.evidenceHash);
      if (!value || typeof value.body !== 'string' || !value.body.trim()) return null;
      // Drop sentences already given before fixing the paragraph count, so render never shifts fields.
      const prior = Object.entries(state.parts || {}).filter(([id]) => id !== task.id).map(([, body]) => body).join('\n');
      value.body = dropRepeatedReportSentences(normalizeNarrativeBody(value.body), prior);
      if (!countPaidReportBodyChars(value.body) || hasRepeatedReportPassage(value.body)) return null;
      const legacyCard = !task.paragraphs && task.cardIndex !== undefined;
      const count = task.paragraphs || (task.id.startsWith('matrix-') ? 4 : 0);
      if (count) value.body = normalizeNarrativeParagraphs(value.body, count);
      else if (legacyCard && paragraphs(value.body).length < 2) value.body = normalizeNarrativeParagraphs(value.body, 2);
      const found = paragraphs(value.body).length;
      if ((count && found !== count) || (legacyCard && found < 2)) return null;
      const evidence = drawnEvidence(state);
      if (evidence && findTarotProseViolation(value.body, evidence)) return null;
      return value;
    },
  };
}
