import { LIFE_BOOK_TOTAL_CHAPTERS } from "./chapterConfig.js";

const LIFEBOOK_FORBIDDEN_PHRASES = [
  "생성 상태 안내",
  "서버 응답이 불안정",
  "구조화된 스켈레톤",
  "스켈레톤",
  "기본 골격",
  "다음 생성 시",
  "자동 재작성",
  "자동 복구",
  "복구 생성",
  "fallback",
  "placeholder",
  "Chapter 1",
  "Chapter 2",
  "원인:",
  "기본 사주 분석을 먼저 실행",
  "이 섹션은 챕터 구조 보존을 위한 기본 골격입니다",
  "JSON payload",
  "raw payload",
  "engine raw",
  "계산 실패",
  "데이터 없음",
  "compatibility",
  "partner",
  "synastry",
  "matching",
  "두 사람",
  "상대방 사주",
  "궁합 분석",
];

export const FEATURE_KEY_SAJU_LIFE_BOOK_PDF = "saju_life_book_pdf";

function toText(value) {
  return String(value == null ? "" : value).trim();
}

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item));
  if (typeof value === "object") return Object.values(value).some((item) => hasMeaningfulValue(item));
  return false;
}

function listMissingSignals(target, prefix = "") {
  const missing = [];
  const source = toObject(target);
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!hasMeaningfulValue(value)) {
      missing.push(path);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      missing.push(...listMissingSignals(value, path));
    }
  }
  return missing;
}

function listAvailableSignals(target, prefix = "") {
  const rows = [];
  const source = toObject(target);
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!hasMeaningfulValue(value)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = listAvailableSignals(value, path);
      if (nested.length) {
        rows.push(...nested);
      } else {
        rows.push(path);
      }
      continue;
    }
    rows.push(path);
  }
  return rows;
}

function includesForbiddenPhrase(text) {
  const source = toText(text).toLowerCase();
  for (const phrase of LIFEBOOK_FORBIDDEN_PHRASES) {
    if (!phrase) continue;
    if (source.includes(phrase.toLowerCase())) return phrase;
  }
  return "";
}

export function assertNoSajuLifeBookFallbackText(text, meta = {}) {
  const hit = includesForbiddenPhrase(text);
  if (hit) {
    const error = new Error(`SAJU_LIFEBOOK_FORBIDDEN_PHRASE_DETECTED:${hit}`);
    error.code = "SAJU_LIFEBOOK_FORBIDDEN_PHRASE_DETECTED";
    error.foundPhrase = hit;
    error.meta = {
      requestId: toText(meta?.requestId),
      userId: toText(meta?.userId),
      mode: toText(meta?.mode),
      chapterId: toText(meta?.chapterId),
      categoryId: toText(meta?.categoryId),
      hasSourceData: Boolean(meta?.hasSourceData),
      payloadValidation: toObject(meta?.payloadValidation),
      llmRetryCount: Number(meta?.llmRetryCount || 0),
    };
    throw error;
  }
  return true;
}

function normalizePillarRow(value) {
  if (typeof value === "string") {
    const text = toText(value);
    const stem = text.charAt(0);
    const branch = text.charAt(1);
    return {
      stem,
      branch,
      ganji: text,
      stemElement: "",
      branchElement: "",
      tenGod: "",
      hiddenStems: [],
    };
  }
  const row = toObject(value);
  return {
    stem: toText(row.stem),
    branch: toText(row.branch),
    ganji: toText(row.ganji || `${toText(row.stem)}${toText(row.branch)}`),
    stemElement: toText(row.stemElement),
    branchElement: toText(row.branchElement),
    tenGod: toText(row.tenGod),
    hiddenStems: toArray(row.hiddenStems).map((item) => toText(item)).filter(Boolean),
  };
}

function deriveChartSignature(lifeBookInputData = {}) {
  const chart = toObject(lifeBookInputData?.sajuChart);
  const userProfile = toObject(lifeBookInputData?.userProfile);
  const pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar].filter(Boolean).join("-");
  const dayMaster = toText(chart.dayMaster);
  const birth = [toText(userProfile.birthDate), toText(userProfile.birthTime)].filter(Boolean).join(" ");
  return [birth, pillars, dayMaster].filter(Boolean).join("|") || pillars || dayMaster;
}

