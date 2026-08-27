// 나크샤트라 결정판 — 순수 조립 레이어 (I/O·WASM 비의존)
//
// 이 모듈은 Swiss WASM/네트워크를 import하지 않는다. 달 시데리얼 황경(moonLon)과
// 음력(월/일)을 "입력으로 받아" 동양/인도/통합 3-뷰를 조립하기만 한다. 덕분에
// scripts/verify-nakshatra-flow.mjs 가 고정 입력으로 결정적 검증을 할 수 있다.
// (라우트 worker/routes/nakshatra.js 가 Swiss·음력 I/O를 배선해 이 함수들을 호출한다.)

import {
  GRAHA_KO,
  buildVimshottariDasha,
  nakshatraInfo,
} from "./vedic-derived-calculations.js";
import { buildSukuyoFromLunar } from "./sukuyo-premium.js";
import { judgeDayFortune } from "./sukuyo-relation-core.js";
import {
  clampNakshatraIndex,
  getNakshatraAttributes,
  getPadaDetail,
} from "../../constants/nakshatra-attributes.js";
import {
  crosswalkFromSukuyo,
  judgeCrosswalkMatch,
} from "../../constants/nakshatra-crosswalk.js";
import { getFusionBySukuyo } from "../../constants/nakshatra-fusion.js";

const AYANAMSA_LABEL = "Lahiri";

// ── 타라 발라(Tara Bala): 출생 나크샤트라 대비 일진 나크샤트라의 9구간 길흉 ─────────
const TARA_BALA = [
  { key: "Janma", ko: "잔마(生)", tier: "mixed", desc: "본디 자리 — 몸과 마음을 살피는 날" },
  { key: "Sampat", ko: "삼파트(財)", tier: "auspicious", desc: "풍요와 성취가 도는 날" },
  { key: "Vipat", ko: "비파트(厄)", tier: "caution", desc: "장애·손실에 주의할 날" },
  { key: "Kshema", ko: "크셰마(安)", tier: "auspicious", desc: "안정과 번영의 날" },
  { key: "Pratyari", ko: "프라탸리(敵)", tier: "caution", desc: "마찰·저항이 생기기 쉬운 날" },
  { key: "Sadhaka", ko: "사다카(成)", tier: "auspicious", desc: "일을 이루기 좋은 날" },
  { key: "Vadha", ko: "바다(害)", tier: "great-caution", desc: "큰 결정은 미루는 게 좋은 날" },
  { key: "Mitra", ko: "미트라(友)", tier: "auspicious", desc: "우호와 도움이 오는 날" },
  { key: "Ati-Mitra", ko: "아티미트라(親)", tier: "auspicious", desc: "깊은 인연과 지원의 날" },
];

// 출생 나크샤트라 index → 일진 나크샤트라 index 의 타라 발라.
export function judgeTaraBala(birthNakIndex, dayNakIndex) {
  const b = clampNakshatraIndex(birthNakIndex);
  const d = clampNakshatraIndex(dayNakIndex);
  if (b == null || d == null) return null;
  const count = ((d - b + 27) % 27) + 1; // 1..27
  const taraIndex = (count - 1) % 9; // 0..8
  return { count, taraIndex, ...TARA_BALA[taraIndex] };
}

// ── 뷰 빌더 ──────────────────────────────────────────────────────────────────

// 동양(숙요) 뷰: 기존 숙요 엔진 결과를 그대로 사용(무료 숙요와 동일 엔진).
export function buildDongyangView(suk) {
  if (!suk) return null;
  return {
    index: suk.index,
    nameKo: suk.nameKo,
    nameHan: suk.nameHan,
    direction: suk.direction, // 방위
    sevenLuminary: suk.element, // 칠요(七曜) 배속
    fourSymbol: suk.animalSymbol, // 사신(청룡/현무/백호/주작)
    archetypeTitle: suk.archetypeTitle,
    keywords: suk.keywords || [],
    strengths: suk.strengths || [],
    shadows: suk.shadows || [],
    easternExpert: getFusionBySukuyo(suk.index)?.easternExpert || null, // 숙요 대가 해설
  };
}

// 인도(베다) 뷰: 시데리얼 나크샤트라 + 속성 + 다샤 요약.
export function buildIndiaView(nak, attrs, pada, dashaSummary) {
  if (!nak || !attrs) return null;
  return {
    index: nak.index,
    nameEn: attrs.nameEn,
    nameKo: attrs.nameKo,
    lord: nak.lord,
    lordKo: GRAHA_KO[nak.lord] || nak.lord,
    gana: attrs.gana,
    ganaKo: attrs.ganaKo,
    yoni: attrs.yoni,
    nadi: attrs.nadi,
    nadiKo: attrs.nadiKo,
    deity: attrs.deity,
    deityRole: attrs.deityRole,
    deityKw: attrs.deityKw,
    motive: attrs.motive,
    motiveKo: attrs.motiveKo,
    pada, // 시각 미상 시 null
    padaDetail: getPadaDetail(nak.index, pada), // pada null이면 null
    dasha: dashaSummary,
    indianExpert: attrs.indianExpert || null, // 베다 대가 해설
  };
}

