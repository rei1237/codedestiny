import {
  LIFE_BOOK_CHAPTERS,
  LIFE_BOOK_MIN_TOTAL_CHARS,
  LIFE_BOOK_TOTAL_CHAPTERS,
  getLifeBookChapterByNumber,
} from "./chapterConfig.js";
import { buildLifeBookInputData } from "./buildLifeBookInputData.js";
import { generateLifeBookChapter } from "./generateLifeBookChapter.js";
import { renderLifeBookPdf } from "./renderLifeBookPdf.js";
import {
  assertNoSajuLifeBookFallbackText,
  buildSajuLifeBookPdfPayload,
  FEATURE_KEY_SAJU_LIFE_BOOK_PDF,
  validateSajuLifeBookPdfPayload,
} from "./lifeBookPdfContract.js";

const LIFEBOOK_FORBIDDEN_TEXTS = [
  "자동 복구 생성",
  "Chapter 1",
  "데이터가 부족합니다",
  "품질 검증 실패",
  "API 실패",
  "리포트 품질 보정 중 문제가 발생했습니다",
  "잠시 후 다시 시도해 주세요",
  "Internal server error",
  "fallback",
  "coin",
  "코인",
  "결제",
  "reportId",
  "payload",
  "schema",
  "status",
  "completed",
];

const LIFEBOOK_BANNED_CATEGORY_TEXTS = [
  "현재 확보된",
  "자동 복구 생성",
  "내용이 없습니다",
  "분석 결과를 준비",
  "undefined",
  "null",
  "[object Object]",
  "Chapter 1",
  "Chapter 2",
];

function logLifeBookStage(stage, detail = {}) {
  try {
    console.info(`[LifeBook] ${stage}`, detail);
  } catch {
    // no-op
  }
}

function isStrictMissingCore(lifeBookInputData) {
  const missingCore = Array.isArray(lifeBookInputData?.dataQuality?.missingCore)
    ? lifeBookInputData.dataQuality.missingCore
    : [];
  return {
    ok: missingCore.length === 0,
    missingCore,
  };
}

function applyLenientLifeBookCoreDefaults(lifeBookInputData = {}) {
  const data = lifeBookInputData && typeof lifeBookInputData === "object" ? lifeBookInputData : {};
  const userProfile = data.userProfile && typeof data.userProfile === "object" ? data.userProfile : {};
  const sajuChart = data.sajuChart && typeof data.sajuChart === "object" ? data.sajuChart : {};
  const dataQuality = data.dataQuality && typeof data.dataQuality === "object" ? data.dataQuality : {};
  const tenGods = data.tenGods && typeof data.tenGods === "object" ? data.tenGods : {};
  const yongshin = data.yongshin && typeof data.yongshin === "object" ? data.yongshin : {};
  const daeun = Array.isArray(data.daeun) ? data.daeun : [];

  data.userProfile = {
    ...userProfile,
    name: String(userProfile.name || "사용자").trim() || "사용자",
    birthDate: String(userProfile.birthDate || "").trim() || "분석 중",
    birthTime: String(userProfile.birthTime || "").trim() || "분석 중",
    calendarType: String(userProfile.calendarType || "solar").trim() || "solar",
  };

  data.sajuChart = {
    ...sajuChart,
    yearPillar: String(sajuChart.yearPillar || "").trim() || "분석 중",
    monthPillar: String(sajuChart.monthPillar || "").trim() || "분석 중",
    dayPillar: String(sajuChart.dayPillar || "").trim() || "분석 중",
    hourPillar: String(sajuChart.hourPillar || "").trim() || "분석 중",
    dayMaster: String(sajuChart.dayMaster || "").trim() || "분석 중",
  };

  data.tenGods = {
    ...tenGods,
    비견: Number.isFinite(Number(tenGods?.비견)) ? Number(tenGods?.비견) : 0,
    겁재: Number.isFinite(Number(tenGods?.겁재)) ? Number(tenGods?.겁재) : 0,
    식신: Number.isFinite(Number(tenGods?.식신)) ? Number(tenGods?.식신) : 0,
    상관: Number.isFinite(Number(tenGods?.상관)) ? Number(tenGods?.상관) : 0,
    편재: Number.isFinite(Number(tenGods?.편재)) ? Number(tenGods?.편재) : 0,
    정재: Number.isFinite(Number(tenGods?.정재)) ? Number(tenGods?.정재) : 0,
    편관: Number.isFinite(Number(tenGods?.편관)) ? Number(tenGods?.편관) : 0,
    정관: Number.isFinite(Number(tenGods?.정관)) ? Number(tenGods?.정관) : 0,
    편인: Number.isFinite(Number(tenGods?.편인)) ? Number(tenGods?.편인) : 0,
    정인: Number.isFinite(Number(tenGods?.정인)) ? Number(tenGods?.정인) : 0,
  };

  data.yongshin = {
    ...yongshin,
    yongshin: Array.isArray(yongshin?.yongshin) && yongshin.yongshin.length ? yongshin.yongshin : ["화"],
    heeshin: Array.isArray(yongshin?.heeshin) && yongshin.heeshin.length ? yongshin.heeshin : ["목"],
    gishin: Array.isArray(yongshin?.gishin) && yongshin.gishin.length ? yongshin.gishin : ["금"],
  };

  data.daeun = daeun.length > 0
    ? daeun
    : [{ ageStart: 30, ageEnd: 39, pillar: "분석 중", summary: "기본 대운 흐름 점검" }];

  data.dataQuality = {
    ...dataQuality,
    missingCore: Array.isArray(dataQuality.missingCore) ? dataQuality.missingCore : [],
  };

  return data;
}

