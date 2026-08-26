import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { connectDb, withMongoRetry } from "../lib/db.js";
import { PaidExecutionRecord } from "../lib/models.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";
import {
  getWarningCardGuard,
  guardWarningTarotSection,
  guardWarningTarotText,
} from "../../lib/tarot/warning-card-guard.mjs";
import { buildMindscanReadingPayload } from "../../lib/tarot/mindscan-reading.mjs";
import { buildCrystalSoulV3Reading } from "../../lib/tarot/crystal-soul-reading.mjs";
import { buildLoveConsultingHighlights, normalizeLoveReadingPayload } from "../../lib/tarot/love-reading-normalizer.mjs";
import { enhanceLoveReadingWithLlm } from "../../lib/tarot/love-reading-llm.mjs";
import {
  generateOracleConsultation,
  resolveOracleConsultationTargetChars,
  validateOracleConsultationInput,
} from "../../lib/tarot/oracle-consultation.mjs";
import { resolveOracleConsultationTier } from "../../lib/tarot/oracle-consultation-pricing.mjs";
import {
  buildPremiumYearReading,
  drawPremiumYearCards,
  validatePremiumYearReading,
} from "../../lib/tarot/tarot-year-premium.mjs";
import { expectedCardCount, listSpreadIds, normalizeSpreadType, getSpreadDefinition } from "../../lib/tarot/spreads.mjs";
import {
  buildFallbackInterpretation,
  buildNumerologyContext,
  normalizeCardInput,
  normalizeTopic,
  selectCards,
} from "../../lib/tarot/numerology-tarot.mjs";
import {
  TarotInterpretationError,
  buildConsultingHighlights,
  buildLegacyReadingPayload,
  drawTarotCardsForSpread,
  getMeaningByQuestion,
  inferQuestionType,
  interpretTarotReading,
  normalizeDrawnCardsForSpread,
} from "../../lib/tarot/tarot-interpretation-engine.mjs";

function asText(value) {
  return String(value || "").trim();
}

const NUMEROLOGY_TAROT_READING_FEATURE_KEY = "tarot-numerology-reading";
const NUMEROLOGY_TAROT_READING_MIN_COST = 30;
// 🔴 타로 오라클 상담은 단일 키·단일 가격이 아니다. 카드 수 구간마다 서비스키가 갈리고,
//    그 매핑은 verifyOracleConsultationAccess 가 제출된 카드 수에서 직접 역산한다
//    (lib/tarot/oracle-consultation-pricing.mjs). 여기에 상수를 되살리지 말 것 —
//    되살리는 순간 ₩3,000 티어로 결제하고 14장을 제출하는 경로가 열린다.
const IJIK_READING_FEATURE_KEY = "tarot-ijik";
const IJIK_READING_MIN_COST = 50;
const IJIK_READING_CARD_COUNT = 7;
const CRYSTAL_SOUL_FEATURE_KEY = "tarot-crystal-soul-reading";
const CRYSTAL_SOUL_MIN_COST = 50;
const MINDSCAN_FEATURE_KEY = "tarot-mindscan";
const MINDSCAN_MIN_COST = 50;
const YEAR_TAROT_FEATURE_KEY = "tarot-year-fortune";
const YEAR_TAROT_PROFILE_PREFIX = "year:";
const YEAR_TAROT_RESULT_PREFIX = "tarot-year-result:";
// 🔴 이 경로의 요청은 이미 결제를 마쳤다. admission 슬롯을 2.5초 안에 못 받아 503 을 내는 것보다
// 상한(db.js clampTimeoutMs 5000)까지 기다리는 편이 무조건 낫다 — MongoOperationOverloadedError 는
// withMongoRetry 에서 재시도 제외라(db.js) 거절이 곧바로 최종 503 이 된다.
const YEAR_TAROT_DB_OPTIONS = { admissionTimeoutMS: 5000 };

function uniqueTextValues(values = []) {
  return Array.from(new Set(values.map((value) => asText(value)).filter(Boolean)));
}

function resolveYearValue(value) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2100) return parsed;
  return new Date().getFullYear();
}

function resolveYearRequestId(body = {}, year, cards = []) {
  const explicit = uniqueTextValues([
    body?.requestId,
    body?.idempotencyKey,
    body?.payment?.requestId,
    body?._paymentContext?.requestId,
  ])[0];
  if (explicit) return explicit.slice(0, 180);
  const cardKey = cards.map((card) => `${asText(card?.cardId || card?.id)}:${asText(card?.orientation)}`).join("|");
  return `${YEAR_TAROT_FEATURE_KEY}:${year}:${cardKey}`.slice(0, 180);
}

function yearExecutionId(userId, requestId) {
  return `${YEAR_TAROT_RESULT_PREFIX}${asText(userId)}:${asText(requestId)}`.slice(0, 160);
}

function yearProfileId(year) {
  return `${YEAR_TAROT_PROFILE_PREFIX}${resolveYearValue(year)}`;
}

function yearAccessMethod(decision = {}) {
  const type = asText(decision.licenseType).toLowerCase();
  if (type.includes("month")) return "monthly";
  if (type.includes("pass") || type.includes("license")) return "pass";
  return "single";
}

function publicYearResult(record) {
  const stored = record?.result && typeof record.result === "object" ? record.result : {};
  return {
    ok: true,
    stored: true,
    resultId: asText(record?.resultId),
    year: resolveYearValue(record?.profileId?.replace(YEAR_TAROT_PROFILE_PREFIX, "")),
    cards: Array.isArray(stored.cards) ? stored.cards : [],
    reading: stored.reading || null,
    consultingHighlights: Array.isArray(stored.consultingHighlights) ? stored.consultingHighlights : [],
    engineMeta: stored.engineMeta || null,
    savedAt: record?.completedAt || record?.updatedAt || record?.createdAt || null,
  };
}

async function findYearResult({ env, userId, year, resultId = "" }) {
  await connectDb(env);
  const query = {
    userId: asText(userId),
    featureId: YEAR_TAROT_FEATURE_KEY,
    status: "completed",
  };
  if (resultId) query.resultId = asText(resultId);
  else query.profileId = yearProfileId(year);
  return withMongoRetry(env, () => PaidExecutionRecord.findOne(query)
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
    .lean(), YEAR_TAROT_DB_OPTIONS);
}

/**
 * 🔴 requestId 는 선택이 아니라 계약이다. 이 기능은 회당 결제라 "산 적이 있는가"가 아니라
 * "**이번 리딩의** 결제가 있는가"를 물어야 한다. 안 넘기면 과거 결제 하나로
 * 이후 모든 리딩이 무료가 된다.
 */
async function requireYearTarotAccess(request, env, requestId) {
  const auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  const decision = await canAccessPaidFeature(auth.userId, YEAR_TAROT_FEATURE_KEY, {
    env,
    userDoc: auth.authUserDoc,
    reason: "십이지신 천운 타로",
    // 회당 결제라 "이번 리딩의 결제"만 근거가 된다. 클라이언트는 결제와 이 요청에 같은
    // requestId 를 쓰고(sessionStorage 보존), 리딩을 마치면 지운다 — 다음 리딩은 새 키다.
    requestId,
  });
  if (!decision?.allowed) {
    return {
      ok: false,
      response: json({
        ok: false,
        code: "TAROT_YEAR_PAYMENT_REQUIRED",
        message: "십이지신 천운 타로 이용권 또는 단건 결제를 확인할 수 없습니다.",
      }, { status: 402 }),
    };
  }
  return { ok: true, auth, decision };
}

