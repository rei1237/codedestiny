import { Solar } from "lunar-javascript";
import { buildAstroLocalChartJson } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const SOUL_ORIGIN_FEATURE_KEY = "premium_pdf_soul_origin";
const SOUL_ORIGIN_SERVICE_KEY = "soul-origin";
const SOUL_ORIGIN_DISPLAY_NAME = "운명의 업";
const SOUL_ORIGIN_TITLE = "운명의 업 프리미엄 리포트";
const SOUL_ORIGIN_REPORT_TYPE = "soul_origin_karma";
const BIRTH_TIME_REQUIRED_MESSAGE = "운명의 업 PDF는 자미두수·베다점·점성술 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.";

const REPORT_CACHE = globalThis.__SOUL_ORIGIN_REPORT_CACHE || new Map();
if (!globalThis.__SOUL_ORIGIN_REPORT_CACHE) {
  globalThis.__SOUL_ORIGIN_REPORT_CACHE = REPORT_CACHE;
}

const SOUL_ORIGIN_CHAPTERS = [
  {
    id: "origin_overview",
    title: "Chapter 1. 운명의 업 총론 — 이번 생의 반복 주제",
    sections: [
      "다섯 운세가 공통으로 가리키는 핵심 업",
      "이번 생에서 반복되는 선택 패턴",
      "가장 강하게 태어난 무기",
      "가장 자주 흔들리는 약점",
      "운이 열리는 조건",
      "운이 막히는 조건",
    ],
  },
  {
    id: "saju_karma",
    title: "Chapter 2. 사주로 보는 업의 뿌리",
    sections: [
      "일간과 월지로 보는 기본 기질",
      "십성이 만드는 반복 역할",
      "오행 균형과 결핍의 과제",
      "용신·희신이 알려주는 회복 방향",
      "대운에서 반복되는 성장 주제",
      "사주를 현실 전략으로 쓰는 법",
    ],
  },
  {
    id: "ziwei_destiny",
    title: "Chapter 3. 자미두수로 보는 명궁의 사명",
    sections: [
      "명궁과 신궁이 말하는 인생 방향",
      "주성이 만드는 타고난 역할",
      "사화가 만드는 변화의 흐름",
      "재백궁과 관록궁의 현실 과제",
      "부부궁과 복덕궁의 감정 카르마",
      "명반을 가장 잘 쓰는 법",
    ],
  },
  {
    id: "astrology_soul",
    title: "Chapter 4. 점성술로 보는 영혼의 설계",
    sections: [
      "태양이 말하는 의식의 방향",
      "달이 말하는 마음의 습관",
      "상승궁이 말하는 삶의 접근법",
      "주요 행성이 만드는 성격의 결",
      "하우스가 보여주는 인생 무대",
      "점성술 흐름을 성장 전략으로 쓰는 법",
    ],
  },
  {
    id: "vedic_dharma",
    title: "Chapter 5. 베다점으로 보는 다르마와 카르마",
    sections: [
      "라그나가 말하는 삶의 출발점",
      "달 나크샤트라가 말하는 본능",
      "다샤가 보여주는 현재의 숙제",
      "라후·케투가 만드는 욕망과 해방",
      "강한 행성과 약한 행성의 과제",
      "베다 차트를 현실 루틴으로 쓰는 법",
    ],
  },
  {
    id: "sukyo_relation_karma",
    title: "Chapter 6. 숙요점으로 보는 인연의 업",
    sections: [
      "본명숙이 말하는 인연의 기본 결",
      "사람을 끌어당기는 관계 패턴",
      "반복되는 애착과 거리감",
      "인연에서 배우는 핵심 과제",
      "좋은 인연을 살리는 방식",
      "나쁜 반복을 끊는 관계 기준",
    ],
  },
  {
    id: "shadow_pattern",
    title: "Chapter 7. 반복되는 그림자와 막힘의 원인",
    sections: [
      "무너질 때 반복되는 선택",
      "감정적으로 붙잡히는 지점",
      "돈과 일에서 막히는 구조",
      "관계에서 되풀이되는 상처",
      "운이 막힐 때 나타나는 신호",
      "그림자를 줄이는 현실 처방",
    ],
  },
  {
    id: "master_plan",
    title: "Chapter 8. 운명의 업을 푸는 실행 전략",
    sections: [
      "지금 가장 먼저 바꿔야 할 습관",
      "30일 정화 루틴",
      "90일 현실 변화 계획",
      "1년 성장 방향",
      "3년 운명 재설계 방향",
      "이 생의 업을 푸는 한 문장",
    ],
  },
];