function mergeSajuResultIntoLifeBookInputData(lifeBookInputData = {}, sajuResult = {}) {
  const next = lifeBookInputData && typeof lifeBookInputData === "object" ? { ...lifeBookInputData } : {};
  const pillars = sajuResult && typeof sajuResult.pillars === "object" ? sajuResult.pillars : {};
  next.sajuChart = {
    ...(next.sajuChart || {}),
    yearPillar: String((next.sajuChart && next.sajuChart.yearPillar) || pillars.year || "").trim(),
    monthPillar: String((next.sajuChart && next.sajuChart.monthPillar) || pillars.month || "").trim(),
    dayPillar: String((next.sajuChart && next.sajuChart.dayPillar) || pillars.day || "").trim(),
    hourPillar: String((next.sajuChart && next.sajuChart.hourPillar) || pillars.hour || "").trim() || undefined,
    dayMaster: String((next.sajuChart && next.sajuChart.dayMaster) || sajuResult.dayMaster || "").trim(),
  };
  next.fiveElements = {
    ...(next.fiveElements || {}),
    ...(sajuResult.fiveElements && typeof sajuResult.fiveElements === "object" ? sajuResult.fiveElements : {}),
  };
  next.tenGods = {
    ...(next.tenGods || {}),
    ...(sajuResult.tenGods && typeof sajuResult.tenGods === "object" ? sajuResult.tenGods : {}),
  };
  if (sajuResult.usefulGod || sajuResult.avoidGod) {
    next.yongshin = {
      ...(next.yongshin || {}),
      yongshin: sajuResult.usefulGod ? [String(sajuResult.usefulGod)] : (next.yongshin?.yongshin || []),
      gishin: sajuResult.avoidGod ? [String(sajuResult.avoidGod)] : (next.yongshin?.gishin || []),
    };
  }
  return next;
}

function toLifeBookCategoryNo(chapterNo, categoryNo) {
  return `c${String(chapterNo).padStart(2, "0")}-${String(categoryNo).padStart(2, "0")}`;
}

function buildLifeBookCategories(chapter = {}, chapterNo = 1) {
  const chapterJson = chapter?.chapterJson && typeof chapter.chapterJson === "object" ? chapter.chapterJson : {};
  const sections = Array.isArray(chapterJson.sections) ? chapterJson.sections : [];
  return sections.map((section, idx) => {
    const body = String(section?.body || section?.content || "").trim();
    return {
      categoryNo: toLifeBookCategoryNo(chapterNo, idx + 1),
      title: String(section?.title || `세부 카테고리 ${idx + 1}`).trim(),
      purpose: "사주 데이터 기반 상담문",
      localSkeleton: String(section?.title || "").trim(),
      llmText: body,
      finalText: body,
    };
  });
}

function validateLifeBookCategory(category) {
  const finalText = String(category?.finalText || "");
  if (!finalText || finalText.length < 800) {
    throw new Error(`CATEGORY_TEXT_EMPTY:${String(category?.categoryNo || "unknown")}`);
  }
  for (const word of LIFEBOOK_BANNED_CATEGORY_TEXTS) {
    if (finalText.includes(word)) {
      throw new Error(`CATEGORY_TEXT_INVALID:${String(category?.categoryNo || "unknown")}:${word}`);
    }
  }
}

function validateLifeBookBeforeRender(chapters = []) {
  if (chapters.length !== 12) {
    throw new Error(`LIFE_BOOK_CHAPTER_COUNT_INVALID:${chapters.length}`);
  }
  chapters.forEach((chapter, index) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length < 5) {
      throw new Error(`LIFE_BOOK_CATEGORY_COUNT_INVALID:${index + 1}`);
    }
    categories.forEach((category) => validateLifeBookCategory(category));
  });
}

function countChars(text) {
  return [...String(text || "")].length;
}

function validateChapterLength(chapterText, targetChars) {
  const length = countChars(chapterText);
  const target = Number(targetChars || 0);
  return {
    length,
    ok: target > 0 ? length >= Math.floor(target * 0.85) : length > 0,
  };
}

