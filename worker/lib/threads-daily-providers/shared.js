// Threads 유형별 일일 발행 — provider 공통 부품.
//
// 🔴 파이프라인은 한 방향이다: 정본 엔진 계산 → facts(JSON) → LLM 은 문장만(검증·폴백) → formatter → 발행.
//    LLM 에게 "운세를 써 달라"고 하지 않는다. facts 에 없는 용어가 한 글자라도 섞이면 그 필드를 버리고
//    결정론 문장으로 되돌린다(threads-ai-writer.js 와 같은 fail-closed 규약).
// 🔴 이 파일은 DB 0회다. LLM 호출은 generateJsonCopy 한 곳뿐이고 SNS_THREADS_AI_ENABLED 가 꺼져 있으면 0회다.

import { callGeminiText } from "../gemini.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { isThreadsAiEnabled } from "../threads-ai-writer.js";
import { threadsTextWeight } from "../threads.js";

// API 상한(500)보다 낮게 — threads-daily-content.js 의 CHAIN_TEXT_LIMIT 과 같은 여유.
export const POST_TEXT_LIMIT = 480;
export const PROMPT_VERSION = "growth-20260929-v1";

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
export function buildUtmUrl(base, path, type, dateKey = "") {
  const url = new URL(path, base);
  url.searchParams.set("utm_source", "threads");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", dateKey ? `threads_${dateKey.replace(/-/g, "")}_${type}` : `daily_${type}`);
  return url.toString();
}