function normalizeLifeBookContext(lifeBookInputData = {}) {
  const userProfile = toObject(lifeBookInputData?.userProfile);
  const sajuChart = toObject(lifeBookInputData?.sajuChart);
  const fiveElements = toObject(lifeBookInputData?.fiveElements);
  const tenGods = toObject(lifeBookInputData?.tenGods);
  const yongshin = toObject(lifeBookInputData?.yongshin);
  const geokguk = toObject(lifeBookInputData?.geokguk);
  const daeun = toArray(lifeBookInputData?.daeun);
  const yearlyFortune = toArray(lifeBookInputData?.yearlyFortune);
  const relationship = toObject(lifeBookInputData?.relationship);
  const careerWealth = toObject(lifeBookInputData?.careerWealth);
  const healthMind = toObject(lifeBookInputData?.healthMind);
  const lifeThemes = toObject(lifeBookInputData?.lifeBookContext?.lifeThemes || {});

  return {
    user: {
      name: toText(userProfile.name),
      gender: toText(userProfile.gender),
      birthInfo: {
        birthDate: toText(userProfile.birthDate),
        birthTime: toText(userProfile.birthTime),
        calendarType: toText(userProfile.calendarType || "solar"),
        timezone: toText(userProfile.timezone || lifeBookInputData?.lifeBookContext?.profile?.timezone || "Asia/Seoul"),
      },
    },
    saju: {
      chartId: toText(lifeBookInputData?.chartId || lifeBookInputData?.chartSignature || deriveChartSignature(lifeBookInputData)),
      chartSignature: toText(lifeBookInputData?.chartSignature || deriveChartSignature(lifeBookInputData)),
      pillars: {
        year: normalizePillarRow(sajuChart.yearPillar || sajuChart.pillars?.year),
        month: normalizePillarRow(sajuChart.monthPillar || sajuChart.pillars?.month),
        day: normalizePillarRow(sajuChart.dayPillar || sajuChart.pillars?.day),
        hour: normalizePillarRow(sajuChart.hourPillar || sajuChart.pillars?.hour),
      },
      dayMaster: toText(sajuChart.dayMaster),
      dayPillar: normalizePillarRow(sajuChart.dayPillar || sajuChart.pillars?.day),
      elements: fiveElements,
      elementScores: fiveElements,
      tenGods,
      hiddenStems: toObject(sajuChart.hiddenStems),
      twelveStages: toArray(lifeBookInputData?.lifeBookContext?.saju?.twelveStages || lifeBookInputData?.saju?.twelveStages),
      usefulGods: {
        yongsin: toArray(yongshin.yongshin).map((item) => toText(item)).filter(Boolean),
        heeshin: toArray(yongshin.heeshin).map((item) => toText(item)).filter(Boolean),
        gishin: toArray(yongshin.gishin).map((item) => toText(item)).filter(Boolean),
      },
      specialStars: toArray(lifeBookInputData?.lifeBookContext?.saju?.specialStars || lifeBookInputData?.saju?.specialStars),
      luckCycles: {
        daeun,
        currentDaewoon: toObject(lifeBookInputData?.lifeBookContext?.saju?.luckCycles?.currentDaewoon || lifeBookInputData?.saju?.luckCycles?.currentDaewoon),
      },
      yearlyFlow: yearlyFortune,
      chartSummary: {
        strength: toText(lifeBookInputData?.strength?.dayMasterStrength),
        geokguk: toText(geokguk.name),
        relationship: toText(relationship.relationshipPattern),
        career: toArray(careerWealth.careerDirection),
        health: toText(healthMind.energyPattern),
      },
    },
    context: {
      geokguk,
      relationship,
      careerWealth,
      healthMind,
      lifeThemes,
      source: toObject(lifeBookInputData?.lifeBookContext || {}),
    },
  };
}

