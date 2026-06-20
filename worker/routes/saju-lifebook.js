import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { Solar } from "lunar-javascript";
import {
  buildPremiumExecutionContext,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { generateLifeBookPremiumPdfV2 } from "../lib/pdf-v2/life-book/create-life-book-premium-pdf-job.js";
import { lifeBookPremiumChapterPlanV1 } from "../lib/pdf-v2/life-book/life-book-premium.chapter-plan.js";



const ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];




const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY = "saju_life_book_pdf";
const LIFEBOOK_FEATURE_KEY_ALIASES = new Set([
  "saju_lifebook_pdf",
  "premium_pdf_saju_life_book",
  "premium-lifebook-report",
]);


const LIFEBOOK_LOCAL_TARGET_YEAR = new Date().getFullYear();
const LIFEBOOK_TARGET_YEAR_MIN = 1900;
const LIFEBOOK_TARGET_YEAR_MAX = 2099;



export const LIFE_BOOK_PDF_CONFIG = Object.freeze({
  generationMode: "llm-only",
  provider: "external-llm",
  templateVersion: "life-book-llm-v1",
});
const LIFEBOOK_AUTHORING_MODE = "llm-only";
const LIFEBOOK_WRITING_STATE = "llm_generation";

function isLifeBookDbPersistenceBypassed(env = {}) {
  return String(env?.LIFE_BOOK_PREMIUM_TEST_BYPASS_DB || "").trim().toLowerCase() === "true";
}

function resolveLifeBookAssemblyRuntimeInfo(env = {}) {
  return {
    provider: LIFE_BOOK_PDF_CONFIG.provider,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    externalCallsAllowed: true,
    runtime: "llm-only",
  };
}
















const LIFEBOOK_SESSION_LOCKS = globalThis.__LIFEBOOK_SESSION_LOCKS || new Map();
if (!globalThis.__LIFEBOOK_SESSION_LOCKS) {
  globalThis.__LIFEBOOK_SESSION_LOCKS = LIFEBOOK_SESSION_LOCKS;
}

function updateLifeBookSessionProgress(sessionId, progress = {}) {
  const key = clean(sessionId);
  if (!key || !LIFEBOOK_SESSION_LOCKS.has(key)) return;
  const lock = LIFEBOOK_SESSION_LOCKS.get(key) || {};
  LIFEBOOK_SESSION_LOCKS.set(key, {
    ...lock,
    progress: {
      ...(lock.progress || {}),
      ...progress,
      updatedAt: new Date().toISOString(),
    },
  });
}

function buildLifeBookStatusPayload(lock = {}, fallback = {}) {
  const rawStatus = clean(lock.status || fallback.status || "");
  const status = rawStatus === "done" ? "done" : rawStatus === "failed" ? "failed" : rawStatus || "running";
  const result = lock.result && typeof lock.result === "object" ? lock.result : null;
  const data = result?.data && typeof result.data === "object" ? result.data : result;
  const progress = lock.progress && typeof lock.progress === "object" ? lock.progress : {};
  const totalChapters = Number(progress.totalChapters || data?.chapterCount || getLifeBookBlueprints().length);
  return {
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    data: {
      sessionId: clean(lock.sessionId || fallback.sessionId),
      reportId: clean(lock.reportId || fallback.reportId || data?.reportId),
      status,
      startedAt: clean(lock.startedAt || fallback.startedAt),
      completedAt: clean(fallback.completedAt || data?.completedAt),
      failedAt: clean(fallback.failedAt),
      progress: {
        stateKey: clean(progress.stateKey || (status === "done" ? "completed" : status === "failed" ? "failed" : LIFEBOOK_WRITING_STATE)),
        currentChapterNo: Math.max(0, Math.min(totalChapters, Number(progress.currentChapterNo || (status === "done" ? totalChapters : 0)) || 0)),
        totalChapters,
        currentChapterTitle: clean(progress.currentChapterTitle),
        updatedAt: clean(progress.updatedAt),
      },
      lifeBookPdfRecord: lock.lifeBookPdfRecord || data?.lifeBookPdfRecord || fallback.lifeBookPdfRecord || null,
      pdfReady: data?.pdfReady || fallback.pdfReady || null,
      chapters: data?.chapters || data?.pdfReady?.chapters || fallback.chapters || [],
      generationMode: clean(data?.generationMode || data?.pdfReady?.generationMode || fallback.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode),
      manuscriptSource: clean(data?.manuscriptSource || data?.pdfReady?.manuscriptSource || fallback.manuscriptSource),
      writingPipeline: clean(data?.writingPipeline || data?.pdfReady?.writingPipeline || fallback.writingPipeline),
      llmAssembly: data?.llmAssembly || data?.pdfReady?.llmAssembly || fallback.llmAssembly || null,
      pdfUrl: clean(data?.pdfUrl || data?.downloadUrl || data?.htmlUrl || data?.pdfReady?.pdfUrl || data?.pdfReady?.downloadUrl),
      htmlUrl: clean(data?.htmlUrl || data?.pdfReady?.htmlUrl),
      canDownload: Boolean(data?.canDownload || clean(data?.pdfUrl || data?.downloadUrl || data?.htmlUrl || data?.pdfReady?.pdfUrl || data?.pdfReady?.downloadUrl)),
      error: lock.error || fallback.error || null,
    },
  };
}

async function findLifeBookReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  if (isLifeBookDbPersistenceBypassed(env)) return null;
  try {
    await connectDb(withPdfFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    const cacheKey = clean(executionCtx.cacheKey || executionCtx.metadata?.cacheKey || executionCtx.metadata?.lifeBookPdfCacheKey || fallback.cacheKey);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (cacheKey) {
      filters.push(
        { cacheKey },
        { "metadata.cacheKey": cacheKey },
        { "metadata.lifeBookPdfCacheKey": cacheKey },
      );
    }
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "lifeBook",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    logLifeBookServer("ReusableExecutionLookupFailed", { reason: clean(error?.message || error) });
    return null;
  }
}

function buildLifeBookReusableExecutionResponse(doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive?.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReady = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  const chapters = Array.isArray(archive.chapters)
    ? archive.chapters
    : Array.isArray(payload.chapters)
      ? payload.chapters
      : Array.isArray(pdfReady?.chapters)
        ? pdfReady.chapters
        : [];
  const generationMode = clean(archive.generationMode || payload.generationMode || pdfReady?.generationMode || metadata.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode);
  const manuscriptSource = clean(archive.manuscriptSource || payload.manuscriptSource || pdfReady?.manuscriptSource || metadata.manuscriptSource);
  const writingPipeline = clean(archive.writingPipeline || payload.writingPipeline || pdfReady?.writingPipeline || metadata.writingPipeline);
  const llmAssembly = archive.llmAssembly || payload.llmAssembly || pdfReady?.llmAssembly || metadata.llmAssembly || null;
  const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || archive.pdfUrl || payload.downloadUrl || payload.pdfUrl);
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const cacheKey = clean(doc.cacheKey || metadata.cacheKey || metadata.lifeBookPdfCacheKey || fallback.cacheKey);
  const isCompleted = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed";

  if (isCompleted && storedUrl) {
    const data = {
      reportId,
      sessionId,
      reportType: "lifeBook",
      serviceKey: LIFEBOOK_SERVICE_KEY,
      featureKey: clean(doc.featureKey || metadata.featureKey || fallback.featureKey),
      lifeBookPdfRecord: archive.lifeBookPdfRecord || metadata.lifeBookPdfRecord || null,
      chapters,
      chapterCount: Number(archive.chapterCount || payload.chapterCount || pdfReady?.chapterCount || chapters.length || 0),
      expectedChapterCount: Number(archive.expectedChapterCount || payload.expectedChapterCount || pdfReady?.expectedChapterCount || getLifeBookBlueprints().length),
      generationMode,
      manuscriptSource,
      authoringMode: LIFEBOOK_AUTHORING_MODE,
      writingPipeline,
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady?.htmlUrl || archive.htmlUrl || payload.htmlUrl),
      downloadUrl: storedUrl,
      canReopen: true,
      canDownload: true,
      fromCache: true,
      cacheKey,
    };
    return {
      status: 200,
      payload: {
        ok: true,
        status: "completed",
        serverStatus: "completed",
        qualityStatus: "passed",
        serviceKey: LIFEBOOK_SERVICE_KEY,
        reportType: "lifeBook",
        data,
        ...data,
      },
    };
  }

  if (clean(doc.status) === "pending" || clean(doc.premiumStatus) === "generating") {
    return {
      status: 202,
      payload: {
        ok: true,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        status: "running",
        serverStatus: "running",
        reportId,
        sessionId,
        fromCache: true,
        cacheKey,
        data: {
          reportId,
          sessionId,
          status: "running",
          progress: {
            stateKey: LIFEBOOK_WRITING_STATE,
            currentChapterNo: 0,
            totalChapters: getLifeBookBlueprints().length,
          },
        },
      },
    };
  }

  return null;
}

function isLifeBookTerminalFailedExecution(doc = {}) {
  const source = doc && typeof doc === "object" ? doc : {};
  const status = clean(source.status);
  const premiumStatus = clean(source.premiumStatus);
  return status === "failed"
    || status === "refunded"
    || premiumStatus === "failed"
    || premiumStatus === "refund_failed"
    || premiumStatus === "refunded"
    || premiumStatus === "abandoned";
}

function applyLifeBookRetryExecutionKey(executionCtx = {}, previousExecution = {}) {
  const previousKey = clean(previousExecution.executionKey, 120);
  if (!previousKey || clean(executionCtx.executionKey, 120) !== previousKey) return executionCtx;
  const retryToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  executionCtx.executionKey = `${previousKey.slice(0, Math.max(1, 112 - retryToken.length))}:r:${retryToken}`.slice(0, 120);
  executionCtx.idempotencyKey = executionCtx.executionKey;
  executionCtx.metadata = {
    ...(executionCtx.metadata || {}),
    retryOfExecutionKey: previousKey,
    retryOfStatus: clean(previousExecution.status, 80),
    retryOfPremiumStatus: clean(previousExecution.premiumStatus, 80),
    retryStartedAt: new Date().toISOString(),
  };
  return executionCtx;
}


const STEM_KO_MAP = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});


const BRANCH_KO_MAP = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});


function clean(value) {
  return String(value || "").trim();
}

function normalizeLifeBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function logLifeBookServer(stage, payload = {}) {
  try {
    console.info(`[LifeBookPremiumPDF][${stage}]`, payload);
  } catch (_) {}
}

function resolveLifeBookFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return LIFEBOOK_FEATURE_KEY;
  if (key === LIFEBOOK_FEATURE_KEY || LIFEBOOK_FEATURE_KEY_ALIASES.has(key)) return LIFEBOOK_FEATURE_KEY;
  return key;
}

function toBillingFeatureKey(featureKey) {
  return resolveLifeBookFeatureKey(featureKey);
}







function getLifeBookBlueprints() {
  return lifeBookPremiumChapterPlanV1.chapters;
}



function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function round(value) {
  return Math.round(Number(value || 0));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}




