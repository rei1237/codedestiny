import { buildAstrologyAdapter } from "./guardian-fortune/adapters/astrology.js";
import { buildSajuAdapter } from "./guardian-fortune/adapters/saju.js";
import { buildSukuyoAdapter } from "./guardian-fortune/adapters/sukuyo.js";
import { buildTarotAdapter } from "./guardian-fortune/adapters/tarot.js";
import { buildVedicAdapter } from "./guardian-fortune/adapters/vedic.js";
import { buildZiweiAdapter } from "./guardian-fortune/adapters/ziwei.js";
import {
  ADAPTER_NAMES,
  DEFAULT_TIMEZONE,
  GUARDIAN_CATEGORY_ADAPTER_PRIORITY,
  GUARDIAN_TOPIC_ADAPTER_PRIORITY,
  MAX_CONCERN_LENGTH,
  VALID_CALENDAR_TYPES,
  VALID_CATEGORIES,
  VALID_GENDERS,
  VALID_MODES,
  VALID_TOPICS,
  containsSensitiveText,
  createWarning,
  isValidBirthPlace,
  isValidDate,
  isValidTime,
  kstDateKey,
  maskGuardianFortuneInputForLog,
  runGuardianAdapterSafely,
} from "./guardian-fortune-adapter-utils.js";
import { buildIntegratedInsight } from "./guardian-fortune-insight.js";

const DEFAULT_LOCALE = "ko-KR";

const DEFAULT_ADAPTERS = Object.freeze({
  saju: buildSajuAdapter,
  ziwei: buildZiweiAdapter,
  vedic: buildVedicAdapter,
  sukuyo: buildSukuyoAdapter,
  astrology: buildAstrologyAdapter,
  tarot: buildTarotAdapter,
});

function invalidInput(message = "운세 입력을 확인해 주세요.") {
  const error = new Error(message);
  error.code = "GUARDIAN_CONTEXT_INVALID_INPUT";
  return error;
}

function normalizeBirthPlace(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!isValidBirthPlace(value)) throw invalidInput("출생지 정보를 확인해 주세요.");
  return {
    city: typeof value.city === "string" ? value.city.trim().slice(0, 80) || undefined : undefined,
    country: typeof value.country === "string" ? value.country.trim().slice(0, 80) || undefined : undefined,
    latitude: Math.round(Number(value.latitude) * 10000) / 10000,
    longitude: Math.round(Number(value.longitude) * 10000) / 10000,
    timezone: String(value.timezone).trim(),
  };
}

