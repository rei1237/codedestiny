import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, cookieValue } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildCelestialMelodyReading,
  CELESTIAL_MELODY_INTERPRETATION_ORDER,
  CELESTIAL_MELODY_PROMPT_PREMISE,
  persistCelestialSession,
  restorePaidCelestialSession,
  sanitizeCelestialMelodyText,
} from "../../lib/tarot/celestial-melody-reading.mjs";

const SESSION_CACHE = new Map();
const SESSION_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_CACHE_MAX_ENTRIES = 256;
const CELESTIAL_FEATURE_KEY = "tarot-celestial-harmony";
const CELESTIAL_REPORT_TYPE = "celestialHarmony";
const CELESTIAL_COST = 100;
const CELESTIAL_RESULT_VERSION = "20260605-worker-llm-v1";

function text(value) {
  return String(value || "").trim();
}

function cacheSet(key, value) {
  const token = text(key);
  if (!token || !value) return;
  const now = Date.now();
  SESSION_CACHE.set(token, { value, savedAt: now });
  // 만료 삭제가 읽기 경로에만 있어, 다시 조회되지 않는 세션 토큰은 영영 남았다.
  // 쓰기마다 만료분을 걷고 그래도 넘치면 오래된 것부터 버린다.
  for (const [cachedToken, hit] of SESSION_CACHE) {
    if (now - Number(hit.savedAt || 0) > SESSION_CACHE_TTL_MS) SESSION_CACHE.delete(cachedToken);
  }
  while (SESSION_CACHE.size > SESSION_CACHE_MAX_ENTRIES) {
    const oldestToken = SESSION_CACHE.keys().next().value;
    if (oldestToken === undefined) break;
    SESSION_CACHE.delete(oldestToken);
  }
}

function cacheGet(key) {
  const token = text(key);
  if (!token) return null;
  const hit = SESSION_CACHE.get(token);
  if (!hit) return null;
  if (Date.now() - Number(hit.savedAt || 0) > SESSION_CACHE_TTL_MS) {
    SESSION_CACHE.delete(token);
    return null;
  }
  return hit.value;
}

function extractPaymentEvidence(body = {}) {
  const payload = body && typeof body === "object" ? body : {};
  const accessGrant = payload.accessGrant && typeof payload.accessGrant === "object" ? payload.accessGrant : {};
  const consume = payload.consume && typeof payload.consume === "object" ? payload.consume : {};
  const payment = payload.payment && typeof payload.payment === "object" ? payload.payment : {};

  return {
    accessGrant,
    consume,
    payment,
    reportId: text(payload.reportId || accessGrant.reportId || payment.reportId),
    transactionId: text(
      payload.transactionId
      || payload.purchaseId
      || accessGrant.purchaseId
      || accessGrant.transactionId
      || consume.transactionId
      || consume.sourceTransactionId
      || payment.transactionId,
    ),
    requestId: text(payload.requestId || accessGrant.requestId || consume.requestId || payment.requestId),
    sessionId: text(payload.sessionId || payload.reportSessionId || accessGrant.sessionId || payment.sessionId || payment.reportSessionId),
    purchaseId: text(payload.purchaseId || accessGrant.purchaseId || accessGrant.transactionId || consume.purchaseId || consume.transactionId || payment.purchaseId),
  };
}

function toStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return fallback.slice();
  return value.map((item) => text(item)).filter(Boolean);
}