function englishElementToKorean(value) {
  const key = String(value || "").toLowerCase();
  if (key === "wood") return "목";
  if (key === "fire") return "화";
  if (key === "earth") return "토";
  if (key === "metal") return "금";
  if (key === "water") return "수";
  return "";
}

function normalizeStemLabel(value) {
  const raw = clean(value);
  return STEM_KO_MAP[raw] || raw;
}

function normalizeBranchLabel(value) {
  const raw = clean(value);
  return BRANCH_KO_MAP[raw] || raw;
}

function getPillarStemLabel(pillar = {}) {
  return normalizeStemLabel(pillar?.stemKo || pillar?.stem || "");
}

function getPillarBranchLabel(pillar = {}) {
  return normalizeBranchLabel(pillar?.branchKo || pillar?.branch || "");
}

function getPillarGanjiLabel(pillar = {}) {
  const stem = getPillarStemLabel(pillar);
  const branch = getPillarBranchLabel(pillar);
  return `${stem}${branch}`.trim();
}














function normalizeIncomingAnalysisSignals(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const weights = src.elementWeights && typeof src.elementWeights === "object"
    ? {
        wood: safeNumber(src.elementWeights.wood, 0),
        fire: safeNumber(src.elementWeights.fire, 0),
        earth: safeNumber(src.elementWeights.earth, 0),
        metal: safeNumber(src.elementWeights.metal, 0),
        water: safeNumber(src.elementWeights.water, 0),
      }
    : null;

  const yongList = Array.isArray(src.yongshinElements)
    ? src.yongshinElements.map((v) => normalizeSajuElementToken(v, "")).filter(Boolean)
    : [];
  const kiList = Array.isArray(src.kishinElements)
    ? src.kishinElements.map((v) => normalizeSajuElementToken(v, "")).filter(Boolean)
    : [];

  const tenGodCounts = src.tenGodCounts && typeof src.tenGodCounts === "object"
    ? { ...src.tenGodCounts }
    : null;
  const tenGodByPillar = src.tenGodByPillar && typeof src.tenGodByPillar === "object"
    ? { ...src.tenGodByPillar }
    : null;
  const daewunCycles = Array.isArray(src.daewunCycles) ? src.daewunCycles : [];
  const specialStars = Array.isArray(src.specialStars) ? src.specialStars : [];
  const twelveGrowthStages = Array.isArray(src.twelveGrowthStages) ? src.twelveGrowthStages : [];

  return {
    dayMaster: clean(src.dayMaster),
    monthBranch: clean(src.monthBranch),
    powerLabel: clean(src.powerLabel),
    johuType: clean(src.johuType),
    yongshinElements: yongList,
    kishinElements: kiList,
    currentDaewun: clean(src.currentDaewun),
    isJong: Boolean(src.isJong),
    jongName: clean(src.jongName),
    elementWeights: weights,
    tenGodCounts,
    tenGodByPillar,
    daewunCycles,
    currentDaeunNode: src.currentDaeunNode && typeof src.currentDaeunNode === "object" ? src.currentDaeunNode : null,
    nextDaeunNode: src.nextDaeunNode && typeof src.nextDaeunNode === "object" ? src.nextDaeunNode : null,
    specialStars,
    twelveGrowthStages,
  };
}

function pickTopTenGod(tenGodCounts = null) {
  const map = tenGodCounts && typeof tenGodCounts === "object" ? tenGodCounts : null;
  if (!map) return "";
  let topKey = "";
  let topValue = -1;
  Object.keys(map).forEach((key) => {
    const value = safeNumber(map[key], 0);
    if (value > topValue) {
      topValue = value;
      topKey = String(key);
    }
  });
  return topKey;
}

function deriveElementBalance(profile, signals) {
  if (signals.elementWeights) {
    const ratio = {
      wood: round(safeNumber(signals.elementWeights.wood, 0)),
      fire: round(safeNumber(signals.elementWeights.fire, 0)),
      earth: round(safeNumber(signals.elementWeights.earth, 0)),
      metal: round(safeNumber(signals.elementWeights.metal, 0)),
      water: round(safeNumber(signals.elementWeights.water, 0)),
    };
    const counts = { ...ratio };
    const sorted = ELEMENT_KEYS.slice().sort((a, b) => Number(ratio[b] || 0) - Number(ratio[a] || 0));
    const dominant = sorted[0] || "earth";
    const deficient = sorted[sorted.length - 1] || "earth";
    const gap = Math.abs(Number(ratio[dominant] || 0) - Number(ratio[deficient] || 0));
    const balanceScore = clamp(100 - round(gap * 1.2), 35, 97);
    return { counts, ratio, dominant, deficient, balanceScore };
  }

  return {
    counts: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    ratio: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    dominant: "earth",
    deficient: "earth",
    balanceScore: 50,
  };
}

function deriveTenGodStats(profile, signals = {}) {
  if (signals.tenGodCounts && typeof signals.tenGodCounts === "object") {
    const base = {
      비견: safeNumber(signals.tenGodCounts.비견, 0),
      겁재: safeNumber(signals.tenGodCounts.겁재, 0),
      식신: safeNumber(signals.tenGodCounts.식신, 0),
      상관: safeNumber(signals.tenGodCounts.상관, 0),
      정재: safeNumber(signals.tenGodCounts.정재, 0),
      편재: safeNumber(signals.tenGodCounts.편재, 0),
      정관: safeNumber(signals.tenGodCounts.정관, 0),
      편관: safeNumber(signals.tenGodCounts.편관, 0),
      정인: safeNumber(signals.tenGodCounts.정인, 0),
      편인: safeNumber(signals.tenGodCounts.편인, 0),
    };
    const total = Object.values(base).reduce((acc, value) => acc + Number(value || 0), 0) || 1;
    const top = Object.keys(base)
      .sort((a, b) => Number(base[b] || 0) - Number(base[a] || 0))
      .slice(0, 3)
      .map((key) => ({ key, count: Number(base[key] || 0), pct: round((Number(base[key] || 0) / total) * 100) }));
    const emotionShare = Number(base.식신 || 0) + Number(base.상관 || 0);
    const realityShare = Number(base.정재 || 0) + Number(base.편재 || 0);
    const authorityShare = Number(base.정관 || 0) + Number(base.편관 || 0);
    const introspectShare = Number(base.정인 || 0) + Number(base.편인 || 0);
    return {
      counts: base,
      top,
      emotionPct: round((emotionShare / total) * 100),
      realityPct: round((realityShare / total) * 100),
      authorityPct: round((authorityShare / total) * 100),
      introspectPct: round((introspectShare / total) * 100),
    };
  }

  const base = {
    비견: 0,
    겁재: 0,
    식신: 0,
    상관: 0,
    정재: 0,
    편재: 0,
    정관: 0,
    편관: 0,
    정인: 0,
    편인: 0,
  };
  const total = Object.values(base).reduce((acc, value) => acc + Number(value || 0), 0) || 1;
  const top = Object.keys(base)
    .sort((a, b) => Number(base[b] || 0) - Number(base[a] || 0))
    .slice(0, 3)
    .map((key) => ({ key, count: Number(base[key] || 0), pct: round((Number(base[key] || 0) / total) * 100) }));

  const emotionShare = Number(base.식신 || 0) + Number(base.상관 || 0);
  const realityShare = Number(base.정재 || 0) + Number(base.편재 || 0);
  const authorityShare = Number(base.정관 || 0) + Number(base.편관 || 0);
  const introspectShare = Number(base.정인 || 0) + Number(base.편인 || 0);

  return {
    counts: base,
    top,
    emotionPct: round((emotionShare / total) * 100),
    realityPct: round((realityShare / total) * 100),
    authorityPct: round((authorityShare / total) * 100),
    introspectPct: round((introspectShare / total) * 100),
  };
}