export function normalizeGuardianFortuneInput(input = {}, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalidInput();
  const now = options.now instanceof Date ? options.now : new Date();
  const birthDate = String(input.birthDate || "").trim();
  const birthTime = input.birthTime ? String(input.birthTime).trim() : undefined;
  const calendarType = input.calendarType === undefined ? "solar" : input.calendarType;
  const gender = input.gender === undefined ? "unknown" : input.gender;
  const mode = input.mode === undefined ? "yeoni" : input.mode;
  const topic = input.topic === undefined ? "daily" : input.topic;
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const locale = input.locale === undefined ? DEFAULT_LOCALE : String(input.locale).trim();
  const targetDate = input.targetDate ? String(input.targetDate).trim() : kstDateKey(now);
  const concern = input.concern ? String(input.concern).trim() : undefined;
  const birthPlace = normalizeBirthPlace(input.birthPlace);
  if (options.requireBirthTime === true && !birthTime) throw invalidInput("생시를 입력해 주세요. 생시를 기준으로 상담 체계별 해석을 정교하게 맞춥니다.");

  if (!isValidDate(birthDate)) throw invalidInput("생년월일을 확인해 주세요.");
  if (birthDate > kstDateKey(now)) throw invalidInput("미래의 생년월일은 입력할 수 없어요.");
  if (birthTime && !isValidTime(birthTime)) throw invalidInput("생시 형식을 확인해 주세요.");
  if (!VALID_CALENDAR_TYPES.has(calendarType)) throw invalidInput("양력 또는 음력을 선택해 주세요.");
  if (!VALID_GENDERS.has(gender)) throw invalidInput("성별 선택값을 확인해 주세요.");
  if (!VALID_MODES.has(mode)) throw invalidInput("상담 모드를 확인해 주세요.");
  if (!VALID_TOPICS.has(topic)) throw invalidInput("관심 분야를 선택해 주세요.");
  if (!VALID_CATEGORIES.has(category)) throw invalidInput("상담 체계를 선택해 주세요.");
  if (!isValidDate(targetDate)) throw invalidInput("기준 날짜를 확인해 주세요.");
  if (typeof locale !== "string" || locale.length < 2 || locale.length > 20) throw invalidInput("언어 설정을 확인해 주세요.");
  if (concern && concern.length > MAX_CONCERN_LENGTH) throw invalidInput("고민을 120자 이내로 적어 주세요.");
  if (containsSensitiveText(concern)) throw invalidInput("민감한 개인정보는 적지 말아 주세요.");

  return {
    birthDate,
    birthTime,
    hasBirthTime: Boolean(birthTime),
    calendarType,
    gender,
    birthPlace,
    hasBirthPlace: Boolean(birthPlace),
    topic,
    category,
    mode,
    locale,
    targetDate,
    timezone: DEFAULT_TIMEZONE,
    hasConcern: Boolean(concern),
    concernForLLM: concern,
  };
}

function projectSaju(data) {
  return {
    dayMaster: data.dayMaster,
    tenGodsSummary: data.tenGodsSummary,
    fiveElementsSummary: data.fiveElementsSummary,
    currentFlowSummary: data.currentFlowSummary || data.currentFlow,
    seasonSummary: data.seasonSummary,
    relationSummary: data.relationSummary,
    personalityHook: data.personalityHook,
    cautions: Array.isArray(data.cautions) ? data.cautions.slice(0, 3) : [],
    evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 8) : [],
  };
}

function projectZiwei(data) {
  return {
    lifePalaceSummary: data.lifePalaceSummary,
    topicPalaceSummary: data.topicPalaceSummary,
    keyStarsSummary: data.keyStarsSummary,
    strengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 3) : [],
    cautions: Array.isArray(data.cautions) ? data.cautions.slice(0, 3) : [],
    evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 8) : [],
  };
}

function projectVedic(data) {
  return {
    lagnaSummary: data.lagnaSummary,
    moonSignSummary: data.moonSignSummary,
    nakshatraSummary: data.nakshatraSummary,
    dashaSummary: data.dashaSummary,
    padaSummary: data.padaSummary,
    innerRhythm: data.innerRhythm,
    evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 8) : [],
  };
}

function projectSukuyo(data) {
  return {
    birthMansion: data.birthMansion,
    todayMansion: data.todayMansion,
    emotionalPattern: data.emotionalPattern,
    relationshipPattern: data.relationshipPattern,
    distancePattern: data.distancePattern,
    evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 8) : [],
  };
}

function projectAstrology(data) {
  return {
    sunSummary: data.sunSummary,
    moonSummary: data.moonSummary,
    ascendantSummary: data.ascendantSummary,
    venusSummary: data.venusSummary,
    marsSummary: data.marsSummary,
    saturnSummary: data.saturnSummary,
    currentMoodSummary: data.currentMoodSummary,
    evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 8) : [],
  };
}

