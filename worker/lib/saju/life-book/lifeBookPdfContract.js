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
        user: profile,
        pillars: saju.pillars,
        yearPillar: saju.pillars.year,
        monthPillar: saju.pillars.month,
        dayPillar: saju.pillars.day,
        hourPillar: saju.pillars.hour,
        dayMaster: saju.dayMaster,
        hiddenStems: saju.hiddenStems,
        elements: saju.elements,
        tenGods: saju.tenGods,
        chartSignature: saju.chartSignature,
      },
      writingInstruction: "사주 네 기둥과 일간 데이터를 바탕으로 원국 전체의 기본 구조와 핵심 기운을 상담문으로 작성한다.",
    };
  }

  if (chapterId === 2) {
    return {
      ...base,
      sourceData: {
        dayMaster: saju.dayMaster,
        dayPillar: saju.pillars.day,
        monthBranch: saju.pillars.month.branch,
        elements: saju.elements,
        tenGods: saju.tenGods,
      },
      writingInstruction: "일간, 일주, 월지, 오행 분포를 바탕으로 타고난 성향과 반복 패턴을 상담문으로 작성한다.",
    };
  }

  if (chapterId === 3) {
    return {
      ...base,
      sourceData: {
        usefulGods: saju.usefulGods,
        dayMaster: saju.dayMaster,
        elements: saju.elements,
        chartSummary: saju.chartSummary,
      },
      writingInstruction: "용신·희신·기신이 있는 경우에만 그 작동 조건을 바탕으로 현실 실행 전략을 작성한다.",
    };
  }

  if (chapterId === 4) {
    return {
      ...base,
      sourceData: {
        luckCycles: saju.luckCycles,
        yearlyFlow: saju.yearlyFlow,
        dayMaster: saju.dayMaster,
      },
      writingInstruction: "대운과 세운 데이터가 있는 경우 현재 흐름과 전환기를 중심으로 현실적인 선택 기준을 작성한다.",
    };
  }

  if (chapterId === 5) {
    return {
      ...base,
      sourceData: {
        monthPillar: saju.pillars.month,
        dayMaster: saju.dayMaster,
        elements: saju.elements,
        tenGods: saju.tenGods,
        geokguk: context.geokguk,
      },
      writingInstruction: "월지와 십성, 격국 데이터가 있으면 사회적 역할과 인정받는 방식을 정리한다.",
    };
  }

  if (chapterId === 6) {
    return {
      ...base,
      sourceData: {
        tenGods: saju.tenGods,
        relationship: context.relationship,
        careerWealth: context.careerWealth,
        elements: saju.elements,
      },
      writingInstruction: "십성과 관계·커리어 관련 데이터만 사용해 재능과 관계 패턴을 작성한다.",
    };
  }

  if (chapterId === 7) {
    return {
      ...base,
      sourceData: {
        relationship: context.relationship,
        dayPillar: saju.pillars.day,
        tenGods: saju.tenGods,
        usefulGods: saju.usefulGods,
      },
      writingInstruction: "일지와 관계성 데이터만 사용해 연애·결혼 성향과 장기 관계 전략을 작성한다.",
    };
  }

  if (chapterId === 8) {
    return {
      ...base,
      sourceData: {
        careerWealth: context.careerWealth,
        tenGods: saju.tenGods,
        elements: saju.elements,
      },
      writingInstruction: "재성·식상·관성·인성 구조를 바탕으로 돈과 성과를 만드는 방식을 작성한다.",
    };
  }

  if (chapterId === 9) {
    return {
      ...base,
      sourceData: {
        healthMind: context.healthMind,
        elements: saju.elements,
        dayMaster: saju.dayMaster,
        usefulGods: saju.usefulGods,
      },
      writingInstruction: "오행 균형과 생활 리듬 데이터를 바탕으로 회복과 멘탈 관리 전략을 작성한다.",
    };
  }

  if (chapterId === 10) {
    return {
      ...base,
      sourceData: {
        twelveStages: saju.twelveStages,
        specialStars: saju.specialStars,
        hiddenStems: saju.hiddenStems,
        tenGods: saju.tenGods,
      },
      writingInstruction: "십이운성, 신살, 지장간이 있을 때만 그 기질과 사건성을 현실적으로 해석한다.",
    };
  }

  if (chapterId === 11) {
    return {
      ...base,
      sourceData: {
        luckCycles: saju.luckCycles,
        yearlyFlow: saju.yearlyFlow,
        chartSummary: saju.chartSummary,
      },
      writingInstruction: "대운과 세운이 있을 때만 올해와 다음 흐름을 기준으로 실행 우선순위를 작성한다.",
    };
  }

  if (chapterId === 12) {
    return {
      ...base,
      sourceData: {
        profile,
        saju,
        context,
      },
      writingInstruction: "원국 종합 요약과 실행 전략을 현실 중심의 체크리스트로 작성한다.",
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
  return {
    mode: "lifeBook",
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
  const user = toObject(p.user);
  const birthInfo = toObject(user.birthInfo);
  const saju = toObject(p.saju);
  const pillars = toObject(saju.pillars);
  const chapters = toArray(p.chapters);

  if (toText(p.mode) !== "lifeBook") missing.push("mode");
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
