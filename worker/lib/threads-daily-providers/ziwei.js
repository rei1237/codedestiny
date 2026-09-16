// Threads 🔮 오늘의 자미두수 — 12:00 KST.
//
// 비개인 콘텐츠다. 궁 배치는 생시가 있어야 나오므로 쓰지 않고, 날짜만으로 정해지는 사화만 다룬다:
//   유일 사화 = 오늘 일간 천간, 유월 사화 = 음력 달의 월간, 유년 사화 = 음력 해의 연간.
// 사화 표는 ziwei-ai-chart.js 의 FOUR_TRANSFORMATIONS(명반 엔진 정본), 음력은 한국 음양력 코어,
// 별 성격 키워드는 island/report-star-data.js 의 STAR_FACET 를 그대로 import 한다 — 복제 금지.
// 🔴 궁 이름은 어느 날이든 금지어다. 개인 명반 없이 "오늘 재백궁에…" 라고 쓰면 틀린 점술이 된다.

import { STEM_HANGUL, ganji, solarToLunar } from "../../../lib/korean-calendar/index.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { ASSIST_FACET, MALEFIC_FACET, PALACE_FACET, STAR_FACET } from "../island/report-star-data.js";
import { withJosa } from "../pet/pet-elements.js";
import { FOUR_TRANSFORMATIONS, TRANSFORMATION_LABELS } from "../ziwei-ai-chart.js";
import {
  COMMON_RULES,
  generateJsonCopy,
  kstDateLabel,
  mergeCopy,
  renderPost,
} from "./shared.js";

export const TYPE = "ziwei";
export const PATH = "/ziwei/";
export const HASHTAG = "자미두수";
export const CTA = "내 명반에서 오늘 가장 강하게 움직이는 궁은?";

const MAX_KEY_FACTORS = 3;
const LAYERS = [
  { key: "day", label: "유일" },
  { key: "month", label: "유월" },
  { key: "year", label: "유년" },
];
const SIHUA_ORDER = ["huaLu", "huaQuan", "huaKe", "huaJi"];
const SIHUA_SHORT = { huaLu: "록", huaQuan: "권", huaKe: "과", huaJi: "기" };

// 사화가 붙는 보좌성 4개는 STAR_FACET(14주성)에 없다. 게시물 한 줄에 들어갈 두 글자 키워드만 둔다
// (문장은 ASSIST_FACET 정본을 쓴다).
const ASSIST_KEYWORD = { 문창: "문서", 문곡: "표현", 좌보: "조력", 우필: "우회" };

function keywordOf(star) {
  return STAR_FACET[star]?.keyword || ASSIST_KEYWORD[star] || "";
}

/**
 * 음력 달의 월간. 인월(1월) 천간 = (연간 index mod 5)·2 + 2 — 오호둔(갑기년 병인월…).
 * 윤달은 본달의 천간을 따른다.
 */
export function lunarMonthStemIndex(lunarYear, lunarMonth) {
  const yearStem = (((lunarYear - 4) % 10) + 10) % 10;
  const firstMonthStem = ((yearStem % 5) * 2 + 2) % 10;
  return (firstMonthStem + lunarMonth - 1) % 10;
}

function sihuaOf(stemIndex) {
  const stem = STEM_HANGUL[stemIndex];
  const table = FOUR_TRANSFORMATIONS[stem];
  if (!table) return null;
  return { stem, ...Object.fromEntries(SIHUA_ORDER.map((key) => [key, table[key]])) };
}

/**
 * 세 층의 사화에서 오늘 눈여겨볼 별 1~3개. 우선순위:
 *   ① 같은 별에 화록과 화기가 층을 달리해 함께 걸림(들어오는 것과 붙잡히는 것이 한 별에서)
 *   ② 같은 별에 사화 두 개 이상이 겹침
 *   ③ 유일 화기 별 ④ 유일 화록 별
 */
