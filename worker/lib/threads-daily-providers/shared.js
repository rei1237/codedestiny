// Threads 유형별 일일 발행 — provider 공통 부품.
//
// 🔴 파이프라인은 한 방향이다: 정본 엔진 계산 → facts(JSON) → LLM 은 문장만(검증·폴백) → formatter → 발행.
//    LLM 에게 "운세를 써 달라"고 하지 않는다. facts 에 없는 용어가 한 글자라도 섞이면 그 필드를 버리고
//    결정론 문장으로 되돌린다(threads-ai-writer.js 와 같은 fail-closed 규약).
// 🔴 이 파일은 DB 0회다. LLM 호출은 generateJsonCopy 한 곳뿐이고 SNS_THREADS_AI_ENABLED 가 꺼져 있으면 0회다.

import { callGeminiText } from "../gemini.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { isThreadsAiEnabled } from "../threads-ai-writer.js";
import { clampThreadsText } from "../threads-daily-content.js";
import { threadsTextWeight } from "../threads.js";

// API 상한(500)보다 낮게 — threads-daily-content.js 의 CHAIN_TEXT_LIMIT 과 같은 여유.
export const POST_TEXT_LIMIT = 480;

const AI_TIMEOUT_MS = 20000;
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 어느 점술 글에도 들어가면 안 되는 범용 문구. 날짜·계산과 무관하게 아무 날에나 붙는 말이라
 * "AI 가 쓴 운세" 로 읽힌다. 하나라도 섞이면 그 필드는 폐기된다.
 */
export const GENERIC_PHRASES = Object.freeze([
  "새로운 기회",
  "긍정적인 마음",
  "긍정적인 에너지",
  "긍정의 에너지",
  "좋은 일이 생길",
  "좋은 일이 가득",
  "행운이 찾아",
  "행운이 가득",
  "우주의 기운",
  "우주가",
  "당신을 응원",
  "마음먹기에 따라",
  "모든 일이 잘",
  "좋은 하루 되세요",
  "행복한 하루",
  "특별한 하루",
  "무한한 가능성",
  "잠재력을",
  "기적",
  "힐링",
  "에너지를 받아",
  "끌어당김",
]);

/** 한국 시각 날짜 라벨. 예: `9월 17일(목)` */
export function kstDateLabel(now) {
  const { m, d, day } = getKstDateParts(now);
  return `${m}월 ${d}일(${WEEKDAY_KO[day]})`;
}

/** Threads → 사이트 유입 링크. 캠페인은 유형별로 갈라 어느 글이 데려왔는지 본다. */
export function buildUtmUrl(base, path, type) {
  const glue = path.includes("?") ? "&" : "?";
  return `${base}${path}${glue}utm_source=threads&utm_medium=social&utm_campaign=daily_${type}`;
}

/** 발행 문안에 섞이면 안 되는 것 — 태그·링크·마크다운 강조·해시태그·이모지. */
function hasForbiddenMarkup(text) {
  return /<[^>]+>|https?:\/\/|www\.|\*\*|#|\[[^\]]*\]\(/.test(text) || /\p{Extended_Pictographic}/u.test(text);
}

export function findGenericPhrase(text) {
  return GENERIC_PHRASES.find((phrase) => text.includes(phrase)) || "";
}

/**
 * vocabulary 중 allowed 에 없는 용어가 text 에 있으면 그 용어를 돌려준다(없으면 "").
 * 🔴 허용 목록은 그날 facts 에서만 만든다 — 모델이 "오늘 화기가 태음에…" 처럼 계산에 없는 조합을
 * 지어내면 공개 계정에 틀린 점술이 나간다.
 */
export function findUnsupportedTerm(text, vocabulary, allowed) {
  const allowedSet = new Set((allowed || []).filter(Boolean));
  for (const word of vocabulary || []) {
    if (!word || allowedSet.has(word)) continue;
    if (word instanceof RegExp) {
      const hit = text.match(word);
      if (hit && !allowedSet.has(hit[0])) return hit[0];
      continue;
    }
    if (text.includes(word)) return word;
  }
  return "";
}

/**
 * 모델이 쓴 한 필드를 받아들일지. 받아들이면 정리된 문자열, 아니면 "".
 * @param {unknown} value
 * @param {{min:number, max:number, vocabulary?:Array<string|RegExp>, allowed?:string[], forbidden?:string[], validate?:(text:string)=>boolean}} rule
 *   validate — 용어 단위로는 못 잡는 조합 검사(예: 자미두수 "별 ↔ 사화" 짝). false 면 버린다.
 */