const ZHI_LIST = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const PALACE_LABELS = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "교우궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const STAR_POOL = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeError(error) {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function logFlow(stage, payload = {}) {
  const safe = {
    stage: clean(stage || "Unknown"),
    requestId: clean(payload.requestId || ""),
    sessionId: clean(payload.sessionId || ""),
    errorCode: clean(payload.errorCode || ""),
  };
  const tag = `[SoulOrigin] ${safe.stage}`;
  if (safe.errorCode) {
    console.error(tag, safe);
    return;
  }
  console.info(tag, safe);
}

function getPremiumAccessToken(request, body = {}) {
  const header = clean(request.headers.get("x-premium-access-token"));
  if (header) return header;
  return clean(body.premiumAccessToken || body._premiumAccessToken || body.accessToken || "");
}

function normalizeBirthInput(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const birthDate = clean(src.birthDate || src.date || "");
  const birthTime = clean(src.birthTime || src.time || "");
  const dm = birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const tm = birthTime.match(/^(\d{1,2}):(\d{1,2})$/);

  if (!dm) {
    return { ok: false, code: "BIRTH_DATE_REQUIRED", message: "운명의 업 리포트 생성을 위해 생년월일 정보가 필요합니다." };
  }
  if (!tm) {
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: BIRTH_TIME_REQUIRED_MESSAGE };
  }

  const year = toNumber(dm[1]);
  const month = toNumber(dm[2]);
  const day = toNumber(dm[3]);
  const hour = toNumber(tm[1]);
  const minute = toNumber(tm[2], 0);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: "BIRTH_DATE_INVALID", message: "생년월일 형식을 확인해주세요." };
  }
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: BIRTH_TIME_REQUIRED_MESSAGE };
  }

  const latitude = toNumber(src.latitude, 37.5665);
  const longitude = toNumber(src.longitude ?? src.lng, 126.978);
  const timezoneOffset = toNumber(src.timezoneOffset, 9);

  return {
    ok: true,
    input: {
      name: clean(src.name || "사용자") || "사용자",
      gender: clean(src.gender || "unknown") || "unknown",
      birthDate,
      birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      birthPlace: clean(src.birthPlace || src.place || "출생지 미상") || "출생지 미상",
      timezone: clean(src.timezone || "Asia/Seoul") || "Asia/Seoul",
      timezoneOffset: Number.isFinite(timezoneOffset) ? timezoneOffset : 9,
      latitude: Number.isFinite(latitude) ? latitude : 37.5665,
      longitude: Number.isFinite(longitude) ? longitude : 126.978,
      year,
      month,
      day,
      hour,
      minute,
    },
  };
}

function calculateSajuLocal(birthInput) {
  const profile = buildSajuProfile({
    name: birthInput.name,
    gender: birthInput.gender,
    birth: {
      year: birthInput.year,
      month: birthInput.month,
      day: birthInput.day,
      hour: birthInput.hour,
      minute: birthInput.minute,
      calendarType: "solar",
      unknownTime: false,
    },
  });

  const five = profile?.fiveElements?.percentages || {};
  const useful = profile?.usefulGods || {};
  const chart = profile?.chart || {};

  return {
    dayMaster: clean(profile?.dayMaster?.stemKo || profile?.dayMaster?.stem || ""),
    monthBranch: clean(chart?.month?.branchKo || chart?.month?.branch || ""),
    tenGodSummary: clean(profile?.tenGodSummary || ""),
    elementWeights: {
      wood: Number(five.wood || 0),
      fire: Number(five.fire || 0),
      earth: Number(five.earth || 0),
      metal: Number(five.metal || 0),
      water: Number(five.water || 0),
    },
    yongshin: clean(useful.yong || ""),
    heesin: Array.isArray(useful.hee) ? useful.hee.slice(0, 3) : [],
    strength: clean(useful.strength || ""),
    daewoon: Array.isArray(profile?.daewoon) ? profile.daewoon.slice(0, 8) : [],
  };
}

