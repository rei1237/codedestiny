// 명식 코어는 life-book-ai-saju 를 쓴다(destiny-bias-engine 의 buildSajuProfile 에서 교체).
// 이유: 연애 상담이 요구하는 대운 10주기·세운 5년·지장간·합충형파해·삼합/방합이 그쪽에만 있고,
// 기존 코어는 그중 무엇도 상담 데이터로 내보내지 않았다(대운은 계산하고도 버렸다).
//
// 🔴 시주 시각 보정·일자 변경 정책은 destiny-bias-engine 이 정본이고 여기서도 그대로 쓴다.
// 코어만 바꾸고 이 정책을 빠뜨리면 23:00~01:00 출생자의 시주가 조용히 달라진다.
// 기본값도 그 엔진과 동일하게 맞춘다 — 진태양시 보정 적용 + 일자 변경은 자정 기준.
import {
  DAY_CHANGE_POLICIES,
  DEFAULT_LOCATION,
  HOUR_PILLAR_TIME_POLICIES,
  applyHourPillarTimeCorrection,
  getHourBranchByClock,
  getHourStemByDayStem,
} from "./destiny-bias-engine.js";
import { buildSajuAdvancedFactors } from "./saju-ai-prompt.js";
import { buildLoveSecretReference } from "./love-secret-reference.js";
import { calculateLifeBookAiSaju } from "./life-book-ai-saju.js";
import { buildSajuLoveCompatibility } from "./master-love-codex-compat.js";
import { buildLoveDayCalendar, todayKstYmd } from "./love-secret-ai-calendar.js";
import {
  ELEMENT_KO,
  buildLoveShinsal,
  getBranchPairRelations,
  getHongyeomBranch,
  getPeachBlossomBranch,
  getStemPairRelation,
  normalizeBranchChar,
  normalizeStemChar,
  scoreShinsalIntensity,
  toBranchKo,
  toStemKo,
} from "./saju-shinsal.js";
import { getTwelveLifeStage } from "./saju-gyeokguk.js";

export const LOVE_SECRET_AI_SAJU_VERSION = "love-secret-ai-saju-v2";

export const LOVE_SECRET_RELATIONSHIP_STATUSES = Object.freeze([
  "솔로",
  "짝사랑",
  "썸",
  "연애 중",
  "장기 연애",
  "이별 직후",
  "재회 고민",
  "연락이 끊긴 상태",
  "결혼 고민",
  "부부 관계",
  "관계 정리 고민",
  "상대방 마음이 궁금한 상태",
]);

export const LOVE_SECRET_TOPICS = Object.freeze([
  "전체 연애 흐름",
  "현재 관계가 어디로 흘러갈지",
  "상대방 마음",
  "상대의 마음과 거리감",
  "연락 타이밍",
  "고백 타이밍",
  "연락/고백/대화 타이밍",
  "재회 가능성",
  "관계 회복 전략",
  "장기 연애 유지법",
  "결혼 가능성",
  "결혼/장기 관계 가능성",
  "갈등 원인",
  "나의 연애 패턴",
  "내가 바꿔야 할 연애 패턴",
  "상대방과의 궁합",
  "속궁합과 친밀감 리듬",
  "지금 밀어야 할지 기다려야 할지",
  "이 관계를 계속해도 되는지",
  "직접 입력",
]);

const ELEMENT_LABELS = Object.freeze({
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
});

const GENERATE_TO = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

const CONTROL_TO = Object.freeze({
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
});

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  if (["unknown", "none", "비공개"].includes(text)) return "unknown";
  if (["other", "기타"].includes(text)) return "other";
  return text || "";
}

