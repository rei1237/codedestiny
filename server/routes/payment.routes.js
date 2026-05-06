const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Payment = require("../models/Payment");
const PointHistory = require("../models/PointHistory");
const PaymentFailureLog = require("../models/PaymentFailureLog");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  validatePointChargePayload,
  resolveChargePointsByAmount,
} = require("../utils/validation");
const {
  fetchPortOnePayment,
  cancelPortOnePayment,
} = require("../services/portone.service");

const router = express.Router();

function toDateFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return new Date();
  return new Date(unixSeconds * 1000);
}

function normalizePaymentMethod(value) {
  const method = String(value || "unknown").trim();
  return method ? method.slice(0, 32) : "unknown";
}

function buildMerchantUid(userId) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const randomTag = Math.random().toString(36).slice(2, 8);
  return `md_${Date.now()}_${userTag}_${randomTag}`;
}

const SUBSCRIPTION_PAYMENT_PLANS = {
  standard: { tier: "standard", name: "스탠다드 꿀", wonPrice: 9900, durationDays: 30, profileLimit: 3 },
  premium: { tier: "premium", name: "프리미엄 꿀", wonPrice: 29900, durationDays: 30, profileLimit: 7 },
  vvip: { tier: "vvip", name: "VVIP 꿀단지", wonPrice: 59000, durationDays: 30, profileLimit: 15 },
};

function resolveSubscriptionPlan(tierRaw) {
  const tier = String(tierRaw || "").trim().toLowerCase();
  return SUBSCRIPTION_PAYMENT_PLANS[tier] || null;
}

function buildSubscriptionMerchantUid(userId, tier) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const randomTag = Math.random().toString(36).slice(2, 6);
  return `sub_${Date.now()}_${tier}_${userTag}_${randomTag}`;
}

function buildSubscriptionCustomerUid(userId) {
  return `cdsub_${String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "")}`;
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toIsoOrNull(value) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection },
  );
}

function hasActiveSubscriptionConflict(sub) {
  const tier = String(sub?.tier || "free").toLowerCase();
  const expAt = toValidDate(sub?.expiresAt);
  return tier !== "free" && !!expAt && expAt.getTime() > Date.now();
}

function parseCustomDataUserId(customData) {
  if (!customData) return null;

  let parsed = customData;
  if (typeof customData === "string") {
    try {
      parsed = JSON.parse(customData);
    } catch (error) {
      return null;
    }
  }

  const userId = String(parsed?.userId || parsed?.uid || "").trim();
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return userId;
}

function formatPaymentResponse(payment) {
  if (!payment) return null;

  const approvalNumber = String(
    payment?.rawPortOne?.apply_num
    || payment?.rawPortOne?.apply_num_vbank
    || "",
  ).trim() || null;
  const receiptUrl = String(payment?.rawPortOne?.receipt_url || "").trim() || null;
  const cancelAmount = Number(payment?.rawPortOne?.cancel_amount || 0);
  const cancelledAt = payment?.rawPortOne?.cancelled_at
    ? toDateFromUnixSeconds(payment.rawPortOne.cancelled_at)
    : null;

  return {
    id: String(payment._id),
    impUid: payment.impUid,
    merchantUid: payment.merchantUid,
    paymentAmount: Number(payment.paymentAmount || 0),
    chargedPoints: Number(payment.chargedPoints || 0),
    paymentMethod: payment.paymentMethod,
    paymentType: payment.paymentType || "point_charge",
    subscriptionTier: payment.subscriptionTier || "",
    status: payment.status,
    paidAt: payment.paidAt,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    failureStage: payment.failureStage,
    lastErrorAt: payment.lastErrorAt,
    approvalNumber,
    receiptUrl,
    cancelAmount,
    cancelledAt,
  };
}

function getRequestMeta(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwarded || req.ip || req.socket?.remoteAddress || "unknown";
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
  const requestId = String(req.headers["x-request-id"] || req.headers["cf-ray"] || "").slice(0, 120);
  return { ip, userAgent, requestId };
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const clone = { ...payload };
  if (clone.card_number) clone.card_number = "[redacted]";
  if (clone.customer_uid) clone.customer_uid = "[redacted]";
  return clone;
}

async function writeFailureLog(params = {}) {
  const {
    req,
    userId,
    impUid,
    merchantUid,
    source,
    stage,
    code,
    message,
    status,
    expectedAmount,
    clientAmount,
    portOneAmount,
    portOneStatus,
    payload,
    rawPortOne,
  } = params;

  await PaymentFailureLog.create({
    userId: userId && mongoose.Types.ObjectId.isValid(String(userId)) ? userId : undefined,
    impUid,
    merchantUid,
    source: source || "system",
    stage: stage || "unknown",
    code,
    message,
    status,
    expectedAmount,
    clientAmount,
    portOneAmount,
    portOneStatus,
    requestMeta: req ? getRequestMeta(req) : undefined,
    payload: summarizePayload(payload),
    rawPortOne,
  }).catch(() => {});
}

async function getUserPoints(userId) {
  const user = await User.findById(userId).select("points").lean();
  return Number(user?.points || 0);
}

async function markPaymentFailure(paymentRecord, patch = {}) {
  if (!paymentRecord?._id) return;

  await Payment.findByIdAndUpdate(paymentRecord._id, {
    $set: {
      status: patch.status || "failed",
      paymentMethod: patch.paymentMethod || paymentRecord.paymentMethod || "unknown",
      rawPortOne: patch.rawPortOne,
      failureCode: patch.failureCode,
      failureMessage: patch.failureMessage,
      failureStage: patch.failureStage,
      lastErrorAt: new Date(),
    },
    ...(patch.incrementAttempt ? { $inc: { confirmAttempts: 1 } } : {}),
  }).catch(() => {});
}

async function findPaymentRecord(impUid, merchantUid) {
  if (impUid) {
    const byImp = await Payment.findOne({ impUid }).lean();
    if (byImp) return byImp;
  }

  if (merchantUid) {
    const byMerchant = await Payment.findOne({ merchantUid }).lean();
    if (byMerchant) return byMerchant;
  }

  return null;
}