function calculateZiweiLocal(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();

  const lMonth = Math.abs(Number(lunar.getMonth()));
  const hIdx = (birthInput.hour === 23 || birthInput.hour === 0) ? 0 : Math.floor((birthInput.hour + 1) / 2);
  const baseIdx = (2 + lMonth - 1) % 12;
  const mingIdx = (baseIdx - hIdx + 12) % 12;
  const shenIdx = (baseIdx + hIdx) % 12;

  const palaces = Array.from({ length: 12 }).map((_, i) => {
    const branchIndex = (mingIdx - i + 12) % 12;
    const palaceName = PALACE_LABELS[i];
    const starA = STAR_POOL[(birthInput.day + i) % STAR_POOL.length];
    const starB = STAR_POOL[(birthInput.month + i + 5) % STAR_POOL.length];
    return {
      index: i,
      palace: palaceName,
      branch: ZHI_LIST[branchIndex],
      mainStars: [starA, starB],
    };
  });

  return {
    chartMeta: {
      mingGong: ZHI_LIST[mingIdx],
      shenGong: ZHI_LIST[shenIdx],
      yearGan: clean(lunar.getYearGan() || ""),
      yearZhi: clean(lunar.getYearZhi() || ""),
    },
    palaces,
  };
}

function calculateAstrologyLocal(birthInput) {
  const local = buildAstroLocalChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  }, {}, null);

  const chart = local?.chart || {};
  return {
    sun: clean(chart?.sunSign || ""),
    moon: clean(chart?.moonSign || ""),
    ascendant: clean(chart?.ascendantSign || ""),
    majorPlanets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 10) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateVedicLocal(birthInput) {
  const local = buildVedicLocalChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  });

  const chart = local?.chart || {};
  return {
    lagna: clean(chart?.lagnaSign || chart?.ascendantSign || ""),
    moonNakshatra: clean(chart?.moonNakshatra || ""),
    dasha: {
      current: clean(chart?.dashas?.currentMahaDasha || ""),
      next: clean(chart?.dashas?.nextMahaDasha || ""),
    },
    rahu: clean(chart?.rahuSign || ""),
    ketu: clean(chart?.ketuSign || ""),
    planets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 9) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateSukyoLocal(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());
  const lunarDay = Number(lunar.getDay());
  const basic = buildSukuyoFromLunar(Math.abs(lunarMonth), lunarDay, {
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  });

  return {
    natalStar: clean(basic?.nameKo || basic?.name || ""),
    element: clean(basic?.elementKo || ""),
    nature: clean(basic?.natureKo || ""),
  };
}

async function buildSoulOriginLocalSeed(env, birthInput) {
  const engineErrors = [];
  const seed = {
    birthInput,
    saju: null,
    ziwei: null,
    astrology: null,
    vedic: null,
    sukyo: null,
    generatedAt: new Date().toISOString(),
  };

  try {
    seed.saju = calculateSajuLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "saju", error: normalizeError(error) });
  }

  try {
    seed.ziwei = calculateZiweiLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "ziwei", error: normalizeError(error) });
  }

  try {
    seed.astrology = calculateAstrologyLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "astrology", error: normalizeError(error) });
  }

  try {
    seed.vedic = calculateVedicLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "vedic", error: normalizeError(error) });
  }

  try {
    seed.sukyo = calculateSukyoLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "sukyo", error: normalizeError(error) });
  }

  if (engineErrors.length) {
    console.error("[SoulOrigin][LocalSeedFailed]", { engineErrors });
    const err = new Error("운명의 업 리포트 생성에 필요한 출생 정보를 확인하지 못했습니다. 프로필 정보를 확인해 주세요.");
    err.code = "SOUL_ORIGIN_LOCAL_ENGINE_FAILED";
    throw err;
  }

  return seed;
}