export function extractKeyFactors(layers) {
  const marksByStar = new Map();
  for (const { key, label } of LAYERS) {
    for (const sihua of SIHUA_ORDER) {
      const star = layers[key][sihua];
      if (!marksByStar.has(star)) marksByStar.set(star, []);
      marksByStar.get(star).push({ layer: label, sihua: TRANSFORMATION_LABELS[sihua] });
    }
  }

  const factors = [];
  const push = (star, kind) => {
    if (factors.length >= MAX_KEY_FACTORS || factors.some((factor) => factor.star === star)) return;
    factors.push({ star, keyword: keywordOf(star), kind, marks: marksByStar.get(star) });
  };
  const has = (star, name) => marksByStar.get(star).some((mark) => mark.sihua === name);

  for (const star of marksByStar.keys()) if (has(star, "화록") && has(star, "화기")) push(star, "록기동궁");
  for (const [star, marks] of marksByStar) if (marks.length >= 2) push(star, "사화중첩");
  push(layers.day.huaJi, "유일화기");
  push(layers.day.huaLu, "유일화록");
  return factors;
}

/**
 * 순수 계산. 같은 날짜면 언제나 같은 facts 다.
 * @returns {object|null}
 */
export function buildFacts(env, now) {
  const { y, m, d } = getKstDateParts(now);
  const core = ganji({ year: y, month: m, day: d, hour: 12, minute: 0 });
  const lunar = solarToLunar(y, m, d);
  if (!core || !lunar) return null;

  const layers = {
    day: sihuaOf(core.day.stemIndex),
    month: sihuaOf(lunarMonthStemIndex(lunar.lunarYear, lunar.lunarMonth)),
    year: sihuaOf((((lunar.lunarYear - 4) % 10) + 10) % 10),
  };
  if (!layers.day || !layers.month || !layers.year) return null;

  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    lunarLabel: `음력 ${lunar.isLeapMonth ? "윤" : ""}${lunar.lunarMonth}월 ${lunar.lunarDay}일`,
    layers,
    keyFactors: extractKeyFactors(layers),
    dayHuaJi: { star: layers.day.huaJi, keyword: keywordOf(layers.day.huaJi) },
    dayHuaLu: { star: layers.day.huaLu, keyword: keywordOf(layers.day.huaLu) },
  };
}

const STAR_VOCABULARY = [
  ...Object.keys(STAR_FACET),
  ...Object.keys(ASSIST_FACET),
  ...Object.keys(MALEFIC_FACET),
];
const VOCABULARY = [...STAR_VOCABULARY, "화록", "화권", "화과", "화기", "자화", "대한", "소한"];
const FORBIDDEN = [...Object.keys(PALACE_FACET), "궁에", "궁이", "궁은", "명반"];

function allowedTerms(facts) {
  const stars = LAYERS.flatMap(({ key }) => SIHUA_ORDER.map((sihua) => facts.layers[key][sihua]));
  return [...stars, "화록", "화권", "화과", "화기"];
}

/**
 * 문장 속 "별 ↔ 사화" 짝이 facts 에 실제로 있는지. 용어가 둘 다 facts 에 있어도 짝이 틀리면
 * ("태음에 화기" — 태음은 유월 화록인데) 틀린 점술이다. "염정에 화록" · "화기는 태양" 양방향을 본다.
 */
export function hasOnlyRealSihuaPairs(text, facts) {
  const real = new Set(LAYERS.flatMap(({ key }) => SIHUA_ORDER.map((sihua) => `${facts.layers[key][sihua]}|${TRANSFORMATION_LABELS[sihua]}`)));
  const stars = STAR_VOCABULARY.join("|");
  const labels = "화록|화권|화과|화기";
  const patterns = [
    new RegExp(`(${stars})(?:에|의|은|는|이|가|와|과)?\\s*(${labels})`, "g"),
    new RegExp(`(${labels})(?:는|은|가|이|의)?\\s*(${stars})`, "g"),
  ];
  for (const [index, pattern] of patterns.entries()) {
    for (const match of text.matchAll(pattern)) {
      const [star, label] = index === 0 ? [match[1], match[2]] : [match[2], match[1]];
      if (!real.has(`${star}|${label}`)) return false;
    }
  }
  return true;
}