async function ensurePaymentRecord({
  existing,
  userId,
  impUid,
  merchantUid,
  paymentAmount,
  expectedChargedPoints,
  paymentMethod,
  source,
}) {
  if (existing) return existing;

  const created = await Payment.create({
    userId,
    impUid,
    merchantUid: merchantUid || undefined,
    paymentAmount,
    expectedChargedPoints,
    chargedPoints: 0,
    paymentMethod,
    status: "pending",
    source,
  });

  return created.toObject();
}

async function settlePaymentByImpUid({
  impUid,
  requestedUserId,
  requestedAmount,
  requestedChargePoints,
  requestedPaymentMethod,
  merchantUidHint,
  source,
  strictAmountMatch,
  req,
}) {
  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(impUid);
  } catch (error) {
    await writeFailureLog({
      req,
      userId: requestedUserId,
      impUid,
      merchantUid: merchantUidHint,
      source,
      stage: "portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "포트원 결제 조회 실패",
      status: 502,
      payload: req?.body,
    });

    return {
      ok: false,
      status: 502,
      message: "포트원 결제 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const portOneStatus = String(portOnePayment.status || "").toLowerCase();
  const portOneAmount = Number(portOnePayment.amount);
  const merchantUid = String(portOnePayment.merchant_uid || merchantUidHint || "").trim();
  const paymentMethod = normalizePaymentMethod(portOnePayment.pay_method || requestedPaymentMethod);

  let paymentRecord = await findPaymentRecord(impUid, merchantUid);

  const customDataUserId = parseCustomDataUserId(portOnePayment.custom_data);
  const ownerUserId = paymentRecord?.userId
    ? String(paymentRecord.userId)
    : (requestedUserId ? String(requestedUserId) : customDataUserId);

  if (!ownerUserId || !mongoose.Types.ObjectId.isValid(ownerUserId)) {
    await writeFailureLog({
      req,
      userId: requestedUserId,
      impUid,
      merchantUid,
      source,
      stage: "owner_resolve",
      code: "owner_not_found",
      message: "결제 소유 사용자 정보를 확인할 수 없습니다.",
      status: 400,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "결제 소유 사용자 정보를 확인할 수 없습니다.",
    };
  }

  if (requestedUserId && String(requestedUserId) !== ownerUserId) {
    await writeFailureLog({
      req,
      userId: requestedUserId,
      impUid,
      merchantUid,
      source,
      stage: "owner_mismatch",
      code: "forbidden_owner_mismatch",
      message: "본인 결제 건만 처리할 수 있습니다.",
      status: 403,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 403,
      message: "본인 결제 건만 처리할 수 있습니다.",
    };
  }

  const expectedAmount = Number.isInteger(Number(requestedAmount))
    ? Number(requestedAmount)
    : Number(paymentRecord?.paymentAmount || 0);

  const expectedChargedPoints = Number.isInteger(Number(requestedChargePoints))
    ? Number(requestedChargePoints)
    : Number(paymentRecord?.expectedChargedPoints || 0);

  paymentRecord = await ensurePaymentRecord({
    existing: paymentRecord,
    userId: ownerUserId,
    impUid,
    merchantUid,
    paymentAmount: expectedAmount > 0 ? expectedAmount : Math.max(Number(portOneAmount) || 0, 0),
    expectedChargedPoints,
    paymentMethod,
    source,
  });

  if (paymentRecord.status === "success") {
    return {
      ok: true,
      idempotent: true,
      user: {
        id: ownerUserId,
        points: await getUserPoints(ownerUserId),
      },
      payment: formatPaymentResponse(paymentRecord),
    };
  }

  if (!Number.isInteger(portOneAmount) || portOneAmount <= 0) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "invalid_portone_amount",
      failureMessage: "포트원 결제 금액 정보가 올바르지 않습니다.",
      failureStage: "amount_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_validate",
      code: "invalid_portone_amount",
      message: "포트원 결제 금액 정보가 올바르지 않습니다.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "포트원 결제 금액 정보가 올바르지 않습니다.",
    };
  }

  if (
    strictAmountMatch
    && requestedAmount !== undefined
    && requestedAmount !== null
    && Number(requestedAmount) !== portOneAmount
  ) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "client_amount_mismatch",
      failureMessage: "결제 위변조가 감지되었습니다. 금액이 일치하지 않습니다.",
      failureStage: "amount_match",
      incrementAttempt: true,
    });

    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "client_amount_mismatch",
      message: "결제 위변조가 감지되었습니다. 금액이 일치하지 않습니다.",
      status: 400,
      clientAmount: Number(requestedAmount),
      portOneAmount,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "결제 위변조가 감지되었습니다. 금액이 일치하지 않습니다.",
      clientAmount: Number(requestedAmount),
      portOneAmount,
    };
  }

  if (Number(paymentRecord.paymentAmount || 0) > 0 && Number(paymentRecord.paymentAmount) !== portOneAmount) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "server_amount_mismatch",
      failureMessage: "서버 주문 금액과 실제 결제 금액이 일치하지 않습니다.",
      failureStage: "amount_match",
      incrementAttempt: true,
    });

    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "server_amount_mismatch",
      message: "서버 주문 금액과 실제 결제 금액이 일치하지 않습니다.",
      status: 400,
      expectedAmount: Number(paymentRecord.paymentAmount),
      portOneAmount,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "서버 주문 금액과 실제 결제 금액이 일치하지 않습니다.",
      expectedAmount: Number(paymentRecord.paymentAmount),
      portOneAmount,
    };
  }

  if (portOneStatus !== "paid") {
    const failedStatus = portOneStatus === "cancelled" ? "cancelled" : "failed";

    await markPaymentFailure(paymentRecord, {
      status: failedStatus,
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "payment_not_paid",
      failureMessage: "결제가 완료되지 않은 상태입니다.",
      failureStage: "status_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "status_validate",
      code: "payment_not_paid",
      message: "결제가 완료되지 않은 상태입니다.",
      status: 400,
      portOneStatus: portOneStatus || "unknown",
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "결제가 완료되지 않은 상태입니다.",
      portOneStatus: portOneStatus || "unknown",
    };
  }

  let chargedPoints;
  try {
    const pointsForPolicy = expectedChargedPoints > 0 ? expectedChargedPoints : undefined;
    chargedPoints = resolveChargePointsByAmount(portOneAmount, pointsForPolicy);
  } catch (error) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "charge_policy_invalid",
      failureMessage: error.message || "충전 포인트 정책 검증에 실패했습니다.",
      failureStage: "policy_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "policy_validate",
      code: "charge_policy_invalid",
      message: error.message || "충전 포인트 정책 검증에 실패했습니다.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: error.message || "충전 포인트 정책 검증에 실패했습니다.",
    };
  }

  const ownerExists = await User.exists({ _id: ownerUserId });
  if (!ownerExists) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "user_not_found",
      failureMessage: "포인트를 충전할 사용자를 찾을 수 없습니다.",
      failureStage: "user_lookup",
      incrementAttempt: true,
    });

    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "user_lookup",
      code: "user_not_found",
      message: "포인트를 충전할 사용자를 찾을 수 없습니다.",
      status: 404,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 404,
      message: "포인트를 충전할 사용자를 찾을 수 없습니다.",
    };
  }

  const paidAt = toDateFromUnixSeconds(portOnePayment.paid_at);

  const runSettlementWithoutTransaction = async () => {
    const finalizedPayment = await Payment.findOneAndUpdate(
      {
        _id: paymentRecord._id,
        status: { $ne: "success" },
      },
      {
        $set: {
          userId: ownerUserId,
          impUid,
          merchantUid: merchantUid || paymentRecord.merchantUid || undefined,
          paymentAmount: portOneAmount,
          expectedChargedPoints: chargedPoints,
          chargedPoints,
          paymentMethod,
          status: "success",
          paidAt,
          source,
          rawPortOne: portOnePayment,
          failureCode: null,
          failureMessage: null,
          failureStage: null,
        },
        $inc: { confirmAttempts: 1 },
      },
      { new: true },
    ).lean();

    if (!finalizedPayment) {
      const latestPayment = await Payment.findById(paymentRecord._id).lean();
      return {
        ok: true,
        idempotent: true,
        user: {
          id: ownerUserId,
          points: await getUserPoints(ownerUserId),
        },
        payment: formatPaymentResponse(latestPayment),
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      ownerUserId,
      { $inc: { points: chargedPoints } },
      { new: true, projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      await Payment.findByIdAndUpdate(finalizedPayment._id, {
        $set: {
          status: "failed",
          failureCode: "user_not_found",
          failureMessage: "포인트를 충전할 사용자를 찾을 수 없습니다.",
          failureStage: "user_update",
          lastErrorAt: new Date(),
        },
      }).catch(() => {});

      return {
        ok: false,
        status: 404,
        message: "포인트를 충전할 사용자를 찾을 수 없습니다.",
      };
    }

    await PointHistory.create({
      userId: ownerUserId,
      kind: "charge",
      delta: chargedPoints,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "포인트 충전",
      paymentId: finalizedPayment._id,
      impUid,
      merchantUid: finalizedPayment.merchantUid,
      metadata: {
        source,
        paymentAmount: portOneAmount,
        paymentMethod,
      },
    }).catch(() => {});

    return {
      ok: true,
      idempotent: false,
      user: {
        id: ownerUserId,
        points: Number(updatedUser.points || 0),
      },
      payment: formatPaymentResponse(finalizedPayment),
    };
  };

  const runSettlementWithTransaction = async () => {
    const session = await mongoose.startSession();
    let txResult = null;

    try {
      await session.withTransaction(async () => {
        const finalizedPayment = await Payment.findOneAndUpdate(
          {
            _id: paymentRecord._id,
            status: { $ne: "success" },
          },
          {
            $set: {
              userId: ownerUserId,
              impUid,
              merchantUid: merchantUid || paymentRecord.merchantUid || undefined,
              paymentAmount: portOneAmount,
              expectedChargedPoints: chargedPoints,
              chargedPoints,
              paymentMethod,
              status: "success",
              paidAt,
              source,
              rawPortOne: portOnePayment,
              failureCode: null,
              failureMessage: null,
              failureStage: null,
            },
            $inc: { confirmAttempts: 1 },
          },
          { new: true, session },
        ).lean();

        if (!finalizedPayment) {
          const latestPayment = await Payment.findById(paymentRecord._id).session(session).lean();
          txResult = {
            ok: true,
            idempotent: true,
            user: {
              id: ownerUserId,
              points: await getUserPoints(ownerUserId),
            },
            payment: formatPaymentResponse(latestPayment),
          };
          return;
        }

        const updatedUser = await User.findByIdAndUpdate(
          ownerUserId,
          { $inc: { points: chargedPoints } },
          { new: true, projection: { points: 1 }, session },
        ).lean();

        if (!updatedUser) {
          throw new Error("user_not_found");
        }

        await PointHistory.create([
          {
            userId: ownerUserId,
            kind: "charge",
            delta: chargedPoints,
            balanceAfter: Number(updatedUser.points || 0),
            reason: "포인트 충전",
            paymentId: finalizedPayment._id,
            impUid,
            merchantUid: finalizedPayment.merchantUid,
            metadata: {
              source,
              paymentAmount: portOneAmount,
              paymentMethod,
            },
          },
        ], { session });

        txResult = {
          ok: true,
          idempotent: false,
          user: {
            id: ownerUserId,
            points: Number(updatedUser.points || 0),
          },
          payment: formatPaymentResponse(finalizedPayment),
        };
      });

      return txResult;
    } finally {
      await session.endSession();
    }
  };

  let settlementResult;
  try {
    settlementResult = await runSettlementWithTransaction();
  } catch (error) {
    const txUnsupported = /Transaction numbers are only allowed|replica set|Transaction .* not supported/i.test(String(error?.message || ""));
    if (!txUnsupported) throw error;
    settlementResult = await runSettlementWithoutTransaction();
  }

  if (!settlementResult?.ok) {
    await writeFailureLog({
      req,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "settlement",
      code: "settlement_failed",
      message: settlementResult?.message || "결제 정산에 실패했습니다.",
      status: settlementResult?.status || 500,
      expectedAmount,
      portOneAmount,
      payload: req?.body,
      rawPortOne: portOnePayment,
    });
    return settlementResult;
  }

  return settlementResult;
}

router.post("/webhook", async (req, res, next) => {
  try {
    const expectedWebhookToken = String(process.env.PORTONE_WEBHOOK_TOKEN || "").trim();
    if (expectedWebhookToken) {
      const suppliedWebhookToken = String(req.headers["x-cd-webhook-token"] || "").trim();
      if (suppliedWebhookToken !== expectedWebhookToken) {
        await writeFailureLog({
          req,
          source: "webhook",
          stage: "webhook_auth",
          code: "invalid_webhook_token",
          message: "웹훅 인증 토큰이 일치하지 않습니다.",
          status: 401,
          payload: req.body,
        });
        return res.status(401).json({ message: "유효하지 않은 웹훅 요청입니다." });
      }
    }

    const impUid = String(
      req.body?.imp_uid
      || req.body?.impUid
      || req.body?.data?.imp_uid
      || "",
    ).trim();

    const merchantUid = String(
      req.body?.merchant_uid
      || req.body?.merchantUid
      || req.body?.data?.merchant_uid
      || "",
    ).trim();

    if (!impUid) {
      await writeFailureLog({
        req,
        source: "webhook",
        stage: "payload_validate",
        code: "missing_imp_uid",
        message: "웹훅 본문에 imp_uid가 필요합니다.",
        status: 400,
        payload: req.body,
      });
      return res.status(400).json({ message: "웹훅 본문에 imp_uid가 필요합니다." });
    }

    const settled = await settlePaymentByImpUid({
      impUid,
      merchantUidHint: merchantUid || undefined,
      source: "webhook",
      strictAmountMatch: false,
      req,
    });

    if (!settled.ok) {
      return res.status(200).json({
        ok: false,
        message: settled.message,
      });
    }

    return res.status(200).json({
      ok: true,
      idempotent: Boolean(settled.idempotent),
      payment: settled.payment,
    });
  } catch (error) {
    await writeFailureLog({
      req,
      source: "webhook",
      stage: "webhook_exception",
      code: "webhook_exception",
      message: error?.message || "웹훅 처리 중 오류가 발생했습니다.",
      status: 500,
      payload: req.body,
    });
    return next(error);
  }
});

router.use(requireAuth);

router.post("/prepare", async (req, res, next) => {
  try {
    const paymentAmount = Number(req.body?.paymentAmount ?? req.body?.amount);
    const requestedChargePoints = req.body?.chargePoints === undefined || req.body?.chargePoints === null
      ? undefined
      : Number(req.body?.chargePoints);

    if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
      await writeFailureLog({
        req,
        userId: req.auth.userId,
        source: "prepare",
        stage: "payload_validate",
        code: "invalid_payment_amount",
        message: "결제 금액(paymentAmount)은 양의 정수여야 합니다.",
        status: 400,
        payload: req.body,
      });
      return res.status(400).json({ message: "결제 금액(paymentAmount)은 양의 정수여야 합니다." });
    }

    if (
      requestedChargePoints !== undefined
      && (!Number.isInteger(requestedChargePoints) || requestedChargePoints <= 0)
    ) {
      await writeFailureLog({
        req,
        userId: req.auth.userId,
        source: "prepare",
        stage: "payload_validate",
        code: "invalid_charge_points",
        message: "충전 포인트(chargePoints)는 양의 정수여야 합니다.",
        status: 400,
        payload: req.body,
      });
      return res.status(400).json({ message: "충전 포인트(chargePoints)는 양의 정수여야 합니다." });
    }

    const chargedPoints = resolveChargePointsByAmount(paymentAmount, requestedChargePoints);
    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod);

    const rawProductName = String(req.body?.productName || `${chargedPoints.toLocaleString("ko-KR")} 포인트 충전`).trim();
    const productName = rawProductName.slice(0, 80) || `${chargedPoints.toLocaleString("ko-KR")} 포인트 충전`;

    const merchantUid = buildMerchantUid(req.auth.userId);

    await Payment.create({
      userId: req.auth.userId,
      merchantUid,
      paymentAmount,
      expectedChargedPoints: chargedPoints,
      chargedPoints: 0,
      paymentMethod,
      status: "pending",
      source: "prepare",
      paymentType: "point_charge",
      subscriptionTier: "",
    });

    return res.status(201).json({
      message: "결제 준비가 완료되었습니다.",
      order: {
        merchantUid,
        paymentAmount,
        chargePoints: chargedPoints,
        productName,
      },
    });
  } catch (error) {
    await writeFailureLog({
      req,
      userId: req.auth?.userId,
      source: "prepare",
      stage: "prepare_exception",
      code: "prepare_exception",
      message: error?.message || "결제 준비 처리 중 오류가 발생했습니다.",
      status: 500,
      payload: req.body,
    });
    return next(error);
  }
});