function summarizeSignal(seed) {
  return [
    clean(seed?.saju?.dayMaster ? `사주 일간 ${seed.saju.dayMaster}` : ""),
    clean(seed?.ziwei?.chartMeta?.mingGong ? `자미두수 명궁 ${seed.ziwei.chartMeta.mingGong}` : ""),
    clean(seed?.astrology?.sun ? `태양 ${seed.astrology.sun}` : ""),
    clean(seed?.astrology?.moon ? `달 ${seed.astrology.moon}` : ""),
    clean(seed?.vedic?.lagna ? `라그나 ${seed.vedic.lagna}` : ""),
    clean(seed?.sukyo?.natalStar ? `본명숙 ${seed.sukyo.natalStar}` : ""),
  ].filter(Boolean);
}

function buildSectionBody(seed, chapterTitle, sectionTitle) {
  const profileName = clean(seed?.birthInput?.name || "사용자");
  const signals = summarizeSignal(seed);
  const signalA = signals[0] || "핵심 신호";
  const signalB = signals[1] || "기본 흐름";

  const lines = [
    `핵심 신호: ${chapterTitle}의 ${sectionTitle}에서는 ${signalA}와 ${signalB}가 같은 방향으로 맞물립니다.`,
    `업의 작동 방식: 이 흐름은 비슷한 선택 장면을 반복시키며, 삶의 중심축을 스스로 세우는 과제를 강화합니다.`,
    `잘 풀릴 때의 장점: ${profileName}님은 기준을 분명히 세울수록 집중력과 실행력이 함께 올라가며 성과가 안정적으로 누적됩니다.`,
    `막힐 때의 패턴: 속도를 앞세우거나 감정 정리를 늦추면 같은 부담이 다시 나타나고 결정 피로가 커집니다.`,
    `현실 적용 조언: 하루 단위의 우선순위를 먼저 고정하고 주간 점검으로 리듬을 유지하면 운의 상승 구간을 오래 붙잡을 수 있습니다.`,
  ];

  return lines.join("\n\n");
}

function buildSoulOriginChapters(seed) {
  return SOUL_ORIGIN_CHAPTERS.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    subtitle: "운명의 업 통합 해석",
    sections: chapter.sections.map((sectionTitle) => ({
      title: sectionTitle,
      body: buildSectionBody(seed, chapter.title, sectionTitle),
    })),
  }));
}

function buildSummary(seed) {
  const signals = summarizeSignal(seed);
  const front = signals.slice(0, 3).join(" · ");
  if (front) {
    return `${front}의 공통 결을 기준으로 반복 패턴, 강점, 약점, 실행 전략을 통합했습니다.`;
  }
  return "다섯 운세 체계의 공통 결을 바탕으로 반복 패턴과 실행 전략을 통합했습니다.";
}

function makeReportId() {
  return `soul-origin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function buildArchiveUrl(request, reportId) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  return `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
}

