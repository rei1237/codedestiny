const SAJU_LOVE_FORBIDDEN_PHRASES = Object.freeze([
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
  "기본 궁합 분석을 먼저 실행",
  "이 섹션은 챕터 구조 보존을 위한 기본 골격입니다",
  "JSON payload",
  "raw payload",
  "engine raw",
  "계산 실패",
  "데이터 없음",
]);

const SOLO_CHAPTER_DEFS = Object.freeze([
  {
    id: "love-solo-01",
    title: "💘 본연의 연애 자아",
    categories: [
      ["love-solo-01-01", "일간으로 보는 사랑의 기본 태도"],
      ["love-solo-01-02", "일지로 보는 친밀감의 방식"],
      ["love-solo-01-03", "월지와 환경이 만든 연애 습관"],
      ["love-solo-01-04", "오행 균형으로 보는 감정 표현"],
      ["love-solo-01-05", "연애에서 반복되는 핵심 패턴"],
    ],
  },
  {
    id: "love-solo-02",
    title: "🌹 치명적 매력과 페로몬",
    categories: [
      ["love-solo-02-01", "도화·홍염·화개 데이터 해석"],
      ["love-solo-02-02", "식상으로 드러나는 표현력"],
      ["love-solo-02-03", "재성/관성으로 드러나는 이성 매력"],
      ["love-solo-02-04", "상대를 끌어당기는 포인트"],
      ["love-solo-02-05", "매력이 독이 되는 순간"],
    ],
  },
  {
    id: "love-solo-03",
    title: "🧲 내가 끌리는 상대와 인연 코드",
    categories: [
      ["love-solo-03-01", "배우자성 또는 관계성 데이터"],
      ["love-solo-03-02", "본능적으로 끌리는 유형"],
      ["love-solo-03-03", "안정감을 주는 상대 유형"],
      ["love-solo-03-04", "위험하지만 끌리는 상대 유형"],
      ["love-solo-03-05", "피해야 할 관계 패턴"],
    ],
  },
  {
    id: "love-solo-04",
    title: "💬 썸·고백·초기 연애 전략",
    categories: [
      ["love-solo-04-01", "썸에서 드러나는 태도"],
      ["love-solo-04-02", "고백과 접근 방식"],
      ["love-solo-04-03", "초반에 호감이 커지는 조건"],
      ["love-solo-04-04", "초반에 식기 쉬운 조건"],
      ["love-solo-04-05", "관계 시작 체크리스트"],
    ],
  },
  {
    id: "love-solo-05",
    title: "💞 깊은 관계에서의 애착 패턴",
    categories: [
      ["love-solo-05-01", "가까워질수록 드러나는 모습"],
      ["love-solo-05-02", "안정감을 느끼는 방식"],
      ["love-solo-05-03", "불안이 올라오는 지점"],
      ["love-solo-05-04", "집착 또는 회피 패턴"],
      ["love-solo-05-05", "감정을 건강하게 전달하는 법"],
    ],
  },
  {
    id: "love-solo-06",
    title: "⚠️ 연애에서 반복되는 상처와 방어기제",
    categories: [
      ["love-solo-06-01", "자존심이 상하는 상황"],
      ["love-solo-06-02", "관계를 망치는 말과 행동"],
      ["love-solo-06-03", "이별/거리감 앞 반응"],
      ["love-solo-06-04", "반복 실수의 원인"],
      ["love-solo-06-05", "회복을 위한 대화법"],
    ],
  },
  {
    id: "love-solo-07",
    title: "🏡 결혼·장기 관계 성향",
    categories: [
      ["love-solo-07-01", "장기 관계에서 원하는 안정감"],
      ["love-solo-07-02", "결혼관/책임감 구조"],
      ["love-solo-07-03", "생활 리듬과 현실 조건"],
      ["love-solo-07-04", "오래 갈수록 강해지는 장점"],
      ["love-solo-07-05", "장기 관계 주의점"],
    ],
  },
  {
    id: "love-solo-08",
    title: "💼 일·돈·자존감이 연애에 미치는 영향",
    categories: [
      ["love-solo-08-01", "일과 연애의 균형"],
      ["love-solo-08-02", "돈과 현실 문제 대응"],
      ["love-solo-08-03", "자존감 영향"],
      ["love-solo-08-04", "성취욕과 관계 충돌"],
      ["love-solo-08-05", "현실 이슈 완충 전략"],
    ],
  },
  {
    id: "love-solo-09",
    title: "🕰️ 연애운과 시기 흐름",
    categories: [
      ["love-solo-09-01", "대운 기반 현재 흐름"],
      ["love-solo-09-02", "세운 기반 올해 흐름"],
      ["love-solo-09-03", "인연 유입 시기"],
      ["love-solo-09-04", "주의 시기"],
      ["love-solo-09-05", "선택 타이밍"],
    ],
  },
  {
    id: "love-solo-10",
    title: "🗝️ 최종 연애 처방전",
    categories: [
      ["love-solo-10-01", "연애 성향 종합 요약"],
      ["love-solo-10-02", "가장 강한 매력"],
      ["love-solo-10-03", "가장 조심할 패턴"],
      ["love-solo-10-04", "좋은 인연 판별 기준"],
      ["love-solo-10-05", "실전 실행 체크리스트"],
    ],
  },
]);

