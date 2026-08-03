import { connectDb, withMongoRetry } from "../lib/db.js";
import { getEnv } from "../lib/env.js";
import { createHttpError, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { MonthlyCreditLedger, User } from "../lib/models.js";
import { grantMonthlyCreditLotDetailed } from "../lib/monthly-credit-store.js";

const MAX_MARKETING_GRANT_AMOUNT = 999999;
const MAX_REASON_LENGTH = 120;
const MAX_CAMPAIGN_ID_LENGTH = 80;
const MAX_IDEMPOTENCY_KEY_LENGTH = 150;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,149}$/;
const MARKETING_SERVICE_KEY = "admin_marketing_monthly_credit";

function isTruthy(value) {
  return ["1", "true", "on", "yes"].includes(String(value || "").trim().toLowerCase());
}

function normalizeText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isAdminMonthlyCreditGrantEnabled(env = {}) {
  const environment = String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase();
  if (["test", "development", "local"].includes(environment)) return true;
  return isTruthy(getEnv(env, "ADMIN_MONTHLY_CREDIT_GRANT_ENABLED"));
}

export function normalizeAdminMonthlyCreditGrantInput(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "요청 본문이 올바르지 않습니다.", { code: "VALIDATION_ERROR" });
  }

  const email = normalizeEmail(body.email);
  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, "지급 대상 이메일을 확인해 주세요.", { code: "TARGET_EMAIL_REQUIRED" });
  }

  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_MARKETING_GRANT_AMOUNT) {
    throw createHttpError(400, `지급량은 1부터 ${MAX_MARKETING_GRANT_AMOUNT.toLocaleString()}까지의 정수여야 합니다.`, {
      code: "INVALID_GRANT_AMOUNT",
      maxAmount: MAX_MARKETING_GRANT_AMOUNT,
    });
  }

  const reason = normalizeText(body.reason, MAX_REASON_LENGTH);
  if (!reason) {
    throw createHttpError(400, "마케팅 지급 사유는 필수입니다.", { code: "GRANT_REASON_REQUIRED" });
  }

  const idempotencyKey = normalizeText(body.idempotencyKey, MAX_IDEMPOTENCY_KEY_LENGTH);
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw createHttpError(400, "idempotencyKey는 영문·숫자와 . _ : - 조합으로 8자 이상 입력해야 합니다.", {
      code: "INVALID_IDEMPOTENCY_KEY",
    });
  }

  return {
    email,
    amount,
    reason,
    campaignId: normalizeText(body.campaignId, MAX_CAMPAIGN_ID_LENGTH),
    idempotencyKey,
  };
}

export function buildMarketingGrantSourceId(idempotencyKey) {
  return `admin-marketing:${idempotencyKey}`;
}