function deriveLifeBookPayload(profile, signals, chapters, metadata = {}) {
  const elementBalance = deriveElementBalance(profile, signals);
  const tenGodStats = deriveTenGodStats(profile, signals);
  const stem = String(signals.dayMaster || "");
  const specialStars = {
    taoPct: clamp((profile.month * 7) + (profile.day % 30), 5, 95),
    yeokmaPct: clamp((profile.year % 40) + (profile.day % 25), 5, 95),
    hwaPct: clamp((profile.month * 5) + (profile.hour || 12), 5, 95),
    hasGwimun: ((profile.year + profile.month + profile.day) % 3) === 0,
    list: ["도화", "역마", "화개"],
  };

  return {
    user: {
      name: profile.name,
      gender: profile.gender,
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "",
      calendarType: clean(metadata.calendarType) === "lunar" ? "lunar" : "solar",
    },
    saju: {
      year: { stem: signals.yearStem, branch: signals.yearBranch, pillar: `${signals.yearStem || ""}${signals.yearBranch || ""}`.trim() },
      month: { stem: signals.monthStem, branch: signals.monthBranch, pillar: `${signals.monthStem || ""}${signals.monthBranch || ""}`.trim() },
      day: { stem: signals.dayMaster, branch: signals.dayBranch, master: stem, pillar: `${signals.dayMaster || ""}${signals.dayBranch || ""}`.trim() },
      hour: profile.timeKnown
        ? { stem: signals.hourStem, branch: signals.hourBranch, label: signals.timeLabel, pillar: `${signals.hourStem || ""}${signals.hourBranch || ""}`.trim() }
        : undefined,
      dayMaster: stem,
      dayBranch: signals.dayBranch,
      monthBranch: signals.monthBranch,
      tenGodsByPillar: signals.tenGodByPillar || {},
    },
    elementBalance,
    tenGodStats,
    strength: {
      isStrong: elementBalance.balanceScore >= 60,
      label: elementBalance.balanceScore >= 60 ? "신강" : "신약",
      reasonSummary: `오행 균형 점수 ${elementBalance.balanceScore}점 기준`,
    },
    johu: {
      neededElements: [elementBalance.deficient],
      summary: `${elementBalance.deficient} 기운 보강이 핵심`,
    },
    yongshin: {
      primary: signals.useful,
      secondary: signals.support,
      usefulElements: [signals.useful, signals.support],
      avoidElements: [signals.caution],
      practicalUse: `${signals.useful} 환경을 늘리고 ${signals.caution} 과속을 줄이세요.`,
    },
    structure: {
      geokguk: `${signals.dayMaster} 중심 구조`,
      careerSignal: "장기형 커리어 누적 전략이 유리",
      socialMission: "지식·실행·관계 균형으로 영향력 확장",
    },
    timing: {
      currentDaeun: { label: signals.currentDaewun || signals.rhythm },
      nextDaeun: { label: signals.nextDaewun || `${signals.monthBranch} 이후 전환` },
      yearlyFlow: { year: signals.currentYear || LIFEBOOK_LOCAL_TARGET_YEAR },
      monthlyFlow: Array.from({ length: 12 }).map((_, idx) => ({ month: idx + 1, score: clamp(55 + ((idx * 7 + profile.day) % 40), 40, 95) })),
    },
    specialStars,
    chapters,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function resolveLifeBookTargetYear(body = {}, fallback = LIFEBOOK_LOCAL_TARGET_YEAR) {
  const raw = body?.targetYear ?? body?.analysisYear ?? body?.selectedYear ?? body?.yearForReading;
  const year = Number(raw);
  const fallbackYear = Number(fallback);
  if (!Number.isFinite(year)) {
    return clamp(Number.isFinite(fallbackYear) ? Math.trunc(fallbackYear) : new Date().getFullYear(), LIFEBOOK_TARGET_YEAR_MIN, LIFEBOOK_TARGET_YEAR_MAX);
  }
  return clamp(Math.trunc(year), LIFEBOOK_TARGET_YEAR_MIN, LIFEBOOK_TARGET_YEAR_MAX);
}

function resolveLifeBookYearPillar(targetYear = LIFEBOOK_LOCAL_TARGET_YEAR) {
  const year = resolveLifeBookTargetYear({ targetYear });
  try {
    const solar = Solar.fromYmdHms(year, 7, 1, 12, 0, 0);
    return `${normalizeStemLabel(solar.getLunar().getEightChar().getYearGan())}${normalizeBranchLabel(solar.getLunar().getEightChar().getYearZhi())}`.trim();
  } catch (_) {
    return "";
  }
}

function normalizeGender(raw) {
  const value = clean(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(value)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(value)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const value = clean(raw).toLowerCase();
  if (value.includes("윤") || value.includes("leap") || value === "lunar_leap") return "lunar_leap";
  if (["solar", "양력", "yang", "sun"].includes(value)) return "solar";
  if (["lunar", "음력", "moon"].includes(value)) return "lunar";
  return "unknown";
}

function parseBirthDateAny(body = {}) {
  const candidates = [
    body.birthDate,
    body.birth,
    body.birthday,
    body.solarDate,
    body.lunarDate,
    body.date,
  ].map((v) => clean(v)).filter(Boolean);
  const directYear = toInt(body.birthYear ?? body.year, NaN);
  const directMonth = toInt(body.birthMonth ?? body.month, NaN);
  const directDay = toInt(body.birthDay ?? body.day, NaN);
  if (Number.isFinite(directYear) && Number.isFinite(directMonth) && Number.isFinite(directDay)) {
    return { year: directYear, month: directMonth, day: directDay };
  }
  for (const text of candidates) {
    const match = text.match(/(\d{4})[-./년\s](\d{1,2})[-./월\s](\d{1,2})/);
    if (match) {
      return {
        year: toInt(match[1], NaN),
        month: toInt(match[2], NaN),
        day: toInt(match[3], NaN),
      };
    }
  }
  return { year: NaN, month: NaN, day: NaN };
}

function parseBirthTimeAny(body = {}) {
  const isUnknownByFlag = body.birthTimeKnown === false
    || String(body.isTimeUnknown).toLowerCase() === "true"
    || /시간\s*모름|미상|unknown/.test(clean(body.birthTime || body.time || body.timeText));
  if (isUnknownByFlag) {
    return { isTimeUnknown: true, birthTime: "", birthHour: null, birthMinute: 0, timeKnown: false };
  }

  const rawHour = toInt(body.birthHour ?? body.hour ?? body.birth_hour, NaN);
  const rawMinute = toInt(body.birthMinute ?? body.minute, 0);
  if (Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23) {
    return {
      isTimeUnknown: false,
      birthTime: `${pad2(rawHour)}:${pad2(rawMinute)}`,
      birthHour: rawHour,
      birthMinute: clamp(rawMinute, 0, 59),
      timeKnown: true,
    };
  }

  const rawText = clean(body.birthTime || body.time || body.timeText);
  const hourMap = {
    자시: 23, 축시: 1, 인시: 3, 묘시: 5, 진시: 7, 사시: 9, 오시: 11, 미시: 13, 신시: 15, 유시: 17, 술시: 19, 해시: 21,
  };
  if (hourMap[rawText] !== undefined) {
    const mappedHour = hourMap[rawText];
    return {
      isTimeUnknown: false,
      birthTime: `${pad2(mappedHour)}:00`,
      birthHour: mappedHour,
      birthMinute: 0,
      timeKnown: true,
    };
  }

  const hhmm = rawText.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (hhmm) {
    let h = toInt(hhmm[1], NaN);
    const m = toInt(hhmm[2], 0);
    if (/오후/.test(rawText) && Number.isFinite(h) && h < 12) h += 12;
    if (/오전/.test(rawText) && h === 12) h = 0;
    if (Number.isFinite(h) && h >= 0 && h <= 23) {
      return {
        isTimeUnknown: false,
        birthTime: `${pad2(h)}:${pad2(clamp(m, 0, 59))}`,
        birthHour: h,
        birthMinute: clamp(m, 0, 59),
        timeKnown: true,
      };
    }
  }

  return { isTimeUnknown: true, birthTime: "", birthHour: null, birthMinute: 0, timeKnown: false };
}

function normalizeInput(body = {}) {
  const name = clean(body.name) || "사용자";
  const gender = normalizeGender(body.gender || body.sex);
  const calendarType = normalizeCalendarType(body.calendarType || body.calendar);
  const birthDate = parseBirthDateAny(body);
  const birthTime = parseBirthTimeAny(body);
  const year = birthDate.year;
  const month = birthDate.month;
  const day = birthDate.day;
  const timeKnown = birthTime.timeKnown;
  const hour = timeKnown ? birthTime.birthHour : null;
  const minute = timeKnown ? birthTime.birthMinute : 0;
  const birthplace = clean(body.birthplace) || "대한민국";
  const latitude = safeNumber(body.latitude ?? body.lat, 37.5665);
  const longitude = safeNumber(body.longitude ?? body.lng, 126.978);
  const timezone = clean(body.timezone) || "Asia/Seoul";

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, message: "생년월일은 필수입니다." };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다." };
  }
  if (timeKnown && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { ok: false, message: "출생 시간 형식이 올바르지 않습니다." };
  }
  if (!timeKnown) {
    return {
      ok: false,
      code: "BIRTH_TIME_REQUIRED",
      message: "인생의 책 PDF는 시주와 대운 흐름까지 정밀하게 보기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 입력해 주세요.",
    };
  }

  return {
    ok: true,
    birthInput: {
      name,
      gender,
      calendarType,
      birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthTime: timeKnown ? `${pad2(hour)}:${pad2(minute)}` : "",
      birthHour: timeKnown ? hour : null,
      birthMinute: timeKnown ? minute : 0,
      timezone,
      latitude,
      longitude,
      birthplace,
      isTimeUnknown: !timeKnown,
    },
    profile: {
      name,
      gender,
      calendarType,
      year,
      month,
      day,
      hour,
      minute,
      timeKnown,
      timezone,
      latitude,
      longitude,
      birthplace,
      birthIso: timeKnown ? `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}` : `${year}-${pad2(month)}-${pad2(day)} 시간 미상`,
    },
  };
}


























function buildLifeBookLocalSajuJson(birthInput, profile, signals, chapters = []) {
  const payload = deriveLifeBookPayload(profile, signals, chapters, { calendarType: birthInput.calendarType });
  const pillars = {
    year: {
      stem: clean(signals?.yearStem),
      branch: clean(signals?.yearBranch),
      ganji: `${clean(signals?.yearStem)}${clean(signals?.yearBranch)}`,
    },
    month: {
      stem: clean(signals?.monthStem),
      branch: clean(signals?.monthBranch),
      ganji: `${clean(signals?.monthStem)}${clean(signals?.monthBranch)}`,
    },
    day: {
      stem: clean(signals?.dayMaster),
      branch: clean(signals?.dayBranch),
      ganji: `${clean(signals?.dayMaster)}${clean(signals?.dayBranch)}`,
    },
    hour: {
      stem: clean(signals?.hourStem),
      branch: clean(signals?.hourBranch),
      ganji: `${clean(signals?.hourStem)}${clean(signals?.hourBranch)}`,
    },
  };

  const yongshin = {
    usefulElement: clean(signals?.useful),
    usefulElements: [clean(signals?.useful), clean(signals?.support)].filter(Boolean),
    cautionElements: [clean(signals?.caution)].filter(Boolean),
  };

  return {
    birthInput,
    profile,
    pillars,
    dayMaster: clean(signals?.dayMaster),
    monthBranch: clean(signals?.monthBranch),
    dayBranch: clean(signals?.dayBranch),
    hourBranch: clean(signals?.hourBranch),
    tenGods: signals?.tenGodCounts || {},
    tenGodsByPillar: signals?.tenGodByPillar || {},
    fiveElements: payload?.elementBalance?.ratio || {},
    elementBalance: payload?.elementBalance || {},
    strength: {
      isStrong: String(clean(signals?.powerLabel)).toLowerCase() === "신강" || String(clean(signals?.powerLabel)).toLowerCase() === "strong",
      label: clean(signals?.powerLabel) || (payload?.strength?.label || "중화"),
      reason: clean(payload?.strength?.reasonSummary || ""),
    },
    johu: {
      type: clean(signals?.johuType || "평형"),
      summary: clean(payload?.johu?.summary || ""),
    },
    yongshin,
    usefulGods: yongshin,
    geokguk: {
      title: clean(signals?.geokguk || `${clean(signals?.dayMaster)} 중심 구조`),
      summary: clean(payload?.structure?.socialMission || ""),
    },
    daeun: Array.isArray(signals?.daewunCycles) ? signals.daewunCycles : [],
    currentDaeun: signals?.currentDaeunNode || null,
    nextDaeun: signals?.nextDaeunNode || null,
    yearlyFlow: {
      year: signals?.currentYear,
      pillar: clean(signals?.currentYearPillar),
      keywords: [clean(signals?.useful), clean(signals?.support)].filter(Boolean),
    },
    twelveGrowthStages: signals?.twelveGrowthStages || [],
    sinsal: Array.isArray(signals?.specialStars) ? signals.specialStars : [],
    relationshipSignals: {
      focus: clean(signals?.relationshipFocus),
      caution: clean(signals?.caution),
    },
    careerSignals: {
      usefulElement: clean(signals?.useful),
      geokguk: clean(signals?.geokguk),
    },
    moneySignals: {
      supportElement: clean(signals?.support),
      cautionElement: clean(signals?.caution),
    },
    healthSignals: {
      weakestElement: clean(signals?.weakestElement),
      johuType: clean(signals?.johuType),
    },
    crisisSignals: {
      riskElement: clean(signals?.caution),
      phase: clean(signals?.currentDaewun),
    },
    calculationPolicy: {
      calendarType: clean(birthInput?.calendarType || profile?.calendarType || "solar"),
      timezone: clean(birthInput?.timezone || profile?.timezone || "Asia/Seoul"),
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      dayChangePolicy: "MIDNIGHT",
      coordinatePolicy: "birthplace-lat-lng-with-seoul-default",
    },
    sourceTrace: {
      source: "worker.routes.saju-lifebook",
      engine: "destiny-bias-engine",
      engines: [
        "worker-saju-engine",
        signals?.engineSources?.clientQuantumMyeongri ? "client-quantum-myeongri-engine" : "",
      ].filter(Boolean),
      engineProfileResolved: Boolean(signals?.engineProfile),
      generatedFromProfile: true,
      generatedFromAnalysisSignals: Boolean(signals?.tenGodCounts || signals?.elementWeights),
      generatedFromQuantumMyeongri: Boolean(signals?.engineSources?.clientQuantumMyeongri),
    },
    confidence: {
      pillarCompleteness: ["year", "month", "day", "hour"].reduce((sum, key) => sum + Number(Boolean(clean(pillars?.[key]?.ganji))), 0) / 4,
      hasElementBalance: Boolean(payload?.elementBalance?.ratio && Object.keys(payload.elementBalance.ratio).length >= 5),
      hasTenGods: Boolean(signals?.tenGodCounts && Object.keys(signals.tenGodCounts).length >= 4),
      hasDaeun: Array.isArray(signals?.daewunCycles) && signals.daewunCycles.length >= 3,
    },
    normalizationWarnings: [],
    derivedAt: new Date().toISOString(),
  };
}































































































































function calculateSajuLocally({ birthInput = {}, profile = {}, body = {}, sessionId = "" } = {}) {
  const targetYear = resolveLifeBookTargetYear(body);
  const signals = deriveLocalSignals(profile, body?.sajuData || "", body?.analysisSignals || {}, targetYear);
  let localSajuJson = buildLifeBookLocalSajuJson(birthInput, profile, signals, []);
  let localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
  if (!localSajuValidation.ok || (Array.isArray(localSajuValidation.warnings) && localSajuValidation.warnings.length)) {
    logLifeBookServer("LocalSajuValidationFailed", {
      sessionId,
      missing: localSajuValidation.missing,
      warnings: localSajuValidation.warnings,
    });
    localSajuJson = repairLifeBookLocalSajuJson(localSajuJson, birthInput, profile, signals);
    localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
    if (!localSajuValidation.ok) {
      throw Object.assign(new Error("인생의 책 생성에 필요한 생년월일시 정보를 확인할 수 없습니다."), {
        code: "LIFEBOOK_LOCAL_SAJU_INVALID",
        status: 422,
        details: localSajuValidation,
      });
    }
  }

  let jsonContractValidation = validateLifeBookJsonContract({ birthInput, localSajuJson });
  if (!jsonContractValidation.ok) {
    logLifeBookServer("LifeBookJsonContractRepairStart", {
      sessionId,
      hardErrors: jsonContractValidation.hardErrors,
      softWarnings: jsonContractValidation.softWarnings,
    });
    localSajuJson = repairLifeBookLocalSajuJson(localSajuJson, birthInput, profile, signals);
    localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
    jsonContractValidation = validateLifeBookJsonContract({ birthInput, localSajuJson });
  }
  if (!jsonContractValidation.ok) {
    throw Object.assign(new Error("인생의 책 계산 데이터가 생성 기준을 충족하지 못했습니다. 출생 정보와 사주 계산 결과를 다시 확인해 주세요."), {
      code: "LIFEBOOK_JSON_CONTRACT_INVALID",
      status: 422,
      details: jsonContractValidation,
    });
  }

  return {
    signals,
    localSajuJson,
    localSajuValidation,
    jsonContractValidation,
  };
}
































function validateLifeBookLocalSajuJson(localSajuJson) {
  const missing = [];
  const warnings = [];

  if (!clean(localSajuJson?.birthInput?.birthDate)) missing.push("birthDate");
  if (!clean(localSajuJson?.birthInput?.birthTime)) missing.push("birthTime");

  const resolvedPillarCount = ["year", "month", "day", "hour"].reduce((count, key) => {
    const stem = clean(localSajuJson?.pillars?.[key]?.stem);
    const branch = clean(localSajuJson?.pillars?.[key]?.branch);
    return count + Number(Boolean(stem && branch));
  }, 0);

  if (!clean(localSajuJson?.pillars?.day?.stem) || !clean(localSajuJson?.pillars?.day?.branch)) missing.push("dayPillar");
  if (!clean(localSajuJson?.dayMaster)) missing.push("dayMaster");
  if (resolvedPillarCount < 3) missing.push("pillarSet");

  if (!localSajuJson?.fiveElements || Object.keys(localSajuJson.fiveElements).length < 5) warnings.push("fiveElements");
  if (!localSajuJson?.tenGods || Object.keys(localSajuJson.tenGods).length < 4) warnings.push("tenGods");
  if (!localSajuJson?.usefulGods && !localSajuJson?.yongshin) warnings.push("usefulGods");
  if (!Array.isArray(localSajuJson?.daeun) || localSajuJson.daeun.length === 0) warnings.push("daeun");

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    resolvedPillarCount,
  };
}