function buildCategorySourceDataByChapter(chapterNumber, categoryTitle, normalized) {
  const profile = normalized.user;
  const saju = normalized.saju;
  const context = normalized.context;
  const chapterId = Number(chapterNumber) || 0;
  const category = toText(categoryTitle);
  const base = {
    mode: "lifeBook",
    chapterId,
    categoryTitle: category,
    user: profile,
    saju,
  };

  if (chapterId === 1) {
    return {
      ...base,
      sourceData: {
        pillars: saju.pillars,
        dayMaster: saju.dayMaster,
        elements: saju.elements,
        structure: {
          geokguk: context.geokguk,
          chartSummary: saju.chartSummary,
        },
        tenGods: saju.tenGods,
        summarySignals: toArray(context?.source?.saju?.summarySignals || context?.source?.summarySignals),
      },
      writingInstruction: "pillars, dayMaster, fiveElements, structure, summarySignals 범위에서 원국 총론을 해석한다.",
    };
  }

  if (chapterId === 2) {
    return {
      ...base,
      sourceData: {
        dayMaster: saju.dayMaster,
        dayPillar: saju.pillars.day,
        dayMasterStrength: saju.chartSummary?.strength,
        monthBranch: saju.pillars.month.branch || saju.pillars.month.ganji,
        twelveStages: saju.twelveStages,
      },
      writingInstruction: "dayMaster, day pillar, day master strength, twelveStages 범위에서 일간 심층 분석을 작성한다.",
    };
  }

  if (chapterId === 3) {
    return {
      ...base,
      sourceData: {
        elements: saju.elements,
      },
      writingInstruction: "fiveElements 전체 신호를 기준으로 오행 균형과 생활 전략을 작성한다.",
    };
  }

  if (chapterId === 4) {
    return {
      ...base,
      sourceData: {
        tenGods: saju.tenGods,
      },
      writingInstruction: "tenGods 전체 분포를 근거로 재능/관계/욕망 구조를 작성한다.",
    };
  }

  if (chapterId === 5) {
    return {
      ...base,
      sourceData: {
        structure: {
          geokguk: context.geokguk,
          chartSummary: saju.chartSummary,
        },
        chartPattern: toText(context?.source?.saju?.structure?.chartPattern || context?.source?.saju?.chartPattern),
        usefulGod: saju.usefulGods?.yongsin || [],
        favorableGod: saju.usefulGods?.heeshin || [],
        unfavorableGod: saju.usefulGods?.gishin || [],
      },
      writingInstruction: "structure/chartPattern/usefulGod/favorableGod/unfavorableGod 기준으로 용신 챕터를 작성한다.",
    };
  }

  if (chapterId === 6) {
    return {
      ...base,
      sourceData: {
        tenGods: saju.tenGods,
        fiveElements: saju.elements,
        majorLuck: saju.luckCycles?.daeun || [],
        careerWealth: context.careerWealth,
      },
      writingInstruction: "재성/식상/관성 + fiveElements + majorLuck를 근거로 직업/재물 전략을 작성한다.",
    };
  }

  if (chapterId === 7) {
    return {
      ...base,
      sourceData: {
        relationshipSignals: context.relationship,
        relationship: context.relationship,
        dayPillar: saju.pillars.day,
        tenGods: saju.tenGods,
        spouseSignals: {
          spouseStar: context.relationship?.spouseStar,
          relationshipPattern: context.relationship?.relationshipPattern,
        },
      },
      writingInstruction: "spouse/relationship 관련 십성과 일지 신호를 바탕으로 인간관계·사랑 패턴을 작성한다.",
    };
  }

  if (chapterId === 8) {
    return {
      ...base,
      sourceData: {
        yearPillar: saju.pillars.year,
        monthPillar: saju.pillars.month,
        familyRootSignals: {
          relationship: context.relationship,
          summary: saju.chartSummary,
        },
        tenGods: saju.tenGods,
        elements: saju.elements,
      },
      writingInstruction: "year/month pillar와 가족·뿌리 신호를 중심으로 내면 안정 챕터를 작성한다.",
    };
  }

  if (chapterId === 9) {
    return {
      ...base,
      sourceData: {
        healthMind: context.healthMind,
        elements: saju.elements,
        structure: {
          chartSummary: saju.chartSummary,
          geokguk: context.geokguk,
        },
        stressSignals: {
          stressPattern: context.healthMind?.stressPattern,
          energyPattern: context.healthMind?.energyPattern,
        },
      },
      writingInstruction: "fiveElements 과다/부족과 수·화 균형, 스트레스 신호를 기준으로 건강/마음 습관을 작성한다.",
    };
  }

  if (chapterId === 10) {
    return {
      ...base,
      sourceData: {
        twelveStages: saju.twelveStages,
        dayMaster: saju.dayMaster,
        summarySignals: toArray(context?.source?.saju?.summarySignals || context?.source?.summarySignals),
      },
      writingInstruction: "twelveStages 전체를 바탕으로 강약 시기와 인생 리듬 운영 전략을 작성한다.",
    };
  }

  if (chapterId === 11) {
    return {
      ...base,
      sourceData: {
        yearlyFlow: saju.yearlyFlow,
        annualLuck: context.source?.saju?.annualLuck || {},
        majorLuck: saju.luckCycles?.daeun || [],
        currentLuck: toObject(saju.luckCycles?.currentDaewoon),
        nextLuck: toObject((saju.luckCycles?.daeun || [])[1]),
      },
      writingInstruction: "2026년 병오년 yearlyFlow와 majorLuck/currentLuck를 근거로 월별 행동 지침 중심으로 작성한다.",
    };
  }

  if (chapterId === 12) {
    return {
      ...base,
      sourceData: {
        summary: saju.chartSummary,
        strongestSignals: {
          fiveElements: saju.elements,
          tenGods: saju.tenGods,
        },
        weakestSignals: {
          healthMind: context.healthMind,
          relationship: context.relationship,
        },
        usefulGod: saju.usefulGods,
        majorLuck: saju.luckCycles?.daeun || [],
      },
      writingInstruction: "full summary + strongest/weakest signals + usefulGod + majorLuck를 묶어 최종 로드맵을 작성한다.",
    };
  }

  if (chapterId === 13) {
    return {
      ...base,
      sourceData: {
        summary: saju.chartSummary,
        integratedThemes: context.integratedThemes,
        usefulGod: saju.usefulGods,
        majorLuck: saju.luckCycles?.daeun || [],
        yearlyFlow: saju.yearlyFlow,
      },
      writingInstruction: "전체 차트 요약, integratedThemes, usefulGod, 대운/세운 신호를 바탕으로 최종 전략 제언을 작성한다.",
    };
  }

  return {
    ...base,
    sourceData: {
      profile,
      saju,
      context,
    },
    writingInstruction: "원국 전체의 강점, 조심할 패턴, 실행 전략을 종합 상담문으로 작성한다.",
  };
}

