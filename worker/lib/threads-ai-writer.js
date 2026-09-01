// Threads 일일 문안의 **문장만** 쓰는 층. 사실은 daily-stem-guidance.js 가 이미 확정했다.
//
// 🔴 **이 파일이 SNS 발행 경로에서 LLM 을 부르는 유일한 자리다.** 나머지(threads-daily-content.js)
// 는 여전히 LLM 0회 · DB 0회로 남아, 여기가 실패하면 그대로 결정론 문안이 나간다.
//
// 🔴 **모델에게 명리를 시키지 않는다.** 십성·십이운성·신살·좋은 글자는 정본 표가 계산해서
// 프롬프트에 사실로 박아 넣고, 모델은 그 사실을 한국어 문장으로 옮기는 일만 한다. 모델이
// 계산까지 하면 하루 한 번 공개 계정에 검토 없이 틀린 명리가 나가고 아무도 못 잡는다.
//
// 🔴 검증은 **fail-closed** 다. 사실에 없는 십성 이름이 한 글자라도 섞이면 그 항목을 통째로
// 버리고 결정론 문장으로 되돌린다 — 전부 버리지 않고 항목별로 되돌리는 이유는, 열 일간 중
// 하나가 헛소리를 했다고 나머지 아홉의 좋은 문장까지 잃을 이유가 없기 때문이다.
//
// 🔴 기본값은 **꺼짐**이다(SNS_THREADS_AI_ENABLED). 스위치가 없으면 fetch 0회로 즉시 null 을
// 돌려주고, 검증 스크립트는 그 성질을 단언한다.

import { getEnv } from "./env.js";
import { callGeminiText } from "./gemini.js";
import { GROUP_TEN_GODS, TEN_GOD_GROUP } from "./daily-stem-guidance.js";

/** 십성 10종 + 계열 5종. 검증기가 "사실에 없는 이름"을 찾을 때 쓰는 전체 어휘다. */
const ALL_TEN_GOD_WORDS = Object.freeze([
  ...Object.keys(TEN_GOD_GROUP),
  ...Object.keys(GROUP_TEN_GODS),
]);

// 하루 한 번 · 열한 토막짜리 짧은 글이라 길게 줄 이유가 없다. 크론은 30초 안에 끝나야 하고,
// 여기서 오래 물고 있으면 같은 실행을 공유하는 다른 태스크가 함께 늦어진다.
const AI_TIMEOUT_MS = 20000;
const INTRO_MAX = 200;
// 🔴 답글 한 글(480자)에 일간 2개가 들어간다. 사실 줄이 일간당 약 60자라 조언은 90자가 상한이다 —
// 여기를 늘리면 clampThreadsText 가 말끝을 자른 글이 공개 계정에 나간다.
const ADVICE_MAX = 90;
const INTRO_MIN = 20;
const ADVICE_MIN = 15;

const SYSTEM_PROMPT = [
  "당신은 30년 넘게 상담해 온 한국의 사주 명리학자다. 자평명리(子平命理)를 따르고,",
  "일간(日干)을 중심에 두고 십성·십이운성·신살로 하루의 결을 읽는다.",
  "말투는 점집의 과장이 아니라, 오래 본 사람에게 조용히 건네는 조언에 가깝다.",
  "",
  "지켜야 할 것:",
  "- 아래 '확정된 사실'에 적힌 것만 근거로 쓴다. 거기 없는 십성·신살·용신·격국을 지어내지 않는다.",
  "- 확정된 사실에 없는 십성 이름(비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인)을 쓰지 않는다.",
  "- 재물·건강·사고·수명을 단정하지 않는다. 오늘 하루 무엇을 하면 좋은지로 바꿔 말한다.",
  "- 링크·해시태그·이모지·마크다운·HTML 태그를 쓰지 않는다. 그건 발행하는 쪽이 붙인다.",
  "- 존댓말 평서문으로 쓴다. 문장은 짧게 끊는다.",
].join("\n");

function factsForStem(row) {
  const shinsal = row.shinsal.length ? row.shinsal.join("·") : "없음";
  return [
    `- ${row.stemKo}(${row.stem}) 일간 [오행 ${row.element}]`,
    `  · 오늘 천간이 나에게: ${row.tenGod} (${row.role} 기운)`,
    `  · 오늘 지지 지장간이 나에게: ${row.branchTenGods.join("·")}`,
    `  · 나의 십이운성 자리: ${row.twelveStage}`,
    `  · 오늘 걸린 신살: ${shinsal}`,
    `  · 있으면 좋은 십성: ${row.flowTenGods.join("·")} (${row.flowName})`,
    `  · 그 근거 문장: ${row.flowLine}`,
  ].join("\n");
}

/**
 * 프롬프트 본문. 순수 함수라 검증 스크립트가 LLM 없이 내용을 단언한다.
 * @param {{dateLabel: string, dayPillarKo: string, dayPillar: string, yearPillarKo: string, moodLine: string}} day
 * @param {object[]} rows 일간 10개 판정(buildAllStemGuidance 를 평탄화한 것)
 */
