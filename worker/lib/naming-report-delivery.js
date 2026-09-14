import { callGeminiText } from "./gemini.js";
import { parseNamingResultCards } from "./naming-result-cards.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage } from "./paid-report-quality.js";
import { runWithAiLocale } from "./ai-locale-context.js";
import { analyzeSoundFlow } from "./naming-sound-elements.js";

export const NAMING_CHAPTERS = ["작명가의 총평", "사주 풀이와 용신 검증", "이 아이의 작명 원칙", "이름 후보 상세", "세 이름을 나란히 놓고", "최종 추천", "피해야 할 이름", "이름을 올리기 전에"];
export function namingChaptersText(chapters = {}) {
  return NAMING_CHAPTERS.map((_, index) => chapters[index + 1]).filter(Boolean).map(chapter => `## ${chapter.id}. ${chapter.title}\n${chapter.body}`).join("\n\n");
}
export function namingReportComplete(state) {
  return NAMING_CHAPTERS.every((_, index) => state.chapters?.[index + 1]
    && countPaidReportBodyChars(state.chapters[index + 1].body) >= 2500)
    && countPaidReportBodyChars(namingChaptersText(state.chapters)) >= 20000;
}
function parseJson(text) {
  const source = String(text || "");
  try { return JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1)); } catch { return null; }
}
function usable(ai) { return ai?.ok && ai?.truncated !== true && !/mock/i.test(ai.provider || ""); }

// One bounded wave per HTTP request. Attempt reservations precede every provider call.
export async function generateNamingWave(env, snapshot, checkpoint) {
  let state = structuredClone(snapshot.delivery || { version: 1, attempts: {}, chapters: {}, candidates: null });
  state.invalidAttempts ||= {};
  const call = (prompt, part, maxOutputTokens) => runWithAiLocale(snapshot.locale || "ko", () => callGeminiText(env, prompt, {
    taskType: "fortune", temperature: 0.72, timeoutMs: 45000, maxOutputTokens, fallbackToWorkersAI: false,
    logContext: { sectionGroup: part },
  }));
  const persist = () => checkpoint(structuredClone(state));
  if (!state.candidates) {
    if ((state.attempts.candidates || 0) >= 3) return { state, limited: true };
    state.attempts.candidates = (state.attempts.candidates || 0) + 1;
    await persist();
    let ai;
    try {
      ai = await call(`${snapshot.generatedPrompt}\n\n이번 요청은 준비 단계입니다. 8장 본문은 아직 쓰지 말고 이름 카드 블록만 출력하세요. 새 이름 5~7개와 그중 최종 추천을 정하세요. 이미 입력된 후보도 함께 비교하세요. 획수·수리 수치를 새로 계산하거나 한자의 법적 등록 가능성을 단정하지 마세요. 확인되지 않은 수리는 확인 필요라고 쓰세요.`, "candidates", 6000);
    } catch { return { state, limited: state.attempts.candidates >= 3 }; }
    const parsed = usable(ai) ? parseNamingResultCards(ai.text, { allowCardsOnly: true }) : null;
    const cards = parsed?.cards || [];
    if (cards.length >= 5 && cards.length <= 12 && new Set(cards.map(card => card.name)).size === cards.length
      && cards.some(card => card.name === parsed.finalPick?.name)) {
      state.candidates = { cards: cards.map(card => ({ ...card,
        // Stroke counts need an authoritative character dictionary; do not turn a model guess into a calculation.
        suri: "", soundFlow: snapshot.locale === "ko" ? analyzeSoundFlow(`${snapshot.inputSnapshot.familyName}${card.name}`).label : "",
      })), finalPick: parsed.finalPick };
      state.provider = String(ai.provider || "gemini");
      state.model = String(ai.model || "");
      await persist();
    } else if (ai?.ok) {
      state.invalidAttempts.candidates = (state.invalidAttempts.candidates || 0) + 1;
      await persist();
    }
    return { state, limited: !state.candidates && state.attempts.candidates >= 3 };
  }
  const wave = NAMING_CHAPTERS.map((title, index) => ({ id: index + 1, title }))
    .filter(chapter => !state.chapters[chapter.id] && (state.attempts[chapter.id] || 0) < 3).slice(0, 4);
  for (const chapter of wave) state.attempts[chapter.id] = (state.attempts[chapter.id] || 0) + 1;
  if (wave.length) await persist();
  let queue = Promise.resolve();
  const results = await Promise.allSettled(wave.map(async chapter => {
    let ai;
    try {
      ai = await call(`${snapshot.generatedPrompt}\n\n[이번 호출 범위]\n${chapter.id}장 '${chapter.title}' 하나만 작성하세요. 다른 장이나 이름 카드 블록은 쓰지 마세요. 전체 8장의 기존 목표보다 아래의 장별 최소량이 우선합니다.\n확정된 후보와 추천: ${JSON.stringify(state.candidates)}\n명식/용신과 후보를 수정하지 마세요. 후보별 한자 획수·수리는 제공된 확정 계산이 없으므로 산출하거나 숫자로 단정하지 말고 확인 조건을 설명하세요.\n계산 근거 → 생활에서의 사용 패턴과 구체적 사례 → 반대 조건/주의점 → 현실적인 선택과 행동을 배분하세요. 앞선 다른 장의 설명을 반복하지 마세요.\n본문만 공백·마크다운·제목 제외 최소 2,500자, 목표 3,000~3,400자. 소제목과 짧은 문단으로 작성하세요.\nJSON만 출력: {"title":"현재 출력 언어로 장 제목", "body":"본문", "evidenceHash":"${snapshot.evidenceHash}"}. 계산 근거 해시를 그대로 돌려주세요.`, String(chapter.id), 9500);
    } catch { return; }
    const value = usable(ai) ? parseJson(ai.text) : null;
    const save = async () => {
      if (!value || value.evidenceHash !== snapshot.evidenceHash || typeof value.body !== "string"
        || countPaidReportBodyChars(value.body) < 2500 || hasRepeatedReportPassage(value.body)
        || hasRepeatedReportPassage(`${namingChaptersText(state.chapters)}\n${value.body}`)) {
        if (ai?.ok) { state.invalidAttempts[chapter.id] = (state.invalidAttempts[chapter.id] || 0) + 1; await persist(); }
        return;
      }
      state = { ...state, chapters: { ...state.chapters, [chapter.id]: { id: chapter.id, title: String(value.title || chapter.title).replace(/[\r\n#]/g, " ").slice(0, 120), body: value.body } } };
      await persist();
    };
    queue = queue.then(save, save);
    await queue;
  }));
  const failedSave = results.find(result => result.status === "rejected");
  if (failedSave) throw failedSave.reason;
  const limited = NAMING_CHAPTERS.some((_, index) => !state.chapters[index + 1] && (state.attempts[index + 1] || 0) >= 3);
  return { state, limited };
}

export function confirmedEmptyNamingFailure(state) {
  if (Object.keys(state.chapters || {}).length) return false;
  return Object.entries(state.attempts || {}).some(([id, count]) => count >= 3 && state.invalidAttempts?.[id] === count
    && (id !== "candidates" || !state.candidates));
}