async function handlePrepare(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || "");
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "");

  logFlow("ProductLookupStart", { requestId, sessionId });
  const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});
  if (!normalizedBirth.ok) {
    return json({ ok: false, code: normalizedBirth.code, message: normalizedBirth.message }, { status: 422 });
  }
  const birthInput = normalizedBirth.input;

  const premiumAccessToken = getPremiumAccessToken(request, body);
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "soulOriginKarma", {
    reportType: "soulOriginKarma",
    featureKey: clean(body?.featureKey) || SOUL_ORIGIN_FEATURE_KEY,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/soul-origin",
  });

  if (!access?.ok) {
    return json({
      ok: false,
      code: access?.code || "UNAUTHORIZED",
      message: access?.message || "운명의 업 리포트 생성 권한을 확인할 수 없습니다.",
    }, { status: Number(access?.status) || 403 });
  }

  logFlow("CoinGateSuccess", { requestId, sessionId: clean(access?.sessionId || sessionId) });

  const reportId = clean(body?.reportId) || makeReportId();
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    reportType: "soulOriginKarma",
    userId: auth.userId,
    featureKey: clean(body?.featureKey) || SOUL_ORIGIN_FEATURE_KEY,
    sessionId: clean(body?.sessionId || body?.reportSessionId || `soul-origin:${reportId}`),
    reportId,
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });

  await startPremiumPdfExecution(env, auth.userId, executionCtx);
  logFlow("SessionCreateStart", { requestId, sessionId: clean(executionCtx?.sessionId || sessionId) });

  try {
    logFlow("LocalCalcStart", { requestId, sessionId: clean(executionCtx?.sessionId || sessionId) });
    const localSeed = await buildSoulOriginLocalSeed(env, birthInput);
    const chapters = buildSoulOriginChapters(localSeed);
    const summary = buildSummary(localSeed);

    const archiveUrl = buildArchiveUrl(request, reportId);
    const pdfReady = {
      html: true,
      pdfUrl: archiveUrl,
      htmlUrl: archiveUrl,
      downloadUrl: archiveUrl,
      storageKey: `premium-archive:soul-origin:${reportId}`,
    };

    if (!clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)) {
      throw new Error("운명의 업 리포트 저장 URL을 생성하지 못했습니다.");
    }

    const responseBody = {
      ok: true,
      reportId,
      sessionId: clean(executionCtx?.sessionId || sessionId) || undefined,
      title: SOUL_ORIGIN_TITLE,
      summary,
      chapters,
      pdfReady,
      pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
      htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
      canReopen: true,
      canDownload: true,
      createdAt: new Date().toISOString(),
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource: "local-only",
      chapterCount: chapters.length,
      archive: {
        reportId,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        displayName: SOUL_ORIGIN_DISPLAY_NAME,
        title: SOUL_ORIGIN_TITLE,
        summary,
        mode: "personal",
        birthName: clean(birthInput.name),
        chapters,
        localSeed,
        pdfReady,
        pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
        htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
        canReopen: true,
        canDownload: Boolean(clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)),
      },
    });

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      payload: responseBody,
    });

    logFlow("PDFCreateSuccess", { requestId, sessionId: clean(executionCtx?.sessionId || sessionId) });
    return json(responseBody);
  } catch (error) {
    logFlow("Failed", {
      requestId,
      sessionId: clean(executionCtx?.sessionId || sessionId),
      errorCode: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
    });

    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      clean(error?.code || "soul_origin_generation_failed"),
      clean(error?.message || "운명의 업 리포트 생성에 필요한 출생 정보를 확인하지 못했습니다. 프로필 정보를 확인해 주세요."),
      "soul-origin-generation",
    );

    return json({
      ok: false,
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: clean(error?.message || "운명의 업 리포트 생성에 필요한 출생 정보를 확인하지 못했습니다. 프로필 정보를 확인해 주세요."),
    }, { status: 422 });
  }
}

async function handleReadReport(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));

  if (!reportId) {
    return json({ ok: false, code: "MISSING_REPORT_ID", message: "reportId가 필요합니다." }, { status: 400 });
  }

  const cached = REPORT_CACHE.get(reportId);
  if (cached && cached.userId === auth.userId) {
    return json(cached.payload);
  }

  await connectDb(env);
  const archived = await ServiceExecutionTransaction.findOne({
    userId: auth.userId,
    reportId,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  const archive = archived?.metadata?.archive && typeof archived.metadata.archive === "object"
    ? archived.metadata.archive
    : null;

  if (!archive) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "요청한 운명의 업 리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const payload = {
    ok: true,
    reportId: clean(archive.reportId || reportId),
    sessionId: clean(archived?.sessionId || "") || undefined,
    title: clean(archive.title || SOUL_ORIGIN_TITLE) || SOUL_ORIGIN_TITLE,
    summary: clean(archive.summary || ""),
    chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
    pdfReady,
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
    canReopen: true,
    canDownload: Boolean(clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)),
    createdAt: toIso(archived?.createdAt) || new Date().toISOString(),
  };

  REPORT_CACHE.set(reportId, {
    reportId,
    userId: auth.userId,
    payload,
  });

  return json(payload);
}

export async function handleSoulOriginRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/soul-origin");

    if (path === "" || path === "/") {
      if (method !== "POST") return methodNotAllowed();
      return await handlePrepare(request, env);
    }

    if (path === "/report") {
      if (method !== "GET") return methodNotAllowed();
      return await handleReadReport(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SoulOrigin][Error]", normalizeError(error));
    return handleRouteError(error);
  }
}
