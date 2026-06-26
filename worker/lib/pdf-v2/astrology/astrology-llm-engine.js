import { prepareAstroPremiumCalculation } from "../../astro-premium-generator.js";
import { generateAstrologyTextWithLlm, resolveAstrologyLlmProviders, resolveAstrologyModelName } from "./llm-client.js";
import { asArray, clean, hashStable, logAstrologyPdfEvent, safeObject } from "./astrology-premium.types.js";
import {
  ASTROLOGY_LLM_VERSION,
  loadAstrologyChapterConfig,
} from "./astrology-chapters.js";
import {
  ASTROLOGY_PROMPT_VERSION,
  astrologySystemPrompt,
  buildAstrologyChapterPrompt,
  buildAstrologyRepairPrompt,
} from "./astrology-prompts.js";
import {
  parseAstrologyChapterHtml,
  validateAstrologyChapterHtml,
} from "./astrology-validator.js";

const ASTROLOGY_PREMIUM_MANUSCRIPT_SOURCE = "astrology-premium-llm-only";
const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.ASTROLOGY_PREMIUM_LLM_CACHE || env?.ASTROLOGY_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
}

async function getCachedChapter(env, key) {
  const memory = CHAPTER_CACHE.get(key);
  if (memory) return memory;
  const store = readCacheStore(env);
  if (!store?.get) return null;
  const text = await store.get(key);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function saveChapterCache(env, key, value) {
  CHAPTER_CACHE.set(key, value);
  const store = readCacheStore(env);
  if (store?.put) {
    await store.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

function firstClean(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function findPlanet(planets = [], name = "") {
  const target = clean(name).toLowerCase();
  return asArray(planets).find((planet) => clean(planet?.name || planet?.label || planet?.planet).toLowerCase() === target) || null;
}

function normalizePoint(point, fallbackName = "") {
  if (!point) return null;
  if (typeof point !== "object") return { name: fallbackName, sign: clean(point) };
  return {
    name: clean(point.name || point.label || fallbackName),
    sign: clean(point.sign || point.signKo || point.zodiacSign),
    house: Number.isFinite(Number(point.house)) ? Number(point.house) : undefined,
    degree: clean(point.degree || point.longitude),
    retrograde: point.retrograde === true,
  };
}

function normalizePlanet(row = {}) {
  const source = safeObject(row);
  return {
    name: clean(source.name || source.label || source.planet),
    sign: clean(source.sign || source.signKo || source.zodiacSign),
    house: Number.isFinite(Number(source.house)) ? Number(source.house) : undefined,
    degree: clean(source.degree || source.longitude),
    retrograde: source.retrograde === true,
  };
}

function normalizeHouse(row = {}) {
  const source = safeObject(row);
  return {
    house: Number.isFinite(Number(source.house || source.number)) ? Number(source.house || source.number) : undefined,
    sign: clean(source.sign || source.signKo),
    cuspDegree: clean(source.cuspDegree || source.degree || source.longitude),
    planets: asArray(source.planets).map((planet) => clean(planet?.name || planet?.label || planet)).filter(Boolean),
  };
}

function normalizeAspect(row = {}) {
  const source = safeObject(row);
  return {
    planetA: clean(source.planetA || source.p1 || source.from),
    planetB: clean(source.planetB || source.p2 || source.to),
    type: clean(source.type || source.aspect),
    orb: clean(source.orb),
    applying: source.applying === true,
  };
}

function normalizeTransit(row = {}) {
  const source = safeObject(row);
  const aspect = safeObject(source.aspect || source.aspectToNatal);
  return {
    planet: clean(source.planet || source.label),
    sign: clean(source.sign || source.signKo),
    house: Number.isFinite(Number(source.house)) ? Number(source.house) : undefined,
    aspectToNatal: clean(source.aspectToNatal || source.aspectText || aspect.text || aspect.label),
    theme: clean(source.theme || source.summary || source.text),
  };
}

function normalizeTransits(localAstroChartJson = {}, rawInput = {}) {
  const chart = safeObject(localAstroChartJson.chart || rawInput.astrologyChart || rawInput.chart);
  const timing = safeObject(localAstroChartJson.timingInsights || rawInput.timingInsights);
  const snapshots = asArray(timing.snapshots).flatMap((snapshot) => [
    ...asArray(snapshot.outerPlanets).map((text) => ({ theme: `${clean(snapshot.label)} ${clean(text)}` })),
    ...asArray(snapshot.aspects).map((aspect) => ({ aspectToNatal: aspect.text || aspect.label, theme: clean(snapshot.label) })),
  ]);
  return [
    ...asArray(chart.transits),
    ...asArray(rawInput.transits),
    ...asArray(timing.transits),
    ...snapshots,
  ].map(normalizeTransit).filter((item) => clean(item.planet || item.sign || item.aspectToNatal || item.theme));
}

export function validateAstrologyInput(rawInput = {}, localAstroChartJson = {}) {
  const input = safeObject(rawInput);
  const birthInput = safeObject(localAstroChartJson.birthInput || input.birthInput || input.userProfile || input.profile || input);
  const chartSource = safeObject(localAstroChartJson.chart || input.astrologyChart || input.chart || input.astroBase?.chart || input.astroBase);
  const planets = asArray(chartSource.planets).map(normalizePlanet).filter((planet) => clean(planet.name || planet.sign));
  const houses = asArray(chartSource.houses).map(normalizeHouse).filter((house) => Number.isFinite(Number(house.house)) || clean(house.sign));
  const aspects = asArray(chartSource.aspects).map(normalizeAspect).filter((aspect) => clean(aspect.planetA || aspect.planetB || aspect.type));
  const sun = normalizePoint(chartSource.sun || findPlanet(planets, "Sun") || { name: "Sun", sign: chartSource.sunSign }, "Sun");
  const moon = normalizePoint(chartSource.moon || findPlanet(planets, "Moon") || { name: "Moon", sign: chartSource.moonSign }, "Moon");
  const ascendant = normalizePoint(chartSource.ascendant || chartSource.ascendantSign || chartSource.risingSign, "ASC");
  const midheaven = normalizePoint(chartSource.midheaven || chartSource.midheavenSign || chartSource.mc, "MC");
  const birthTime = firstClean(birthInput.birthTime, input.birthTime, input.time);
  const birthPlace = firstClean(birthInput.birthPlace, input.birthPlace, input.locationName);
  const timezone = firstClean(birthInput.timezone, birthInput.timezoneName, input.timezone, input.timezoneName);
  const warnings = [];
  if (!birthTime) warnings.push("출생시간이 없어 상승궁, 하우스, MC 해석은 단정하지 않습니다.");
  if (!birthPlace || !timezone) warnings.push("출생지 또는 시간대 정보가 제한되어 하우스 정확도를 신중히 다룹니다.");
  if (!planets.length) {
    throw Object.assign(new Error("ASTROLOGY_CHART_PLANETS_MISSING"), { code: "ASTROLOGY_CHART_PLANETS_MISSING", status: 422 });
  }

  return {
    service: "astrology",
    userName: firstClean(input.userName, input.name, birthInput.name),
    gender: firstClean(input.gender, birthInput.gender),
    birthDate: firstClean(input.birthDate, birthInput.birthDate),
    birthTime,
    birthPlace,
    latitude: Number.isFinite(Number(birthInput.latitude ?? input.latitude)) ? Number(birthInput.latitude ?? input.latitude) : undefined,
    longitude: Number.isFinite(Number(birthInput.longitude ?? input.longitude)) ? Number(birthInput.longitude ?? input.longitude) : undefined,
    timezone,
    houseSystem: firstClean(input.houseSystem, localAstroChartJson.houseSystem, chartSource.houseSystem),
    zodiacType: firstClean(input.zodiacType, chartSource.zodiacType, chartSource.zodiac),
    question: firstClean(input.question, input.userQuestion),
    astrologyChart: {
      sun,
      moon,
      ascendant,
      midheaven,
      planets,
      houses,
      aspects,
      elements: chartSource.elements || chartSource.elementBalance || {},
      modalities: chartSource.modalities || chartSource.modalityBalance || {},
      retrogrades: asArray(chartSource.retrogrades),
      dominantSigns: asArray(chartSource.dominantSigns),
      dominantHouses: asArray(chartSource.dominantHouses),
      chartPatterns: asArray(chartSource.chartPatterns),
      transits: normalizeTransits(localAstroChartJson, input),
    },
    categories: input.categories || input.chapterConfig || input.chapterPlan,
    warnings,
  };
}

async function calculateOrLoadAstrologyChart({ env, rawInput, requestUrl, jobId, userId, onStatus }) {
  if (rawInput.localAstroChartJson && typeof rawInput.localAstroChartJson === "object") {
    return {
      localAstroChartJson: rawInput.localAstroChartJson,
      birthInput: rawInput.localAstroChartJson.birthInput || rawInput.birthInput || rawInput,
      chartValidation: { ok: true, source: "provided-localAstroChartJson" },
      transitValidation: { ok: true, source: "provided-localAstroChartJson" },
    };
  }
  const providedChart = rawInput.astrologyChart || rawInput.chart || rawInput.astroBase?.chart || rawInput.astroBase;
  if (providedChart && typeof providedChart === "object") {
    return {
      localAstroChartJson: {
        birthInput: rawInput.birthInput || rawInput,
        chart: providedChart,
        chartSource: "provided-astrologyChart",
        engineQuality: "provided",
        houseSystem: rawInput.houseSystem || providedChart.houseSystem,
      },
      birthInput: rawInput.birthInput || rawInput,
      chartValidation: { ok: true, source: "provided-astrologyChart" },
      transitValidation: { ok: true, source: "provided-astrologyChart" },
    };
  }
  onStatus?.({ status: "validating", progress: 5, stateKey: "validating", currentChapterTitle: "출생 차트 계산" });
  return prepareAstroPremiumCalculation(env, rawInput, {
    requestUrl,
    timingBaseDate: rawInput?.timingBaseDate || rawInput?.targetDate || rawInput?.baseDate,
    log: (stage, payload) => logAstrologyPdfEvent(`ASTROLOGY_${stage}`, {
      jobId,
      userId,
      status: payload?.ok === false ? "failed" : "ok",
    }),
  });
}

export function buildAstrologyChapterCacheKey(input, chapter, meta = {}) {
  return `astrology:${hashStable({
    service: "astrology",
    version: ASTROLOGY_LLM_VERSION,
    chapterConfigVersion: meta.chapterConfigVersion,
    chapterId: chapter.id,
    birthDataHash: hashStable({
      userName: input.userName,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
    }),
    locationHash: hashStable({
      birthPlace: input.birthPlace,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
    timezoneHash: hashStable({ timezone: input.timezone }),
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    astrologyChartHash: hashStable(input.astrologyChart),
    questionHash: hashStable({ question: input.question }),
    modelName: meta.modelName,
  })}`;
}

async function generateAstrologyChapterWithLLM({ env, provider, input, chapter, chapterPlan, modelName, jobId, userId, repair }) {
  const prompt = repair
    ? buildAstrologyRepairPrompt({
      input,
      chapter,
      chapterPlan,
      invalidHtml: repair.invalidHtml,
      errors: repair.errors,
    })
    : buildAstrologyChapterPrompt({ input, chapter, chapterPlan });
  logAstrologyPdfEvent("ASTROLOGY_LLM_GENERATION_STARTED", {
    jobId,
    userId,
    chapterId: chapter.id,
    status: repair ? "repair" : "started",
    provider,
    modelName,
    promptVersion: ASTROLOGY_PROMPT_VERSION,
  });
  return generateAstrologyTextWithLlm({
    provider,
    systemPrompt: astrologySystemPrompt,
    userPrompt: prompt,
    temperature: Number(env?.ASTROLOGY_PREMIUM_LLM_TEMPERATURE ?? 0.66),
    maxTokens: Number(env?.ASTROLOGY_PREMIUM_CHAPTER_MAX_TOKENS || 9000),
    requestId: `${jobId}:${chapter.id}:${repair ? "repair" : "draft"}`,
  }, env);
}

async function generateOneChapter({ env, input, chapter, chapterPlan, modelName, jobId, userId }) {
  const cacheKey = buildAstrologyChapterCacheKey(input, chapter, {
    chapterConfigVersion: chapterPlan.version,
    modelName,
  });
  const cached = await getCachedChapter(env, cacheKey);
  if (cached?.html) {
    const validation = validateAstrologyChapterHtml(cached.html, chapter, input);
    if (
      validation.ok
      && clean(cached.version) === ASTROLOGY_LLM_VERSION
      && clean(cached.chapterConfigVersion) === chapterPlan.version
      && clean(cached.chapterId) === chapter.id
    ) {
      const parsed = parseAstrologyChapterHtml(validation.html, chapter, input);
      parsed.source = "llm-cache";
      parsed.provider = cached.provider || "cache";
      parsed.cached = true;
      return parsed;
    }
  }

  const providers = resolveAstrologyLlmProviders(env);
  const attempts = [];
  for (const provider of providers) {
    let result = await generateAstrologyChapterWithLLM({
      env,
      provider,
      input,
      chapter,
      chapterPlan: chapterPlan.chapters,
      modelName,
      jobId,
      userId,
    });
    attempts.push({ provider, repair: 0, ok: Boolean(result.ok), errorCode: clean(result.errorCode) });
    if (!result.ok) {
      for (let repairIndex = 1; !result.ok && repairIndex <= 2; repairIndex += 1) {
        result = await generateAstrologyChapterWithLLM({
          env,
          provider,
          input,
          chapter,
          chapterPlan: chapterPlan.chapters,
          modelName,
          jobId,
          userId,
          repair: {
            invalidHtml: result.text || "",
            errors: [clean(result.errorCode || result.errorMessage || "empty_response")],
          },
        });
        attempts.push({ provider, repair: repairIndex, ok: Boolean(result.ok), errorCode: clean(result.errorCode) });
      }
      if (!result.ok) continue;
    }

    let validation = validateAstrologyChapterHtml(result.text, chapter, input);
    let html = result.text;
    for (let repairIndex = 1; !validation.ok && repairIndex <= 2; repairIndex += 1) {
      result = await generateAstrologyChapterWithLLM({
        env,
        provider,
        input,
        chapter,
        chapterPlan: chapterPlan.chapters,
        modelName,
        jobId,
        userId,
        repair: {
          invalidHtml: html,
          errors: validation.issues,
        },
      });
      attempts.push({ provider, repair: repairIndex, ok: Boolean(result.ok), errorCode: clean(result.errorCode), issues: validation.issues });
      if (!result.ok) break;
      html = result.text;
      validation = validateAstrologyChapterHtml(html, chapter, input);
    }

    if (validation.ok) {
      const parsed = parseAstrologyChapterHtml(validation.html, chapter, input);
      parsed.source = "llm";
      parsed.provider = provider;
      parsed.cached = false;
      await saveChapterCache(env, cacheKey, {
        html: validation.html,
        version: ASTROLOGY_LLM_VERSION,
        chapterConfigVersion: chapterPlan.version,
        chapterId: chapter.id,
        provider,
        modelName: result.model || modelName,
        storedAt: new Date().toISOString(),
      });
      logAstrologyPdfEvent("ASTROLOGY_LLM_GENERATION_COMPLETED", {
        jobId,
        userId,
        chapterId: chapter.id,
        status: "completed",
        provider,
        modelName: result.model || modelName,
      });
      return parsed;
    }
  }

  throw Object.assign(new Error(`Astrology chapter generation failed: ${chapter.id}`), {
    code: "ASTROLOGY_PREMIUM_CHAPTER_GENERATION_FAILED",
    status: 503,
    chapterId: chapter.id,
    attempts,
    failedChapters: [{
      id: chapter.id,
      title: chapter.title,
      attempts,
    }],
  });
}

export async function generateChaptersWithLLM({ env, input, chapterPlan, jobId, userId, onStatus }) {
  const modelName = resolveAstrologyModelName(env);
  const chapters = [];
  const total = chapterPlan.chapters.length;
  for (let index = 0; index < total; index += 1) {
    const chapter = chapterPlan.chapters[index];
    onStatus?.({
      status: "generating",
      progress: Math.round(10 + (index / Math.max(1, total)) * 70),
      stateKey: "generating",
      currentChapterNo: index,
      totalChapters: total,
      currentChapterTitle: chapter.title,
      chapter,
    });
    const parsed = await generateOneChapter({ env, input, chapter, chapterPlan, modelName, jobId, userId });
    if (!clean(parsed.html)) {
      throw Object.assign(new Error(`Astrology chapter generation failed: ${chapter.id}`), {
        code: "ASTROLOGY_PREMIUM_CHAPTER_GENERATION_FAILED",
        status: 503,
        chapterId: chapter.id,
        failedChapters: [{
          id: chapter.id,
          title: chapter.title,
          reason: "ASTROLOGY_CHAPTER_EMPTY",
        }],
      });
    }
    chapters.push(parsed);
    onStatus?.({
      status: "generating",
      progress: Math.round(10 + ((index + 1) / Math.max(1, total)) * 70),
      stateKey: "generating",
      currentChapterNo: index + 1,
      totalChapters: total,
      currentChapterTitle: chapter.title,
      chapter,
    });
  }
  return { chapters, modelName };
}

export async function generateAstrologyLlmReport(params = {}) {
  const env = params.env || {};
  const rawInput = safeObject(params.input);
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || rawInput.reportId || rawInput.sessionId || `astrology-${Date.now().toString(36)}`);
  const onStatus = typeof params.onStatus === "function" ? params.onStatus : params.onProgress;
  const prepared = await calculateOrLoadAstrologyChart({
    env,
    rawInput: {
      ...rawInput,
      birthInput: safeObject(rawInput.birthInput || rawInput.userProfile || rawInput.profile || rawInput),
    },
    requestUrl: params.requestUrl,
    jobId,
    userId,
    onStatus,
  });
  const normalizedInput = validateAstrologyInput(rawInput, prepared.localAstroChartJson);
  const chapterPlan = loadAstrologyChapterConfig({ categories: normalizedInput.categories });
  onStatus?.({
    status: "generating",
    progress: 10,
    stateKey: "generating",
    currentChapterNo: 0,
    totalChapters: chapterPlan.chapters.length,
    currentChapterTitle: "점성술 챕터 생성",
  });
  const generated = await generateChaptersWithLLM({
    env,
    input: normalizedInput,
    chapterPlan,
    jobId,
    userId,
    onStatus,
  });
  const providerSet = new Set(generated.chapters.map((chapter) => clean(chapter.provider)).filter(Boolean));
  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "workers-ai-gemini"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: ASTROLOGY_PREMIUM_MANUSCRIPT_SOURCE,
    provider,
    modelName: generated.modelName,
    engineVersion: ASTROLOGY_LLM_VERSION,
    promptVersion: ASTROLOGY_PROMPT_VERSION,
    chapterPlanVersion: chapterPlan.version,
    chapterCount: generated.chapters.length,
    expectedChapterCount: chapterPlan.chapters.length,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
  };
  return {
    chapters: generated.chapters,
    chapterCount: generated.chapters.length,
    expectedChapterCount: chapterPlan.chapters.length,
    chapterPlan,
    localAstroChartJson: prepared.localAstroChartJson,
    normalizedInput,
    normalizedInputHash: hashStable(normalizedInput),
    provider,
    modelName: generated.modelName,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    manuscriptSource: ASTROLOGY_PREMIUM_MANUSCRIPT_SOURCE,
    generationMode: "pdf-v3-llm-only",
    promptVersion: ASTROLOGY_PROMPT_VERSION,
    chapterPlanVersion: chapterPlan.version,
    cacheDigest: hashStable({
      version: ASTROLOGY_LLM_VERSION,
      normalizedInput: normalizedInput,
      modelName: generated.modelName,
      chapterPlanVersion: chapterPlan.version,
    }),
    rawInputDigest: hashStable(rawInput),
    calculationValidation: {
      chart: prepared.chartValidation || null,
      transit: prepared.transitValidation || null,
    },
  };
}