function findGrantLot(user, sourceId) {
  const lots = user?.profileSubscription?.membershipCreditLots;
  if (!Array.isArray(lots)) return null;
  return lots.find((lot) => String(lot?.lotId || "") === sourceId) || null;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildGrantResponse({ user, ledger, lot, idempotent }) {
  const profileSubscription = user?.profileSubscription || {};
  return {
    ok: true,
    idempotent: Boolean(idempotent),
    grant: {
      userId: String(user?._id || ledger?.userId || ""),
      email: String(user?.email || ""),
      amount: Math.max(0, Math.floor(Number(ledger?.amount || lot?.amount || 0))),
      reason: String(ledger?.reason || ""),
      sourceId: String(ledger?.sourceId || lot?.lotId || ""),
      campaignId: String(ledger?.metadata?.campaignId || ""),
      balanceAfter: Math.max(0, Math.floor(Number(profileSubscription.membershipCreditBalance || ledger?.afterBalance || 0))),
      expiresAt: toIso(lot?.expiresAt || ledger?.metadata?.expiresAt),
      ledgerId: String(ledger?._id || ""),
    },
  };
}

async function handleGrant(request, env, adminContext) {
  if (!isAdminMonthlyCreditGrantEnabled(env)) {
    throw createHttpError(503, "관리자 월정석 마케팅 지급 기능이 비활성화되어 있습니다.", {
      code: "ADMIN_MONTHLY_CREDIT_GRANT_DISABLED",
    });
  }

  const body = await readJson(request);
  const input = normalizeAdminMonthlyCreditGrantInput(body);
  const sourceId = buildMarketingGrantSourceId(input.idempotencyKey);
  const actorId = normalizeText(adminContext?.userId || "admin", 120);

  await connectDb(env);
  const user = await withMongoRetry(env, () => User.findOne({ email: input.email })
    .select("email status profileSubscription")
    .lean());

  if (!user?._id) {
    throw createHttpError(404, "지급 대상 계정을 찾을 수 없습니다.", { code: "TARGET_USER_NOT_FOUND" });
  }
  if (String(user.status || "active").toLowerCase() === "withdrawn") {
    throw createHttpError(409, "탈퇴한 계정에는 월정석을 지급할 수 없습니다.", { code: "TARGET_USER_WITHDRAWN" });
  }

  const existingLedger = await withMongoRetry(env, () => MonthlyCreditLedger.findOne({
    userId: user._id,
    type: "MONTHLY_CREDIT_GRANT",
    sourceId,
  }).lean());
  if (existingLedger) {
    if (Number(existingLedger.amount) !== input.amount) {
      throw createHttpError(409, "동일한 idempotencyKey에 다른 지급량을 사용할 수 없습니다.", {
        code: "IDEMPOTENCY_CONFLICT",
      });
    }
    return json(buildGrantResponse({
      user,
      ledger: existingLedger,
      lot: findGrantLot(user, sourceId),
      idempotent: true,
    }));
  }

  const existingLot = findGrantLot(user, sourceId);
  if (existingLot && Number(existingLot.amount) !== input.amount) {
    throw createHttpError(409, "동일한 idempotencyKey에 다른 지급량을 사용할 수 없습니다.", {
      code: "IDEMPOTENCY_CONFLICT",
    });
  }

  const applied = await grantMonthlyCreditLotDetailed({
    userId: user._id,
    lotId: sourceId,
    amount: input.amount,
  });
  if (!applied?.user) {
    throw createHttpError(503, "월정석 지급 중 일시적인 문제가 발생했습니다. 다시 시도해 주세요.", {
      code: "MONTHLY_CREDIT_GRANT_FAILED",
    });
  }

  const updatedUser = applied.user;
  const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  const expiresAt = toIso(applied.lot?.expiresAt);
  let ledgerWriteResult = null;
  try {
    ledgerWriteResult = await MonthlyCreditLedger.updateOne(
      { userId: user._id, type: "MONTHLY_CREDIT_GRANT", sourceId },
      {
        $setOnInsert: {
          userId: user._id,
          type: "MONTHLY_CREDIT_GRANT",
          amount: input.amount,
          beforeBalance: Math.max(0, Math.floor(Number(applied.beforeBalance || 0))),
          afterBalance,
          reason: input.reason,
          sourceId,
          serviceKey: MARKETING_SERVICE_KEY,
          profileId: "",
          metadata: {
            grantKind: "marketing",
            actorId,
            campaignId: input.campaignId,
            expiresAt,
          },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }

  const ledger = await withMongoRetry(env, () => MonthlyCreditLedger.findOne({
    userId: user._id,
    type: "MONTHLY_CREDIT_GRANT",
    sourceId,
  }).lean());
  if (!ledger) {
    throw createHttpError(503, "월정석 지급 원장을 확인하지 못했습니다. 잔액은 중복 지급되지 않도록 다시 확인해 주세요.", {
      code: "MONTHLY_CREDIT_LEDGER_UNAVAILABLE",
    });
  }

  return json(buildGrantResponse({
    user: updatedUser,
    ledger,
    lot: findGrantLot(updatedUser, sourceId) || applied.lot,
    idempotent: applied.added !== true || Number(ledgerWriteResult?.upsertedCount || 0) !== 1,
  }), { status: applied.added ? 201 : 200 });
}

export async function handleAdminMonthlyCreditRoutes(path, request, env, adminContext) {
  try {
    if (path !== "/grant") {
      return notFoundResponse();
    }
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    return await handleGrant(request, env, adminContext);
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/admin/monthly-credits", method: request.method },
    });
  }
}

function notFoundResponse() {
  return json({ ok: false, error: "not_found" }, { status: 404 });
}

export const __adminMonthlyCreditGrantTestUtils = Object.freeze({
  MAX_MARKETING_GRANT_AMOUNT,
  buildMarketingGrantSourceId,
  isAdminMonthlyCreditGrantEnabled,
  normalizeAdminMonthlyCreditGrantInput,
});
