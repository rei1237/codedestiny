// 명식 래퍼 — 검증된 worker/lib/destiny-bias-engine.js buildSajuProfile 을 그대로 쓰고
// 연·월·일주만 꺼낸다. 시주는 양쪽 모두 절대 포함하지 않는다(최애 출생 시간 비공개 → 대칭 비교).
// 한자 간지를 relations.js 가 쓰는 한글로 바꿔 돌려준다.
import { buildSajuProfile } from "../../../worker/lib/destiny-bias-engine.js";
import { BRANCH_ELEMENT, STEM_ELEMENT, STEM_POLARITY } from "./relations.js";

const STEM_HANJA_TO_KO = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});
const BRANCH_HANJA_TO_KO = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});
const STEM_KO_SET = new Set(Object.values(STEM_HANJA_TO_KO));
const BRANCH_KO_SET = new Set(Object.values(BRANCH_HANJA_TO_KO));
const ELEMENTS = Object.freeze(["wood", "fire", "earth", "metal", "water"]);

export function stemToKo(value) {
  const ch = String(value || "").trim().charAt(0);
  if (STEM_HANJA_TO_KO[ch]) return STEM_HANJA_TO_KO[ch];
  return STEM_KO_SET.has(ch) ? ch : "";
}
export function branchToKo(value) {
  const ch = String(value || "").trim().charAt(0);
  if (BRANCH_HANJA_TO_KO[ch]) return BRANCH_HANJA_TO_KO[ch];
  return BRANCH_KO_SET.has(ch) ? ch : "";
}

function toPillar(raw) {
  const stem = stemToKo(raw && raw.stem);
  const branch = branchToKo(raw && raw.branch);
  if (!stem || !branch) throw new Error("IDOL_CHEMI_PILLAR_INVALID");
  return Object.freeze({
    stem,
    branch,
    ganji: stem + branch,
    ganjiHanja: String((raw && raw.ganji) || ""),
    stemElement: STEM_ELEMENT[stem],
    branchElement: BRANCH_ELEMENT[branch],
  });
}

function countElements(pillars) {
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const p of pillars) {
    counts[p.stemElement] += 1;
    counts[p.branchElement] += 1;
  }
  return counts;
}

function normalizeCalendarType(value) {
  const key = String(value || "solar").trim().toLowerCase();
  if (key === "lunar_leap" || key === "lunar-leap") return "lunar_leap";
  if (key === "lunar") return "lunar";
  return "solar";
}

export const BIRTH_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/**
 * 연·월·일주 3주만 계산한다. 시간 입력은 받아도 버린다(대칭 비교 원칙).
 * @param {{birthDate:string, calendarType?:string, isLeapMonth?:boolean}} birth
 */
export function buildChemiPillars(birth) {
  const birthDate = String((birth && birth.birthDate) || "").trim();
  if (!BIRTH_DATE_PATTERN.test(birthDate)) throw new Error("IDOL_CHEMI_BIRTH_DATE_INVALID");
  const calendarType = normalizeCalendarType(birth && birth.calendarType);
  const profile = buildSajuProfile({
    name: "",
    gender: "unknown",
    birth: {
      birthDate,
      calendarType,
      isLeapMonth: calendarType === "lunar_leap" || Boolean(birth && birth.isLeapMonth),
      birthTimeKnown: false,
    },
  });
  const pillars = (profile && profile.pillars) || {};
  const year = toPillar(pillars.year);
  const month = toPillar(pillars.month);
  const day = toPillar(pillars.day);
  const elementCounts = countElements([year, month, day]);
  const sorted = ELEMENTS.slice().sort((a, b) => (elementCounts[b] - elementCounts[a]) || (ELEMENTS.indexOf(a) - ELEMENTS.indexOf(b)));
  const lacking = ELEMENTS.filter((el) => elementCounts[el] === 0);
  return Object.freeze({
    year,
    month,
    day,
    dayStemElement: day.stemElement,
    yinYang: STEM_POLARITY[day.stem],
    elementCounts: Object.freeze(elementCounts),
    strongest: sorted[0],
    weakest: sorted[sorted.length - 1],
    lacking: Object.freeze(lacking),
    // 개인정보 최소화: 날짜 원문은 결과에 싣지 않는다. 달력 정규화 결과만 내부 해시용으로 노출.
    solarDate: String((profile && profile.calendar && profile.calendar.solarDate) || ""),
    includeHour: false,
  });
}