const COMPAT_CHAPTER_DEFS = Object.freeze([
  {
    id: "love-compat-11",
    title: "💞 두 사람의 기본 궁합 구조",
    categories: [
      ["love-compat-11-01", "나의 사주 핵심 연애 코드"],
      ["love-compat-11-02", "상대의 사주 핵심 연애 코드"],
      ["love-compat-11-03", "두 사람의 일간 관계"],
      ["love-compat-11-04", "두 사람의 일지 관계"],
      ["love-compat-11-05", "관계의 기본 온도"],
    ],
  },
  {
    id: "love-compat-12",
    title: "🧲 끌림과 인연의 이유",
    categories: [
      ["love-compat-12-01", "오행 상생상극으로 보는 끌림"],
      ["love-compat-12-02", "십성 관계로 보는 역할 구도"],
      ["love-compat-12-03", "매력성 상호작용"],
      ["love-compat-12-04", "강하게 반응하는 지점"],
      ["love-compat-12-05", "초기 호감의 이유"],
    ],
  },
  {
    id: "love-compat-13",
    title: "🔥 감정 흐름과 애착 구조",
    categories: [
      ["love-compat-13-01", "감정 표현 방식의 차이"],
      ["love-compat-13-02", "가까워질수록 드러나는 모습"],
      ["love-compat-13-03", "안정감을 주는 방식"],
      ["love-compat-13-04", "불안을 자극하는 방식"],
      ["love-compat-13-05", "애착 안정 전략"],
    ],
  },
  {
    id: "love-compat-14",
    title: "⚔️ 갈등 구조와 위험 신호",
    categories: [
      ["love-compat-14-01", "합충형파해 관계"],
      ["love-compat-14-02", "원진귀문 또는 긴장 신호"],
      ["love-compat-14-03", "반복 오해 포인트"],
      ["love-compat-14-04", "말투/태도 상처 지점"],
      ["love-compat-14-05", "위기 대응법"],
    ],
  },
  {
    id: "love-compat-15",
    title: "🏡 장기 관계와 현실 궁합",
    categories: [
      ["love-compat-15-01", "결혼/장기 관계 가능성"],
      ["love-compat-15-02", "생활 리듬 궁합"],
      ["love-compat-15-03", "돈·일·가족 충돌 가능성"],
      ["love-compat-15-04", "필요한 역할 분담"],
      ["love-compat-15-05", "관계 안정 조건"],
    ],
  },
  {
    id: "love-compat-16",
    title: "🕰️ 두 사람의 시기 흐름",
    categories: [
      ["love-compat-16-01", "양쪽 대운 흐름 비교"],
      ["love-compat-16-02", "양쪽 세운 흐름 비교"],
      ["love-compat-16-03", "가까워지기 쉬운 시기"],
      ["love-compat-16-04", "갈등 확대 시기"],
      ["love-compat-16-05", "거리 조절 타이밍"],
    ],
  },
  {
    id: "love-compat-17",
    title: "🗝️ 두 사람을 위한 최종 관계 처방전",
    categories: [
      ["love-compat-17-01", "관계 종합 진단"],
      ["love-compat-17-02", "반드시 지킬 원칙"],
      ["love-compat-17-03", "하지 말아야 할 행동"],
      ["love-compat-17-04", "회복 대화법"],
      ["love-compat-17-05", "최종 실행 체크리스트"],
    ],
  },
]);

