import { buildGuardianFortuneContext, normalizeGuardianFortuneInput } from "./guardian-fortune-context.js";
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
      return "첫 무료 상담을 이미 사용했어요. 로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS:
      return "오늘 이용 가능한 무료 상담을 모두 사용했어요. 대화권을 구매하면 더 물어볼 수 있어요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED:
    case GUARDIAN_FORTUNE_ERROR_CODES.GENERATION_FAILED:
    case GUARDIAN_FORTUNE_ERROR_CODES.RESULT_INVALID:
      return "지금은 귀인이 흐름을 읽는 데 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    case GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED:
      return "상담 사용량을 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    default:
      return "오늘의 귀인 운세를 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }
}

function errorResponse({ code, status, usage, isLoggedIn, requestId, details = undefined }) {
  return {
    ok: false,
    status,
    error: code,
    message: safeErrorMessage(code),
    requestId,
    usage,
    ...(status === 429 ? { cta: buildGuardianFortuneLimitCta(code, isLoggedIn) } : {}),
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
  now = new Date(),
  contextBuilder = buildGuardianFortuneContext,
  mockGenerator,
  generator,
  contextOptions = {},
  scenario = "normal",
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

  const reservation = await reserveGuardianFortuneUsage({
    userId: normalizedUserId,
    guestIdHash,
    dateKey: effectiveDateKey,
    requestId,
    store,
    now,
  });
  if (!reservation.ok) {
    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now });
    return errorResponse({
      code: reservation.errorCode,
      status: reservation.status || 409,
      usage,
      isLoggedIn,
      requestId,
    });
  }

  try {
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
    if (isGuardianFortuneShareEnabled(shareEnv)) {
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
  } catch {
    await releaseGuardianFortuneUsage(reservation, { store, errorCode: GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR, now }).catch(() => {});
    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now }).catch(() => null);
    return errorResponse({
      code: GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR,
      status: 500,
      usage,
      isLoggedIn,
      requestId,
    });
  }
}

export { safeErrorMessage };
