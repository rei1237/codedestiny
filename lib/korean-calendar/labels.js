/**
 * 한국 음양력 코어 — 표기(表記) 층.
 *
 * 🔴 **인덱스가 문자열이 되는 유일한 자리다.** 셸은 한자('甲','寅'), 워커·앱은 한글('갑','인')을
 * 쓰는데, 두 축을 섞으면 바로 그 지점에서 엔진이 갈라진다(lib/ziwei-minor-limit.js 머리말).
 * 코어의 다른 파일은 문자열을 만들지도 받지도 않는다.
 */

export const STEM_HANJA = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
export const STEM_HANGUL = Object.freeze(["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]);
export const BRANCH_HANJA = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
export const BRANCH_HANGUL = Object.freeze(["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]);

/** 24절기 이름. 인덱스 0=소한 … 23=동지. 황경 = (285 + 15 × index) mod 360. */
export const TERM_NAME_KO = Object.freeze([
  "소한", "대한", "입춘", "우수", "경칩", "춘분",
  "청명", "곡우", "입하", "소만", "망종", "하지",
  "소서", "대서", "입추", "처서", "백로", "추분",
  "한로", "상강", "입동", "소설", "대설", "동지",
]);

export const TERM_NAME_HANJA = Object.freeze([
  "小寒", "大寒", "立春", "雨水", "驚蟄", "春分",
  "淸明", "穀雨", "立夏", "小滿", "芒種", "夏至",
  "小暑", "大暑", "立秋", "處暑", "白露", "秋分",
  "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
]);

/** 인덱스 쌍 → 기둥 표기. `script` 로 축을 명시한다 — 기본값을 두지 않는 것이 요점이다. */
export function formatPillar(stemIndex, branchIndex, script) {
  if (script === "hanja") return `${STEM_HANJA[stemIndex]}${BRANCH_HANJA[branchIndex]}`;
  if (script === "hangul") return `${STEM_HANGUL[stemIndex]}${BRANCH_HANGUL[branchIndex]}`;
  throw new Error(`formatPillar: script must be "hanja" or "hangul" (got ${String(script)})`);
}

/** 지지 문자(한자·한글 어느 쪽이든) → 인덱스. 못 읽으면 -1. */
export function branchIndexOf(value) {
  const raw = String(value || "").trim();
  const hangul = BRANCH_HANGUL.indexOf(raw);
  return hangul >= 0 ? hangul : BRANCH_HANJA.indexOf(raw);
}

/** 천간 문자(한자·한글 어느 쪽이든) → 인덱스. 못 읽으면 -1. */
export function stemIndexOf(value) {
  const raw = String(value || "").trim();
  const hangul = STEM_HANGUL.indexOf(raw);
  return hangul >= 0 ? hangul : STEM_HANJA.indexOf(raw);
}
