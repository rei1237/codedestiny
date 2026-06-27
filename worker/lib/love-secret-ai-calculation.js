import { buildSajuProfile } from "./destiny-bias-engine.js";
import { buildLoveSecretReference } from "./love-secret-reference.js";

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
  "상대방 마음",
  "연락 타이밍",
  "고백 타이밍",
  "재회 가능성",
  "관계 회복 전략",
  "장기 연애 유지법",
  "결혼 가능성",
  "갈등 원인",
  "나의 연애 패턴",
  "상대방과의 궁합",
  "지금 밀어야 할지 기다려야 할지",
  "이 관계를 계속해도 되는지",
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

function toSajuGender(value) {
  const gender = normalizeGender(value);
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return "OTHER";
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

function buildProfileInput(info) {
  const birth = info.birth;
  const time = splitBirthTime(info.birthTime);
  return {
    name: info.name || "상담자",
    gender: toSajuGender(info.gender),
    birth: {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: info.birthTimeUnknown ? 12 : time.hour,
      minute: info.birthTimeUnknown ? 0 : time.minute,
      calendarType: info.calendarType,
      unknownTime: info.birthTimeUnknown,
      timezone: "Asia/Seoul",
    },
  };
}

function distributionFromScores(source = {}) {
  const scores = source?.scores && typeof source.scores === "object" ? source.scores : source;
  return Object.fromEntries(
    Object.entries(scores || {})
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Math.round(Number(value) * 100) / 100]),
  );
}

function distributionFromCounts(source = {}) {
  const counts = source?.counts && typeof source.counts === "object" ? source.counts : source;
  return Object.fromEntries(
    Object.entries(counts || {})
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Math.round(Number(value) * 100) / 100]),
  );
}

function pillarText(pillar) {
  if (!pillar) return "";
  if (typeof pillar === "string") return pillar;
  return clean(pillar.ganji || `${clean(pillar.stem)}${clean(pillar.branch)}`);
}

function lovePatternFromReference(reference = {}) {
  return [
    clean(reference?.identity?.summary, 180),
    clean(reference?.identity?.instinct, 180),
    clean(reference?.strengthTip, 220),
  ].filter(Boolean).join(" ");
}

function referenceBaseFromProfile(profile = {}) {
  return {
    core: {
      dayMaster: clean(profile?.dayMaster?.stem),
      dayBranch: clean(profile?.pillars?.day?.branch),
    },
    elementBalance: {
      counts: distributionFromScores(profile?.fiveElements),
      dominant: clean(profile?.fiveElements?.strongest),
      deficient: clean(profile?.fiveElements?.weakest),
    },
    tenGods: {
      counts: distributionFromCounts(profile?.tenGods),
      dominantTenGod: clean(profile?.tenGods?.dominant),
    },
    pillars: {
      year: { gan: clean(profile?.pillars?.year?.stem), zhi: clean(profile?.pillars?.year?.branch) },
      month: { gan: clean(profile?.pillars?.month?.stem), zhi: clean(profile?.pillars?.month?.branch) },
      day: { gan: clean(profile?.pillars?.day?.stem), zhi: clean(profile?.pillars?.day?.branch) },
      hour: { gan: clean(profile?.pillars?.hour?.stem), zhi: clean(profile?.pillars?.hour?.branch) },
    },
    strength: {
      isStrong: Number(profile?.fiveElements?.scores?.[profile?.dayMaster?.element] || 0) >= 2.2,
    },
  };
}

function publicChartFromProfile(profile = {}) {
  const reference = buildLoveSecretReference(referenceBaseFromProfile(profile));
  return {
    yearPillar: pillarText(profile?.pillars?.year),
    monthPillar: pillarText(profile?.pillars?.month),
    dayPillar: pillarText(profile?.pillars?.day),
    hourPillar: profile?.calendar?.includeHour === false ? "" : pillarText(profile?.pillars?.hour),
    dayMaster: clean(profile?.dayMaster?.stem || profile?.dayMaster?.stemKo),
    fiveElements: distributionFromScores(profile?.fiveElements),
    tenGods: distributionFromCounts(profile?.tenGods),
    lovePattern: lovePatternFromReference(reference),
    reference: {
      dayElement: clean(reference.dayElement),
      dominantElement: clean(reference.dominantElement),
      deficientElement: clean(reference.deficientElement),
      dominantTenGod: clean(reference.dominantTenGod),
      yongshinElement: clean(reference.yongshinElement),
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

function buildCompatibility(myChart = {}, partnerChart = {}) {
  const myElement = clean(myChart?.reference?.dayElement);
  const partnerElement = clean(partnerChart?.reference?.dayElement);
  const elementSummary = relationBetweenElements(myElement, partnerElement);
  const sameDayMaster = clean(myChart.dayMaster) && clean(myChart.dayMaster) === clean(partnerChart.dayMaster);
  const myDominant = clean(myChart?.reference?.dominantTenGod);
  const partnerDominant = clean(partnerChart?.reference?.dominantTenGod);

  return {
    summary: elementSummary,
    attractionPattern: sameDayMaster
      ? "서로의 본질을 빠르게 알아보는 끌림이 있으나, 감정 처리 방식이 닮아 자존심도 함께 건드려질 수 있습니다."
      : "서로 다른 결로 반응하는 지점이 끌림을 만들며, 상대를 내 방식대로 해석하지 않을 때 매력이 살아납니다.",
    conflictPattern: myDominant && partnerDominant && myDominant === partnerDominant
      ? "관계에서 중요하게 여기는 기준이 닮아 있어 좋을 때는 빠르게 맞지만, 서운함도 비슷한 방식으로 쌓일 수 있습니다."
      : "갈등은 애정 부족보다 표현 방식과 확인 속도의 차이에서 생기기 쉽습니다.",
    stability: "안정성은 감정을 단정하는 데서 오지 않고, 연락 간격과 대화의 온도를 서로가 감당 가능한 수준으로 맞출 때 높아집니다.",
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

export function calculateLoveSecretAiSaju(normalized) {
  const internal = normalized?.internal || {};
  const myInfo = internal.myInfo;
  if (!myInfo?.birth) {
    throw Object.assign(new Error("missing my birth info"), { code: "CALCULATION_FAILED" });
  }

  let myProfile;
  let partnerProfile = null;

  try {
    myProfile = buildSajuProfile(buildProfileInput(myInfo));
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
      partnerProfile = buildSajuProfile(buildProfileInput(partnerInfo));
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

  const myChart = publicChartFromProfile(myProfile);
  const partnerChart = partnerProfile ? publicChartFromProfile(partnerProfile) : undefined;
  const compatibility = partnerChart ? buildCompatibility(myChart, partnerChart) : undefined;

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
    myChart,
    partnerChart,
    compatibility,
    uncertainty,
    consultationMode: partnerChart ? "with_partner" : "solo",
  };
}