// existing 은 호출자가 이미 읽어 둔 같은 레코드다 — 여기서 다시 조회하지 않는다.
// 같은 {userId, featureId, requestId} 를 두 번 읽으면 admission 슬롯을 하나 더 먹을 뿐이고,
// 그 슬롯 하나가 결제 확인 직후 피크에서 503 을 만든다.
async function saveYearTarotResult({ env, auth, decision, payload, year, requestId, existing = null }) {
  await connectDb(env);
  const executionId = yearExecutionId(auth.userId, requestId);
  const resultId = `${YEAR_TAROT_RESULT_PREFIX}${year}:${requestId}`.slice(0, 160);

  if (existing?.status === "completed") return { status: "completed", payload: publicYearResult(existing) };
  if (existing?.status === "generating") return { status: "generating", record: existing };

  const initialResult = {
    cards: payload.cards,
    reading: payload.reading,
    consultingHighlights: payload.consultingHighlights,
    engineMeta: payload.engineMeta,
  };
  // 🔴 예전에는 status:"generating" 을 쓴 뒤 곧바로 "completed" 로 덮었는데, 두 쓰기 사이에 비동기
  // 작업이 하나도 없다(payload 는 LLM 없이 위에서 동기로 완성된다). 왕복만 두 배가 되면서, 두 번째
  // 쓰기가 실패하면 레코드가 "generating" 에 영구히 갇혀 GET /year/result(status:"completed" 필터)가
  // 계속 404 를 내는 함정까지 남겼다. 한 번의 upsert 로 곧바로 completed 를 쓴다.
  // (읽는 쪽의 "generating" 처리는 과거 레코드 호환을 위해 위에 그대로 남겨 둔다.)
  try {
    const completed = await withMongoRetry(env, () => PaidExecutionRecord.findOneAndUpdate(
      { executionId },
      {
        $setOnInsert: {
          executionId,
          requestId,
          userId: asText(auth.userId),
          featureId: YEAR_TAROT_FEATURE_KEY,
          profileId: yearProfileId(year),
          accessMode: "per_use",
          idempotencyKey: requestId,
        },
        $set: {
          status: "completed",
          accessMethod: yearAccessMethod(decision),
          amountCoins: 100,
          amountKRW: 10000,
          consumedAt: new Date(),
          completedAt: new Date(),
          resultId,
          result: initialResult,
          error: null,
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean(), YEAR_TAROT_DB_OPTIONS);
    return { status: "completed", payload: publicYearResult(completed) };
  } catch (error) {
    // 🔴 degrade-not-throw. 결제 게이트는 이미 통과했고 리딩은 카드+requestId 로부터 결정적으로
    // 계산돼 이미 손에 있다. 저장(DB 쓰기)이 실패했다고 돈을 낸 사용자에게서 결과를 빼앗지 않는다
    // — /love-reading 이 LLM 실패에 대해 쓰는 것과 같은 계약이다.
    // 보상 쓰기(status:"generation_failed")는 두지 않는다: upsert 자체가 실패한 상황이라 갱신할
    // 문서가 없고, 포화된 아이솔레이트에서 슬롯을 하나 더 요구해 원 오류를 가리기만 했다.
    console.error("[tarot] year result persist failed", JSON.stringify({
      featureKey: YEAR_TAROT_FEATURE_KEY,
      name: error?.name || "Error",
      message: String(error?.message || "").slice(0, 200),
    }));
    return {
      status: "unsaved",
      payload: {
        ok: true,
        stored: false,
        persisted: false,
        resultId,
        year: resolveYearValue(year),
        cards: Array.isArray(initialResult.cards) ? initialResult.cards : [],
        reading: initialResult.reading || null,
        consultingHighlights: Array.isArray(initialResult.consultingHighlights) ? initialResult.consultingHighlights : [],
        engineMeta: initialResult.engineMeta || null,
        savedAt: null,
      },
    };
  }
}

async function verifyNumerologyReadingAccess(request, env, body = {}) {
  let auth = null;
  let authError = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    authError = error;
  }

  if (auth?.userId) {
    // 🔴 이 호출은 관문이 아니라 지름길이다. 회당결제 키에 canAccessPaidFeature 는 원래 늘
    //    PAYMENT_REQUIRED 를 돌려주고(정본 주석: worker/lib/nakshatra-paid-access.js 상단),
    //    실제 증빙은 아래 verifyPerUsePayment 가 본다. 그래서 여기서 무엇이 터지든 결제한
    //    사용자를 막을 이유가 없다 — 증빙 조회로 그대로 넘어간다.
    //    감싸기 전에는 Mongo 로 분류되지 않는 예외 하나가 handleRouteError 에서 그대로 500 이
    //    되어, 이미 돈을 낸 사용자가 재시도 안내조차 못 받고 막다른 길에 섰다.
    let accessDecision = null;
    try {
      accessDecision = await canAccessPaidFeature(auth.userId, NUMEROLOGY_TAROT_READING_FEATURE_KEY, {
        env,
        // 인증 단계에서 이미 읽은 User 문서를 재사용한다(없으면 내부에서 종전대로 조회).
        userDoc: auth.authUserDoc,
        reason: "수비학 타로 리딩",
      });
    } catch (error) {
      // 개인정보는 남기지 않는다(featureKey·오류명만).
      console.error("[tarot] numerology entitlement precheck failed", JSON.stringify({
        featureKey: NUMEROLOGY_TAROT_READING_FEATURE_KEY,
        name: error?.name || "Error",
        message: String(error?.message || "").slice(0, 200),
      }));
    }
    if (accessDecision?.allowed) {
      return { ok: true, auth, evidence: { source: accessDecision.accessSource || accessDecision.reason || "paid_feature_access" } };
    }
  }

  if (!auth?.userId) {
    const authStatus = Number(authError?.status) || 0;
    if (authStatus === 401 || authStatus === 403) {
      return {
        ok: false,
        status: authStatus,
        code: "NUMEROLOGY_TAROT_AUTH_REQUIRED",
        message: "로그인 후 결과를 확인할 수 있습니다.",
      };
    }
    // 자격증명이 아예 오지 않은 경우 — 종전대로 로그인 안내.
    if (!authError) {
      return {
        ok: false,
        status: 401,
        code: "NUMEROLOGY_TAROT_AUTH_REQUIRED",
        message: "로그인 후 결과를 확인할 수 있습니다.",
      };
    }

    // 인증 자체가 DB 장애로 실패한 경우다. 미결제로 세탁하지 않는다.
    // 🔴 여기서 바꾼 것은 **status 가 없는 예외** 하나뿐이다. 예전 기본값 `|| 401` 이 그 경우를
    //    전부 401 로 세탁해, 결제한 로그인 사용자에게 "로그인 후 확인" 을 띄웠다 — 바로 위 주석이
    //    막겠다고 선언한 경우가 정작 그 기본값으로 새고 있었다. status 가 붙은 실패의 처리는
    //    종전 그대로다(401·403 은 로그인 안내, 그 밖의 status 는 보류).
    if (authStatus > 0 || isAuthDbInfraError(authError)) {
      return {
        ok: false,
        status: 503,
        code: "NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE",
        message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
      };
    }

    // status 도 없고 DB 인프라 오류도 아닌 인증 실패 — 종전대로 로그인 안내.
    return {
      ok: false,
      status: 401,
      code: "NUMEROLOGY_TAROT_AUTH_REQUIRED",
      message: "로그인 후 결과를 확인할 수 있습니다.",
    };
  }

  // 회당결제 증빙은 저장소 정본 헬퍼 하나로 본다.
  // 단건결제(Payment) → 코인/월정석(PointHistory) → 월정석 원장 → 이용권 → admin 순.
  // 🔴 이용권 통과는 차감 기록을 남기지 않는 정상 경로라, 기록 조회만으로 판정하면 이용권 보유자가 전원 막힌다.
  const proof = await verifyPerUsePayment(env, {
    userId: auth.userId,
    featureKey: NUMEROLOGY_TAROT_READING_FEATURE_KEY,
    coinPrice: NUMEROLOGY_TAROT_READING_MIN_COST,
    requestId: asText(body?.requestId || body?.idempotencyKey),
  });
  logPerUsePaymentProof(NUMEROLOGY_TAROT_READING_FEATURE_KEY, proof);

  if (proof.proven === true) {
    return { ok: true, auth, evidence: { source: proof.source || "per_use_payment" } };
  }

  // 🔴 DB 일시 장애를 "미결제"로 바꾸지 않는다 — 결제한 사용자를 잠그는 가장 흔한 경로다.
  if (proof.proven === null) {
    return {
      ok: false,
      status: 503,
      code: "NUMEROLOGY_TAROT_VERIFY_UNAVAILABLE",
      message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
    };
  }

  return {
    ok: false,
    status: 402,
    code: "NUMEROLOGY_TAROT_PAYMENT_NOT_VERIFIED",
    reason: proof.reason || "NO_RECORD",
    message: proof.reason === "NO_REQUEST_ID"
      ? "결제 요청 정보가 없어 확인하지 못했습니다. 결과 보기 버튼으로 다시 진행해 주세요."
      : "결제 완료 내역을 확인할 수 없습니다. 결과 보기 버튼으로 결제를 완료한 뒤 다시 시도해 주세요.",
  };
}

// 한 번의 결제(= 하나의 requestId)로 상담을 몇 번까지 생성할 수 있는가.
// 첫 생성 1회 + 사용자가 누르는 재시도 2회 + 여유 1회.
const ORACLE_CONSULTATION_RETRY_MAX = 4;
const ORACLE_CONSULTATION_RETRY_WINDOW_MS = 10 * 60 * 1000;

// 🔴 DB 가 죽었을 때는 통과시킨다(fail-open). 결제를 끝낸 사용자를 레이트리밋 인프라 장애로
// 막는 것이 과금 초과보다 나쁘다 — destiny-compass.js 의 checkRateLimit 과 같은 판단이다.
//
// 🔴 rate-limit.js 와 node:crypto 는 **지연 import** 다. 정적으로 걸면 이 파일의 모듈 그래프에
// models.js 전체(AbuseScore 포함)가 딸려 들어와, models.js 를 부분 mock 하는 다른 타로 라우트
// 테스트들이 "does not provide an export named 'AbuseScore'" 로 통째로 죽는다. 이 파일은 이미
// buildIjikReading 등을 같은 방식으로 늦게 부른다.
async function checkOracleConsultationRetryBudget(env, subject) {
  try {
    const [{ incrementRateLimit }, { createHash }] = await Promise.all([
      import("../lib/rate-limit.js"),
      import("node:crypto"),
    ]);
    const { count } = await incrementRateLimit({
      subjectHash: createHash("sha256").update(String(subject)).digest("hex"),
      endpoint: "tarot:oracle-consultation",
      windowMs: ORACLE_CONSULTATION_RETRY_WINDOW_MS,
      env,
    });
    return count <= ORACLE_CONSULTATION_RETRY_MAX;
  } catch (error) {
    console.warn("[tarot] oracle consultation retry budget check failed", String(error?.message || error).slice(0, 200));
    return true;
  }
}

// 타로 오라클 상담 — verifyNumerologyReadingAccess 와 동일한 회당결제 증빙 패턴을 그대로 따른다.
// (canAccessPaidFeature 지름길 → 로그인/인프라 오류 분기 → verifyPerUsePayment 증빙 확인)
async function verifyOracleConsultationAccess(request, env, body = {}) {
  // 🔴 지불 티어는 클라이언트가 보낸 값이 아니라 **제출된 카드 수**에서 서버가 직접 역산한다.
  //    증빙 조회(nakshatra-paid-access.js 의 findPaidPayment/findDeduction)가 featureKey
  //    완전일치라, ₩3,000 티어로 결제하고 14장을 제출하면 NO_RECORD → 402 가 자동으로 성립한다.
  //    카드 수 자체는 이 함수 앞에서 validateOracleConsultationInput 이 1~14 로 검증한다.
  const featureKey = resolveOracleConsultationTier(
    Array.isArray(body?.cards) ? body.cards.length : 0,
  ).featureKey;
  // 🔴 가격도 함께 티어를 따라가야 한다. 이 값이 canUseByPass(이용권 건당 상한 판정)로 넘어가므로
  //    옛 상수 50 을 남겨 두면 standard 이용권이 ₩10,000 짜리 14장 상담을 무료로 커버한다.
  const coinPrice = Number(FEATURE_KEY_PRICE_TABLE[featureKey]?.cost) || 0;

  let auth = null;
  let authError = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    authError = error;
  }

  if (auth?.userId) {
    let accessDecision = null;
    try {
      accessDecision = await canAccessPaidFeature(auth.userId, featureKey, {
        env,
        userDoc: auth.authUserDoc,
        reason: "타로 오라클 상담",
      });
    } catch (error) {
      console.error("[tarot] oracle consultation entitlement precheck failed", JSON.stringify({
        featureKey,
        name: error?.name || "Error",
        message: String(error?.message || "").slice(0, 200),
      }));
    }
    if (accessDecision?.allowed) {
      return { ok: true, auth, evidence: { source: accessDecision.accessSource || accessDecision.reason || "paid_feature_access" } };
    }
  }

  if (!auth?.userId) {
    const authStatus = Number(authError?.status) || 0;
    if (authStatus === 401 || authStatus === 403) {
      return { ok: false, status: authStatus, code: "ORACLE_CONSULTATION_AUTH_REQUIRED", message: "로그인 후 상담을 진행할 수 있습니다." };
    }
    if (!authError) {
      return { ok: false, status: 401, code: "ORACLE_CONSULTATION_AUTH_REQUIRED", message: "로그인 후 상담을 진행할 수 있습니다." };
    }
    if (authStatus > 0 || isAuthDbInfraError(authError)) {
      return {
        ok: false,
        status: 503,
        code: "ORACLE_CONSULTATION_VERIFY_UNAVAILABLE",
        message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
      };
    }
    return { ok: false, status: 401, code: "ORACLE_CONSULTATION_AUTH_REQUIRED", message: "로그인 후 상담을 진행할 수 있습니다." };
  }

  const proof = await verifyPerUsePayment(env, {
    userId: auth.userId,
    featureKey,
    coinPrice,
    requestId: asText(body?.requestId || body?.idempotencyKey),
  });
  logPerUsePaymentProof(featureKey, proof);

  if (proof.proven === true) {
    return { ok: true, auth, evidence: { source: proof.source || "per_use_payment" } };
  }

  if (proof.proven === null) {
    return {
      ok: false,
      status: 503,
      code: "ORACLE_CONSULTATION_VERIFY_UNAVAILABLE",
      message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
    };
  }

  return {
    ok: false,
    status: 402,
    code: "ORACLE_CONSULTATION_PAYMENT_NOT_VERIFIED",
    reason: proof.reason || "NO_RECORD",
    message: proof.reason === "NO_REQUEST_ID"
      ? "결제 요청 정보가 없어 확인하지 못했습니다. 상담 시작 버튼으로 다시 진행해 주세요."
      : "결제 완료 내역을 확인할 수 없습니다. 상담 시작 버튼으로 결제를 완료한 뒤 다시 시도해 주세요.",
  };
}

/**
 * 회당결제 증빙 확인의 매개변수화된 판정기.
 *
 * 위의 `verifyNumerologyReadingAccess` · `verifyOracleConsultationAccess` 와 **같은 순서**다
 * (canAccessPaidFeature 지름길 → 로그인/인프라 오류 분기 → verifyPerUsePayment 증빙).
 * 🔴 세 번째 사본을 만들지 않으려고 뽑았다 — 결제 증빙 로직을 라우트마다 손으로 베끼면
 *    한쪽만 고쳐졌을 때 **돈 낸 사용자가 402 를 맞는다**(월정석 증빙이 15곳으로 흩어져
 *    두 번 그렇게 깨졌다: `worker/lib/moonstone-spend-proof.js` 상단 참고).
 *    위 두 함수는 이 PR 범위 밖이라 그대로 뒀다. 다음에 손댈 때 여기로 합칠 것.
 *
 * @param {{featureKey:string, minCost:number, codePrefix:string, reason:string,
 *          authMessage:string, retryHint:string}} spec
 */
async function verifyTarotPerUseAccess(request, env, body, spec) {
  const authRequired = `${spec.codePrefix}_AUTH_REQUIRED`;
  const verifyUnavailable = `${spec.codePrefix}_VERIFY_UNAVAILABLE`;
  const notVerified = `${spec.codePrefix}_PAYMENT_NOT_VERIFIED`;

  let auth = null;
  let authError = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    authError = error;
  }

  if (auth?.userId) {
    // 관문이 아니라 지름길이다. 회당결제 키에 canAccessPaidFeature 는 원래 늘 PAYMENT_REQUIRED 를
    // 돌려주고, 실제 증빙은 아래 verifyPerUsePayment 가 본다 — 그래서 여기서 무엇이 터지든
    // 결제한 사용자를 막지 않고 증빙 조회로 넘어간다.
    let accessDecision = null;
    try {
      accessDecision = await canAccessPaidFeature(auth.userId, spec.featureKey, {
        env,
        userDoc: auth.authUserDoc,
        reason: spec.reason,
      });
    } catch (error) {
      // 개인정보는 남기지 않는다(featureKey·오류명만).
      console.error("[tarot] entitlement precheck failed", JSON.stringify({
        featureKey: spec.featureKey,
        name: error?.name || "Error",
        message: String(error?.message || "").slice(0, 200),
      }));
    }
    if (accessDecision?.allowed) {
      return { ok: true, auth, evidence: { source: accessDecision.accessSource || accessDecision.reason || "paid_feature_access" } };
    }
  }

  if (!auth?.userId) {
    const authStatus = Number(authError?.status) || 0;
    if (authStatus === 401 || authStatus === 403) {
      return { ok: false, status: authStatus, code: authRequired, message: spec.authMessage };
    }
    if (!authError) {
      return { ok: false, status: 401, code: authRequired, message: spec.authMessage };
    }
    // 🔴 인증이 DB 장애로 실패한 경우를 미결제로 세탁하지 않는다 — 503 이다.
    if (authStatus > 0 || isAuthDbInfraError(authError)) {
      return {
        ok: false,
        status: 503,
        code: verifyUnavailable,
        message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
      };
    }
    return { ok: false, status: 401, code: authRequired, message: spec.authMessage };
  }

  // 단건결제(Payment) → 코인/월정석(PointHistory) → 월정석 원장 → 이용권 → admin 순.
  // 🔴 이용권 통과는 차감 기록을 남기지 않는 정상 경로라, 기록 조회만으로 판정하면 이용권 보유자가 전원 막힌다.
  const proof = await verifyPerUsePayment(env, {
    userId: auth.userId,
    featureKey: spec.featureKey,
    coinPrice: spec.minCost,
    requestId: asText(body?.requestId || body?.idempotencyKey),
  });
  logPerUsePaymentProof(spec.featureKey, proof);

  if (proof.proven === true) {
    return { ok: true, auth, evidence: { source: proof.source || "per_use_payment" } };
  }

  // 🔴 DB 일시 장애를 "미결제"로 바꾸지 않는다 — 결제한 사용자를 잠그는 가장 흔한 경로다.
  if (proof.proven === null) {
    return {
      ok: false,
      status: 503,
      code: verifyUnavailable,
      message: "일시적인 서버 문제로 결제 확인이 지연되고 있습니다. 잠시 후 추가 결제 없이 다시 시도해 주세요.",
    };
  }

  return {
    ok: false,
    status: 402,
    code: notVerified,
    reason: proof.reason || "NO_RECORD",
    message: proof.reason === "NO_REQUEST_ID"
      ? `결제 요청 정보가 없어 확인하지 못했습니다. ${spec.retryHint}`
      : `결제 완료 내역을 확인할 수 없습니다. ${spec.retryHint}`,
  };
}

