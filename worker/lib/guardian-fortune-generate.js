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

/**
 * 삼키기 전에 Mongo 실패의 정체만 한 줄 남긴다.
 *
 * 이게 없어서 ensureGuest 의 ConflictingUpdateOperators(40)가 며칠 동안 보이지 않았다 — 두 catch 가
 * 에러를 로그 없이 503 으로 바꿔 버리니 프로덕션 로그에 원인이 아예 안 남았다.
 * 🔴 프롬프트·생년정보·질문·requestId 같은 사용자 데이터는 싣지 않는다. 식별에 필요한 최소 4개만.
 */
function logGuardianFortuneDbError(stage, error) {
  try {
    console.error("[guardian-fortune-db-error]", JSON.stringify({
      stage,
      name: String(error?.name || "Error").slice(0, 80),
      code: error?.code ?? null,
      codeName: String(error?.codeName || "").slice(0, 80) || null,
      message: String(error?.message || "").slice(0, 300),
    }));
  } catch {
    console.error("[guardian-fortune-db-error]", stage, error?.name, error?.code);
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
    logGuardianFortuneDbError("reserve", error);
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
    const committed = await commitGuardianFortuneUsage(reservation, { store, now, ctx: contextOptions?.ctx });
    if (!committed.ok) {
      // 방금 Mongo 쓰기가 실패한 직후다. 여기서 usage 를 또 읽으면 같은 장애에서 왕복을
      // 한 번 더 쓰고 대개 같이 실패한다 — 위 예약 실패 catch 와 같이 usage 없이 내려보낸다.
      return errorResponse({
        code: GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED,
        status: 503,
        isLoggedIn,
        requestId,
        retryable: true,
      });
    }

    // 커밋은 findOneAndUpdate({ new: true }) 라 갱신된 사용량 문서를 이미 돌려준다. 그대로
    // 넘겨 재조회 왕복을 없앤다. 결제분(paid)만 예외 — 무료 카운터를 건드리지 않아 커밋
    // 문서가 없으므로 종전대로 읽는다.
    const usage = await buildGuardianFortuneUsageStatus({
      userId: normalizedUserId,
      guestIdHash,
      dateKey: effectiveDateKey,
      store,
      now,
      snapshot: reservation.source === "paid" ? null : (committed.committed || null),
    });
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
    const cancelled = error?.code === GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED;
    if (!cancelled) logGuardianFortuneDbError("generate", error);

    // 🔴 예약 **이후** 단계(context·생성·커밋)에서 Mongo 가 흔들린 경우. 이걸 SERVER_ERROR 로
    // 뭉개면 위 예약 catch(:123)·라우트 catch(fortune.js)가 같은 장애를 재시도 가능한 503 으로
    // 내리는 것과 어긋나, **하나의 원인이 500 과 503 으로 갈려 나간다**. 실제로 그래서 브라우저
    // 콘솔에 500 과 503 이 섞여 찍혔다(http.js isDbUnavailableError 주석의 "500 으로 샌다"가 이것).
    // 예약은 되돌리되(무료 횟수를 물고 있으면 안 된다) usage 재조회는 하지 않는다 — 같은 장애에서
    // 왕복을 한 번 더 쓰고 대개 같이 실패하며, 실패 응답만 12초 늦어진다.
    if (!cancelled && isDbUnavailableError(error)) {
      await releaseGuardianFortuneUsage(reservation, {
        store,
        errorCode: GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE,
        now,
      }).catch(() => {});
      return errorResponse({
        code: GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE,
        status: 503,
        isLoggedIn,
        requestId,
        retryable: true,
      });
    }

    const code = cancelled
      ? GUARDIAN_FORTUNE_ERROR_CODES.CANCELLED
      : GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR;
    await releaseGuardianFortuneUsage(reservation, { store, errorCode: code, now }).catch(() => {});
    const usage = await buildGuardianFortuneUsageStatus({ userId: normalizedUserId, guestIdHash, dateKey: effectiveDateKey, store, now }).catch(() => null);
    return errorResponse({
      code,
      status: cancelled ? 499 : 500,
      usage,
      isLoggedIn,
      requestId,
    });
  }
}

export { safeErrorMessage };