function validateFullReport(fullText) {
  const length = countChars(fullText);
  return {
    length,
    ok: length >= LIFE_BOOK_MIN_TOTAL_CHARS,
  };
}

function getLifeBookTargetTotalChars(chapters) {
  return (Array.isArray(chapters) ? chapters : []).reduce(
    (sum, chapter) => sum + Number(chapter?.targetChars || 0),
    0,
  );
}

function hasForbiddenLifeBookText(text) {
  const source = String(text || "");
  return LIFEBOOK_FORBIDDEN_TEXTS.some((token) => source.includes(token));
}

function hasRepetitiveSentences(text) {
  const sentences = String(text || "")
    .split(/[.!?。！？\n]/)
    .map((row) => String(row || "").trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const counts = new Map();
  for (const sentence of sentences) {
    const hit = Number(counts.get(sentence) || 0) + 1;
    counts.set(sentence, hit);
    if (hit >= 3) return true;
  }
  return false;
}

function sanitizeLifeBookTextForPdf(text) {
  let source = String(text || "");
  for (const token of LIFEBOOK_FORBIDDEN_TEXTS) {
    if (!token) continue;
    source = source.split(token).join("");
  }
  source = source
    .replace(/\|.*\|.*\|/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return source;
}

function sanitizeLifeBookChapters(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).map((chapter) => {
    const chapterJson = chapter?.chapterJson && typeof chapter.chapterJson === "object"
      ? chapter.chapterJson
      : {};
    const sections = Array.isArray(chapterJson.sections)
      ? chapterJson.sections.map((section) => ({
        ...section,
        body: sanitizeLifeBookTextForPdf(section?.body || ""),
      }))
      : [];
    return {
      ...chapter,
      summary: sanitizeLifeBookTextForPdf(chapter?.summary || ""),
      contentMarkdown: sanitizeLifeBookTextForPdf(chapter?.contentMarkdown || ""),
      practicalAdvice: Array.isArray(chapter?.practicalAdvice)
        ? chapter.practicalAdvice.map((row) => sanitizeLifeBookTextForPdf(row)).filter(Boolean)
        : [],
      warnings: Array.isArray(chapter?.warnings)
        ? chapter.warnings.map((row) => sanitizeLifeBookTextForPdf(row)).filter(Boolean)
        : [],
      chapterJson: {
        ...chapterJson,
        summary: sanitizeLifeBookTextForPdf(chapterJson.summary || ""),
        sections,
        keyInsights: Array.isArray(chapterJson.keyInsights)
          ? chapterJson.keyInsights.map((row) => sanitizeLifeBookTextForPdf(row)).filter(Boolean)
          : [],
        practicalAdvice: Array.isArray(chapterJson.practicalAdvice)
          ? chapterJson.practicalAdvice.map((row) => sanitizeLifeBookTextForPdf(row)).filter(Boolean)
          : [],
        cautions: Array.isArray(chapterJson.cautions)
          ? chapterJson.cautions.map((row) => sanitizeLifeBookTextForPdf(row)).filter(Boolean)
          : [],
      },
    };
  });
}

function buildLifeBookPdfPayloadFromInput(lifeBookInputData = {}) {
  return buildSajuLifeBookPdfPayload(lifeBookInputData, LIFE_BOOK_CHAPTERS);
}

function validateLifeBookGeneratedReport({ chapters = [], chapterSchema = LIFE_BOOK_CHAPTERS } = {}) {
  const reasons = [];
  const invalidChapters = [];
  const normalizedChapters = Array.isArray(chapters) ? chapters : [];
  const schema = Array.isArray(chapterSchema) ? chapterSchema : [];

  if (!normalizedChapters.length) reasons.push("EMPTY_CHAPTERS");
  if (schema.length !== normalizedChapters.length) reasons.push("CHAPTER_COUNT_MISMATCH");

  const seenBodies = new Set();
  for (let i = 0; i < normalizedChapters.length; i += 1) {
    const chapter = normalizedChapters[i] || {};
    const config = schema[i] || {};
    const chapterId = String(chapter.id || config.id || `chapter-${String(i + 1).padStart(2, "0")}`);
    const title = String(chapter.title || "").trim();
    const body = String(chapter.contentMarkdown || "").trim();
    const minLength = Number(config?.minLength || 2500);
    const chapterReasons = [];

    if (!title) chapterReasons.push("MISSING_TITLE");
    if (!body) chapterReasons.push("MISSING_BODY");
    if (body.length < minLength) chapterReasons.push("BODY_TOO_SHORT");
    if (hasForbiddenLifeBookText(`${title}\n${body}`)) chapterReasons.push("FORBIDDEN_TEXT");
    if (hasRepetitiveSentences(body)) chapterReasons.push("REPETITIVE_SENTENCES");

    const chapterJson = chapter.chapterJson && typeof chapter.chapterJson === "object" ? chapter.chapterJson : {};
    const sections = Array.isArray(chapterJson.sections) ? chapterJson.sections : [];
    if (!sections.length) chapterReasons.push("MISSING_SECTIONS");
    sections.forEach((section) => {
      const st = String(section?.title || "").trim();
      const sb = String(section?.body || "").trim();
      if (!st || !sb || sb.length < 500) chapterReasons.push("SECTION_TOO_SHORT");
    });

    const bodyFp = body.replace(/\s+/g, " ").trim().toLowerCase();
    if (bodyFp && seenBodies.has(bodyFp)) chapterReasons.push("DUPLICATED_CHAPTER_BODY");
    if (bodyFp) seenBodies.add(bodyFp);

    if (chapterReasons.length) {
      invalidChapters.push(chapterId);
      reasons.push(`${chapterId}:${chapterReasons.join(",")}`);
    }
  }

  return {
    ok: reasons.length === 0,
    invalidChapters,
    reasons,
  };
}

async function repairInvalidLifeBookChaptersWithApiOrLocal({
  env,
  lifeBookInputData,
  chapters,
  chapterMemories,
  previousTexts,
  chapterSchema,
  invalidChapterIds,
  warnings,
}) {
  const repaired = Array.isArray(chapters) ? [...chapters] : [];
  const schema = Array.isArray(chapterSchema) ? chapterSchema : [];
  const invalidSet = new Set(Array.isArray(invalidChapterIds) ? invalidChapterIds : []);

  for (let i = 0; i < schema.length; i += 1) {
    const config = schema[i];
    const chapterId = String(config?.id || `chapter-${String(i + 1).padStart(2, "0")}`);
    if (!invalidSet.has(chapterId)) continue;

    logLifeBookStage("CHAPTER_REPAIR_API_RETRY_START", { chapterId });
    const retryGenerated = await generateLifeBookChapter({
      env,
      chapterConfig: config,
      lifeBookInputData,
      strictMode: false,
      maxRetries: 1,
      previousTexts: [
        ...(Array.isArray(previousTexts) ? previousTexts : []),
        ...repaired.filter((_, idx) => idx !== i).map((entry) => entry?.contentMarkdown || ""),
      ],
      chapterMemories: Array.isArray(chapterMemories) ? chapterMemories.filter((_, idx) => idx !== i) : [],
    });

    if (retryGenerated?.ok && retryGenerated?.chapterResult) {
      repaired[i] = retryGenerated.chapterResult;
      if (Array.isArray(chapterMemories)) chapterMemories[i] = buildChapterMemory(config, retryGenerated.chapterResult);
      logLifeBookStage("CHAPTER_REPAIR_API_RETRY_SUCCESS", { chapterId });
      continue;
    }

    logLifeBookStage("CHAPTER_REPAIR_LOCAL_FALLBACK_START", { chapterId });
    const localGenerated = await generateLifeBookChapter({
      env,
      chapterConfig: config,
      lifeBookInputData,
      strictMode: false,
      forceLocal: true,
      previousTexts: [
        ...(Array.isArray(previousTexts) ? previousTexts : []),
        ...repaired.filter((_, idx) => idx !== i).map((entry) => entry?.contentMarkdown || ""),
      ],
      chapterMemories: Array.isArray(chapterMemories) ? chapterMemories.filter((_, idx) => idx !== i) : [],
    });
    if (localGenerated?.ok && localGenerated?.chapterResult) {
      repaired[i] = localGenerated.chapterResult;
      if (Array.isArray(chapterMemories)) chapterMemories[i] = buildChapterMemory(config, localGenerated.chapterResult);
      if (Array.isArray(warnings)) {
        warnings.push({ chapterId, warning: "CHAPTER_REPAIRED_BY_LOCAL_FALLBACK" });
      }
      logLifeBookStage("CHAPTER_REPAIR_LOCAL_FALLBACK_SUCCESS", { chapterId });
    }
  }

  return repaired;
}

function normalizeUsedThemes(chapterConfig, chapterResult) {
  const source = String(chapterResult?.contentMarkdown || "");
  const sections = Array.isArray(chapterConfig?.sections) ? chapterConfig.sections : [];
  return sections.filter((section) => source.includes(String(section || "").trim()));
}

function buildChapterMemory(chapterConfig, chapterResult) {
  const practicalAdvice = Array.isArray(chapterResult?.practicalAdvice) ? chapterResult.practicalAdvice : [];
  return {
    chapterId: String(chapterConfig?.id || chapterResult?.id || ""),
    title: String(chapterResult?.title || chapterConfig?.title || "").trim(),
    summary: String(chapterResult?.summary || "").trim(),
    usedThemes: normalizeUsedThemes(chapterConfig, chapterResult),
    usedAdvice: practicalAdvice.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5),
  };
}