function guardNumerologyWarningInterpretation(interpretation, cards = []) {
  if (!interpretation || typeof interpretation !== "object") return interpretation;

  const guardSections = (sections) => (Array.isArray(sections)
    ? sections.map((section, idx) => {
      const entry = cards[idx] || {};
      const cardLike = {
        nameKo: section?.cardNameKr || section?.cardName || entry?.card?.nameKr || entry?.nameKr,
        nameEn: section?.cardNameEn || entry?.card?.name || entry?.name,
        name: section?.cardNameEn || section?.cardNameKr || section?.cardName || entry?.card?.name || entry?.name,
      };
      return guardWarningTarotSection(section, cardLike);
    })
    : sections);

  return {
    ...interpretation,
    cardReadings: guardSections(interpretation.cardReadings),
    // UI 는 cards[] 를 우선 렌더한다. 여기를 빼면 경고 카드 순화가 화면에서 무력화된다.
    cards: guardSections(interpretation.cards),
  };
}

function getWarningGuardFromSections(sections = []) {
  if (!Array.isArray(sections)) return null;
  for (const section of sections) {
    const guard = getWarningCardGuard(section);
    if (guard) return guard;
  }
  return null;
}

function guardCrystalSoulReadingData(readingData) {
  const warningGuard = getWarningGuardFromSections(readingData?.sections);
  if (!warningGuard || !readingData || typeof readingData !== "object") return readingData;
  return {
    ...readingData,
    sections: Array.isArray(readingData.sections)
      ? readingData.sections.map((section) => guardWarningTarotSection(section, section))
      : readingData.sections,
    summary: guardWarningTarotSection(readingData.summary, warningGuard),
    masterChapters: Array.isArray(readingData.masterChapters)
      ? readingData.masterChapters.map((chapter) => guardWarningTarotSection(chapter, warningGuard))
      : readingData.masterChapters,
  };
}

const CRYSTAL_MEANINGS = {
  "tigers-eye": {
    id: "tigers-eye",
    nameKo: "호안석",
    nameEn: "Tiger's Eye",
    categoryAffinity: ["wealth", "career", "move"],
    keywords: ["결단", "보호", "현실 판단", "사업 감각"],
    meaning: "감정 과열을 낮추고 흔들린 판단을 기준의 빛으로 가라앉히는 원석입니다.",
    adviceTone: "기준을 정하고 실행",
    cautionTone: "승부욕 과열 경계",
  },
  "rose-quartz": {
    id: "rose-quartz",
    nameKo: "로즈 쿼츠",
    nameEn: "Rose Quartz",
    categoryAffinity: ["love", "reunion", "relation"],
    keywords: ["애정", "치유", "수용", "관계 회복"],
    meaning: "자기방어로 굳은 감정을 부드럽게 풀고 대화의 온도를 회복시키는 원석입니다.",
    adviceTone: "감정 표현의 진정성",
    cautionTone: "감정 의존 경계",
  },
  amethyst: {
    id: "amethyst",
    nameKo: "애머지스트",
    nameEn: "Amethyst",
    categoryAffinity: ["reunion", "health", "relation"],
    keywords: ["통찰", "정화", "직관", "균형"],
    meaning: "복잡한 감정과 생각을 정리해 핵심 진실을 보게 하는 원석입니다.",
    adviceTone: "본질 파악 후 행동",
    cautionTone: "고립적 판단 경계",
  },
  citrine: {
    id: "citrine",
    nameKo: "시트린",
    nameEn: "Citrine",
    categoryAffinity: ["wealth", "move", "health"],
    keywords: ["풍요", "활력", "자기표현", "기회"],
    meaning: "작은 활력을 깨워 기회와 자신감의 빛을 다시 밝히는 원석입니다.",
    adviceTone: "작은 실행의 축적",
    cautionTone: "낙관 과신 경계",
  },
  lapis: {
    id: "lapis",
    nameKo: "라피스 라줄리",
    nameEn: "Lapis Lazuli",
    categoryAffinity: ["wealth", "career", "move"],
    keywords: ["통찰", "전략", "진실", "판단력"],
    meaning: "겉으로 보이지 않는 패턴을 읽어 장기 전략으로 연결하게 돕는 원석입니다.",
    adviceTone: "구조를 읽는 전략",
    cautionTone: "분석 마비 경계",
  },
  "black-tourmaline": {
    id: "black-tourmaline",
    nameKo: "블랙 토르말린",
    nameEn: "Black Tourmaline",
    categoryAffinity: ["relation", "health", "move"],
    keywords: ["보호", "경계", "정리", "차단"],
    meaning: "불필요한 소모와 외부 잡음을 걸러내 관계와 에너지 경계를 세우게 하는 원석입니다.",
    adviceTone: "경계 설정과 정리",
    cautionTone: "과도한 단절 경계",
  },
  "green-fluorite": {
    id: "green-fluorite",
    nameKo: "그린 플로라이트",
    nameEn: "Green Fluorite",
    categoryAffinity: ["career", "health", "wealth"],
    keywords: ["정리", "균형", "회복", "판단 정돈"],
    meaning: "흩어진 선택지를 구조화해 우선순위를 세우고 회복 루틴을 만들게 하는 원석입니다.",
    adviceTone: "정돈 후 집중 실행",
    cautionTone: "과도한 검토 지연 경계",
  },
};

const CRYSTAL_BY_NAME = Object.values(CRYSTAL_MEANINGS).reduce((acc, item) => {
  acc[item.nameKo] = item;
  return acc;
}, {});

const CATEGORY_DEFS = {
  overall: {
    id: "overall",
    name: "전체 흐름 · 오늘의 메시지",
    spread: [
      { order: 1, title: "오늘의 핵심 기운", question: "오늘 가장 먼저 느껴야 할 흐름은 무엇인가?" },
      { order: 2, title: "지금 눈앞의 주제", question: "지금 즉시 다뤄야 할 중심 문제는 무엇인가?" },
      { order: 3, title: "흐름을 막는 요소", question: "에너지 흐름을 흔드는 변수는 무엇인가?" },
      { order: 4, title: "오늘의 선택", question: "오늘 어떤 태도와 선택이 도움이 되는가?" },
      { order: 5, title: "마무리 메시지", question: "오늘의 흐름이 남기는 최종 메시지는 무엇인가?" },
    ],
    focus: "전체 흐름, 방향 전환, 오늘의 우선순위를 한 번에 정리합니다.",
  },
  wealth: {
    id: "wealth",
    name: "재물 · 사업",
    spread: [
      { order: 1, title: "현재 재물운", question: "지금 돈과 사업의 흐름은 어떤 상태인가?" },
      { order: 2, title: "기회·가능성", question: "어디에서 수익과 성장의 기회가 열리는가?" },
      { order: 3, title: "방해 요소", question: "돈의 흐름을 막는 습관이나 외부 변수는 무엇인가?" },
      { order: 4, title: "조언의 방향", question: "현실적으로 어떤 선택을 해야 하는가?" },
      { order: 5, title: "최종 결과", question: "이 흐름이 어떤 재물·사업 결과로 이어질 가능성이 큰가?" },
    ],
    focus: "수익 구조, 지출, 계약, 경쟁, 리스크를 숫자 기반 실행으로 연결합니다.",
  },
  love: {
    id: "love",
    name: "연애 · 감정",
    spread: [
      { order: 1, title: "현재 감정 상태", question: "내 마음 또는 관계의 감정 온도는 어떤가?" },
      { order: 2, title: "상대 또는 인연의 기류", question: "상대나 인연의 에너지는 어떻게 흐르는가?" },
      { order: 3, title: "감정의 방해 요소", question: "사랑을 어렵게 만드는 내면의 패턴은 무엇인가?" },
      { order: 4, title: "마음의 조언", question: "지금 어떤 태도로 사랑을 바라봐야 하는가?" },
      { order: 5, title: "관계의 가능성", question: "앞으로 감정 흐름은 어디로 향하는가?" },
    ],
    focus: "끌림, 불안, 표현 방식, 관계의 균형을 감정 언어로 해석합니다.",
  },
  reunion: {
    id: "reunion",
    name: "재회 · 인연",
    spread: [
      { order: 1, title: "남아 있는 인연의 온도", question: "두 사람 사이에 아직 남은 감정은 무엇인가?" },
      { order: 2, title: "상대의 숨은 마음", question: "상대가 겉으로 드러내지 않는 속마음은 무엇인가?" },
      { order: 3, title: "재회를 막는 이유", question: "다시 이어지기 어려운 핵심 원인은 무엇인가?" },
      { order: 4, title: "다가갈 방법", question: "지금 내가 취해야 할 태도는 무엇인가?" },
      { order: 5, title: "재회 가능성", question: "이 인연은 다시 연결될 가능성이 있는가?" },
    ],
    focus: "미련, 거리감, 오해, 재접근 조건을 현실적인 소통 기준으로 정리합니다.",
  },
  move: {
    id: "move",
    name: "이동수 · 변화",
    spread: [
      { order: 1, title: "현재 변화의 기운", question: "지금 내 삶은 움직일 준비가 되어 있는가?" },
      { order: 2, title: "이동의 기회", question: "이사, 여행, 환경 변화의 좋은 흐름은 어디에 있는가?" },
      { order: 3, title: "변화를 막는 요소", question: "움직임을 지연시키는 현실적·심리적 이유는 무엇인가?" },
      { order: 4, title: "움직임의 조언", question: "지금은 기다려야 하는가, 움직여야 하는가?" },
      { order: 5, title: "변화 이후의 흐름", question: "움직인 뒤 삶은 어떤 방향으로 바뀌는가?" },
    ],
    focus: "타이밍, 준비도, 환경 변수, 이동 후 정착 전략을 함께 점검합니다.",
  },
  career: {
    id: "career",
    name: "직업 · 진로",
    spread: [
      { order: 1, title: "현재 직업운", question: "현재 일과 진로의 에너지는 어떤가?" },
      { order: 2, title: "성장 가능성", question: "어떤 방향에서 커리어 기회가 열리는가?" },
      { order: 3, title: "진로의 장애물", question: "내 직업 흐름을 막는 가장 큰 요인은 무엇인가?" },
      { order: 4, title: "선택의 조언", question: "지금 어떤 선택과 준비가 필요한가?" },
      { order: 5, title: "진로의 결과", question: "이 흐름은 어떤 커리어 결과로 이어지는가?" },
    ],
    focus: "이직, 직무 적합성, 성장 포인트, 평가 구조를 실행 계획으로 연결합니다.",
  },
  health: {
    id: "health",
    name: "건강 · 에너지",
    spread: [
      { order: 1, title: "현재 에너지 상태", question: "몸과 마음의 에너지는 어떤 상태인가?" },
      { order: 2, title: "회복 가능성", question: "어디에서 회복의 힘이 생기는가?" },
      { order: 3, title: "에너지 소모 원인", question: "나를 지치게 만드는 핵심 원인은 무엇인가?" },
      { order: 4, title: "몸과 마음의 조언", question: "지금 어떤 회복 방식이 필요한가?" },
      { order: 5, title: "회복의 흐름", question: "앞으로 에너지는 어떻게 회복될 가능성이 큰가?" },
    ],
    focus: "의료 진단이 아닌 생활 리듬, 휴식, 스트레스 조절 중심으로 안내합니다.",
  },
  relation: {
    id: "relation",
    name: "대인관계",
    spread: [
      { order: 1, title: "현재 관계의 기류", question: "주변 인간관계의 에너지는 어떤가?" },
      { order: 2, title: "도움이 되는 인연", question: "나에게 힘이 되는 사람이나 관계는 무엇인가?" },
      { order: 3, title: "갈등의 씨앗", question: "관계를 어렵게 만드는 말, 태도, 오해는 무엇인가?" },
      { order: 4, title: "관계 조율의 조언", question: "어떻게 말하고 행동해야 관계가 정리되는가?" },
      { order: 5, title: "관계의 최종 흐름", question: "이 인간관계는 어떤 방향으로 흘러갈 가능성이 큰가?" },
    ],
    focus: "신뢰, 경계, 대화 온도, 협력의 균형점을 실천 중심으로 제시합니다.",
  },
};