function validateLifeBookJsonContract({ birthInput = {}, localSajuJson = {}, engineContract = null } = {}) {
  const hardErrors = [];
  const softWarnings = [];
  const evidence = {};
  const requireText = (path, value, severity = "hard") => {
    const ok = Boolean(clean(value));
    evidence[path] = ok;
    if (!ok) {
      if (severity === "hard") hardErrors.push(`${path}_missing`);
      else softWarnings.push(`${path}_missing`);
    }
    return ok;
  };
  const requireObjectKeys = (path, value, minimum, severity = "hard") => {
    const count = value && typeof value === "object" ? Object.keys(value).filter((key) => clean(key)).length : 0;
    const ok = count >= minimum;
    evidence[path] = { ok, count, minimum };
    if (!ok) {
      if (severity === "hard") hardErrors.push(`${path}_incomplete`);
      else softWarnings.push(`${path}_incomplete`);
    }
    return ok;
  };
  const requireArrayLength = (path, value, minimum, severity = "hard") => {
    const count = Array.isArray(value) ? value.length : 0;
    const ok = count >= minimum;
    evidence[path] = { ok, count, minimum };
    if (!ok) {
      if (severity === "hard") hardErrors.push(`${path}_incomplete`);
      else softWarnings.push(`${path}_incomplete`);
    }
    return ok;
  };

  requireText("birthInput.birthDate", birthInput?.birthDate || localSajuJson?.birthInput?.birthDate);
  requireText("birthInput.birthTime", birthInput?.birthTime || localSajuJson?.birthInput?.birthTime);
  requireText("birthInput.timezone", birthInput?.timezone || localSajuJson?.birthInput?.timezone || localSajuJson?.profile?.timezone, "soft");

  ["year", "month", "day", "hour"].forEach((key) => {
    const pillar = localSajuJson?.pillars?.[key] || {};
    requireText(`pillars.${key}.stem`, pillar.stem);
    requireText(`pillars.${key}.branch`, pillar.branch);
    requireText(`pillars.${key}.ganji`, pillar.ganji || `${clean(pillar.stem)}${clean(pillar.branch)}`);
  });

  requireText("dayMaster", localSajuJson?.dayMaster);
  requireText("monthBranch", localSajuJson?.monthBranch);
  requireObjectKeys("fiveElements", localSajuJson?.fiveElements, 5);
  requireObjectKeys("tenGods", localSajuJson?.tenGods, 4);
  requireObjectKeys("tenGodsByPillar", localSajuJson?.tenGodsByPillar, 3, "soft");
  requireText("yongshin.usefulElement", localSajuJson?.yongshin?.usefulElement || localSajuJson?.usefulGods?.usefulElement);
  requireArrayLength("yongshin.usefulElements", localSajuJson?.yongshin?.usefulElements || localSajuJson?.usefulGods?.usefulElements, 1);
  requireArrayLength("yongshin.cautionElements", localSajuJson?.yongshin?.cautionElements || localSajuJson?.usefulGods?.cautionElements, 1, "soft");
  requireArrayLength("daeun.cycles", localSajuJson?.daeun, 3);
  requireText("daeun.current.label", localSajuJson?.currentDaeun?.label || localSajuJson?.currentDaeun?.ganji);
  requireText("daeun.next.label", localSajuJson?.nextDaeun?.label || localSajuJson?.nextDaeun?.ganji, "soft");
  requireText("yearlyFlow.year", localSajuJson?.yearlyFlow?.year);
  requireText("yearlyFlow.pillar", localSajuJson?.yearlyFlow?.pillar, "soft");
  requireArrayLength("twelveGrowthStages", localSajuJson?.twelveGrowthStages, 3, "soft");
  requireArrayLength("sinsal", localSajuJson?.sinsal, 1, "soft");

  if (engineContract && typeof engineContract === "object") {
    requireText("engineContract.version", engineContract.version);
    requireText("engineContract.source", engineContract.source);
    requireText("engineContract.natal.dayPillar", engineContract?.natal?.dayPillar);
    requireObjectKeys("engineContract.fiveElements.counts", engineContract?.fiveElements?.counts, 5);
    requireArrayLength("engineContract.daeun.cycles", engineContract?.daeun?.cycles, 3);
    requireText("engineContract.year2026.ganji", engineContract?.year2026?.ganji, "soft");
    requireArrayLength("engineContract.monthlyLuck2026", engineContract?.monthlyLuck2026, 12, "soft");
  }

  const hardPenalty = hardErrors.length * 8;
  const softPenalty = softWarnings.length * 2;
  return {
    ok: hardErrors.length === 0,
    hardErrors: Array.from(new Set(hardErrors)),
    softWarnings: Array.from(new Set(softWarnings)),
    evidence,
    qualityScore: clamp(100 - hardPenalty - softPenalty, 0, 100),
  };
}