export function buildSajuLifeBookChapterManifest(lifeBookInputData = {}, chapterConfigs = []) {
  const normalized = normalizeLifeBookContext(lifeBookInputData);
  return toArray(chapterConfigs).map((chapterConfig, index) => {
    const chapterNumber = Number(chapterConfig?.number || index + 1) || index + 1;
    const chapterId = toText(chapterConfig?.id || `chapter-${String(chapterNumber).padStart(2, "0")}`);
    const categories = toArray(chapterConfig?.requiredCoverage || chapterConfig?.sections)
      .map((sectionTitle, sectionIndex) => {
        const source = buildCategorySourceDataByChapter(chapterNumber, sectionTitle, normalized);
        const sourceData = toObject(source?.sourceData);
        if (!hasMeaningfulValue(sourceData)) return null;
        return {
          id: `${chapterId}-cat-${String(sectionIndex + 1).padStart(2, "0")}`,
          title: toText(sectionTitle),
          sourceData,
          availableSignals: listAvailableSignals(sourceData),
          missingSignals: listMissingSignals(sourceData),
          writingInstruction: toText(source?.writingInstruction) || `사주 데이터만 사용해 ${toText(sectionTitle)} 관점의 상담문을 작성한다.`,
        };
      })
      .filter(Boolean);

    return {
      id: chapterId,
      number: chapterNumber,
      roman: toText(chapterConfig?.roman || ""),
      title: toText(chapterConfig?.title || `챕터 ${chapterNumber}`),
      subtitle: toText(chapterConfig?.subtitle || ""),
      targetChars: Number(chapterConfig?.targetChars || 0),
      minLength: Number(chapterConfig?.minLength || 0),
      categories,
      sections: categories.map((category) => category.title),
      requiredCoverage: categories.map((category) => category.title),
    };
  });
}