const KIND_LINE = {
  록기동궁: (factor) => `${factor.star}에 화록과 화기가 함께 걸립니다. 들어오는 것과 붙잡히는 것이 같은 자리에서 나오니, ${factor.keyword}에 관한 일은 속도보다 마무리를 보세요.`,
  사화중첩: (factor) => `${factor.star}에 사화가 두 겹 걸려, ${factor.keyword}의 결이 오늘 유독 두드러집니다.`,
  유일화기: (factor) => `오늘 화기는 ${factor.star}에 붙습니다. ${factor.keyword}에 관한 일에서 유독 놓지 못하는 것이 생기기 쉽습니다.`,
  유일화록: (factor) => `오늘 화록은 ${factor.star}에 붙습니다. ${factor.keyword}에 관한 일에서 먼저 손을 내밀기 좋습니다.`,
};

function fallbackCopy(facts) {
  const [first] = facts.keyFactors;
  const { dayHuaLu: lu, dayHuaJi: ji } = facts;
  return {
    hook: `유일 화록은 ${lu.star}, 화기는 ${ji.star}. 오늘은 ${withJosa(lu.keyword, "이", "가")} 열리고 ${withJosa(ji.keyword, "이", "가")} 묶이는 날입니다.`,
    body: first ? KIND_LINE[first.kind](first) : "",
    tip: `화기 별 ${ji.star}의 ${withJosa(ji.keyword, "과", "와")} 관련된 일은 오늘 한 번 더 확인하고 넘기세요.`,
  };
}

const SYSTEM_PROMPT = [
  "당신은 30년 넘게 상담해 온 자미두수 전문가다. 사화(화록·화권·화과·화기)의 흐름 해석에 밝다.",
  "오늘은 특정인의 명반이 아니라 날짜로 정해지는 유일·유월·유년 사화만 다룬다. 궁 이름과 개인의 길흉을 말하지 않는다.",
  COMMON_RULES,
].join("\n");

export function buildPrompt(facts) {
  return [
    "facts — 명반 엔진의 사화 표로 계산한 오늘의 자미두수 사실이다. 값을 바꾸지 말고 문장으로만 옮겨라.",
    "keyFactors 의 kind: 록기동궁=한 별에 화록·화기가 함께, 사화중첩=한 별에 사화 두 개 이상, 유일화기·유일화록=오늘 일간의 사화.",
    JSON.stringify(facts, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "유일 화록·화기 별로 오늘이 어떤 날인지 한 문장. 45자 이내.",',
    '  "body": "keyFactors 첫 항목을 별의 keyword 와 함께 풀어낸 두 문장. 120자 이내.",',
    '  "tip": "dayHuaJi 를 근거로 오늘 조심해서 다룰 일 하나. 50자 이내."',
    "}",
  ].join("\n");
}

function copyRules(facts) {
  const base = { vocabulary: VOCABULARY, allowed: allowedTerms(facts), forbidden: FORBIDDEN, validate: (text) => hasOnlyRealSihuaPairs(text, facts) };
  return {
    hook: { ...base, min: 10, max: 45 },
    body: { ...base, min: 30, max: 120 },
    tip: { ...base, min: 10, max: 50 },
  };
}

/** @returns {Promise<{copy: Object<string,string>, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl } = {}) {
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl });
  return mergeCopy(generated, copyRules(facts), fallbackCopy(facts));
}

export function format(facts, copy, url) {
  // 세 층을 전부 나열하면 본문 몫이 모자란다. 오늘 층(유일)만 다 적고, 유월·유년은 겹친 별로만 보인다.
  const day = facts.layers.day;
  const dayLine = `· 유일(${day.stem}일) ${SIHUA_ORDER.map((sihua) => `${SIHUA_SHORT[sihua]} ${day[sihua]}`).join(" · ")}`;
  const factorLine = (factor) => `· ${factor.star}(${factor.keyword}) — ${factor.marks.map((mark) => `${mark.layer} ${mark.sihua}`).join(" + ")}`;
  const lines = [
    `🔮 ${facts.dateLabel} 오늘의 자미두수`,
    copy.hook,
    "",
    dayLine,
    ...facts.keyFactors.map(factorLine),
    "",
    copy.body,
  ];
  return renderPost({ head: lines.join("\n"), extra: copy.tip, cta: CTA, url, hashtag: HASHTAG });
}
