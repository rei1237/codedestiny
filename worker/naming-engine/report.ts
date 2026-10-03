// 작명 v2 유료 보고서(설계서 §9·§10). 후보·한자·획수·수리는 엔진이 이미 정했고 LLM 은 서술만 쓴다.
// 요청당 LLM 1회(v1 과 같은 동기 웨이브): 1) 후보 서술 JSON 2) 8장. 시도 예약을 호출보다 먼저 저장한다.
// 대조기를 어긴 서술은 거부하지 않고 교정하며, LLM 장이 하나라도 있으면 못 쓴 장은 결정론 장으로 채운다.

import { salvageTruncatedJsonObject, trimToSentenceBoundary } from "../../lib/llm-text.js";
import { normalizeNarrativeBody } from "../lib/paid-narrative-candidate.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage } from "../lib/paid-report-quality.js";
import { correctText, findViolations, type CheckContext, type Violation } from "./checker";
import {
  ELEMENT_LABEL, GRADE_LABEL, GRID_LABEL, NARRATION_LETTER_COUNT, NARRATION_NAME_COUNT, RELATION_LABEL,
  deterministicNarration, engineCards, engineChapterBody, firstHun, fullName,
  letterText, meaningText, sajuSupportText, soundFeelText,
  type EngineView, type Narration, type SajuLines,
} from "./facts";
import { GRID_NAMES } from "./suri";

export const CHAPTER_COUNT = 8;
export const CHAPTER_MAX_OUTPUT_TOKENS = 9500;
export const NARRATION_MAX_OUTPUT_TOKENS = 9500;
// 하한은 분량 판정이 아니라 "서술이 사실상 비었는지"만 본다(원칙 17 — 분량 미달 단독 실패 금지).
const NARRATION_MIN_FIELD_CHARS = 20;
const NARRATION_NAME_MAX_CHARS = 220;
const NARRATION_LETTER_MAX_CHARS = 450;
// 두 번째 시도까지 대조기를 어기면 교정본을 받는다. 교정 뒤 이만큼도 안 남으면 그 장은 빈 것으로 본다.
const CHAPTER_MIN_CORRECTED_CHARS = 200;
const MAX_ATTEMPTS = 2;

export interface ChapterRecord { id: number; title: string; body: string; source: "llm" | "llm-corrected" | "engine" }
export interface NamingDeliveryV2 {
  version: 2;
  attempts: Record<string, number>;
  invalidAttempts: Record<string, number>;
  chapters: Record<string, ChapterRecord>;
  candidates: ReturnType<typeof engineCards>;
  narration: Narration | null;
  drafts: Record<string, { body: string; violations: Violation[] }>;
  rawResponses?: Record<string, string>;
  provider?: string;
  model?: string;
}

export interface NamingV2Prefs {
  genderLabel: string;
  schoolPreset: string;
  fixedChar?: { position: number; ch: string; hangul?: string | null } | null;
  avoidChars?: string[];
  desiredType?: string;
  preferredStyle?: string;
  preferredImage?: string[];
  siblingHarmony?: string;
  memo?: string;
}

const PRESET_LABEL: Record<string, string> = {
  "kr-modern": "현대 작명 실무 소리오행 배정 · 원획",
  "kr-hunminjeongeum": "훈민정음 해례본 소리오행 배정 · 원획",
  "kr-pil": "현대 작명 실무 소리오행 배정 · 필획",
};
const FLAG_LABEL: Record<string, string> = {
  "low-confidence": "자원오행 분류 신뢰도 낮음",
  disputed: "획수·분류에 출처 간 이견",
  "court-code-variant": "법원 시스템 이체 코드 글자",
  "no-hun": "훈 미상",
  buryong: "일부 작명 관행상 불용 주의",
};

const labels = (elements: string[]) => elements.map((e) => ELEMENT_LABEL[e as keyof typeof ELEMENT_LABEL] || e).join("·");

export function initialDeliveryV2(view: EngineView): NamingDeliveryV2 {
  return { version: 2, attempts: {}, invalidAttempts: {}, chapters: {}, candidates: engineCards(view, null), narration: null, drafts: {} };
}

