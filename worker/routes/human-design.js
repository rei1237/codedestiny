// 휴먼 디자인 바디그래프 — **무료** 배달 라우트 (2026-09 무료화).
//
//   POST /api/human-design/chart          : 출생 데이터 → 26 activation → BodyGraph → 핵심 판정
//   POST /api/human-design/interpretation : 🔴 은퇴. 저장된 옛 해석의 **읽기 전용** 창구
//
// 계약
// ─────────────────────────────────────────────────────────────────────────────
// 🔴 차트는 무료다. 과금 지점은 프리미엄 리포트(featureKey `human-design-report`)로 옮겼고,
//    그 라우트는 worker/routes/human-design-report.js 가 따로 갖는다. 여기에 결제 검사를
//    되살리지 말 것 — 무료 계약은 scripts/verify-human-design.mjs 가 강제한다.
// 🔴 무료지만 **로그인은 필요하다**. 아카이브 키가 userId 이고, 결과를 다시 열거나 리포트로
//    이어가려면 계정이 있어야 한다.
// 🔴 무료가 되면 Swiss Ephemeris WASM 계산이 무과금 CPU 가 된다. 그래서 **실제 계산 직전에만**
//    사용자당 레이트리밋을 건다(정본: worker/routes/destiny-compass.js 의 아이솔레이트 버킷).
//    아카이브 히트는 계산이 아니므로 세지 않는다 — 재열람을 벌주지 않기 위해서다.
//
// 🔴 /interpretation 은 왜 은퇴했나
// ─────────────────────────────────────────────────────────────────────────────
// 이 라우트의 유일한 관문은 "이 사용자의 계산 문서가 존재한다" 였다. 차트가 무료가 되면 그
// 문서를 누구나 만들 수 있으므로 그 관문은 관문이 아니게 된다. 생성 경로를 남긴 채 차트만
// 무료로 풀면 AI 해석이 통째로 무료로 열린다. 그래서 무료화와 같은 배포에서 생성을 끊었다.
// 이미 결제해 저장된 해석은 계속 읽힌다(아래 handleInterpretation).
//
// 재열람
// ─────────────────────────────────────────────────────────────────────────────
// 차트는 같은 출생 데이터면 항상 같은 결과다. (userId, inputHash, calculationVersion) 조합의
// 저장 문서가 있으면 재계산 없이 그대로 돌려준다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { HumanDesignCalculation, HumanDesignInterpretation } from "../lib/models.js";
import { calculateHumanDesignChart } from "../lib/human-design-ephemeris.js";
import { CALCULATION_VERSION } from "../../lib/human-design/version.js";
// 🔴 입력 정규화와 inputHash 는 유료 리포트 라우트와 **같은 것**을 써야 한다.
//    리포트가 이 해시로 계산 문서를 찾기 때문이다(worker/lib/human-design-birth-input.js 주석).
import { clean, computeInputHash, inputHashSource, isValidBirth, normalizeBirthBody, sha256Hex } from "../lib/human-design-birth-input.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { HUMAN_DESIGN_AI_PROMPT_VERSION } from "../lib/human-design-ai-prompt.js";

// 🔴 결제 키가 아니라 **아카이브 문서 id 접두사**다. 무료화 전 결제 키와 같은 문자열을 쓰는
//    이유는 이미 저장된 문서의 id 를 그대로 이어받기 위해서이고, 바꾸면 옛 아카이브가 고아가 된다.
//    결제에는 쓰이지 않는다 — 리포트의 결제 키는 human-design-report 이고 다른 파일에 있다.
const ARCHIVE_ID_PREFIX = "human-design-chart";

// 🔴 무과금 WASM 계산 보호. 실제 계산 직전에만 세므로 아카이브 재열람은 영향받지 않는다.
const CALC_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CALC_RATE_LIMIT_MAX = 20;
const calcBuckets = new Map();

