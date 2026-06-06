import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, cookieValue } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildCelestialMelodyReading,
  persistCelestialSession,
  restorePaidCelestialSession,
  sanitizeCelestialMelodyText,
} from "../../lib/tarot/celestial-melody-reading.mjs";

const SESSION_CACHE = new Map();
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
  SESSION_CACHE.set(token, { value, savedAt: Date.now() });
}

function cacheGet(key) {
  const token = text(key);
  if (!token) return null;
  const hit = SESSION_CACHE.get(token);
  if (!hit) return null;
  if (Date.now() - Number(hit.savedAt || 0) > 1000 * 60 * 60 * 12) {
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
      "질문축=" + text(card?.planetTitle || ""),
      "행성=" + text(card?.planetKo || card?.planetName || ""),
      "행성원형=" + text(card?.planetMeaning || ""),
      "카드키워드=" + toStringArray(card?.tarotKeywords, []).join(", "),
      "의미=" + text(card?.cardMeaning || ""),
      "원형 해석=" + text(card?.archetypeReading || ""),
      "의식 메시지=" + text(card?.consciousMessage || ""),
      "무의식 패턴=" + text(card?.unconsciousPattern || ""),
      "그림자 경고=" + text(card?.shadowWarning || ""),
      "영혼 과제=" + text(card?.soulLesson || ""),
      "실천=" + text(card?.integrationPractice || "")
    ].join(" | ");
  });
  const golden = goldenCard && typeof goldenCard === "object" ? goldenCard : {};
  const goldenLine = text(golden.n || golden.nameKo || golden.cardNameKo || golden.name || "")
    ? `${text(golden.r || golden.code || "")} ${text(golden.n || golden.nameKo || golden.cardNameKo || golden.name || "")} ${text(golden.en || golden.nameEn || "")}`
    : "없음";

  return [
    "당신은 행성의 목소리와 타로 상징을 하나의 선율로 엮는 전문 오라클 리더입니다.",
    "서비스명은 '천체의 선율 타로'입니다. 행성 11포지션과 타로 카드를 1:1로 결합해 각 행성의 질문, 그림자, 현실 조율이 살아 있는 리딩을 작성합니다.",
    "반드시 한국어 한글로만 작성하세요. 문체는 전문적이고 신비로우며, 사용자를 불안하게 만들지 않고 실천 가능한 방향을 줍니다.",
    "의료, 법률, 투자 확정 판단처럼 위험한 단정은 하지 마세요. 운명을 고정하지 말고 선택 가능성과 자기조율을 중심으로 말하세요.",
    "출력은 설명 없는 유효한 JSON 객체 하나만 반환하세요. 마크다운 코드블록을 쓰지 마세요.",
    "JSON 스키마:",
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
        cardMeaning: "카드 핵심 의미 1~2문장",
        planetMeaning: "행성 원형 의미 1~2문장",
        archetypeReading: "행성 자리와 카드가 결합된 심층 해석 4~6문장",
        consciousMessage: "의식 차원의 메시지 3~5문장",
        unconsciousPattern: "무의식 반복 패턴 3~5문장",
        shadowWarning: "그림자 경고와 조율법 3~5문장",
        soulLesson: "영혼 과제 3~5문장",
        integrationPractice: "오늘 실행할 수 있는 조율 의식 3~5문장"
      }],
      summary: {
        overallTheme: "전체 11장 흐름을 엮은 풍부한 종합 리딩",
        strongestPlanetSignal: "가장 강한 행성 신호",
        deepestShadow: "가장 깊은 그림자",
        soulLesson: "핵심 영혼 과제",
        integrationPath: "현실 통합 경로",
        dominantLayer: "conscious|unconscious|soul|shadow|integration",
        dominantSuit: "major|wands|cups|swords|pentacles",
        majorArcanaRatio: "예: 7/11",
        planetHighlights: ["행성별 핵심 신호"],
        practices: ["실천 목록"],
        ritualPlan: ["7일 의식 플랜"],
        insightMatrix: {
          love: "관계 해석",
          work: "일/성과 해석",
          money: "돈/자원 해석",
          health: "회복/컨디션 해석"
        },
        finalOracle: "황금 카드까지 통합한 마지막 오라클"
      }
    }),
    "작성 조건:",
    "1) cards는 정확히 11개이며 입력 순서와 행성명을 유지합니다.",
    "2) 각 cards 항목은 카드 하나를 건너뛰지 말고 행성 질문축, 카드 정/역방향, 심리 패턴, 그림자, 실천을 모두 반영합니다.",
    "3) summary.overallTheme은 전체 흐름을 충분히 엮고, finalOracle은 황금 카드까지 반영해 한 편의 완성된 오라클처럼 씁니다.",
    "4) planetHighlights, practices, ritualPlan은 사용자가 바로 실행할 수 있는 작은 조율 의식으로 구체화합니다.",
    "황금 통합 카드=" + goldenLine,
    "dominantLayer=" + (summary?.dominantLayer || ""),
    "strongestPlanetSignal=" + (summary?.strongestPlanetSignal || ""),
    "deepestShadow=" + (summary?.deepestShadow || ""),
    "soulLesson=" + (summary?.soulLesson || ""),
    "integrationPath=" + (summary?.integrationPath || ""),
    "cards=" + cardLines.join("\n")
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

