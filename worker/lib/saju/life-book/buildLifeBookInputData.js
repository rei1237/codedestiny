function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toStringSafe(value) {
  return String(value == null ? "" : value).trim();
}

function toNumberSafe(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toStringSafe(item)).filter(Boolean);
}

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function collectAvailableFields(target, prefix = "") {
  const rows = [];
  if (!target || typeof target !== "object") return rows;

  for (const [key, value] of Object.entries(target)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      if (value.length > 0) rows.push(path);
      continue;
    }
    if (value && typeof value === "object") {
      const nested = collectAvailableFields(value, path);
      if (nested.length > 0) {
        rows.push(...nested);
      } else if (hasValue(value)) {
        rows.push(path);
      }
      continue;
    }
    if (hasValue(value)) rows.push(path);
  }

  return rows;
}

const STEM_META = Object.freeze({
  甲: { element: "wood", yinYang: "yang" },
  乙: { element: "wood", yinYang: "yin" },
  丙: { element: "fire", yinYang: "yang" },
  丁: { element: "fire", yinYang: "yin" },
  戊: { element: "earth", yinYang: "yang" },
  己: { element: "earth", yinYang: "yin" },
  庚: { element: "metal", yinYang: "yang" },
  辛: { element: "metal", yinYang: "yin" },
  壬: { element: "water", yinYang: "yang" },
  癸: { element: "water", yinYang: "yin" },
});

const KOREAN_STEM_TO_HAN = Object.freeze({
  갑: "甲",
  을: "乙",
  병: "丙",
  정: "丁",
  무: "戊",
  기: "己",
  경: "庚",
  신: "辛",
  임: "壬",
  계: "癸",
});

const ELEMENT_GENERATES = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

const ELEMENT_CONTROLS = Object.freeze({
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
});

const PLACEHOLDER_NAME_PATTERNS = [
  /^test\s*user$/i,
  /^user$/i,
  /^사용자$/,
  /^회원$/,
  /^guest$/i,
  /^anonymous$/i,
];

function joinPillar(stemLike, branchLike, ganjiLike) {
  const ganji = toStringSafe(ganjiLike);
  if (ganji) return ganji;
  const stem = toStringSafe(stemLike);
  const branch = toStringSafe(branchLike);
  return `${stem}${branch}`.trim();
}