/** 모든 호출이 공유하는 프롬프트 앞부분. 결과 레코드의 generatedPrompt 로 저장된다. */
export function buildNamingV2Prompt(view: EngineView, saju: SajuLines & Record<string, any>, prefs: NamingV2Prefs): string {
  const { useful, caution, derivedSupport, timeUnknown, jongConditional } = view.saju;
  const syllables = Array.from(view.surname.hangul);
  const candidates = view.candidates.map((candidate) => {
    const chars = candidate.chars.map((char) => {
      const flags = char.flags.map((flag) => FLAG_LABEL[flag]).filter(Boolean);
      return `${char.ch}(${char.hangul}) 훈 '${firstHun(char.hun) || "미상"}' · ${char.strokes}획 · 자원오행 ${char.jawon ? ELEMENT_LABEL[char.jawon] : "미분류"}${flags.length ? ` · ${flags.join(", ")}` : ""}`;
    });
    const sound = candidate.sound.elements.map((element, k) => `${[...syllables, ...Array.from(candidate.hangul)][k]} ${ELEMENT_LABEL[element]}`).join(" → ");
    return [
      `${candidate.rank}. ${fullName(view, candidate)} · 엔진 총점 ${candidate.total}`,
      `   글자: ${chars.join(" / ")}`,
      `   수리 4격: ${GRID_NAMES.map((grid) => `${GRID_LABEL[grid]} ${candidate.grids[grid]}(${GRADE_LABEL[candidate.grades[grid]]})`).join(" · ")}`,
      `   삼재(참고): ${labels(candidate.samjae.combo)} ${GRADE_LABEL[candidate.samjae.grade]}`,
      `   소리오행: ${sound} (${candidate.sound.relations.map((relation) => RELATION_LABEL[relation]).join("·")})`,
    ].join("\n");
  });
  const prefLines = [
    `성별: ${prefs.genderLabel || "미지정"} / 이름 길이: ${view.candidates[0]?.chars.length || 2}자 / 기준: ${PRESET_LABEL[prefs.schoolPreset] || prefs.schoolPreset}`,
    prefs.fixedChar ? `돌림자: ${prefs.fixedChar.position + 1}번째 글자 ${prefs.fixedChar.ch}${prefs.fixedChar.hangul ? `(${prefs.fixedChar.hangul})` : ""}` : "",
    prefs.avoidChars?.length ? `피할 글자: ${prefs.avoidChars.join(", ")}` : "",
    prefs.desiredType ? `원하는 이름 유형: ${prefs.desiredType}` : "",
    prefs.preferredStyle ? `선호 분위기: ${prefs.preferredStyle}` : "",
    prefs.preferredImage?.length ? `선호 이미지: ${prefs.preferredImage.join(", ")}` : "",
    prefs.siblingHarmony ? `형제자매 이름 조화: ${prefs.siblingHarmony}` : "",
    prefs.memo ? `추가 요청: ${prefs.memo}` : "",
  ].filter(Boolean);
  return [
    "당신은 부모에게 아이 이름을 풀어 설명하는 경력 많은 작명가입니다. 따뜻하고 차분한 존댓말로, 계산 근거를 쉬운 말로 풀어 주세요.",
    "",
    "[사주 확정값 — 메인 사주 엔진 계산, 바꾸지 말 것]",
    `명식: 년주 ${saju.yearPillar || "미상"} · 월주 ${saju.monthPillar || "미상"} · 일주 ${saju.dayPillar || "미상"} · 시주 ${saju.hourPillar || "미상"}`,
    `일간: ${saju.dayMaster || "미상"} / 월령: ${saju.monthCommand || "미상"} / 오행 분포: ${saju.fiveElementBalance || "미상"}`,
    saju.strengthAnalysis ? `일간의 힘: ${saju.strengthAnalysis}` : "",
    `용신(이름으로 채울 오행): ${labels(useful)} / 주의 오행: ${caution.length ? labels(caution) : "없음"}${derivedSupport.length ? ` / 용신을 돕는 오행: ${labels(derivedSupport)}` : ""}`,
    timeUnknown ? "출생 시간 미상: 시주 없이 세 기둥으로 판단했다는 점을 밝히세요." : "",
    jongConditional ? "종격 가능성이 있어 용신 판단에 조건이 붙는다는 점을 밝히세요." : "",
    "",
    "[작명 엔진 확정 후보 — 순위·한자·획수·수리·오행은 이 표가 정답]",
    ...candidates,
    "",
    "[사용자 선호 — 서술의 결을 맞출 때만 참고하고 후보와 순위는 바꾸지 말 것]",
    ...prefLines,
    "",
    "[반드시 지킬 규칙]",
    "- 한자·획수·수리 4격·오행 값은 위 표에 있는 것만 쓰세요. 새로 계산하거나 다른 숫자를 쓰지 말고, 표에 없는 한자를 쓰지 마세요.",
    "- 후보를 새로 만들거나 순위를 바꾸지 마세요.",
    "- 이름이 운명을 정한다고 단정하지 마세요. 성공·재물·건강을 보장하거나 공포를 주는 표현, 다른 이름을 깎아내리는 표현을 쓰지 마세요.",
    "- 삼재는 학파마다 해석이 달라 참고 지표로만 다루세요.",
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

const CHAPTER_GUIDES: Record<number, string> = {
  1: "사주의 핵심과 이번 후보군 전체의 인상을 정리하고, 1순위 후보를 왜 앞에 두었는지 소개하세요.",
  2: "명식·오행 분포·일간의 힘을 풀고, 메인 사주 엔진이 정한 용신과 주의 오행이 이름 글자 선택에 어떻게 쓰였는지 설명하세요.",
  3: "자원오행·수리 4격·소리오행·실제 쓰임 네 기준을 이 아이의 사주에 맞춰 설명하세요.",
  4: `상위 ${NARRATION_NAME_COUNT}개 후보를 순위대로 하나씩 다루세요. 후보마다 '### 순위. 성이름(한자)' 소제목을 달고 뜻·사주 보완·수리·소리를 설명하세요.`,
  5: "상위 3개 후보를 나란히 놓고 어떤 가치를 우선할 때 어떤 이름이 맞는지 비교하세요.",
  6: "1순위 후보를 최종 추천으로 정리하고, 다른 선택을 할 만한 조건도 함께 적으세요.",
  7: "이 사주에서 피하는 편이 좋은 오행 글자·수리 조합·소리 조합을 일반 원칙으로 설명하세요. 실존 인물의 이름을 예로 들거나 깎아내리지 마세요.",
  8: "출생신고 전 인명용 한자 조회, 이체 코드 글자 확인, 가족이 소리 내어 불러 보기, 출생 시간 재확인 같은 실무 점검을 안내하세요.",
};

function parseJson(text: string): any {
  const source = String(text || "");
  try { return JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1)); } catch { return salvageTruncatedJsonObject(source); }
}
function usable(ai: any): boolean { return Boolean(ai?.ok) && !/mock/i.test(ai.provider || ""); }

