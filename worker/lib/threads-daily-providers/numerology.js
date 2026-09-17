// Threads 🔢 오늘의 수비학 — 20:30 KST.
//
// 공개 계정 글이라 특정인의 개인일수가 아니라 날짜만으로 모두에게 같은 보편일수(Universal Day)를 쓴다.
// 개인일수는 링크(/today?tab=number)에서 생년월일로 본다. 계산은 lib/numerology/personal-day.mjs 정본,
// 수의 성격 문장은 today 허브 수비학 카드와 같은 NUMBER_VOICES(numerology-tarot-synthesis.mjs)라
// 글과 사이트가 같은 날 같은 수를 다른 뜻으로 말하지 않는다.
// 🔴 타로는 실제 사용자가 뽑은 카드가 없어 자동 발행하지 않는다 — 카드 이름·타로는 금지어다.

import { calculateUniversalNumbers, isMasterNumber } from "../../../lib/numerology/personal-day.mjs";
import { getNumberVoice } from "../../../lib/tarot/numerology-tarot-synthesis.mjs";
import { getKstDateParts } from "../daily-fortune-task.js";
import { withJosa } from "../pet/pet-elements.js";
import {
  COMMON_RULES,
  generateJsonCopy,
  kstDateLabel,
  mergeCopy,
  renderPost,
} from "./shared.js";

export const TYPE = "numerology";
export const PATH = "/today?tab=number";
export const HASHTAG = "수비학";
export const CTA = "내 생일로 계산한 오늘의 Personal Day 숫자는?";

const digitSum = (value) => String(value).split("").reduce((sum, digit) => sum + Number(digit), 0);

// "27 → 9". 마스터 넘버에서 멈추면 거기까지만.
function reductionTrail(sum) {
  const steps = [sum];
  while (steps[steps.length - 1] > 9 && !isMasterNumber(steps[steps.length - 1])) {
    steps.push(digitSum(steps[steps.length - 1]));
  }
  return steps.join(" → ");
}

/** @returns {object|null} 날짜 형식이 틀리면 null */
export function buildFacts(_env, now) {
  const { y, m, d } = getKstDateParts(now);
  const numbers = calculateUniversalNumbers({ year: y, month: m, day: d });
  if (!numbers) return null;
  const { universalYear, universalMonth, universalDay } = numbers;
  const voice = getNumberVoice(universalDay);
  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    basis: "양력 날짜 기준",
    date: { year: y, month: m, day: d },
    universalYear,
    universalMonth,
    universalDay,
    master: isMasterNumber(universalDay),
    calculation: `${y} → ${reductionTrail(digitSum(y))}, ${universalYear} + ${m} + ${d} = ${reductionTrail(universalYear + m + d)}`,
    voice: { keyword: voice.keyword, core: voice.core, light: voice.light, shadow: voice.shadow, arena: voice.arena, act: voice.act },
  };
}

// 보편일수 글에 개인 수·다른 수비학 수치를 지어 넣으면 계산에 없는 말이 된다.
const FORBIDDEN = ["개인일수", "개인월수", "개인년수", "라이프 패스", "라이프패스", "생명수", "운명수", "영혼수", "타로", "카드"];

/** 문장 안의 숫자는 그날 facts 의 수(날짜·연도수·이달의 수·보편일수·계산 중간합)만 허용한다. */
function allowedNumbers(facts) {
  const { date, universalYear, universalMonth, universalDay } = facts;
  const sums = [digitSum(date.year), universalYear + date.month, universalYear + date.month + date.day];
  const trail = sums.flatMap((sum) => reductionTrail(sum).split(" → ").map(Number));
  return new Set([date.year, date.month, date.day, universalYear, universalMonth, universalDay, ...trail].map(String));
}

function numbersSupported(facts) {
  const allowed = allowedNumbers(facts);
  return (text) => {
    if (!facts.master && text.includes("마스터")) return false;
    return (text.match(/\d+/g) || []).every((digits) => allowed.has(String(Number(digits))));
  };
}

function fallbackCopy(facts) {
  const { universalDay, voice } = facts;
  return {
    hook: `오늘 날짜를 더한 수는 ${universalDay}, ${voice.keyword}의 수입니다.`,
    body: `${withJosa(voice.core, "이", "가")} 앞에 서는 날입니다. 오늘은 ${voice.arena}에 무게를 두세요.`,
    tip: voice.act,
  };
}

const SYSTEM_PROMPT = [
  "당신은 30년 넘게 상담해 온 수비학(numerology) 전문가다. 피타고라스식 날짜 수 해석에 밝다.",
  "오늘은 특정인의 생일이 아니라 오늘 날짜만으로 정해지는 보편일수(Universal Day)만 다룬다. 개인일수·라이프 패스·타로를 말하지 않는다.",
  COMMON_RULES,
].join("\n");

export function buildPrompt(facts) {
  return [
    "facts — 오늘 양력 날짜의 자릿수를 더해 축약한 수와 그 수의 성격이다. 값을 바꾸지 말고 문장으로만 옮겨라.",
    JSON.stringify(facts, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "보편일수 universalDay 로 오늘이 어떤 날인지 한 문장. 그 숫자를 넣는다. 45자 이내.",',
    '  "body": "voice.core·light·shadow 를 녹여 오늘 살릴 결과 경계할 결을 말하는 두 문장. facts 에 없는 숫자를 쓰지 않는다. 110자 이내.",',
    '  "tip": "voice.act·arena 를 근거로 오늘 해 볼 만한 행동 하나. 50자 이내."',
    "}",
  ].join("\n");
}

function copyRules(facts) {
  const base = { forbidden: FORBIDDEN, validate: numbersSupported(facts) };
  return {
    hook: { ...base, min: 10, max: 45 },
    body: { ...base, min: 30, max: 110 },
    tip: { ...base, min: 10, max: 50 },
  };
}

/** @returns {Promise<{copy: Object<string,string>, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl } = {}) {
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl });
  return mergeCopy(generated, copyRules(facts), fallbackCopy(facts));
}

export function format(facts, copy, url) {
  const { universalDay, universalMonth, universalYear, voice } = facts;
  const lines = [
    `🔢 ${facts.dateLabel} 오늘의 수비학 · ${facts.basis}`,
    copy.hook,
    "",
    `· 보편일수(Universal Day) ${universalDay}${facts.master ? "(마스터 넘버)" : ""} · ${voice.keyword}`,
    `· 계산 ${facts.calculation}`,
    `· 이달의 수 ${universalMonth} · 올해의 수 ${universalYear}`,
    "",
    copy.body,
  ];
  return renderPost({ head: lines.join("\n"), extra: copy.tip, cta: CTA, url, hashtag: HASHTAG });
}