function normalizeLifeBookPdfChapterJson(chapterResult = {}, chapterConfig = {}) {
  const chapterJson = chapterResult?.chapterJson && typeof chapterResult.chapterJson === "object"
    ? chapterResult.chapterJson
    : {};

  const summary = String(chapterJson.summary || chapterResult.summary || "").trim();
  const practicalAdvice = Array.isArray(chapterJson.practicalAdvice)
    ? chapterJson.practicalAdvice.map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(chapterResult.practicalAdvice)
      ? chapterResult.practicalAdvice.map((item) => String(item || "").trim()).filter(Boolean)
      : []);
  const cautions = Array.isArray(chapterJson.cautions)
    ? chapterJson.cautions.map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(chapterResult.warnings)
      ? chapterResult.warnings.map((item) => String(item || "").trim()).filter(Boolean)
      : []);
  const sections = Array.isArray(chapterJson.sections)
    ? chapterJson.sections.map((item) => ({
      title: String(item?.title || "").trim(),
      body: String(item?.body || "").trim(),
    })).filter((item) => item.title || item.body)
    : [];
  const keyInsights = Array.isArray(chapterJson.keyInsights)
    ? chapterJson.keyInsights.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    id: String(chapterResult.id || chapterConfig.id || "").trim(),
    roman: String(chapterResult.roman || chapterConfig.roman || "").trim(),
    title: String(chapterResult.title || chapterConfig.title || "").trim(),
    subtitle: String(chapterResult.subtitle || chapterConfig.subtitle || "").trim(),
    summary,
    sections,
    keyInsights,
    practicalAdvice,
    cautions,
    contentMarkdown: String(chapterResult.contentMarkdown || "").trim(),
  };
}