function narrationPrompt(snapshot: any): string {
  return `${snapshot.generatedPrompt}

[이번 호출 범위]
이번 요청은 후보별 짧은 서술 단계입니다. 8장 본문은 아직 쓰지 마세요.
상위 ${NARRATION_NAME_COUNT}개 후보(순위 1~${NARRATION_NAME_COUNT}) 각각에 meaning(한자 뜻풀이), sajuSupport(사주 보완 설명), soundFeel(부르는 소리의 느낌)을 항목마다 80~140자로 쓰세요.
상위 ${NARRATION_LETTER_COUNT}개 후보에는 부모에게 건네는 짧은 편지 letter 를 150~300자로 쓰세요.
수치는 위 표의 값만 쓰고, 표에 없는 한자를 쓰지 마세요.
JSON만 출력: {"names":[{"rank":1,"meaning":"...","sajuSupport":"...","soundFeel":"..."}],"letters":[{"rank":1,"letter":"..."}],"evidenceHash":"${snapshot.evidenceHash}"}. 계산 근거 해시를 그대로 돌려주세요.`;
}

function chapterPrompt(snapshot: any, id: number, title: string, draft: { body: string; violations: Violation[] } | undefined): string {
  const feedback = draft
    ? `\n[이전 초안 교정]\n이전 초안에서 표와 다른 값이나 금지 표현이 발견되었습니다: ${draft.violations.slice(0, 8).map((v) => v.detail).join(", ")}.\n아래 교정본의 방향을 살리되, 표에 없는 한자·숫자와 금지 표현 없이 이 장 전체를 다시 쓰세요.\n${draft.body.slice(0, 4000)}\n`
    : "";
  return `${snapshot.generatedPrompt}

[이번 호출 범위]
${id}장 '${title}' 하나만 작성하세요. 다른 장은 쓰지 마세요.
${CHAPTER_GUIDES[id] || ""}
계산 근거 → 생활에서의 사용 패턴과 구체적 사례 → 반대 조건/주의점 → 현실적인 선택과 행동을 배분하세요. 앞선 다른 장의 설명을 반복하지 마세요.
본문만 공백·마크다운·제목 제외 최소 2,500자, 목표 3,200~3,700자. 소제목과 짧은 문단으로 작성하세요.
${feedback}JSON만 출력: {"title":"현재 출력 언어로 장 제목", "body":"본문", "evidenceHash":"${snapshot.evidenceHash}"}. 계산 근거 해시를 그대로 돌려주세요.`;
}