function projectTarot(data) {
  return {
    spreadType: data.spreadType === "fusion_six_system_bridge" ? "fusion_six_system_bridge" : data.spreadType === "three_card" ? "three_card" : "one_card",
    spreadId: String(data.spreadId || "").slice(0, 80),
    questionType: String(data.questionType || "").slice(0, 80),
    cards: Array.isArray(data.cards)
      ? data.cards.map((card) => ({
          name: String(card.name || "타로 카드").slice(0, 100),
          orientation: card.orientation === "reversed" ? "reversed" : "upright",
          positionKey: String(card.positionKey || "").slice(0, 80),
          meaningSummary: String(card.meaningSummary || "오늘의 상징을 차분히 살펴봅니다.").slice(0, 300),
        })).slice(0, data.spreadType === "fusion_six_system_bridge" ? 6 : 3)
      : [],
    symbolicMessage: String(data.symbolicMessage || "오늘의 상징을 행동의 기준으로 삼아보세요.").slice(0, 320),
    evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 8) : [],
  };
}

const PROJECTION_BY_ADAPTER = {
  saju: projectSaju,
  ziwei: projectZiwei,
  vedic: projectVedic,
  sukuyo: projectSukuyo,
  astrology: projectAstrology,
  tarot: projectTarot,
};

function projectionHasValue(value) {
  return value && Object.values(value).some((item) => Array.isArray(item) ? item.length > 0 : Boolean(item));
}

function buildLimitedProjection(adapterName, reason) {
  if (adapterName === "ziwei" && reason === "birth_time_unknown") {
    return {
      lifePalaceSummary: "생시를 몰라 명궁·신궁과 궁위별 정밀 명반은 계산하지 않았습니다.",
      topicPalaceSummary: "생시 기반 궁위는 단정하지 않고, 현재 고민의 질문 구조만 조심스럽게 살핍니다.",
      keyStarsSummary: undefined,
      strengths: ["정밀 명반이 없는 상태에서는 별과 궁을 지어내지 않는 것이 우선입니다."],
      cautions: ["생시를 확인하면 명궁과 주제별 궁위 해석을 다시 정교하게 볼 수 있습니다."],
      evidence: ["ziwei.limited.birth_time_unknown"],
    };
  }
  if (adapterName === "vedic" && reason === "birth_place_unknown") {
    return {
      lagnaSummary: undefined,
      moonSignSummary: "출생지를 몰라 라그나·문사인·나크샤트라의 정밀 위치를 계산하지 않았습니다.",
      nakshatraSummary: undefined,
      dashaSummary: undefined,
      padaSummary: undefined,
      innerRhythm: "위치를 추정하지 않고, 현재 관심 주제에서 확인 가능한 감정 리듬만 낮은 확신으로 살핍니다.",
      evidence: ["vedic.limited.birth_place_unknown"],
    };
  }
  if (adapterName === "astrology" && reason === "birth_place_unknown") {
    return {
      sunSummary: "출생지를 몰라 행성 위치와 하우스를 정밀 계산하지 않았습니다.",
      moonSummary: undefined,
      ascendantSummary: undefined,
      venusSummary: undefined,
      marsSummary: undefined,
      saturnSummary: undefined,
      currentMoodSummary: "상승궁·하우스는 단정하지 않고, 현재 질문의 선택 패턴만 낮은 확신으로 살핍니다.",
      evidence: ["astrology.limited.birth_place_unknown"],
    };
  }
  return undefined;
}