function firstEnvText(env = {}, keys = []) {
  for (const key of keys) {
    const value = text(env?.[key]);
    if (value) return value;
  }
  return "";
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function toIso(value) {
  const d = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function normalizeCardEntry(card = {}, fallback = {}) {
  const source = card && typeof card === "object" ? card : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const orientation = text(source.orientation || base.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
  return {
    planetKo: text(source.planetKo || base.planetKo || "태양"),
    planetEn: text(source.planetEn || base.planetEn || "Sun"),
    planetSymbol: text(source.planetSymbol || base.planetSymbol || "☉"),
    planetTitle: text(source.planetTitle || base.planetTitle || "의식의 중심"),
    planetId: text(source.planetId || base.planetId || "sun"),
    layer: text(source.layer || base.layer || "conscious"),
    orientation,
    cardNameKo: text(source.cardNameKo || base.cardNameKo || "바보"),
    cardNameEn: text(source.cardNameEn || base.cardNameEn || "The Fool"),
    tarotKeywords: toStringArray(source.tarotKeywords, toStringArray(base.tarotKeywords, ["새로운 시작"])),
    planetKeywords: toStringArray(source.planetKeywords, toStringArray(base.planetKeywords, ["자아"])),
    cardMeaning: text(source.cardMeaning || base.cardMeaning || "카드 상징이 현재 상황의 핵심 과제를 비춥니다."),
    planetMeaning: text(source.planetMeaning || base.planetMeaning || "행성 원형은 감정과 선택의 구조를 드러냅니다."),
    archetypeReading: text(source.archetypeReading || base.archetypeReading || "원형 해석을 통해 반복 패턴과 전환 지점을 읽어야 합니다."),
    consciousMessage: text(source.consciousMessage || base.consciousMessage || "의식 메시지는 기준을 먼저 세우고 실행 순서를 명확히 하라는 요청입니다."),
    unconsciousPattern: text(source.unconsciousPattern || base.unconsciousPattern || "무의식 패턴은 과거의 반응 습관이 현재 선택을 왜곡하는 방식으로 나타납니다."),
    shadowWarning: text(source.shadowWarning || base.shadowWarning || "그림자 경고는 과잉 반응과 자기 단정을 멈추라는 안전 신호입니다."),
    soulLesson: text(source.soulLesson || base.soulLesson || "영혼 과제는 상처를 언어화하고 자기 신뢰 행동으로 전환하는 데 있습니다."),
    integrationPractice: text(source.integrationPractice || base.integrationPractice || "통합 실천은 오늘 가능한 최소 행동을 끝까지 완료하는 것입니다."),
  };
}

function normalizeClosingFortune(value = {}, fallback = {}) {
  const src = value && typeof value === "object" ? value : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  return {
    title: text(src.title || base.title || "오늘의 별빛 운세"),
    overall: text(src.overall || base.overall || "오늘의 별빛은 큰 결론보다 작은 조율을 먼저 비춥니다. 마음이 흔들리는 지점은 멈춤의 신호가 아니라 기준을 다시 세우라는 안내입니다. 한 가지 약속을 끝까지 지키면 운의 흐름이 차분하게 정돈됩니다. 지금 열리는 길은 급한 확정보다 부드러운 선택 속에서 더 선명해집니다."),
    love: text(src.love || base.love || "관계에서는 마음을 시험하기보다 필요한 감정을 한 문장으로 전하는 흐름이 좋습니다. 다정함과 경계를 함께 세울 때 인연의 결이 안정됩니다."),
    work: text(src.work || base.work || "일에서는 속도보다 순서가 운을 엽니다. 가장 부담스러운 일 하나를 작게 나누어 시작하면 막혀 있던 흐름이 다시 움직입니다."),
    money: text(src.money || base.money || "재물운은 확장보다 검증을 먼저 요구합니다. 작은 지출 패턴을 알아차릴 때 자원의 흐름이 단단해집니다."),
    health: text(src.health || base.health || "몸과 마음은 단순한 회복 의식을 원합니다. 수면, 호흡, 물 한 잔처럼 기본적인 리듬이 전체 운의 균형을 다시 세웁니다."),
  };
}

function normalizeSummary(summary = {}, fallback = {}) {
  const src = summary && typeof summary === "object" ? summary : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const srcMatrix = src.insightMatrix && typeof src.insightMatrix === "object" ? src.insightMatrix : {};
  const baseMatrix = base.insightMatrix && typeof base.insightMatrix === "object" ? base.insightMatrix : {};
  return {
    overallTheme: text(src.overallTheme || base.overallTheme || "11행성 신호는 의식과 무의식의 재정렬이 필요한 전환기임을 말합니다."),
    strongestPlanetSignal: text(src.strongestPlanetSignal || base.strongestPlanetSignal || "핵심 행성 신호가 전체 리딩의 중심 주제를 형성합니다."),
    deepestShadow: text(src.deepestShadow || base.deepestShadow || "그림자 패턴을 인식하고 반응 속도를 조절해야 합니다."),
    soulLesson: text(src.soulLesson || base.soulLesson || "영혼 과제는 자기 기준을 행동으로 증명하는 것입니다."),
    integrationPath: text(src.integrationPath || base.integrationPath || "작은 실행을 반복해 해석을 현실에 정착시키세요."),
    dominantLayer: text(src.dominantLayer || base.dominantLayer || "integration"),
    dominantSuit: text(src.dominantSuit || base.dominantSuit || "major"),
    majorArcanaRatio: text(src.majorArcanaRatio || base.majorArcanaRatio || "11/11"),
    planetHighlights: toStringArray(src.planetHighlights, toStringArray(base.planetHighlights, [])),
    insightMatrix: {
      love: text(srcMatrix.love || baseMatrix.love || "관계에서는 감정 추측보다 사실 확인 질문이 필요합니다."),
      work: text(srcMatrix.work || baseMatrix.work || "업무에서는 우선순위와 실행 리듬을 재정렬해야 합니다."),
      money: text(srcMatrix.money || baseMatrix.money || "재정 판단은 기대수익보다 리스크 문장화가 우선입니다."),
      health: text(srcMatrix.health || baseMatrix.health || "수면과 호흡 루틴이 회복의 핵심 축입니다."),
    },
    practices: toStringArray(src.practices, toStringArray(base.practices, [])),
    ritualPlan: toStringArray(src.ritualPlan, toStringArray(base.ritualPlan, [])),
    finalOracle: text(src.finalOracle || base.finalOracle || "작은 실천이 반복될 때 우주의 선율은 현실 변화로 완성됩니다."),
    closingFortune: normalizeClosingFortune(src.closingFortune, base.closingFortune),
  };
}

function normalizePayment(payment = {}, fallback = {}) {
  const src = payment && typeof payment === "object" ? payment : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  return {
    reportId: text(src.reportId || base.reportId),
    transactionId: text(src.transactionId || base.transactionId),
    requestId: text(src.requestId || base.requestId),
    sessionId: text(src.sessionId || src.reportSessionId || base.sessionId || base.reportSessionId),
    reportSessionId: text(src.reportSessionId || src.sessionId || base.reportSessionId || base.sessionId),
    purchaseId: text(src.purchaseId || base.purchaseId || src.transactionId || base.transactionId),
    featureKey: text(src.featureKey || base.featureKey || CELESTIAL_FEATURE_KEY),
    reportType: text(src.reportType || base.reportType || CELESTIAL_REPORT_TYPE),
    cost: Number(src.cost || base.cost || CELESTIAL_COST),
    accessType: text(src.accessType || base.accessType || ""),
  };
}

function normalizeResultSchema(result = {}, options = {}) {
  const seedCards = Array.isArray(options.seedCards) ? options.seedCards : [];
  const paymentSeed = options.payment && typeof options.payment === "object" ? options.payment : {};
  const built = buildCelestialMelodyReading({
    cards: seedCards.length ? seedCards : (Array.isArray(result?.cards) ? result.cards : []),
    payment: {
      reportId: paymentSeed.reportId,
      transactionId: paymentSeed.transactionId,
      coinCharged: true,
      apiUsed: Boolean(result?.meta?.apiUsed),
    },
    version: CELESTIAL_RESULT_VERSION,
  }).reading;

  const sourceCards = Array.isArray(result?.cards) && result.cards.length === 11
    ? result.cards
    : built.cards;

  const cards = built.cards.map((fallbackCard, idx) => normalizeCardEntry(sourceCards[idx], fallbackCard));
  const summary = normalizeSummary(result?.summary, built.summary);
  const payment = normalizePayment(result?.payment, {
    ...built.payment,
    ...paymentSeed,
  });

  return {
    ...result,
    generatedAt: text(result?.generatedAt || built.generatedAt || toIso(Date.now())),
    cards,
    summary,
    payment,
    meta: {
      ...(result?.meta && typeof result.meta === "object" ? result.meta : {}),
      cardCount: cards.length,
      version: text(result?.meta?.version || CELESTIAL_RESULT_VERSION),
    },
  };
}

async function writeCelestialArchive(env, userId, bindings, result) {
  const reportId = text(bindings?.reportId);
  const transactionId = text(bindings?.transactionId);
  const requestId = text(bindings?.requestId);
  const sessionId = text(bindings?.sessionId || bindings?.reportSessionId);
  const purchaseId = text(bindings?.purchaseId);
  const executionKey = text(`celestial-harmony:${reportId || requestId || transactionId || sessionId || Date.now().toString(36)}`);
  const now = new Date();
  await connectDb(env);

  await ServiceExecutionTransaction.findOneAndUpdate(
    { userId, executionKey },
    {
      $set: {
        reportType: CELESTIAL_REPORT_TYPE,
        reportId,
        sessionId,
        paymentSessionId: sessionId,
        coinTransactionId: transactionId,
        idempotencyKey: requestId,
        featureKey: CELESTIAL_FEATURE_KEY,
        cost: CELESTIAL_COST,
        sourceTransactionId: transactionId || purchaseId,
        status: "success",
        premiumStatus: "completed",
        reasonCode: "",
        reasonMessage: "",
        completedAt: now,
        generationCompletedAt: now,
        timeoutAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 90),
        nextRetryAt: now,
        metadata: {
          source: "celestial-harmony.report",
          bindings: {
            reportId,
            transactionId,
            requestId,
            sessionId,
            purchaseId,
          },
          result,
          archive: result,
        },
      },
      $setOnInsert: {
        coinAmount: CELESTIAL_COST,
        maxRetries: 1,
        retryCount: 0,
        retentionUntil: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 90),
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();
}

async function readCelestialArchive(env, userId, bindings = {}) {
  const reportId = text(bindings.reportId);
  const transactionId = text(bindings.transactionId);
  const requestId = text(bindings.requestId);
  const sessionId = text(bindings.sessionId || bindings.reportSessionId);
  const ors = [];
  if (reportId) ors.push({ reportId });
  if (transactionId) ors.push({ sourceTransactionId: transactionId }, { coinTransactionId: transactionId });
  if (requestId) ors.push({ idempotencyKey: requestId });
  if (sessionId) ors.push({ sessionId });
  if (!ors.length) return null;

  await connectDb(env);
  const doc = await ServiceExecutionTransaction.findOne({
    userId,
    reportType: CELESTIAL_REPORT_TYPE,
    status: "success",
    premiumStatus: "completed",
    $or: ors,
  })
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
    .lean();

  if (!doc) return null;
  const archived = doc?.metadata?.result || doc?.metadata?.archive || null;
  if (!archived || typeof archived !== "object") return null;

  return normalizeResultSchema(archived, {
    payment: {
      reportId: text(archived?.payment?.reportId || doc.reportId || reportId),
      transactionId: text(archived?.payment?.transactionId || doc.sourceTransactionId || doc.coinTransactionId || transactionId),
      requestId: text(archived?.payment?.requestId || doc.idempotencyKey || requestId),
      sessionId: text(archived?.payment?.sessionId || doc.sessionId || sessionId),
      reportSessionId: text(archived?.payment?.reportSessionId || doc.sessionId || sessionId),
      featureKey: CELESTIAL_FEATURE_KEY,
      reportType: CELESTIAL_REPORT_TYPE,
      cost: CELESTIAL_COST,
      accessType: text(archived?.payment?.accessType || ""),
    },
  });
}

async function verifyCelestialAccess({ request, env, auth, body, reportId = "", transactionId = "", premiumAccessToken = "" }) {
  const evidence = extractPaymentEvidence(body);
  const accessPayload = {
    ...(body && typeof body === "object" ? body : {}),
    featureKey: CELESTIAL_FEATURE_KEY,
    reportType: CELESTIAL_REPORT_TYPE,
    reportId: text(reportId || evidence.reportId),
    transactionId: text(transactionId || evidence.transactionId),
    requestId: text((body && body.requestId) || evidence.requestId),
    purchaseId: text((body && body.purchaseId) || evidence.purchaseId || evidence.accessGrant.purchaseId || evidence.consume.transactionId),
    sessionId: text((body && body.sessionId) || (body && body.reportSessionId) || evidence.sessionId || evidence.accessGrant.sessionId),
    reportSessionId: text((body && body.reportSessionId) || evidence.sessionId || evidence.accessGrant.sessionId),
    accessGrant: evidence.accessGrant,
    consume: evidence.consume,
    payment: {
      ...evidence.payment,
      featureKey: text(evidence.payment.featureKey || CELESTIAL_FEATURE_KEY),
      reportType: CELESTIAL_REPORT_TYPE,
      reportId: text(evidence.payment.reportId || reportId || evidence.reportId),
      transactionId: text(evidence.payment.transactionId || transactionId || evidence.transactionId),
      requestId: text(evidence.payment.requestId || evidence.requestId || (body && body.requestId)),
      sessionId: text(evidence.payment.sessionId || evidence.payment.reportSessionId || evidence.sessionId || (body && body.sessionId) || (body && body.reportSessionId)),
      reportSessionId: text(evidence.payment.reportSessionId || evidence.payment.sessionId || evidence.sessionId || (body && body.reportSessionId) || (body && body.sessionId)),
      cost: Number(evidence.payment.cost || CELESTIAL_COST),
    },
    premiumAccessToken: text(
      premiumAccessToken
      || (body && (body.premiumAccessToken || body._premiumAccessToken))
      || cookieValue(request, "cd_premium_access")
      || "",
    ) || undefined,
    _accessRoute: "/api/celestial-harmony",
  };

  return requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, CELESTIAL_REPORT_TYPE, accessPayload);
}

function buildCelestialHarmonyPrompt(reading = {}, goldenCard = null) {
  const summary = reading?.summary || {};
  const cards = Array.isArray(reading?.cards) ? reading.cards : [];
  const cardLines = cards.map((card, index) => {
    const cardIndex = index + 1;
    return [
      "[" + cardIndex + "] " + text(card?.planetKo || "") + " - " + text(card?.cardNameKo || "카드 " + cardIndex) + " / " + text(card?.orientation || "upright"),
      "행성 질문축=" + text(card?.planetTitle || ""),
      "행성=" + text(card?.planetKo || card?.planetName || ""),
      "행성 원형=" + text(card?.planetMeaning || ""),
      "타로 키워드=" + toStringArray(card?.tarotKeywords, []).join(", "),
      "카드 의미=" + text(card?.cardMeaning || ""),
      "원형 해석=" + text(card?.archetypeReading || ""),
      "의식 메시지=" + text(card?.consciousMessage || ""),
      "무의식 패턴=" + text(card?.unconsciousPattern || ""),
      "그림자 경고=" + text(card?.shadowWarning || ""),
      "영혼 과제=" + text(card?.soulLesson || ""),
      "현실 조율=" + text(card?.integrationPractice || ""),
    ].join(" | ");
  });
  const golden = goldenCard && typeof goldenCard === "object" ? goldenCard : {};
  const goldenLine = text(golden.n || golden.nameKo || golden.cardNameKo || golden.name || "")
    ? text(golden.r || golden.code || "") + " " + text(golden.n || golden.nameKo || golden.cardNameKo || golden.name || "") + " " + text(golden.en || golden.nameEn || "")
    : "없음";

  return [
    "당신은 '천체의 선율 타로'를 상담하는 전문 타로 리더입니다. 행성 원형, 타로 상징, 사용자의 내면 흐름을 하나의 깊은 리딩으로 조율하세요.",
    CELESTIAL_MELODY_PROMPT_PREMISE,
    "화면 분위기는 별빛, 고요한 카드룸, 행성 궤도, 오라클 노트에 가깝습니다. 문체는 감성적이되 과장된 동화체가 아니라 신뢰감 있는 상담체여야 합니다.",
    "각 행성은 질문축이고, 각 카드는 그 질문에 응답하는 상징입니다. 행성명, 행성 질문축, 카드명, 정역방향을 모든 해석의 출발점으로 삼으세요.",
    "행성별 역할을 섞지 마세요. 태양은 자아, 달은 감정 기억, 수성은 생각과 언어, 금성은 사랑과 가치, 화성은 욕망과 추진력, 목성은 확장과 믿음, 토성은 책임과 시험, 천왕성은 변화와 자유, 해왕성은 꿈과 직관, 명왕성은 그림자와 변용, 카이론은 상처의 지혜입니다.",
    "카드 의미를 도감처럼 나열하지 말고, " + CELESTIAL_MELODY_INTERPRETATION_ORDER + " 순서로 자연스럽게 풀어 주세요.",
    "반드시 한국어로만 작성합니다. 문장은 전문 타로 리더가 사용자에게 직접 말하는 상담체로 씁니다. 연이는 등장하지 않습니다.",
    "불안을 키우는 단정, 미래/상대 마음 확정, 의료/법률/투자 확정 판단, 서비스 안내 문체, 생성 과정 소개, 개발 문서 같은 표현은 쓰지 않습니다.",
    "별빛, 선율, 우주, 운명 같은 표현은 필요한 곳에만 쓰고 같은 비유를 반복하지 않습니다. 모든 항목이 비슷한 말투로 보이면 실패입니다.",
    "입력된 카드 순서, 행성명, 카드명, 정역방향은 절대 바꾸지 않습니다. 카드가 하나라도 누락되면 실패입니다.",
    "출력은 설명 없는 유효한 JSON 객체 하나만 반환합니다. 마크다운, 코드블록, 주석, JSON 밖 문장은 금지합니다.",
    "JSON 스키마는 아래 구조를 그대로 사용하세요.",
    JSON.stringify({
      spreadName: "천체의 선율 타로",
      cards: [{
        order: 1,
        planetId: "sun",
        planetKo: "태양",
        planetEn: "Sun",
        planetSymbol: "☉",
        planetTitle: "의식의 중심",
        layer: "conscious",
        orientation: "upright",
        cardNameKo: "별",
        cardNameEn: "The Star",
        tarotKeywords: ["희망", "회복"],
        planetKeywords: ["자아", "생명력"],
        cardMeaning: "카드 상징을 현재 상황에 연결한 1~2문장",
        planetMeaning: "행성 원형의 의미를 풀어낸 1~2문장",
        archetypeReading: "행성 질문과 카드 상징이 결합된 상담 해석 4~6문장",
        consciousMessage: "사용자가 의식적으로 알아차려야 할 메시지 3~5문장",
        unconsciousPattern: "반복되는 감정, 방어, 무의식 패턴 3~5문장",
        shadowWarning: "불안을 키우지 않는 그림자 경고와 조율법 3~5문장",
        soulLesson: "영혼 과제와 성장 방향 3~5문장",
        integrationPractice: "오늘 실행할 수 있는 현실 조율 행동 3~5문장",
      }],
      summary: {
        overallTheme: "전체 11장 흐름을 하나의 선율로 묶은 종합 리딩",
        strongestPlanetSignal: "가장 강한 행성 신호",
        deepestShadow: "가장 깊은 그림자",
        soulLesson: "핵심 영혼 과제",
        integrationPath: "현실 통합 경로",
        dominantLayer: "conscious|unconscious|soul|shadow|integration",
        dominantSuit: "major|wands|cups|swords|pentacles",
        majorArcanaRatio: "예: 7/11",
        planetHighlights: ["행성별 핵심 신호"],
        practices: ["오늘 실천할 조율 행동"],
        ritualPlan: ["7일 조율 의식"],
        insightMatrix: {
          love: "관계 흐름 해석",
          work: "일과 성취 해석",
          money: "돈과 자원 해석",
          health: "회복과 컨디션 해석",
        },
        finalOracle: "11장 전체를 통합한 마지막 오라클",
        closingFortune: {
          title: "오늘의 별빛 운세",
          overall: "전문 타로 리더가 직접 말하는 종합 운세 4~6문장",
          love: "관계 운세 2~3문장",
          work: "일과 성취 운세 2~3문장",
          money: "돈과 자원 운세 2~3문장",
          health: "회복과 컨디션 운세 2~3문장",
        },
      },
    }),
    "작성 조건:",
    "1) cards는 정확히 11개이며 입력 순서와 행성명을 유지합니다.",
    "2) 각 cards 항목은 카드 하나를 건너뛰지 말고 행성 질문축, 카드 정역방향, 심리 패턴, 그림자, 영혼 과제, 현실 실천을 모두 반영합니다.",
    "3) archetypeReading은 행성과 카드가 만나는 핵심 상담이고, consciousMessage/unconsciousPattern/shadowWarning/soulLesson/integrationPractice는 서로 다른 관점으로 분리해 씁니다. 같은 문장을 재배열하거나 반복하지 마세요.",
    "4) 각 카드 항목에는 해당 행성명, 카드명, 정역방향 의미가 최소 한 번 자연스럽게 살아 있어야 합니다. 카드 의미만 말하고 행성 질문을 빠뜨리면 실패입니다.",
    "5) summary.overallTheme은 전체 선율을 충분히 길게 읽고, finalOracle은 11장 전체를 통합한 마지막 오라클처럼 씁니다.",
    "6) planetHighlights, practices, ritualPlan은 사용자가 바로 실행할 수 있는 작고 구체적인 조율 의식으로 씁니다. 실천은 기록, 호흡, 대화 준비, 휴식, 정리처럼 현실적인 행동이어야 합니다.",
    "7) summary.closingFortune.title은 '오늘의 별빛 운세'로 고정하고, overall은 4~6문장, love/work/money/health는 각각 2~3문장으로 씁니다.",
    "8) closingFortune은 리딩 형식을 소개하지 말고, 타로 리더가 사용자에게 직접 말하는 자연스러운 운세 문장으로 씁니다. health는 질병 판단이 아니라 컨디션, 회복 리듬, 휴식 습관으로만 말합니다.",
    "9) 황금 통합 카드는 11장 결과를 덮어쓰는 카드가 아니라 마지막 조율음으로만 반영합니다.",
    "10) 응답 전 스스로 점검하세요. JSON이 유효한가, cards가 11개인가, 모든 카드가 다른 상담 내용을 갖는가, 금지 표현이 없는가.",
    "황금 통합 카드=" + goldenLine,
    "dominantLayer=" + (summary?.dominantLayer || ""),
    "strongestPlanetSignal=" + (summary?.strongestPlanetSignal || ""),
    "deepestShadow=" + (summary?.deepestShadow || ""),
    "soulLesson=" + (summary?.soulLesson || ""),
    "integrationPath=" + (summary?.integrationPath || ""),
    "cards=" + cardLines.join("\n"),
  ].join("\n");
}

function extractJsonObject(raw) {
  const source = text(raw);
  if (!source) return null;
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = fenced ? [fenced[1], source] : [source];
  for (const candidate of candidates) {
    const trimmed = text(candidate);
    try {
      return JSON.parse(trimmed);
    } catch (_) {
      let start = -1;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = 0; i < trimmed.length; i += 1) {
        const ch = trimmed[i];
        if (inString) {
          if (escape) {
            escape = false;
          } else if (ch === "\\") {
            escape = true;
          } else if (ch === "\"") {
            inString = false;
          }
          continue;
        }
        if (ch === "\"") {
          inString = true;
          continue;
        }
        if (ch === "{") {
          if (depth === 0) start = i;
          depth += 1;
        } else if (ch === "}") {
          depth -= 1;
          if (depth === 0 && start >= 0) {
            const slice = trimmed.slice(start, i + 1);
            try {
              return JSON.parse(slice);
            } catch (_) {
              start = -1;
            }
          }
        }
      }
    }
  }
  return null;
}

function preferText(value, fallback, minLength = 1) {
  const candidate = sanitizeCelestialMelodyText(value);
  if (candidate.length >= minLength) return candidate;
  return text(fallback);
}

function preferTextWithFallback(value, fallback, minLength = 1, field = "") {
  const candidate = sanitizeCelestialMelodyText(value);
  if (candidate.length >= minLength) {
    return { value: candidate, fallbackUsed: false };
  }
  return { value: text(fallback), fallbackUsed: Boolean(field) };
}

function preferArray(value, fallback = []) {
  const arr = toStringArray(value, []);
  if (arr.length) return arr;
  return toStringArray(fallback, []);
}

function mergeAiCard(baseCard = {}, aiCard = {}) {
  const src = aiCard && typeof aiCard === "object" ? aiCard : {};
  const fallbackFields = [];
  const pickField = (field, minLength) => {
    const picked = preferTextWithFallback(src[field], baseCard[field], minLength, field);
    if (picked.fallbackUsed) fallbackFields.push(field);
    return picked.value;
  };

  return {
    ...baseCard,
    order: Number(baseCard.order || 0),
    planetId: text(baseCard.planetId),
    planetKo: text(baseCard.planetKo),
    planetEn: text(baseCard.planetEn),
    planetSymbol: text(baseCard.planetSymbol),
    planetTitle: text(baseCard.planetTitle),
    layer: text(baseCard.layer),
    orientation: text(baseCard.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright",
    cardNameKo: text(baseCard.cardNameKo),
    cardNameEn: text(baseCard.cardNameEn),
    tarotKeywords: preferArray(src.tarotKeywords, baseCard.tarotKeywords),
    planetKeywords: preferArray(src.planetKeywords, baseCard.planetKeywords),
    cardMeaning: pickField("cardMeaning", 20),
    planetMeaning: pickField("planetMeaning", 20),
    archetypeReading: pickField("archetypeReading", 120),
    consciousMessage: pickField("consciousMessage", 90),
    unconsciousPattern: pickField("unconsciousPattern", 90),
    shadowWarning: pickField("shadowWarning", 90),
    soulLesson: pickField("soulLesson", 90),
    integrationPractice: pickField("integrationPractice", 90),
    _aiFallbackFields: fallbackFields,
  };
}

function mergeAiSummary(baseSummary = {}, aiSummary = {}) {
  const src = aiSummary && typeof aiSummary === "object" ? aiSummary : {};
  const baseMatrix = baseSummary.insightMatrix && typeof baseSummary.insightMatrix === "object" ? baseSummary.insightMatrix : {};
  const srcMatrix = src.insightMatrix && typeof src.insightMatrix === "object" ? src.insightMatrix : {};
  return {
    ...baseSummary,
    overallTheme: preferText(src.overallTheme, baseSummary.overallTheme, 350),
    strongestPlanetSignal: preferText(src.strongestPlanetSignal, baseSummary.strongestPlanetSignal, 30),
    deepestShadow: preferText(src.deepestShadow, baseSummary.deepestShadow, 40),
    soulLesson: preferText(src.soulLesson, baseSummary.soulLesson, 40),
    integrationPath: preferText(src.integrationPath, baseSummary.integrationPath, 40),
    dominantLayer: text(src.dominantLayer || baseSummary.dominantLayer),
    dominantSuit: text(src.dominantSuit || baseSummary.dominantSuit),
    majorArcanaRatio: text(src.majorArcanaRatio || baseSummary.majorArcanaRatio),
    planetHighlights: preferArray(src.planetHighlights, baseSummary.planetHighlights),
    practices: preferArray(src.practices, baseSummary.practices),
    ritualPlan: preferArray(src.ritualPlan, baseSummary.ritualPlan),
    finalOracle: preferText(src.finalOracle, baseSummary.finalOracle, 120),
    insightMatrix: {
      love: preferText(srcMatrix.love, baseMatrix.love, 40),
      work: preferText(srcMatrix.work, baseMatrix.work, 40),
      money: preferText(srcMatrix.money, baseMatrix.money, 40),
      health: preferText(srcMatrix.health, baseMatrix.health, 40),
    },
    closingFortune: normalizeClosingFortune(src.closingFortune, baseSummary.closingFortune),
  };
}

function normalizeAiReadingCandidate(candidate, baseReading, model = "", provider = "") {
  const root = candidate && typeof candidate === "object" ? candidate : {};
  const src = root.result && typeof root.result === "object"
    ? root.result
    : root.reading && typeof root.reading === "object"
      ? root.reading
      : root;
  const srcCards = Array.isArray(src.cards) ? src.cards : [];
  const cards = (Array.isArray(baseReading.cards) ? baseReading.cards : []).map((baseCard, idx) => mergeAiCard(baseCard, srcCards[idx] || {}));
  if (cards.length !== 11) return null;

  const aiPartialFallbackFields = cards.flatMap((card) => (
    Array.isArray(card._aiFallbackFields) && card._aiFallbackFields.length
      ? card._aiFallbackFields.map((field) => String(card.order || "?") + ":" + field)
      : []
  ));
  const cleanedCards = cards.map(({ _aiFallbackFields, ...card }) => card);

  return {
    ...baseReading,
    spreadName: text(src.spreadName || baseReading.spreadName || "천체의 선율 타로"),
    generatedAt: text(src.generatedAt || baseReading.generatedAt || toIso(Date.now())),
    cards: cleanedCards,
    summary: mergeAiSummary(baseReading.summary || {}, src.summary || {}),
    payment: baseReading.payment || {},
    meta: {
      ...(baseReading.meta && typeof baseReading.meta === "object" ? baseReading.meta : {}),
      ...(src.meta && typeof src.meta === "object" ? src.meta : {}),
      apiUsed: true,
      aiSchema: "celestial-harmony-json-v1",
      aiModel: model,
      aiProvider: provider,
      aiPartialFallbackFields,
    },
  };
}

async function enrichCelestialReading(env, reading, goldenCard) {
  const prompt = buildCelestialHarmonyPrompt(reading, goldenCard);

  const ai = await callGeminiText(env, prompt, {
    model: firstEnvText(env, ["CELESTIAL_HARMONY_GEMINI_MODEL", "GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"]),
    temperature: boundedNumber(env.CELESTIAL_HARMONY_TEMPERATURE, 0.68, 0.2, 1),
    // 11카드 구조화 JSON(~1.2만~2만자, 한국어 1자≈1~1.5토큰) — 구 기본 10000은 상시 잘려
    // AI 보강이 침묵 폴백(json_parse_failed)으로 빠졌다.
    maxOutputTokens: boundedNumber(env.CELESTIAL_HARMONY_MAX_OUTPUT_TOKENS, 24000, 4096, 32000),
    timeoutMs: boundedNumber(env.CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS, 35000, 5000, 90000),
    // 🔴 게이트가 없으면 짧은 폴백 JSON이 부분 파싱돼 base 필드로 11카드를 채우고도
    // apiUsed:true 로 나간다(= 거의 0% AI 콘텐츠가 "AI 보강됨"으로 표시). 목표 분량
    // 하한 12,000자 × 0.4. 미달이면 아래 !ai.ok 경로로 내려가 정직한 로컬 리딩
    // (apiUsed:false + aiFallbackReason)이 대신한다.
    fallbackMinChars: 4800,
    // 결정적 입력(출생차트+카드) → 캐시 + in-flight dedup으로 중복 과금 방지
    cache: {
      store: createLlmCacheStore(env),
      deterministic: true,
      ttlSeconds: 30 * 24 * 60 * 60,
      keyExtra: "celestial-harmony-v1",
    },
  });

  if (!ai.ok) {
    return {
      used: false,
      message: ai.message || "",
      result: {
        ...reading,
        meta: {
          ...(reading.meta && typeof reading.meta === "object" ? reading.meta : {}),
          apiUsed: false,
          aiSchema: "celestial-harmony-local-fallback",
          aiFallbackReason: text(ai.message || ai.error || "llm_failed"),
        },
      },
    };
  }

  const parsed = extractJsonObject(ai.text);
  const provider = text(ai.provider || "gemini");
  const merged = parsed ? normalizeAiReadingCandidate(parsed, reading, text(ai.model), provider) : null;
  if (merged) return { used: true, result: merged, model: text(ai.model), provider };

  return {
    used: false,
    message: parsed ? "schema_invalid" : "json_parse_failed",
    result: {
      ...reading,
      meta: {
        ...(reading.meta && typeof reading.meta === "object" ? reading.meta : {}),
        apiUsed: false,
        aiSchema: "celestial-harmony-local-fallback",
        aiModel: text(ai.model),
        aiProvider: provider,
        aiFallbackReason: parsed ? "schema_invalid" : "json_parse_failed",
      },
    },
    model: text(ai.model),
    provider,
  };
}

async function handleGenerate(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, code: "UNAUTHORIZED", message: "로그인 후 천체의 선율 타로를 이용해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const paymentEvidence = extractPaymentEvidence(body);
  const reportId = paymentEvidence.reportId;
  const transactionId = paymentEvidence.transactionId;
  const requestId = paymentEvidence.requestId || text(body?.requestId || body?.payment?.requestId);
  const sessionId = paymentEvidence.sessionId || text(body?.sessionId || body?.reportSessionId || body?.payment?.sessionId || body?.payment?.reportSessionId);
  const restoredFromPaidSession = Boolean(body?.restoredFromPaidSession || body?.payment?.restoredFromPaidSession);
  const premiumAccessToken = text(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );

  const access = await verifyCelestialAccess({
    request,
    env,
    auth,
    body,
    reportId,
    transactionId,
    premiumAccessToken,
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
      message: status === 401 ? "로그인 후 천체의 선율 타로를 이용해 주세요." : "결제 확인이 필요합니다.",
      detail: {
        reason: text(access?.reason || access?.code || ""),
        accessType: text(access?.accessType || ""),
        requiredFeatureKey: CELESTIAL_FEATURE_KEY,
        reportType: CELESTIAL_REPORT_TYPE,
      },
    }, { status });
  }

  if (!cards.length) {
    const fromDb = await readCelestialArchive(env, auth.userId, { reportId, transactionId, requestId, sessionId });
    const restored = fromDb || restorePaidCelestialSession(reportId || transactionId || requestId || sessionId);
    if (restored) {
      return json({ ok: true, source: "restored", result: restored });
    }
    return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
  }

  const local = buildCelestialMelodyReading({
    cards,
    payment: {
      coinCharged: Boolean(body?.coinCharged !== false || access?.accessType),
      transactionId,
      reportId,
      requestId,
      sessionId,
      reportSessionId: sessionId,
      featureKey: CELESTIAL_FEATURE_KEY,
      reportType: CELESTIAL_REPORT_TYPE,
      cost: CELESTIAL_COST,
      purchaseId: text(body?.purchaseId || paymentEvidence.purchaseId || transactionId),
      restoredFromPaidSession,
      accessType: text(access?.accessType),
      apiUsed: false,
    },
    version: CELESTIAL_RESULT_VERSION,
  });

  const reading = local.reading;
  const ai = await enrichCelestialReading(env, reading, body?.goldenCard || null);
  const enrichedReading = ai.used && ai.result ? ai.result : reading;

  const normalized = normalizeResultSchema(enrichedReading, {
    seedCards: cards,
    payment: {
      reportId,
      transactionId,
      requestId,
      sessionId,
      reportSessionId: sessionId,
      featureKey: CELESTIAL_FEATURE_KEY,
      reportType: CELESTIAL_REPORT_TYPE,
      cost: CELESTIAL_COST,
      accessType: text(access?.accessType || ""),
      purchaseId: text(body?.purchaseId || paymentEvidence.purchaseId || transactionId),
    },
  });

  if (!Array.isArray(normalized.cards) || normalized.cards.length !== 11) {
    return json({
      ok: false,
      code: "RESULT_SCHEMA_INVALID",
      message: "리딩 결과 형식이 올바르지 않습니다. 관리자 확인이 필요합니다.",
      detail: { reason: "cards-length" },
    }, { status: 500 });
  }

  if (reportId) cacheSet(`report:${reportId}`, normalized);
  if (transactionId) cacheSet(`tx:${transactionId}`, normalized);
  if (requestId) cacheSet(`req:${requestId}`, normalized);
  if (sessionId) cacheSet(`session:${sessionId}`, normalized);

  // Browser local restore helper (no-op on worker runtime).
  persistCelestialSession(normalized);

  let archiveSaved = true;
  let archiveWarning = "";
  try {
    await writeCelestialArchive(env, auth.userId, {
      reportId,
      transactionId,
      requestId,
      sessionId,
      reportSessionId: sessionId,
      purchaseId: text(body?.purchaseId || paymentEvidence.purchaseId || transactionId),
    }, normalized);
  } catch (archiveError) {
    archiveSaved = false;
    archiveWarning = text(archiveError?.message || "archive-save-failed");
  }

  return json({
    ok: true,
    source: ai.used ? `local+${text(ai.provider || "workers-ai")}` : "local",
    quality: local.quality,
    archiveSaved,
    archiveWarning: archiveSaved ? "" : archiveWarning,
    result: normalized,
  });
}

async function handleRestore(request, env) {
  const url = new URL(request.url);
  const reportId = text(url.searchParams.get("reportId"));
  const transactionId = text(url.searchParams.get("transactionId"));
  const requestId = text(url.searchParams.get("requestId"));
  const sessionId = text(url.searchParams.get("sessionId"));

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, code: "UNAUTHORIZED", message: "로그인 후 결과 복구가 가능합니다." }, { status: 401 });
    }
    throw error;
  }

  const access = await verifyCelestialAccess({
    request,
    env,
    auth,
    body: {
      featureKey: CELESTIAL_FEATURE_KEY,
      reportType: CELESTIAL_REPORT_TYPE,
      reportId,
      transactionId,
      requestId,
      sessionId,
      reportSessionId: sessionId,
      payment: {
        featureKey: CELESTIAL_FEATURE_KEY,
        reportType: CELESTIAL_REPORT_TYPE,
        reportId,
        transactionId,
        requestId,
        sessionId,
        reportSessionId: sessionId,
        cost: CELESTIAL_COST,
      },
    },
    reportId,
    transactionId,
    premiumAccessToken: text(request.headers.get("x-premium-access-token") || cookieValue(request, "cd_premium_access") || ""),
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      code: access?.code || "PAYMENT_REQUIRED",
      message: status === 401
        ? "로그인 후 결과 복구가 가능합니다."
        : "결제 확인이 필요합니다.",
      detail: {
        reason: text(access?.reason || access?.code || ""),
        accessType: text(access?.accessType || ""),
        requiredFeatureKey: CELESTIAL_FEATURE_KEY,
        reportType: CELESTIAL_REPORT_TYPE,
      },
    }, { status });
  }

  const byReport = reportId ? cacheGet(`report:${reportId}`) : null;
  const byTx = !byReport && transactionId ? cacheGet(`tx:${transactionId}`) : null;
  const byRequest = !byReport && !byTx && requestId ? cacheGet(`req:${requestId}`) : null;
  const bySession = !byReport && !byTx && !byRequest && sessionId ? cacheGet(`session:${sessionId}`) : null;
  const byDb = !byReport && !byTx && !byRequest && !bySession
    ? await readCelestialArchive(env, auth.userId, { reportId, transactionId, requestId, sessionId })
    : null;
  const restored = byReport || byTx || byRequest || bySession || byDb || restorePaidCelestialSession(reportId || transactionId || requestId || sessionId);

  if (!restored) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "복구 가능한 리딩이 없습니다." }, { status: 404 });
  }

  const normalized = normalizeResultSchema(restored, {
    payment: {
      reportId,
      transactionId,
      requestId,
      sessionId,
      reportSessionId: sessionId,
      featureKey: CELESTIAL_FEATURE_KEY,
      reportType: CELESTIAL_REPORT_TYPE,
      cost: CELESTIAL_COST,
      accessType: text(access?.accessType || ""),
    },
  });
  return json({ ok: true, source: "restore", result: normalized });
}

export async function handleCelestialHarmonyRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (!["GET", "POST"].includes(method)) return methodNotAllowed();

    const path = getRoutePath(request, "/api/celestial-harmony");
    if (path !== "/") return notFound();

    if (method === "GET") return await handleRestore(request, env);
    return await handleGenerate(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