const CATEGORY_VOICES = {
  overall: {
    summaryLead: "오늘의 기운을 한 장으로 묶어 방향을 정리하는 흐름입니다.",
    pulse: "전체 판을 먼저 보고, 지금 가장 중요한 한 가지를 정리하는 태도가 유리합니다.",
    caution: "여러 신호를 한꺼번에 잡으려다 오히려 중심을 놓치는 것을 조심해야 합니다.",
    uplift: "원석의 안정감으로 생각을 정돈하고, 카드가 지목한 핵심만 먼저 실행하면 됩니다.",
    neo: "지금은 많이 움직이는 것보다, 제대로 고르는 것이 더 큰 힘이 됩니다.",
    youn: "당신은 이미 흐름을 느끼고 있어요. 오늘은 그 감각을 믿고 한 걸음만 또렷하게 내디디면 충분합니다.",
    action: [
      "오늘 가장 먼저 처리할 일 1개를 정하고 나머지는 뒤로 미룹니다.",
      "불안이 올라오는 순간, 결정 기준을 한 줄로 적어 다시 확인합니다.",
      "저녁 전에 실제로 실행한 행동 1개를 기록해 흐름을 남깁니다.",
    ],
    crystalHook: "전체 흐름을 정돈하고 중심을 잡는 힘",
  },
  wealth: {
    summaryLead: "재물운은 숫자와 조건을 다시 맞추는 구간입니다.",
    pulse: "지출, 계약, 수익 구조가 함께 움직이니 감정이 아니라 계산이 우선입니다.",
    caution: "확인되지 않은 제안, 즉흥 지출, 과한 기대를 동시에 조심해야 합니다.",
    uplift: "원석의 현실 감각을 빌려 수익과 비용을 분리하면 흐름이 또렷해집니다.",
    neo: "지금은 벌 수 있느냐보다, 지켜 낼 수 있느냐가 더 중요합니다.",
    youn: "당신의 판단은 충분히 섬세해요. 숫자를 적고 비교하면 마음도 함께 안정됩니다.",
    action: [
      "이번 주 들어갈 돈과 멈출 돈을 각각 한 줄씩 적습니다.",
      "제안이 오면 바로 답하지 말고 조건표를 먼저 확인합니다.",
      "수익과 비용을 분리한 메모를 남겨 선택 기준을 숫자로 바꿉니다.",
    ],
    crystalHook: "수익 구조를 보호하고 현실 판단을 돕는 힘",
  },
  love: {
    summaryLead: "연애운은 마음의 온도와 표현 방식이 핵심입니다.",
    pulse: "감정은 살아 있지만, 말하지 않은 부분이 관계의 온도를 흔들고 있습니다.",
    caution: "서운함을 마음속에만 쌓아 두거나, 반대로 급하게 확인하려는 태도를 조심하세요.",
    uplift: "원석의 부드러운 힘으로 마음을 풀고, 카드가 보여 준 속도를 존중하면 됩니다.",
    neo: "사랑은 감정을 숨기는 게임이 아니라, 필요한 말을 예쁘게 꺼내는 기술입니다.",
    youn: "당신이 먼저 부드러워지면 관계도 따라옵니다. 오늘은 따뜻한 한 문장이 회복의 시작이에요.",
    action: [
      "상대에게 보내고 싶은 말을 한 번 고쳐 읽고 짧게 정리합니다.",
      "감정 확인보다 먼저, 지금 필요한 것은 공감인지 경계인지 구분합니다.",
      "대화가 필요하면 메시지보다 먼저 시간과 분위기를 맞춥니다.",
    ],
    crystalHook: "감정을 안정시키고 관계의 온도를 회복하는 힘",
  },
  reunion: {
    summaryLead: "재회운은 미련보다 조건을 먼저 보는 흐름입니다.",
    pulse: "남은 감정은 분명하지만, 다시 가까워지기 위한 전제가 아직 정리되지 않았습니다.",
    caution: "상대의 속도와 준비를 무시한 재접근은 같은 상처를 반복할 수 있습니다.",
    uplift: "원석의 통찰로 감정과 현실을 분리하면, 다시 닿아도 안전한 거리가 더 선명해집니다.",
    neo: "재회는 감정이 남아 있는 것만으로 성사되지 않습니다. 조건과 태도가 함께 맞아야 합니다.",
    youn: "서로를 다그치기보다, 필요한 시간을 인정할수록 인연은 더 분명하게 드러나요.",
    action: [
      "상대에게 원하는 것을 한 줄로 적고, 그것이 현실 가능한지 확인합니다.",
      "연락을 시도하기 전 현재 관계의 경계선을 먼저 정리합니다.",
      "재회를 바라는 이유가 그리움인지, 실제 회복인지 구분합니다.",
    ],
    crystalHook: "흐려진 감정을 정리하고 재접근의 조건을 읽는 힘",
  },
  move: {
    summaryLead: "이동과 변화는 타이밍과 준비가 맞아야 부드럽게 열립니다.",
    pulse: "환경을 바꾸고 싶은 마음은 분명하지만, 지금은 동선과 조건을 함께 맞춰야 합니다.",
    caution: "움직이고 싶은 마음만 앞세우면 준비 부족이 뒤따를 수 있습니다.",
    uplift: "원석의 전략성을 활용해 이동 후의 생활까지 계산하면 변화가 훨씬 안전합니다.",
    neo: "이동의 핵심은 빨리 가는 것이 아니라, 도착한 뒤 버틸 수 있게 준비하는 것입니다.",
    youn: "조금 천천히 가도 괜찮아요. 제대로 옮겨 놓는 선택이 결국 마음을 편하게 합니다.",
    action: [
      "이동 전에 비용, 거리, 일정, 생활 변수를 각각 따로 적습니다.",
      "즉흥 결정 대신 1주일 뒤의 현실 조건까지 함께 살펴봅니다.",
      "새 환경에서 지켜야 할 루틴 1개를 먼저 정해 둡니다.",
    ],
    crystalHook: "변화의 방향을 읽고 준비를 현실화하는 힘",
  },
  career: {
    summaryLead: "직업운은 실력과 보이게 되는 방식이 함께 움직입니다.",
    pulse: "지금 필요한 것은 버티기보다 정리된 방향성입니다. 무엇을 잘하는지가 더 분명해져야 합니다.",
    caution: "과한 비교, 무작정 이동, 평가 기준을 모르는 상태의 선택을 조심하세요.",
    uplift: "원석의 정리력으로 역할과 강점을 선명하게 만들면 커리어 흐름이 살아납니다.",
    neo: "커리어는 운이 아니라 구조입니다. 구조를 읽는 순간 결과도 바뀝니다.",
    youn: "당신은 이미 성장 중이에요. 오늘은 스스로의 강점을 다시 적어 두는 것만으로도 충분합니다.",
    action: [
      "지금 맡은 일에서 성과로 연결되는 지점을 하나만 골라 정리합니다.",
      "이직이나 변화가 필요하면 기준 3개를 먼저 적어 비교합니다.",
      "오늘 끝낼 수 있는 업무 1개를 마감해 흐름을 눈에 보이게 만듭니다.",
    ],
    crystalHook: "우선순위를 정돈하고 성장 방향을 선명하게 만드는 힘",
  },
  health: {
    summaryLead: "건강운은 몸보다 먼저 생활 리듬과 감정 피로를 살펴야 합니다.",
    pulse: "회복은 한 번에 오는 것이 아니라, 쉬는 방식과 스트레스의 패턴을 바꾸면서 생깁니다.",
    caution: "무리한 버티기, 수면 부족, 감정 소모를 가볍게 넘기지 마세요.",
    uplift: "원석의 회복 기운을 빌려 생활 루틴을 정리하면 에너지가 다시 모입니다.",
    neo: "몸은 늘 먼저 신호를 보냅니다. 늦게 알아차리기 전에 패턴을 바꾸는 것이 좋습니다.",
    youn: "쉬는 것도 기술이에요. 조금만 정돈하면 생각보다 빨리 숨이 돌아옵니다.",
    action: [
      "오늘 잠들기 전 화면 시간을 30분만 줄입니다.",
      "피로를 키우는 일을 하나 골라 잠시 멈춥니다.",
      "식사, 물, 호흡 중 하나를 먼저 정리해 몸의 리듬을 되돌립니다.",
    ],
    crystalHook: "에너지를 보호하고 회복 루틴을 만들게 하는 힘",
  },
  relation: {
    summaryLead: "대인관계는 신뢰와 경계의 균형을 다시 맞추는 흐름입니다.",
    pulse: "사람 사이의 온도는 맞지만, 말의 방식과 기준이 조금씩 엇갈리고 있습니다.",
    caution: "모두에게 맞추려다 지치거나, 경계를 너무 늦게 세우는 것을 조심하세요.",
    uplift: "원석의 보호 기운을 활용하면 관계를 지키면서도 소모를 줄일 수 있습니다.",
    neo: "좋은 관계는 참는 관계가 아니라, 서로의 선을 존중하는 관계입니다.",
    youn: "당신은 이미 잘 버티고 있어요. 이제는 모든 사람을 살피기보다, 나를 지키는 기준도 챙겨야 합니다.",
    action: [
      "이번 주에 꼭 지켜야 할 관계의 경계를 한 문장으로 적습니다.",
      "불편한 대화는 문자보다 시간과 맥락을 먼저 맞춥니다.",
      "도움이 되는 사람과 소모되는 사람을 나누어 관계 에너지를 점검합니다.",
    ],
    crystalHook: "소모를 막고 관계의 경계를 세우는 힘",
  },
};

function getCategoryVoice(categoryId) {
  return CATEGORY_VOICES[categoryId] || CATEGORY_VOICES.overall;
}

const CRYSTAL_CATEGORY_LENSES = {
  overall: {
    axis: "오늘 가장 먼저 정리할 기준",
    choice: "흩어진 신호 중 하나만 고르는 선택",
    opportunity: "하루의 우선순위가 또렷해지는 작은 질서",
    risk: "여러 신호를 모두 따라가려는 마음",
    timing: "해가 지기 전 한 가지를 끝내고, 밤에는 남은 감정을 정리하는 리듬",
    action: "가장 먼저 끝낼 일 하나를 정하는 것",
    oracle: "흐린 감각을 오늘의 작은 결단으로 바꾸는 첫 번째 실행",
  },
  wealth: {
    axis: "돈이 들어오고 나가는 문턱의 조건",
    choice: "수익 가능성과 손실 방어를 분리하는 선택",
    opportunity: "작은 수익보다 오래 남는 구조를 만드는 단서",
    risk: "기대 수익만 보고 비용과 책임을 흐리는 태도",
    timing: "새 제안은 바로 잡지 말고 조건을 적어 3일 이상 확인하는 리듬",
    action: "지금 지킬 돈과 움직일 돈을 분리하는 것",
    oracle: "돈의 흐름은 감이 아니라 조건을 밝히는 손끝에서 열린다",
  },
  love: {
    axis: "마음의 온도와 표현의 속도",
    choice: "확인하고 싶은 마음과 상대가 받아들일 수 있는 말의 간격",
    opportunity: "부드러운 한 문장으로 관계의 방어가 낮아지는 순간",
    risk: "감정을 증명하려는 조급함",
    timing: "대화는 즉흥 메시지보다 서로 숨을 고를 수 있는 시간에 여는 리듬",
    action: "서운함을 비난이 아닌 요청으로 바꾸는 것",
    oracle: "사랑의 문은 강한 말보다 안전한 온도에서 열린다",
  },
  reunion: {
    axis: "남은 감정과 다시 만날 조건의 차이",
    choice: "그리움 때문에 다가갈지, 회복 가능한 약속이 생겼을 때 다가갈지의 구분",
    opportunity: "감정을 정리한 뒤 조심스럽게 닿을 수 있는 작은 통로",
    risk: "변하지 않은 방식으로 다시 시작하려는 마음",
    timing: "연락보다 먼저 침묵의 이유와 다시 만날 기준을 정리하는 리듬",
    action: "재회를 바라는 이유와 실제 회복 조건을 나누어 적는 것",
    oracle: "다시 이어질 인연은 그리움보다 달라진 태도를 먼저 알아본다",
  },
  move: {
    axis: "움직임의 욕구와 도착 이후의 현실 조건",
    choice: "떠나는 속도보다 새 자리에서 유지할 수 있는 기반을 보는 선택",
    opportunity: "환경이 바뀌며 숨통이 트이는 새로운 동선",
    risk: "준비되지 않은 변화에 기대를 모두 실어 버리는 태도",
    timing: "거리, 비용, 일정, 생활 리듬을 함께 적고 움직이는 리듬",
    action: "이동 뒤에도 지킬 루틴 하나를 먼저 정하는 것",
    oracle: "좋은 변화는 떠나는 순간보다 도착한 뒤의 생활에서 증명된다",
  },
  career: {
    axis: "역할, 실력, 평가 기준이 만나는 지점",
    choice: "버티는 힘과 방향을 바꾸는 결단을 구분하는 선택",
    opportunity: "보이지 않던 강점이 역할이나 제안으로 드러나는 흐름",
    risk: "비교와 불안 때문에 자신의 기준을 잃는 태도",
    timing: "성과로 보일 일 하나를 먼저 마감하고 다음 방향을 확인하는 리듬",
    action: "나의 강점이 실제 성과로 이어지는 지점을 적는 것",
    oracle: "진로의 문은 큰 선언보다 오늘 끝낸 하나의 증거로 열린다",
  },
  health: {
    axis: "몸의 신호와 마음의 피로가 만나는 지점",
    choice: "더 버틸지, 회복을 일정에 먼저 올릴지의 구분",
    opportunity: "생활 리듬을 작게 회복하며 기운이 돌아오는 신호",
    risk: "무리를 정상으로 착각하고 피로를 미루는 태도",
    timing: "수면, 물, 호흡 중 하나부터 7일간 일정하게 돌보는 리듬",
    action: "오늘의 피로를 키우는 행동 하나를 멈추는 것",
    oracle: "회복의 문은 몸이 보낸 작은 신호를 존중할 때 열린다",
  },
  relation: {
    axis: "신뢰와 경계가 균형을 찾는 자리",
    choice: "참는 관계와 조율할 관계를 분리하는 선택",
    opportunity: "말의 온도를 낮추며 신뢰를 다시 세울 수 있는 순간",
    risk: "모든 사람을 살피느라 자신의 선을 잃는 태도",
    timing: "불편한 대화는 즉시 반응하지 말고 맥락을 맞춘 뒤 여는 리듬",
    action: "지켜야 할 경계와 건넬 수 있는 호의를 따로 정하는 것",
    oracle: "좋은 인연은 나를 잃지 않는 선 위에서 더 오래 머문다",
  },
};

