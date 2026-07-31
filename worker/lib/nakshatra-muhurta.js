// 나크샤트라 택일(무후르타) (₩5,000) — 결정론 조립 엔진.
//
// 상품의 핵심은 "인도 무후르타 × 동양 숙요 격각의 교집합"이다. 그러려면 두 축이 서로
// 독립이어야 한다 — 🔴 날짜의 나크샤트라를 그날의 숙요에서 크로스워크로 유도하면
// (nakIdx = (sukIdx+13)%27) 타라발라가 격각과 같은 값의 함수가 되어 교집합이 항상 참인
// 가짜가 된다. 그래서 호출부는 날짜마다 **실제 달의 시데리얼 황경**을 넘겨야 한다
// (worker/lib/swiss-ephemeris.js getSwissMoonLongitudes).
//
// 세 층으로 점수를 만든다:
//   1) 동양 개인축 — 본명수 대비 그날 수의 격각(judgeDayFortune, 5티어 / 22~92점)
//   2) 인도 개인축 — 본명 나크샤트라 대비 그날 나크샤트라의 타라발라(judgeTaraBala, 9구간)
//   3) 인도 보편축 — 그날 나크샤트라 자체의 무후르타 적성(아래 표, 목적별로 다름)
//   + 요일(바라) 보정
// 개인축 둘이 서로 다른 천문(음력 룩업 vs 시데리얼 황경)에서 나오므로, 둘이 겹치는 날은
// 근거가 둘인 날이다. 그 겹침을 보여 주는 것이 이 상품이다.

import { judgeDayFortune } from "./sukuyo-relation-core.js";
import { judgeTaraBala } from "./nakshatra-codex.js";
import { getSukuyoByIndex } from "./sukuyo-premium.js";
import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

// ── 나크샤트라 무후르타 분류 7종 (전통 정본) ────────────────────────────────
// 스티라(고정) 4 · 차라(이동) 5 · 므리두(부드러움) 4 · 크시프라(빠름) 3 ·
// 우그라(맹렬) 5 · 티크슈나(예리) 4 · 미슈라(혼합) 2 = 27
const ACTIVITY_CLASS = Object.freeze({
  dhruva: {
    ko: "스티라(고정)",
    gist: "뿌리내리고 오래 가는 일에 맞는 자리",
    detail: "한번 놓으면 잘 움직이지 않는 성질입니다. 오래 지속되기를 바라는 일 — 혼례, 집을 짓거나 사는 일, 나무를 심는 일, 장기 계약 — 에 전통이 가장 먼저 꼽는 자리입니다. 반대로 곧 바꿀 생각이 있는 일을 여기서 시작하면 놓기가 어려워집니다.",
    indices: [3, 11, 20, 25],
  },
  chara: {
    ko: "차라(이동)",
    gist: "움직임과 자리 옮김에 맞는 자리",
    detail: "바람의 성질이라 옮기고 떠나는 일에 힘이 실립니다. 이사, 여행, 차량, 자리 이동, 새 환경으로의 전환. 다만 오래 붙들어야 하는 약속을 여기서 맺으면 자꾸 조건이 바뀝니다.",
    indices: [6, 14, 21, 22, 23],
  },
  mridu: {
    ko: "므리두(부드러움)",
    gist: "결이 고운 일과 사람을 얻는 데 맞는 자리",
    detail: "부드럽고 온화한 성질입니다. 예술과 창작, 옷과 장신구, 친교와 화해, 배움의 시작, 몸을 돌보는 일. 강하게 밀어붙여야 하는 일에는 힘이 모자랍니다.",
    indices: [4, 13, 16, 26],
  },
  kshipra: {
    ko: "크시프라(빠름)",
    gist: "빨리 끝나야 하는 일에 맞는 자리",
    detail: "속도의 자리입니다. 거래와 매매, 계약 체결, 학습과 시험, 의약과 처치, 짧은 여정. 하루 안에 결말이 나야 하는 일에 좋고, 긴 호흡의 일에는 오히려 성급함이 됩니다.",
    indices: [0, 7, 12],
  },
  ugra: {
    ko: "우그라(맹렬)",
    gist: "허물고 밀어내는 일에만 쓰는 자리",
    detail: "거센 성질이라 전통은 이 자리를 새 출발에 쓰지 않습니다. 헐고 정리하고 끊어 내는 일, 강하게 밀어야 하는 담판에는 오히려 힘이 됩니다. 혼례·개업 같은 시작에는 피하는 것이 원칙입니다.",
    indices: [1, 9, 10, 19, 24],
  },
  tikshna: {
    ko: "티크슈나(예리)",
    gist: "잘라 내는 일에 맞는 자리",
    detail: "날카로움의 자리입니다. 분리와 절개 — 수술, 관계의 정리, 오래 끌던 문제를 끊는 결단 — 에는 전통이 오히려 이 자리를 씁니다. 반대로 맺고 이어 가는 일에는 가장 맞지 않습니다.",
    indices: [5, 8, 17, 18],
  },
  mishra: {
    ko: "미슈라(혼합)",
    gist: "성질이 섞여 있어 무난하되 결정적이지 않은 자리",
    detail: "두 성질이 겹쳐 있어 어느 쪽으로도 크게 기울지 않습니다. 일상적인 일과 사무, 준비 작업에는 무난하지만, 인생을 가르는 결정을 굳이 이 자리에 두지는 않습니다.",
    indices: [2, 15],
  },
});