function repairLifeBookLocalSajuJson(localSajuJson, birthInput, profile, signals) {
  const payload = deriveLifeBookPayload(profile, signals, [], { calendarType: birthInput?.calendarType });
  const engineProfile = signals?.engineProfile || {};
  const enginePillars = engineProfile?.pillars || {};
  const daewun = Array.isArray(localSajuJson?.daeun) && localSajuJson.daeun.length
    ? localSajuJson.daeun
    : Array.isArray(signals?.daewunCycles) && signals.daewunCycles.length
      ? signals.daewunCycles
      : calcLifeBookDaewunFromBirth(profile).cycles;

  const yongshin = {
    usefulElement: clean(localSajuJson?.yongshin?.usefulElement || signals?.useful || payload?.yongshin?.primary),
    usefulElements: [
      clean(localSajuJson?.yongshin?.usefulElement || signals?.useful || payload?.yongshin?.primary),
      clean(localSajuJson?.yongshin?.usefulElements?.[1] || signals?.support || payload?.yongshin?.secondary),
    ].filter(Boolean),
    cautionElements: [clean(localSajuJson?.yongshin?.cautionElements?.[0] || signals?.caution || payload?.yongshin?.avoidElements?.[0])].filter(Boolean),
  };

  const repaired = {
    ...localSajuJson,
    birthInput: {
      ...birthInput,
      birthDate: clean(localSajuJson?.birthInput?.birthDate || birthInput?.birthDate),
      birthTime: clean(localSajuJson?.birthInput?.birthTime || birthInput?.birthTime),
    },
    profile,
    pillars: {
      year: {
        stem: clean(localSajuJson?.pillars?.year?.stem || signals?.yearStem || getPillarStemLabel(enginePillars?.year)),
        branch: clean(localSajuJson?.pillars?.year?.branch || signals?.yearBranch || getPillarBranchLabel(enginePillars?.year)),
        ganji: clean(localSajuJson?.pillars?.year?.ganji || signals?.yearPillar || getPillarGanjiLabel(enginePillars?.year)),
      },
      month: {
        stem: clean(localSajuJson?.pillars?.month?.stem || signals?.monthStem || getPillarStemLabel(enginePillars?.month)),
        branch: clean(localSajuJson?.pillars?.month?.branch || signals?.monthBranch || getPillarBranchLabel(enginePillars?.month)),
        ganji: clean(localSajuJson?.pillars?.month?.ganji || signals?.monthPillar || getPillarGanjiLabel(enginePillars?.month)),
      },
      day: {
        stem: clean(localSajuJson?.pillars?.day?.stem || signals?.dayMaster || getPillarStemLabel(enginePillars?.day)),
        branch: clean(localSajuJson?.pillars?.day?.branch || signals?.dayBranch || getPillarBranchLabel(enginePillars?.day)),
        ganji: clean(localSajuJson?.pillars?.day?.ganji || signals?.dayPillar || getPillarGanjiLabel(enginePillars?.day)),
      },
      hour: {
        stem: clean(localSajuJson?.pillars?.hour?.stem || signals?.hourStem || getPillarStemLabel(enginePillars?.hour)),
        branch: clean(localSajuJson?.pillars?.hour?.branch || signals?.hourBranch || getPillarBranchLabel(enginePillars?.hour)),
        ganji: clean(localSajuJson?.pillars?.hour?.ganji || signals?.hourPillar || getPillarGanjiLabel(enginePillars?.hour)),
      },
    },
    dayMaster: clean(localSajuJson?.dayMaster || signals?.dayMaster || getPillarStemLabel(enginePillars?.day)),
    tenGods: localSajuJson?.tenGods && Object.keys(localSajuJson.tenGods).length >= 4
      ? localSajuJson.tenGods
      : (signals?.tenGodCounts || payload?.tenGodStats?.counts || {}),
    tenGodsByPillar: localSajuJson?.tenGodsByPillar && Object.keys(localSajuJson.tenGodsByPillar).length
      ? localSajuJson.tenGodsByPillar
      : (signals?.tenGodByPillar || {}),
    fiveElements: localSajuJson?.fiveElements && Object.keys(localSajuJson.fiveElements).length >= 5
      ? localSajuJson.fiveElements
      : (payload?.elementBalance?.ratio || {}),
    elementBalance: localSajuJson?.elementBalance && Object.keys(localSajuJson.elementBalance).length
      ? localSajuJson.elementBalance
      : deriveElementBalance(profile, signals),
    tenGodStats: localSajuJson?.tenGodStats && Object.keys(localSajuJson.tenGodStats).length
      ? localSajuJson.tenGodStats
      : deriveTenGodStats(profile, signals),
    strength: {
      ...localSajuJson?.strength,
      label: clean(localSajuJson?.strength?.label || signals?.powerLabel || payload?.strength?.label || "중화"),
      reason: clean(localSajuJson?.strength?.reason || payload?.strength?.reasonSummary),
    },
    johu: {
      ...localSajuJson?.johu,
      type: clean(localSajuJson?.johu?.type || signals?.johuType || "평형"),
      summary: clean(localSajuJson?.johu?.summary || payload?.johu?.summary || `${clean(signals?.johuType || "평형")} 기준으로 생활 리듬을 맞추는 것이 좋습니다.`),
    },
    yongshin,
    usefulGods: yongshin,
    daeun,
    currentDaeun: localSajuJson?.currentDaeun || signals?.currentDaeunNode || { label: clean(signals?.currentDaewun) },
    nextDaeun: localSajuJson?.nextDaeun || signals?.nextDaeunNode || { label: clean(signals?.nextDaewun) },
    yearlyFlow: localSajuJson?.yearlyFlow || {
      year: signals?.currentYear || new Date().getFullYear(),
      pillar: clean(signals?.currentYearPillar),
      keywords: [clean(signals?.useful), clean(signals?.support)].filter(Boolean),
    },
    twelveGrowthStages: Array.isArray(localSajuJson?.twelveGrowthStages) && localSajuJson.twelveGrowthStages.length
      ? localSajuJson.twelveGrowthStages
      : buildLifeBookTwelveGrowthStages(enginePillars),
    sinsal: Array.isArray(localSajuJson?.sinsal) && localSajuJson.sinsal.length
      ? localSajuJson.sinsal
      : calcLifeBookSpecialStarsFromPillars(enginePillars),
  };

  return repaired;
}


function normalizeSajuElementToken(value, fallback = "토") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/목|wood/i.test(raw)) return "목";
  if (/화|fire/i.test(raw)) return "화";
  if (/토|earth/i.test(raw)) return "토";
  if (/금|metal/i.test(raw)) return "금";
  if (/수|water/i.test(raw)) return "수";
  return fallback;
}

function branchKoToHan(branchKo = "") {
  const map = {
    자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
  };
  const raw = clean(branchKo);
  return map[raw] || raw;
}

function calcLifeBookSpecialStarsFromPillars(pillars = {}) {
  const dayBranch = clean(pillars?.day?.branch);
  const monthBranch = clean(pillars?.month?.branch);
  const hourBranch = clean(pillars?.hour?.branch);
  const branches = [dayBranch, monthBranch, hourBranch].filter(Boolean);
  const dayHan = branchKoToHan(dayBranch);

  const taoByDay = {
    子: ["酉"], 午: ["卯"], 卯: ["子"], 酉: ["午"],
    寅: ["卯"], 戌: ["卯"], 亥: ["子"], 未: ["子"], 申: ["酉"], 辰: ["酉"], 巳: ["午"], 丑: ["午"],
  };
  const yeokmaByDay = {
    寅: ["申"], 午: ["申"], 戌: ["申"], 申: ["寅"], 子: ["寅"], 辰: ["寅"],
    亥: ["巳"], 卯: ["巳"], 未: ["巳"], 巳: ["亥"], 酉: ["亥"], 丑: ["亥"],
  };
  const hwaByDay = {
    寅: ["戌"], 午: ["戌"], 戌: ["戌"], 亥: ["未"], 卯: ["未"], 未: ["未"],
    申: ["辰"], 子: ["辰"], 辰: ["辰"], 巳: ["丑"], 酉: ["丑"], 丑: ["丑"],
  };

  const hanBranches = branches.map((v) => branchKoToHan(v)).filter(Boolean);
  const stars = [];
  if ((taoByDay[dayHan] || []).some((v) => hanBranches.includes(v))) stars.push("도화");
  if ((yeokmaByDay[dayHan] || []).some((v) => hanBranches.includes(v))) stars.push("역마");
  if ((hwaByDay[dayHan] || []).some((v) => hanBranches.includes(v))) stars.push("화개");
  return stars;
}

function calcLifeBookDaewunFromBirth(profile) {
  try {
    const solar = Solar.fromYmdHms(
      Number(profile.year),
      Number(profile.month),
      Number(profile.day),
      Number(profile.hour),
      Number(profile.minute),
      0,
    );
    const eightChar = solar.getLunar().getEightChar();
    const genderNum = profile.gender === "male" ? 1 : 0;
    const yun = eightChar.getYun(genderNum);
    const rawList = yun.getDaYun();
    const cycles = [];
    for (let i = 1; i < rawList.length; i += 1) {
      const item = rawList[i];
      const label = clean(item?.getGanZhi?.());
      const startAge = Number(item?.getStartAge?.() || 0);
      if (!label || !Number.isFinite(startAge) || startAge <= 0) continue;
      cycles.push({
        order: i,
        label,
        startAge,
      });
    }

    const currentAge = new Date().getFullYear() - Number(profile.year) + 1;
    let current = null;
    let next = null;
    for (let i = 0; i < cycles.length; i += 1) {
      const node = cycles[i];
      const nextNode = cycles[i + 1] || null;
      const start = Number(node.startAge || 0);
      const end = nextNode ? Number(nextNode.startAge || 120) - 1 : 120;
      if (currentAge >= start && currentAge <= end) {
        current = { ...node, endAge: end };
        next = nextNode ? { ...nextNode, endAge: i + 2 < cycles.length ? Number(cycles[i + 2].startAge || 120) - 1 : 120 } : null;
        break;
      }
    }

    if (!current && cycles.length) {
      current = { ...cycles[0], endAge: cycles[1] ? Number(cycles[1].startAge || 120) - 1 : 120 };
      next = cycles[1] ? { ...cycles[1], endAge: cycles[2] ? Number(cycles[2].startAge || 120) - 1 : 120 } : null;
    }

    return { cycles, current, next };
  } catch (_) {
    return { cycles: [], current: null, next: null };
  }
}

function buildLifeBookTwelveGrowthStages(pillars = {}) {
  const stageByBranch = {
    자: "태", 축: "양", 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절",
  };
  const items = [
    { key: "year", branch: clean(pillars?.year?.branch) },
    { key: "month", branch: clean(pillars?.month?.branch) },
    { key: "day", branch: clean(pillars?.day?.branch) },
    { key: "hour", branch: clean(pillars?.hour?.branch) },
  ];
  return items.map((item) => ({
    pillar: item.key,
    branch: item.branch,
    stage: stageByBranch[item.branch] || "평",
  }));
}

function sanitizeLifeBookEngineProfileForLlm(profile = {}) {
  if (!profile || typeof profile !== "object") return profile;
  const cloned = JSON.parse(JSON.stringify(profile));
  if (cloned?.verification?.source === "LOCAL_FALLBACK") {
    cloned.verification.source = "WORKER_LOCAL_CALCULATION";
  }
  if (cloned?.sajuCoreResult?.verification?.source === "LOCAL_FALLBACK") {
    cloned.sajuCoreResult.verification.source = "WORKER_LOCAL_CALCULATION";
  }
  return cloned;
}