export function acceptCopyField(value, { min, max, vocabulary = [], allowed = [], forbidden = [], validate }) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length < min || text.length > max) return "";
  if (hasForbiddenMarkup(text)) return "";
  if (findGenericPhrase(text)) return "";
  if (forbidden.some((word) => text.includes(word))) return "";
  if (findUnsupportedTerm(text, vocabulary, allowed)) return "";
  if (typeof validate === "function" && !validate(text)) return "";
  return text;
}

/** 코드펜스로 감싸 오는 경우가 있어 JSON 본체만 뽑는다. 실패하면 null. */
export function parseJsonObject(raw) {
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

/** 모든 provider 가 공유하는 문체 규칙. 점술별 전문가 설정은 provider 가 앞에 붙인다. */
export const COMMON_RULES = [
  "지켜야 할 것:",
  "- 아래 facts JSON 에 적힌 용어·수치만 근거로 쓴다. facts 에 없는 별·십성·신살·나크샤트라·궁 이름을 지어내지 않는다.",
  "- 재물·건강·사고·수명·연애 결과를 단정하지 않는다. 오늘 무엇을 하면 좋은지로 바꿔 말한다.",
  "- '새로운 기회', '긍정적인 에너지', '행운이 찾아온다' 같은 아무 날에나 붙는 문구를 쓰지 않는다.",
  "- 링크·해시태그·이모지·마크다운·HTML 태그를 쓰지 않는다. 그건 발행하는 쪽이 붙인다.",
  "- 결제·구매·상담 권유를 쓰지 않는다.",
  "- 존댓말 평서문으로, 문장은 짧게 끊는다.",
].join("\n");

/**
 * facts 를 문장으로 옮기는 LLM 1회. 던지지 않는다 — 실패하면 null 이고 호출부가 결정론 문장으로 간다.
 * @returns {Promise<{fields: Object, model: string}|null>}
 */
export async function generateJsonCopy(env, { type, systemPrompt, prompt, generateImpl }) {
  if (!isThreadsAiEnabled(env)) return null;
  const generate = typeof generateImpl === "function" ? generateImpl : callGeminiText;
  let result;
  try {
    result = await generate(env, prompt, {
      systemPrompt,
      taskType: "fortune",
      locale: "ko",
      temperature: 0.7,
      maxOutputTokens: 1024,
      timeoutMs: AI_TIMEOUT_MS,
      responseMimeType: "application/json",
    });
  } catch (error) {
    console.error(`[CRON] Threads ${type}: AI 문안 생성이 예외로 끝났다 —`, error?.message || error);
    return null;
  }
  if (!result?.ok) {
    console.error(`[CRON] Threads ${type}: AI 문안 생성 실패(${result?.error || "unknown"}) — 결정론 문안으로 간다.`);
    return null;
  }
  const fields = parseJsonObject(result.text);
  if (!fields) {
    console.error(`[CRON] Threads ${type}: AI 응답을 JSON 으로 못 읽었다 — 결정론 문안으로 간다.`);
    return null;
  }
  return { fields, model: String(result.model || "") };
}

/**
 * 모델 필드를 규칙별로 걸러 fallback 과 합친다. 필드마다 따로 되돌린다 — 하나가 헛소리를 했다고
 * 나머지 좋은 문장까지 버릴 이유가 없다.
 * @returns {{copy: Object<string,string>, model: string|null, rejected: string[]}}
 */
export function mergeCopy(generated, rules, fallback) {
  const copy = { ...fallback };
  const rejected = [];
  let used = 0;
  for (const [key, rule] of Object.entries(rules)) {
    if (!generated) break;
    const accepted = acceptCopyField(generated.fields?.[key], rule);
    if (accepted) {
      copy[key] = accepted;
      used += 1;
    } else {
      rejected.push(key);
    }
  }
  return { copy, model: used ? generated.model || null : null, rejected };
}

/**
 * 게시물 한 개를 조립한다. 해시태그 몫을 예산에서 먼저 빼고 본문만 클램프한다
 * (태그를 붙인 뒤 자르면 태그가 먼저 잘린다 — appendRootHashtag 와 같은 규약).
 * 🔴 CTA·링크도 본문보다 먼저 예산을 잡는다 — 길이가 넘쳐도 유입 경로는 잘리지 않는다.
 */
export function renderPost({ head, extra = "", cta, url, hashtag }, limit = POST_TEXT_LIMIT) {
  const tail = `\n\n${cta}\n→ ${url}\n\n#${hashtag}`;
  const budget = limit - threadsTextWeight(tail);
  // extra(한 줄 팁)는 통째로 들어갈 때만 붙인다 — 문장 중간에서 "…" 로 끊긴 팁보다 없는 편이 낫다.
  const withExtra = extra ? `${head}\n\n${extra}` : head;
  const body = threadsTextWeight(withExtra) <= budget ? withExtra : head;
  return `${clampThreadsText(body, budget)}${tail}`;
}