export function buildMyeongriPrompt(day, rows) {
  return [
    `오늘은 ${day.dateLabel}, 일진은 ${day.dayPillarKo}일(${day.dayPillar})이고 올해는 ${day.yearPillarKo}년이다.`,
    `오늘의 결: ${day.moodLine}`,
    "",
    "확정된 사실 — 일간 10개 각각에 대해 정본 명리표로 계산해 둔 값이다. 이 값을 바꾸지 말고 문장으로만 옮겨라.",
    "",
    ...rows.map(factsForStem),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스·주석을 붙이지 마라.",
    "{",
    `  "intro": "오늘 하루 전체의 결을 두세 문장으로. ${INTRO_MAX}자 이내.",`,
    ...rows.map(
      (row, index) =>
        `  "${row.stem}": "${row.stemKo} 일간에게 건네는 오늘의 조언 한두 문장. 위 사실 중 십성과 있으면 좋은 십성을 반드시 녹여 쓴다. ${ADVICE_MAX}자 이내."${index === rows.length - 1 ? "" : ","}`,
    ),
    "}",
  ].join("\n");
}

/** 발행 문안에 섞이면 안 되는 것 — 태그·링크·마크다운 강조·해시태그. */
function hasForbiddenMarkup(text) {
  return /<[^>]+>|https?:\/\/|\*\*|^#|\n#|\[[^\]]*\]\(/.test(text);
}

/**
 * 사실에 없는 십성 이름이 섞였는지. 섞였으면 그 이름을 돌려준다(없으면 "").
 * 🔴 이것이 이 파일의 핵심 가드다 — 모델이 "정관이 들어오니…" 같은 문장을 지어내면
 * 공개 계정에 틀린 명리가 나간다. 허용 목록은 그 일간의 확정된 사실에서만 만든다.
 */
export function findUnsupportedTenGod(text, allowed) {
  const allowedSet = new Set(allowed.filter(Boolean));
  for (const word of ALL_TEN_GOD_WORDS) {
    if (allowedSet.has(word)) continue;
    if (text.includes(word)) return word;
  }
  return "";
}

function allowedWordsFor(row) {
  return [
    row.tenGod,
    row.tenGodGroup,
    ...row.branchTenGods,
    ...row.flowTenGods,
    row.flowGroup,
  ];
}

function acceptText(text, { min, max, allowed }) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (value.length < min || value.length > max) return "";
  if (hasForbiddenMarkup(value)) return "";
  if (allowed && findUnsupportedTenGod(value, allowed)) return "";
  return value;
}

/** 코드펜스로 감싸 오는 경우가 있어 JSON 본체만 뽑는다. 실패하면 null. */
function parseJsonObject(raw) {
  const text = String(raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isThreadsAiEnabled(env) {
  const raw = String(getEnv(env, "SNS_THREADS_AI_ENABLED") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

/**
 * 그날의 AI 문안. 스위치가 꺼져 있거나 호출·검증이 실패하면 **null 또는 부분 결과**를 돌려준다.
 * 던지지 않는다 — 문안 생성 실패가 발행 자체를 막으면 안 된다.
 *
 * @param {Object} env
 * @param {Object} params
 * @param {Object} params.day 날짜·일진 라벨
 * @param {object[]} params.rows 일간 10개 판정
 * @param {Function} [params.generateImpl] 검증용 주입. 기본은 callGeminiText.
 * @returns {Promise<{intro: string, advice: Object<string,string>, model: string}|null>}
 */
export async function writeDailyThreadsCopy(env, { day, rows, generateImpl } = {}) {
  if (!isThreadsAiEnabled(env)) return null;
  if (!Array.isArray(rows) || !rows.length) return null;

  const generate = typeof generateImpl === "function" ? generateImpl : callGeminiText;

  let result;
  try {
    result = await generate(env, buildMyeongriPrompt(day, rows), {
      systemPrompt: SYSTEM_PROMPT,
      taskType: "fortune",
      locale: "ko",
      temperature: 0.8,
      maxOutputTokens: 2048,
      timeoutMs: AI_TIMEOUT_MS,
      responseMimeType: "application/json",
    });
  } catch (error) {
    // callGeminiText 는 던지지 않지만 주입된 구현은 던질 수 있다.
    console.error("[CRON] SNS Daily Post: AI 문안 생성이 예외로 끝났다 —", error?.message || error);
    return null;
  }

  if (!result?.ok) {
    console.error(`[CRON] SNS Daily Post: AI 문안 생성 실패(${result?.error || "unknown"}) — 결정론 문안으로 간다.`);
    return null;
  }

  const parsed = parseJsonObject(result.text);
  if (!parsed) {
    console.error("[CRON] SNS Daily Post: AI 응답을 JSON 으로 못 읽었다 — 결정론 문안으로 간다.");
    return null;
  }

  const advice = {};
  let rejected = 0;
  for (const row of rows) {
    const accepted = acceptText(parsed[row.stem], {
      min: ADVICE_MIN,
      max: ADVICE_MAX,
      allowed: allowedWordsFor(row),
    });
    if (accepted) advice[row.stem] = accepted;
    else rejected += 1;
  }

  const intro = acceptText(parsed.intro, { min: INTRO_MIN, max: INTRO_MAX, allowed: null });
  if (!intro && !Object.keys(advice).length) return null;

  if (rejected) {
    console.warn(`[CRON] SNS Daily Post: AI 문안 ${rejected}건이 검증에 걸려 결정론 문장으로 되돌렸다.`);
  }

  return { intro, advice, model: String(result.model || "") };
}
