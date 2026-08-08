import { calculateLifeBookAiSaju } from "./life-book-ai-saju.js";

// 한자 간지 → 한글 변환 (발송 템플릿이 기대하는 한글 표기와 정합)
const STEM_CN = "甲乙丙丁戊己庚辛壬癸";
const STEM_KR = "갑을병정무기경신임계";
const BRANCH_CN = "子丑寅卯辰巳午未申酉戌亥";
const BRANCH_KR = "자축인묘진사오미신유술해";

// 오행 한글 키 → 발송 템플릿의 영문 키(natal.elements.{wood,...})
const ELEMENT_KR_TO_EN = { "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water" };

export function toKrStem(ch) {
  const idx = STEM_CN.indexOf(ch);
  return idx >= 0 ? STEM_KR[idx] : String(ch || "");
}

export function toKrBranch(ch) {
  const idx = BRANCH_CN.indexOf(ch);
  return idx >= 0 ? BRANCH_KR[idx] : String(ch || "");
}

// "甲子"(또는 이미 한글 "갑자")를 {g, j}(한글)로 분리
function splitPillar(pillar) {
  const text = String(pillar || "").trim();
  if (text.length < 2) return { g: "", j: "" };
  return { g: toKrStem(text[0]), j: toKrBranch(text[1]) };
}

function mapElementsToEnglish(fiveElements) {
  const out = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (!fiveElements || typeof fiveElements !== "object") return out;
  for (const [kr, value] of Object.entries(fiveElements)) {
    const key = ELEMENT_KR_TO_EN[kr];
    if (key) out[key] = Number(value) || 0;
  }
  return out;
}

function pickMinElement(fiveElements) {
  const entries = Object.entries(fiveElements || {}).sort((a, b) => Number(a[1]) - Number(b[1]));
  return entries[0]?.[0] || "";
}

function pickMaxElement(fiveElements) {
  const entries = Object.entries(fiveElements || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  return entries[0]?.[0] || "";
}

/**
 * 생년정보로 사주를 계산해, 일일 운세 발송 템플릿(worker/lib/daily-fortune-task.js)이
 * 요구하는 sajuSnapshot 형태로 변환한다. 계산 불가(무효 생년월일 등)이면 null 반환.
 *
 * @param {{birthDate?:string, birthTime?:string, calendarType?:string, gender?:string, birthTimeUnknown?:boolean}} birthInfo
 * @returns {object|null} normalizeSajuSnapshot 통과 형태(pillars.d.g/.j 포함) 또는 null
 */
export function buildSajuSnapshotFromBirth(birthInfo = {}) {
  try {
    const birthDate = String(birthInfo.birthDate || "").trim();
    if (!birthDate) return null;

    const result = calculateLifeBookAiSaju({
      birthDate,
      birthTime: birthInfo.birthTime,
      birthTimeUnknown: birthInfo.birthTimeUnknown === true || !String(birthInfo.birthTime || "").trim(),
      calendarType: birthInfo.calendarType,
      gender: birthInfo.gender,
    });

    const d = splitPillar(result.dayPillar);
    if (!d.g || !d.j) return null;

    const pillars = {
      y: splitPillar(result.yearPillar),
      m: splitPillar(result.monthPillar),
      d,
      h: result.hourPillar ? splitPillar(result.hourPillar) : { g: "", j: "" },
    };

    // 발송 템플릿의 formatElementName은 영문 키(wood→"목(木)")를 라벨로 변환하므로 영문 키로 전달
    const yongshin = ELEMENT_KR_TO_EN[pickMinElement(result.fiveElements)] || "";
    const kijishin = ELEMENT_KR_TO_EN[pickMaxElement(result.fiveElements)] || "";

    return {
      pillars,
      natal: { elements: mapElementsToEnglish(result.fiveElements) },
      power: {
        yongshin: yongshin ? [yongshin] : [],
        kijishin: kijishin ? [kijishin] : [],
      },
      johu: { type: String(result.strength || "").trim() || "기운 조율" },
    };
  } catch (_) {
    return null;
  }
}