const CLASS_BY_INDEX = (() => {
  const out = new Array(27).fill("mishra");
  for (const [key, value] of Object.entries(ACTIVITY_CLASS)) {
    for (const index of value.indices) out[index] = key;
  }
  return out;
})();

// ── 목적 6종 ────────────────────────────────────────────────────────────────
// classFit: 무후르타 분류별 가점(-30 ~ +30). varaFit: 요일별 가점(-12 ~ +12, 0=일요일).
const PURPOSES = Object.freeze({
  marriage: {
    ko: "결혼·약속",
    lede: "평생 가기를 바라는 약속에는 '고정'의 자리를 씁니다. 오래 머무는 성질의 날에 맺은 약속이 오래 간다는 것이 무후르타의 기본 전제입니다.",
    focus: "혼례, 약혼, 상견례, 평생을 걸 약속",
    classFit: { dhruva: 30, mridu: 18, mishra: 2, kshipra: -2, chara: -14, ugra: -28, tikshna: -30 },
    varaFit: [-4, 10, -10, 8, 12, 10, -12],
    note: "화요일과 토요일은 전통이 혼례에 쓰지 않습니다. 목요일과 금요일이 가장 두터운 자리입니다.",
  },
  business: {
    ko: "개업·창업",
    lede: "가게와 사업은 자리를 잡아야 하므로 '고정'을 먼저 보고, 손님과 돈이 도는 속도가 필요하므로 '빠름'을 함께 봅니다.",
    focus: "개업, 창업, 사업자 등록, 첫 영업일",
    classFit: { dhruva: 28, kshipra: 20, mridu: 10, chara: 0, mishra: 0, ugra: -22, tikshna: -20 },
    varaFit: [2, 6, -6, 12, 12, 8, -12],
    note: "수요일과 목요일이 거래와 확장에 가장 두텁습니다. 토요일 개업은 전통이 꺼립니다.",
  },
  contract: {
    ko: "계약·거래",
    lede: "계약은 그날 안에 매듭이 지어져야 하므로 '빠름'의 자리가 가장 잘 맞습니다. 오래 갈 계약이면 '고정'을 함께 봅니다.",
    focus: "계약 체결, 매매, 투자 집행, 중요한 협상",
    classFit: { kshipra: 30, dhruva: 20, mridu: 8, mishra: 4, chara: -4, ugra: -20, tikshna: -18 },
    varaFit: [0, 6, -10, 12, 10, 6, -8],
    note: "수요일이 문서와 말의 날입니다. 화요일은 다툼이 붙기 쉬워 큰 협상에는 피합니다.",
  },
  moving: {
    ko: "이사·이동",
    lede: "옮기는 일에는 '이동'의 자리를 씁니다. 재미있게도 결혼에 가장 좋은 '고정'의 자리는 이사에는 오히려 무겁습니다 — 떠나기 어려워지는 성질이기 때문입니다.",
    focus: "이사, 이주, 유학·파견 출발, 사무실 이전",
    classFit: { chara: 30, mridu: 16, kshipra: 14, mishra: 2, dhruva: -8, tikshna: -16, ugra: -26 },
    varaFit: [-2, 12, -12, 10, 8, 10, -10],
    note: "월요일과 금요일이 이동에 부드럽습니다. 화요일 이사는 전통이 오래 꺼려 온 자리입니다.",
  },
  newStart: {
    ko: "시작·착수",
    lede: "새로 시작하는 일에는 첫걸음이 가벼워야 하므로 '빠름'을, 흐지부지되지 않으려면 '고정'을 함께 봅니다.",
    focus: "새 일의 착수, 학업·수련 시작, 프로젝트 킥오프, 첫 발표",
    classFit: { kshipra: 28, dhruva: 22, chara: 12, mridu: 10, mishra: 2, tikshna: -18, ugra: -22 },
    varaFit: [8, 4, 4, 10, 12, 4, -12],
    note: "목요일이 시작에 가장 두텁습니다. 토요일 착수는 진행이 무거워지기 쉽습니다.",
  },
  healing: {
    ko: "치유·회복",
    lede: "몸을 돌보는 일에는 '빠름'(의약)과 '부드러움'(회복)을 씁니다. 다만 잘라 내는 처치 — 수술 — 는 예외로 '예리'의 자리를 오히려 좋게 봅니다.",
    focus: "치료 시작, 수술, 요양, 습관 고치기, 마음 돌보기",
    classFit: { kshipra: 30, mridu: 26, tikshna: 10, dhruva: 6, chara: 2, mishra: 0, ugra: -22 },
    varaFit: [2, 10, 0, 12, 10, 6, -6],
    note: "수요일이 의약의 날입니다. 수술이라면 '예리'의 자리가 오히려 맞으니 아래 분류를 함께 보세요.",
  },
});

