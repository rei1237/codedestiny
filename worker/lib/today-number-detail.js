// /today 수비학 탭 카드 — 날짜 수는 lib/numerology/personal-day.mjs(정본 계산), 수의 성격 문장은
// 수비학 타로가 쓰는 lib/tarot/numerology-tarot-synthesis.mjs 의 NUMBER_VOICES 를 그대로 쓴다.
// 새 해설 풀을 만들지 않는다 — 같은 수가 타로 상담과 오늘 탭에서 다른 뜻으로 읽히면 안 된다.
//
// 수비학에는 길일·흉일이 없다. 그래서 tier·score 는 늘 null 이고 화면은 "오늘 하루의 흐름" 배지를 쓴다.

import { calculatePersonalNumbers, calculateUniversalNumbers, isMasterNumber } from "../../lib/numerology/personal-day.mjs";
import { getNumberVoice } from "../../lib/tarot/numerology-tarot-synthesis.mjs";
import { withJosa } from "./pet/pet-elements.js";

function numberLabel(value) {
  return isMasterNumber(value) ? `${value}(마스터 넘버)` : String(value);
}

// "27 → 9", 이미 한 자리면 그대로. 마스터 넘버에서 멈춘 경우도 화살표로 보인다.
function reductionTrail(sum) {
  const steps = [sum];
  while (steps[steps.length - 1] > 9 && !isMasterNumber(steps[steps.length - 1])) {
    steps.push(String(steps[steps.length - 1]).split("").reduce((acc, digit) => acc + Number(digit), 0));
  }
  return steps.join(" → ");
}

function voiceLines(value) {
  const voice = getNumberVoice(value);
  return [
    `${withJosa(voice.light, "을", "를")} 살리기 좋은 날입니다.`,
    `${withJosa(voice.shadow, "은", "는")} 경계하세요.`,
    `스스로에게 물어볼 것: ${voice.ask}?`,
  ];
}

/** 생년 없이 날짜만으로 참인 카드. */
export function buildTodayNumberPublic(today) {
  const numbers = calculateUniversalNumbers(today);
  if (!numbers) return null;
  const { universalYear, universalMonth, universalDay } = numbers;
  const voice = getNumberVoice(universalDay);
  const monthSum = universalYear + today.month;
  const daySum = monthSum + today.day;
  return {
    anchor: `보편일수(Universal Day) · ${numberLabel(universalDay)}`,
    headline: `날짜의 수 ${universalDay} — ${voice.arena}에 힘이 실리는 날`,
    body: `오늘 날짜를 더한 수는 ${universalDay}, ${voice.keyword}의 수입니다. ${voice.act}`,
    highlights: [`보편일수 ${universalDay} · ${voice.keyword}`, `이달의 수 ${universalMonth}`, `올해의 수 ${universalYear}`],
    sections: [
      {
        key: "method",
        title: "계산",
        items: [
          { label: "올해의 수", value: `${today.year} → ${reductionTrail(String(today.year).split("").reduce((acc, digit) => acc + Number(digit), 0))}`, note: "연도의 자릿수를 한 자리가 될 때까지 더합니다." },
          { label: "이달의 수", value: `${universalYear} + ${today.month} = ${reductionTrail(monthSum)}` },
          { label: "보편일수", value: `${universalYear} + ${today.month} + ${today.day} = ${reductionTrail(daySum)}`, note: "11·22·33 이 나오면 더 줄이지 않습니다." },
        ],
      },
      { key: "flow", title: `${universalDay}의 결`, lines: [`${voice.core}.`, ...voiceLines(universalDay)] },
    ],
  };
}

/**
 * 양력 생월·생일이 있을 때의 개인 카드. 형식이 틀리면 null.
 * @param {{month:number, day:number}} birth 양력
 */
export function buildTodayNumberDetail(birth, today) {
  const numbers = calculatePersonalNumbers(birth, today);
  if (!numbers) return null;
  const { universalYear, universalDay, personalYear, personalMonth, personalDay } = numbers;
  const voice = getNumberVoice(personalDay);
  const base = birth.month + birth.day + universalYear;
  return {
    anchor: `개인일수(Personal Day) · ${numberLabel(personalDay)}`,
    headline: `오늘 내 수는 ${personalDay} — ${voice.arena}에 힘이 실리는 날`,
    body: `${withJosa(voice.core, "이", "가")} 오늘 앞에 섭니다. ${voice.act}`,
    detail: `개인년수 ${personalYear} · 개인월수 ${personalMonth} · 보편일수 ${universalDay}`,
    highlights: [`개인일수 ${personalDay} · ${voice.keyword}`, `개인월수 ${personalMonth}`, `개인년수 ${personalYear}`],
    sections: [
      {
        key: "method",
        title: "계산",
        items: [
          { label: "개인년수", value: `${birth.month} + ${birth.day} + 올해의 수 ${universalYear} = ${reductionTrail(base)}`, note: "태어난 달과 날, 올해의 수를 더합니다." },
          { label: "개인월수", value: `${base} + ${today.month} = ${reductionTrail(base + today.month)}` },
          { label: "개인일수", value: `${base + today.month} + ${today.day} = ${reductionTrail(base + today.month + today.day)}`, note: "11·22·33 이 나오면 더 줄이지 않습니다." },
        ],
      },
      { key: "flow", title: `오늘의 결 · ${personalDay}`, lines: [`${voice.core}.`, ...voiceLines(personalDay)] },
      {
        key: "cycle",
        title: "이달과 올해",
        items: [
          { label: `개인월수 ${personalMonth}`, value: getNumberVoice(personalMonth).arena, note: `${getNumberVoice(personalMonth).core}.` },
          { label: `개인년수 ${personalYear}`, value: getNumberVoice(personalYear).arena, note: `${getNumberVoice(personalYear).core}.` },
        ],
      },
    ],
  };
}
