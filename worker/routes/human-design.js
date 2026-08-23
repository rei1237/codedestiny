// 휴먼 디자인 바디그래프 — 회당 결제(human-design-chart, 100코인 = ₩10,000) 배달 라우트.
//
//   POST /api/human-design/chart   : 출생 데이터 → 26 activation → BodyGraph → 핵심 판정
//
// 계약 (정본 템플릿: worker/routes/nakshatra-premium.js 의 택일/VVIP 통합서)
// ─────────────────────────────────────────────────────────────────────────────
// 🔒 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등)은 공용 결제 게이트가 이미 수행한다.
//    여기서 pass 판정을 다시 하지 않는다 — 이중 게이팅(원칙 6)이 되어 엔타이틀먼트 기록 없이
//    본문이 새거나 두 판정이 어긋난다.
// 🔴 canAccessPaidFeature 로 관문을 세우지 않는다. 그 함수는 엔티틀먼트 전용이라 회당결제
//    키에는 언제나 PAYMENT_REQUIRED 를 돌려주고, 이미 차감된 사용자가 402 를 맞아 돈만 나간다.
//
// 재열람
// ─────────────────────────────────────────────────────────────────────────────
// 차트는 같은 출생 데이터면 항상 같은 결과다. 그래서 (userId, inputHash, calculationVersion)
// 조합의 저장 문서가 있으면 **재결제 없이** 그대로 돌려준다(sukuyo-past-life-reading 의
// 아카이브와 같은 계약). 🔴 영구 해금이 아니다 — 출생 데이터가 다르면 새 결제다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { HumanDesignCalculation, HumanDesignInterpretation } from "../lib/models.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { calculateHumanDesignChart } from "../lib/human-design-ephemeris.js";
import { CALCULATION_VERSION } from "../../lib/human-design/version.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import {
  HD_AI_FALLBACK_MIN_CHARS,
  HD_AI_MIN_RESULT_CHARS,
  HD_AI_SECTIONS,
  HUMAN_DESIGN_AI_PROMPT_VERSION,
  buildHumanDesignAIPrompt,
  validateHumanDesignInterpretation,
} from "../lib/human-design-ai-prompt.js";

// 레지스트리(worker/lib/paid-feature-registry.js) 등록값과 일치해야 한다.
// 🔴 scripts/verify-human-design.mjs 가 이 셋의 정합성을 강제한다.
const FEATURE_KEY = "human-design-chart";
const COIN_PRICE = 100;
const AMOUNT_KRW = 10000;

// 🔴 1단계는 관측 전용이다 — 증빙 결과를 로그로만 남기고 아무것도 막지 않는다.
//    차단(402)은 실사용 로그에서 정상 결제 경로가 전부 proven:true 로 찍히는 것을 확인한 뒤 켠다.
//    이 순서를 지키는 이유: 검증이 과하면 이미 결제한 사용자가 402 를 맞아 돈만 나간다.
//    (nakshatra-premium.js 의 PER_USE_ENFORCE 와 같은 계약)
const PER_USE_ENFORCE = false;

const MESSAGES = Object.freeze({
  login: "로그인이 필요합니다.",
  invalidInput: "생년월일·태어난 시각·타임존을 정확히 입력해 주세요.",
  failed: "휴먼 디자인 차트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
  degraded: "잠시 접속이 불안정합니다. 잠시 후 다시 시도해 주세요.",
  ephemeris: "천문 계산 엔진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  aiFailed: "해석을 만들지 못했습니다. 차트는 그대로 있으니 잠시 후 '다시 시도'를 눌러 주세요.",
});