router.post("/subscription/prepare", async (req, res, next) => {
  try {
    const tier = String(req.body?.tier || "").trim().toLowerCase();
    const plan = resolveSubscriptionPlan(tier);
    if (!plan) {
      return res.status(400).json({ message: "지원하지 않는 구독 플랜입니다.", code: "INVALID_SUBSCRIPTION_TIER" });
    }

    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod || "card_general");
    const currentUser = await User.findById(req.auth.userId).select("profileSubscription").lean();
    if (!currentUser) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    if (hasActiveSubscriptionConflict(currentUser?.profileSubscription)) {
      return res.status(409).json({
        message: "이미 활성 구독이 있어 중복 구독을 신청할 수 없습니다.",
        code: "SUBSCRIPTION_CONFLICT",
      });
    }

    const merchantUid = buildSubscriptionMerchantUid(req.auth.userId, tier);
    const customerUid = buildSubscriptionCustomerUid(req.auth.userId);

    await Payment.create({
      userId: req.auth.userId,
      merchantUid,
      paymentAmount: plan.wonPrice,
      expectedChargedPoints: 0,
      chargedPoints: 0,
      paymentMethod,
      status: "pending",
      source: "prepare",
      paymentType: "subscription_initial",
      subscriptionTier: tier,
    });

    return res.status(201).json({
      message: "구독 결제 준비가 완료되었습니다.",
      order: {
        merchantUid,
        customerUid,
        tier,
        paymentAmount: plan.wonPrice,
        productName: `${plan.name} 정기결제`,
        profileLimit: plan.profileLimit,
        durationDays: plan.durationDays,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/subscription/confirm", async (req, res, next) => {
  try {
    const impUid = String(req.body?.impUid || req.body?.paymentId || "").trim();
    const tier = String(req.body?.tier || "").trim().toLowerCase();
    const customerUidFromClient = String(req.body?.customerUid || "").trim();
    const merchantUidHint = String(req.body?.merchantUid || req.body?.merchant_uid || "").trim();
    const paymentMethodHint = normalizePaymentMethod(req.body?.paymentMethod || "card");
    const plan = resolveSubscriptionPlan(tier);

    if (!impUid || !plan) {
      return res.status(400).json({ message: "impUid와 유효한 tier가 필요합니다." });
    }

    let portOnePayment;
    try {
      portOnePayment = await fetchPortOnePayment(impUid);
    } catch (error) {
      return res.status(502).json({ message: "결제 검증에 실패했습니다." });
    }

    const portOneStatus = String(portOnePayment?.status || "").toLowerCase();
    const portOneAmount = Number(portOnePayment?.amount || 0);
    const merchantUid = String(portOnePayment?.merchant_uid || merchantUidHint || "").trim();
    const resolvedPaymentMethod = normalizePaymentMethod(portOnePayment?.pay_method || paymentMethodHint);

    if (merchantUidHint && merchantUidHint !== merchantUid) {
      return res.status(400).json({ message: "merchantUid가 일치하지 않습니다." });
    }

    const paymentRecord = await findPaymentRecord(impUid, merchantUid);
    if (!paymentRecord) {
      return res.status(404).json({ message: "결제 준비 정보를 찾을 수 없습니다." });
    }
    if (String(paymentRecord.userId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "본인 결제 건만 처리할 수 있습니다." });
    }

    if (paymentRecord.status === "success") {
      const currentUser = await User.findById(req.auth.userId).select("profileSubscription").lean();
      const sub = currentUser?.profileSubscription || {};
      return res.status(200).json({
        message: "이미 처리된 구독 결제입니다.",
        idempotent: true,
        payment: formatPaymentResponse(paymentRecord),
        subscription: {
          tier: sub?.tier || "free",
          source: sub?.source || "coin",
          isActive: hasActiveSubscriptionConflict(sub),
          expiresAt: toIsoOrNull(sub?.expiresAt),
          profileLimit: plan.profileLimit,
          cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd),
          cancelRequestedAt: toIsoOrNull(sub?.cancelRequestedAt),
        },
      });
    }

    if (portOneStatus !== "paid") {
      await markPaymentFailure(paymentRecord, {
        status: "failed",
        paymentMethod: resolvedPaymentMethod,
        rawPortOne: portOnePayment,
        failureCode: "subscription_not_paid",
        failureMessage: `결제 상태가 paid가 아닙니다: ${portOneStatus || "unknown"}`,
        failureStage: "subscription_status_validate",
        incrementAttempt: true,
      });
      return res.status(400).json({ message: "결제가 완료되지 않았습니다.", status: portOneStatus || "unknown" });
    }

    if (!Number.isInteger(portOneAmount) || portOneAmount !== plan.wonPrice) {
      await markPaymentFailure(paymentRecord, {
        status: "failed",
        paymentMethod: resolvedPaymentMethod,
        rawPortOne: portOnePayment,
        failureCode: "subscription_amount_mismatch",
        failureMessage: "구독 결제 금액이 서버 정책과 일치하지 않습니다.",
        failureStage: "subscription_amount_validate",
        incrementAttempt: true,
      });
      return res.status(400).json({ message: "구독 결제 금액 검증에 실패했습니다." });
    }

    const now = new Date();
    const paidAt = portOnePayment?.paid_at ? toDateFromUnixSeconds(portOnePayment.paid_at) : now;
    const expiresAt = new Date(Math.max(now.getTime(), paidAt.getTime()) + plan.durationDays * 24 * 60 * 60 * 1000);
    const customerUid = customerUidFromClient || buildSubscriptionCustomerUid(req.auth.userId);

    const existingUser = await User.findById(req.auth.userId).select("profileSubscription").lean();
    if (hasActiveSubscriptionConflict(existingUser?.profileSubscription)) {
      return res.status(409).json({
        message: "이미 활성 구독이 있어 중복 구독을 신청할 수 없습니다.",
        code: "SUBSCRIPTION_CONFLICT",
      });
    }

    await Payment.findByIdAndUpdate(paymentRecord._id, {
      $set: {
        impUid,
        merchantUid,
        paymentAmount: plan.wonPrice,
        expectedChargedPoints: 0,
        chargedPoints: 0,
        paymentMethod: resolvedPaymentMethod,
        status: "success",
        paidAt,
        source: "confirm",
        paymentType: "subscription_initial",
        subscriptionTier: tier,
        rawPortOne: portOnePayment,
        failureCode: null,
        failureMessage: null,
        failureStage: null,
        lastErrorAt: null,
      },
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.auth.userId,
      {
        $set: {
          "profileSubscription.tier": tier,
          "profileSubscription.source": "card",
          "profileSubscription.startedAt": paidAt,
          "profileSubscription.expiresAt": expiresAt,
          "profileSubscription.cancelAtPeriodEnd": false,
          "profileSubscription.cancelRequestedAt": null,
          "profileSubscription.customerUid": customerUid,
          "profileSubscription.paymentMethod": resolvedPaymentMethod,
          "profileSubscription.nextBillingAt": expiresAt,
          "profileSubscription.lastBillingAt": paidAt,
          "profileSubscription.lastBillingStatus": "success",
          "profileSubscription.lastBillingError": "",
          "profileSubscription.firstSubAt": existingUser?.profileSubscription?.firstSubAt || paidAt,
        },
      },
      { new: true, projection: { points: 1, profileSubscription: 1 } },
    ).lean();

    const updatedPayment = await Payment.findById(paymentRecord._id).lean();
    return res.status(200).json({
      message: "카드 정기결제가 활성화되었습니다.",
      idempotent: false,
      payment: formatPaymentResponse(updatedPayment),
      subscription: {
        tier,
        source: "card",
        isActive: true,
        expiresAt: expiresAt.toISOString(),
        profileLimit: plan.profileLimit,
        cancelAtPeriodEnd: false,
        cancelRequestedAt: null,
        customerUid,
        paymentMethod: resolvedPaymentMethod,
        nextBillingAt: expiresAt.toISOString(),
        lastBillingStatus: "success",
      },
      user: {
        id: String(req.auth.userId),
        points: Number(updatedUser?.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/confirm", async (req, res, next) => {
  try {
    const hasMinimalRedirectPayload = Boolean(
      (req.body?.impUid || req.body?.paymentId)
      && (req.body?.merchantUid || req.body?.merchant_uid)
      && (req.body?.paymentAmount === undefined && req.body?.amount === undefined),
    );

    let isValid = false;
    let errors = [];
    let sanitized = null;

    if (hasMinimalRedirectPayload) {
      sanitized = {
        impUid: String(req.body?.impUid || req.body?.paymentId || "").trim(),
        merchantUid: String(req.body?.merchantUid || req.body?.merchant_uid || "").trim() || undefined,
        paymentAmount: undefined,
        chargePoints: undefined,
        paymentMethod: String(req.body?.paymentMethod || "").trim() || undefined,
      };
      isValid = Boolean(sanitized.impUid);
      if (!isValid) {
        errors = ["결제 고유 ID(impUid)가 필요합니다."];
      }
    } else {
      const validated = validatePointChargePayload(req.body);
      isValid = validated.isValid;
      errors = validated.errors;
      sanitized = validated.sanitized;
    }

    if (!isValid) {
      await writeFailureLog({
        req,
        userId: req.auth.userId,
        impUid: String(req.body?.impUid || req.body?.paymentId || "").trim() || undefined,
        merchantUid: String(req.body?.merchantUid || req.body?.merchant_uid || "").trim() || undefined,
        source: "confirm",
        stage: "payload_validate",
        code: "invalid_confirm_payload",
        message: "결제 요청 형식이 올바르지 않습니다.",
        status: 400,
        payload: { ...req.body, errors },
      });

      return res.status(400).json({
        message: "결제 요청 형식이 올바르지 않습니다.",
        errors,
      });
    }

    const settled = await settlePaymentByImpUid({
      impUid: sanitized.impUid,
      requestedUserId: req.auth.userId,
      requestedAmount: sanitized.paymentAmount,
      requestedChargePoints: sanitized.chargePoints,
      requestedPaymentMethod: sanitized.paymentMethod,
      merchantUidHint: sanitized.merchantUid,
      source: "confirm",
      strictAmountMatch: true,
      req,
    });

    if (!settled.ok) {
      return res.status(settled.status || 400).json({
        message: settled.message,
        ...(settled.clientAmount !== undefined ? { clientAmount: settled.clientAmount } : {}),
        ...(settled.portOneAmount !== undefined ? { portOneAmount: settled.portOneAmount } : {}),
        ...(settled.expectedAmount !== undefined ? { expectedAmount: settled.expectedAmount } : {}),
        ...(settled.portOneStatus ? { status: settled.portOneStatus } : {}),
      });
    }

    return res.status(200).json({
      message: settled.idempotent
        ? "이미 처리된 결제입니다."
        : "포인트 충전이 완료되었습니다.",
      idempotent: Boolean(settled.idempotent),
      user: settled.user,
      payment: settled.payment,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      await writeFailureLog({
        req,
        userId: req.auth?.userId,
        source: "confirm",
        stage: "dedupe",
        code: "duplicate_payment_key",
        message: "이미 등록된 주문번호 또는 결제 고유 ID입니다.",
        status: 409,
        payload: req.body,
      });
      return res.status(409).json({ message: "이미 등록된 주문번호 또는 결제 고유 ID입니다." });
    }

    await writeFailureLog({
      req,
      userId: req.auth?.userId,
      source: "confirm",
      stage: "confirm_exception",
      code: "confirm_exception",
      message: error?.message || "결제 확인 처리 중 오류가 발생했습니다.",
      status: 500,
      payload: req.body,
    });
    return next(error);
  }
});

router.post("/cancel", async (req, res, next) => {
  try {
    const impUid = String(req.body?.impUid || req.body?.imp_uid || "").trim() || undefined;
    const merchantUid = String(req.body?.merchantUid || req.body?.merchant_uid || "").trim() || undefined;
    const reason = String(req.body?.reason || "고객 요청 환불").trim().slice(0, 120);
    const requestedCancelAmountRaw = req.body?.cancelAmount ?? req.body?.amount;
    const requestedCancelAmount =
      requestedCancelAmountRaw === undefined || requestedCancelAmountRaw === null
        ? undefined
        : Number(requestedCancelAmountRaw);

    if (!impUid && !merchantUid) {
      await writeFailureLog({
        req,
        userId: req.auth.userId,
        source: "confirm",
        stage: "cancel_payload",
        code: "missing_cancel_key",
        message: "impUid 또는 merchantUid 중 하나는 필요합니다.",
        status: 400,
        payload: req.body,
      });
      return res.status(400).json({ message: "impUid 또는 merchantUid 중 하나는 필요합니다." });
    }

    if (
      requestedCancelAmount !== undefined
      && (!Number.isInteger(requestedCancelAmount) || requestedCancelAmount <= 0)
    ) {
      return res.status(400).json({ message: "cancelAmount는 양의 정수여야 합니다." });
    }

    const paymentRecord = await findPaymentRecord(impUid, merchantUid);
    if (!paymentRecord) {
      return res.status(404).json({ message: "결제 정보를 찾을 수 없습니다." });
    }

    if (String(paymentRecord.userId) !== String(req.auth.userId)) {
      await writeFailureLog({
        req,
        userId: req.auth.userId,
        impUid,
        merchantUid,
        source: "confirm",
        stage: "cancel_owner",
        code: "forbidden_owner_mismatch",
        message: "본인 결제 건만 취소할 수 있습니다.",
        status: 403,
        payload: req.body,
      });
      return res.status(403).json({ message: "본인 결제 건만 취소할 수 있습니다." });
    }

    if (paymentRecord.status === "cancelled") {
      return res.status(200).json({
        message: "이미 취소된 결제입니다.",
        idempotent: true,
        payment: formatPaymentResponse(paymentRecord),
      });
    }

    if (paymentRecord.status !== "success") {
      return res.status(400).json({ message: "결제 완료 건만 취소할 수 있습니다." });
    }

    const paidAmount = Number(paymentRecord.paymentAmount || 0);
    if (requestedCancelAmount !== undefined && requestedCancelAmount > paidAmount) {
      return res.status(400).json({ message: "취소 요청 금액이 결제 금액을 초과합니다." });
    }

    const pointsToRollback = Number(
      paymentRecord.chargedPoints || paymentRecord.expectedChargedPoints || 0,
    );

    const user = await User.findById(req.auth.userId).select("points").lean();
    if (!user) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    if (pointsToRollback > 0 && Number(user.points || 0) < pointsToRollback) {
      return res.status(409).json({
        message: "이미 사용된 코인이 있어 자동 환불할 수 없습니다. 고객센터로 문의해 주세요.",
      });
    }

    const canceledPortOne = await cancelPortOnePayment({
      impUid: paymentRecord.impUid || impUid,
      merchantUid: paymentRecord.merchantUid || merchantUid,
      reason,
      amount: requestedCancelAmount,
      checksum: paidAmount > 0 ? paidAmount : undefined,
    });

    const updateResult = await (async () => {
      const runWithoutTransaction = async () => {
        const canceledPayment = await Payment.findByIdAndUpdate(
          paymentRecord._id,
          {
            $set: {
              status: "cancelled",
              rawPortOne: canceledPortOne,
              paymentMethod: normalizePaymentMethod(
                canceledPortOne?.pay_method || paymentRecord.paymentMethod,
              ),
              failureCode: null,
              failureMessage: null,
              failureStage: null,
            },
          },
          { new: true },
        ).lean();

        let updatedPoints = Number(user.points || 0);
        if (pointsToRollback > 0) {
          const updatedUser = await User.findByIdAndUpdate(
            req.auth.userId,
            { $inc: { points: -pointsToRollback } },
            { new: true, projection: { points: 1 } },
          ).lean();
          updatedPoints = Number(updatedUser?.points || 0);

          await PointHistory.create({
            userId: req.auth.userId,
            kind: "deduct",
            delta: -pointsToRollback,
            balanceAfter: updatedPoints,
            reason: "결제 취소(환불)로 포인트 회수",
            paymentId: paymentRecord._id,
            impUid: paymentRecord.impUid,
            merchantUid: paymentRecord.merchantUid,
            metadata: {
              source: "cancel",
              cancelAmount: Number(canceledPortOne?.cancel_amount || requestedCancelAmount || paidAmount || 0),
            },
          }).catch(() => {});
        }

        return { canceledPayment, updatedPoints };
      };

      const runWithTransaction = async () => {
        const session = await mongoose.startSession();
        let txPayload = null;

        try {
          await session.withTransaction(async () => {
            const canceledPayment = await Payment.findByIdAndUpdate(
              paymentRecord._id,
              {
                $set: {
                  status: "cancelled",
                  rawPortOne: canceledPortOne,
                  paymentMethod: normalizePaymentMethod(
                    canceledPortOne?.pay_method || paymentRecord.paymentMethod,
                  ),
                  failureCode: null,
                  failureMessage: null,
                  failureStage: null,
                },
              },
              { new: true, session },
            ).lean();

            let updatedPoints = Number(user.points || 0);
            if (pointsToRollback > 0) {
              const updatedUser = await User.findByIdAndUpdate(
                req.auth.userId,
                { $inc: { points: -pointsToRollback } },
                { new: true, projection: { points: 1 }, session },
              ).lean();
              updatedPoints = Number(updatedUser?.points || 0);

              await PointHistory.create([
                {
                  userId: req.auth.userId,
                  kind: "deduct",
                  delta: -pointsToRollback,
                  balanceAfter: updatedPoints,
                  reason: "결제 취소(환불)로 포인트 회수",
                  paymentId: paymentRecord._id,
                  impUid: paymentRecord.impUid,
                  merchantUid: paymentRecord.merchantUid,
                  metadata: {
                    source: "cancel",
                    cancelAmount: Number(canceledPortOne?.cancel_amount || requestedCancelAmount || paidAmount || 0),
                  },
                },
              ], { session });
            }

            txPayload = { canceledPayment, updatedPoints };
          });
          return txPayload;
        } finally {
          await session.endSession();
        }
      };

      try {
        return await runWithTransaction();
      } catch (error) {
        const txUnsupported = /Transaction numbers are only allowed|replica set|Transaction .* not supported/i.test(String(error?.message || ""));
        if (!txUnsupported) throw error;
        return runWithoutTransaction();
      }
    })();

    return res.status(200).json({
      message: "결제가 취소되었습니다.",
      idempotent: false,
      user: {
        id: String(req.auth.userId),
        points: Number(updateResult?.updatedPoints || 0),
      },
      payment: formatPaymentResponse(updateResult?.canceledPayment),
    });
  } catch (error) {
    await writeFailureLog({
      req,
      userId: req.auth?.userId,
      impUid: String(req.body?.impUid || req.body?.imp_uid || "").trim() || undefined,
      merchantUid: String(req.body?.merchantUid || req.body?.merchant_uid || "").trim() || undefined,
      source: "confirm",
      stage: "cancel_exception",
      code: "cancel_exception",
      message: error?.message || "결제 취소 처리 중 오류가 발생했습니다.",
      status: 500,
      payload: req.body,
    });
    return next(error);
  }
});

router.post("/report-failure", async (req, res) => {
  const merchantUid = String(req.body?.merchantUid || req.body?.merchant_uid || "").trim() || undefined;
  const impUid = String(req.body?.impUid || req.body?.paymentId || "").trim() || undefined;
  const reasonCode = String(req.body?.reasonCode || "client_failure").trim().slice(0, 80);
  const reasonMessage = String(req.body?.reasonMessage || "결제가 사용자 측에서 완료되지 않았습니다.").trim().slice(0, 500);

  const payment = await findPaymentRecord(impUid, merchantUid);
  if (payment && String(payment.userId) !== String(req.auth.userId)) {
    await writeFailureLog({
      req,
      userId: req.auth.userId,
      impUid,
      merchantUid,
      source: "client",
      stage: "report_failure",
      code: "forbidden_owner_mismatch",
      message: "본인 결제 건만 실패 보고할 수 있습니다.",
      status: 403,
      payload: req.body,
    });
    return res.status(403).json({ message: "본인 결제 건만 실패 보고할 수 있습니다." });
  }

  if (payment && payment.status !== "success") {
    await markPaymentFailure(payment, {
      status: reasonCode === "cancelled" ? "cancelled" : "failed",
      paymentMethod: payment.paymentMethod,
      failureCode: reasonCode,
      failureMessage: reasonMessage,
      failureStage: "client_report",
      incrementAttempt: false,
    });
  }

  await writeFailureLog({
    req,
    userId: req.auth.userId,
    impUid,
    merchantUid,
    source: "client",
    stage: "client_report",
    code: reasonCode,
    message: reasonMessage,
    status: 200,
    payload: req.body,
  });

  return res.status(200).json({ ok: true, message: "결제 실패 보고가 기록되었습니다." });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const user = await findUserByIdRaw(userId, {
      name: 1,
      email: 1,
      points: 1,
      unlockedFeatures: 1,
      profileSubscription: 1,
    });

    const [recentPayments, pointHistories] = await Promise.all([
      Payment.find({ userId: req.auth.userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      PointHistory.find({ userId: req.auth.userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);
    const unlockedFeatures = Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : [];
    const unlockMap = Object.create(null);
    for (let i = 0; i < unlockedFeatures.length; i += 1) {
      const key = String(unlockedFeatures[i] || "").trim();
      if (key) unlockMap[key] = true;
    }

    const mappedPayments = recentPayments.map((payment) => formatPaymentResponse(payment));
    const mappedPointHistories = pointHistories.map((entry) => ({
      id: String(entry._id),
      kind: entry.kind,
      delta: Number(entry.delta || 0),
      balanceAfter: Number(entry.balanceAfter || 0),
      reason: entry.reason,
      featureKey: entry.featureKey,
      createdAt: entry.createdAt,
    }));

    const sub = user?.profileSubscription || {};
    const tier = String(sub.tier || "free");
    const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
    const validExpiresAt = expiresAt && Number.isFinite(expiresAt.getTime())
      ? expiresAt.toISOString()
      : null;
    const subscriptions = tier !== "free" && validExpiresAt
      ? [{
          tier,
          source: String(sub.source || "coin"),
          isActive: new Date(validExpiresAt).getTime() > Date.now(),
          expiresAt: validExpiresAt,
        }]
      : [];

    const balance = Number(user?.points || 0);

    return res.status(200).json({
      success: true,
      ok: true,
      data: {
        balance,
        transactions: mappedPointHistories,
        payments: mappedPayments,
        subscriptions,
      },
      user: {
        id: String(req.auth.userId),
        name: user?.name || "",
        email: user?.email || "",
        points: balance,
        unlockedFeatures,
      },
      unlockedFeatures,
      unlockMap,
      payments: mappedPayments,
      pointHistories: mappedPointHistories,
      subscriptions,
      ...(user ? {} : {
        message: "사용자 프로필이 없어 기본값으로 응답했습니다.",
        userFound: false,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/points/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const user = await findUserByIdRaw(userId, {
      name: 1,
      email: 1,
      points: 1,
    });

    const pointHistories = await PointHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const mappedPointHistories = pointHistories.map((entry) => ({
      id: String(entry._id),
      kind: entry.kind,
      delta: Number(entry.delta || 0),
      balanceAfter: Number(entry.balanceAfter || 0),
      reason: entry.reason,
      featureKey: entry.featureKey,
      createdAt: entry.createdAt,
    }));

    return res.status(200).json({
      success: true,
      ok: true,
      data: {
        balance: Number(user?.points || 0),
        transactions: mappedPointHistories,
        payments: [],
        subscriptions: [],
      },
      user: {
        id: String(userId),
        name: user?.name || "",
        email: user?.email || "",
        points: Number(user?.points || 0),
      },
      pointHistories: mappedPointHistories,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