const fieldText = (value: unknown) => normalizeNarrativeBody(String(value ?? "").trim()).replace(/\s*\n+\s*/g, " ").trim();

/** 서술 JSON → 검사·교정된 서술. 쓸 만한 LLM 필드가 하나도 없으면 null(무효 시도). */
export function acceptNarration(value: any, ctx: CheckContext): Narration | null {
  const { view } = ctx;
  const top = view.candidates.slice(0, NARRATION_NAME_COUNT);
  const names = Array.isArray(value?.names) ? value.names : [];
  const letters = Array.isArray(value?.letters) ? value.letters : [];
  let accepted = 0;
  let replaced = 0;
  let filled = 0;
  const pick = (raw: unknown, scope: typeof top, fallback: string, max: number) => {
    const text = fieldText(raw);
    if (!text) { filled++; return fallback; }
    if (countPaidReportBodyChars(text) < NARRATION_MIN_FIELD_CHARS || findViolations(text, ctx, scope).length) { replaced++; return fallback; }
    accepted++;
    return text.length > max ? trimToSentenceBoundary(text, max) : text;
  };
  const outNames = top.map((candidate) => {
    const entry = names.find((item: any) => Number(item?.rank) === candidate.rank) || {};
    return {
      rank: candidate.rank,
      meaning: pick(entry.meaning, [candidate], meaningText(view, candidate), NARRATION_NAME_MAX_CHARS),
      sajuSupport: pick(entry.sajuSupport, [candidate], sajuSupportText(view, candidate), NARRATION_NAME_MAX_CHARS),
      soundFeel: pick(entry.soundFeel, [candidate], soundFeelText(view, candidate), NARRATION_NAME_MAX_CHARS),
    };
  });
  const outLetters = top.slice(0, NARRATION_LETTER_COUNT).map((candidate) => {
    const entry = letters.find((item: any) => Number(item?.rank) === candidate.rank) || {};
    return { rank: candidate.rank, letter: pick(entry.letter, [candidate], letterText(view, candidate), NARRATION_LETTER_MAX_CHARS) };
  });
  if (!accepted) return null;
  return { source: replaced || filled ? "llm-corrected" : "llm", names: outNames, letters: outLetters, corrections: { replaced, filled } };
}

const chapterAccepted = (state: NamingDeliveryV2, id: number) => Boolean(state.chapters?.[id]);

export function namingReportCompleteV2(state: NamingDeliveryV2 | null | undefined): boolean {
  if (!state?.narration) return false;
  for (let id = 1; id <= CHAPTER_COUNT; id++) if (!chapterAccepted(state, id)) return false;
  return true;
}