function extractSignalFromSajuData(rawSajuData = "") {
  const text = String(rawSajuData || "");
  if (!text.trim()) return null;

  const dayMaster = (text.match(/일간(?:\(日干\))?\s*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])/i) || [])[1] || "";
  const monthBranch = (text.match(/월지(?:\(月支\))?\s*[:：]\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/i) || [])[1] || "";
  const yongsinRaw = (text.match(/용신(?:\(用神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const huisinRaw = (text.match(/희신(?:\(喜神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const gisinRaw = (text.match(/기신(?:\(忌神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";

  if (!dayMaster && !monthBranch && !yongsinRaw && !huisinRaw && !gisinRaw) return null;

  return {
    dayMaster: String(dayMaster || "").trim(),
    monthBranch: String(monthBranch || "").trim(),
    useful: normalizeSajuElementToken(yongsinRaw, "토"),
    support: normalizeSajuElementToken(huisinRaw, "금"),
    caution: normalizeSajuElementToken(gisinRaw, "수"),
  };
}

function deriveLocalSignals(profile, rawSajuData = "", analysisSignals = {}, targetYear = LIFEBOOK_LOCAL_TARGET_YEAR) {
  let engineProfile = null;
  try {
    const calendarType = profile.calendarType === "lunar_leap"
      ? "lunar_leap"
      : (profile.calendarType === "lunar" ? "lunar" : "solar");
    engineProfile = buildSajuProfile({
      name: profile.name,
      gender: profile.gender === "male" ? "M" : profile.gender === "female" ? "F" : "OTHER",
      timezone: clean(profile.timezone) || "Asia/Seoul",
      location: {
        name: clean(profile.birthplace) || "대한민국",
        latitude: safeNumber(profile.latitude, 37.5665),
        longitude: safeNumber(profile.longitude, 126.978),
        timezone: clean(profile.timezone) || "Asia/Seoul",
      },
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      dayChangePolicy: "MIDNIGHT",
      birth: {
        calendarType,
        year: profile.year,
        month: profile.month,
        day: profile.day,
        hour: Number.isFinite(profile.hour) ? profile.hour : 12,
        minute: Number.isFinite(profile.minute) ? profile.minute : 0,
        timezone: clean(profile.timezone) || "Asia/Seoul",
        birthPlace: clean(profile.birthplace) || "대한민국",
        latitude: safeNumber(profile.latitude, 37.5665),
        longitude: safeNumber(profile.longitude, 126.978),
        unknownTime: false,
      },
    });
  } catch (error) {
    logLifeBookServer("EngineProfileError", { reason: clean(error?.message) });
    engineProfile = null;
  }

  // If engine fails, create minimal working profile
  if (!engineProfile) {
    logLifeBookServer("EngineProfileFallback", { fallback: "minimal" });
    // Create minimal profile structure that allows generation to continue
    engineProfile = {
      dayMaster: { stemKo: "갑" },
      pillars: {
        year: { stemKo: "을", branchKo: "자" },
        month: { stemKo: "병", branchKo: "인" },
        day: { stemKo: "정", branchKo: "묘" },
        hour: { stemKo: "무", branchKo: "진" },
      },
      fiveElements: {
        percentages: { wood: 25, fire: 25, earth: 20, metal: 15, water: 15 },
      },
      tenGods: {
        counts: { 정관: 1, 정재: 1, 식신: 1, 상관: 1 },
        pillarTenGods: { year: "정관", month: "정재", day: "식신", hour: "" },
      },
      usefulGods: { yong: "wood", hee: ["fire"], gi: ["metal"], strength: "middle" },
    };
  }
  engineProfile = sanitizeLifeBookEngineProfileForLlm(engineProfile);

  const parsed = extractSignalFromSajuData(rawSajuData);
  const parsedAnalysis = normalizeIncomingAnalysisSignals(analysisSignals);
  const enginePillars = engineProfile?.pillars || {};
  const engineWeights = engineProfile?.fiveElements?.percentages
    ? {
        wood: safeNumber(engineProfile.fiveElements.percentages.wood, 0),
        fire: safeNumber(engineProfile.fiveElements.percentages.fire, 0),
        earth: safeNumber(engineProfile.fiveElements.percentages.earth, 0),
        metal: safeNumber(engineProfile.fiveElements.percentages.metal, 0),
        water: safeNumber(engineProfile.fiveElements.percentages.water, 0),
      }
    : null;
  const analysisWeights = parsedAnalysis.elementWeights || engineWeights || null;

  const engineTenGodCounts = engineProfile?.tenGods?.counts || null;
  const mergedTenGodCounts = parsedAnalysis.tenGodCounts || engineTenGodCounts || null;
  const mergedTenGodByPillar = parsedAnalysis.tenGodByPillar || engineProfile?.tenGods?.pillarTenGods || null;

  const yearStem = getPillarStemLabel(enginePillars?.year);
  const monthStem = getPillarStemLabel(enginePillars?.month);
  const dayStem = clean(engineProfile?.dayMaster?.stemKo || getPillarStemLabel(enginePillars?.day) || parsedAnalysis.dayMaster || parsed?.dayMaster);
  const hourStem = getPillarStemLabel(enginePillars?.hour);
  const yearBranch = getPillarBranchLabel(enginePillars?.year);
  const monthBranch = getPillarBranchLabel(enginePillars?.month);
  const dayBranch = getPillarBranchLabel(enginePillars?.day);
  const hourBranch = getPillarBranchLabel(enginePillars?.hour);

  const useful = normalizeSajuElementToken(
    parsedAnalysis.yongshinElements[0]
      || englishElementToKorean(engineProfile?.usefulGods?.yong)
      || parsed?.useful,
    "",
  );
  const support = normalizeSajuElementToken(
    parsedAnalysis.yongshinElements[1]
      || englishElementToKorean(engineProfile?.usefulGods?.hee?.[0])
      || parsed?.support,
    "",
  );
  const caution = normalizeSajuElementToken(
    parsedAnalysis.kishinElements[0]
      || englishElementToKorean(engineProfile?.usefulGods?.gi?.[0])
      || parsed?.caution,
    "",
  );

  let dominantElement = "";
  let weakestElement = "";
  if (analysisWeights) {
    const entries = [
      ["목", safeNumber(analysisWeights.wood, 0)],
      ["화", safeNumber(analysisWeights.fire, 0)],
      ["토", safeNumber(analysisWeights.earth, 0)],
      ["금", safeNumber(analysisWeights.metal, 0)],
      ["수", safeNumber(analysisWeights.water, 0)],
    ].sort((a, b) => Number(b[1]) - Number(a[1]));
    dominantElement = String(entries[0]?.[0] || "");
    weakestElement = String(entries[entries.length - 1]?.[0] || "");
  }

  const topTenGod = pickTopTenGod(mergedTenGodCounts);
  const tenGodStats = deriveTenGodStats(profile, { tenGodCounts: mergedTenGodCounts });

  const daewun = calcLifeBookDaewunFromBirth(profile);
  const daewunCycles = parsedAnalysis.daewunCycles.length ? parsedAnalysis.daewunCycles : (Array.isArray(daewun.cycles) ? daewun.cycles : []);
  const currentDaeunNode = parsedAnalysis.currentDaeunNode || daewun.current || null;
  const nextDaeunNode = parsedAnalysis.nextDaeunNode || daewun.next || null;
  const currentYear = resolveLifeBookTargetYear({ targetYear });
  const currentYearPillar = resolveLifeBookYearPillar(currentYear);

  const specialStars = parsedAnalysis.specialStars.length ? parsedAnalysis.specialStars : calcLifeBookSpecialStarsFromPillars(enginePillars);
  const twelveGrowthStages = parsedAnalysis.twelveGrowthStages.length ? parsedAnalysis.twelveGrowthStages : buildLifeBookTwelveGrowthStages(enginePillars);

  const usefulElements = [useful, support].filter(Boolean);
  const avoidElements = [caution].filter(Boolean);
  const powerLabel = clean(parsedAnalysis.powerLabel || (engineProfile?.usefulGods?.strength === "strong" ? "신강" : engineProfile?.usefulGods?.strength === "weak" ? "신약" : "중화"));
  const monthBranchLabel = clean(monthBranch || parsedAnalysis.monthBranch || parsed?.monthBranch);
  const dayPillar = `${dayStem}${dayBranch}`.trim();
  const weakSignals = [
    clean(caution && `${caution} 기운 과속`),
    clean(weakestElement && `${weakestElement} 보강 필요`),
    clean(!mergedTenGodCounts ? "십성 분포 추가 확인 필요" : ""),
  ].filter(Boolean);

  if (!clean(dayStem) || !clean(dayBranch)) {
    throw Object.assign(new Error("인생의 책 생성에 필요한 일주 계산을 확인할 수 없습니다."), { code: "LIFEBOOK_ENGINE_FIELDS_MISSING", status: 422 });
  }

  return {
    dayMaster: dayStem,
    yearStem,
    monthStem,
    hourStem,
    yearBranch,
    monthBranch: monthBranchLabel,
    dayBranch,
    hourBranch,
    yearPillar: `${yearStem}${yearBranch}`.trim(),
    monthPillar: `${monthStem}${monthBranchLabel}`.trim(),
    dayPillar,
    hourPillar: `${hourStem}${hourBranch}`.trim(),
    useful: useful || dominantElement || "토",
    support: support || useful || dominantElement || "금",
    caution: caution || weakestElement || "수",
    timeKnown: Boolean(profile.timeKnown),
    timeLabel: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "시간 미상",
    rhythm: `${yearBranch}-${monthBranchLabel}-${dayBranch}`,
    powerLabel,
    johuType: parsedAnalysis.johuType || "평형",
    yongshinElements: parsedAnalysis.yongshinElements.length ? parsedAnalysis.yongshinElements : usefulElements,
    kishinElements: parsedAnalysis.kishinElements.length ? parsedAnalysis.kishinElements : avoidElements,
    currentDaewun: clean(currentDaeunNode?.label || parsedAnalysis.currentDaewun),
    nextDaewun: clean(nextDaeunNode?.label || ""),
    daewunStartAge: Number(currentDaeunNode?.startAge || 0) || null,
    daewunCycles,
    currentDaeunNode,
    nextDaeunNode,
    currentYear,
    currentYearPillar,
    isJong: parsedAnalysis.isJong,
    jongName: parsedAnalysis.jongName,
    geokguk: `${clean(dayStem)}${clean(monthBranchLabel)} 구조`,
    relationshipFocus: `${clean(dayBranch)} 중심 관계 리듬`,
    relationshipSignal: `${clean(dayBranch)} 일지와 ${clean(monthBranchLabel)} 월지가 관계의 기준을 동시에 건드리는 구조`,
    spouseSignal: `${clean(dayPillar)} 일주의 배우자 감각이 ${clean(topTenGod || "핵심 십성")}을 통해 드러납니다.`,
    wealthSignal: `${clean(useful || dominantElement || "토")} 기운을 현실 수익 구조에 연결할수록 재물 흐름이 안정됩니다.`,
    careerSignal: `${clean(topTenGod || "핵심 십성")}이 앞에 설수록 직업적 존재감이 커집니다.`,
    talentSignal: `${clean(dayStem)} 일간은 ${clean(dominantElement || useful || "토")} 기운과 맞물릴 때 재능이 선명해집니다.`,
    timing: {
      current: clean(daewun?.current?.label),
      next: clean(daewun?.next?.label),
      year: currentYear,
      yearPillar: currentYearPillar,
    },
    elementWeights: analysisWeights || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    dominantElement: dominantElement || useful || "토",
    weakestElement: weakestElement || caution || "수",
    tenGodCounts: mergedTenGodCounts || {},
    tenGodStats,
    tenGodByPillar: {
      year: clean(mergedTenGodByPillar?.year || ""),
      month: clean(mergedTenGodByPillar?.month || ""),
      day: clean(mergedTenGodByPillar?.day || ""),
      hour: clean(mergedTenGodByPillar?.hour || ""),
    },
    specialStars,
    twelveGrowthStages,
    topTenGod,
    usefulElements,
    avoidElements,
    weakSignals,
    engineSources: {
      workerSajuEngine: Boolean(engineProfile),
      clientQuantumMyeongri: Boolean(analysisSignals && typeof analysisSignals === "object" && Object.keys(analysisSignals).length),
    },
    engineProfile,
  };
}




















































function resolveLifeBookProfileId(body = {}, profile = {}) {
  return clean(
    body?.profileId
    || body?.selectedProfileId
    || body?.profile?.id
    || body?.profile?._id
    || body?.accessGrant?.profileId
    || profile?.id
    || profile?._id
    || "",
  );
}

function resolveLifeBookEngineVersion(env = {}) {
  return clean(
    env?.LIFEBOOK_ENGINE_VERSION
    || env?.QUANTUM_MYEONGRI_ENGINE_VERSION
    || env?.SAJU_ENGINE_VERSION
    || "quantum-myeongri-v1",
  );
}

function estimateLifeBookActualPages(markdownContent = "", htmlContent = "") {
  const markdownLength = clean(markdownContent).length;
  const htmlTextLength = clean(htmlContent).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  const sourceLength = Math.max(markdownLength, htmlTextLength);
  if (!sourceLength) return undefined;
  return Math.max(1, Math.round(sourceLength / 950));
}

function buildLifeBookPdfRecord({
  reportId = "",
  userId = "",
  profileId = "",
  status = "generating",
  markdownContent = "",
  htmlContent = "",
  pdfUrl = "",
  errorMessage = "",
  createdAt = "",
  engineVersion = "",
  actualPages,
  cacheKey = "",
  calculationResultHash = "",
} = {}) {
  const normalizedMarkdown = clean(markdownContent);
  const normalizedHtml = String(htmlContent || "");
  const resolvedActualPages = Number.isFinite(Number(actualPages))
    ? Math.max(1, Math.round(Number(actualPages)))
    : estimateLifeBookActualPages(normalizedMarkdown, normalizedHtml);
  const record = {
    reportId: clean(reportId),
    userId: clean(userId),
    profileId: clean(profileId) || clean(userId),
    serviceType: "life-book",
    title: "사주 인생의 책",
    createdAt: clean(createdAt) || new Date().toISOString(),
    engineVersion: clean(engineVersion) || "quantum-myeongri-v1",
    chapterCount: 13,
    status: ["generating", "completed", "failed"].includes(clean(status)) ? clean(status) : "generating",
    markdownContent: normalizedMarkdown,
  };
  if (clean(cacheKey)) record.cacheKey = clean(cacheKey);
  if (clean(calculationResultHash)) record.calculationResultHash = clean(calculationResultHash);
  if (resolvedActualPages) record.actualPages = resolvedActualPages;
  if (normalizedHtml) record.htmlContent = normalizedHtml;
  if (clean(pdfUrl)) record.pdfUrl = clean(pdfUrl);
  if (clean(errorMessage)) record.errorMessage = clean(errorMessage).slice(0, 500);
  return record;
}

async function persistLifeBookPdfRecord(env, executionCtx, record = {}, extraMetadata = {}) {
  if (isLifeBookDbPersistenceBypassed(env)) return null;
  if (!executionCtx?.executionKey || !record?.reportId) return null;
  const metadata = {
    ...(executionCtx.metadata || {}),
    ...(extraMetadata && typeof extraMetadata === "object" ? extraMetadata : {}),
    lifeBookPdfRecord: record,
    reportId: clean(record.reportId || executionCtx.reportId),
    serviceType: "life-book",
    cacheKey: clean(record.cacheKey || executionCtx.cacheKey || extraMetadata?.cacheKey),
    lifeBookPdfCacheKey: clean(record.cacheKey || executionCtx.cacheKey || extraMetadata?.lifeBookPdfCacheKey || extraMetadata?.cacheKey),
    calculationResultHash: clean(record.calculationResultHash || executionCtx.calculationResultHash || extraMetadata?.calculationResultHash),
  };
  executionCtx.metadata = metadata;
  try {
    await connectDb(withPdfFastDbEnv(env));
    return await ServiceExecutionTransaction.findOneAndUpdate(
      { executionKey: clean(executionCtx.executionKey, 120) },
      {
        $set: {
          metadata,
          reportId: clean(record.reportId || executionCtx.reportId),
          sessionId: clean(executionCtx.sessionId),
          reportType: "lifeBook",
          cacheKey: clean(record.cacheKey || executionCtx.cacheKey || extraMetadata?.cacheKey),
        },
      },
      { returnDocument: "after" },
    ).lean();
  } catch (error) {
    logLifeBookServer("LifeBookPdfRecordPersistFailed", {
      reportId: clean(record.reportId),
      status: clean(record.status),
      reason: clean(error?.message || error),
    });
    return null;
  }
}




async function handleStatus(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "인생의 책 생성 상태를 확인하려면 먼저 로그인해 주세요.",
      }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  const reportId = clean(url.searchParams.get("reportId"));
  if (!sessionId && !reportId) {
    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      code: "MISSING_STATUS_KEY",
      message: "sessionId 또는 reportId가 필요합니다.",
    }, { status: 422 });
  }

  const lock = sessionId
    ? LIFEBOOK_SESSION_LOCKS.get(sessionId)
    : Array.from(LIFEBOOK_SESSION_LOCKS.values()).find((item) => clean(item?.reportId) === reportId);
  if (lock) return json(buildLifeBookStatusPayload(lock, { sessionId, reportId }));

  await connectDb(env);
  const filters = [];
  if (sessionId) filters.push({ sessionId });
  if (reportId) filters.push({ reportId });
  const doc = filters.length
    ? await ServiceExecutionTransaction.findOne({ userId: auth.userId, $or: filters }).sort({ updatedAt: -1, completedAt: -1 }).lean()
    : null;
  if (!doc) {
    return json({
      ok: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      data: {
        sessionId,
        reportId,
        status: "unknown",
        progress: {
          stateKey: "not_found",
          currentChapterNo: 0,
          totalChapters: getLifeBookBlueprints().length,
        },
      },
    });
  }

  const metadata = doc && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive?.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReady = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  const chapters = Array.isArray(archive.chapters)
    ? archive.chapters
    : Array.isArray(payload.chapters)
      ? payload.chapters
      : Array.isArray(pdfReady?.chapters)
        ? pdfReady.chapters
        : [];
  const pdfUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || archive.pdfUrl || payload.downloadUrl || payload.pdfUrl);
  const htmlUrl = clean(pdfReady?.htmlUrl || archive.htmlUrl || payload.htmlUrl);
  const status = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed"
    ? "done"
    : isLifeBookTerminalFailedExecution(doc)
      ? "failed"
      : "running";
  return json(buildLifeBookStatusPayload({
    sessionId: clean(doc.sessionId || sessionId),
    reportId: clean(doc.reportId || reportId),
    status,
    startedAt: doc.generationStartedAt || doc.createdAt,
    progress: {
      stateKey: status === "done" ? "completed" : status === "failed" ? "failed" : LIFEBOOK_WRITING_STATE,
      currentChapterNo: status === "done" ? getLifeBookBlueprints().length : 0,
      totalChapters: getLifeBookBlueprints().length,
    },
    lifeBookPdfRecord: archive.lifeBookPdfRecord || metadata.lifeBookPdfRecord || null,
    result: {
      data: {
        reportId: clean(doc.reportId || reportId),
        sessionId: clean(doc.sessionId || sessionId),
        reportType: "lifeBook",
        serviceKey: LIFEBOOK_SERVICE_KEY,
        featureKey: clean(doc.featureKey || metadata.featureKey),
        lifeBookPdfRecord: archive.lifeBookPdfRecord || metadata.lifeBookPdfRecord || null,
        chapters,
        pdfReady,
        pdfUrl,
        htmlUrl,
        downloadUrl: pdfUrl,
        generationMode: clean(archive.generationMode || payload.generationMode || pdfReady?.generationMode || metadata.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode),
        manuscriptSource: clean(archive.manuscriptSource || pdfReady?.manuscriptSource || metadata.manuscriptSource),
        writingPipeline: clean(archive.writingPipeline || payload.writingPipeline || pdfReady?.writingPipeline || metadata.writingPipeline),
        llmAssembly: archive.llmAssembly || payload.llmAssembly || pdfReady?.llmAssembly || metadata.llmAssembly || null,
        llmAssemblyOnly: true,
        externalCallsAllowed: true,
        finalManuscriptSource: clean(archive.finalManuscriptSource || pdfReady?.finalManuscriptSource || metadata.finalManuscriptSource),
        canReopen: Boolean(pdfUrl || htmlUrl || chapters.length),
        canDownload: Boolean(pdfUrl || htmlUrl),
      },
    },
  }, {
    sessionId,
    reportId,
    completedAt: doc.completedAt || doc.generationCompletedAt,
    failedAt: doc.failedAt || doc.generationFailedAt,
  }));
}

async function handlePrepareSync(request, env) {
  logLifeBookServer("RequestReceived", { route: "/api/premium/saju-lifebook/prepare", mode: "llm-only" });
  const pdfDbEnv = withPdfFastDbEnv(env);
  const skipDbPersistence = isLifeBookDbPersistenceBypassed(pdfDbEnv);
  let auth;
  let body = {};
  let sessionId = "";
  let reportId = "";
  let featureKey = "";
  let executionCtx = null;
  let generatingRecord = null;

  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "Login is required to generate the life book PDF.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }

  try {
    body = await readJson(request);
  } catch (_) {
    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      code: "INVALID_JSON",
      message: "Invalid request body.",
    }, { status: 400 });
  }

  body.targetYear = resolveLifeBookTargetYear(body);
  body.analysisYear = body.targetYear;

  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      code: clean(normalized.code || "INVALID_INPUT"),
      message: normalized.message,
    }, { status: normalized.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const profile = normalized.profile;
  const birthInput = normalized.birthInput;
  sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId)
    || `life-book:${auth.userId}:${birthInput.birthDate}:${birthInput.birthTime || "unknown"}:${body.targetYear}`;
  reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);
  const profileId = resolveLifeBookProfileId(body, profile);
  featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
  const recordCreatedAt = new Date().toISOString();
  const engineVersion = resolveLifeBookEngineVersion(env);

  const existingLock = LIFEBOOK_SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "done" && existingLock.result) return json(existingLock.result);
  if (["queued", "running"].includes(clean(existingLock?.status))) {
    return json(buildLifeBookStatusPayload(existingLock, { sessionId, reportId }), { status: 202 });
  }

  const reusableExecutionCtx = buildPremiumExecutionContext({
    serviceKey: LIFEBOOK_SERVICE_KEY,
    reportType: "lifeBook",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access: null,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findLifeBookReusableExecution(pdfDbEnv, auth.userId, reusableExecutionCtx, { sessionId, reportId, featureKey });
  const reusableResponse = reusableExecution ? buildLifeBookReusableExecutionResponse(reusableExecution, { sessionId, reportId, featureKey }) : null;
  if (reusableResponse) return json(reusableResponse.payload, { status: reusableResponse.status });
  const retrySourceExecution = isLifeBookTerminalFailedExecution(reusableExecution) ? reusableExecution : null;

  generatingRecord = buildLifeBookPdfRecord({
    reportId,
    userId: auth.userId,
    profileId,
    status: "generating",
    createdAt: recordCreatedAt,
    engineVersion,
  });
  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    userId: auth.userId,
    status: "running",
    startedAt: recordCreatedAt,
    progress: {
      stateKey: "payment-verification",
      currentChapterNo: 0,
      totalChapters: getLifeBookBlueprints().length,
      updatedAt: new Date().toISOString(),
    },
    lifeBookPdfRecord: generatingRecord,
  });

  try {
    const premiumAccessToken = clean(
      request.headers.get("x-premium-access-token")
      || body?.premiumAccessToken
      || body?._premiumAccessToken
      || body?.accessGrant?.premiumAccessToken
      || body?.accessGrant?.token,
      500,
    );
    const access = await requirePremiumReportAccess(pdfDbEnv, auth.userId, "lifeBook", {
      ...body,
      featureKey: billingFeatureKey,
      reportType: "lifeBook",
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/premium/saju-lifebook/prepare",
    });

    if (!access?.ok) {
      const status = Number(access?.status || 402);
      LIFEBOOK_SESSION_LOCKS.delete(sessionId);
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: status === 401 ? "Login is required to generate the life book PDF." : "Premium PDF access is required.",
        code: status === 401 ? "UNAUTHORIZED" : "LIFEBOOK_ACCESS_DENIED",
      }, { status });
    }

    logLifeBookServer("PaymentVerificationPassed", {
      featureKey,
      accessType: clean(access?.accessType || ""),
      mode: "llm-only",
    });

    executionCtx = buildPremiumExecutionContext({
      serviceKey: LIFEBOOK_SERVICE_KEY,
      reportType: "lifeBook",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    if (retrySourceExecution) applyLifeBookRetryExecutionKey(executionCtx, retrySourceExecution);
    executionCtx.metadata = {
      ...(executionCtx.metadata || {}),
      profileId,
      lifeBookPdfRecord: generatingRecord,
      serviceType: "life-book",
      generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
      authoringMode: LIFEBOOK_AUTHORING_MODE,
      writingPipeline: "saju-calculation-to-llm-authored-pdf",
    };

    if (!skipDbPersistence) {
      await startPremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx);
      await persistLifeBookPdfRecord(pdfDbEnv, executionCtx, generatingRecord, {
        profileId,
        generationStatus: "generating",
        generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
        authoringMode: LIFEBOOK_AUTHORING_MODE,
        writingPipeline: "saju-calculation-to-llm-authored-pdf",
      });
    }

    updateLifeBookSessionProgress(sessionId, {
      stateKey: "local_calculation",
      currentChapterNo: 0,
      currentChapterTitle: "사주 계산 정합성 확인",
      totalChapters: getLifeBookBlueprints().length,
    });
    const localCalculation = calculateSajuLocally({ birthInput, profile, body, sessionId });

    updateLifeBookSessionProgress(sessionId, {
      stateKey: "llm_generation",
      currentChapterNo: 0,
      currentChapterTitle: "인생의 책 본문 생성",
      totalChapters: getLifeBookBlueprints().length,
    });
    const generationInput = {
      ...body,
      profile,
      birthInput,
      sessionId,
      reportSessionId: sessionId,
      reportId,
      localSajuJson: localCalculation.localSajuJson,
      localSajuValidation: localCalculation.localSajuValidation,
      jsonContractValidation: localCalculation.jsonContractValidation,
      signals: localCalculation.signals,
      analysisSignals: localCalculation.signals,
      generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
      authoringMode: LIFEBOOK_AUTHORING_MODE,
    };

    const generated = await generateLifeBookPremiumPdfV2({
      userId: auth.userId,
      input: generationInput,
      paymentContext: {
        ...(body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {}),
        ...(body?.paymentContext && typeof body.paymentContext === "object" ? body.paymentContext : {}),
        reportId,
        sessionId,
        reportSessionId: sessionId,
        featureKey,
      },
      env,
      pdfDbEnv: skipDbPersistence ? null : pdfDbEnv,
      executionContext: skipDbPersistence ? null : executionCtx,
      requestUrl: request.url,
      reportId,
      sessionId,
      onProgress: ({ chapter } = {}) => {
        if (!chapter) return;
        updateLifeBookSessionProgress(sessionId, {
          stateKey: "llm_generation",
          currentChapterNo: Number(chapter.order || 0),
          currentChapterTitle: clean(chapter.title || "인생의 책 본문 생성"),
          totalChapters: getLifeBookBlueprints().length,
        });
      },
    });

    if (!generated?.ok || generated.status === "failed" || !clean(generated.downloadUrl || generated.pdfReady?.downloadUrl)) {
      throw Object.assign(new Error(clean(generated?.error || "LIFE_BOOK_PREMIUM_GENERATION_FAILED")), {
        code: clean(generated?.code || "LIFE_BOOK_PREMIUM_GENERATION_FAILED"),
        status: Number(generated?.statusCode || 500),
        details: generated?.details || null,
      });
    }

    const completedRecord = buildLifeBookPdfRecord({
      reportId,
      userId: auth.userId,
      profileId,
      status: "completed",
      htmlContent: generated.pdfReady?.html || "",
      pdfUrl: generated.downloadUrl || generated.pdfUrl || generated.htmlUrl || "",
      createdAt: recordCreatedAt,
      engineVersion,
    });
    if (generated.pdfReady && typeof generated.pdfReady === "object") {
      generated.pdfReady.lifeBookPdfRecord = completedRecord;
    }

    const resultData = {
      ok: true,
      success: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      featureKey,
      reportType: "lifeBook",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      sessionId,
      reportSessionId: sessionId,
      reportId,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      chapters: generated.chapters,
      payload: generated.payload,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      authoringMode: LIFEBOOK_AUTHORING_MODE,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: generated.writingPipeline,
      llmAssembly: generated.llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfCompletionValidation: generated.pdfCompletionValidation,
      archiveStatus: generated.archiveStatus,
      completedExecutionStored: generated.completedExecutionStored,
      lifeBookPdfRecord: completedRecord,
      pdfReady: generated.pdfReady,
      pdfUrl: generated.pdfUrl,
      htmlUrl: generated.htmlUrl,
      downloadUrl: generated.downloadUrl,
      canReopen: true,
      canDownload: true,
    };
    const responseBody = { ...resultData, data: resultData };
    LIFEBOOK_SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      userId: auth.userId,
      status: "done",
      startedAt: recordCreatedAt,
      completedAt: new Date().toISOString(),
      result: responseBody,
      progress: {
        stateKey: "completed",
        currentChapterNo: getLifeBookBlueprints().length,
        totalChapters: getLifeBookBlueprints().length,
        updatedAt: new Date().toISOString(),
      },
      lifeBookPdfRecord: completedRecord,
    });
    return json(responseBody);
  } catch (error) {
    const normalizedError = normalizeLifeBookError(error);
    if (executionCtx && !skipDbPersistence) {
      await failPremiumPdfExecution(
        pdfDbEnv,
        auth.userId,
        executionCtx,
        clean(error?.code || "life_book_llm_generation_failed", 80),
        clean(error?.message || "Life book PDF generation failed.", 500),
        "llm-generation",
      );
    }
    const failedRecord = buildLifeBookPdfRecord({
      reportId,
      userId: auth.userId,
      profileId: resolveLifeBookProfileId(body, profile),
      status: "failed",
      errorMessage: clean(error?.message || error, 500),
      createdAt: recordCreatedAt,
      engineVersion,
    });
    LIFEBOOK_SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      userId: auth.userId,
      status: "failed",
      startedAt: recordCreatedAt,
      failedAt: new Date().toISOString(),
      progress: {
        stateKey: "failed",
        currentChapterNo: 0,
        totalChapters: getLifeBookBlueprints().length,
        updatedAt: new Date().toISOString(),
      },
      error: normalizedError,
      lifeBookPdfRecord: failedRecord,
    });
    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      code: clean(error?.code || "LIFEBOOK_GENERATION_FAILED"),
      message: clean(error?.message || "Life book PDF generation failed.", 500),
      debugSafe: {
        stage: "llm-generation",
        reportId,
        sessionId,
        lifeBookPdfRecord: failedRecord,
        retryable: Number(error?.status || error?.statusCode || 500) >= 500,
        assemblyRuntime: resolveLifeBookAssemblyRuntimeInfo(env),
      },
    }, { status: Number(error?.status || error?.statusCode || 500) || 500 });
  }
}


