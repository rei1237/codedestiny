// 연애 상담용 일진(日辰) 캘린더.
//
// 왜 있는가: 상담 결과에 "고백하기 좋은 날", "연락하기 좋은 날" 같은 날짜가 들어가는데,
// LLM 에게 날짜를 맡기면 존재하지 않는 간지·근거 없는 길일을 지어낸다. 그래서 날짜와 점수는
// 여기서 결정론적으로 계산하고, LLM 은 계산된 목록을 **해석만** 한다.
// (프롬프트 쪽 INVENTED_DATE 검증이 이 목록을 기준으로 반려한다.)
//
// 간지는 한국 음양력 코어(lib/korean-calendar)가 낸다.
// 90일 산출 실측 14ms / 3.8KB — 요청 예산에 사실상 영향이 없다.

import { formatPillar, ganji } from "../../lib/korean-calendar/index.js";
import {
  ELEMENT_KO,
  branchElementKey,
  getBranchPairRelations,
  getStemPairRelation,
  normalizeBranchChar,
  normalizeElementKey,
  normalizeStemChar,
  stemElementKey,
  stemPolarity,
  toBranchKo,
  toStemKo,
} from "./saju-shinsal.js";

const WEEKDAY_KO = Object.freeze(["일", "월", "화", "수", "목", "금", "토"]);
const DAY_MS = 86400000;
const ELEMENT_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const ELEMENT_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });

const BASE_SCORE = 50;
const SCORE_FLOOR = 5;
const SCORE_CEIL = 95;

