const ALLOWED_MODES = new Set(["personal", "compatibility"]);

function asText(value) {
  const text = String(value == null ? "" : value).trim();
  return text;
}

function normalizeMode(mode) {
  const raw = asText(mode).toLowerCase();
  if (raw === "solo") return "personal";
  if (raw === "couple" || raw === "compat") return "compatibility";
  return raw || "personal";
}

function pad2(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(Math.trunc(n)).padStart(2, "0");
}

function coerceBirthDate(profile = {}) {
  const direct = asText(profile.birthDate);
  if (direct) return direct;
  const y = asText(profile.year);
  const m = pad2(profile.month);
  const d = pad2(profile.day);
  if (y && m && d) return `${y}-${m}-${d}`;
  return "";
}

function coerceBirthTime(profile = {}) {
  const direct = asText(profile.birthTime);
  if (direct) return direct;
  const h = pad2(profile.hour);
  const mm = pad2(profile.minute || 0);
  if (h) return `${h}:${mm || "00"}`;
  return "";
}

function normalizeBirthProfile(profile = {}) {
  const src = profile && typeof profile === "object" ? profile : {};
  return {
    name: asText(src.name) || "사용자",
    birthDate: coerceBirthDate(src),
    birthTime: coerceBirthTime(src),
    gender: asText(src.gender),
    calendarType: asText(src.calendarType || src.calendar || "solar") || "solar",
    timezone: asText(src.timezone || "Asia/Seoul") || "Asia/Seoul",
  };
}

function hasAnyOwnKey(obj) {
  return Boolean(obj && typeof obj === "object" && Object.keys(obj).length > 0);
}

function detectDataQuality(engineResult, exampleResult, normalizedSeed) {
  const engineKeys = hasAnyOwnKey(engineResult) ? Object.keys(engineResult) : [];
  if (engineKeys.length >= 6) return "full";
  if (engineKeys.length > 0) return "partial";
  if (hasAnyOwnKey(normalizedSeed) && exampleResult) return "example-assisted";
  return "minimal";
}

export function validateHardRequiredPremiumInput({
  userId,
  sessionId,
  featureKey,
  reportType,
  mode,
  birthProfile,
  partnerBirthProfile,
  requirePartner = false,
}) {
  const missingFields = [];
  if (!asText(userId) && !asText(sessionId)) missingFields.push("userId|sessionId");
  if (!asText(featureKey)) missingFields.push("featureKey");
  if (!asText(reportType)) missingFields.push("reportType");
  const normalizedMode = normalizeMode(mode);
  if (!ALLOWED_MODES.has(normalizedMode)) missingFields.push("mode");

  const profile = normalizeBirthProfile(birthProfile);
  if (!asText(profile.name)) missingFields.push("birthProfile.name");
  if (!asText(profile.birthDate)) missingFields.push("birthProfile.birthDate");
  if (!asText(profile.birthTime)) missingFields.push("birthProfile.birthTime");
  if (!asText(profile.gender)) missingFields.push("birthProfile.gender");

  if (requirePartner || normalizedMode === "compatibility") {
    const partner = normalizeBirthProfile(partnerBirthProfile);
    if (!asText(partner.birthDate)) missingFields.push("partnerBirthProfile.birthDate");
    if (!asText(partner.birthTime)) missingFields.push("partnerBirthProfile.birthTime");
    if (!asText(partner.gender)) missingFields.push("partnerBirthProfile.gender");
  }

  if (missingFields.length > 0) {
    return {
      ok: false,
      code: "PDF_REQUIRED_INPUT_MISSING",
      message: "PDF 생성 필수 입력이 누락되었습니다.",
      missingFields,
      mode: normalizedMode,
    };
  }

  return { ok: true, missingFields: [], mode: normalizedMode };
}

export function buildPdfSeed(args = {}) {
  const featureKey = asText(args.featureKey);
  const reportType = asText(args.reportType);
  const mode = normalizeMode(args.mode);
  const birthProfile = normalizeBirthProfile(args.birthProfile);
  const partnerBirthProfile = hasAnyOwnKey(args.partnerBirthProfile)
    ? normalizeBirthProfile(args.partnerBirthProfile)
    : undefined;
  const availableEngineData = args.engineResult && typeof args.engineResult === "object" ? args.engineResult : {};
  const normalizedSeed = {
    birthProfile,
    partnerBirthProfile,
    targetYear: Number.isFinite(Number(args.questionPromptData?.targetYear || args.targetYear))
      ? Number(args.questionPromptData?.targetYear || args.targetYear)
      : undefined,
    mode,
    reportType,
  };

  const missingFields = [];
  if (!birthProfile.birthDate) missingFields.push("birthProfile.birthDate");
  if (!birthProfile.birthTime) missingFields.push("birthProfile.birthTime");

  const dataQuality = detectDataQuality(availableEngineData, args.exampleResult, normalizedSeed);
  const warnings = [];
  if (dataQuality !== "full") {
    warnings.push("Some optional engine fields were missing, generated with example-assisted seed");
  }

  return {
    ok: true,
    featureKey,
    reportType,
    mode,
    birthProfile,
    partnerBirthProfile,
    dataQuality,
    availableEngineData,
    normalizedSeed,
    exampleResult: args.exampleResult || null,
    chapterBlueprint: args.chapterBlueprint || null,
    llmInstruction: "example-guided-premium-pdf",
    missingFields,
    warnings,
  };
}

export function maskBirthProfileForLog(profile = {}) {
  const p = normalizeBirthProfile(profile);
  return {
    name: p.name ? `${p.name.slice(0, 1)}*` : "",
    birthDate: p.birthDate ? `${p.birthDate.slice(0, 4)}-**-**` : "",
    birthTime: p.birthTime ? `${p.birthTime.slice(0, 2)}:**` : "",
    gender: p.gender,
  };
}