const SCENES = {
  saju: ["여러 일을 벌였는데 마무리가 남았다면?", "할 말은 많은데 어디부터 꺼낼지 막막한가요?", "서두를수록 같은 일을 다시 하게 된다면?", "시작은 쉬운데 끝내기가 어렵다면?", "오늘 할 일을 적다가 또 늘려 놓았나요?", "부탁을 받자마자 괜찮다고 대답했나요?", "혼자 해결하려다 하루가 다 갔다면?", "잘한 일보다 놓친 일만 떠오르나요?", "계획을 바꿀지 조금 더 버틸지 고민된다면?", "결정한 뒤에도 자꾸 다른 선택이 떠오르나요?"],
  ziwei: ["돈은 들어왔는데 어디에 썼는지 흐릿한가요?", "일은 끝났는데 확인할 답장이 남았나요?", "좋은 제안 앞에서 놓치는 조건은 없나요?", "성과가 났는데 보상 이야기는 미뤘나요?", "통장보다 먼저 살펴볼 지출 약속이 있나요?", "도와주다 내 일정이 밀리고 있나요?", "고정비를 줄일지 수입을 늘릴지 고민되나요?", "급한 부탁에 내 기준을 내려놓고 있나요?", "계약서보다 상대의 말에 기대고 있나요?", "열심히 한 일과 인정받는 일이 다르다면?"],
  vedic: ["새 일을 시작하기 전에 정리할 일이 남았나요?", "오늘 집중이 흐트러져 일정부터 바꾸려 하나요?", "계획은 선명한데 첫 행동이 막막한가요?", "빨리 움직일지 한 번 더 확인할지 고민되나요?", "내 속도보다 남의 속도에 맞추고 있나요?", "생각이 많아져 쉬는 시간도 놓쳤나요?", "중요한 결정을 피로한 채로 내리고 있나요?", "새 약속을 잡기 전에 남은 일을 보셨나요?", "한 번에 바꾸려다 아무것도 못 했다면?", "오래 미룬 일을 오늘 시작하고 싶다면?"],
  numerology: ["잠들기 전 끝내지 못한 일이 떠오르나요?", "오늘 해야 할 일과 하고 싶은 일이 달랐나요?", "결정을 미룬 이유를 한 문장으로 적어볼까요?", "도움을 청할 일이 있는데 혼자 붙잡고 있나요?", "내일 일정에 빈칸이 하나도 없나요?", "오늘 잘한 일을 너무 작게 보고 있나요?", "계획을 세우는 데 하루를 다 썼나요?", "오늘의 선택을 내일도 반복하고 싶나요?", "그만할 일보다 더할 일만 찾고 있나요?", "하루를 마치며 내 기준을 다시 보고 싶나요?"],
};
const ACTIONS = {
  saju:["새로 맡을 일보다 끝낼 일 하나부터 골라보세요.","전하고 싶은 핵심을 한 문장으로 적어보세요.","다시 확인할 항목 하나를 체크리스트에 남겨보세요.","끝났다고 볼 기준을 작게 정해보세요.","오늘 목록에서 내일로 미룰 일 하나를 빼보세요.","가능한 시간부터 확인한 뒤 답해도 괜찮아요.","내가 할 일과 도움받을 일을 나눠보세요.","오늘 해낸 일을 결과와 과정으로 하나씩 적어보세요.","계획을 바꿀 조건 하나를 먼저 정해보세요.","선택할 때 중요했던 기준으로 다시 비교해보세요."],
  ziwei:["자동 결제와 직접 고른 지출을 나눠 적어보세요.","답장이 필요한 일과 단순 공유를 구분해보세요.","좋아 보이는 조건 옆에 미확인 조건도 적어보세요.","성과를 어떤 기준으로 평가하는지 먼저 확인해보세요.","이번 달 확정 지출과 예정 지출을 구분해보세요.","부탁을 수락하기 전 내 마감부터 확인해보세요.","내가 바꿀 수 있는 지출 한 항목부터 살펴보세요.","바로 답하기 전에 내가 지킬 조건을 적어보세요.","구두 약속이 문서에도 있는지 확인해보세요.","기대하는 결과와 내가 맡은 역할을 맞춰보세요."],
  vedic:["시작 전에 마칠 일 하나를 먼저 적어보세요.","일정을 바꾸기 전에 방해 요소 하나를 줄여보세요.","오늘 끝낼 수 있는 첫 단계를 작게 정해보세요.","되돌리기 어려운 선택인지 먼저 확인해보세요.","오늘 쓸 수 있는 시간에 맞춰 목표를 줄여보세요.","잠시 쉬고 다시 판단할 시간을 정해보세요.","쉬고 나서도 같은 판단인지 다시 확인해보세요.","남은 일의 마감을 확인한 뒤 약속을 잡아보세요.","한 번에 바꿀 일 하나만 골라보세요.","준비물을 꺼내는 것부터 작게 시작해보세요."],
  numerology:["남은 일과 내일 해도 되는 일을 나눠 적어보세요.","내일은 하고 싶은 일에 쓸 작은 시간을 남겨보세요.","더 필요한 정보와 잃기 싫은 것을 나눠보세요.","도움받고 싶은 부분을 구체적으로 한 줄 적어보세요.","다음 일정 사이에 쉴 간격을 하나 남겨보세요.","완료한 결과 하나와 들인 노력 하나를 기록해보세요.","내일은 계획의 첫 단계만 먼저 실행해보세요.","반복하고 싶은 선택 한 가지를 적어보세요.","이번 주에 줄일 약속 하나를 골라보세요.","내일도 지킬 기준을 한 문장으로 남겨보세요."],
};
export function situationTip(type, facts, recent = []) {
  const hook = situationHook(type, facts, recent);
  return ACTIONS[type]?.[SCENES[type]?.indexOf(hook)] || "오늘 확인할 질문 하나를 적어보세요.";
}
export function situationHook(type, facts, recent = []) {
  const options = SCENES[type] || SCENES.saju;
  const offset = [...String(facts.dateLabel || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  const seen = new Set(recent.map(row => row.hook));
  return Array.from({length:options.length}, (_, index) => options[(offset + index) % options.length]).find(hook => !seen.has(hook)) || options[offset];
}
// Lexical near-duplicate guard; editorial review still judges meaning and evidence.
export function repeatsRecent(copy, recent = []) {
  const normalize = text => String(text || "").replace(/[^가-힣a-z]/gi, "");
  const grams = text => new Set(Array.from({length:Math.max(0,text.length-2)},(_,i)=>text.slice(i,i+3)));
  const candidate = grams(normalize(`${copy.hook} ${copy.body}`));
  return recent.some(row => {
    if (normalize(row.hook) && normalize(row.hook) === normalize(copy.hook)) return true;
    const previous = grams(normalize(`${row.hook} ${row.body}`));
    const common = [...candidate].filter(word => previous.has(word)).length;
    return common / Math.max(1, new Set([...candidate,...previous]).size) >= 0.85;
  });
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
  if (/100%|무조건|반드시|절대|적중률|상담해.*년|제가.*상담|재회.*보장|부자.*된다|죽음|불행이/.test(text)) return "";
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
  "- 첫 문장은 독자가 겪을 수 있는 구체적인 상황을 질문한다. 독자가 실제로 그 상황이라고 단정하지 않는다.",
  "- 본문은 그 상황에서 확인할 기준을 facts의 상징과 연결한다. 점술 용어 뒤에는 쉬운 풀이를 붙인다.",
  "- 날짜만 계산한 공통 상징이다. 개인 명식·상대의 속마음·개별 사건을 알아낸 것처럼 말하지 않는다.",
  "- 상담 경력·고객 일화·후기·매출을 창작하지 않는다. recent 문구는 재사용하지 않는다.",
].join("\n");

/**
 * facts 를 문장으로 옮기는 LLM 1회. 던지지 않는다 — 실패하면 null 이고 호출부가 결정론 문장으로 간다.
 * @returns {Promise<{fields: Object, model: string}|null>}
 */
export async function generateJsonCopy(env, { type, systemPrompt, prompt, generateImpl, recent = [] }) {
  if (!isThreadsAiEnabled(env)) return null;
  const generate = typeof generateImpl === "function" ? generateImpl : callGeminiText;
  let result;
  try {
    result = await generate(env, `${prompt}\nrecent (재사용 금지): ${JSON.stringify(recent.map(({hook,body})=>({hook,body})))}`, {
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
 * 게시물 한 개를 조립한다. 해시태그 몫을 예산에서 먼저 빼고 완전한 문장 단위로 담는다
 * (태그를 붙인 뒤 자르면 태그가 먼저 잘린다 — appendRootHashtag 와 같은 규약).
 * 🔴 CTA·링크도 본문보다 먼저 예산을 잡는다 — 길이가 넘쳐도 유입 경로는 잘리지 않는다.
 */
export function renderPost({ head, extra = "", cta, url, hashtag }, limit = POST_TEXT_LIMIT) {
  const tail = `\n\n${cta}\n→ ${url}\n\n#${hashtag}`;
  const budget = limit - threadsTextWeight(tail);
  // extra(한 줄 팁)는 통째로 들어갈 때만 붙인다 — 문장 중간에서 "…" 로 끊긴 팁보다 없는 편이 낫다.
  const lines = String(head).split("\n");
  let body = "";
  for (const line of lines) {
    const next = body ? `${body}\n${line}` : line;
    if (threadsTextWeight(next) <= budget) body = next;
  }
  if (extra && threadsTextWeight(`${body}\n\n${extra}`) <= budget) body += `\n\n${extra}`;
  return `${body.trim()}${tail}`;
}