const CRYSTAL_POSITION_LENSES = {
  1: {
    role: "현재 파동을 읽는 입구",
    reading: "첫 자리는 지금 이미 드러난 기운을 말하므로, 감정의 이름보다 현실의 상태를 먼저 보아야 합니다.",
    action: "현재 상태를 한 문장으로 이름 붙입니다.",
  },
  2: {
    role: "가능성이 열리는 통로",
    reading: "두 번째 자리는 아직 작지만 살아 있는 가능성을 비추므로, 크게 확장하기보다 손에 잡히는 단서를 살피는 자리입니다.",
    action: "이번 주에 확인할 수 있는 가능성의 단서 1개를 적습니다.",
  },
  3: {
    role: "반복 패턴을 드러내는 그림자",
    reading: "세 번째 자리는 흐름을 막는 습관과 두려움을 보여 주므로, 좋은 해석보다 멈춰야 할 반응을 먼저 찾아야 합니다.",
    action: "같은 패턴을 반복하게 만드는 반응 1개를 멈춥니다.",
  },
  4: {
    role: "현실 조언이 내려오는 손",
    reading: "네 번째 자리는 조언의 자리이므로, 감정 해석을 실제 행동으로 옮길 때 힘이 살아납니다.",
    action: "오늘 바로 실행할 행동 1개를 끝냅니다.",
  },
  5: {
    role: "흐름이 향하는 마지막 문",
    reading: "마지막 자리는 결과를 단정하기보다 지금 선택이 어떤 방향으로 굳어지는지를 비춥니다.",
    action: "7일 뒤 다시 확인할 결과 기준 1개를 정합니다.",
  },
};

function getCrystalCategoryLens(categoryId) {
  return CRYSTAL_CATEGORY_LENSES[categoryId] || CRYSTAL_CATEGORY_LENSES.overall;
}

function getCrystalPositionLens(order) {
  return CRYSTAL_POSITION_LENSES[order] || CRYSTAL_POSITION_LENSES[1];
}

const CARD_MEANING_OVERRIDES = {
  "The Tower": "갑작스러운 붕괴, 숨은 문제 노출, 구조 재점검, 예상 밖의 충격",
  "The Devil": "집착, 유혹, 중독, 계약, 욕망, 벗어나기 어려운 구조",
  "The Moon": "불안, 착각, 숨은 감정, 모호함, 직감",
  "Ten of Swords": "종결, 소진, 배신감, 최악의 생각, 더 버틸 수 없는 한계",
  "Five of Pentacles": "결핍감, 재정 압박, 소외감, 부족함에 대한 두려움",
  "Five of Wands": "경쟁, 충돌, 실력 겨루기, 시장의 소란, 의견 차이",
  "Page of Cups": "순수한 감정, 상상력, 미숙한 제안, 감정적 기대",
  Temperance: "균형, 조율, 절제, 혼합, 속도 조절",
  "Ace of Pentacles": "새로운 현실 기회, 돈의 씨앗, 사업의 시작, 실질적 기반",
};