function normalizeCalendarType(value, fallback = "solar") {
  const text = clean(value, 20).toLowerCase();
  if (text === "lunar" || text === "음력") return "lunar";
  if (text === "solar" || text === "양력") return "solar";
  return fallback;
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseBirthDate(value) {
  const birthDate = clean(value, 10);
  if (!isValidDateKey(birthDate)) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  if (year < 1900 || year > 2100) return null;
  return { birthDate, year, month, day };
}

function normalizeBirthTime(value) {
  const text = clean(value, 5);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : "";
}

function splitBirthTime(value) {
  const birthTime = normalizeBirthTime(value);
  if (!birthTime) return { hour: 12, minute: 0, birthTime: "" };
  const [hour, minute] = birthTime.split(":").map(Number);
  return { hour, minute, birthTime };
}

function normalizePersonInfo(value = {}, options = {}) {
  const source = value && typeof value === "object" ? value : {};
  const birth = parseBirthDate(source.birthDate);
  const birthTimeUnknown = toBoolean(source.birthTimeUnknown) || !clean(source.birthTime);
  const time = splitBirthTime(source.birthTime);
  const normalized = {
    name: clean(source.name || source.nickname, 80),
    gender: normalizeGender(source.gender),
    birthDate: birth?.birthDate || "",
    birthTime: birthTimeUnknown ? "" : time.birthTime,
    birthTimeUnknown,
    calendarType: normalizeCalendarType(source.calendarType, options.defaultCalendarType || "solar"),
  };
  return { ...normalized, birth };
}

function hasPartnerSignal(source = {}) {
  if (!source || typeof source !== "object") return false;
  return Boolean(
    clean(source.name || source.nickname)
      || clean(source.gender)
      || clean(source.birthDate)
      || clean(source.birthTime)
      || clean(source.calendarType),
  );
}

/**
 * 시주 시각 보정. destiny-bias-engine 의 기본 정책(평균태양시 + 자정 기준 일자 변경)과 같다.
 *
 * 시지는 보정된 시각에서, 시간은 일간에서 도출한다 — 그 엔진의 산출 순서 그대로다.
 * 보정이 자정을 넘겨도(dayOffset ≠ 0) 일주는 건드리지 않는다. 야자시로 일자를 넘기는 것은
 * DAY_CHANGE_POLICIES.LATE_ZI_NEXT_DAY 이며, 이 서비스의 기본값은 MIDNIGHT 이다.
 */
function resolveCorrectedHourPillar(info, dayStem) {
  if (info.birthTimeUnknown || !info.birth) return null;
  const time = splitBirthTime(info.birthTime);
  if (!time.birthTime) return null;

  const correction = applyHourPillarTimeCorrection(
    { year: info.birth.year, month: info.birth.month, day: info.birth.day, hour: time.hour, minute: time.minute },
    DEFAULT_LOCATION,
    HOUR_PILLAR_TIME_POLICIES.LOCAL_MEAN_TIME,
  );
  const branch = getHourBranchByClock(correction.correctedHour);
  const stem = getHourStemByDayStem(clean(dayStem, 4), branch);
  if (!stem || !branch) return null;

  return {
    pillar: `${stem}${branch}`,
    correction: {
      policy: HOUR_PILLAR_TIME_POLICIES.LOCAL_MEAN_TIME,
      dayChangePolicy: DAY_CHANGE_POLICIES.MIDNIGHT,
      clockTime: time.birthTime,
      correctedTime: `${String(correction.correctedHour).padStart(2, "0")}:${String(correction.correctedMinute).padStart(2, "0")}`,
      longitudeCorrectionMinutes: Math.round(correction.longitudeCorrectionMinutes * 100) / 100,
      dayOffset: correction.dayOffset,
    },
  };
}

function buildLifeBookInput(info, hourPillarOverride = "") {
  return {
    birthDate: info.birthDate,
    birthTime: info.birthTimeUnknown ? "" : info.birthTime,
    birthTimeUnknown: info.birthTimeUnknown,
    calendarType: info.calendarType,
    gender: normalizeGender(info.gender),
    hourPillarOverride,
  };
}

/**
 * 명식 1인분. 시주 보정은 일간이 있어야 계산되므로 두 단계로 돈다 —
 * 1차로 일주를 얻고, 보정된 시주를 넣어 2차로 전체를 다시 세운다.
 * 보정 결과가 원래 시주와 같으면 2차 호출을 건너뛴다(대부분의 시각이 여기에 해당).
 */
function calculateChartWithHourCorrection(info) {
  const base = calculateLifeBookAiSaju(buildLifeBookInput(info));
  const corrected = resolveCorrectedHourPillar(info, base.dayMaster);
  if (!corrected || corrected.pillar === clean(base.hourPillar, 10)) {
    return { saju: base, hourCorrection: corrected?.correction || null };
  }
  const adjusted = calculateLifeBookAiSaju(buildLifeBookInput(info, corrected.pillar));
  return { saju: adjusted, hourCorrection: corrected.correction };
}

function distributionFromCounts(source = {}) {
  const counts = source?.counts && typeof source.counts === "object" ? source.counts : source;
  return Object.fromEntries(
    Object.entries(counts || {})
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Math.round(Number(value) * 100) / 100]),
  );
}

