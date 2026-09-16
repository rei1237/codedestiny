// Threads 🌸 오늘의 사주 — 08:30 KST.
//
// 재료는 전부 기존 정본이다: 역법 코어 ganji(세·월·일주), today-saju-detail.js 의 buildTodaySajuPublic
// (today 허브 공개 카드와 같은 함수), saju-shinsal.js 의 도화·역마·화개·합충 판정.
// 🔴 별점은 없다. 비개인(날짜만) 모드에는 점수를 낼 근거가 없고(today 허브 공개 모드도 score=null),
//    무작위 별점은 금지다.

import { BRANCH_HANGUL, BRANCH_HANJA, STEM_HANGUL, STEM_HANJA, ganji } from "../../../lib/korean-calendar/index.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { BRANCH_ELEMENT, STEM_ELEMENT } from "../life-book-ai-saju.js";
import { SHINSAL_LINE, TEN_GOD_LINE, buildTodaySajuPublic } from "../today-saju-detail.js";
import {
  getBranchPairRelations,
  getHwagaeBranch,
  getPeachBlossomBranch,
  getStemPairRelation,
  getYeokmaBranch,
} from "../saju-shinsal.js";
import {
  COMMON_RULES,
  generateJsonCopy,
  kstDateLabel,
  mergeCopy,
  renderPost,
} from "./shared.js";

export const TYPE = "saju";
export const PATH = "/today?tab=saju";
export const HASHTAG = "오늘의사주";
export const CTA = "내 사주에서는 오늘 이 기운이 어떻게 들어올까?";

const ELEMENTS = ["목", "화", "토", "금", "수"];
const BRANCH_ANIMAL = { 子: "쥐", 丑: "소", 寅: "호랑이", 卯: "토끼", 辰: "용", 巳: "뱀", 午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지" };

const STEM_RELATION_LINE = {
  합: "일간과 월간이 합으로 묶여, 흩어지기보다 한곳으로 모이는 결입니다.",
  충: "일간과 월간이 부딪혀, 계획과 실제가 한 번씩 엇갈리기 쉽습니다.",
  동: "일간과 월간이 같은 오행이라, 이달의 흐름과 오늘의 결이 한 방향입니다.",
  생: "일간과 월간이 서로 생하는 사이라, 이달의 흐름이 오늘을 밀어 줍니다.",
  극: "일간과 월간이 서로 극하는 사이라, 이달의 흐름과 오늘의 결이 맞서기 쉽습니다.",
};

// 판정 어휘 — 모델 문장에 이 중 facts 에 없는 것이 섞이면 필드를 버린다.
const VOCABULARY = [
  ...Object.keys(TEN_GOD_LINE),
  "천을귀인", "문창귀인", "역마", "도화", "홍염", "화개", "양인", "공망", "백호", "괴강", "원진", "귀문",
  "육합", "삼합", "상충", "형살", "용신", "격국", "대운",
  ...Object.values(BRANCH_ANIMAL).map((animal) => `${animal}띠`),
  // 간지 이름은 뒤에 일·월·년이 붙을 때만 용어로 본다("갑자기" 같은 일상어를 잡지 않게).
  /(?:갑|을|병|정|무|기|경|신|임|계)(?:자|축|인|묘|진|사|오|미|신|유|술|해)(?:일|월|년)/,
];

function pillarOf(core, key) {
  const { stemIndex, branchIndex } = core[key];
  return {
    stem: STEM_HANJA[stemIndex],
    branch: BRANCH_HANJA[branchIndex],
    ko: `${STEM_HANGUL[stemIndex]}${BRANCH_HANGUL[branchIndex]}`,
  };
}

/** 오늘 지지가 어느 띠들에게 도화·역마·화개 자리인지. 지지마다 셋 중 정확히 하나다. */
function branchStarFor(branch) {
  const table = [
    ["도화", getPeachBlossomBranch],
    ["역마", getYeokmaBranch],
    ["화개", getHwagaeBranch],
  ];
  for (const [name, fn] of table) {
    const refs = Object.keys(BRANCH_ANIMAL).filter((ref) => fn(ref) === branch);
    if (refs.length) return { name, animals: refs.map((ref) => `${BRANCH_ANIMAL[ref]}띠`) };
  }
  return null;
}

/**
 * 순수 계산. 같은 시각이면 언제나 같은 facts 다.
 * @returns {object|null}
 */
export function buildFacts(env, now) {
  const { y, m, d } = getKstDateParts(now);
  // 정오 기준 — getTodayCorePillars·today 허브와 같은 관례(자시 경계에서 하루가 튀지 않게).
  const core = ganji({ year: y, month: m, day: d, hour: 12, minute: 0 });
  if (!core) return null;

  const day = pillarOf(core, "day");
  const month = pillarOf(core, "month");
  const year = pillarOf(core, "year");
  const card = buildTodaySajuPublic({ stem: day.stem, branch: day.branch });
  if (!card) return null;

  const chars = [
    STEM_ELEMENT[year.stem], BRANCH_ELEMENT[year.branch],
    STEM_ELEMENT[month.stem], BRANCH_ELEMENT[month.branch],
    STEM_ELEMENT[day.stem], BRANCH_ELEMENT[day.branch],
  ];
  const tally = Object.fromEntries(ELEMENTS.map((element) => [element, chars.filter((c) => c === element).length]));
  const max = Math.max(...Object.values(tally));
  const zodiac = card.sections.find((section) => section.key === "zodiac");
  const zodiacValue = (label) => zodiac?.items?.find((item) => item.label === label)?.value || "";

  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    dayPillar: { ko: day.ko, hanja: `${day.stem}${day.branch}`, stemElement: STEM_ELEMENT[day.stem], branchElement: BRANCH_ELEMENT[day.branch], animal: BRANCH_ANIMAL[day.branch] },
    monthPillar: { ko: month.ko, hanja: `${month.stem}${month.branch}` },
    yearPillar: { ko: year.ko, hanja: `${year.stem}${year.branch}` },
    mood: card.headline,
    elementTally: tally,
    dominantElements: ELEMENTS.filter((element) => tally[element] === max),
    missingElements: ELEMENTS.filter((element) => tally[element] === 0),
    stemRelation: getStemPairRelation(day.stem, month.stem) || "",
    branchRelations: getBranchPairRelations(day.branch, month.branch),
    branchStar: branchStarFor(day.branch),
    harmonyAnimals: zodiacValue("오늘과 합하는 띠"),
    clashAnimals: zodiacValue("오늘과 충하는 띠"),
  };
}