function compactObject(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item == null) continue;
    if (typeof item === "string" && !item.trim()) continue;
    if (Array.isArray(item) && item.length === 0) continue;
    if (typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0) continue;
    out[key] = item;
  }
  return out;
}

function isNonEmptyObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(compactObject(value)).length > 0;
}

function buildCategoryWritingInstruction(categoryTitle, part) {
  return [
    `${categoryTitle} 주제를 중심으로 상담문을 작성한다.`,
    part === "compatibility"
      ? "user.saju, partner.saju, compatibility sourceData만 해석하고 계산을 추가하지 않는다."
      : "user.saju sourceData만 해석하고 partner/compatibility를 섞지 않는다.",
    "JSON 원문이나 계산 근거를 본문에 그대로 노출하지 않는다.",
    "실행 가능한 조언 3개 이상을 포함한다.",
  ].join(" ");
}

function buildCoreSajuSnapshot(person = {}) {
  const day = person?.fourPillars?.day || {};
  return compactObject({
    chartSignature: `${person?.fourPillars?.year?.ganji || ""}-${person?.fourPillars?.month?.ganji || ""}-${person?.fourPillars?.day?.ganji || ""}-${person?.fourPillars?.hour?.ganji || ""}`,
    pillars: compactObject({
      year: person?.fourPillars?.year || null,
      month: person?.fourPillars?.month || null,
      day,
      hour: person?.fourPillars?.hour || null,
    }),
    dayMaster: person?.dayMaster || null,
    dayBranch: day?.branch || null,
    elements: person?.fiveElements || null,
    tenGods: person?.tenGods || null,
    hiddenStems: day?.hiddenStems || null,
    specialStars: person?.attractionStars || null,
    spouseStar: person?.tenGods?.loveRelatedGods?.spouseStar || null,
    relationshipSignals: person?.loveProfile || null,
    luckCycles: compactObject({
      currentDaewoon: person?.luck?.currentDaewoon || null,
      nextDaewoon: person?.luck?.nextDaewoon || null,
    }),
    yearlyFlow: person?.luck?.annualLuck || null,
    chartSummary: compactObject({
      strength: person?.dayMaster?.strength || null,
      usefulGods: person?.usefulGods || null,
      johu: person?.johu || null,
    }),
  });
}

function buildCompatibilitySnapshot(compatibility = {}) {
  return compactObject({
    compatibilitySignature: `${compatibility?.dayMasterRelation?.personAElement || ""}-${compatibility?.dayMasterRelation?.personBElement || ""}-${compatibility?.spousePalaceInteraction?.relationType || ""}`,
    dayMasterRelation: compatibility?.dayMasterRelation || null,
    dayBranchRelation: compatibility?.spousePalaceInteraction || null,
    elementRelation: compatibility?.elementBalance || null,
    tenGodRelation: compatibility?.tenGodCompatibility || null,
    spouseStarRelation: compatibility?.spousePalaceInteraction || null,
    branchRelations: compatibility?.stemBranchInteractions || null,
    harmonyConflicts: compactObject({
      combinations: compatibility?.stemBranchInteractions?.combinations || [],
      clashes: compatibility?.stemBranchInteractions?.clashes || [],
      harms: compatibility?.stemBranchInteractions?.harms || [],
      punishments: compatibility?.stemBranchInteractions?.punishments || [],
      breaks: compatibility?.stemBranchInteractions?.breaks || [],
    }),
    wonjinGwimun: compatibility?.stemBranchInteractions || null,
    loveStarsInteraction: compactObject({
      attractionScore: compatibility?.attractionScore,
      intimacy: compatibility?.intimacyCompatibility || null,
    }),
    attractionSignals: compatibility?.attractionScore || null,
    conflictSignals: compatibility?.conflictScore || null,
    stabilitySignals: compatibility?.stabilityScore || null,
    adviceKeywords: compatibility?.johuCompatibility?.balancingStrategies || [],
    relationshipSummary: compatibility?.summary || null,
  });
}

function buildSajuLoveCategorySourceData(mode, part, categoryId, userSaju, partnerSaju, compatibility) {
  const base = compactObject({
    mode,
    categoryId,
    userSaju,
  });

  if (part === "solo") {
    return base;
  }

  return compactObject({
    ...base,
    partnerSaju,
    compatibility,
  });
}