function degraded() {
  return json(
    { ok: false, retryable: true, reason: "TEMPORARILY_UNAVAILABLE", message: MESSAGES.degraded },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function clean(value, max = 120) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 요청 본문 → 계산 입력.
 *
 * 🔴 위도·경도는 계산에 쓰이지 않는다. 휴먼 디자인 바디그래프는 하우스·상승궁을 쓰지 않아
 *    장소가 아니라 타임존만 결과를 바꾼다. 그래도 입력 기록으로 남긴다.
 */
function normalizeBirthBody(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : source;
  const calendarRaw = clean(birth.calendar || birth.calendarType || "solar", 20).toLowerCase();
  const isLunar = calendarRaw.includes("lun") || calendarRaw.includes("음");
  const isLeap = calendarRaw.includes("leap") || String(birth.calendar || "").includes("윤") || birth.isLeapMonth === true;

  const latitude = Number(birth.latitude ?? birth.lat);
  const longitude = Number(birth.longitude ?? birth.lon ?? birth.lng);

  return {
    birthDate: clean(birth.birthDate || birth.date, 10),
    birthTime: clean(birth.birthTime || birth.time, 5),
    timezone: clean(birth.timezone || birth.tz, 80),
    calendar: isLunar ? (isLeap ? "lunar-leap" : "lunar") : "solar",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    city: clean(birth.city, 100),
    country: clean(birth.country, 100),
  };
}

function isValidBirth(input) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)
    && /^\d{1,2}:\d{2}$/.test(input.birthTime)
    && input.timezone.length > 0;
}

/**
 * 재열람 판정 키. 🔴 계산 버전을 포함해야 엔진이 바뀐 뒤 옛 결과를 그대로 내주지 않는다.
 * 좌표는 결과를 바꾸지 않으므로 해시에 넣지 않는다 — 넣으면 같은 차트에 재결제를 요구하게 된다.
 */
function inputHashSource(input) {
  return [input.birthDate, input.birthTime, input.timezone, input.calendar, CALCULATION_VERSION].join("|");
}

async function observePerUsePayment(env, auth, body) {
  try {
    const proof = await verifyPerUsePayment(env, {
      userId: auth?.userId,
      featureKey: FEATURE_KEY,
      coinPrice: COIN_PRICE,
      requestId: clean(body?.requestId || body?.idempotencyKey, 180),
    });
    logPerUsePaymentProof(FEATURE_KEY, proof);
    return proof;
  } catch (error) {
    // 🔴 증빙 확인이 터져도 결제한 사용자의 본문을 막지 않는다 — 관측 단계에서 500 을 새로
    //    만드는 것은 고치려던 문제보다 나쁘다. 차단을 켤 때도 이 경로는 "판단 보류"로 남는다.
    logPerUsePaymentProof(FEATURE_KEY, { proven: null, source: "", reason: "VERIFY_THREW" });
    console.error("[human-design-paid-access] verify failed", String(error?.message || error).slice(0, 200));
    return { proven: null, source: "", reason: "VERIFY_THREW" };
  }
}

/** 저장된 차트를 찾는다. DB 가 흔들려도 본문을 막지 않으므로 실패는 null 로 접는다. */
async function findArchivedChart(userId, inputHash) {
  try {
    await connectDb();
    return await withMongoRetry(() => HumanDesignCalculation.findOne({
      userId,
      inputHash,
      calculationVersion: CALCULATION_VERSION,
    }).lean());
  } catch (error) {
    console.error("[human-design] archive lookup failed", String(error?.message || error).slice(0, 200));
    return null;
  }
}

/** 아카이브 기록. 실패해도 사용자에게는 차트를 준다(결제는 이미 끝났다). */
async function archiveChart(doc) {
  try {
    await connectDb();
    await withMongoRetry(() => HumanDesignCalculation.updateOne(
      { userId: doc.userId, idempotencyKey: doc.idempotencyKey },
      { $setOnInsert: doc },
      { upsert: true },
    ));
    return true;
  } catch (error) {
    console.error("[human-design] archive write failed", String(error?.message || error).slice(0, 200));
    return false;
  }
}

/**
 * 로딩 화면이 쓸 **실측** 단계 시간. 가짜 진행률을 만들지 않기 위해(요구사항 22)
 * 각 단계의 소요 ms 를 재서 그대로 돌려준다.
 */
