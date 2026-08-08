import { buildGuardianFortuneContext, normalizeGuardianFortuneInput } from "./guardian-fortune-context.js";
import { isDbUnavailableError } from "./http.js";
import { generateGuardianFortuneWithConfiguredLLM } from "./guardian-fortune-llm.js";
import {
  createGuardianFortuneShareDraftToken,
  isGuardianFortuneShareEnabled,
} from "./guardian-fortune-share.js";
import {
  buildGuardianFortuneLimitCta,
  buildGuardianFortuneUsageStatus,
  commitGuardianFortuneUsage,
  GUARDIAN_FORTUNE_ERROR_CODES,
  getGuardianFortuneDateKey,
  releaseGuardianFortuneUsage,
  reserveGuardianFortuneUsage,
} from "./guardian-fortune-usage.js";

function safeErrorMessage(code) {
  switch (code) {
    case GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT:
      return "입력 내용을 한 번 확인해 주세요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED:
      return "첫 무료 상담을 이미 사용했어요. 로그인하면 3번까지 연이와 네오에게 물어볼 수 있어요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED:
      return "무료 상담을 모두 사용했어요. 1회 5,000원으로 이어서 물어볼 수 있어요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED:
      return "결제 내역을 확인하지 못했어요. 잠시 후 다시 시도해 주세요. 이미 결제하셨다면 차감되지 않습니다.";
    case GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED:
    case GUARDIAN_FORTUNE_ERROR_CODES.GENERATION_FAILED:
    case GUARDIAN_FORTUNE_ERROR_CODES.RESULT_INVALID:
      return "지금은 귀인이 흐름을 읽는 데 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED:
      return "상담 사용량을 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE:
      return "상담을 준비하는 중 연결이 잠시 끊겼어요. 잠시 후 다시 시도해 주세요. 횟수나 결제는 차감되지 않았어요.";
    default:
      return "오늘의 귀인 운세를 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }
}

function throwIfGuardianFortuneAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error("guardian_fortune_cancelled");
  error.code = GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED;
  throw error;
}

function errorResponse({ code, status, usage, isLoggedIn, requestId, retryable = false, details = undefined }) {
  return {
    ok: false,
    status,
    error: code,
    message: safeErrorMessage(code),
    requestId,
    usage,
    // 402(결제 필요)도 CTA 를 준다 — 클라이언트가 이 신호로 공용 결제 게이트를 연다.
    ...(status === 429 || status === 402 ? { cta: buildGuardianFortuneLimitCta(code, isLoggedIn) } : {}),
    ...(retryable ? { retryable: true } : {}),
    ...(details ? { details } : {}),
  };
}

function successResponse({ result, usage, generationSource, requestId, shareDraftToken }) {
  return {
    ok: true,
    status: 200,
    result,
    usage,
    generationSource,
    requestId,
    ...(shareDraftToken ? { shareDraftToken } : {}),
  };
}