export function buildSajuLifeBookPdfPayload(lifeBookInputData = {}, chapterConfigs = []) {
  const normalized = normalizeLifeBookContext(lifeBookInputData);
  const profileName = normalized.user.name || toText(lifeBookInputData?.userProfile?.name) || undefined;
  const profileGender = toText(normalized.user.gender || lifeBookInputData?.userProfile?.gender || "unknown") || "unknown";
  const birthDate = toText(normalized.user.birthInfo.birthDate || lifeBookInputData?.userProfile?.birthDate || "");
  const birthTime = toText(normalized.user.birthInfo.birthTime || lifeBookInputData?.userProfile?.birthTime || "") || undefined;
  const calendarType = toText(normalized.user.birthInfo.calendarType || lifeBookInputData?.userProfile?.calendarType || "solar") || "solar";
  const chartId = toText(normalized.saju.chartId || normalized.saju.chartSignature);

  const sajuResult = {
    pillars: {
      year: toText(normalized.saju.pillars?.year?.ganji || normalized.saju.pillars?.year),
      month: toText(normalized.saju.pillars?.month?.ganji || normalized.saju.pillars?.month),
      day: toText(normalized.saju.pillars?.day?.ganji || normalized.saju.pillars?.day),
      hour: toText(normalized.saju.pillars?.hour?.ganji || normalized.saju.pillars?.hour) || undefined,
    },
    dayMaster: toText(normalized.saju.dayMaster),
    tenGods: toObject(normalized.saju.tenGods),
    fiveElements: {
      wood: Number(normalized.saju.elements?.wood || 0),
      fire: Number(normalized.saju.elements?.fire || 0),
      earth: Number(normalized.saju.elements?.earth || 0),
      metal: Number(normalized.saju.elements?.metal || 0),
      water: Number(normalized.saju.elements?.water || 0),
    },
    usefulGod: toArray(normalized.saju.usefulGods?.yongsin).join(", ") || undefined,
    avoidGod: toArray(normalized.saju.usefulGods?.gishin).join(", ") || undefined,
    twelveStages: toObject(normalized.saju.twelveStages),
    decadeLuck: toArray(normalized.saju.luckCycles?.daeun).map((row) => ({
      ageRange: `${toText(row?.ageStart)}-${toText(row?.ageEnd)}`,
      pillar: toText(row?.pillar),
      theme: toText(row?.summary || row?.career || row?.wealth || row?.love || row?.health),
    })),
  };

  return {
    featureKey: FEATURE_KEY_SAJU_LIFE_BOOK_PDF,
    mode: "life-book",
    accessGrant: {
      featureKey: FEATURE_KEY_SAJU_LIFE_BOOK_PDF,
      sessionId: chartId || "lifebook-session",
      purchaseId: chartId || "lifebook-purchase",
      reportId: chartId || "lifebook-report",
    },
    profile: {
      name: profileName,
      gender: profileGender || "unknown",
    },
    birthData: {
      birthDate,
      birthTime,
      calendarType: calendarType === "lunar" ? "lunar" : "solar",
      lunarLeapMonth: false,
    },
    sajuResult,
    modeLegacy: "lifeBook",
    reportType: "saju-life-book",
    reportTitle: "사주 인생의 책",
    user: {
      name: normalized.user.name,
      gender: normalized.user.gender,
      birthInfo: normalized.user.birthInfo,
      calendarType: normalized.user.birthInfo.calendarType,
      timezone: normalized.user.birthInfo.timezone,
    },
    saju: {
      chartId: normalized.saju.chartId,
      chartSignature: normalized.saju.chartSignature,
      pillars: normalized.saju.pillars,
      dayMaster: normalized.saju.dayMaster,
      dayPillar: normalized.saju.dayPillar,
      elements: normalized.saju.elements,
      elementScores: normalized.saju.elementScores,
      tenGods: normalized.saju.tenGods,
      hiddenStems: normalized.saju.hiddenStems,
      twelveStages: normalized.saju.twelveStages,
      usefulGods: normalized.saju.usefulGods,
      specialStars: normalized.saju.specialStars,
      luckCycles: normalized.saju.luckCycles,
      yearlyFlow: normalized.saju.yearlyFlow,
      chartSummary: normalized.saju.chartSummary,
    },
    chapters: buildSajuLifeBookChapterManifest(lifeBookInputData, chapterConfigs),
  };
}

function containsForbiddenStructure(value) {
  const source = JSON.stringify(value || {});
  return /partner|compatibility|matching|synastry|두 사람|상대방 사주|궁합 분석/i.test(source);
}

