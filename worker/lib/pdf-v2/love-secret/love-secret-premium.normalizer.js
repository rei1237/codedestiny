import { asArray, clean, compactObject, normalizeLoveSecretMode, safeObject } from "./love-secret-premium.types.js";

function firstClean(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function pillarText(row = {}) {
  const source = safeObject(row);
  return firstClean(
    source.label,
    source.text,
    source.raw,
    `${clean(source.stem || source.heavenlyStem)}${clean(source.branch || source.earthlyBranch)}`,
  );
}

function normalizeProfile(baseUser = {}, raw = {}) {
  const user = safeObject(baseUser);
  const body = safeObject(raw);
  const personA = safeObject(body.personA);
  const birthInput = safeObject(body.birthInput || body.profile || personA);
  return compactObject({
    name: firstClean(user.name, birthInput.name, personA.name, body.userName, body.name, "의뢰인"),
    gender: firstClean(user.gender, birthInput.gender, personA.gender, body.gender),
    birthDate: firstClean(user.birthDate, birthInput.birthDate, birthInput.date, personA.birthDate, body.birthDate),
    birthTime: firstClean(user.birthTime, birthInput.birthTime, birthInput.time, personA.birthTime, body.birthTime),
    calendarType: firstClean(user.calendarType, birthInput.calendarType, birthInput.calendar, personA.calendarType),
    birthPlace: firstClean(user.birthPlace, birthInput.birthPlace, birthInput.place, personA.birthPlace),
  });
}

function normalizePartnerProfile(basePartner = {}, raw = {}) {
  const partner = safeObject(basePartner);
  const user = safeObject(partner.user || partner.profile || partner);
  const body = safeObject(raw);
  const personB = safeObject(body.personB);
  const birthInput = safeObject(body.partnerBirthInput || body.partnerProfile || body.partner || personB);
  return compactObject({
    name: firstClean(user.name, birthInput.name, personB.name, body.partnerName, "상대"),
    gender: firstClean(user.gender, birthInput.gender, personB.gender, body.partnerGender),
    birthDate: firstClean(user.birthDate, birthInput.birthDate, birthInput.date, personB.birthDate, body.partnerBirthDate),
    birthTime: firstClean(user.birthTime, birthInput.birthTime, birthInput.time, personB.birthTime, body.partnerBirthTime),
    calendarType: firstClean(user.calendarType, birthInput.calendarType, birthInput.calendar, personB.calendarType),
    birthPlace: firstClean(user.birthPlace, birthInput.birthPlace, birthInput.place, personB.birthPlace),
  });
}

function normalizePillars(pillars = {}) {
  const source = safeObject(pillars);
  return compactObject({
    year: pillarText(source.year),
    month: pillarText(source.month),
    day: pillarText(source.day),
    hour: pillarText(source.hour),
  });
}

function normalizeElementBalance(value = {}) {
  const source = safeObject(value);
  return compactObject({
    wood: source.wood ?? source.tree ?? source.목,
    fire: source.fire ?? source.화,
    earth: source.earth ?? source.토,
    metal: source.metal ?? source.gold ?? source.금,
    water: source.water ?? source.수,
    dominant: firstClean(source.dominant, source.strongest, source.primary),
    weak: firstClean(source.weak, source.weakest, source.lacking),
  });
}

function normalizeSaju(base = {}) {
  const source = safeObject(safeObject(base).sajuChart || base);
  const core = safeObject(source.core);
  const stars = safeObject(source.specialStars || source.stars);
  const timing = safeObject(source.timing || source.luck);
  return compactObject({
    pillars: normalizePillars(source.pillars),
    dayMaster: firstClean(core.dayMaster, core.ilgan, source.dayMaster),
    monthCommand: firstClean(core.monthCommand, core.monthBranch, core.season),
    strength: firstClean(core.strength, core.dayMasterStrength),
    tenGods: safeObject(source.tenGods || core.tenGods),
    elementBalance: normalizeElementBalance(source.elementBalance || core.elementBalance),
    usefulGod: firstClean(source.yongshin, source.usefulGod, core.yongshin, core.usefulGod),
    spouseStar: firstClean(stars.spouseStar, stars.partnerStar, stars.배우자성),
    loveStar: firstClean(stars.loveStar, stars.romanceStar, stars.peachBlossom),
    peachBlossom: firstClean(stars.peachBlossom, stars.dohwa, stars.도화),
    lonelyStar: firstClean(stars.lonelyStar, stars.gwansal),
    currentLuck: compactObject({
      decade: firstClean(timing.decade, timing.daewoon, timing.majorLuck),
      year: firstClean(timing.year, timing.yearLuck, timing.saeun),
      month: firstClean(timing.month, timing.monthLuck),
      loveTiming: firstClean(timing.loveTiming, timing.relationshipTiming),
    }),
  });
}

function normalizeLoveContext(raw = {}, base = {}, mode = "solo") {
  const body = safeObject(raw);
  const serviceContext = safeObject(body.serviceContext);
  const relationshipContext = safeObject(body.relationshipContext);
  const merged = { ...serviceContext, ...relationshipContext, ...body };
  return compactObject({
    mode,
    relationshipStatus: firstClean(merged.relationshipStatus, merged.loveStatus, merged.currentLoveStatus),
    currentConcern: firstClean(merged.currentConcern, merged.concern, merged.question),
    idealType: firstClean(merged.idealType, merged.preferredPartner),
    pastLovePattern: firstClean(merged.pastLovePattern, merged.relationshipPattern),
    desiredOutcome: firstClean(merged.desiredOutcome),
    relationshipType: firstClean(merged.relationshipType, merged.status),
    targetYear: firstClean(merged.targetYear, new Date().getFullYear()),
    wantsMarriageAnalysis: merged.wantsMarriageAnalysis !== false && merged.includeMarriageAnalysis !== false,
    wantsReunionAnalysis: merged.wantsReunionAnalysis !== false && merged.includeReunionAnalysis !== false,
    userLoveContext: safeObject(body.userLoveContext),
    calculatedSignals: compactObject({
      loveKeyword: firstClean(base?.love?.keyword, base?.love?.summary, base?.romanceSummary),
      attractionPattern: firstClean(base?.love?.attractionPattern, base?.attractionPattern),
      conflictPattern: firstClean(base?.love?.conflictPattern, base?.conflictPattern),
      timingSummary: firstClean(base?.love?.timingSummary, base?.timing?.loveTiming),
    }),
  });
}

function normalizeLuck(base = {}) {
  const source = safeObject(safeObject(base).sajuChart || base);
  const timing = safeObject(source.timing || source.luck || safeObject(base).luckCycles);
  return compactObject({
    majorLuck: firstClean(timing.majorLuck, timing.daewoon, timing.decade),
    yearLuck: firstClean(timing.yearLuck, timing.saeun, timing.year),
    monthLuck: firstClean(timing.monthLuck, timing.month),
    loveWindow: firstClean(timing.loveWindow, timing.relationshipWindow, timing.loveTiming),
    warnings: asArray(timing.warnings).map((item) => clean(item)).filter(Boolean),
  });
}

function normalizeCompatibility(base = {}, raw = {}, mode = "solo") {
  if (mode !== "compatibility") return undefined;
  const body = safeObject(raw);
  const partner = Object.keys(safeObject(base.partner)).length
    ? safeObject(base.partner)
    : safeObject(body.personB?.sajuChart || body.personB);
  return compactObject({
    partnerProfile: normalizePartnerProfile(partner, body),
    partnerSaju: normalizeSaju(partner),
    score: firstClean(base?.compatibility?.score, partner?.compatibility?.score),
    emotionalMatch: firstClean(base?.compatibility?.emotionalMatch, partner?.compatibility?.emotionalMatch),
    communicationMatch: firstClean(base?.compatibility?.communicationMatch, partner?.compatibility?.communicationMatch),
    conflictPattern: firstClean(base?.compatibility?.conflictPattern, partner?.compatibility?.conflictPattern),
    longTermPotential: firstClean(base?.compatibility?.longTermPotential, partner?.compatibility?.longTermPotential),
  });
}

function buildWarnings({ base, mode, compatibility }) {
  const warnings = [];
  const selfPillars = normalizePillars(base?.pillars);
  if (!selfPillars.day) warnings.push("일주 정보가 부족해 연애 성향의 중심축은 제공된 계산 신호 안에서만 해석합니다.");
  if (!clean(base?.core?.dayMaster || base?.dayMaster)) warnings.push("일간 정보가 명확하지 않아 성격과 관계 표현은 보조 신호 중심으로 읽습니다.");
  if (!clean(base?.specialStars?.spouseStar || base?.specialStars?.loveStar || base?.specialStars?.peachBlossom)) {
    warnings.push("연애성·배우자성 신호가 제한적이어서 단정 대신 가능성의 방향으로 서술합니다.");
  }
  if (mode === "compatibility" && !compatibility?.partnerSaju?.pillars?.day) {
    warnings.push("상대 사주 정보 일부가 부족해 궁합 해석은 확인 가능한 축만 사용합니다.");
  }
  return warnings;
}

function buildRawResultSummary({ base, mode, compatibility }) {
  const source = safeObject(base);
  return compactObject({
    purpose: "LLM 참고용 계산 요약이며 PDF 본문에 원문 그대로 출력하지 않습니다.",
    mode,
    availableBlocks: Object.keys(source).filter((key) => !["raw", "debug", "payload"].includes(key)).slice(0, 40),
    hasPillars: Boolean(source.pillars),
    hasCore: Boolean(source.core),
    hasElementBalance: Boolean(source.elementBalance || source.core?.elementBalance),
    hasLoveSignals: Boolean(source.love || source.specialStars),
    hasLuckSignals: Boolean(source.timing || source.luck),
    hasCompatibility: Boolean(compatibility),
  });
}

export function normalizeLoveSecretPremiumInput({ base = {}, body = {}, mode = "solo", config = null } = {}) {
  const sourceBody = safeObject(body);
  const normalizedMode = normalizeLoveSecretMode(mode || sourceBody.mode || sourceBody.reportMode, { allowDefault: true });
  const sourceBase = Object.keys(safeObject(base)).length
    ? safeObject(base)
    : safeObject(sourceBody.personA?.sajuChart || sourceBody.personA);
  const compatibility = normalizeCompatibility(sourceBase, sourceBody, normalizedMode);
  const userProfile = normalizeProfile(sourceBase.user, sourceBody);
  const partnerProfile = normalizedMode === "compatibility" ? compatibility?.partnerProfile : undefined;
  if (normalizedMode === "compatibility" && (!clean(userProfile.birthDate) || !clean(partnerProfile?.birthDate))) {
    const error = new Error("LOVE_SECRET_COMPATIBILITY_INPUT_MISSING");
    error.code = "LOVE_SECRET_COMPATIBILITY_INPUT_MISSING";
    error.status = 400;
    throw error;
  }
  const warnings = buildWarnings({ base: sourceBase, mode: normalizedMode, compatibility });
  return compactObject({
    schemaVersion: "love-secret-premium-input.v2",
    mode: normalizedMode,
    userProfile,
    partnerProfile,
    saju: normalizeSaju(sourceBase),
    love: normalizeLoveContext(sourceBody, sourceBase, normalizedMode),
    luck: normalizeLuck(sourceBase),
    compatibility,
    rawResultSummary: buildRawResultSummary({ base: sourceBase, mode: normalizedMode, compatibility }),
    warnings,
    chapterConfigHint: config && typeof config === "object" ? {
      totalChapters: Number(config.totalChapters || 0) || undefined,
      title: clean(config.title),
    } : undefined,
  });
}