const TARA_SCORE = Object.freeze({ auspicious: 82, mixed: 54, caution: 34, "great-caution": 16 });
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

const GRADES = [
  { min: 78, key: "best", ko: "최상", mark: "◎" },
  { min: 66, key: "good", ko: "길", mark: "○" },
  { min: 52, key: "fair", ko: "무난", mark: "△" },
  { min: 38, key: "poor", ko: "주의", mark: "▽" },
  { min: -Infinity, key: "avoid", ko: "피함", mark: "✕" },
];

function gradeOf(score) {
  return GRADES.find((grade) => score >= grade.min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nakshatraIndexFromLongitude(longitude) {
  const value = ((Number(longitude) % 360) + 360) % 360;
  return Math.floor(value / (360 / 27)) % 27;
}

function classOf(nakIndex) {
  const key = CLASS_BY_INDEX[nakIndex] || "mishra";
  return { key, ...ACTIVITY_CLASS[key] };
}

function buildDay({ date, weekdayIndex, sukuyoIndex, nakIndex, myMansionIndex, myNakIndex, purpose }) {
  const eastern = judgeDayFortune(myMansionIndex, sukuyoIndex);
  const tara = judgeTaraBala(myNakIndex, nakIndex);
  const activity = classOf(nakIndex);
  const suk = getSukuyoByIndex(sukuyoIndex);
  const attrs = getNakshatraAttributes(nakIndex);

  const easternScore = eastern ? eastern.score : 55;
  const taraScore = tara ? (TARA_SCORE[tara.tier] ?? 54) : 54;
  const classScore = clamp(55 + (purpose.classFit[activity.key] ?? 0), 10, 95);
  const varaScore = clamp(55 + (purpose.varaFit[weekdayIndex] ?? 0), 20, 90);

  const score = Math.round(easternScore * 0.35 + taraScore * 0.30 + classScore * 0.25 + varaScore * 0.10);
  const grade = gradeOf(score);

  // 두 개인축(서로 다른 천문)이 같은 방향을 가리키면 근거가 둘이다 — 이 상품이 파는 것.
  const easternGood = eastern ? ["pivotal", "great-auspicious", "auspicious"].includes(eastern.tier) : false;
  const easternBad = eastern ? ["caution", "great-caution"].includes(eastern.tier) : false;
  const taraGood = tara ? tara.tier === "auspicious" : false;
  const taraBad = tara ? ["caution", "great-caution"].includes(tara.tier) : false;
  const agreement = easternGood && taraGood ? "both-good" : easternBad && taraBad ? "both-bad" : "split";

  return {
    date,
    weekdayKo: WEEKDAY_KO[weekdayIndex],
    sukuyoIndex,
    sukuyoKo: suk ? suk.nameKo : "",
    sukuyoHan: suk ? suk.nameHan : "",
    nakshatraIndex: nakIndex,
    nakshatraKo: attrs ? attrs.nameKo : "",
    activityKey: activity.key,
    activityKo: activity.ko,
    activityGist: activity.gist,
    easternTier: eastern ? eastern.tier : "",
    easternLabel: eastern ? eastern.tierLabel : "",
    easternRole: eastern ? `${eastern.bRole}(${eastern.roleHan})` : "",
    easternAdvice: eastern ? eastern.advice : "",
    taraKo: tara ? tara.ko : "",
    taraTier: tara ? tara.tier : "",
    taraDesc: tara ? tara.desc : "",
    agreement,
    score,
    grade: grade.key,
    gradeKo: grade.ko,
    gradeMark: grade.mark,
  };
}

function reasonFor(day, purpose) {
  const parts = [];
  if (day.agreement === "both-good") {
    parts.push(`동양과 인도가 함께 좋게 봅니다 — 숙요는 ${day.easternRole} 자리로 ${day.easternLabel}, 타라발라는 ${day.taraKo}입니다.`);
  } else if (day.agreement === "both-bad") {
    parts.push(`두 체계가 함께 꺼립니다 — 숙요 ${day.easternLabel}, 타라발라 ${day.taraKo}(${day.taraDesc}).`);
  } else {
    parts.push(`두 체계가 갈립니다 — 숙요는 ${day.easternLabel}, 타라발라는 ${day.taraKo}입니다. 한쪽 근거만 있는 날이라 무리해서 잡을 자리는 아닙니다.`);
  }
  parts.push(`그날 달은 ${day.nakshatraKo}에 머물고, 이 자리는 ${day.activityKo} — ${day.activityGist}입니다. ${purpose.ko}에는 ${(purpose.classFit[day.activityKey] ?? 0) >= 14 ? "잘 맞습니다" : (purpose.classFit[day.activityKey] ?? 0) >= 0 ? "무난합니다" : "맞지 않습니다"}.`);
  return parts.join(" ");
}

function buildGuide(purpose, myAttrs, mySuk, best, avoid, days) {
  const sections = [];

  sections.push({
    id: "howChosen",
    title: "이 날짜들이 어떻게 나왔나",
    icon: "◎",
    keyInsight: "서로 다른 두 천문이 겹치는 날을 골랐습니다",
    paragraphs: [
      `${purpose.lede}`,
      `기준은 세 층입니다. 첫째, 동양 숙요의 격각 — 당신의 본명수 ${mySuk ? `${mySuk.nameKo}(${mySuk.nameHan})` : ""}에 대해 그날의 수가 어떤 자리인지를 봅니다. 둘째, 인도의 타라발라 — 당신이 태어날 때 달이 있던 ${myAttrs ? myAttrs.nameKo : ""}로부터 그날의 달까지를 아홉 구간으로 세어 봅니다. 셋째, 그날 달이 머무는 나크샤트라 자체의 성질이 ${purpose.ko}에 맞는지를 봅니다. 여기에 요일(바라)을 보태 최종 점수를 냅니다.`,
      `🔴 두 개인축은 서로 다른 계산에서 나옵니다 — 숙요는 음력 날짜의 룩업이고, 타라발라는 그날 달의 실제 시데리얼 황경입니다. 그래서 둘이 같은 방향을 가리키는 날은 근거가 둘인 날이고, 갈리는 날은 한쪽 근거만 있는 날입니다. 아래 목록에서 "두 체계가 함께"라고 적힌 날을 먼저 보십시오.`,
      purpose.note,
    ],
  });

  const bothGood = days.filter((day) => day.agreement === "both-good").length;
  sections.push({
    id: "howToUse",
    title: "고른 날을 쓰는 법",
    icon: "✧",
    keyInsight: `살펴본 ${days.length}일 중 두 체계가 함께 좋게 본 날은 ${bothGood}일`,
    paragraphs: [
      `첫째, 최상(◎)이 없다고 실망하지 마십시오. 어떤 기간에는 한 번도 안 나옵니다. 그럴 때는 길(○) 중에서 "두 체계가 함께"인 날을 고르면 충분합니다.`,
      `둘째, 택일은 일을 성사시키는 주문이 아닙니다. 준비가 끝난 일을 언제 꺼낼지 정하는 도구입니다. 좋은 날을 잡느라 준비 기간을 줄이면 순서가 뒤집힙니다.`,
      `셋째, 피할 날(✕)은 금지가 아니라 "다른 날이 있으면 그날로 옮기라"는 뜻입니다. 옮길 수 없는 일정이라면 그날의 주의 항목만 챙기면 됩니다.`,
      `넷째, 시각까지 정해야 하는 전통 무후르타는 그날의 라그나(상승궁)와 호라까지 봅니다. 이 리포트는 날짜 단위이므로, 정해진 날 안에서는 오전의 밝은 시간대를 일반적으로 낫게 봅니다.`,
    ],
  });

  if (avoid.length) {
    sections.push({
      id: "avoidNote",
      title: "피할 날에 대하여",
      icon: "✕",
      keyInsight: avoid.map((day) => `${day.date}(${day.weekdayKo})`).join(" · "),
      paragraphs: [
        `아래 날들은 두 체계 중 하나 이상이 뚜렷하게 꺼내는 자리입니다. 이유는 날마다 다릅니다.`,
        ...avoid.map((day) => `${day.date}(${day.weekdayKo}) — ${reasonFor(day, purpose)}`),
        `다시 말하지만 재앙의 예고가 아닙니다. 같은 일을 하더라도 마찰이 더 생기기 쉬운 날이라는 뜻이고, 대안이 있으면 옮기는 편이 낫다는 정도입니다.`,
      ],
    });
  }

  return sections;
}

function countChars(sections, days) {
  let total = 0;
  for (const section of sections) {
    total += String(section.title || "").length + String(section.keyInsight || "").length;
    for (const paragraph of section.paragraphs || []) total += String(paragraph || "").length;
  }
  for (const day of days) total += String(day.reason || "").length;
  return total;
}

/**
 * 택일(무후르타) 조립.
 *
 * @param {{
 *   purposeKey:string,
 *   myMansionIndex:number, myNakIndex:number,
 *   days: Array<{date:string, weekdayIndex:number, sukuyoIndex:number, moonLongitude:number}>
 * }} input
 * @returns {object|null}
 */
export function buildNakshatraMuhurta({ purposeKey, myMansionIndex, myNakIndex, days }) {
  const purpose = PURPOSES[purposeKey];
  if (!purpose || !Array.isArray(days) || !days.length) return null;
  if (!Number.isInteger(myMansionIndex) || !Number.isInteger(myNakIndex)) return null;

  const scored = days.map((day) => {
    const nakIndex = nakshatraIndexFromLongitude(day.moonLongitude);
    const built = buildDay({
      date: day.date,
      weekdayIndex: Number(day.weekdayIndex),
      sukuyoIndex: Number(day.sukuyoIndex),
      nakIndex,
      myMansionIndex,
      myNakIndex,
      purpose,
    });
    return { ...built, reason: reasonFor(built, purpose) };
  });

  // 동점이면 이른 날짜가 앞 — 정렬이 안정적이어야 결정론이 유지된다.
  const byScore = [...scored].sort((a, b) => (b.score - a.score) || a.date.localeCompare(b.date));
  const best = byScore.filter((day) => day.grade !== "avoid" && day.grade !== "poor").slice(0, 7);
  const avoid = [...scored]
    .sort((a, b) => (a.score - b.score) || a.date.localeCompare(b.date))
    .filter((day) => day.grade === "avoid" || day.grade === "poor")
    .slice(0, 4);

  const myAttrs = getNakshatraAttributes(myNakIndex);
  const mySuk = getSukuyoByIndex(myMansionIndex);
  const sections = buildGuide(purpose, myAttrs, mySuk, best, avoid, scored);

  return {
    meta: {
      purposeKey,
      purposeKo: purpose.ko,
      purposeFocus: purpose.focus,
      myMansionKo: mySuk ? mySuk.nameKo : "",
      myMansionHan: mySuk ? mySuk.nameHan : "",
      myNakshatraKo: myAttrs ? myAttrs.nameKo : "",
      rangeStart: scored[0].date,
      rangeEnd: scored[scored.length - 1].date,
      dayCount: scored.length,
      bothGoodCount: scored.filter((day) => day.agreement === "both-good").length,
    },
    best,
    avoid,
    days: scored,
    sections,
    charCount: countChars(sections, scored),
  };
}

export function listMuhurtaPurposes() {
  return Object.entries(PURPOSES).map(([key, value]) => ({ key, ko: value.ko, focus: value.focus }));
}

export const __nakshatraMuhurtaTestUtils = { ACTIVITY_CLASS, CLASS_BY_INDEX, PURPOSES, GRADES, nakshatraIndexFromLongitude };