export function validateSajuLifeBookPdfPayload(payload = {}) {
  const missing = [];
  const p = toObject(payload);
  const featureKey = toText(p.featureKey);
  const accessGrant = toObject(p.accessGrant);
  const profile = toObject(p.profile);
  const birthData = toObject(p.birthData);
  const sajuResult = toObject(p.sajuResult);
  const user = toObject(p.user);
  const birthInfo = toObject(user.birthInfo);
  const saju = toObject(p.saju);
  const pillars = toObject(saju.pillars);
  const chapters = toArray(p.chapters);

  if (toText(p.mode) !== "lifeBook" && toText(p.mode) !== "life-book") missing.push("mode");
  if (featureKey && featureKey !== FEATURE_KEY_SAJU_LIFE_BOOK_PDF) missing.push("featureKey");
  if (!featureKey) missing.push("featureKey");
  if (!toText(accessGrant.featureKey)) missing.push("accessGrant.featureKey");
  if (!toText(accessGrant.sessionId)) missing.push("accessGrant.sessionId");
  if (!toText(accessGrant.purchaseId)) missing.push("accessGrant.purchaseId");
  if (!toText(accessGrant.reportId)) missing.push("accessGrant.reportId");
  if (!toText(profile.gender) && !toText(user.gender)) missing.push("profile.gender");
  if (!toText(birthData.birthDate) && !toText(birthInfo.birthDate)) missing.push("birthData.birthDate");
  if (!toText(birthData.calendarType) && !toText(birthInfo.calendarType)) missing.push("birthData.calendarType");
  if (hasMeaningfulValue(sajuResult)) {
    if (!toText(toObject(sajuResult.pillars).year)) missing.push("sajuResult.pillars.year");
    if (!toText(toObject(sajuResult.pillars).month)) missing.push("sajuResult.pillars.month");
    if (!toText(toObject(sajuResult.pillars).day)) missing.push("sajuResult.pillars.day");
    if (!toText(sajuResult.dayMaster)) missing.push("sajuResult.dayMaster");
    if (!hasMeaningfulValue(sajuResult.fiveElements)) missing.push("sajuResult.fiveElements");
    if (!hasMeaningfulValue(sajuResult.tenGods)) missing.push("sajuResult.tenGods");
  }
  if (!toText(user.name)) missing.push("user.name");
  if (!toText(user.gender)) missing.push("user.gender");
  if (!toText(birthInfo.birthDate)) missing.push("user.birthInfo.birthDate");
  if (!toText(birthInfo.calendarType)) missing.push("user.birthInfo.calendarType");
  if (!toText(birthInfo.timezone)) missing.push("user.birthInfo.timezone");
  if (!toText(saju.chartId) && !toText(saju.chartSignature)) missing.push("saju.chartId|saju.chartSignature");
  if (!hasMeaningfulValue(pillars.year)) missing.push("saju.pillars.year");
  if (!hasMeaningfulValue(pillars.month)) missing.push("saju.pillars.month");
  if (!hasMeaningfulValue(pillars.day)) missing.push("saju.pillars.day");
  if (!toText(saju.dayMaster)) missing.push("saju.dayMaster");
  if (!hasMeaningfulValue(saju.elements) && !hasMeaningfulValue(saju.elementScores)) missing.push("saju.elements|saju.elementScores");
  if (!hasMeaningfulValue(saju.tenGods)) missing.push("saju.tenGods");
  if (!chapters.length) missing.push("chapters");
  if (chapters.length !== LIFE_BOOK_TOTAL_CHAPTERS) {
    missing.push(`chapters.length(${LIFE_BOOK_TOTAL_CHAPTERS})`);
  }
  if (containsForbiddenStructure(p)) missing.push("compatibility-or-partner-structure");

  chapters.forEach((chapter, chapterIndex) => {
    const categories = toArray(chapter?.categories);
    if (!categories.length) {
      missing.push(`chapters[${chapterIndex}].categories`);
      return;
    }
    categories.forEach((category, categoryIndex) => {
      const sourceData = toObject(category?.sourceData);
      if (!hasMeaningfulValue(sourceData)) {
        missing.push(`chapters[${chapterIndex}].categories[${categoryIndex}].sourceData`);
      }
      if (!toText(category?.writingInstruction)) {
        missing.push(`chapters[${chapterIndex}].categories[${categoryIndex}].writingInstruction`);
      }
    });
  });

  return {
    ok: missing.length === 0,
    missing,
  };
}