function hashSeed(text) {
  const base = String(text || "");
  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function resolveOrientation(cardName, idx, provided) {
  const explicit = Array.isArray(provided) ? provided[idx] : "";
  if (explicit === "upright" || explicit === "reversed") return explicit;
  const seed = hashSeed(`${cardName}:${idx}`);
  return seed % 4 === 0 ? "reversed" : "upright";
}

function findCrystalByAssignment(idx, body = {}, fallbackGemName = "") {
  const assignment = body?.assignments && typeof body.assignments === "object" ? body.assignments : {};
  const gemId = asText(assignment[idx]);
  if (gemId && CRYSTAL_MEANINGS[gemId]) return CRYSTAL_MEANINGS[gemId];
  if (fallbackGemName && CRYSTAL_BY_NAME[fallbackGemName]) return CRYSTAL_BY_NAME[fallbackGemName];
  return CRYSTAL_MEANINGS["green-fluorite"];
}

function cardSuite(cardName) {
  const name = asText(cardName);
  if (/Wands/i.test(name)) return "완드";
  if (/Cups/i.test(name)) return "컵";
  if (/Swords/i.test(name)) return "소드";
  if (/Pentacles/i.test(name)) return "펜타클";
  return "메이저";
}

function orientationMeaning(orientation) {
  if (orientation === "reversed") {
    return "역방향이므로 에너지가 막히거나 지연되며, 같은 문제가 반복될 가능성을 경고합니다.";
  }
  return "정방향이므로 움직일 여지는 살아 있지만, 현실 조건을 확인한 뒤 속도를 붙여야 합니다.";
}

function buildCardMeaning(cardName, orientation, tarotKeywords = []) {
  const base = CARD_MEANING_OVERRIDES[cardName] || `${cardSuite(cardName)} 계열의 핵심 주제가 상황의 본질을 선명하게 드러냅니다.`;
  const keywordLine = tarotKeywords.length ? `핵심 키워드는 ${tarotKeywords.slice(0, 4).join(", ")}입니다.` : "";
  return guardWarningTarotText(`${base}. ${orientationMeaning(orientation)} ${keywordLine}`.trim(), { nameEn: cardName, name: cardName }, { field: "cardMeaning", orientation });
}

const CRYSTAL_MASTER_CHAPTER_TITLES = [
  "첫 번째 문 · 오라의 입구",
  "두 번째 문 · 카드가 남긴 빛",
  "세 번째 문 · 아르카나와 숫자의 결",
  "네 번째 문 · 크리스탈 정화의 파동",
  "다섯 번째 문 · 현실에 내려앉는 선택",
  "여섯 번째 문 · 14~30일의 리추얼",
  "일곱 번째 문 · 봉인 오라클",
];

const MAJOR_ARCANA_NUMBERS = {
  "The Fool": 0,
  "The Magician": 1,
  "The High Priestess": 2,
  "The Empress": 3,
  "The Emperor": 4,
  "The Hierophant": 5,
  "The Lovers": 6,
  "The Chariot": 7,
  Strength: 8,
  "The Hermit": 9,
  "Wheel of Fortune": 10,
  Justice: 11,
  "The Hanged Man": 12,
  Death: 13,
  Temperance: 14,
  "The Devil": 15,
  "The Tower": 16,
  "The Star": 17,
  "The Moon": 18,
  "The Sun": 19,
  Judgement: 20,
  "The World": 21,
};

const MINOR_CARD_NUMBERS = {
  Ace: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
  Ten: 10,
  Page: 11,
  Knight: 12,
  Queen: 13,
  King: 14,
};

function buildKeywordVisual(keywords = []) {
  const list = Array.isArray(keywords) ? keywords.filter(Boolean).slice(0, 4) : [];
  return `[빛의 단서: ${list.join(", ")}]`;
}

function tarotNumerologyInsight(cardNameEn) {
  const majorNo = MAJOR_ARCANA_NUMBERS[cardNameEn];
  if (Number.isFinite(majorNo)) {
    return `메이저 아르카나 ${majorNo}번의 상징이므로 삶의 큰 축을 재정렬하는 신호가 강합니다.`;
  }
  const parts = String(cardNameEn || "").split(" ");
  const head = parts[0];
  const number = MINOR_CARD_NUMBERS[head];
  if (Number.isFinite(number)) {
    return `마이너 아르카나 ${number} 수비학 파동이므로 구체적 생활 루틴과 행동 선택에 바로 반영하는 것이 중요합니다.`;
  }
  return "카드의 수비학 단서는 오늘의 선택을 작게 쪼개 실행하도록 안내합니다.";
}

function ensureTextLength(text, minLength = 220) {
  const value = asText(text);
  return value.length >= minLength ? value : "";
}

function sanitizeCrystalSoulText(text) {
  return String(text || "")
    .replace(/[\t\r]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeRepeatedCrystalSoulPhrases(text) {
  const lines = String(text || "").split("\n");
  const seen = new Set();
  const kept = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      kept.push(line);
      continue;
    }
    if (normalized.length >= 20) {
      if (seen.has(normalized)) continue;
      seen.add(normalized);
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function uniqueSentenceList(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const text = asText(item);
    if (!text) continue;
    const normalized = text.replace(/[“”"'`]/g, "").replace(/\s+/g, " ").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(text);
  }
  return result;
}

function buildVariedReadingLead(position, cardNameKo, orientation, categoryName, crystalName) {
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";
  const templates = [
    `${position.title}에서는 ${cardNameKo} ${orientationLabel}의 흐름이 ${categoryName}의 첫 숨을 정리합니다.`,
    `${cardNameKo} ${orientationLabel}은 ${position.title}에서 지금 당장 손대야 할 우선순위를 드러냅니다.`,
    `${position.title}에 놓인 ${cardNameKo}는 ${crystalName}과 만나 감정과 현실의 접점을 다시 맞춥니다.`,
    `${categoryName} 전체에서 ${position.title} 자리는 흐름의 방향을 바꾸는 관문처럼 작동합니다.`,
    `${cardNameKo} ${orientationLabel}이 비추는 핵심은 ${position.title}에 맞는 행동 속도를 찾는 일입니다.`,
  ];
  return templates[(position.order - 1) % templates.length];
}

function buildCrystalSoulSection(cardName, crystal, position, category, orientation, idx) {
  const card = getTarotCardByAnyId(cardName);
  const cardNameKo = asText(card?.nameKo) || asText(cardName) || `카드 ${idx + 1}`;
  const cardNameEn = asText(card?.nameEn) || asText(cardName) || `Card ${idx + 1}`;
  const warningGuard = getWarningCardGuard({ code: card?.code, nameKo: cardNameKo, nameEn: cardNameEn, name: cardName });
  const imageCandidates = card ? buildImageCandidates(card.code) : [];
  const tarotKeywords = Array.isArray(card?.keywords) && card.keywords.length
    ? card.keywords.slice(0, 5)
    : [cardSuite(cardName), orientation === "reversed" ? "지연" : "진행", "핵심 전환", "행동 필요"];

  const voice = getCategoryVoice(category.id);
  const lens = getCrystalCategoryLens(category.id);
  const positionLens = getCrystalPositionLens(position.order);
  const cardMeaning = buildCardMeaning(cardNameEn, orientation, tarotKeywords);
  const cardLean = buildVariedReadingLead(position, cardNameKo, orientation, category.name, crystal.nameKo);
  const crystalMeaning = `${crystal.nameKo}는 ${crystal.meaning.replace(/입니다\.?$/, "")}. ${crystal.adviceTone} 쪽이 살고, ${crystal.cautionTone}는 잠시 낮춰야 합니다.`;
  const orientationPulse = warningGuard ? warningGuard.pulse : orientation === "reversed"
    ? `에너지가 안쪽으로 말려 있어 ${lens.risk}이 커질 수 있습니다.`
    : `에너지가 밖으로 열리고 있어 ${lens.opportunity}가 현실로 드러나기 쉽습니다.`;
  const positionInterpretation = `${position.title}의 질문은 "${position.question}"입니다. 이 자리는 ${positionLens.role}이며, ${cardNameKo}가 들어온 것은 ${category.focus}를 ${lens.axis}으로 다시 읽으라는 신호입니다.`;
  const oneLineSummary = `${cardLean} ${lens.axis}에서 ${voice.crystalHook}이 핵심입니다.`;
  const crystalEnergy = `${crystal.nameKo}의 ${crystal.keywords.slice(0, 3).join(" · ")} 파동은 ${category.name}의 흐름을 부드럽게 정리합니다. ${crystalMeaning} 이 원석은 ${lens.choice}가 흐려질 때 감정의 결을 낮추고 판단의 손잡이를 다시 잡게 합니다.`;
  const cardFlow = `${cardMeaning} ${positionLens.reading} ${position.title}의 ${cardNameKo}는 ${lens.axis}을 중심에 두고, 지금 더해야 할 것과 덜어낼 것을 가리킵니다.`;
  const currentPulse = `${orientationPulse} 핵심 키워드 ${tarotKeywords.slice(0, 2).join(" · ")}를 기준으로 오늘의 감정과 현실 조건을 한 문장으로 분리해 보세요.`;
  const caution = guardWarningTarotText(`${orientation === "reversed" ? "같은 실수를 설명만으로 넘기지 말고 중단 지점을 먼저 세워야 합니다." : "속도를 올리기보다 기준을 먼저 맞춰야 결과가 오래 갑니다."} 특히 ${lens.risk}은 이 카드의 빛을 흐리게 만들 수 있습니다.`, warningGuard || { code: card?.code, nameKo: cardNameKo, nameEn: cardNameEn }, { field: "caution", orientation });
  const uplift = guardWarningTarotText(`${crystal.nameKo}의 기운은 ${category.name}에서 기준과 순서를 회복시키는 편입니다. ${voice.uplift} ${position.title}의 결론은 ${lens.action}부터 시작할 때 가장 맑아집니다.`, warningGuard || { code: card?.code, nameKo: cardNameKo, nameEn: cardNameEn }, { field: "uplift", orientation });
  const practicalActions = uniqueSentenceList([...(warningGuard?.actions || []), ...(Array.isArray(voice.action) ? voice.action : []), positionLens.action, `${crystal.nameKo}를 떠올리며 ${lens.axis}을 1줄로 적습니다.`]).slice(0, 4);
  const opportunity = guardWarningTarotText(`${tarotKeywords.slice(0, 2).join(" · ")} 신호는 ${position.title}에서 ${lens.opportunity}로 바뀝니다. 이번 주에는 기대를 키우기보다 ${lens.action}에 맞는 단서 하나를 조용히 확인해 보세요.`, warningGuard || { code: card?.code, nameKo: cardNameKo, nameEn: cardNameEn }, { field: "opportunity", orientation });
  const action = practicalActions.join(" / ");
  const categoryReading = uniqueSentenceList([
    oneLineSummary,
    crystalEnergy,
    cardFlow,
    currentPulse,
    caution,
    uplift,
    `오늘의 의식: ${action}`,
  ]).join(" ");

  return guardWarningTarotSection({
    order: position.order,
    positionTitle: position.title,
    question: position.question,
    cardNameKo,
    cardNameEn,
    cardImageUrl: imageCandidates[0] || "",
    orientation,
    crystalName: crystal.nameKo,
    crystalKeywords: crystal.keywords.slice(0, 5),
    tarotKeywords,
    keywordVisual: buildKeywordVisual(tarotKeywords),
    oneLineSummary,
    crystalEnergy,
    cardFlow,
    currentPulse,
    cardMeaning,
    crystalMeaning,
    positionInterpretation,
    categoryReading,
    opportunity,
    caution,
    uplift,
    practicalActions,
    action,
  }, warningGuard || { code: card?.code, nameKo: cardNameKo, nameEn: cardNameEn });
}

function buildCrystalSoulSummary(category, sections, coreCrystal) {
  const strongest = sections[2] || sections[0];
  const voice = getCategoryVoice(category.id);
  const lens = getCrystalCategoryLens(category.id);
  const practicalActions = uniqueSentenceList([
    voice.action[0],
    voice.action[1],
    voice.action[2],
    `${coreCrystal.nameKo}의 기운을 떠올리며 ${lens.axis}을 메모에 남깁니다.`,
  ]);
  return {
    category: category.name,
    coreCrystal: coreCrystal.nameKo,
    overallFlow: `${category.name}의 5장 흐름은 초반 ${sections[0]?.positionTitle || "첫 번째 자리"}에서 감지된 시작점을, 중반 ${sections[2]?.positionTitle || "세 번째 자리"}에서 걸림을 확인하고, 후반 ${sections[4]?.positionTitle || "마지막 자리"}에서 실제 선택으로 마무리하도록 안내합니다. ${coreCrystal.nameKo}는 이 흐름을 한 줄로 묶기보다 ${lens.axis}을 중심으로 단계별로 정돈하게 돕습니다. 지금의 핵심은 운이 좋다 나쁘다의 판정보다, ${lens.choice}가 얼마나 맑아지는지에 있습니다.`,
    strongestSignal: `${strongest.cardNameKo}와 ${strongest.positionTitle}의 결합이 가장 선명한 신호입니다. ${strongest.oneLineSummary} 이 조합은 ${lens.action}을 먼저 세우면 흐름이 살아나고, ${lens.risk}에 끌려가면 같은 자리에서 맴돌 수 있음을 알려 줍니다.`,
    opportunity: `${sections[1]?.positionTitle || "두 번째 자리"}에서는 ${sections[1]?.tarotKeywords.slice(0, 2).join(" · ")} 신호가 ${lens.opportunity}로 바뀝니다. 기대를 키우기보다 지금 할 수 있는 부드러운 실행으로 번역하는 편이 유리하며, 작은 확인 하나가 다음 문을 여는 열쇠가 됩니다.`,
    risk: `${sections[2]?.positionTitle || "세 번째 자리"}의 경고를 흐리게 읽으면 같은 패턴이 다시 반복될 수 있습니다. ${voice.caution} 특히 ${lens.risk}이 올라올 때는 반응을 늦추고 사실, 감정, 요청을 따로 보아야 합니다.`,
    timingAdvice: `${voice.pulse} 지금은 크게 밀어붙이기보다 14~30일 검증 구간을 두는 타이밍입니다. ${lens.timing}을 유지하면 준비와 실행이 분리되고, 카드가 보여 준 흐름이 더 또렷한 현실 신호로 남습니다.`,
    practicalActions,
    oracleMessage: `${coreCrystal.nameKo}의 오라클: "${lens.oracle}."`,
  };
}

function readingSectionLength(section) {
  return [
    section.cardMeaning,
    section.crystalMeaning,
    section.positionInterpretation,
    section.categoryReading,
    section.opportunity,
    section.caution,
    section.uplift,
    section.action,
  ].join(" ").length;
}

function validateCrystalSoulReading(reading) {
  const issues = [];
  const sections = Array.isArray(reading?.sections) ? reading.sections : [];
  const summary = reading?.summary || {};
  const masterChapters = Array.isArray(reading?.masterChapters) ? reading.masterChapters : [];

  if (sections.length !== 5) issues.push("카드 섹션 수가 5장이 아닙니다.");
  sections.forEach((section, idx) => {
    if (!asText(section.cardMeaning)) issues.push(`${idx + 1}번 카드 기본 의미 누락`);
    if (!asText(section.crystalMeaning)) issues.push(`${idx + 1}번 카드 원석 의미 누락`);
    if (!asText(section.categoryReading)) issues.push(`${idx + 1}번 카드 카테고리 상담 누락`);
    if (!asText(section.keywordVisual)) issues.push(`${idx + 1}번 카드 키워드 비주얼 누락`);
    if (readingSectionLength(section) < 600) issues.push(`${idx + 1}번 카드 섹션 길이 부족`);
  });

  const summaryText = [
    summary.overallFlow,
    summary.strongestSignal,
    summary.opportunity,
    summary.risk,
    summary.timingAdvice,
    summary.oracleMessage,
  ].join(" ");
  if (summaryText.length < 800) issues.push("종합 리딩 길이 부족");
  if (!Array.isArray(summary.practicalActions) || summary.practicalActions.length < 3) {
    issues.push("실행 체크리스트 최소 개수 미달");
  }
  if (masterChapters.length !== 7) {
    issues.push("마스터 챕터 수가 7개가 아닙니다.");
  } else {
    masterChapters.forEach((chapter, idx) => {
      if (!asText(chapter?.title)) issues.push(`${idx + 1}번 마스터 챕터 제목 누락`);
      if (!asText(chapter?.keywordVisual)) issues.push(`${idx + 1}번 마스터 챕터 키워드 누락`);
      if (!ensureTextLength(chapter?.content, 260)) issues.push(`${idx + 1}번 마스터 챕터 본문 길이 부족`);
    });
  }

  return { ok: issues.length === 0, issues };
}

function buildCrystalSoulMasterChaptersFallback(readingData) {
  const sections = Array.isArray(readingData?.sections) ? readingData.sections : [];
  const summary = readingData?.summary || {};
  const s1 = sections[0] || {};
  const s2 = sections[1] || {};
  const s3 = sections[2] || {};
  const s4 = sections[3] || {};
  const s5 = sections[4] || {};
  const lens = getCrystalCategoryLens(readingData?.categoryId);

  const chapters = [
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[0],
      openingKeywords: ["오라", "현재 파동", "상담 오프닝"],
      keywordVisual: buildKeywordVisual((s1.tarotKeywords || []).concat(s2.tarotKeywords || [])),
      content: `내담자님, 오늘 무의식이 선택한 첫 번째 진입점은 ${summary.coreCrystal || readingData.coreCrystal}의 파동입니다. ${summary.overallFlow || "현재 흐름은 즉흥보다 기준을 세우는 쪽에 힘이 실립니다."} 지금의 장면은 좋은 운과 나쁜 운을 이분법으로 판정하는 구간이 아니라, ${lens.axis}을 통해 현재 감정과 현실 행동의 간격을 섬세하게 맞추는 구간입니다. ${s1.oneLineSummary || "첫 번째 카드의 핵심 기운이 드러납니다."} 이 문장을 첫 문턱의 중심으로 붙잡아 두시면, 뒤따르는 작은 의식들이 더 안정적으로 마음에 내려앉습니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[1],
      openingKeywords: ["핵심 키워드", "상징", "무의식"],
      keywordVisual: buildKeywordVisual(s2.tarotKeywords || []),
      content: `카드 키워드는 단어 목록이 아니라 마음이 흔들리는 방향을 비추는 지도입니다. ${s2.keywordVisual || buildKeywordVisual(s2.tarotKeywords || [])} 이 조합에는 지금 내담자님의 선택 기준이 어디에서 흐려지고 어디에서 회복되는지가 조용히 드러납니다. ${s2.cardFlow || "카드 흐름은 현재 선택의 우선순위를 명확히 합니다."} 또한 ${s3.keywordVisual || buildKeywordVisual(s3.tarotKeywords || [])}는 반복 습관의 그림자를 가리키는 경향이 있어, 같은 자극에 같은 반응을 하지 않도록 호흡 간격을 의식적으로 늘릴 필요가 있습니다. 빛의 단서마다 오늘의 작은 의식을 하나씩 붙이면 오라클 문장이 하루의 선택으로 내려앉습니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[2],
      openingKeywords: ["메이저", "마이너", "수비학"],
      keywordVisual: buildKeywordVisual([s1.cardNameKo, s3.cardNameKo, s5.cardNameKo]),
      content: `${s1.cardNameKo || "첫 번째 카드"}는 ${tarotNumerologyInsight(s1.cardNameEn)} ${s3.cardNameKo || "세 번째 카드"}는 ${tarotNumerologyInsight(s3.cardNameEn)} ${s5.cardNameKo || "다섯 번째 카드"}는 ${tarotNumerologyInsight(s5.cardNameEn)} 메이저 아르카나는 인생 축의 전환과 신념 프레임에, 마이너 아르카나는 일상 루틴과 관계 언어에 닿아 있습니다. 따라서 이번 리딩의 결론은 거대한 결심보다, 14일 단위의 실행 체크포인트를 세팅해 수비학적 리듬을 현실 캘린더에 반영하는 것입니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[3],
      openingKeywords: ["원석", "정화", "치유 주파수"],
      keywordVisual: buildKeywordVisual([readingData.coreCrystal, "정화", "회복", "안정"]),
      content: `${readingData.coreCrystal}는 감정을 눌러 버리는 돌이 아니라, 감정과 판단의 속도를 맞춰 주는 조율자입니다. ${s1.crystalEnergy || "첫 번째 카드에 배치된 원석 에너지는 흐름을 안정화합니다."} ${s4.crystalEnergy || "네 번째 카드의 원석은 오늘 움직일 결을 잡아 줍니다."} 내담자님이 해야 할 치유 동작은 복잡하지 않습니다. 하루 10분 호흡 정리, 하루 1회 감정 기록, 하루 1회 기준 문장 확인만 지켜도 원석 파동은 점진적으로 안정 신호를 키웁니다. 정화의 파동은 즉시 극적인 변화를 만들기보다, 반복 가능한 회복 리듬을 통해 누적됩니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[4],
      openingKeywords: ["관계", "현실", "실행"],
      keywordVisual: buildKeywordVisual(["현실화", "선택", "기준", "실행"]),
      content: `이 리딩의 빛은 통찰을 오래 붙잡는 데서 끝나지 않고, 오늘의 작은 선택으로 내려올 때 선명해집니다. ${summary.strongestSignal || "가장 강한 신호는 핵심 카드 조합에서 드러납니다."} ${summary.opportunity || "두 번째 자리에서 가능성의 문이 열립니다."} ${readingData.category || "이번 질문"}에서는 ${lens.choice}가 상담의 중심축입니다. 그러므로 오늘의 현실 조언은 ${lens.action}입니다. 내담자님이 오늘 만들 문장은 길 필요가 없습니다. '지금은 무엇을 멈추고, 무엇을 시작할지' 이 두 문장을 또렷하게 쓰는 순간, 카드가 말한 가능성은 행동의 형태를 얻습니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[5],
      openingKeywords: ["타이밍", "루틴", "14~30일"],
      keywordVisual: buildKeywordVisual(["타이밍", "체크포인트", "리추얼", "누적"]),
      content: `${summary.timingAdvice || "지금은 즉흥 확장보다 검증 구간을 먼저 확보하는 타이밍입니다."} 14~30일 구간은 운세를 기다리는 시간이 아니라 파동을 몸에 익히는 기간입니다. 특히 이번 질문은 ${lens.timing}을 유지할 때 흐름이 안정됩니다. 1주차에는 정리와 관찰, 2주차에는 작은 움직임, 3~4주차에는 유지할 것과 내려놓을 것을 가르는 리듬을 권장합니다. 리추얼은 화려할 필요가 없습니다. 같은 시간대에 3분 정리 메모를 남기고, 매주 한 번 카드의 빛의 단서를 다시 읽어 오늘의 행동과 얼마나 맞닿았는지 확인하세요. 이렇게 하면 타로 상징이 추상 언어에서 벗어나 생활 속에서 반복 가능한 선택의 신호로 바뀝니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[6],
      openingKeywords: ["봉인 조언", "통합", "마무리"],
      keywordVisual: buildKeywordVisual(["통합", "결단", "회복", "전환"]),
      content: `마지막으로 내담자님께 봉인 조언을 남깁니다. ${summary.oracleMessage || `${readingData.coreCrystal}의 오라클: "${lens.oracle}."`} 오늘의 리딩은 불안을 없애 주는 마법이 아니라, 불안을 다루는 구조를 선물합니다. ${summary.risk || "반복 습관을 방치하면 카드 잠재력이 줄어듭니다."} 그러므로 결론은 단순합니다. 지금 즉시 시작할 행동 1개, 즉시 중단할 행동 1개를 정하고 7일 동안만 지켜 보세요. 그 7일 동안 ${lens.risk}을 알아차리는 힘이 커지면, 파동의 변화를 더 선명하게 느낄 수 있습니다.`,
    },
  ];

  return chapters.map((chapter, idx) => ({
    no: idx + 1,
    title: chapter.title,
    openingKeywords: chapter.openingKeywords,
    keywordVisual: chapter.keywordVisual,
    content: chapter.content,
  }));
}

async function buildCrystalSoulReading(body = {}, env = {}) {
  const categoryId = asText(body?.topic?.id) || "wealth";
  const category = CATEGORY_DEFS[categoryId] || CATEGORY_DEFS.wealth;
  const cards = Array.isArray(body?.cards) ? body.cards.slice(0, 5) : [];
  const coreCrystal = findCrystalByAssignment(0, body, asText(body?.gem?.name));

  const sections = category.spread.map((position, idx) => {
    const cardName = asText(cards[idx]) || `Card ${idx + 1}`;
    const orientation = resolveOrientation(cardName, idx, body?.orientations);
    const crystal = findCrystalByAssignment(idx, body, asText(body?.gem?.name));
    return buildCrystalSoulSection(cardName, crystal, position, category, orientation, idx);
  });

  const summary = buildCrystalSoulSummary(category, sections, coreCrystal);
  const fallbackReadingData = {
    category: category.name,
    categoryId: category.id,
    coreCrystal: coreCrystal.nameKo,
    sections,
    summary,
  };
  fallbackReadingData.masterChapters = buildCrystalSoulMasterChaptersFallback(fallbackReadingData);

  let readingData = fallbackReadingData;
  let source = "deterministic";
  let model = "local";

  readingData = guardCrystalSoulReadingData(readingData);

  const validation = validateCrystalSoulReading(readingData);
  return {
    reading: crystalReadingToText(readingData),
    readingData,
    validation,
    source,
    model,
  };
}

function crystalReadingToText(reading) {
  const lines = [];
  lines.push(`🔮 ${reading.category} 점술 서비스 · 크리스탈 소울 리딩`);
  lines.push(`핵심 원석: ${reading.coreCrystal}`);
  lines.push("");
  for (const section of reading.sections) {
    lines.push(`${section.order}. ${section.positionTitle} (${section.question})`);
    lines.push(section.keywordVisual || buildKeywordVisual(section.tarotKeywords));
    lines.push(`카드: ${section.cardNameKo} / ${section.orientation === "reversed" ? "역방향" : "정방향"}`);
    lines.push(`원석: ${section.crystalName}`);
    lines.push(`타로 키워드: ${section.tarotKeywords.join(", ")}`);
    lines.push(`원석 키워드: ${section.crystalKeywords.join(", ")}`);
    lines.push(`한 줄 요약: ${section.oneLineSummary}`);
    lines.push(`원석 에너지: ${section.crystalEnergy}`);
    lines.push(`카드 흐름: ${section.cardFlow}`);
    lines.push(`카드가 비춘 장면: ${section.cardMeaning}`);
    lines.push(`원석의 기운: ${section.crystalMeaning}`);
    lines.push(`자리의 속삭임: ${section.positionInterpretation}`);
    lines.push(`지금의 흐름: ${section.currentPulse}`);
    lines.push(`주제의 깊은 흐름: ${section.categoryReading}`);
    lines.push(`기회: ${section.opportunity}`);
    lines.push(`주의점: ${section.caution}`);
    lines.push(`좋게 살리는 방법: ${section.uplift}`);
    lines.push(`오늘의 의식: ${(section.practicalActions || []).join(" / ")}`);
    lines.push("");
  }
  lines.push("종합 리딩");
  lines.push(`전체 흐름: ${reading.summary.overallFlow}`);
  lines.push(`가장 강한 신호: ${reading.summary.strongestSignal}`);
  lines.push(`기회: ${reading.summary.opportunity}`);
  lines.push(`주의할 점: ${reading.summary.risk}`);
  lines.push(`타이밍 조언: ${reading.summary.timingAdvice}`);
  lines.push("오늘의 작은 의식:");
  (reading.summary.practicalActions || []).forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
  lines.push(`크리스탈 오라클: ${reading.summary.oracleMessage}`);

  const chapters = Array.isArray(reading.masterChapters) ? reading.masterChapters : [];
  if (chapters.length) {
    lines.push("");
    lines.push("일곱 개의 크리스탈 문");
    chapters.forEach((chapter, idx) => {
      lines.push("");
      lines.push(`${chapter.title || `챕터 ${idx + 1}`}`);
      lines.push(chapter.keywordVisual || buildKeywordVisual(chapter.openingKeywords || []));
      lines.push(asText(chapter.content));
    });
  }

  return removeRepeatedCrystalSoulPhrases(sanitizeCrystalSoulText(lines.join("\n")));
}

function ensureCardCountOrThrow(spreadType, cards) {
  const expected = expectedCardCount(spreadType);
  if (!expected) {
    throw createHttpError(400, `Unsupported spreadType: ${spreadType}`);
  }
  if (!Array.isArray(cards) || cards.length !== expected) {
    throw createHttpError(400, `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`, {
      expectedCardCount: expected,
      receivedCardCount: Array.isArray(cards) ? cards.length : 0,
    });
  }
}

function toUiCard(drawn, spreadType, idx, questionType) {
  const spread = getSpreadDefinition(spreadType);
  const position = spread?.positions?.[idx];
  const card = getTarotCardByAnyId(drawn.cardId);
  if (!card) {
    throw new TarotInterpretationError(
      "CARD_DATA_MISSING",
      `Card data missing for ${drawn.cardId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { drawn },
    );
  }

  const images = buildImageCandidates(card.code);
  // 카드 최상위 keywords 는 도메인 중립이라 질문 분야가 지워진다.
  // 사용자가 고른 주제·정역방향에 맞춰 고른 키워드를 내보낸다.
  const orientation = drawn.orientation === "reversed" ? "reversed" : "upright";
  const topicKeywords = questionType
    ? getMeaningByQuestion(card, orientation, questionType).keywords
    : card.keywords.slice(0, 5);
  return {
    cardId: card.code,
    id: card.id,
    name: card.nameEn,
    nameEn: card.nameEn,
    nameKr: card.nameKo,
    nameKo: card.nameKo,
    position: drawn.positionKey || drawn.position || position?.key || `position_${idx + 1}`,
    orientation,
    imageKey: card.imageKey || card.code.toLowerCase(),
    imageUrl: images[0],
    imageCandidates: images,
    proxyImageUrl: "",
    localImageUrl: images[0],
    keywords: Array.isArray(topicKeywords) && topicKeywords.length
      ? topicKeywords.slice(0, 5)
      : card.keywords.slice(0, 5),
  };
}

function buildReadingPayload({ spreadType, category, cards, serviceKey, userQuestion, userContext, year }) {
  ensureCardCountOrThrow(spreadType, cards);

  const normalizedDrawnCards = normalizeDrawnCardsForSpread(spreadType, cards);
  const questionType = inferQuestionType({ category, spreadId: spreadType, serviceKey });
  const uiCards = normalizedDrawnCards.map((drawn, idx) => toUiCard(drawn, spreadType, idx, questionType));

  const interpreted = interpretTarotReading({
    serviceKey: serviceKey || `tarot:${spreadType}`,
    questionType,
    spreadId: spreadType,
    drawnCards: normalizedDrawnCards,
    userQuestion,
    userContext,
  });

  let reading = buildLegacyReadingPayload(interpreted, {
    spreadId: spreadType,
    questionType,
    drawnCards: normalizedDrawnCards,
  });

  if (spreadType === "yearly_twelve_card" || spreadType === "yearly_three_card") {
    reading = buildPremiumYearReading({ reading, year });
  }

  return {
    ok: true,
    category: asText(category) || "general",
    spreadType,
    cards: uiCards,
    reading,
    consultingHighlights: buildConsultingHighlights(reading),
    engineMeta: {
      source: "lib/tarot/*",
      spreadType,
      questionType,
      cardCount: uiCards.length,
      cardDbCount: TAROT_CARDS.length,
      deterministic: true,
      qualityEnhanced: spreadType === "reunion_lighthouse_five_card"
        || spreadType === "yearly_twelve_card"
        || spreadType === "yearly_three_card",
      premiumYearQuality: spreadType === "yearly_twelve_card" ? validatePremiumYearReading(reading) : undefined,
    },
  };
}

function mapInterpretationErrorToHttp(error) {
  if (error instanceof TarotInterpretationError) {
    if (error.code === "INVALID_CARD_COUNT") {
      return json({ ok: false, message: error.userMessage, errorCode: error.code, meta: error.meta }, { status: 400 });
    }

    if (error.code === "CARD_DATA_MISSING") {
      console.error("[tarot] CARD_DATA_MISSING", error.meta || {});
      return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 422 });
    }

    return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 400 });
  }

  return null;
}

async function buildNumerologyReadingPayload(body = {}, env = {}) {
  const birthDate = asText(body?.birthDate);
  if (!birthDate) {
    throw createHttpError(400, "생년월일을 입력해 주세요.");
  }

  const question = asText(body?.question);
  if (!question) {
    throw createHttpError(400, "상담 질문을 입력해 주세요.");
  }

  const topic = normalizeTopic(body?.topic);
  const numerology = buildNumerologyContext({
    birthDate,
    topic,
  });

  let cards = normalizeCardInput(body?.cards, topic);
  if (cards.length < 5) {
    const generatedCards = selectCards({
      birthDate,
      topic,
      name: asText(body?.name),
      numerology,
    });
    const mergedCards = [...cards];
    for (const drawn of generatedCards) {
      if (mergedCards.length >= 5) break;
      mergedCards.push(drawn);
    }
    cards = mergedCards;
  }
  cards = normalizeCardInput(cards, topic).slice(0, 5);

  const fallback = buildFallbackInterpretation({
    numerology,
    cards,
    topic,
    name: asText(body?.name),
    question,
  });

  return {
    ok: true,
    source: "deterministic",
    topic,
    numerology,
    cards,
    interpretation: guardNumerologyWarningInterpretation(fallback, cards),
  };
}

export async function handleTarotRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/tarot");

    if (method === "GET" && path === "/meta") {
      return json({
        ok: true,
        engine: {
          spreads: listSpreadIds(),
          cardCount: TAROT_CARDS.length,
        },
      });
    }

    if (method === "GET" && path === "/year/result") {
      const auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
      const url = new URL(request.url);
      const year = resolveYearValue(url.searchParams.get("year"));
      const resultId = asText(url.searchParams.get("resultId"));
      const record = await findYearResult({ env, userId: auth.userId, year, resultId });
      if (!record) {
        return json({
          ok: false,
          code: "TAROT_YEAR_RESULT_NOT_FOUND",
          message: "저장된 십이지신 천운 타로 결과를 찾지 못했습니다.",
        }, { status: 404 });
      }
      return json(publicYearResult(record));
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const body = await readJson(request);

    if (path === "/numerology-reading") {
      const access = await verifyNumerologyReadingAccess(request, env, body);
      if (!access.ok) {
        return json(
          {
            ok: false,
            code: access.code || "NUMEROLOGY_TAROT_PAYMENT_NOT_VERIFIED",
            reason: access.reason || "",
            message: access.message,
          },
          { status: access.status || 402 },
        );
      }
      const payload = await buildNumerologyReadingPayload(body, env);
      return json({
        ...payload,
        accessVerified: true,
        accessSource: access.evidence?.source || "auth",
      });
    }

    // 커리어 전환 타로(이직 타로)의 유료 리딩. 카드 뽑기는 브라우저가 하고, **해석은 여기서만** 만든다.
    // 🔴 생성기를 tarot-ijik.html 로 되돌리지 말 것 — 그러면 콘솔 한 줄로 결과가 공짜가 된다
    //    (__tests__/ui/tarot-ijik-server-gate.static.test.js 가 막는다).
    if (path === "/ijik-reading") {
      const access = await verifyTarotPerUseAccess(request, env, body, {
        featureKey: IJIK_READING_FEATURE_KEY,
        minCost: IJIK_READING_MIN_COST,
        codePrefix: "IJIK_TAROT",
        reason: "커리어 전환 타로 리딩",
        authMessage: "로그인 후 리딩을 확인할 수 있습니다.",
        retryHint: "해석 보기 버튼으로 결제를 완료한 뒤 다시 시도해 주세요.",
      });
      if (!access.ok) {
        return json(
          {
            ok: false,
            code: access.code || "IJIK_TAROT_PAYMENT_NOT_VERIFIED",
            reason: access.reason || "",
            message: access.message,
          },
          { status: access.status || 402 },
        );
      }

      const cards = Array.isArray(body?.cards) ? body.cards : [];
      if (cards.length !== IJIK_READING_CARD_COUNT) {
        return json(
          { ok: false, code: "IJIK_TAROT_BAD_SPREAD", message: "카드 7장을 모두 연 뒤 다시 시도해 주세요." },
          { status: 400 },
        );
      }

      const { buildIjikReading } = await import("../lib/tarot-ijik-reading.js");
      const result = buildIjikReading(cards);
      return json({
        ok: true,
        ...result,
        accessVerified: true,
        accessSource: access.evidence?.source || "auth",
      });
    }

    if (path === "/oracle-consultation") {
      // 🔴 입력 검증을 결제·LLM 앞에 둔다. 예전에는 generateOracleConsultation 안에서 걸려
      // `unknown_card_id:2` 같은 **영구 실패**가 LLM 실패와 똑같이 502 로 나갔고, 클라이언트는
      // 그걸 재시도 대상으로 오해했다. 재시도해도 결과가 같은 실패는 400 으로 구분한다.
      const validated = validateOracleConsultationInput(body);
      if (!validated.ok) {
        return json({
          ok: false,
          code: "ORACLE_CONSULTATION_INVALID_INPUT",
          reason: validated.reason || "",
          message: "카드 정보를 확인하지 못했습니다. 카드를 다시 뽑아 주세요.",
          retryable: false,
        }, { status: 400 });
      }

      const access = await verifyOracleConsultationAccess(request, env, body);
      if (!access.ok) {
        return json(
          {
            ok: false,
            code: access.code || "ORACLE_CONSULTATION_PAYMENT_NOT_VERIFIED",
            reason: access.reason || "",
            message: access.message,
            // 결제 증빙 지연(402)·인프라 장애(503)는 시간이 지나면 풀리므로 재시도 대상이다.
            // 인증 실패는 로그인을 다시 해야 하므로 아니다.
            retryable: access.status !== 401 && access.status !== 403,
          },
          { status: access.status || 402 },
        );
      }

      // 🔴 재생성 한도. verifyPerUsePayment 는 읽기 전용이라 같은 requestId 로 몇 번이든 통과한다
      // (worker/lib/nakshatra-paid-access.js). 무과금 재시도 버튼과 짝이 되는 상한이 없으면
      // 결제 1회로 Gemini 를 무제한 호출할 수 있다.
      const consultationRetryKey = `${access.auth?.userId || "anon"}:${asText(body?.requestId) || "no-request-id"}`;
      const withinRetryBudget = await checkOracleConsultationRetryBudget(env, consultationRetryKey);
      if (!withinRetryBudget) {
        return json({
          ok: false,
          code: "ORACLE_CONSULTATION_RETRY_LIMIT",
          reason: "retry_budget_exhausted",
          message: "이 상담의 재생성 횟수를 모두 사용했습니다. 아래 프롬프트를 복사해 사용해 주세요.",
          accessVerified: true,
          retryable: false,
        }, { status: 429 });
      }

      // 🔴 지연 import — 정적으로 걸면 이 라우트 모듈 그래프에 llm-client 체인과 models.js 가
      // 딸려와, models.js 를 부분 mock 하는 다른 타로 라우트 테스트들이 통째로 죽는다
      // (rate-limit.js 를 정적으로 걸었다가 같은 일을 겪고 되돌렸다).
      const consultationLocale = asText(body?.locale) || "ko";
      const { createOracleConsultationLlm } = await import("../lib/tarot-oracle-llm.js");
      const result = await generateOracleConsultation(body, {
        env,
        fetchImpl: globalThis.fetch,
        locale: consultationLocale,
        // 정본 경로(Gemini → Workers AI 폴백 체인)를 주입한다. 목표 분량은 폴백 응답이 너무
        // 짧을 때 거절할 문턱(fallbackMinChars)을 카드 수에 비례시키는 데 쓰인다.
        callJson: createOracleConsultationLlm(env, {
          locale: consultationLocale,
          requestId: asText(body?.requestId),
          targetChars: resolveOracleConsultationTargetChars(validated.data.cards.length, env),
        }),
      });
      // Gemini 실패는 결제를 되돌리지 않는다(이미 검증된 회당결제 증빙 기반) — 대신 클라이언트가
      // 기존 "생성된 프롬프트" 폴백 화면으로 저하할 수 있게 ok:false + reason 만 돌려준다.
      if (!result.ok) {
        const reason = result.reason || "";
        // 설정 누락과 안전 차단은 같은 입력으로 다시 불러도 결과가 같다 — 재시도 버튼을 띄우지 않는다.
        const permanent = reason === "missing_config" || reason.startsWith("blocked_");
        return json({
          ok: false,
          code: "ORACLE_CONSULTATION_GENERATION_FAILED",
          reason,
          message: "AI 상담 생성에 실패했습니다. 아래 프롬프트를 복사해 다른 AI에 붙여넣어 보세요.",
          accessVerified: true,
          retryable: !permanent,
        }, { status: 502 });
      }
      return json({
        ok: true,
        consultation: result.consultation,
        source: result.source,
        accessVerified: true,
        accessSource: access.evidence?.source || "auth",
      });
    }

    // 🔴 연간 리딩(십이지신 천운 타로)은 아래 requireYearTarotAccess 가 곧바로 다시 인증한다.
    // auth 에는 요청 단위 메모이제이션이 없어(worker/lib/auth.js) 여기서 한 번 더 부르면 User 조회와
    // admission 슬롯을 그대로 두 배로 먹는다. 동작은 같다 — 지금도 /reading 은 isDeterministicReading
    // 이라 401/403 이 아닌 인증 오류를 여기서 삼키고, 곧바로 requireYearTarotAccess 가 같은 오류를
    // 다시 던진다. 401/403 은 어느 쪽에서 던지든 결과가 동일하다.
    const isYearReadingRequest = path === "/reading"
      && normalizeSpreadType(body?.spreadType || "one_card") === "yearly_twelve_card";

    // Mindscan reading is finalized by coin-gate and must not fail at result generation
    // due to auth token drift between runtime environments.
    // /draw is a free stateless random card draw (no DB/cost) — requiring auth here
    // blocked logged-out users from ever reaching the card stage on static tarot pages.
    // 🔴 `/crystal-soul` 과 `/ijik-reading` 은 여기서 빼 둔다 — 자기 게이트
    //    (verifyTarotPerUseAccess)가 인증과 결제 증빙을 함께 보므로, 여기서 한 번 더 부르면
    //    같은 요청에 requireAuth Mongo 왕복이 두 번 돈다(중첩 사전검사). 인증의 주인은 그 게이트다.
    //    `/mindscan` 도 원래 여기서 빠져 있었는데 예전에는 **아무도** 인증을 안 봤다 —
    //    2026-08-24 감사에서 발견해 자기 게이트를 달았다.
    if (path !== "/mindscan" && path !== "/crystal-soul" && path !== "/ijik-reading"
      && path !== "/draw" && !isYearReadingRequest) {
      try {
        await requireAuth(request, env);
      } catch (authErr) {
        // reunion(/reading)·love(/love-reading) 결과는 LLM 없이 결정적으로 계산되고
        // 서버 비용/신원 의존이 없다(결제는 클라이언트 코인 게이트가 담당). 따라서 일시적
        // DB 인프라 블립으로 requireAuth가 실패해도 카드 해석 생성을 막지 않는다 — 확정
        // 인증 실패(401/403)만 차단한다. mindscan이 auth를 아예 스킵하는 것과 같은 취지로,
        // DB 풀 초기화 순간 좀비 웜커넥션이 만든 503/timeout이 결과를 통째로 죽이던 문제 해소.
        const authStatus = authErr && authErr.status;
        const isDeterministicReading = path === "/reading" || path === "/love-reading";
        if (!isDeterministicReading || authStatus === 401 || authStatus === 403) {
          throw authErr;
        }
      }
    }

    if (path === "/draw") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const year = resolveYearValue(body?.year);
      const drawnCards = spreadType === "yearly_twelve_card" && asText(body?.seed)
        ? drawPremiumYearCards({ seed: asText(body.seed), year })
        : drawTarotCardsForSpread(spreadType);
      return json({ ok: true, spreadType, cards: drawnCards });
    }

    if (path === "/reading") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const category = asText(body?.category) || "general";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const isYearReading = spreadType === "yearly_twelve_card";
      let yearAccess = null;
      let year = null;
      let requestId = "";
      let existingYearRecord = null;

      if (isYearReading) {
        // 🔴 결제 증빙 조회의 열쇠라 게이트보다 **먼저** 확정한다. 예전에는 게이트 뒤에서 만들어
        //    게이트가 그 값을 쓸 수 없었고, 그래서 "산 적 있는가"로만 물었다.
        year = resolveYearValue(body?.year);
        requestId = resolveYearRequestId(body, year, cards);
        yearAccess = await requireYearTarotAccess(request, env, requestId);
        if (!yearAccess.ok) return yearAccess.response;
        const existing = await withMongoRetry(env, () => PaidExecutionRecord.findOne({
          userId: asText(yearAccess.auth.userId),
          featureId: YEAR_TAROT_FEATURE_KEY,
          requestId,
        }).lean(), YEAR_TAROT_DB_OPTIONS);
        existingYearRecord = existing || null;
        if (existing?.status === "completed") return json(publicYearResult(existing));
        if (existing?.status === "generating") {
          return json({
            ok: true,
            status: "generating",
            resultId: asText(existing.resultId),
            year,
            message: "이미 연간 리딩을 정리하고 있습니다. 잠시 후 저장된 결과를 확인해 주세요.",
          }, { status: 202 });
        }
      }

      const payload = buildReadingPayload({
        spreadType,
        category,
        cards,
        serviceKey: asText(body?.serviceKey) || "tarot-reading",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
        year: isYearReading ? year : body?.year,
      });

      if (isYearReading) {
        // saveYearTarotResult 는 저장이 실패해도 던지지 않는다(degrade-not-throw) — 결제한 사용자는
        // 저장 여부와 무관하게 리딩을 받는다. 자세한 근거는 그 함수의 catch 주석 참고.
        const stored = await saveYearTarotResult({
          env,
          auth: yearAccess.auth,
          decision: yearAccess.decision,
          payload,
          year,
          requestId,
          existing: existingYearRecord,
        });
        if (stored.status === "generating") {
          return json({
            ok: true,
            status: "generating",
            resultId: asText(stored.record?.resultId),
            year,
            message: "이미 연간 리딩을 정리하고 있습니다. 잠시 후 저장된 결과를 확인해 주세요.",
          }, { status: 202 });
        }
        return json(stored.payload);
      }

      return json(payload);
    }

    if (path === "/love-reading") {
      const spreadType = "relationship_six_card";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category: "love",
        cards,
        serviceKey: "tarot-love-relationship",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      payload.reading = normalizeLoveReadingPayload(payload?.reading, payload?.cards || []);
      // LLM 상담문 생성 — 실패 시 위에서 만든 로컬 리딩이 그대로 폴백으로 나간다(degrade-not-throw).
      const enhanced = await enhanceLoveReadingWithLlm(payload.reading, {
        locale: getAmbientAiLocale() || "ko",
        env,
        userQuestion: asText(body?.userQuestion),
      });
      payload.reading = enhanced.reading;
      payload.readingSource = enhanced.source;
      payload.consultingHighlights = buildLoveConsultingHighlights(payload.reading);
      payload.isRelationshipReading = true;
      payload.api = "love-reading";
      return json(payload);
    }

    // 🔴 2026-08-24 이전에는 이 엔드포인트에 인증도 결제 확인도 없었다. 클라이언트가
    //    `ensurePaidAccess` 로 결제를 마친 뒤 부르긴 했지만 서버는 그것을 확인하지 않았고,
    //    requestId 도 넘겨받지 못했다 — 즉 결제 없이 직접 POST 하면 유료 리딩이 그대로 나왔다.
    if (path === "/crystal-soul") {
      const access = await verifyTarotPerUseAccess(request, env, body, {
        featureKey: CRYSTAL_SOUL_FEATURE_KEY,
        minCost: CRYSTAL_SOUL_MIN_COST,
        codePrefix: "CRYSTAL_SOUL",
        reason: "크리스탈 소울 타로 리딩",
        authMessage: "로그인 후 리딩을 확인할 수 있습니다.",
        retryHint: "리딩 보기 버튼으로 결제를 완료한 뒤 다시 시도해 주세요.",
      });
      if (!access.ok) {
        return json(
          {
            ok: false,
            code: access.code || "CRYSTAL_SOUL_PAYMENT_NOT_VERIFIED",
            reason: access.reason || "",
            message: access.message,
          },
          { status: access.status || 402 },
        );
      }

      if (body?.crystalSoulVersion === "gem-v3" || body?.promptVersion === "crystal-soul-v3") {
        return json(buildCrystalSoulV3Reading(body));
      }
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      if (!cards.length) {
        return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
      }
      const crystal = await buildCrystalSoulReading(body, env);
      return json({
        ok: true,
        source: "worker/routes/tarot.js",
        readingSource: crystal.source,
        model: crystal.model,
        reading: crystal.reading,
        readingData: crystal.readingData,
        validation: crystal.validation,
      });
    }

    // 🔴 여기는 **Gemini 를 직접 부른다**. 2026-08-24 이전에는 인증도 결제 확인도 없어서,
    //    유료 리딩이 공짜로 나가는 것에 더해 누구나 LLM 비용을 태울 수 있는 구멍이었다.
    if (path === "/mindscan") {
      const access = await verifyTarotPerUseAccess(request, env, body, {
        featureKey: MINDSCAN_FEATURE_KEY,
        minCost: MINDSCAN_MIN_COST,
        codePrefix: "MINDSCAN",
        reason: "마인드스캔 타로 리딩",
        authMessage: "로그인 후 리딩을 확인할 수 있습니다.",
        retryHint: "리딩 보기 버튼으로 결제를 완료한 뒤 다시 시도해 주세요.",
      });
      if (!access.ok) {
        return json(
          {
            ok: false,
            code: access.code || "MINDSCAN_PAYMENT_NOT_VERIFIED",
            reason: access.reason || "",
            message: access.message,
          },
          { status: access.status || 402 },
        );
      }

      const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
      const question = String(body?.question || "").trim();
      if (!pairs.length) {
        return json({ ok: false, message: "카드 페어 데이터가 필요합니다." }, { status: 400 });
      }

      if (!question) {
        return json({ ok: false, message: "상담 질문이 필요합니다." }, { status: 400 });
      }

      const reading = await buildMindscanReadingPayload(pairs, { question, env, locale: getAmbientAiLocale() || "ko" });
      if (!reading?.ok) {
        return json(
          {
            ok: false,
            message: reading?.message || "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
          },
          { status: 422 },
        );
      }
      return json(reading);
    }

    return notFound();
  } catch (error) {
    const mapped = mapInterpretationErrorToHttp(error);
    if (mapped) return mapped;
    // context 를 넘겨야 응답과 로그에 requestId·경로가 남는다. 없이 부르던 동안에는 500 이 떠도
    // 브라우저에도 로그에도 "Internal server error." 한 줄뿐이라 어느 경로가 터졌는지 특정할 수 없었다.
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/tarot", method: request?.method || "" },
    });
  }
}