function pendingChapters(state: NamingDeliveryV2): number[] {
  const ids: number[] = [];
  for (let id = 1; id <= CHAPTER_COUNT; id++) {
    if (!chapterAccepted(state, id) && (state.attempts[id] || 0) < MAX_ATTEMPTS) ids.push(id);
  }
  return ids;
}

export function namingChaptersTextV2(chapters: Record<string, ChapterRecord> = {}): string {
  const out: string[] = [];
  for (let id = 1; id <= CHAPTER_COUNT; id++) {
    const chapter = chapters[id];
    if (chapter) out.push(`## ${chapter.id}. ${chapter.title}\n${chapter.body}`);
  }
  return out.join("\n\n");
}

export interface WaveDeps {
  /** (prompt, part, maxOutputTokens) → callGeminiText 결과. 래퍼가 로케일·호출 옵션을 고정한다. */
  call: (prompt: string, part: string, maxOutputTokens: number) => Promise<any>;
  partsPerRequest: number;
  chapterTitles: string[];
}

/** 요청 하나에 웨이브 하나. 반환 limited = 더 할 일이 없는데 완성되지 않았다(LLM 장이 하나도 없음). */
export async function generateNamingWaveV2(snapshot: any, checkpoint: (state: NamingDeliveryV2) => Promise<unknown>, deps: WaveDeps) {
  const view: EngineView = snapshot.engine;
  const ctx: CheckContext = { view, locale: snapshot.locale || "ko" };
  let state: NamingDeliveryV2 = structuredClone(snapshot.delivery?.version === 2 ? snapshot.delivery : initialDeliveryV2(view));
  state.attempts ||= {};
  state.invalidAttempts ||= {};
  state.drafts ||= {};
  state.chapters ||= {};
  const persist = () => checkpoint(structuredClone(state));
  const titleOf = (id: number) => deps.chapterTitles[id - 1] || `${id}장`;

  if (!state.narration) {
    if ((state.attempts.narration || 0) < MAX_ATTEMPTS) {
      state.attempts.narration = (state.attempts.narration || 0) + 1;
      await persist();
      let ai: any;
      try {
        ai = await deps.call(narrationPrompt(snapshot), "narration", NARRATION_MAX_OUTPUT_TOKENS);
      } catch {
        if ((state.attempts.narration || 0) < MAX_ATTEMPTS) return { state, limited: false };
        ai = null;
      }
      if (ai) state.rawResponses = { ...state.rawResponses, narration: ai?.rawText || ai?.text || "" };
      const value = usable(ai) ? parseJson(ai.text) : null;
      const narration = value && (!value.evidenceHash || value.evidenceHash === snapshot.evidenceHash) ? acceptNarration(value, ctx) : null;
      if (narration) {
        state.narration = narration;
        state.candidates = engineCards(view, narration);
        state.provider = String(ai.provider || "gemini");
        state.model = String(ai.model || "");
      } else if (ai?.ok) {
        state.invalidAttempts.narration = (state.invalidAttempts.narration || 0) + 1;
      }
      // 두 번째도 실패하면 결정론 서술로 넘어간다 — 서술 단계는 보고서를 막지 않는다.
      if (!state.narration && (state.attempts.narration || 0) >= MAX_ATTEMPTS) {
        state.narration = deterministicNarration(view);
        state.candidates = engineCards(view, state.narration);
      }
      await persist();
      return { state, limited: false };
    }
    state.narration = deterministicNarration(view);
    state.candidates = engineCards(view, state.narration);
    await persist();
  }

  const wave = pendingChapters(state).slice(0, Math.max(1, deps.partsPerRequest));
  for (const id of wave) state.attempts[id] = (state.attempts[id] || 0) + 1;
  if (wave.length) await persist();
  let queue: Promise<unknown> = Promise.resolve();
  const results = await Promise.allSettled(wave.map(async (id) => {
    const title = titleOf(id);
    let ai: any;
    try {
      ai = await deps.call(chapterPrompt(snapshot, id, title, state.drafts[id]), String(id), CHAPTER_MAX_OUTPUT_TOKENS);
    } catch { return; }
    const value = usable(ai) ? parseJson(ai.text) : null;
    const save = async () => {
      state.rawResponses = { ...state.rawResponses, [id]: ai?.rawText || ai?.text || "" };
      const body = typeof value?.body === "string" ? normalizeNarrativeBody(value.body) : null;
      const others = namingChaptersTextV2(Object.fromEntries(Object.entries(state.chapters).filter(([key]) => Number(key) !== id)));
      if (!value || (value.evidenceHash && value.evidenceHash !== snapshot.evidenceHash) || typeof body !== "string"
        || countPaidReportBodyChars(body) <= 0 || hasRepeatedReportPassage(body) || hasRepeatedReportPassage(`${others}\n${body}`)) {
        if (ai?.ok) { state.invalidAttempts[id] = (state.invalidAttempts[id] || 0) + 1; await persist(); }
        return;
      }
      const corrected = correctText(body, ctx);
      const rawTitle = String(value.title || title).replace(/[\r\n#]/g, " ").trim().slice(0, 120);
      const chapterTitle = rawTitle && !findViolations(rawTitle, ctx).length ? rawTitle : title;
      if (!corrected.violations.length) {
        state.chapters = { ...state.chapters, [id]: { id, title: chapterTitle, body: corrected.text, source: "llm" } };
        delete state.drafts[id];
      } else if ((state.attempts[id] || 0) < MAX_ATTEMPTS) {
        state.drafts = { ...state.drafts, [id]: { body: corrected.text, violations: corrected.violations.slice(0, 20) } };
      } else {
        const draft = state.drafts[id]?.body || "";
        const best = countPaidReportBodyChars(draft) > countPaidReportBodyChars(corrected.text) ? draft : corrected.text;
        if (countPaidReportBodyChars(best) >= CHAPTER_MIN_CORRECTED_CHARS) {
          state.chapters = { ...state.chapters, [id]: { id, title: chapterTitle, body: best, source: "llm-corrected" } };
          delete state.drafts[id];
        } else {
          state.invalidAttempts[id] = (state.invalidAttempts[id] || 0) + 1;
        }
      }
      if (!state.provider) { state.provider = String(ai.provider || "gemini"); state.model = String(ai.model || ""); }
      await persist();
    };
    queue = queue.then(save, save);
    await queue;
  }));
  const failedSave = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
  if (failedSave) throw failedSave.reason;

  if (!pendingChapters(state).length && !namingReportCompleteV2(state)) {
    // 시도를 다 쓴 장: 저장된 교정 초안이 있으면 그것을, LLM 장이 하나라도 있으면 나머지는 결정론 장으로 채운다.
    for (let id = 1; id <= CHAPTER_COUNT; id++) {
      const draft = state.drafts[id];
      if (!chapterAccepted(state, id) && draft && countPaidReportBodyChars(draft.body) >= CHAPTER_MIN_CORRECTED_CHARS) {
        state.chapters = { ...state.chapters, [id]: { id, title: titleOf(id), body: draft.body, source: "llm-corrected" } };
        delete state.drafts[id];
      }
    }
    if (Object.values(state.chapters).some((chapter) => chapter.source !== "engine")) {
      const saju: SajuLines = snapshot.sajuSnapshot || {};
      for (let id = 1; id <= CHAPTER_COUNT; id++) {
        if (chapterAccepted(state, id)) continue;
        state.chapters = { ...state.chapters, [id]: { id, title: titleOf(id), body: engineChapterBody(id, view, saju, state.narration), source: "engine" } };
      }
    }
    await persist();
  }
  return { state, limited: !namingReportCompleteV2(state) && !pendingChapters(state).length };
}

/** LLM 이 끝까지 쓸 수 있는 장을 하나도 내지 못했고, 적어도 한 장은 두 번 모두 무효 응답이었다(환불 경로). */
export function confirmedEmptyNamingFailureV2(state: NamingDeliveryV2 | null | undefined): boolean {
  if (!state || Object.keys(state.chapters || {}).length) return false;
  return Object.entries(state.attempts || {}).some(([id, count]) => id !== "narration" && count >= MAX_ATTEMPTS && state.invalidAttempts?.[id] === count);
}