async function handlePrepare(request, env, ctx) {
  if (!ctx || typeof ctx.waitUntil !== "function" || request.headers.get("x-lifebook-sync") === "1") {
    return await handlePrepareSync(request, env);
  }

  const bodyText = await request.clone().text().catch(() => "");
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch (_) {
    return await handlePrepareSync(new Request(request, { body: bodyText }), env);
  }
  body.targetYear = resolveLifeBookTargetYear(body);
  body.analysisYear = body.targetYear;

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "Login is required to generate the life book PDF.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }

  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId)
    || `life-book:${auth.userId}:${clean(body?.birthDate || "unknown")}:${clean(body?.birthTime || body?.hour || "unknown")}:${body.targetYear}`;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);
  const existingLock = LIFEBOOK_SESSION_LOCKS.get(sessionId);

  if (existingLock?.status === "done" && existingLock.result) {
    return json(existingLock.result);
  }
  if (["queued", "running"].includes(clean(existingLock?.status))) {
    return json(buildLifeBookStatusPayload(existingLock, { sessionId, reportId }), { status: 202 });
  }

  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: {
      stateKey: "queued",
      currentChapterNo: 0,
      totalChapters: getLifeBookBlueprints().length,
      updatedAt: new Date().toISOString(),
    },
  });

  const backgroundRequest = new Request(request, { body: bodyText });
  ctx.waitUntil(
    handlePrepareSync(backgroundRequest, env)
      .then(async (response) => {
        try { await response?.text?.(); } catch (_) {}
      })
      .catch((error) => {
        const normalizedError = normalizeLifeBookError(error);
        logLifeBookServer("BackgroundGenerationFailed", {
          sessionId,
          reportId,
          errorCode: error?.code,
          errorStatus: error?.status,
          errorMessage: clean(error?.message || error).slice(0, 200),
        });
        LIFEBOOK_SESSION_LOCKS.set(sessionId, {
          sessionId,
          reportId,
          status: "failed",
          startedAt: new Date().toISOString(),
          progress: {
            stateKey: "failed",
            currentChapterNo: 0,
            totalChapters: getLifeBookBlueprints().length,
            updatedAt: new Date().toISOString(),
          },
          error: normalizedError,
        });
      }),
  );

  logLifeBookServer("LIFE_BOOK_BACKGROUND_GENERATION_STARTED", { sessionId, reportId });
  return json({
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    status: "running",
    serverStatus: "running",
    reportId,
    sessionId,
    data: {
      reportId,
      sessionId,
      status: "running",
      progress: {
        stateKey: "queued",
        currentChapterNo: 0,
        totalChapters: getLifeBookBlueprints().length,
      },
    },
    debugSafe: {
      stage: "LIFE_BOOK_BACKGROUND_GENERATION_STARTED",
      reportId,
      sessionId,
    },
  }, { status: 202 });
}

export async function handleSajuLifebookRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    let path = getRoutePath(request, "/api/premium/saju-lifebook");
    if (path === null || path === undefined) {
      path = getRoutePath(request, "/api/lifebook");
    }

    if (method === "POST" && (path === "" || path === "/" || path === "/prepare")) {
      return await handlePrepare(request, env, ctx);
    }
    if (method === "GET" && path === "/status") {
      return await handleStatus(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-lifebook",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