export async function generateGuardianFortuneRequest({
  input = {},
  userId = "",
  guestIdHash = "",
  requestId,
  dateKey,
  store,
  // 무료 소진 뒤 회당 결제 증빙을 확인하는 콜백. 라우트가 verifyPerUsePayment 를 감싸 넘긴다.
  resolvePaidAccess,
  now = new Date(),
  contextBuilder = buildGuardianFortuneContext,
  mockGenerator,
  generator,
  contextOptions = {},
  scenario = "normal",
  abortSignal,
  onDelivery,
} = {}) {
  const normalizedUserId = String(userId || "").trim();
  const isLoggedIn = Boolean(normalizedUserId);
  const effectiveDateKey = dateKey || getGuardianFortuneDateKey(now);
  let normalizedInput;
  try {
    normalizedInput = normalizeGuardianFortuneInput(input, { now });
  } catch {
    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
    return errorResponse({
      code: GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT,
      status: 400,
      usage,
      isLoggedIn,
      requestId,
    });
  }

  const safeInput = { ...input, targetDate: effectiveDateKey };

  let reservation;
  try {
    reservation = await reserveGuardianFortuneUsage({
      userId: normalizedUserId,
      guestIdHash,
      dateKey: effectiveDateKey,
      requestId,
      store,
      resolvePaidAccess,
      now,
    });
  } catch (error) {
    // 예약은 아래 try 바깥이라, Mongo 가 흔들리면 raw 에러가 이 계약을 통째로 건너뛰고
    // 공용 핸들러의 영문 503("Database is temporarily unavailable.") 으로 나갔다. 아직 예약
    // 이전이라 되돌릴 것이 없으므로 재시도 가능한 한국어 503 으로 돌려준다.
    // usage 는 싣지 않는다 — 같은 장애에서 buildGuardianFortuneUsageStatus 도 다시 던진다.
    if (!isDbUnavailableError(error)) throw error;
    return errorResponse({
      code: GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE,
      status: 503,
      isLoggedIn,
      requestId,
      retryable: true,
    });
  }
  if (!reservation.ok) {
    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
    return errorResponse({
      code: reservation.errorCode,
      status: reservation.status || 409,
      usage,
      isLoggedIn,
      requestId,
      retryable: reservation.retryable === true,
    });
  }

  try {
    throwIfGuardianFortuneAborted(abortSignal);
    const contextResult = await contextBuilder(safeInput, { ...contextOptions, now });
    if (!contextResult?.ok) {
      await releaseGuardianFortuneUsage(reservation, { store, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED, now });
      const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
      return errorResponse({
        code: GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED,
        status: 502,
        usage,
        isLoggedIn,
        requestId,
      });
    }

    const availableSystems = Array.isArray(contextResult.context?.availableSystems)
      ? contextResult.context.availableSystems
      : [];
    if (availableSystems.length !== 1 || availableSystems[0] !== normalizedInput.category) {
      await releaseGuardianFortuneUsage(reservation, { store, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED, now });
      const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
      return errorResponse({
        code: GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED,
        status: 502,
        usage,
        isLoggedIn,
        requestId,
      });
    }

    throwIfGuardianFortuneAborted(abortSignal);
    const selectedGenerator = generator || mockGenerator || generateGuardianFortuneWithConfiguredLLM;
    const generated = await selectedGenerator({
      input: safeInput,
      context: contextResult.context,
      scenario,
      env: contextOptions?.env || {},
      requestId,
      userId: normalizedUserId,
      generationSource: reservation.source,
    });
    const isUndeliveredFallback = generated?.usedFallback && generated?.deliverable !== true;
    if (!generated || isUndeliveredFallback || !generated.result) {
      const code = generated?.errorCode === "MOCK_LLM_FAILURE"
        ? GUARDIAN_FORTUNE_ERROR_CODES.GENERATION_FAILED
        : GUARDIAN_FORTUNE_ERROR_CODES.RESULT_INVALID;
      await releaseGuardianFortuneUsage(reservation, { store, errorCode: code, now });
      const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
      return errorResponse({ code, status: 502, usage, isLoggedIn, requestId });
    }

    throwIfGuardianFortuneAborted(abortSignal);
    if (typeof onDelivery === "function") {
      await onDelivery({
        requestId,
        result: generated.result,
        generationSource: reservation.source,
      });
    }
    throwIfGuardianFortuneAborted(abortSignal);
    const committed = await commitGuardianFortuneUsage(reservation, { store, now });
    if (!committed.ok) {
      const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
      return errorResponse({
        code: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED,
        status: 503,
        usage,
        isLoggedIn,
        requestId,
      });
    }

    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
    let shareDraftToken;
    const shareEnv = contextOptions?.env || {};
    if (!contextOptions?.disableShare && isGuardianFortuneShareEnabled(shareEnv)) {
      try {
        shareDraftToken = await createGuardianFortuneShareDraftToken({
          env: shareEnv,
          requestId,
          mode: normalizedInput.mode,
          topic: normalizedInput.topic,
          locale: normalizedInput.locale,
          result: generated.result,
          now,
        });
      } catch {
        // Sharing is an optional post-generation capability. Never fail or consume
        // a successful fortune generation because token signing is unavailable.
      }
    }
    return successResponse({ result: generated.result, usage, generationSource: reservation.source, requestId, shareDraftToken });
  } catch (error) {
    const code = error?.code === GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED
      ? GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED
      : GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR;
    await releaseGuardianFortuneUsage(reservation, { store, errorCode: code, now }).catch(() => {});
    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now }).catch(() => null);
    return errorResponse({
      code,
      status: code === GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED ? 499 : 500,
      usage,
      isLoggedIn,
      requestId,
    });
  }
}

export { safeErrorMessage };