function buildChapterFromDef(def, order, part, mode, userSaju, partnerSaju, compatibility) {
  const categories = def.categories
    .map(([categoryId, title]) => {
      const sourceData = buildSajuLoveCategorySourceData(
        mode,
        part,
        categoryId,
        userSaju,
        partnerSaju,
        compatibility,
      );

      return {
        id: categoryId,
        title,
        sourceData,
        writingInstruction: buildCategoryWritingInstruction(title, part),
      };
    })
    .filter((row) => isNonEmptyObject(row.sourceData));

  return {
    id: def.id,
    order,
    title: def.title,
    part,
    categories,
  };
}

export function buildSajuLoveSoloChapterManifest(mode, userSaju) {
  return SOLO_CHAPTER_DEFS.map((def, idx) => buildChapterFromDef(def, idx + 1, "solo", mode, userSaju, null, null));
}

export function buildSajuLoveCompatibilityChapterManifest(mode, userSaju, partnerSaju, compatibility) {
  return COMPAT_CHAPTER_DEFS.map((def, idx) => buildChapterFromDef(def, 11 + idx, "compatibility", mode, userSaju, partnerSaju, compatibility));
}

export function buildSajuLoveChapterManifest(mode, userSaju, partnerSaju, compatibility) {
  const solo = buildSajuLoveSoloChapterManifest(mode, userSaju);
  if (mode !== "compatibility") return solo;
  return solo.concat(buildSajuLoveCompatibilityChapterManifest(mode, userSaju, partnerSaju, compatibility));
}

export function buildSajuLovePdfPayload(params = {}) {
  const mode = String(params.mode || "solo").trim() === "compatibility" ? "compatibility" : "solo";
  const user = params.user || {};
  const partner = params.partner || null;
  const userSaju = buildCoreSajuSnapshot(params.userPerson || {});
  const partnerSaju = mode === "compatibility" ? buildCoreSajuSnapshot(params.partnerPerson || {}) : null;
  const compatibility = mode === "compatibility" ? buildCompatibilitySnapshot(params.compatibility || {}) : null;

  const payload = {
    mode,
    reportTitle: mode === "compatibility" ? "사주 연애 비책 궁합 리포트" : "사주 연애 비책",
    user: compactObject({
      name: user?.name || "사용자",
      gender: user?.gender || "unknown",
      birthInfo: user?.birthInfo || null,
      calendarType: user?.calendarType || "solar",
      timezone: user?.timezone || "Asia/Seoul",
      saju: userSaju,
    }),
    chapters: buildSajuLoveChapterManifest(mode, userSaju, partnerSaju, compatibility),
  };

  if (mode === "solo") {
    payload.saju = userSaju;
    return payload;
  }

  payload.partner = compactObject({
    name: partner?.name || "상대",
    gender: partner?.gender || "unknown",
    birthInfo: partner?.birthInfo || null,
    saju: partnerSaju,
  });
  payload.compatibility = compatibility;
  return payload;
}

export function assertNoSajuLoveFallbackText(text, label = "text") {
  const source = String(text || "");
  for (const token of SAJU_LOVE_FORBIDDEN_PHRASES) {
    if (source.toLowerCase().includes(String(token).toLowerCase())) {
      throw new Error(`SAJU_LOVE_FORBIDDEN_TEXT:${label}:${token}`);
    }
  }
}