function createStageTimer(now) {
  const stages = [];
  let last = now();
  return {
    mark(stage) {
      const at = now();
      stages.push({ stage, ms: Math.max(0, Math.round(at - last)) });
      last = at;
    },
    stages,
  };
}

async function handleChart(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const now = () => Date.now();
  const timer = createStageTimer(now);
  const inputHash = await sha256Hex(inputHashSource(input));
  timer.mark("BIRTH_DATA");

  // 같은 출생 데이터를 다시 열면 재결제 없이 저장본을 준다.
  const archived = await findArchivedChart(auth.userId, inputHash);
  if (archived?.calculation) {
    timer.mark("ARCHIVE_HIT");
    return json(
      { ok: true, featureKey: FEATURE_KEY, reused: true, chart: archived.calculation, pipeline: timer.stages },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const proof = await observePerUsePayment(env, auth, body);
  if (PER_USE_ENFORCE && proof) {
    if (proof.proven === null) return degraded();
    if (proof.proven === false) {
      return json(
        { ok: false, reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY, coinPrice: COIN_PRICE, amountKRW: AMOUNT_KRW },
        { status: 402 },
      );
    }
  }
  timer.mark("PAYMENT_PROOF");

  let chart;
  try {
    chart = await calculateHumanDesignChart(env, input, {
      requestUrl: request.url,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = String(error?.message || error);
    console.error("[human-design] calculation failed", message.slice(0, 300));
    if (/wasm|ephemer|swiss/i.test(message)) {
      return json({ ok: false, retryable: true, reason: "EPHEMERIS_UNAVAILABLE", message: MESSAGES.ephemeris }, { status: 502 });
    }
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
  timer.mark("CHART");

  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 180) || `${FEATURE_KEY}:${inputHash}`;
  await archiveChart({
    id: `${FEATURE_KEY}:${auth.userId}:${inputHash}`,
    userId: auth.userId,
    profileId: clean(body?.profileId, 120),
    idempotencyKey,
    inputHash,
    birthInput: chart.birthInput,
    calculationVersion: chart.calculationVersion,
    ephemerisVersion: chart.ephemerisVersion,
    mappingVersion: chart.mappingVersion,
    nodeMode: chart.nodeMode,
    calculation: chart,
    designMomentUtc: chart.moments?.designUtc || "",
    hdType: chart.type,
    authority: chart.authority,
    profile: chart.profile,
    definition: chart.definition,
    accessType: "paid",
    accessSource: clean(proof?.source, 40),
    billingRequestId: clean(body?.requestId, 180),
    calculatedAt: new Date(),
  });
  timer.mark("ARCHIVE");

  return json(
    { ok: true, featureKey: FEATURE_KEY, reused: false, chart, pipeline: timer.stages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ── AI 해석 ──────────────────────────────────────────────────────────────────
//
// 🔴 **새 결제 키가 없다.** 접근 증빙은 "이 사용자의 계산 문서가 존재한다" 는 사실이고,
//    그 문서는 결제를 거쳐야만 생긴다. 차트와 해석은 같은 1회 결제로 열린다.
//    아카이브 write 가 실패해 문서가 없는 경우만 결제 증빙(requestId)으로 구제한다.
//
// 🔴 프롬프트에 출생 데이터를 싣지 않는다 — buildHumanDesignAIPrompt 가 계산 결과만 읽는다.

/** LLM 출력 토큰 예산. 한국어 6,000자 ≈ 6,000~7,000 토큰이라 여유를 둔다. */
const HD_AI_BASE_TOKENS = 9000;
const HD_AI_CAP_TOKENS = 14000;

function countBodyChars(sections, summary) {
  const bodyText = sections.map((section) => String(section?.body || "")).join("") + String(summary || "");
  return bodyText.replace(/\s+/g, "").length;
}

function normalizeInterpretationPayload(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 앞뒤 설명문이 섞인 경우를 대비해 첫 { ~ 마지막 } 만 잘라 한 번 더 시도한다.
    const start = String(raw).indexOf("{");
    const end = String(raw).lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      parsed = JSON.parse(String(raw).slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!parsed || !Array.isArray(parsed.sections)) return null;

  const byKey = new Map(parsed.sections
    .filter((section) => section && typeof section === "object")
    .map((section) => [String(section.key || "").trim(), section]));

  // 🔴 섹션 순서·키는 서버가 정본이다. 모델이 순서를 바꾸거나 키를 지어내도 여기서 고정된다.
  const sections = HD_AI_SECTIONS.map((spec) => {
    const found = byKey.get(spec.key);
    return {
      key: spec.key,
      title: String(found?.title || spec.title).trim().slice(0, 120),
      body: String(found?.body || "").trim(),
    };
  });
  return { sections, summary: String(parsed.summary || "").trim().slice(0, 4000) };
}

async function findArchivedInterpretation(userId, calculationId, locale) {
  try {
    await connectDb();
    return await withMongoRetry(() => HumanDesignInterpretation.findOne({
      userId,
      calculationId,
      promptVersion: HUMAN_DESIGN_AI_PROMPT_VERSION,
      locale,
    }).lean());
  } catch (error) {
    console.error("[human-design-ai] archive lookup failed", String(error?.message || error).slice(0, 200));
    return null;
  }
}

async function archiveInterpretation(doc) {
  try {
    await connectDb();
    await withMongoRetry(() => HumanDesignInterpretation.updateOne(
      { userId: doc.userId, calculationId: doc.calculationId, promptVersion: doc.promptVersion, locale: doc.locale },
      { $set: doc },
      { upsert: true },
    ));
    return true;
  } catch (error) {
    console.error("[human-design-ai] archive write failed", String(error?.message || error).slice(0, 200));
    return false;
  }
}

async function handleInterpretation(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const locale = clean(getAmbientAiLocale() || "ko", 10) || "ko";
  const inputHash = await sha256Hex(inputHashSource(input));

  // 접근 판정 — 결제로 생긴 계산 문서가 있어야 한다.
  let archived = await findArchivedChart(auth.userId, inputHash);
  let calculation = archived?.calculation || null;

  if (!calculation) {
    // 아카이브 write 가 실패했던 경우의 구제 지점. 결제 증빙이 있으면 차트를 다시 계산한다.
    // 🔴 클라이언트가 보낸 차트를 믿지 않는다 — 믿으면 누구나 무료로 AI 해석을 받는다.
    const proof = await observePerUsePayment(env, auth, body);
    if (!proof || proof.proven !== true) {
      return json(
        { ok: false, reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY, coinPrice: COIN_PRICE, amountKRW: AMOUNT_KRW },
        { status: 402 },
      );
    }
    try {
      calculation = await calculateHumanDesignChart(env, input, {
        requestUrl: request.url,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[human-design-ai] recalculation failed", String(error?.message || error).slice(0, 200));
      return json({ ok: false, retryable: true, reason: "EPHEMERIS_UNAVAILABLE", message: MESSAGES.ephemeris }, { status: 502 });
    }
    archived = { id: `${FEATURE_KEY}:${auth.userId}:${inputHash}` };
  }

  const calculationId = archived?.id || `${FEATURE_KEY}:${auth.userId}:${inputHash}`;

  const existing = await findArchivedInterpretation(auth.userId, calculationId, locale);
  if (existing?.status === "completed" && Array.isArray(existing.sections) && existing.sections.length) {
    return json(
      { ok: true, reused: true, interpretation: { sections: existing.sections, summary: existing.summary } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let built;
  try {
    built = buildHumanDesignAIPrompt({ calculation, userQuestion: body?.userQuestion });
  } catch (error) {
    // fail-closed — 계산 결과가 온전하지 않으면 모델에게 넘기지 않는다.
    console.error("[human-design-ai] prompt build refused", String(error?.message || error).slice(0, 200));
    return json({ ok: false, reason: "CALCULATION_INCOMPLETE", message: MESSAGES.failed }, { status: 500 });
  }

  const ai = await callGeminiJsonWithRetry(env, built.prompt, {
    systemPrompt: built.systemPrompt,
    baseTokens: HD_AI_BASE_TOKENS,
    capTokens: HD_AI_CAP_TOKENS,
    temperature: 0.85,
    taskType: "fortune",
    // 🔴 폴백을 켠 유료 라우트는 fallbackMinChars 가 필수다. 안 주면 8% 분량이
    //    정상 결제 결과로 전달되고 재시도·환불 경로가 사라진다.
    fallbackMinChars: HD_AI_FALLBACK_MIN_CHARS,
    logContext: { route: "human-design-ai", promptVersion: HUMAN_DESIGN_AI_PROMPT_VERSION },
  });

  if (!ai?.ok || !ai.text) {
    console.error("[human-design-ai] generation failed", String(ai?.error || "unknown"), String(ai?.message || "").slice(0, 200));
    return json({ ok: false, retryable: true, reason: "AI_UNAVAILABLE", message: MESSAGES.aiFailed }, { status: 503 });
  }

  const payload = normalizeInterpretationPayload(ai.text);
  if (!payload) {
    return json({ ok: false, retryable: true, reason: "AI_MALFORMED", message: MESSAGES.aiFailed }, { status: 503 });
  }

  const totalCharCount = countBodyChars(payload.sections, payload.summary);
  if (totalCharCount < HD_AI_MIN_RESULT_CHARS) {
    console.warn("[human-design-ai] too short", { totalCharCount, min: HD_AI_MIN_RESULT_CHARS });
    return json({ ok: false, retryable: true, reason: "AI_TOO_SHORT", message: MESSAGES.aiFailed }, { status: 503 });
  }

  // 🔴 사후 검산 — 모델이 자기가 계산한 값을 쓴 흔적이 있으면 저장하지 않는다.
  const factCheck = validateHumanDesignInterpretation(
    payload.sections.map((section) => section.body).join("\n") + "\n" + payload.summary,
    built.factSnapshot,
  );
  if (!factCheck.ok) {
    console.warn("[human-design-ai] fact check failed", factCheck.violations.slice(0, 3));
    return json({ ok: false, retryable: true, reason: "AI_FACT_MISMATCH", message: MESSAGES.aiFailed }, { status: 503 });
  }

  await archiveInterpretation({
    id: `${HUMAN_DESIGN_AI_PROMPT_VERSION}:${auth.userId}:${inputHash}:${locale}`,
    userId: auth.userId,
    calculationId,
    inputHash,
    calculationVersion: calculation.calculationVersion || CALCULATION_VERSION,
    promptVersion: HUMAN_DESIGN_AI_PROMPT_VERSION,
    locale,
    userQuestion: clean(body?.userQuestion, 600),
    sections: payload.sections,
    summary: payload.summary,
    totalCharCount,
    factCheck,
    status: "completed",
    llmMeta: { model: ai.model, provider: ai.provider, truncated: ai.truncated === true },
  });

  return json(
    { ok: true, reused: false, interpretation: { sections: payload.sections, summary: payload.summary } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleHumanDesignRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/human-design");
  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method === "POST" && path === "/chart") return await handleChart(request, env);
    if (method === "POST" && path === "/interpretation") return await handleInterpretation(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error instanceof HttpError) {
      // 401 을 BAD_REQUEST 로 세탁하지 않는다 — requireAuth 는 payload.error 를 싣지 않아
      // 그대로 두면 인증 실패가 "잘못된 요청"으로 보고된다.
      const reason = error.payload?.error || (error.status === 401 ? "LOGIN_REQUIRED" : "BAD_REQUEST");
      return json(
        { ok: false, reason, message: error.status === 401 ? MESSAGES.login : error.message },
        { status: error.status },
      );
    }
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) return degraded();
    console.error("[human-design]", String(error?.message || error).slice(0, 300));
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.failed }, { status: 500 });
  }
}

export const __humanDesignRouteTestUtils = {
  FEATURE_KEY,
  COIN_PRICE,
  AMOUNT_KRW,
  PER_USE_ENFORCE,
  normalizeBirthBody,
  isValidBirth,
  inputHashSource,
};