// 통합 뷰: 융합 해석 + 크로스워크 일치/경계일 병기.
export function buildUnifiedView(sukuyoIdx, nakshatraIdx) {
  const fusion = getFusionBySukuyo(sukuyoIdx);
  const match = judgeCrosswalkMatch(sukuyoIdx, nakshatraIdx);
  let boundaryNote = null;
  if (match && match.boundary) {
    const expected = getNakshatraAttributes(match.expectedNakshatraIdx);
    const actual = getNakshatraAttributes(match.nakshatraIdx);
    if (expected && actual) {
      boundaryNote =
        `전통 숙요(음력)가 가리키는 나크샤트라는 ${expected.nameKo}, ` +
        `시데리얼 계산은 ${actual.nameKo}입니다 — 달이 경계에 걸친 날이에요. ` +
        `두 이름 모두 당신의 결에 함께 흐릅니다.`;
    }
  }
  return {
    fusionTitle: fusion ? fusion.fusionTitle : null,
    easternKeywords: fusion ? fusion.easternKeywords : [],
    convergence: fusion ? fusion.convergence : null,
    divergence: fusion ? fusion.divergence : null,
    fusionReading: fusion ? fusion.fusionReading : null,
    crosswalk: match,
    boundaryNote,
  };
}

function summarizeDasha(dasha) {
  if (!dasha || typeof dasha !== "object") return null;
  return {
    currentMahadasha: dasha.currentMahadasha || "",
    currentMahadashaKo: GRAHA_KO[dasha.currentMahadasha] || dasha.currentMahadasha || "",
    currentAntardasha: dasha.currentAntardasha || "",
    currentAntardashaKo: GRAHA_KO[dasha.currentAntardasha] || dasha.currentAntardasha || "",
    current: dasha.current || null,
    birthNakshatra: dasha.birthNakshatra || "",
  };
}

/**
 * 순수 조립: 달 시데리얼 황경 + 음력(월/일) + 옵션으로 3-뷰 객체 생성.
 * 하네스가 이 함수를 고정 입력으로 직접 호출해 검증한다(WASM 불필요).
 */
export function assembleNatalCodex({ moonLon, birthUtc, lunar, timeUnknown = false, now }) {
  const nak = nakshatraInfo(moonLon); // { index, name, pada, lord }
  const attrs = getNakshatraAttributes(nak.index);
  // 시각 미상이면 파다 오차가 과대하므로 산출 금지(스펙 2.2).
  const pada = timeUnknown ? null : nak.pada;

  // 🔴 lunar 는 호출부가 한국 음양력 코어로 만들어 넘긴다(routes/nakshatra.js·nakshatra-ai.js).
  //    라벨은 그 자리에서 명시한다 — 기본값에 기대면 기본값이 바뀔 때 조용히 따라간다.
  const suk = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: Boolean(lunar.isLeap), source: "korean-calendar-core" });

  const dasha = buildVimshottariDasha(moonLon, birthUtc, now || birthUtc);
  const dashaSummary = summarizeDasha(dasha);

  const dongyang = buildDongyangView(suk);
  const india = buildIndiaView(nak, attrs, pada, dashaSummary);
  const unified = buildUnifiedView(suk ? suk.index : null, nak.index);

  const cross = suk ? crosswalkFromSukuyo(suk.index) : null;

  return {
    summary: {
      sukuyoKo: suk ? suk.nameKo : null,
      sukuyoHan: suk ? suk.nameHan : null,
      nakshatraEn: attrs ? attrs.nameEn : null,
      nakshatraKo: attrs ? attrs.nameKo : null,
      fusionTitle: unified.fusionTitle,
      lordKo: india ? india.lordKo : null,
      pada,
      ganaKo: attrs ? attrs.ganaKo : null,
    },
    dongyang,
    india,
    unified,
    transparency: {
      ayanamsa: AYANAMSA_LABEL,
      siderealMoonLongitude: Number.isFinite(moonLon) ? Math.round(moonLon * 1e4) / 1e4 : null,
      pada,
      timeUnknown: Boolean(timeUnknown),
      expectedCrosswalkNakshatraKo: cross ? cross.nakshatraKo : null,
    },
  };
}

function clampNakshatraIndexSafe(value) {
  if (value == null || value === "") return null;
  return clampNakshatraIndex(value);
}

// 오늘의 달: 오늘 달의 나크샤트라/대응 숙요 + (선택)개인 격각·타라발라.
export function assembleTodayMoon({ moonLon, lunar, myMansionIndex = null }) {
  const nak = nakshatraInfo(moonLon);
  const attrs = getNakshatraAttributes(nak.index);
  const todaySuk = lunar
    ? buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: Boolean(lunar.isLeap), source: "korean-calendar-core" })
    : null;
  const cross = crosswalkFromSukuyo(todaySuk ? todaySuk.index : ((nak.index - 13 + 27) % 27));

  let personal = null;
  const myIdx = clampNakshatraIndexSafe(myMansionIndex);
  if (myIdx != null && todaySuk) {
    // 동양: 오늘의 숙이 본명수에게 갖는 격각(judgeDayFortune).
    const dayFortune = judgeDayFortune(myIdx, todaySuk.index);
    // 인도: 본명수의 대응 나크샤트라 대비 오늘 달 나크샤트라의 타라 발라.
    const myNakIdx = (myIdx + 13) % 27;
    const taraBala = judgeTaraBala(myNakIdx, nak.index);
    personal = { myMansionIndex: myIdx, dayFortune, taraBala };
  }

  return {
    todayNakshatra: {
      index: nak.index,
      nameEn: attrs ? attrs.nameEn : null,
      nameKo: attrs ? attrs.nameKo : null,
      lordKo: GRAHA_KO[nak.lord] || nak.lord,
    },
    todaySukuyo: todaySuk
      ? { index: todaySuk.index, nameKo: todaySuk.nameKo, nameHan: todaySuk.nameHan }
      : null,
    crosswalk: cross ? { nakshatraKo: cross.nakshatraKo, sukuyoKo: cross.sukuyoKo } : null,
    personal,
  };
}

export const AYANAMSA = AYANAMSA_LABEL;