function validateCategory(category, path, errors) {
  if (!category || typeof category !== "object") {
    errors.push(`${path}:category_missing`);
    return;
  }
  if (!String(category.id || "").trim()) errors.push(`${path}.id:required`);
  if (!String(category.title || "").trim()) errors.push(`${path}.title:required`);
  if (!isNonEmptyObject(category.sourceData)) errors.push(`${path}.sourceData:required`);
  if (!String(category.writingInstruction || "").trim()) errors.push(`${path}.writingInstruction:required`);
  try {
    assertNoSajuLoveFallbackText(JSON.stringify(category), `${path}`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${path}:forbidden_text`);
  }
}

export function validateSajuLovePdfPayload(payload = {}) {
  const errors = [];
  const mode = String(payload?.mode || "").trim();
  if (mode !== "solo" && mode !== "compatibility") errors.push("mode:invalid");
  if (!String(payload?.reportTitle || "").trim()) errors.push("reportTitle:required");

  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
  if (!chapters.length) errors.push("chapters:required");

  const soloChapters = chapters.filter((row) => String(row?.part || "") === "solo");
  const compatChapters = chapters.filter((row) => String(row?.part || "") === "compatibility");

  chapters.forEach((chapter, idx) => {
    const basePath = `chapters[${idx}]`;
    if (!String(chapter?.id || "").trim()) errors.push(`${basePath}.id:required`);
    if (!String(chapter?.title || "").trim()) errors.push(`${basePath}.title:required`);
    if (!Array.isArray(chapter?.categories) || chapter.categories.length === 0) {
      errors.push(`${basePath}.categories:required`);
    } else {
      chapter.categories.forEach((category, cIdx) => validateCategory(category, `${basePath}.categories[${cIdx}]`, errors));
    }
  });

  if (mode === "solo") {
    if (soloChapters.length !== 10) errors.push("solo_chapters:must_be_10");
    if (compatChapters.length > 0) errors.push("solo_mode_no_compatibility_chapters");
    if (payload?.partner) errors.push("solo_mode_no_partner");
    if (payload?.compatibility) errors.push("solo_mode_no_compatibility");

    const userBirth = payload?.user?.birthInfo;
    if (!isNonEmptyObject(userBirth)) errors.push("user.birthInfo:required");
    if (!String(payload?.user?.gender || "").trim()) errors.push("user.gender:required");
    const saju = payload?.saju || payload?.user?.saju;
    if (!isNonEmptyObject(saju)) errors.push("saju:required");
    if (!isNonEmptyObject(saju?.pillars)) errors.push("saju.pillars:required");
    if (!saju?.dayMaster) errors.push("saju.dayMaster:required");
    if (!saju?.elements) errors.push("saju.elements:required");
    if (!saju?.tenGods) errors.push("saju.tenGods:required");
  }

  if (mode === "compatibility") {
    if (soloChapters.length !== 10) errors.push("compat_mode_solo_chapters:must_be_10");
    if (compatChapters.length < 1) errors.push("compat_mode_compatibility_chapters:required");

    if (!isNonEmptyObject(payload?.user?.birthInfo)) errors.push("user.birthInfo:required");
    if (!isNonEmptyObject(payload?.partner?.birthInfo)) errors.push("partner.birthInfo:required");

    const userSaju = payload?.user?.saju;
    const partnerSaju = payload?.partner?.saju;
    if (!isNonEmptyObject(userSaju)) errors.push("user.saju:required");
    if (!isNonEmptyObject(partnerSaju)) errors.push("partner.saju:required");
    if (!isNonEmptyObject(userSaju?.pillars)) errors.push("user.saju.pillars:required");
    if (!isNonEmptyObject(partnerSaju?.pillars)) errors.push("partner.saju.pillars:required");
    if (!userSaju?.dayMaster) errors.push("user.saju.dayMaster:required");
    if (!partnerSaju?.dayMaster) errors.push("partner.saju.dayMaster:required");

    const comp = payload?.compatibility;
    if (!isNonEmptyObject(comp)) {
      errors.push("compatibility:required");
    } else {
      const hasAnyRelation = Boolean(comp?.dayMasterRelation || comp?.elementRelation || comp?.dayBranchRelation);
      if (!hasAnyRelation) errors.push("compatibility.relation:required");
    }

    for (const chapter of soloChapters) {
      for (const category of chapter.categories || []) {
        if (category?.sourceData?.partnerSaju || category?.sourceData?.compatibility) {
          errors.push(`solo_chapter_contains_partner_data:${chapter.id}:${category.id}`);
        }
      }
    }

    for (const chapter of compatChapters) {
      for (const category of chapter.categories || []) {
        if (!category?.sourceData?.userSaju || !category?.sourceData?.partnerSaju || !category?.sourceData?.compatibility) {
          errors.push(`compat_chapter_missing_required_source:${chapter.id}:${category.id}`);
        }
      }
    }
  }

  try {
    assertNoSajuLoveFallbackText(JSON.stringify(payload), "payload");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "payload:forbidden_text");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function getSajuLoveForbiddenPhrases() {
  return SAJU_LOVE_FORBIDDEN_PHRASES.slice();
}

export function getSajuLoveChapterDefs() {
  return {
    solo: SOLO_CHAPTER_DEFS,
    compatibility: COMPAT_CHAPTER_DEFS,
  };
}