const ELEMENT_KEY_BY_KO = Object.freeze({ 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" });

/** life-book 은 오행을 한글 키로 센다. 내부 계산(용신/궁합)은 영문 키를 쓰므로 경계에서 변환한다. */
function elementKeyFromKo(value) {
  const text = clean(value);
  if (ELEMENT_KEY_BY_KO[text]) return ELEMENT_KEY_BY_KO[text];
  return ["wood", "fire", "earth", "metal", "water"].includes(text) ? text : "";
}

/**
 * 오행 분포. life-book 의 buildElementDistribution 은 천간·지지 본기만 세므로
 * 지장간을 0.35 가중(그 파일의 십성 집계와 같은 관례)으로 더해 정밀도를 맞춘다.
 * 키는 한글("목"…) — 화면에 그대로 렌더되기 때문이다.
 */
function buildElementCounts(saju = {}) {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  Object.entries(saju.fiveElements || {}).forEach(([key, value]) => {
    if (counts[key] !== undefined) counts[key] = Number(value) || 0;
  });
  ["year", "month", "day", "hour"].forEach((key) => {
    (saju.pillarDetails?.[key]?.hiddenStems || []).forEach((hidden) => {
      const element = clean(hidden?.element);
      if (counts[element] !== undefined) counts[element] = Number((counts[element] + 0.35).toFixed(2));
    });
  });
  return counts;
}

/** love-secret-reference 의 normalizeCounts(:105)는 영문 키만 읽는다. 경계에서 변환. */
function toEnglishElementCounts(koCounts = {}) {
  return Object.fromEntries(
    Object.entries(koCounts).map(([ko, value]) => [ELEMENT_KEY_BY_KO[ko] || ko, Number(value) || 0]),
  );
}

function sortedEntries(counts = {}) {
  return Object.entries(counts || {})
    .map(([name, value]) => [name, Number(value || 0)])
    .filter(([name, value]) => name && Number.isFinite(value))
    .sort((a, b) => b[1] - a[1]);
}

function pillarPartsOf(detail, fallbackPillar = "") {
  const pillar = clean(detail?.pillar || fallbackPillar, 10);
  return {
    pillar,
    stem: normalizeStemChar(detail?.heavenlyStem || pillar),
    branch: normalizeBranchChar(detail?.earthlyBranch || pillar),
  };
}

function lovePatternFromReference(reference = {}) {
  return [
    clean(reference?.identity?.summary, 180),
    clean(reference?.identity?.instinct, 180),
    clean(reference?.strengthTip, 220),
  ].filter(Boolean).join(" ");
}

/**
 * buildSajuAdvancedFactors 가 기대하는 입력 형태로 life-book 결과를 변환한다.
 * (saju-ai-prompt.js 의 normalizeSajuPillarRows:504 / normalizeSajuLuckRows:562 계약)
 */
function buildAdvancedFactorAdapter(saju = {}) {
  const details = saju.pillarDetails || {};
  const pick = (key, fallback) => {
    const parts = pillarPartsOf(details[key], fallback);
    return parts.stem || parts.branch ? { gan: parts.stem, zhi: parts.branch } : null;
  };
  return {
    pillars: {
      year: pick("year", saju.yearPillar),
      month: pick("month", saju.monthPillar),
      day: pick("day", saju.dayPillar),
      hour: pick("hour", saju.hourPillar),
    },
    daewoon: (saju.majorLuck?.cycles || [])
      .filter((cycle) => clean(cycle?.pillar))
      .map((cycle) => ({ ganji: cycle.pillar, startAge: cycle.startAge, scope: "daewoon" })),
    yearlyLuck: (saju.yearlyLuck || [])
      .filter((row) => clean(row?.pillar))
      .map((row) => ({ ganji: row.pillar, year: row.year, scope: "sewoon" })),
    power: {
      yongshin: [clean(saju.usefulGod).charAt(0)].filter(Boolean),
      kijishin: [clean(saju.unfavorableGod).charAt(0)].filter(Boolean),
    },
  };
}

/** 상담 프롬프트가 쓰는 만큼만 남긴 고급 요소 투영(원본은 4만 자라 그대로 실을 수 없다). */
function projectAdvancedFactors(saju) {
  let factors = null;
  try {
    factors = buildSajuAdvancedFactors(buildAdvancedFactorAdapter(saju));
  } catch (error) {
    console.warn("[love-secret-ai] advanced factors skipped", { error: clean(error?.message || error, 200) });
    return { gyeokguk: null, hiddenStemExposures: [] };
  }
  const gyeokguk = factors?.gyeokguk || null;
  return {
    gyeokguk: gyeokguk
      ? {
        finalGyeokguk: clean(gyeokguk.finalGyeokguk || gyeokguk.gyeokguk, 40),
        judgmentReason: clean(gyeokguk.judgmentReason || gyeokguk.reason, 300),
        breakFactors: (Array.isArray(gyeokguk.breakFactors) ? gyeokguk.breakFactors : [])
          .map((item) => (item && typeof item === "object" ? clean(`${item.type ? `${item.type} — ` : ""}${item.detail || ""}`, 160) : clean(item, 160)))
          .filter(Boolean)
          .slice(0, 4),
      }
      : null,
    hiddenStemExposures: (Array.isArray(factors?.hiddenStemExposures) ? factors.hiddenStemExposures : [])
      .filter((row) => row?.exposedInNatalHeavenlyStem || row?.exposedByLuckStem)
      .map((row) => clean(row.summaryForPrompt || `${row.hiddenStem} 투출`, 160))
      .filter(Boolean)
      .slice(0, 6),
  };
}

function buildReferenceBase(saju, shinsal, partnerBase = null) {
  const details = saju.pillarDetails || {};
  const year = pillarPartsOf(details.year, saju.yearPillar);
  const month = pillarPartsOf(details.month, saju.monthPillar);
  const day = pillarPartsOf(details.day, saju.dayPillar);
  const hour = pillarPartsOf(details.hour, saju.hourPillar);
  const elementCounts = buildElementCounts(saju);
  const elementEntries = sortedEntries(elementCounts);
  const tenGodEntries = sortedEntries(saju.tenGods);
  const usefulElement = elementKeyFromKo(clean(saju.usefulGod).charAt(0));

  return {
    core: {
      dayMaster: day.stem,
      // relationTypeByBranch(love-secret-reference.js:230)가 한글 지지 테이블이라 한글로 넘긴다.
      dayBranch: toBranchKo(day.branch),
      monthBranch: toBranchKo(month.branch),
    },
    elementBalance: {
      counts: toEnglishElementCounts(elementCounts),
      dominant: elementKeyFromKo(elementEntries[0]?.[0]),
      deficient: elementKeyFromKo([...elementEntries].reverse()[0]?.[0]),
    },
    tenGods: {
      counts: distributionFromCounts(saju.tenGods),
      dominantTenGod: clean(tenGodEntries[0]?.[0]),
    },
    pillars: {
      year: { gan: year.stem, zhi: year.branch },
      month: { gan: month.stem, zhi: month.branch },
      day: { gan: day.stem, zhi: day.branch },
      hour: { gan: hour.stem, zhi: hour.branch },
    },
    strength: { isStrong: clean(saju.strength).includes("강한") },
    yongshin: { usefulElements: usefulElement ? [usefulElement] : [] },
    specialStars: scoreShinsalIntensity(shinsal),
    partner: partnerBase,
  };
}

/**
 * 상담용 명식 카드.
 * 앞쪽 8개 키는 기존 계약 그대로다(publicChartSummary·결과 화면이 이 이름을 읽는다).
 * 그 뒤는 전부 가산 필드이며 프롬프트 투영(love-secret-ai-facts.js)에서만 쓴다.
 */
function buildLoveChart(saju, { partnerBase = null, hourCorrection = null } = {}) {
  const details = saju.pillarDetails || {};
  const day = pillarPartsOf(details.day, saju.dayPillar);
  const year = pillarPartsOf(details.year, saju.yearPillar);
  const usefulElement = elementKeyFromKo(clean(saju.usefulGod).charAt(0));
  const unfavorableElement = elementKeyFromKo(clean(saju.unfavorableGod).charAt(0));

  const luckRows = [
    saju.majorLuck?.currentCycle
      ? { scope: "daewoon", label: `${saju.majorLuck.currentCycle.startAge}~${saju.majorLuck.currentCycle.endAge}세 대운`, stem: saju.majorLuck.currentCycle.heavenlyStem, branch: saju.majorLuck.currentCycle.earthlyBranch }
      : null,
    ...(saju.yearlyLuck || []).slice(0, 2).map((row) => ({ scope: "sewoon", label: `${row.year} 세운`, stem: row.heavenlyStem, branch: row.earthlyBranch })),
  ].filter(Boolean);

  const shinsal = buildLoveShinsal({
    pillars: {
      year: { stem: year.stem, branch: year.branch },
      month: pillarPartsOf(details.month, saju.monthPillar),
      day: { stem: day.stem, branch: day.branch },
      hour: pillarPartsOf(details.hour, saju.hourPillar),
    },
    dayStem: day.stem,
    luckRows,
    usefulElements: usefulElement ? [usefulElement] : [],
    unfavorableElements: unfavorableElement ? [unfavorableElement] : [],
  });

  const reference = buildLoveSecretReference(buildReferenceBase(saju, shinsal, partnerBase));
  const advanced = projectAdvancedFactors(saju);
  const twelveLifeStages = ["year", "month", "day", "hour"]
    .map((key) => {
      const parts = pillarPartsOf(details[key], saju[`${key}Pillar`]);
      if (!parts.branch) return null;
      return {
        position: key,
        branch: parts.branch,
        branchKo: toBranchKo(parts.branch),
        stage: getTwelveLifeStage(day.stem, parts.branch),
      };
    })
    .filter((row) => row && row.stage);

  return {
    // ── 기존 계약 (순서·타입 불변) ──
    yearPillar: clean(saju.yearPillar, 10),
    monthPillar: clean(saju.monthPillar, 10),
    dayPillar: clean(saju.dayPillar, 10),
    hourPillar: clean(saju.hourPillar, 10),
    dayMaster: day.stem,
    fiveElements: buildElementCounts(saju),
    tenGods: distributionFromCounts(saju.tenGods),
    lovePattern: lovePatternFromReference(reference),
    reference: {
      dayElement: clean(reference.dayElement),
      dominantElement: clean(reference.dominantElement),
      deficientElement: clean(reference.deficientElement),
      dominantTenGod: clean(reference.dominantTenGod),
      yongshinElement: clean(reference.yongshinElement),
      // 화면에는 영문 오행 키가 아니라 이 한글 라벨을 쓴다.
      dayElementLabel: ELEMENT_KO[reference.dayElement] || "",
      dominantElementLabel: ELEMENT_KO[reference.dominantElement] || "",
      deficientElementLabel: ELEMENT_KO[reference.deficientElement] || "",
      yongshinElementLabel: ELEMENT_KO[reference.yongshinElement] || "",
      dayMasterLabel: `${toStemKo(day.stem)}(${day.stem})`,
    },
    // ── 가산 필드 (프롬프트 투영 전용) ──
    pillarDetails: details,
    tenGodsByPillar: saju.tenGodsByPillar || null,
    seasonalBalance: saju.seasonalBalance || null,
    natalInteractions: saju.natalInteractions || null,
    relationSummary: saju.relationSummary || null,
    strength: clean(saju.strength, 60),
    usefulGod: clean(saju.usefulGod, 80),
    unfavorableGod: clean(saju.unfavorableGod, 80),
    usefulElement,
    unfavorableElement,
    majorLuck: saju.majorLuck || null,
    yearlyLuck: saju.yearlyLuck || [],
    gyeokguk: advanced.gyeokguk,
    hiddenStemExposures: advanced.hiddenStemExposures,
    twelveLifeStages,
    shinsal,
    loveReference: reference,
    calculationMeta: saju.calculationMeta || null,
    hourCorrection,
  };
}

/** 내 명식 기준 90일 일진 캘린더. "좋은 날짜" 는 전적으로 이 목록에서만 나온다. */
function buildLoveCalendarFor(chart, nowMs) {
  const dayStem = normalizeStemChar(chart.dayMaster);
  const dayBranch = normalizeBranchChar(chart.pillarDetails?.day?.earthlyBranch || chart.dayPillar);
  const natalBranches = ["year", "month", "day", "hour"]
    .map((key) => normalizeBranchChar(chart.pillarDetails?.[key]?.earthlyBranch))
    .filter(Boolean);
  const dohwa = chart.shinsal?.byName?.도화살;
  const hongyeom = chart.shinsal?.byName?.홍염살;
  const gongmang = chart.shinsal?.byName?.공망;
  const branchesOf = (star) => (star?.targets || [])
    .map((target) => normalizeBranchChar(target))
    .filter(Boolean);

  return buildLoveDayCalendar({
    dayStem,
    dayBranch,
    natalBranches,
    yongshinElement: chart.usefulElement,
    gisinElement: chart.unfavorableElement,
    dohwaBranches: branchesOf(dohwa),
    hongyeomBranch: branchesOf(hongyeom)[0] || "",
    gongmangBranches: branchesOf(gongmang),
    startDateKst: todayKstYmd(nowMs),
    days: 90,
  });
}

/** buildLoveSecretReference 가 상대 정보로 받는 최소 base. */
function partnerReferenceBase(saju) {
  const details = saju.pillarDetails || {};
  const day = pillarPartsOf(details.day, saju.dayPillar);
  const month = pillarPartsOf(details.month, saju.monthPillar);
  const elementEntries = sortedEntries(buildElementCounts(saju));
  return {
    core: { dayMaster: day.stem, dayBranch: toBranchKo(day.branch), monthBranch: toBranchKo(month.branch) },
    elementBalance: {
      dominant: elementKeyFromKo(elementEntries[0]?.[0]),
      deficient: elementKeyFromKo([...elementEntries].reverse()[0]?.[0]),
    },
  };
}

function relationBetweenElements(a, b) {
  if (!a || !b) return "정보가 제한되어 있어 입력된 명식의 큰 흐름을 중심으로 봅니다.";
  const aLabel = ELEMENT_LABELS[a] || a;
  const bLabel = ELEMENT_LABELS[b] || b;
  if (a === b) return `${aLabel} 기운이 겹쳐 서로의 감정 리듬을 빠르게 알아차리지만, 같은 예민함이 부딪힐 수 있습니다.`;
  if (GENERATE_TO[a] === b) return `${aLabel}이 ${bLabel}을 살리는 흐름이라 한쪽이 관계의 불씨를 자연스럽게 키워 주기 쉽습니다.`;
  if (GENERATE_TO[b] === a) return `${bLabel}이 ${aLabel}을 살리는 흐름이라 상대가 편안함을 느낄 때 관계가 부드럽게 열립니다.`;
  if (CONTROL_TO[a] === b) return `${aLabel}이 ${bLabel}을 제어하는 흐름이라 주도권과 속도 조절에서 긴장이 생길 수 있습니다.`;
  if (CONTROL_TO[b] === a) return `${bLabel}이 ${aLabel}을 제어하는 흐름이라 확인을 서두를수록 방어가 올라올 수 있습니다.`;
  return `${aLabel}과 ${bLabel}의 흐름은 직접 겹치기보다 대화 방식과 생활 리듬에서 조율점이 드러납니다.`;
}

const BRANCH_RELATION_TEXT = Object.freeze({
  육합: "일지끼리 육합이라 함께 있으면 긴장이 풀리고 대화가 길어집니다.",
  삼합: "일지가 같은 삼합국이라 목표와 리듬이 자연스럽게 겹칩니다.",
  충: "일지끼리 충이라 끌림이 강한 만큼 부딪히는 속도도 빠릅니다.",
  형: "일지에 형이 걸려 서로의 방식이 옳다고 느끼는 지점에서 마찰이 생깁니다.",
  파: "일지에 파가 걸려 잘 가다가 한 번씩 관계가 끊기는 결이 있습니다.",
  해: "일지에 해가 걸려 사소한 오해가 감정을 잘라 먹습니다.",
  원진: "일지가 원진이라 사건 없이도 서운함이 쌓이기 쉽습니다.",
  귀문: "일지가 귀문이라 서로의 미세한 변화를 지나치게 읽어 냅니다.",
});

const STEM_RELATION_TEXT = Object.freeze({
  합: "두 일간이 천간합이라 만나면 서로의 태도가 부드러워집니다.",
  충: "두 일간이 천간충이라 정면으로 부딪히면 물러서기 어렵습니다.",
  생: "한쪽 일간이 다른 쪽을 살려 주는 흐름이라 돌봄의 방향이 한쪽으로 기웁니다.",
  극: "한쪽 일간이 다른 쪽을 제어하는 흐름이라 주도권 다툼이 생기기 쉽습니다.",
  동: "두 일간이 같은 기운이라 마음을 빨리 알아보지만 자존심도 같이 걸립니다.",
});

/**
 * 두 사람의 궁합. 앞의 4개 문자열은 기존 계약(publicSajuSummary 가 그대로 읽는다)이고,
 * 나머지는 프롬프트가 쓰는 계산 근거다.
 */
function buildLoveCompatibility(mySaju, partnerSaju, myChart, partnerChart) {
  const myDay = pillarPartsOf(mySaju?.pillarDetails?.day, mySaju?.dayPillar);
  const partnerDay = pillarPartsOf(partnerSaju?.pillarDetails?.day, partnerSaju?.dayPillar);
  const spouseRelations = getBranchPairRelations(myDay.branch, partnerDay.branch);
  const stemRelation = getStemPairRelation(myDay.stem, partnerDay.stem);

  let axes = null;
  try {
    axes = buildSajuLoveCompatibility({ selfSaju: mySaju, partnerSaju });
  } catch (error) {
    console.warn("[love-secret-ai] compatibility axes skipped", { error: clean(error?.message || error, 200) });
  }

  const myElement = clean(myChart?.reference?.dayElement);
  const partnerElement = clean(partnerChart?.reference?.dayElement);
  const relationLines = spouseRelations.map((name) => BRANCH_RELATION_TEXT[name]).filter(Boolean);

  // 상대 지지가 내 도화/홍염/공망에 닿는가 — 끌림과 공백의 교차점.
  const partnerBranches = ["year", "month", "day", "hour"]
    .map((key) => pillarPartsOf(partnerSaju?.pillarDetails?.[key], partnerSaju?.[`${key}Pillar`]).branch)
    .filter(Boolean);
  const myDohwa = new Set([getPeachBlossomBranch(myDay.branch), getPeachBlossomBranch(pillarPartsOf(mySaju?.pillarDetails?.year, mySaju?.yearPillar).branch)].filter(Boolean));
  const myHongyeom = getHongyeomBranch(myDay.stem);
  const shinsalCross = [
    partnerBranches.some((branch) => myDohwa.has(branch)) ? "상대 지지가 내 도화에 닿아 끌림이 먼저 올라옵니다." : "",
    myHongyeom && partnerBranches.includes(myHongyeom) ? "상대 지지가 내 홍염에 닿아 분위기로 마음이 흔들립니다." : "",
  ].filter(Boolean);

  return {
    summary: [relationBetweenElements(myElement, partnerElement), ...relationLines].join(" "),
    attractionPattern: [
      STEM_RELATION_TEXT[stemRelation] || "두 일간이 직접 얽히지 않아 끌림은 생활 리듬과 대화에서 만들어집니다.",
      ...shinsalCross,
    ].join(" "),
    conflictPattern: relationLines.length
      ? `갈등은 애정 부족이 아니라 계산된 관계에서 옵니다. ${relationLines.filter((line) => /충|형|파|해|원진|귀문/.test(line)).join(" ") || "표현 방식과 확인 속도의 차이에서 생기기 쉽습니다."}`
      : "갈등은 애정 부족보다 표현 방식과 확인 속도의 차이에서 생기기 쉽습니다.",
    stability: "안정성은 감정을 단정하는 데서 오지 않고, 연락 간격과 대화의 온도를 서로가 감당 가능한 수준으로 맞출 때 높아집니다.",
    dayStemRelation: axes?.dayStemRelation || null,
    elementBalance: axes?.elementBalance || null,
    tenGodInteraction: axes?.tenGodInteraction || null,
    yongshinSupport: axes?.yongshinSupport || null,
    branchRelations: axes?.branchRelations || null,
    axisScores: axes?.axisScores || null,
    spousePalaceRelation: {
      myDayBranch: `${myDay.branch}(${toBranchKo(myDay.branch)})`,
      partnerDayBranch: `${partnerDay.branch}(${toBranchKo(partnerDay.branch)})`,
      relations: spouseRelations,
      stemRelation,
    },
    shinsalCross,
  };
}

export function normalizeLoveSecretAiInput(body = {}) {
  const myInfo = normalizePersonInfo(body.myInfo || body.self || body.user || {});
  const rawPartner = body.partnerInfo || body.partner || {};
  const partnerInfo = normalizePersonInfo(rawPartner, { defaultCalendarType: "solar" });
  const includePartner = hasPartnerSignal(rawPartner);
  const relationshipStatus = clean(body.relationshipStatus || body.relationshipType, 80);
  const topic = clean(body.topic || body.consultationTopic, 80);
  const userQuestion = clean(body.userQuestion || body.question || body.message, 1200);

  if (!myInfo.birth) return { ok: false, message: "생년월일과 연애 상담 정보를 다시 확인해 주세요." };
  if (!myInfo.gender) return { ok: false, message: "생년월일과 연애 상담 정보를 다시 확인해 주세요." };
  if (!LOVE_SECRET_RELATIONSHIP_STATUSES.includes(relationshipStatus)) {
    return { ok: false, message: "생년월일과 연애 상담 정보를 다시 확인해 주세요." };
  }
  if (!LOVE_SECRET_TOPICS.includes(topic)) {
    return { ok: false, message: "생년월일과 연애 상담 정보를 다시 확인해 주세요." };
  }
  if (includePartner && partnerInfo.birthDate && !partnerInfo.birth) {
    return { ok: false, message: "생년월일과 연애 상담 정보를 다시 확인해 주세요." };
  }

  return {
    ok: true,
    input: {
      myInfo: {
        name: myInfo.name,
        gender: myInfo.gender,
        birthDate: myInfo.birthDate,
        birthTime: myInfo.birthTime,
        birthTimeUnknown: myInfo.birthTimeUnknown,
        calendarType: myInfo.calendarType,
      },
      partnerInfo: includePartner
        ? {
          name: partnerInfo.name,
          gender: partnerInfo.gender,
          birthDate: partnerInfo.birthDate,
          birthTime: partnerInfo.birthTime,
          birthTimeUnknown: partnerInfo.birthTimeUnknown,
          calendarType: partnerInfo.calendarType,
        }
        : undefined,
      relationshipStatus,
      topic,
      userQuestion,
    },
    internal: { myInfo, partnerInfo: includePartner ? partnerInfo : null },
  };
}

/**
 * 연애 상담용 명식 일체.
 *
 * @param {object} normalized  normalizeLoveSecretAiInput 결과
 * @param {object} [options]
 * @param {"full"|"validate"} [options.mode="full"]
 *   "validate" — 사전검사(prepare)용. 생년 정보가 계산 가능한지만 확인하고
 *   고급 요소·일진 캘린더·궁합 축은 건너뛴다(같은 요청에서 두 번 계산되는 비용 제거).
 * @param {number} [options.nowMs]  일진 캘린더 시작일 기준 시각. 테스트에서 고정할 수 있게 주입받는다.
 */
export function calculateLoveSecretAiSaju(normalized, options = {}) {
  const mode = options.mode === "validate" ? "validate" : "full";
  const internal = normalized?.internal || {};
  const myInfo = internal.myInfo;
  if (!myInfo?.birth) {
    throw Object.assign(new Error("missing my birth info"), { code: "CALCULATION_FAILED" });
  }

  let mySaju;
  let myHourCorrection = null;
  let partnerSaju = null;
  let partnerHourCorrection = null;

  try {
    ({ saju: mySaju, hourCorrection: myHourCorrection } = calculateChartWithHourCorrection(myInfo));
  } catch (error) {
    console.warn("[love-secret-ai] my chart calculation failed", {
      birthDate: myInfo.birthDate,
      calendarType: myInfo.calendarType,
      birthTimeUnknown: myInfo.birthTimeUnknown,
      error: clean(error?.message || error, 300),
    });
    throw Object.assign(new Error("my chart calculation failed"), { code: "CALCULATION_FAILED" });
  }

  const partnerInfo = internal.partnerInfo;
  if (partnerInfo?.birth) {
    try {
      ({ saju: partnerSaju, hourCorrection: partnerHourCorrection } = calculateChartWithHourCorrection(partnerInfo));
    } catch (error) {
      console.warn("[love-secret-ai] partner chart calculation failed", {
        birthDate: partnerInfo.birthDate,
        calendarType: partnerInfo.calendarType,
        birthTimeUnknown: partnerInfo.birthTimeUnknown,
        error: clean(error?.message || error, 300),
      });
      throw Object.assign(new Error("partner chart calculation failed"), { code: "CALCULATION_FAILED" });
    }
  }

  if (mode === "validate") {
    return {
      version: LOVE_SECRET_AI_SAJU_VERSION,
      mode,
      myChart: { dayPillar: clean(mySaju.dayPillar, 10), dayMaster: clean(mySaju.dayMaster, 4) },
      partnerChart: partnerSaju ? { dayPillar: clean(partnerSaju.dayPillar, 10), dayMaster: clean(partnerSaju.dayMaster, 4) } : undefined,
      consultationMode: partnerSaju ? "with_partner" : "solo",
    };
  }

  const partnerBase = partnerSaju ? partnerReferenceBase(partnerSaju) : null;
  const myChart = buildLoveChart(mySaju, { partnerBase, hourCorrection: myHourCorrection });
  const partnerChart = partnerSaju ? buildLoveChart(partnerSaju, { hourCorrection: partnerHourCorrection }) : undefined;
  const compatibility = partnerSaju ? buildLoveCompatibility(mySaju, partnerSaju, myChart, partnerChart) : undefined;
  const calendar = buildLoveCalendarFor(myChart, options.nowMs);

  const uncertainty = [];
  if (normalized.input.myInfo.birthTimeUnknown) uncertainty.push("my_birth_time_unknown");
  if (normalized.input.partnerInfo?.birthDate && normalized.input.partnerInfo?.birthTimeUnknown) {
    uncertainty.push("partner_birth_time_unknown");
  }

  if (uncertainty.length) {
    console.info("[love-secret-ai] calculation uncertainty", {
      uncertainty,
      relationshipStatus: normalized.input.relationshipStatus,
      topic: normalized.input.topic,
    });
  }

  return {
    version: LOVE_SECRET_AI_SAJU_VERSION,
    myChart,
    partnerChart,
    compatibility,
    uncertainty,
    consultationMode: partnerChart ? "with_partner" : "solo",
    calendar,
  };
}