function parseSajuDataLine(text, label) {
  const source = toStringSafe(text);
  if (!source) return "";
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*[:：-]\\s*([^\\n\\r]+)`, "i");
  const match = source.match(re);
  return match ? toStringSafe(match[1]) : "";
}

function parseSajuElementWeights(text) {
  const source = toStringSafe(text);
  if (!source) {
    return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  }

  const parseOne = (token) => {
    const match = source.match(new RegExp(`${token}[^0-9]*([0-9]+(?:\\.[0-9]+)?)`, "i"));
    return match ? toNumberSafe(match[1], 0) : 0;
  };

  return {
    wood: parseOne("목|wood"),
    fire: parseOne("화|fire"),
    earth: parseOne("토|earth"),
    metal: parseOne("금|metal"),
    water: parseOne("수|water"),
  };
}

function normalizePillars(canonical, engineData, sajuDataText) {
  const four = asObject(canonical.fourPillars);
  const enginePillars = asObject(engineData.pillars);

  const yearRaw = asObject(four.year || enginePillars.y || enginePillars.year);
  const monthRaw = asObject(four.month || enginePillars.m || enginePillars.month);
  const dayRaw = asObject(four.day || enginePillars.d || enginePillars.day);
  const hourRaw = asObject(four.hour || enginePillars.h || enginePillars.hour);

  const yearPillar = joinPillar(yearRaw.stem || yearRaw.g, yearRaw.branch || yearRaw.j, yearRaw.ganji)
    || parseSajuDataLine(sajuDataText, "년주");
  const monthPillar = joinPillar(monthRaw.stem || monthRaw.g, monthRaw.branch || monthRaw.j, monthRaw.ganji)
    || parseSajuDataLine(sajuDataText, "월주");
  const dayPillar = joinPillar(dayRaw.stem || dayRaw.g, dayRaw.branch || dayRaw.j, dayRaw.ganji)
    || parseSajuDataLine(sajuDataText, "일주");
  const hourPillar = joinPillar(hourRaw.stem || hourRaw.g, hourRaw.branch || hourRaw.j, hourRaw.ganji)
    || parseSajuDataLine(sajuDataText, "시주");

  const dayMaster =
    toStringSafe(canonical?.dayMaster?.stem)
    || toStringSafe(dayRaw.stem || dayRaw.g)
    || parseSajuDataLine(sajuDataText, "일간")
    || parseSajuDataLine(sajuDataText, "일간\(日干\)");

  const stems = [
    toStringSafe(yearRaw.stem || yearRaw.g),
    toStringSafe(monthRaw.stem || monthRaw.g),
    toStringSafe(dayRaw.stem || dayRaw.g),
    toStringSafe(hourRaw.stem || hourRaw.g),
  ].filter(Boolean);

  const pillarTenGods = {
    year: toStringSafe(yearRaw.tenGod || yearRaw.tenStar || yearRaw.star || "") || undefined,
    month: toStringSafe(monthRaw.tenGod || monthRaw.tenStar || monthRaw.star || "") || undefined,
    day: toStringSafe(dayRaw.tenGod || dayRaw.tenStar || dayRaw.star || "") || undefined,
    hour: toStringSafe(hourRaw.tenGod || hourRaw.tenStar || hourRaw.star || "") || undefined,
  };

  const branches = [
    toStringSafe(yearRaw.branch || yearRaw.j),
    toStringSafe(monthRaw.branch || monthRaw.j),
    toStringSafe(dayRaw.branch || dayRaw.j),
    toStringSafe(hourRaw.branch || hourRaw.j),
  ].filter(Boolean);

  const hiddenStems = {};
  const hiddenStemTenGods = {};
  const normalizeHiddenStemItem = (item) => {
    if (item && typeof item === "object") {
      return {
        stem: toStringSafe(item.stem || item.gan || item.g || item.value || ""),
        tenGod: toStringSafe(item.tenGod || item.tenStar || item.star || "") || undefined,
      };
    }
    return {
      stem: toStringSafe(item),
      tenGod: undefined,
    };
  };

  const pushHidden = (branchKey, rawBranch) => {
    const rawHidden = Array.isArray(rawBranch.hiddenStems) ? rawBranch.hiddenStems : [];
    if (!branchKey || !rawHidden.length) return;
    const normalizedHidden = rawHidden
      .map((item) => normalizeHiddenStemItem(item))
      .filter((item) => item.stem);
    if (!normalizedHidden.length) return;
    hiddenStems[branchKey] = normalizedHidden.map((item) => item.stem);
    const hasTenGod = normalizedHidden.some((item) => item.tenGod);
    if (hasTenGod) {
      hiddenStemTenGods[branchKey] = normalizedHidden
        .map((item) => ({ stem: item.stem, tenGod: item.tenGod || undefined }));
    }
  };

  pushHidden(toStringSafe(yearRaw.branch || yearRaw.j), yearRaw);
  pushHidden(toStringSafe(monthRaw.branch || monthRaw.j), monthRaw);
  pushHidden(toStringSafe(dayRaw.branch || dayRaw.j), dayRaw);
  pushHidden(toStringSafe(hourRaw.branch || hourRaw.j), hourRaw);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar: hourPillar || undefined,
    dayMaster,
    stems,
    branches,
    pillarStems: {
      year: toStringSafe(yearRaw.stem || yearRaw.g) || undefined,
      month: toStringSafe(monthRaw.stem || monthRaw.g) || undefined,
      day: toStringSafe(dayRaw.stem || dayRaw.g) || undefined,
      hour: toStringSafe(hourRaw.stem || hourRaw.g) || undefined,
    },
    pillarTenGods,
    hiddenStems: Object.keys(hiddenStems).length ? hiddenStems : undefined,
    hiddenStemTenGods: Object.keys(hiddenStemTenGods).length ? hiddenStemTenGods : undefined,
  };
}

function normalizeFiveElements(canonical, engineData, sajuDataText) {
  const fromCanonical = asObject(canonical.fiveElements);
  const fromEngine = asObject(engineData.elementWeights);
  const fromText = parseSajuElementWeights(sajuDataText);

  const wood = toNumberSafe(fromCanonical.wood, toNumberSafe(fromEngine.wood, fromText.wood));
  const fire = toNumberSafe(fromCanonical.fire, toNumberSafe(fromEngine.fire, fromText.fire));
  const earth = toNumberSafe(fromCanonical.earth, toNumberSafe(fromEngine.earth, fromText.earth));
  const metal = toNumberSafe(fromCanonical.metal, toNumberSafe(fromEngine.metal, fromText.metal));
  const water = toNumberSafe(fromCanonical.water, toNumberSafe(fromEngine.water, fromText.water));

  const ordered = [
    ["wood", wood],
    ["fire", fire],
    ["earth", earth],
    ["metal", metal],
    ["water", water],
  ].sort((a, b) => b[1] - a[1]);

  return {
    wood,
    fire,
    earth,
    metal,
    water,
    strongest: ordered.filter((item, idx) => idx < 2 && item[1] > 0).map((item) => item[0]),
    weakest: ordered.slice(-2).map((item) => item[0]),
    balanceSummary: toStringSafe(fromCanonical.balanceComment || fromCanonical.balanceSummary || ""),
  };
}

function extractHeavenlyStem(value) {
  const source = toStringSafe(value);
  if (!source) return "";
  for (const ch of source) {
    if (STEM_META[ch]) return ch;
  }
  for (const [kor, han] of Object.entries(KOREAN_STEM_TO_HAN)) {
    if (source.includes(kor)) return han;
  }
  return "";
}

function classifyTenGodByStem(dayMasterStem, targetStem) {
  const dmStem = extractHeavenlyStem(dayMasterStem);
  const tgStem = extractHeavenlyStem(targetStem);
  if (!dmStem || !tgStem) return "";

  const dmMeta = STEM_META[dmStem];
  const tgMeta = STEM_META[tgStem];
  if (!dmMeta || !tgMeta) return "";

  const samePolarity = dmMeta.yinYang === tgMeta.yinYang;
  const dmElement = dmMeta.element;
  const tgElement = tgMeta.element;

  if (dmElement === tgElement) return samePolarity ? "비견" : "겁재";
  if (ELEMENT_GENERATES[dmElement] === tgElement) return samePolarity ? "식신" : "상관";
  if (ELEMENT_CONTROLS[dmElement] === tgElement) return samePolarity ? "편재" : "정재";
  if (ELEMENT_CONTROLS[tgElement] === dmElement) return samePolarity ? "편관" : "정관";
  if (ELEMENT_GENERATES[tgElement] === dmElement) return samePolarity ? "편인" : "정인";
  return "";
}

function normalizeTenGodDistribution(dist) {
  const source = asObject(dist);
  const normalized = {};
  for (const [key, value] of Object.entries(source)) {
    const safeKey = toStringSafe(key);
    if (!safeKey) continue;
    normalized[safeKey] = toNumberSafe(value, 0);
  }
  return normalized;
}

function buildVerifiedStemTenGods(sajuChart = {}) {
  const dayMasterStem = extractHeavenlyStem(sajuChart.dayMaster);
  if (!dayMasterStem) {
    return {
      dayMasterStem: "",
      byStem: {},
      byOccurrence: [],
      distribution: {},
    };
  }

  const byStem = {};
  const byOccurrence = [];
  const distribution = {};
  const pushOccurrence = (stemLike, label) => {
    const stem = extractHeavenlyStem(stemLike);
    if (!stem) return;
    const tenGod = classifyTenGodByStem(dayMasterStem, stem);
    if (!tenGod) return;
    byStem[stem] = tenGod;
    byOccurrence.push({ stem, tenGod, label: toStringSafe(label) || undefined });
    distribution[tenGod] = toNumberSafe(distribution[tenGod], 0) + 1;
  };

  pushOccurrence(sajuChart?.pillarStems?.year, "년간");
  pushOccurrence(sajuChart?.pillarStems?.month, "월간");
  pushOccurrence(sajuChart?.pillarStems?.day, "일간");
  pushOccurrence(sajuChart?.pillarStems?.hour, "시간");

  const hiddenStems = asObject(sajuChart.hiddenStems);
  for (const [branch, stems] of Object.entries(hiddenStems)) {
    const list = Array.isArray(stems) ? stems : [];
    list.forEach((stem, index) => {
      pushOccurrence(stem, `${branch} 지장간 ${index + 1}`);
    });
  }

  return {
    dayMasterStem,
    byStem,
    byOccurrence,
    distribution,
  };
}

function normalizeTenGods(canonical, engineData, sajuChart) {
  const canonicalDist = normalizeTenGodDistribution(canonical?.tenGods?.distribution);
  const engineDist = normalizeTenGodDistribution(engineData?.tenGods?.distribution || engineData?.tenGods);
  const verified = buildVerifiedStemTenGods(sajuChart);
  const verifiedDist = normalizeTenGodDistribution(verified.distribution);

  const pickedDistribution = Object.keys(canonicalDist).length
    ? canonicalDist
    : Object.keys(engineDist).length
      ? engineDist
      : verifiedDist;

  if (!Object.keys(pickedDistribution).length && !Object.keys(verified.byStem).length) return undefined;

  return {
    distribution: pickedDistribution,
    sourceDistribution: {
      canonical: canonicalDist,
      engine: engineDist,
      verified: verifiedDist,
    },
    verifiedStemTenGodMap: verified.byStem,
    verifiedByOccurrence: verified.byOccurrence,
    dayMasterStem: verified.dayMasterStem || extractHeavenlyStem(sajuChart?.dayMaster),
    summary: toStringSafe(canonical?.tenGods?.summary || ""),
  };
}

function normalizeYongshin(canonical, engineData, sajuDataText) {
  const useful = asObject(canonical.usefulGods || engineData.usefulGods);
  const fromText = {
    yongshin: parseSajuDataLine(sajuDataText, "용신"),
    heeshin: parseSajuDataLine(sajuDataText, "희신"),
    gishin: parseSajuDataLine(sajuDataText, "기신"),
  };

  const yongshin = toStringArray([
    useful?.yongsin?.element,
    fromText.yongshin,
  ]);
  const heeshin = toStringArray([
    useful?.huisin?.element,
    fromText.heeshin,
  ]);
  const gishin = toStringArray([
    useful?.gisin?.element,
    fromText.gishin,
  ]);

  if (!yongshin.length && !heeshin.length && !gishin.length) return undefined;

  return {
    yongshin,
    heeshin,
    gishin,
    reason: toStringSafe(useful?.yongsin?.reason || ""),
  };
}

function normalizeDaeun(canonical, engineData) {
  const cycles = Array.isArray(canonical?.luckCycles?.daewoon)
    ? canonical.luckCycles.daewoon
    : Array.isArray(engineData?.luckCycles?.daewoon)
      ? engineData.luckCycles.daewoon
      : Array.isArray(engineData?.daewoon)
        ? engineData.daewoon
        : [];

  return cycles
    .map((row) => ({
      ageStart: toNumberSafe(row?.ageStart ?? row?.startAge, 0),
      ageEnd: toNumberSafe(row?.ageEnd ?? row?.endAge, 0) || undefined,
      pillar: toStringSafe(row?.pillar || row?.ganji || row?.label || ""),
      summary: toStringSafe(row?.summary || ""),
      wealth: toStringSafe(row?.wealth || ""),
      career: toStringSafe(row?.career || ""),
      love: toStringSafe(row?.love || ""),
      health: toStringSafe(row?.health || ""),
    }))
    .filter((row) => row.ageStart > 0 || row.pillar);
}

function normalizeYearlyFortune(canonical, engineData) {
  const rows = Array.isArray(canonical?.annualLuck?.timeline)
    ? canonical.annualLuck.timeline
    : Array.isArray(engineData?.annualLuck?.timeline)
      ? engineData.annualLuck.timeline
      : [];

  const list = rows
    .map((row) => ({
      year: toNumberSafe(row?.year, 0),
      pillar: toStringSafe(row?.ganji || row?.pillar || "") || undefined,
      summary: toStringSafe(row?.summary || "") || undefined,
      opportunities: toStringArray(row?.opportunities),
      cautions: toStringArray(row?.cautions),
    }))
    .filter((row) => row.year > 0);

  if (list.length) return list;

  const singleYear = toNumberSafe(canonical?.annualLuck?.year || engineData?.annualLuck?.year, 0);
  if (singleYear > 0) {
    return [{
      year: singleYear,
      pillar: toStringSafe(canonical?.annualLuck?.ganji || engineData?.annualLuck?.ganji || "") || undefined,
      summary: toStringSafe(canonical?.annualLuck?.summary || engineData?.annualLuck?.summary || "") || undefined,
      opportunities: [],
      cautions: [],
    }];
  }

  return [];
}

function buildBirthDate(normalizedInput, profile, body) {
  const fromInput = [
    toNumberSafe(normalizedInput?.year, 0),
    toNumberSafe(normalizedInput?.month, 0),
    toNumberSafe(normalizedInput?.day, 0),
  ];

  if (fromInput.every((n) => n > 0)) {
    return `${String(fromInput[0]).padStart(4, "0")}-${String(fromInput[1]).padStart(2, "0")}-${String(fromInput[2]).padStart(2, "0")}`;
  }

  const profileSolarDate = toStringSafe(profile?.birth?.solarDate || body?.birthDate || body?.solarDate);
  if (profileSolarDate) return profileSolarDate;
  return "";
}

function buildBirthTime(normalizedInput, profile, body) {
  const hour = toNumberSafe(normalizedInput?.hour, -1);
  const minute = toNumberSafe(normalizedInput?.minute, -1);
  if (hour >= 0 && minute >= 0) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const profileTime = toStringSafe(profile?.birth?.time || body?.birthTime || body?.time);
  return profileTime || undefined;
}

function isPlaceholderName(name) {
  const value = toStringSafe(name);
  if (!value) return false;
  return PLACEHOLDER_NAME_PATTERNS.some((pattern) => pattern.test(value));
}

function resolveProfileName(normalizedInput, profile, body) {
  const candidates = [
    toStringSafe(profile?.name),
    toStringSafe(normalizedInput?.name),
    toStringSafe(body?.profile?.name),
    toStringSafe(body?.userProfile?.name),
    toStringSafe(body?.name),
    toStringSafe(body?.user?.name),
  ].filter(Boolean);

  const nonPlaceholder = candidates.find((name) => !isPlaceholderName(name));
  if (nonPlaceholder) return nonPlaceholder;
  return candidates[0] || undefined;
}

export function buildLifeBookInputData(body = {}, normalizedInput = {}) {
  const safeBody = asObject(body);
  const canonical = asObject(safeBody.canonicalSajuChart);
  const engineData = asObject(safeBody.engineData);
  const profile = asObject(canonical.profile);
  const sajuDataText = toStringSafe(safeBody.sajuData);

  const sajuChart = normalizePillars(canonical, engineData, sajuDataText);
  const fiveElements = normalizeFiveElements(canonical, engineData, sajuDataText);
  const yongshin = normalizeYongshin(canonical, engineData, sajuDataText);
  const tenGods = normalizeTenGods(canonical, engineData, sajuChart);
  const daeun = normalizeDaeun(canonical, engineData);
  const yearlyFortune = normalizeYearlyFortune(canonical, engineData);
  const promptSource = asObject(safeBody.promptContext || safeBody.questionPrompt || {});

  const missingCore = [];
  if (!sajuChart.yearPillar) missingCore.push("sajuChart.yearPillar");
  if (!sajuChart.monthPillar) missingCore.push("sajuChart.monthPillar");
  if (!sajuChart.dayPillar) missingCore.push("sajuChart.dayPillar");
  if (!sajuChart.dayMaster) missingCore.push("sajuChart.dayMaster");

  const birthDate = buildBirthDate(normalizedInput, profile, safeBody);
  if (!birthDate) missingCore.push("userProfile.birthDate");
  const resolvedName = resolveProfileName(normalizedInput, profile, safeBody);
  const gender = toStringSafe(safeBody.gender || profile?.gender || normalizedInput?.gender || "") || "unknown";
  const calendarType = toStringSafe(safeBody.calendarType || profile?.birth?.calendarType || "solar") === "lunar" ? "lunar" : "solar";

  const requiredMissing = [];
  if (!birthDate) requiredMissing.push("profile.birthDate");
  if (!hasValue(gender)) requiredMissing.push("profile.gender");
  if (!hasValue(calendarType)) requiredMissing.push("profile.calendarType");

  const hasCoreChart = hasValue(sajuChart?.dayPillar) || hasValue(sajuChart?.dayMaster);
  if (!hasCoreChart && !birthDate) {
    requiredMissing.push("saju.dayPillar|profile.birthDate");
  }

  const lifeBookContext = {
    profile: {
      name: resolvedName,
      gender,
      birthDate: birthDate || "",
      birthTime: buildBirthTime(normalizedInput, profile, safeBody),
      calendarType,
      birthPlace: toStringSafe(safeBody.location || profile?.birth?.locationName || safeBody.birthPlace || "") || undefined,
    },
    saju: {
      yearPillar: sajuChart.yearPillar || undefined,
      monthPillar: sajuChart.monthPillar || undefined,
      dayPillar: sajuChart.dayPillar || undefined,
      hourPillar: sajuChart.hourPillar || undefined,
      dayMaster: sajuChart.dayMaster || undefined,
      monthBranch: toStringSafe(sajuChart?.monthPillar || "").slice(1) || undefined,
      fiveElements,
      tenGods,
      hiddenStems: sajuChart.hiddenStems,
      combinationsConflicts: canonical?.relations || engineData?.relations || undefined,
      seasonalBalance: toStringSafe(canonical?.seasonalBalance || canonical?.dayMaster?.strength || "") || undefined,
      usefulGod: toStringArray(yongshin?.yongshin).join(", ") || undefined,
      favorableGod: toStringArray(yongshin?.heeshin).join(", ") || undefined,
      unfavorableGod: toStringArray(yongshin?.gishin).join(", ") || undefined,
      structureType: toStringSafe(canonical?.geokguk?.name || engineData?.geokguk?.name || "") || undefined,
      twelveStages: canonical?.twelveStages || engineData?.twelveStages || undefined,
      specialStars: canonical?.specialStars || engineData?.specialStars || undefined,
    },
    fortuneCycles: {
      daeun,
      seun: yearlyFortune,
      monthly: asObject(canonical?.monthlyLuck || engineData?.monthlyLuck),
    },
    promptContext: {
      generatedQuestionPrompt: toStringSafe(promptSource?.generatedQuestionPrompt || safeBody?.generatedQuestionPrompt || "") || undefined,
      engineSummary: toStringSafe(promptSource?.engineSummary || safeBody?.engineSummary || "") || undefined,
      userQuestion: toStringSafe(promptSource?.userQuestion || safeBody?.userQuestion || "") || undefined,
    },
    meta: {
      missingFields: [],
      availableFields: [],
      generatedAt: new Date().toISOString(),
    },
  };

  const availableFields = Array.from(new Set(collectAvailableFields(lifeBookContext))).sort();
  const optionalMissing = [
    !hasValue(lifeBookContext?.fortuneCycles?.daeun) ? "fortuneCycles.daeun" : "",
    !hasValue(lifeBookContext?.fortuneCycles?.seun) ? "fortuneCycles.seun" : "",
    !hasValue(lifeBookContext?.saju?.specialStars) ? "saju.specialStars" : "",
    !hasValue(lifeBookContext?.saju?.twelveStages) ? "saju.twelveStages" : "",
    !hasValue(lifeBookContext?.saju?.usefulGod) ? "saju.usefulGod" : "",
    !hasValue(lifeBookContext?.saju?.structureType) ? "saju.structureType" : "",
    !hasValue(lifeBookContext?.promptContext?.generatedQuestionPrompt) ? "promptContext.generatedQuestionPrompt" : "",
  ].filter(Boolean);

  lifeBookContext.meta.missingFields = Array.from(new Set([...requiredMissing, ...optionalMissing]));
  lifeBookContext.meta.availableFields = availableFields;

  return {
    userProfile: {
      name: resolvedName,
      gender,
      birthDate,
      birthTime: buildBirthTime(normalizedInput, profile, safeBody),
      calendarType,
      location: toStringSafe(safeBody.location || profile?.birth?.locationName || safeBody.birthPlace || "") || undefined,
    },
    sajuChart,
    fiveElements,
    tenGods,
    strength: {
      dayMasterStrength: toStringSafe(canonical?.dayMaster?.strength || engineData?.dayMaster?.strength || "") || undefined,
      reason: toStringSafe(canonical?.dayMaster?.reasoning?.[0] || "") || undefined,
    },
    yongshin,
    geokguk: {
      name: toStringSafe(canonical?.geokguk?.name || engineData?.geokguk?.name || "") || undefined,
      reason: toStringSafe(canonical?.geokguk?.reason || engineData?.geokguk?.reason || "") || undefined,
      socialMeaning: toStringSafe(canonical?.geokguk?.socialMeaning || engineData?.geokguk?.socialMeaning || "") || undefined,
    },
    daeun,
    yearlyFortune,
    relationship: {
      loveStyle: toStringSafe(canonical?.relationship?.loveStyle || engineData?.relationship?.loveStyle || "") || undefined,
      spouseStar: toStringSafe(canonical?.relationship?.spouseStar || engineData?.relationship?.spouseStar || "") || undefined,
      relationshipPattern: toStringSafe(canonical?.relationship?.relationshipPattern || engineData?.relationship?.relationshipPattern || "") || undefined,
    },
    careerWealth: {
      careerDirection: toStringArray(canonical?.careerWealth?.careerDirection || engineData?.careerWealth?.careerDirection || []),
      wealthPattern: toStringSafe(canonical?.careerWealth?.wealthPattern || engineData?.careerWealth?.wealthPattern || "") || undefined,
      suitableFields: toStringArray(canonical?.careerWealth?.suitableFields || engineData?.careerWealth?.suitableFields || []),
    },
    healthMind: {
      energyPattern: toStringSafe(canonical?.healthMind?.energyPattern || engineData?.healthMind?.energyPattern || "") || undefined,
      stressPattern: toStringSafe(canonical?.healthMind?.stressPattern || engineData?.healthMind?.stressPattern || "") || undefined,
      recoveryTips: toStringArray(canonical?.healthMind?.recoveryTips || engineData?.healthMind?.recoveryTips || []),
    },
    rawEngineResult: safeBody.rawEngineResult || safeBody.engineData || safeBody.canonicalSajuChart || safeBody.sajuData || null,
    lifeBookContext,
    dataQuality: {
      missingCore,
      missingRequired: requiredMissing,
      missingOptional: optionalMissing,
      hasMinimumProfile: requiredMissing.length === 0,
      source: {
        hasCanonical: Object.keys(canonical).length > 0,
        hasEngineData: Object.keys(engineData).length > 0,
        hasSajuDataText: Boolean(sajuDataText),
      },
    },
  };
}
