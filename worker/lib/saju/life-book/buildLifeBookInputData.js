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

  const branches = [
    toStringSafe(yearRaw.branch || yearRaw.j),
    toStringSafe(monthRaw.branch || monthRaw.j),
    toStringSafe(dayRaw.branch || dayRaw.j),
    toStringSafe(hourRaw.branch || hourRaw.j),
  ].filter(Boolean);

  const hiddenStems = {};
  const pushHidden = (branchKey, rawBranch) => {
    const rawHidden = Array.isArray(rawBranch.hiddenStems) ? rawBranch.hiddenStems : [];
    if (!branchKey || !rawHidden.length) return;
    hiddenStems[branchKey] = rawHidden.map((item) => toStringSafe(item)).filter(Boolean);
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
    hiddenStems: Object.keys(hiddenStems).length ? hiddenStems : undefined,
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

function normalizeTenGods(canonical, engineData) {
  const dist = asObject(canonical?.tenGods?.distribution || engineData?.tenGods?.distribution || engineData?.tenGods);
  const normalized = {};
  for (const [key, value] of Object.entries(dist)) {
    const safeKey = toStringSafe(key);
    if (!safeKey) continue;
    normalized[safeKey] = toStringSafe(value);
  }
  if (!Object.keys(normalized).length) return undefined;
  return {
    byStem: normalized,
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

export function buildLifeBookInputData(body = {}, normalizedInput = {}) {
  const safeBody = asObject(body);
  const canonical = asObject(safeBody.canonicalSajuChart);
  const engineData = asObject(safeBody.engineData);
  const profile = asObject(canonical.profile);
  const sajuDataText = toStringSafe(safeBody.sajuData);

  const sajuChart = normalizePillars(canonical, engineData, sajuDataText);
  const fiveElements = normalizeFiveElements(canonical, engineData, sajuDataText);
  const yongshin = normalizeYongshin(canonical, engineData, sajuDataText);
  const tenGods = normalizeTenGods(canonical, engineData);
  const daeun = normalizeDaeun(canonical, engineData);
  const yearlyFortune = normalizeYearlyFortune(canonical, engineData);

  const missingCore = [];
  if (!sajuChart.yearPillar) missingCore.push("sajuChart.yearPillar");
  if (!sajuChart.monthPillar) missingCore.push("sajuChart.monthPillar");
  if (!sajuChart.dayPillar) missingCore.push("sajuChart.dayPillar");
  if (!sajuChart.dayMaster) missingCore.push("sajuChart.dayMaster");

  const birthDate = buildBirthDate(normalizedInput, profile, safeBody);
  if (!birthDate) missingCore.push("userProfile.birthDate");

  return {
    userProfile: {
      name: toStringSafe(safeBody.name || profile?.name || normalizedInput?.name || "") || undefined,
      gender: toStringSafe(safeBody.gender || profile?.gender || normalizedInput?.gender || "") || undefined,
      birthDate,
      birthTime: buildBirthTime(normalizedInput, profile, safeBody),
      calendarType: toStringSafe(safeBody.calendarType || profile?.birth?.calendarType || "solar") === "lunar" ? "lunar" : "solar",
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
    dataQuality: {
      missingCore,
      source: {
        hasCanonical: Object.keys(canonical).length > 0,
        hasEngineData: Object.keys(engineData).length > 0,
        hasSajuDataText: Boolean(sajuDataText),
      },
    },
  };
}