/** 사용자당 계산 횟수 버킷. 아이솔레이트 로컬이라 완벽한 상한이 아니라 남용 완충이다. */
function allowCalculation(userId) {
  const key = String(userId || "anonymous").slice(0, 80);
  const now = Date.now();
  const current = calcBuckets.get(key);
  if (!current || current.resetAt <= now) {
    calcBuckets.set(key, { count: 1, resetAt: now + CALC_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= CALC_RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
}

const MESSAGES = Object.freeze({
  login: "로그인이 필요합니다.",
  invalidInput: "생년월일·태어난 시각·타임존을 정확히 입력해 주세요.",
  failed: "휴먼 디자인 차트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
  degraded: "잠시 접속이 불안정합니다. 잠시 후 다시 시도해 주세요.",
  ephemeris: "천문 계산 엔진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  rateLimited: "짧은 시간에 너무 많은 차트를 만들었습니다. 잠시 후 다시 시도해 주세요.",
  retired: "이 해석은 프리미엄 리포트로 옮겨졌습니다. 리포트에서 더 자세한 분석을 받아 보세요.",
});

function degraded() {
  return json(
    { ok: false, retryable: true, reason: "TEMPORARILY_UNAVAILABLE", message: MESSAGES.degraded },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * 저장된 차트를 찾는다. DB 가 흔들려도 본문을 막지 않으므로 실패는 null 로 접는다.
 *
 * 🔴 withMongoRetry 는 (env, operation) 순서다. 콜백을 첫 인자로 넘기면 operation 이 undefined 가
 *    되어 TypeError 가 나고, 아래 catch 가 그걸 삼켜 "DB 장애처럼 보이는 영구 실패"가 된다.
 *    2026-09 이전까지 이 파일 4곳이 전부 그 상태였고 아카이브가 한 번도 동작하지 않았다.
 *    재발 방지는 scripts/verify-no-nested-retry.mjs 가 레포 전역으로 막는다.
 */
async function findArchivedChart(env, userId, inputHash) {
  try {
    await connectDb(env);
    return await withMongoRetry(env, () => HumanDesignCalculation.findOne({
      userId,
      inputHash,
      calculationVersion: CALCULATION_VERSION,
    }).lean());
  } catch (error) {
    console.error("[human-design] archive lookup failed", String(error?.message || error).slice(0, 200));
    return null;
  }
}

/** 아카이브 기록. 실패해도 사용자에게는 차트를 준다 — 저장은 부가 기능이다. */
async function archiveChart(env, doc) {
  try {
    await connectDb(env);
    await withMongoRetry(env, () => HumanDesignCalculation.updateOne(
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
  // 🔴 타이머를 인증 **앞에서** 만든다. 2026-08-30 까지는 auth·본문 파싱이 끝난 뒤에 시작해
  //    "차트가 느리다"는 신고를 받아도 그 구간이 pipeline 에 아예 없었다. 재지 않은 구간은
  //    없는 구간이 아니다.
  const now = () => Date.now();
  const timer = createStageTimer(now);

  const auth = await requireAuth(request, env);
  timer.mark("AUTH");
  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const inputHash = await sha256Hex(inputHashSource(input));
  timer.mark("BIRTH_DATA");

  // 같은 출생 데이터를 다시 열면 재계산 없이 저장본을 준다.
  const archived = await findArchivedChart(env, auth.userId, inputHash);
  if (archived?.calculation) {
    timer.mark("ARCHIVE_HIT");
    return json(
      // 🔴 inputHash 를 함께 내보낸다. 프리미엄 리포트 화면이 **결제창을 띄우기 전에**
      //    "이 차트로 이미 산 리포트가 있는가" 를 /human-design-report/result?inputHash= 로
      //    물어봐야 하기 때문이다(요구 30·32 — 재열람에 AI 를 다시 부르지 않는다).
      //    본인 인증 요청에만 나가고 조회도 userId 로 묶여 있어 남의 해시를 알아도 쓸 데가 없다.
      { ok: true, free: true, reused: true, inputHash, chart: archived.calculation, pipeline: timer.stages },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 히트 경로는 위에서 ARCHIVE_HIT 으로 이미 쟀다. 미스 경로의 조회 비용은 여기서만 보인다 —
  // 안 재면 아래 CHART 에 섞여 들어가 "계산이 느리다"로 잘못 읽힌다.
  timer.mark("ARCHIVE_LOOKUP");

  // 🔴 여기서부터가 무과금 WASM 계산이다. 아카이브 히트는 위에서 이미 빠져나갔으므로
  //    이 상한은 "새 차트를 몇 개나 만들 수 있는가" 만 센다.
  if (!allowCalculation(auth.userId)) {
    return json(
      { ok: false, retryable: true, reason: "RATE_LIMITED", message: MESSAGES.rateLimited },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "600" } },
    );
  }

  let chart;
  try {
    chart = await calculateHumanDesignChart(env, input, {
      requestUrl: request.url,
      calculatedAt: new Date().toISOString(),
      // 계산 내부를 PERSONALITY / DESIGN_SEARCH / DESIGN 으로 쪼개 실측한다. 아래 CHART 는
      // 그 뒤에 남는 조립 구간이 된다.
      onStage: (stage) => timer.mark(stage),
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

  const idempotencyKey = clean(body?.idempotencyKey || body?.requestId, 180) || `${ARCHIVE_ID_PREFIX}:${inputHash}`;
  await archiveChart(env, {
    id: `${ARCHIVE_ID_PREFIX}:${auth.userId}:${inputHash}`,
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
    accessType: "free",
    accessSource: "free",
    billingRequestId: "",
    calculatedAt: new Date(),
  });
  timer.mark("ARCHIVE");

  return json(
    { ok: true, free: true, reused: false, inputHash, chart, pipeline: timer.stages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ── 옛 AI 해석 — 은퇴, 읽기 전용 ──────────────────────────
//
// 🔴 생성 경로는 2026-09 차트 무료화와 **같은 배포에서** 제거했다. 그전까지 이 라우트의
//    유일한 관문은 "이 사용자의 계산 문서가 존재한다" 였는데, 차트가 무료가 되면 그 문서를
//    누구나 만들 수 있어 관문이 사라진다. 생성을 남긴 채 차트만 풀면 AI 해석이 통째로
//    무료로 열린다. 둘을 쪼개면 그 사이 배포 창이 그대로 구멍이라 한 PR 에서 함께 처리한다.
//
// 남긴 것은 **이미 결제해 저장된 해석의 읽기**뿐이다. 새 분석은 프리미엄 리포트가 맡는다.

const REPORT_REPLACEMENT_PATH = "/api/human-design-report/start";

/**
 * 저장된 옛 해석을 찾는다.
 *
 * 🔴 실패를 null 로 접지 않는다 — 접으면 DB 장애가 "해석이 없음"(410)으로 세탁돼
 *    이미 결제한 사용자가 자기 결과를 영영 못 본다. 일시 장애는 라우터가 503 으로 바꾸고,
 *    그러면 클라이언트가 재시도한다.
 */
async function findArchivedInterpretation(env, userId, calculationId, locale) {
  await connectDb(env);
  return withMongoRetry(env, () => HumanDesignInterpretation.findOne({
    userId,
    calculationId,
    promptVersion: HUMAN_DESIGN_AI_PROMPT_VERSION,
    locale,
  }).lean());
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
  const calculationId = `${ARCHIVE_ID_PREFIX}:${auth.userId}:${inputHash}`;

  const existing = await findArchivedInterpretation(env, auth.userId, calculationId, locale);
  if (existing?.status === "completed" && Array.isArray(existing.sections) && existing.sections.length) {
    // 🔴 결제 게이트를 두지 않는다 — 본인이 이미 결제해 받은 결과를 다시 여는 것이다.
    return json(
      {
        ok: true,
        legacy: true,
        readOnly: true,
        reused: true,
        interpretation: { sections: existing.sections, summary: existing.summary },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return json(
    { ok: false, reason: "INTERPRETATION_RETIRED", replacement: REPORT_REPLACEMENT_PATH, message: MESSAGES.retired },
    { status: 410, headers: { "Cache-Control": "no-store" } },
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
  ARCHIVE_ID_PREFIX,
  CALC_RATE_LIMIT_MAX,
  normalizeBirthBody,
  isValidBirth,
  inputHashSource,
  allowCalculation,
};
