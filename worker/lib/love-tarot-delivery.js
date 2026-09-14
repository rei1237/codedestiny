import { buildLoveReadingPrompt } from '../../lib/tarot/love-reading-llm.mjs';
import { buildLoveConsultingHighlights } from '../../lib/tarot/love-reading-normalizer.mjs';
import { buildOutputLanguageDirective } from '../../lib/i18n/ai-locale.js';
import { runPaidNarrativeDelivery } from './paid-narrative-delivery.js';
import { getAmbientAiLocale } from './ai-locale-context.js';
import { callGeminiText } from './gemini.js';

const paragraphs = body => String(body || '').split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
const MATRIX = ['projectionGap', 'relationshipFrame', 'blockToOutcome', 'wholeStory', 'dominantSuit', 'majorArcanaSignal', 'reversedSignal', 'courtCardSignal'];
const FINAL = ['instantMission', 'conversationTip', 'relationshipBoundary', 'nextSevenDays'];
function seed(body, buildBase) {
  const locale = getAmbientAiLocale() || body.locale || 'ko';
  const base = buildBase(body, locale);
  const tasks = base.reading.positionBreakdown.flatMap((card, index) => [
    { id: `card-${index}-meaning`, title: `${card.positionTitle}: 감정과 관계`, cardIndex: index, minChars: 1500,
      prompt: `${index + 1}번 카드의 상징·방향·포지션 질문을 연결해 구체적인 생활 장면으로 해설한다. 최소 두 문단으로 쓰며 마지막 문단은 관계의 반대 조건과 확인해야 할 신호다.` },
    { id: `card-${index}-action`, title: `${card.positionTitle}: 행동과 주의점`, cardIndex: index, minChars: 1500,
      prompt: `${index + 1}번 카드의 근거에서 사용자가 실행할 조언을 설명한다. 최소 두 문단으로 쓰며 마지막 문단은 조심할 조건과 중단·재검토 기준이다.` },
  ]);
  [['overallVibe', '현재 관계의 온도'], ['deepReading', '겉모습과 속마음의 간극'], ['realityAndFuture', '현실 조건과 가까운 흐름']].forEach(([id, title]) => tasks.push({ id, title, minChars: 1200, prompt: `${title}을 여섯 카드의 연결 근거와 함께 해석한다. 다른 부분을 반복하지 않는다.` }));
  FINAL.forEach((id, index) => tasks.push({ id, title: ['오늘의 실천', '대화의 방법', '관계의 경계', '일주일의 계획'][index], minChars: 500, prompt: `${id}에 해당하는 현실적인 조언과 반대 조건을 사례와 함께 설명한다.` }));
  [0, 1].forEach(group => tasks.push({ id: `matrix-${group}`, title: group ? '카드 구성과 관계의 조건' : '여섯 카드의 연결', minChars: 1400,
    prompt: `정확히 네 문단으로 ${MATRIX.slice(group * 4, group * 4 + 4).join(', ')}을 순서대로 해설한다. 문단별 항목명/번호를 쓰지 않는다. 고정 입력의 카드와 방향을 바꾸지 않는다.` }));
  return { base, tasks, minBodyChars: 20000,
    prompt: `${buildOutputLanguageDirective(locale)}\n${buildLoveReadingPrompt(base.reading, locale, { userQuestion: body.userQuestion }).split('[리딩 작성 형식]')[0]}` };
}
function render(state) {
  const text = id => state.parts[id] || '';
  const base = state.base.reading;
  const positionBreakdown = base.positionBreakdown.map((row, index) => {
    const meaning = paragraphs(text(`card-${index}-meaning`)), action = paragraphs(text(`card-${index}-action`));
    return { ...row, headline: row.positionTitle, summary: '', detail: meaning.slice(0, -1).join('\n\n'),
      relationshipInsight: meaning.slice(-1).join('\n\n'), advice: action.slice(0, -1).join('\n\n'), caution: action.slice(-1).join('\n\n') };
  });
  const matrix = [...paragraphs(text('matrix-0')), ...paragraphs(text('matrix-1'))];
  const reading = { ...base, overallVibe: text('overallVibe'), deepReading: text('deepReading'), realityAndFuture: text('realityAndFuture'), positionBreakdown,
    relationshipMatrix: { ...base.relationshipMatrix, ...Object.fromEntries(MATRIX.map((key, i) => [key, matrix[i] || ''])) },
    finalAdvice: Object.fromEntries(FINAL.map(id => [id, text(id)])) };
  return { ...state.base, reading, consultingHighlights: buildLoveConsultingHighlights(reading), readingSource: 'llm', isRelationshipReading: true, api: 'love-reading',
    requestId: state.body.requestId, resumeInputs: state.body, locale: state.locale,
    deliverySections: state.tasks.filter(task => state.parts[task.id]).map(task => ({ key: task.id, title: task.title, body: text(task.id) })) };
}
export function deliverLoveTarot(request, env, auth, body, verify, buildBase) {
  return runPaidNarrativeDelivery(request, env, auth, body, { featureKey: 'tarot-love-relationship', reportType: 'loveTarot', seed: original => seed(original, buildBase), verify, render,
    produce: async (task, state) => {
      const ai = await callGeminiText(env, `${state.prompt}\n[이번 부분 ${task.id}] ${task.prompt}\nJSON {"evidenceHash":"${state.evidenceHash}","body":"본문"}만 출력한다. 제목·기호·공백 제외 최소 ${task.minChars}자, 목표 ${Math.ceil(task.minChars * 1.25)}자. 같은 문장을 반복하지 않는다.`, {
        timeoutMs: 45000, maxOutputTokens: 9500, thinkingBudget: 0, temperature: 0.55, responseMimeType: 'application/json', fallbackToWorkersAI: false,
      });
      if (!ai?.ok || ai.truncated || ai.isMock || /mock/i.test(`${ai.provider || ''} ${ai.model || ''}`)) return null;
      let value; try { value = JSON.parse(ai.text); } catch { return null; }
      const count = paragraphs(value.body).length;
      if ((task.cardIndex !== undefined && count < 2) || (task.id.startsWith('matrix-') && count !== 4)) return null;
      return value;
    },
  });
}
