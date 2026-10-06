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
// 🔴 무료지만 **로그인은 필요하다**. 유료 리포트 소유권과 계산 레이트리밋에 계정을 쓴다.
// 🔴 무료가 되면 Swiss Ephemeris WASM 계산이 무과금 CPU 가 된다. 그래서 **실제 계산 직전에만**
//    사용자당 레이트리밋을 건다(정본: worker/routes/destiny-compass.js 의 아이솔레이트 버킷).
//    무료 차트 결과는 응답으로만 전달하고 서버에 저장하지 않는다.
//
// 🔴 /interpretation 은 왜 은퇴했나
// ─────────────────────────────────────────────────────────────────────────────
// 이 라우트의 유일한 관문은 "이 사용자의 계산 문서가 존재한다" 였다. 차트가 무료가 되면 그
// 문서를 누구나 만들 수 있으므로 그 관문은 관문이 아니게 된다. 생성 경로를 남긴 채 차트만
// 무료로 풀면 AI 해석이 통째로 무료로 열린다. 그래서 무료화와 같은 배포에서 생성을 끊었다.
// 이미 결제해 저장된 해석은 계속 읽힌다(아래 handleInterpretation).
//
// 차트는 같은 출생 데이터면 항상 같은 결과다. 유료 리포트는 결제 확인 후 자체 계산한다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { HumanDesignInterpretation } from "../lib/models.js";
import { calculateHumanDesignChart } from "../lib/human-design-ephemeris.js";
// 🔴 입력 정규화와 inputHash 는 유료 리포트 라우트와 **같은 것**을 써야 한다.
//    리포트가 이 해시로 계산 문서를 찾기 때문이다(worker/lib/human-design-birth-input.js 주석).
import { clean, inputHashSource, isValidBirth, normalizeBirthBody, sha256Hex } from "../lib/human-design-birth-input.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { HUMAN_DESIGN_AI_PROMPT_VERSION } from "../lib/human-design-ai-prompt.js";

// 🔴 무과금 WASM 계산 보호. 실제 계산 직전에만 센다.
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

  // 🔴 AUTH 는 아카이브 히트에도 3.1s 를 먹는 최대 구간인데(2026-08-30 스테이징 실측, 중앙값
  //    3122ms), pipeline 은 그 합계만 알려 준다. authTimings 가 그 안을 세 축으로 쪼갠다:
  //    어느 분기가 인증을 성사시켰나(path) / Mongo 왕복이 admission·connect·op 중 어디서 샜나 /
  //    재시도를 돌았나(attempts). 뒤 두 축은 worker/lib/db.js 의 기존 timings 싱크가 채운다.
  //    응답에만 싣고 화면에는 그리지 않는다 — pipeline 줄은 이미 사용자에게 보인다.
  const authTimings = {};
  const auth = await requireAuth(request, env, { authTimings });
  timer.mark("AUTH");
  const body = await readJson(request);
  const input = normalizeBirthBody(body);
  if (!isValidBirth(input)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 400 });
  }

  const inputHash = await sha256Hex(inputHashSource(input));
  timer.mark("BIRTH_DATA");

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

  return json(
    { ok: true, free: true, reused: false, inputHash, chart, pipeline: timer.stages, authDetail: authTimings },
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

// 과거 유료 해석의 calculationId 연결을 유지한다.
const ARCHIVE_ID_PREFIX = "human-design-chart";
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