/** 일간 기준 십성. saju-gyeokguk.js 의 비공개 구현과 동일한 규칙(오행 관계 + 음양 동이). */
function tenGodOf(dayStem, targetStem) {
  const dayElement = stemElementKey(dayStem);
  const targetElement = stemElementKey(targetStem);
  if (!dayElement || !targetElement) return "";
  const samePolarity = stemPolarity(dayStem) === stemPolarity(targetStem);
  if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
  if (ELEMENT_GENERATES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (ELEMENT_GENERATES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  if (ELEMENT_CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (ELEMENT_CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  return "";
}

function clampScore(value) {
  return Math.max(SCORE_FLOOR, Math.min(SCORE_CEIL, Math.round(value)));
}

function gradeOf(score) {
  if (score >= 72) return "최상";
  if (score >= 60) return "좋음";
  if (score >= 45) return "보통";
  return "주의";
}

function parseYmd(value) {
  const text = String(value == null ? "" : value).trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * 하루의 연애 점수. 순수 함수 — 같은 입력이면 언제나 같은 값(테스트/캐시 결정성 보장).
 *
 * day: { stem, branch }
 * context: { dayStem, dayBranch, natalBranches[], yongshin, gisin, dohwaSet, hongyeomSet, gongmangSet }
 */
export function scoreLoveDay(day = {}, context = {}) {
  const stem = normalizeStemChar(day.stem);
  const branch = normalizeBranchChar(day.branch);
  if (!stem || !branch) return { score: BASE_SCORE, tags: [] };

  const tags = [];
  let score = BASE_SCORE;

  const stemEl = stemElementKey(stem);
  const branchEl = branchElementKey(branch);
  const { yongshin, gisin } = context;

  if (yongshin && (stemEl === yongshin || branchEl === yongshin)) {
    score += 12;
    tags.push(`용신 ${ELEMENT_KO[yongshin]} 기운`);
  }
  if (gisin && (stemEl === gisin || branchEl === gisin)) {
    score -= 12;
    tags.push(`기신 ${ELEMENT_KO[gisin]} 기운`);
  }

  const dayBranchRelations = getBranchPairRelations(branch, context.dayBranch);
  if (dayBranchRelations.includes("육합") || dayBranchRelations.includes("삼합")) {
    score += 10;
    tags.push(dayBranchRelations.includes("육합") ? "일지와 육합" : "일지와 삼합");
  }
  if (dayBranchRelations.includes("충")) {
    score -= 14;
    tags.push("일지와 충");
  }
  if (dayBranchRelations.includes("원진") || dayBranchRelations.includes("귀문")) {
    score -= 6;
    tags.push(dayBranchRelations.includes("원진") ? "일지와 원진" : "일지와 귀문");
  }
  if (dayBranchRelations.includes("형") || dayBranchRelations.includes("파") || dayBranchRelations.includes("해")) {
    score -= 5;
    tags.push("일지와 형·파·해");
  }

  const otherNatal = Array.isArray(context.natalBranches) ? context.natalBranches : [];
  const clashesOther = otherNatal.some((other) => getBranchPairRelations(branch, other).includes("충"));
  if (clashesOther && !dayBranchRelations.includes("충")) {
    score -= 4;
    tags.push("원국 지지와 충");
  }

  if (context.dohwaSet?.has(branch)) {
    score += 8;
    tags.push("도화 지지");
  }
  if (context.hongyeomSet?.has(branch)) {
    score += 8;
    tags.push("홍염 지지");
  }
  if (context.gongmangSet?.has(branch)) {
    score -= 10;
    tags.push("공망 지지");
  }

  const stemRelation = getStemPairRelation(stem, context.dayStem);
  if (stemRelation === "합") {
    score += 6;
    tags.push("일간과 천간합");
  } else if (stemRelation === "충") {
    score -= 6;
    tags.push("일간과 천간충");
  }

  return { score: clampScore(score), tags };
}

/**
 * 오늘부터 days 일간의 일진 캘린더.
 *
 * startDateKst 는 반드시 KST 기준 "YYYY-MM-DD" 문자열이어야 한다(호출부 책임).
 * 여기서 Date.now() 를 읽지 않는 이유: 같은 날 요청이 LLM 캐시 키를 공유해야 하고,
 * 단위 테스트에서 결과가 고정되어야 하기 때문이다.
 */
export function buildLoveDayCalendar({
  dayStem = "",
  dayBranch = "",
  natalBranches = [],
  yongshinElement = "",
  gisinElement = "",
  dohwaBranches = [],
  hongyeomBranch = "",
  gongmangBranches = [],
  startDateKst = "",
  days = 90,
} = {}) {
  const start = parseYmd(startDateKst);
  const total = Math.max(1, Math.min(180, Math.floor(Number(days) || 0) || 90));
  if (!start) {
    return { available: false, reason: "start_date_missing", rangeStart: "", rangeEnd: "", days: [], best: [], caution: [], monthlyFlow: [] };
  }

  const context = {
    dayStem: normalizeStemChar(dayStem),
    dayBranch: normalizeBranchChar(dayBranch),
    natalBranches: (Array.isArray(natalBranches) ? natalBranches : []).map(normalizeBranchChar).filter(Boolean),
    yongshin: normalizeElementKey(yongshinElement),
    gisin: normalizeElementKey(gisinElement),
    dohwaSet: new Set((Array.isArray(dohwaBranches) ? dohwaBranches : []).map(normalizeBranchChar).filter(Boolean)),
    hongyeomSet: new Set([normalizeBranchChar(hongyeomBranch)].filter(Boolean)),
    gongmangSet: new Set((Array.isArray(gongmangBranches) ? gongmangBranches : []).map(normalizeBranchChar).filter(Boolean)),
  };

  // 🔴 일진은 한국 음양력 코어가 낸다. 실측(2026-08-27, 1950~2035 정자시 28,896일)으로
  //    lunar-javascript 의 getDayInGanZhi() 와 **불일치 0** 이라 이 이관으로 움직이는 값은 없다.
  //    그래도 옮기는 이유는 달력이 두 벌이면 다음 사람이 어느 쪽을 고쳐야 할지 모르기 때문이다.
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const rows = [];
  for (let offset = 0; offset < total; offset += 1) {
    const cursor = new Date(startUtc + offset * DAY_MS);
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    const pillars = ganji({ year, month, day, hour: 0, minute: 0 });
    if (!pillars) continue; // 코어 지원 범위(1900~2100) 밖.
    const dayGanji = formatPillar(pillars.day.stemIndex, pillars.day.branchIndex, "hanja");
    const stem = normalizeStemChar(dayGanji.charAt(0));
    const branch = normalizeBranchChar(dayGanji.charAt(1));
    if (!stem || !branch) continue;
    const { score, tags } = scoreLoveDay({ stem, branch }, context);
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    rows.push({
      date,
      weekday: WEEKDAY_KO[cursor.getUTCDay()] || "",
      ganji: `${stem}${branch}`,
      ganjiKo: `${toStemKo(stem)}${toBranchKo(branch)}`,
      stem,
      branch,
      stemTenGod: tenGodOf(context.dayStem, stem),
      branchElement: ELEMENT_KO[branchElementKey(branch)] || "",
      score,
      grade: gradeOf(score),
      tags,
    });
  }

  // 동점은 날짜 오름차순으로 고정한다(결정성).
  const byScoreDesc = [...rows].sort((a, b) => (b.score - a.score) || a.date.localeCompare(b.date));
  const byScoreAsc = [...rows].sort((a, b) => (a.score - b.score) || a.date.localeCompare(b.date));

  const monthBuckets = new Map();
  rows.forEach((row) => {
    const month = row.date.slice(0, 7);
    if (!monthBuckets.has(month)) monthBuckets.set(month, []);
    monthBuckets.get(month).push(row);
  });
  const monthlyFlow = [...monthBuckets.entries()].map(([month, list]) => {
    const sortedDesc = [...list].sort((a, b) => (b.score - a.score) || a.date.localeCompare(b.date));
    const sortedAsc = [...list].sort((a, b) => (a.score - b.score) || a.date.localeCompare(b.date));
    const avg = list.reduce((sum, row) => sum + row.score, 0) / list.length;
    return {
      month,
      monthLabel: `${Number(month.slice(5, 7))}월`,
      dayCount: list.length,
      avgScore: Math.round(avg * 10) / 10,
      grade: gradeOf(avg),
      bestDates: sortedDesc.slice(0, 3).map((row) => ({ date: row.date, ganji: row.ganji, score: row.score })),
      cautionDates: sortedAsc.slice(0, 2).map((row) => ({ date: row.date, ganji: row.ganji, score: row.score })),
    };
  });

  return {
    available: true,
    basis: "한국 음양력 코어 ganji().day (KST 달력일 기준)",
    rangeStart: rows[0]?.date || "",
    rangeEnd: rows[rows.length - 1]?.date || "",
    days: rows,
    best: byScoreDesc.slice(0, 8),
    caution: byScoreAsc.slice(0, 5),
    monthlyFlow,
  };
}

/** KST 기준 오늘 날짜("YYYY-MM-DD"). 캘린더에 넘길 startDateKst 를 만드는 유일한 지점. */
export function todayKstYmd(nowMs = Date.now()) {
  const kst = new Date(Number(nowMs) + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