function preferArray(value, fallback = []) {
  const arr = toStringArray(value, []);
  if (arr.length) return arr;
  return toStringArray(fallback, []);
}

function mergeAiCard(baseCard = {}, aiCard = {}) {
  const src = aiCard && typeof aiCard === "object" ? aiCard : {};
  const orientation = text(src.orientation || baseCard.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
  return {
    ...baseCard,
    order: Number(src.order || baseCard.order || 0) || baseCard.order,
    planetId: text(src.planetId || baseCard.planetId),
    planetKo: text(src.planetKo || baseCard.planetKo),
    planetEn: text(src.planetEn || baseCard.planetEn),
    planetSymbol: text(src.planetSymbol || baseCard.planetSymbol),
    planetTitle: text(src.planetTitle || baseCard.planetTitle),
    layer: text(src.layer || baseCard.layer),
    orientation,
    cardNameKo: text(src.cardNameKo || baseCard.cardNameKo),
    cardNameEn: text(src.cardNameEn || baseCard.cardNameEn),
    tarotKeywords: preferArray(src.tarotKeywords, baseCard.tarotKeywords),
    planetKeywords: preferArray(src.planetKeywords, baseCard.planetKeywords),
    cardMeaning: preferText(src.cardMeaning, baseCard.cardMeaning, 20),
    planetMeaning: preferText(src.planetMeaning, baseCard.planetMeaning, 20),
    archetypeReading: preferText(src.archetypeReading, baseCard.archetypeReading, 120),
    consciousMessage: preferText(src.consciousMessage, baseCard.consciousMessage, 90),
    unconsciousPattern: preferText(src.unconsciousPattern, baseCard.unconsciousPattern, 90),
    shadowWarning: preferText(src.shadowWarning, baseCard.shadowWarning, 90),
    soulLesson: preferText(src.soulLesson, baseCard.soulLesson, 90),
    integrationPractice: preferText(src.integrationPractice, baseCard.integrationPractice, 90),
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
  };
}

function normalizeAiReadingCandidate(candidate, baseReading, model = "") {
  const root = candidate && typeof candidate === "object" ? candidate : {};
  const src = root.result && typeof root.result === "object"
    ? root.result
    : root.reading && typeof root.reading === "object"
      ? root.reading
      : root;
  const srcCards = Array.isArray(src.cards) ? src.cards : [];
  const cards = (Array.isArray(baseReading.cards) ? baseReading.cards : []).map((baseCard, idx) => mergeAiCard(baseCard, srcCards[idx] || {}));
  if (cards.length !== 11) return null;
  return {
    ...baseReading,
    spreadName: text(src.spreadName || baseReading.spreadName || "천체의 선율 타로"),
    generatedAt: text(src.generatedAt || baseReading.generatedAt || toIso(Date.now())),
    cards,
    summary: mergeAiSummary(baseReading.summary || {}, src.summary || {}),
    payment: baseReading.payment || {},
    meta: {
      ...(baseReading.meta && typeof baseReading.meta === "object" ? baseReading.meta : {}),
      ...(src.meta && typeof src.meta === "object" ? src.meta : {}),
      apiUsed: true,
      aiSchema: "celestial-harmony-json-v1",
      aiModel: model,
    },
  };
}

async function enrichCelestialReading(env, reading, goldenCard) {
  const prompt = buildCelestialHarmonyPrompt(reading, goldenCard);

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["CELESTIAL_HARMONY_GEMINI_MODEL", "GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"],
    temperature: 0.72,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS || 22000),
  });

  if (!ai.ok) return { used: false, message: ai.message || "" };
  const parsed = extractJsonObject(ai.text);
  const merged = parsed ? normalizeAiReadingCandidate(parsed, reading, text(ai.model)) : null;
  if (merged) return { used: true, result: merged, model: text(ai.model) };

  const finalOracle = sanitizeCelestialMelodyText(ai.text);
  if (!finalOracle) return { used: false, message: "" };
  return {
    used: true,
    result: {
      ...reading,
      summary: {
        ...reading.summary,
        finalOracle,
      },
      meta: {
        ...(reading.meta && typeof reading.meta === "object" ? reading.meta : {}),
        apiUsed: true,
        aiSchema: "celestial-harmony-text-fallback",
        aiModel: text(ai.model),
      },
    },
    model: text(ai.model),
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
    source: ai.used ? "local+gemini-json" : "local",
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