function buildLifeBookPdfData({ reportId, lifeBookInputData, chapters: chapterList, generatedAt }) {
  const chapterRows = (Array.isArray(chapterList) ? chapterList : []).map((chapterResult, index) => {
    const chapterConfig = LIFE_BOOK_CHAPTERS[index] || {};
    const chapterJson = normalizeLifeBookPdfChapterJson(chapterResult, chapterConfig);
    return {
      chapter: index + 1,
      chapterId: chapterJson.id || `chapter-${String(index + 1).padStart(2, "0")}`,
      chapterJson,
      text: chapterJson.contentMarkdown,
    };
  });

  const profile = lifeBookInputData?.userProfile || {};
  const saju = lifeBookInputData?.sajuChart || {};
  const five = lifeBookInputData?.fiveElements || {};
  const tenGodDist = lifeBookInputData?.tenGods?.distribution || {};
  const sortedElements = Object.entries(five)
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const sortedTenGods = Object.entries(tenGodDist)
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const majorLuck = Array.isArray(lifeBookInputData?.daeun) ? lifeBookInputData.daeun : [];

  const normalizedChapters = chapterRows.map((row, index) => ({
    id: row.chapterJson.id || `ch${String(index + 1).padStart(2, "0")}`,
    title: row.chapterJson.title || `Ch.${index + 1}`,
    sections: (Array.isArray(row.chapterJson.sections) ? row.chapterJson.sections : []).map((section, sectionIndex) => ({
      id: `${row.chapterJson.id || `ch${String(index + 1).padStart(2, "0")}`}-sec-${String(sectionIndex + 1).padStart(2, "0")}`,
      title: String(section?.title || "").trim(),
      content: String(section?.body || "").trim(),
    })),
  }));

  return {
    title: "사주 인생의 책",
    subtitle: "원국, 오행, 십성, 용신, 12운성, 대운으로 읽는 나의 인생 설계도",
    mode: "solo",
    profile: {
      name: String(profile?.name || "").trim(),
      birthDateLabel: String(profile?.birthDate || "").trim(),
      birthTimeLabel: String(profile?.birthTime || "").trim(),
      genderLabel: String(profile?.gender || "").trim(),
      calendarTypeLabel: String(profile?.calendarType || "").trim(),
    },
    summary: {
      dayMaster: String(saju?.dayMaster || "").trim(),
      dayPillar: String(saju?.dayPillar || "").trim(),
      strongElements: sortedElements.slice(0, 2).map(([key]) => key),
      weakElements: sortedElements.slice(-2).map(([key]) => key),
      dominantTenGods: sortedTenGods.slice(0, 3).map(([key]) => key),
      usefulGod: Array.isArray(lifeBookInputData?.yongshin?.yongshin) ? lifeBookInputData.yongshin.yongshin : [],
      currentMajorLuck: String(majorLuck[0]?.pillar || "").trim(),
    },
    reportId,
    generatedAt,
    totalChapters: chapterRows.length,
    minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS,
    userProfile: lifeBookInputData?.userProfile || {},
    dataQuality: lifeBookInputData?.dataQuality || {},
    chapters: normalizedChapters,
    chapterRows,
  };
}