export async function buildGuardianFortuneContext(input, options = {}) {
  let normalized;
  try {
    normalized = normalizeGuardianFortuneInput(input, options);
  } catch (error) {
    return {
      ok: false,
      errorCode: error?.code === "GUARDIAN_CONTEXT_INVALID_INPUT" ? error.code : "GUARDIAN_CONTEXT_INTERNAL_ERROR",
      message: error?.code === "GUARDIAN_CONTEXT_INVALID_INPUT" ? error.message : "운세 입력을 처리하지 못했습니다.",
      warnings: [],
    };
  }

  const warnings = [];
  const results = {};
  const unavailableClaims = [];
  const adapters = options.adapters || DEFAULT_ADAPTERS;
  const priority = GUARDIAN_CATEGORY_ADAPTER_PRIORITY[normalized.category];
  const adapterOptions = {
    ...options,
    now: options.now instanceof Date ? options.now : new Date(),
  };

  for (const adapterName of priority) {
    if (adapterName === "saju" && !normalized.hasBirthTime) {
      warnings.push(createWarning("saju", "birth_time_unknown", "생시가 없어 시주 기반 사주 해석을 생략했습니다."));
    }
    if (adapterName === "ziwei" && !normalized.hasBirthTime) {
      const warning = createWarning("ziwei", "birth_time_unknown", "생시가 없어 자미두수의 시간 의존 해석을 생략했습니다.");
      warnings.push(warning);
      unavailableClaims.push("ziwei.birth_time_required");
      results.ziwei = buildLimitedProjection("ziwei", "birth_time_unknown");
      continue;
    }
    if ((adapterName === "vedic" || adapterName === "astrology") && !normalized.hasBirthPlace) {
      const warning = createWarning(adapterName, "birth_place_required", "출생지가 없어 위치 의존 해석을 생략했습니다.");
      warnings.push(warning);
      unavailableClaims.push(`${adapterName}.birth_place_required`);
      results[adapterName] = buildLimitedProjection(adapterName, "birth_place_unknown");
      continue;
    }

    const adapter = adapters[adapterName];
    if (typeof adapter !== "function") {
      const warning = createWarning(adapterName, "adapter_unavailable");
      warnings.push(warning);
      unavailableClaims.push(`${adapterName}.adapter_unavailable`);
      continue;
    }
    const result = await runGuardianAdapterSafely({
      adapterName,
      run: () => adapter(normalized, {
        ...adapterOptions,
        calculator: options.calculators?.[adapterName],
        tarotSeed: options.tarotSeed,
      }),
      logger: options.logger,
    });
    if (Array.isArray(result.warnings)) warnings.push(...result.warnings);
    if (result.ok) {
      results[adapterName] = result.data;
    } else {
      unavailableClaims.push(`${adapterName}.${result.errorCode}`);
    }
  }

  const availableSystems = ADAPTER_NAMES.filter((name) => results[name] && projectionHasValue(results[name]));
  if (availableSystems.length === 0) {
    return {
      ok: false,
      errorCode: "GUARDIAN_CONTEXT_ALL_ADAPTERS_FAILED",
      message: "운세 계산 결과를 준비하지 못했습니다.",
      warnings,
    };
  }

  const integratedInsight = buildIntegratedInsight({
    topic: normalized.topic,
    results,
    hasConcern: normalized.hasConcern,
  });
  if (!integratedInsight.openingHook) warnings.push(createWarning("integrated", "insight_empty"));

  const context = {
    version: "guardian-fortune.v1",
    inputSummary: {
      hasBirthTime: normalized.hasBirthTime,
      hasBirthPlace: normalized.hasBirthPlace,
      calendarType: normalized.calendarType,
      topic: normalized.topic,
      category: normalized.category,
      mode: normalized.mode,
      targetDate: normalized.targetDate,
      locale: normalized.locale,
      hasConcern: normalized.hasConcern,
    },
    availableSystems,
    unavailableClaims: [...new Set(unavailableClaims)],
    integratedInsight,
    safetyConstraints: [
      "birth_time_dependent_claims_require_birth_time",
      "location_dependent_claims_require_birth_place",
      "no_partner_mind_reading_without_partner_input",
      "no_medical_legal_or_investment_certainty",
    ],
  };

  for (const adapterName of ADAPTER_NAMES) {
    if (!results[adapterName]) continue;
    const projection = PROJECTION_BY_ADAPTER[adapterName](results[adapterName]);
    if (projectionHasValue(projection)) context[adapterName] = projection;
  }

  return { ok: true, context, warnings };
}

export {
  DEFAULT_ADAPTERS,
  GUARDIAN_TOPIC_ADAPTER_PRIORITY,
  maskGuardianFortuneInputForLog,
};