function allowedTerms(facts) {
  return [
    facts.branchStar?.name,
    ...(facts.branchStar?.animals || []),
    ...facts.harmonyAnimals.split(" · "),
    ...facts.clashAnimals.split(" · "),
    `${facts.dayPillar.ko}일`,
    `${facts.monthPillar.ko}월`,
    `${facts.yearPillar.ko}년`,
    ...facts.branchRelations,
  ];
}

function fallbackCopy(facts) {
  const dominant = facts.dominantElements.join("·");
  const missing = facts.missingElements.length ? ` ${facts.missingElements.join("·")} 기운은 비어 있습니다.` : "";
  return {
    hook: `${facts.dayPillar.ko}일, ${facts.mood}입니다.`,
    body: `세운·월주·일주 여섯 글자 중 ${dominant} 기운이 가장 두텁고,${missing} ${STEM_RELATION_LINE[facts.stemRelation] || ""}`.trim(),
    tip: facts.branchStar && SHINSAL_LINE[facts.branchStar.name] ? `${facts.branchStar.name} — ${SHINSAL_LINE[facts.branchStar.name]}` : "",
  };
}

const SYSTEM_PROMPT = [
  "당신은 30년 넘게 상담해 온 한국의 사주 명리학자다. 자평명리를 따른다.",
  "오늘은 특정인의 명식이 아니라 날짜 자체의 기운(일진·월주·세운)만 다룬다. 개인의 길흉을 말하지 않는다.",
  COMMON_RULES,
].join("\n");

export function buildPrompt(facts) {
  return [
    "facts — 정본 역법 엔진이 계산한 오늘의 사주 사실이다. 값을 바꾸지 말고 문장으로만 옮겨라.",
    JSON.stringify(facts, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "오늘 일진이 어떤 날인지 한 문장. 일진 이름을 넣는다. 50자 이내.",',
    '  "body": "오행 분포(dominantElements·missingElements)와 일간·월간 관계(stemRelation)를 녹인 두 문장. 140자 이내.",',
    '  "tip": "branchStar 를 근거로 오늘 해 볼 만한 행동 하나. 55자 이내."',
    "}",
  ].join("\n");
}

function copyRules(facts) {
  const base = { vocabulary: VOCABULARY, allowed: allowedTerms(facts) };
  return {
    hook: { ...base, min: 10, max: 50 },
    body: { ...base, min: 30, max: 140 },
    tip: { ...base, min: 10, max: 55 },
  };
}

/** @returns {Promise<{copy: Object<string,string>, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl } = {}) {
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl });
  return mergeCopy(generated, copyRules(facts), fallbackCopy(facts));
}

export function format(facts, copy, url) {
  const { dayPillar: dp, elementTally: tally } = facts;
  const tallyLine = Object.entries(tally).filter(([, n]) => n > 0).map(([element, n]) => `${element}${n}`).join(" · ");
  const lines = [
    `🌸 ${facts.dateLabel} 오늘의 사주`,
    copy.hook,
    "",
    `· 일진 ${dp.ko}(${dp.hanja}) — 천간 ${dp.stemElement} · 지지 ${dp.branchElement}(${dp.animal})`,
    `· 오행(${facts.yearPillar.ko}년·${facts.monthPillar.ko}월·${dp.ko}일) ${tallyLine}`,
  ];
  if (facts.branchStar) lines.push(`· ${facts.branchStar.animals.join("·")}에게 오늘은 ${facts.branchStar.name}`);
  const pair = [facts.harmonyAnimals && `합 ${facts.harmonyAnimals}`, facts.clashAnimals && `충 ${facts.clashAnimals}`].filter(Boolean);
  if (pair.length) lines.push(`· ${pair.join(" / ")}`);
  lines.push("", copy.body);
  return renderPost({ head: lines.join("\n"), extra: copy.tip, cta: CTA, url, hashtag: HASHTAG });
}