export async function generateLifeBookPdf(params = {}) {
  const env = params.env || {};
  const body = params.body || {};
  const normalizedInput = params.normalizedInput || {};
  const strictMode = params.strictMode === true;
  const localOnly = params.localOnly === true;
  const requestedChapter = Number(params.requestedChapter || 0);
  const reportId = String(params.reportId || "").trim();
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;
  const previousTexts = Array.isArray(params.previousTexts) ? params.previousTexts : [];
  const warnings = [];

  if (localOnly) {
    return {
      ok: false,
      code: "SAJU_LIFE_BOOK_LOCAL_FALLBACK_DISABLED",
      message: "사주 인생의 책 PDF는 로컬 fallback 본문 생성이 비활성화되어 있습니다.",
      retryable: true,
      failedSections: [],
    };
  }

  logLifeBookStage("REQUEST_START", { reportId });

  if (onProgress) onProgress({ code: "CALCULATING_SAJU", message: "사주 명식 계산 중" });

  logLifeBookStage("INPUT_NORMALIZE_START", { reportId });
  let lifeBookInputData = applyLenientLifeBookCoreDefaults(buildLifeBookInputData(body, normalizedInput));
  if (body?.sajuResult && typeof body.sajuResult === "object") {
    lifeBookInputData = mergeSajuResultIntoLifeBookInputData(lifeBookInputData, body.sajuResult);
  }
  logLifeBookStage("INPUT_NORMALIZE_SUCCESS", { reportId });

  const strictCheck = isStrictMissingCore(lifeBookInputData);
  const forceLocalForMissingCore = !strictCheck.ok;
  if (strictMode && !strictCheck.ok) {
    return {
      ok: false,
      code: "SAJU_LIFE_BOOK_CORE_SIGNAL_MISSING",
      message: "사주 핵심 계산 데이터가 부족해 인생의 책을 생성할 수 없습니다.",
      retryable: true,
      missingCore: strictCheck.missingCore,
      failedSections: [],
    };
  }
  if (!strictCheck.ok) {
    warnings.push({
      chapterId: "input",
      warning: "CORE_SIGNAL_MISSING_LENIENT_FALLBACK",
      validation: { missingCore: strictCheck.missingCore },
    });
  }

  logLifeBookStage("PAYLOAD_NORMALIZE_START", { reportId });
  const pdfPayload = buildLifeBookPdfPayloadFromInput(lifeBookInputData);
  const payloadValidation = validateSajuLifeBookPdfPayload(pdfPayload);
  if (!payloadValidation.ok) {
    return {
      ok: false,
      code: "LIFEBOOK_REQUIRED_PROFILE_MISSING",
      message: "인생의 책 생성을 위해 필수 입력 정보가 필요합니다.",
      detail: { missingFields: payloadValidation.missing || [] },
    };
  }
  if (Array.isArray(payloadValidation.missing) && payloadValidation.missing.length) {
    warnings.push({
      chapterId: "input",
      warning: "PAYLOAD_RECOVERABLE_MISSING",
      validation: { missingFields: payloadValidation.missing },
    });
  }
  logLifeBookStage("PAYLOAD_NORMALIZE_SUCCESS", { reportId });
  try {
    console.info("[SajuLifeBookAPI] generation start", {
      featureKey: FEATURE_KEY_SAJU_LIFE_BOOK_PDF,
      accessOk: true,
      hasSajuResult: Boolean(body?.sajuResult),
      hasBirthData: Boolean(body?.birthData || lifeBookInputData?.userProfile?.birthDate),
      reportId,
    });
  } catch {
    // no-op
  }
  if (onProgress) onProgress({ code: "NORMALIZING_INPUT", message: "인생의 책 데이터 정리 중" });

  const chapterManifest = Array.isArray(pdfPayload?.chapters) && pdfPayload.chapters.length
    ? pdfPayload.chapters
    : [...LIFE_BOOK_CHAPTERS];
  const targetChapters = requestedChapter >= 1
    ? [chapterManifest[Math.max(0, Math.min(chapterManifest.length - 1, requestedChapter - 1))] || getLifeBookChapterByNumber(requestedChapter)]
    : [...chapterManifest];

  const chapters = [];
  const chapterMemories = [];

  for (let index = 0; index < targetChapters.length; index += 1) {
    const chapterConfig = targetChapters[index];
    if (!chapterConfig || !Array.isArray(chapterConfig.categories) || !chapterConfig.categories.length) {
      return {
        ok: false,
        code: "LIFEBOOK_CATEGORY_SOURCE_EMPTY",
        message: `카테고리 sourceData가 비어 있습니다: ${chapterConfig?.id || index + 1}`,
        detail: { chapterId: chapterConfig?.id || `chapter-${index + 1}` },
      };
    }
    if (onProgress) {
      onProgress({
        code: "GENERATING_CHAPTER",
        chapter: chapterConfig,
        message: `${chapterConfig.roman} 챕터 생성 중`,
      });
    }

    logLifeBookStage("API_GENERATION_START", { chapterId: chapterConfig.id });
    const generated = await generateLifeBookChapter({
      env,
      chapterConfig,
      lifeBookInputData,
      strictMode,
      forceLocal: localOnly || forceLocalForMissingCore,
      maxRetries: 2,
      previousTexts: [
        ...previousTexts,
        ...chapters.map((c) => c.contentMarkdown || ""),
      ],
      chapterMemories,
    });

    if (!generated?.ok) {
      logLifeBookStage("API_GENERATION_FAILED", {
        chapterId: chapterConfig.id,
        code: generated?.code,
      });
      const localGenerated = await generateLifeBookChapter({
        env,
        chapterConfig,
        lifeBookInputData,
        strictMode: false,
        forceLocal: true,
        previousTexts: [
          ...previousTexts,
          ...chapters.map((c) => c.contentMarkdown || ""),
        ],
        chapterMemories,
      });

      if (!localGenerated?.ok || !localGenerated?.chapterResult) {
        return {
          ok: false,
          code: "SAJU_LIFE_BOOK_LLM_GENERATION_FAILED",
          message: "사주 인생의 책 PDF 본문 생성 중 일부 챕터가 완성되지 않았습니다. 결제는 중복 차감되지 않도록 보호되며, 다시 생성할 수 있도록 상태를 복구했습니다.",
          failedSections: [{ chapterId: chapterConfig.id, sectionId: `${chapterConfig.id}-all`, reason: generated?.code || "LLM_VALIDATION_FAILED" }],
          retryable: true,
          detail: generated?.validation || null,
        };
      }

      chapters.push(localGenerated.chapterResult);
      chapterMemories.push(buildChapterMemory(chapterConfig, localGenerated.chapterResult));
      warnings.push({
        chapterId: chapterConfig.id,
        warning: "CHAPTER_REPAIRED_BY_LOCAL_DETERMINISTIC_FALLBACK",
        validation: generated?.validation || null,
      });
      continue;
    }

    logLifeBookStage("API_GENERATION_SUCCESS", { chapterId: chapterConfig.id });

    chapters.push(generated.chapterResult);
    chapterMemories.push(buildChapterMemory(chapterConfig, generated.chapterResult));

    const chapterLength = validateChapterLength(generated.chapterResult?.contentMarkdown || "", chapterConfig?.targetChars);
    if (!chapterLength.ok) {
      warnings.push({
        chapterId: chapterConfig.id,
        warning: "CHAPTER_LENGTH_BELOW_85_PERCENT",
        validation: {
          length: chapterLength.length,
          targetChars: Number(chapterConfig?.targetChars || 0),
          minRecommendedChars: Math.floor(Number(chapterConfig?.targetChars || 0) * 0.85),
        },
      });
    }

  }

  if (requestedChapter >= 1) {
    return {
      ok: true,
      source: "api",
      mode: "life-book",
      reportId,
      totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
      lifeBookInputData,
      chapters,
      chapterMemories,
      warnings,
    };
  }

  let fullText = chapters.map((chapter) => String(chapter?.contentMarkdown || "").trim()).filter(Boolean).join("\n\n");
  let fullValidation = validateFullReport(fullText);

  logLifeBookStage("QualityEnhanceStart", { reportId });
  let reportValidation = validateLifeBookGeneratedReport({
    chapters,
    chapterSchema: targetChapters,
  });
  if (!reportValidation.ok) {
    logLifeBookStage("QualityEnhanceFailed", {
      reportId,
      invalidChapters: reportValidation.invalidChapters,
    });
    return {
      ok: false,
      code: "SAJU_LIFE_BOOK_LLM_GENERATION_FAILED",
      message: "사주 인생의 책 PDF 본문 생성 중 일부 챕터가 완성되지 않았습니다. 결제는 중복 차감되지 않도록 보호되며, 다시 생성할 수 있도록 상태를 복구했습니다.",
      failedSections: (reportValidation.invalidChapters || []).map((chapterId) => ({
        chapterId,
        sectionId: `${chapterId}-all`,
        reason: "LLM_VALIDATION_FAILED",
      })),
      retryable: true,
      detail: reportValidation,
    };
  } else {
    logLifeBookStage("QualityEnhanceSuccess", { reportId });
  }

  if (!fullValidation.ok && chapters.length > 0) {
    const byNeed = chapters
      .map((chapter, index) => {
        const config = targetChapters[index] || {};
        const target = Number(config?.targetChars || 0);
        const length = countChars(chapter?.contentMarkdown || "");
        return {
          index,
          score: target > 0 ? target - length : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    for (const row of byNeed) {
      if (fullValidation.ok) break;
      const chapterConfig = targetChapters[row.index];
      if (!chapterConfig) continue;

      const regenerated = await generateLifeBookChapter({
        env,
        chapterConfig,
        lifeBookInputData,
        strictMode: false,
        maxRetries: 1,
        previousTexts: [
          ...previousTexts,
          ...chapters
            .filter((_, index) => index !== row.index)
            .map((entry) => entry?.contentMarkdown || ""),
        ],
        chapterMemories: chapterMemories.filter((_, index) => index !== row.index),
      });

      if (regenerated?.ok && regenerated?.chapterResult) {
        chapters[row.index] = regenerated.chapterResult;
        chapterMemories[row.index] = buildChapterMemory(chapterConfig, regenerated.chapterResult);
      }

      fullText = chapters.map((chapter) => String(chapter?.contentMarkdown || "").trim()).filter(Boolean).join("\n\n");
      fullValidation = validateFullReport(fullText);
    }
  }

  warnings.push({
    chapterId: "full-report",
    warning: fullValidation.ok ? "FULL_REPORT_LENGTH_OK" : "FULL_REPORT_LENGTH_BELOW_MIN",
    validation: {
      length: fullValidation.length,
      minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS,
      targetTotalChars: getLifeBookTargetTotalChars(LIFE_BOOK_CHAPTERS),
    },
  });

  if (onProgress) onProgress({ code: "RENDERING_PDF", message: "PDF 편집 중" });
  logLifeBookStage("RenderStart", { reportId });

  const sanitizedChapters = sanitizeLifeBookChapters(chapters);
  const chaptersWithCategories = sanitizedChapters.map((chapter, idx) => ({
    ...chapter,
    chapterNo: idx + 1,
    categories: buildLifeBookCategories(chapter, idx + 1),
  }));
  try {
    const emptyCategories = chaptersWithCategories
      .flatMap((chapter) => (Array.isArray(chapter.categories) ? chapter.categories : []))
      .filter((cat) => !String(cat?.finalText || "").trim() || String(cat?.finalText || "").trim().length < 800)
      .map((cat) => cat.categoryNo);
    console.info("[SajuLifeBookPDF] before render", {
      chapterCount: chaptersWithCategories.length,
      categoryCount: chaptersWithCategories.reduce((sum, ch) => sum + (Array.isArray(ch.categories) ? ch.categories.length : 0), 0),
      emptyCategories,
    });
    validateLifeBookBeforeRender(chaptersWithCategories);
  } catch (error) {
    return {
      ok: false,
      code: "SAJU_LIFE_BOOK_CATEGORY_VALIDATION_FAILED",
      message: String(error?.message || "카테고리 본문 검증 실패"),
      retryable: true,
      detail: {
        reportId,
      },
    };
  }
  sanitizedChapters.forEach((chapter, index) => {
    const chapterMeta = targetChapters[index] || {};
    assertNoSajuLifeBookFallbackText(`${chapter?.title || ""}\n${chapter?.summary || ""}\n${chapter?.contentMarkdown || ""}`, {
      mode: "lifeBook",
      chapterId: chapterMeta?.id || chapter?.id,
      hasSourceData: true,
      llmRetryCount: 0,
      payloadValidation,
    });
  });

  const rendered = renderLifeBookPdf({
    reportId,
    lifeBookInputData,
    chapters: sanitizedChapters,
    generatedAt: new Date().toISOString(),
  });

  assertNoSajuLifeBookFallbackText(rendered?.html || "", {
    mode: "lifeBook",
    chapterId: "render",
    hasSourceData: true,
    payloadValidation,
  });

  const pdfData = buildLifeBookPdfData({
    reportId,
    lifeBookInputData,
    chapters: sanitizedChapters,
    generatedAt: rendered?.generatedAt || new Date().toISOString(),
  });

  assertNoSajuLifeBookFallbackText(JSON.stringify(pdfData || {}), {
    mode: "lifeBook",
    chapterId: "pdf-data",
    hasSourceData: true,
    payloadValidation,
  });

  if (onProgress) onProgress({ code: "PDF_READY", message: "다운로드 준비 완료" });
  logLifeBookStage("RenderSuccess", { reportId });

  const hasLocal = warnings.some((w) => {
    const marker = String(w?.warning || "");
    return marker.includes("LOCAL") || marker.includes("FALLBACK");
  });
  const source = hasLocal ? "mixed" : "api";

  return {
    ok: true,
    source,
    mode: "life-book",
    reportId,
    totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
    lifeBookInputData,
    chapters,
    chapterMemories,
    warnings,
    fullValidation,
    pdfData,
    rendered,
  };
}
