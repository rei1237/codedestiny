import { connectDb, mongoose } from "../lib/db.js";
import { Payment, PaymentFailureLog, PointHistory, User } from "../lib/models.js";
import { requireAuth } from "../lib/auth.js";
import { cancelPortOnePayment, fetchPortOnePayment } from "../lib/portone.js";
import { resolveChargePointsByAmount, validatePointChargePayload } from "../lib/validation.js";
import { getEnv } from "../lib/env.js";
import { getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";

function toDateFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return new Date();
  return new Date(unixSeconds * 1000);
}

function normalizePaymentMethod(value) {
  const method = String(value || "unknown").trim();
  return method ? method.slice(0, 32) : "unknown";
}

function normalizeIdempotencyKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.slice(0, 120);
}

function resolveIdempotencyKey(request, body) {
  return normalizeIdempotencyKey(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  );
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
    } catch {
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

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const clone = { ...payload };
  if (clone.card_number) clone.card_number = "[redacted]";
  if (clone.customer_uid) clone.customer_uid = "[redacted]";
  return clone;
}

async function writeFailureLog(params = {}) {
  const {
    request,
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
    requestMeta: request ? getRequestMeta(request) : undefined,
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

function isTransactionUnsupported(error) {
  return /Transaction numbers are only allowed|replica set|Transaction .* not supported/i
    .test(String(error?.message || ""));
}

async function settlePaymentByImpUid({
  env,
  impUid,
  requestedUserId,
  requestedAmount,
  requestedChargePoints,
  requestedPaymentMethod,
  merchantUidHint,
  source,
  strictAmountMatch,
  request,
  body,
}) {
  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(env, impUid);
  } catch (error) {
    await writeFailureLog({
      request,
      userId: requestedUserId,
      impUid,
      merchantUid: merchantUidHint,
      source,
      stage: "portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "PortOne payment lookup failed.",
      status: 502,
      payload: body,
    });

    return {
      ok: false,
      status: 502,
      message: "Payment lookup failed. Please try again.",
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
      request,
      userId: requestedUserId,
      impUid,
      merchantUid,
      source,
      stage: "owner_resolve",
      code: "owner_not_found",
      message: "Could not resolve the payment owner.",
      status: 400,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: "Could not resolve the payment owner." };
  }

  if (requestedUserId && String(requestedUserId) !== ownerUserId) {
    await writeFailureLog({
      request,
      userId: requestedUserId,
      impUid,
      merchantUid,
      source,
      stage: "owner_mismatch",
      code: "forbidden_owner_mismatch",
      message: "Only your own payment can be processed.",
      status: 403,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 403, message: "Only your own payment can be processed." };
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
      failureMessage: "PortOne payment amount is invalid.",
      failureStage: "amount_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_validate",
      code: "invalid_portone_amount",
      message: "PortOne payment amount is invalid.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: "PortOne payment amount is invalid." };
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
      failureMessage: "Client amount does not match PortOne amount.",
      failureStage: "amount_match",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "client_amount_mismatch",
      message: "Client amount does not match PortOne amount.",
      status: 400,
      clientAmount: Number(requestedAmount),
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "Client amount does not match PortOne amount.",
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
      failureMessage: "Prepared amount does not match PortOne amount.",
      failureStage: "amount_match",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "server_amount_mismatch",
      message: "Prepared amount does not match PortOne amount.",
      status: 400,
      expectedAmount: Number(paymentRecord.paymentAmount),
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "Prepared amount does not match PortOne amount.",
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
      failureMessage: "Payment is not in paid status.",
      failureStage: "status_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "status_validate",
      code: "payment_not_paid",
      message: "Payment is not in paid status.",
      status: 400,
      portOneStatus: portOneStatus || "unknown",
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "Payment is not in paid status.",
      portOneStatus: portOneStatus || "unknown",
    };
  }

  let chargedPoints;
  try {
    const pointsForPolicy = expectedChargedPoints > 0 ? expectedChargedPoints : undefined;
    chargedPoints = resolveChargePointsByAmount(env, portOneAmount, pointsForPolicy);
  } catch (error) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "charge_policy_invalid",
      failureMessage: error.message || "Charge point policy validation failed.",
      failureStage: "policy_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "policy_validate",
      code: "charge_policy_invalid",
      message: error.message || "Charge point policy validation failed.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: error.message || "Charge point policy validation failed." };
  }

  const ownerExists = await User.exists({ _id: ownerUserId });
  if (!ownerExists) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "user_not_found",
      failureMessage: "User not found for point charge.",
      failureStage: "user_lookup",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "user_lookup",
      code: "user_not_found",
      message: "User not found for point charge.",
      status: 404,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 404, message: "User not found for point charge." };
  }

  const paidAt = toDateFromUnixSeconds(portOnePayment.paid_at);

  const runSettlementWithoutTransaction = async () => {
    const finalizedPayment = await Payment.findOneAndUpdate(
      { _id: paymentRecord._id, status: { $ne: "success" } },
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
      { returnDocument: "after" },
    ).lean();

    if (!finalizedPayment) {
      const latestPayment = await Payment.findById(paymentRecord._id).lean();
      return {
        ok: true,
        idempotent: true,
        user: { id: ownerUserId, points: await getUserPoints(ownerUserId) },
        payment: formatPaymentResponse(latestPayment),
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      ownerUserId,
      { $inc: { points: chargedPoints } },
      { returnDocument: "after", projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      await Payment.findByIdAndUpdate(finalizedPayment._id, {
        $set: {
          status: "failed",
          failureCode: "user_not_found",
          failureMessage: "User not found for point charge.",
          failureStage: "user_update",
          lastErrorAt: new Date(),
        },
      }).catch(() => {});

      return { ok: false, status: 404, message: "User not found for point charge." };
    }

    await PointHistory.create({
      userId: ownerUserId,
      kind: "charge",
      delta: chargedPoints,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "Point charge",
      paymentId: finalizedPayment._id,
      impUid,
      merchantUid: finalizedPayment.merchantUid,
      metadata: { source, paymentAmount: portOneAmount, paymentMethod },
    }).catch(() => {});

    return {
      ok: true,
      idempotent: false,
      user: { id: ownerUserId, points: Number(updatedUser.points || 0) },
      payment: formatPaymentResponse(finalizedPayment),
    };
  };

  const runSettlementWithTransaction = async () => {
    const session = await mongoose.startSession();
    let txResult = null;

    try {
      await session.withTransaction(async () => {
        const finalizedPayment = await Payment.findOneAndUpdate(
          { _id: paymentRecord._id, status: { $ne: "success" } },
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
          { returnDocument: "after", session },
        ).lean();

        if (!finalizedPayment) {
          const latestPayment = await Payment.findById(paymentRecord._id).session(session).lean();
          txResult = {
            ok: true,
            idempotent: true,
            user: { id: ownerUserId, points: await getUserPoints(ownerUserId) },
            payment: formatPaymentResponse(latestPayment),
          };
          return;
        }

        const updatedUser = await User.findByIdAndUpdate(
          ownerUserId,
          { $inc: { points: chargedPoints } },
          { returnDocument: "after", projection: { points: 1 }, session },
        ).lean();

        if (!updatedUser) throw new Error("user_not_found");

        await PointHistory.create([{
          userId: ownerUserId,
          kind: "charge",
          delta: chargedPoints,
          balanceAfter: Number(updatedUser.points || 0),
          reason: "Point charge",
          paymentId: finalizedPayment._id,
          impUid,
          merchantUid: finalizedPayment.merchantUid,
          metadata: { source, paymentAmount: portOneAmount, paymentMethod },
        }], { session });

        txResult = {
          ok: true,
          idempotent: false,
          user: { id: ownerUserId, points: Number(updatedUser.points || 0) },
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
    if (!isTransactionUnsupported(error)) throw error;
    settlementResult = await runSettlementWithoutTransaction();
  }

  if (!settlementResult?.ok) {
    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "settlement",
      code: "settlement_failed",
      message: settlementResult?.message || "Payment settlement failed.",
      status: settlementResult?.status || 500,
      expectedAmount,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });
  }

  return settlementResult;
}

async function handleWebhook(request, env) {
  const body = await readJson(request);
  const expectedWebhookToken = getEnv(env, "PORTONE_WEBHOOK_TOKEN");
  if (expectedWebhookToken) {
    const suppliedWebhookToken = String(request.headers.get("x-cd-webhook-token") || "").trim();
    if (suppliedWebhookToken !== expectedWebhookToken) {
      await writeFailureLog({
        request,
        source: "webhook",
        stage: "webhook_auth",
        code: "invalid_webhook_token",
        message: "Webhook token mismatch.",
        status: 401,
        payload: body,
      });
      return json({ message: "Invalid webhook request." }, { status: 401 });
    }
  }

  const impUid = String(
    body?.imp_uid
      || body?.impUid
      || body?.data?.imp_uid
      || "",
  ).trim();

  const merchantUid = String(
    body?.merchant_uid
      || body?.merchantUid
      || body?.data?.merchant_uid
      || "",
  ).trim();

  if (!impUid) {
    await writeFailureLog({
      request,
      source: "webhook",
      stage: "payload_validate",
      code: "missing_imp_uid",
      message: "Webhook body must include imp_uid.",
      status: 400,
      payload: body,
    });
    return json({ message: "Webhook body must include imp_uid." }, { status: 400 });
  }

  const settled = await settlePaymentByImpUid({
    env,
    impUid,
    merchantUidHint: merchantUid || undefined,
    source: "webhook",
    strictAmountMatch: false,
    request,
    body,
  });

  if (!settled.ok) {
    return json({ ok: false, message: settled.message });
  }

  return json({
    ok: true,
    idempotent: Boolean(settled.idempotent),
    payment: settled.payment,
  });
}

async function handlePrepare(request, env, auth) {
  const body = await readJson(request);
  const paymentAmount = Number(body?.paymentAmount ?? body?.amount);
  const requestedChargePoints = body?.chargePoints === undefined || body?.chargePoints === null
    ? undefined
    : Number(body?.chargePoints);

  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "prepare",
      stage: "payload_validate",
      code: "invalid_payment_amount",
      message: "paymentAmount must be a positive integer.",
      status: 400,
      payload: body,
    });
    return json({ message: "paymentAmount must be a positive integer." }, { status: 400 });
  }

  if (requestedChargePoints !== undefined && (!Number.isInteger(requestedChargePoints) || requestedChargePoints <= 0)) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "prepare",
      stage: "payload_validate",
      code: "invalid_charge_points",
      message: "chargePoints must be a positive integer.",
      status: 400,
      payload: body,
    });
    return json({ message: "chargePoints must be a positive integer." }, { status: 400 });
  }

  const chargedPoints = resolveChargePointsByAmount(env, paymentAmount, requestedChargePoints);
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
  const rawProductName = String(body?.productName || `${chargedPoints.toLocaleString("ko-KR")} point charge`).trim();
  const productName = rawProductName.slice(0, 80) || `${chargedPoints.toLocaleString("ko-KR")} point charge`;
  const idempotencyKey = resolveIdempotencyKey(request, body);

  if (idempotencyKey) {
    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "point_charge",
    }).sort({ createdAt: -1 }).lean();

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingPoints = Number(existing.expectedChargedPoints || 0);
      if (existingAmount !== paymentAmount || existingPoints !== chargedPoints) {
        return json({
          message: "Idempotency key conflict. Request payload does not match existing payment preparation.",
          code: "IDEMPOTENCY_CONFLICT",
        }, { status: 409 });
      }

      return json({
        message: "Payment preparation already completed.",
        idempotent: true,
        order: {
          merchantUid: String(existing.merchantUid || ""),
          paymentAmount: existingAmount,
          chargePoints: existingPoints,
          productName,
        },
      });
    }
  }

  const merchantUid = buildMerchantUid(auth.userId);

  try {
    await Payment.create({
      userId: auth.userId,
      merchantUid,
      idempotencyKey,
      paymentAmount,
      expectedChargedPoints: chargedPoints,
      chargedPoints: 0,
      paymentMethod,
      status: "pending",
      source: "prepare",
      paymentType: "point_charge",
      subscriptionTier: "",
    });
  } catch (error) {
    if (Number(error?.code) !== 11000 || !idempotencyKey) throw error;

    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "point_charge",
    }).sort({ createdAt: -1 }).lean();

    if (!existing) throw error;

    const existingAmount = Number(existing.paymentAmount || 0);
    const existingPoints = Number(existing.expectedChargedPoints || 0);
    if (existingAmount !== paymentAmount || existingPoints !== chargedPoints) {
      return json({
        message: "Idempotency key conflict. Request payload does not match existing payment preparation.",
        code: "IDEMPOTENCY_CONFLICT",
      }, { status: 409 });
    }

    return json({
      message: "Payment preparation already completed.",
      idempotent: true,
      order: {
        merchantUid: String(existing.merchantUid || ""),
        paymentAmount: existingAmount,
        chargePoints: existingPoints,
        productName,
      },
    });
  }

  return json({
    message: "Payment preparation completed.",
    idempotent: false,
    order: {
      merchantUid,
      paymentAmount,
      chargePoints: chargedPoints,
      productName,
    },
  }, { status: 201 });
}

async function handleSubscriptionPrepare(request, auth) {
  const body = await readJson(request);
  const tier = String(body?.tier || "").trim().toLowerCase();
  const plan = resolveSubscriptionPlan(tier);
  if (!plan) {
    return json({ message: "Unsupported subscription plan.", code: "INVALID_SUBSCRIPTION_TIER" }, { status: 400 });
  }

  const paymentMethod = normalizePaymentMethod(body?.paymentMethod || "card_general");
  const currentUser = await User.findById(auth.userId).select("profileSubscription").lean();
  if (!currentUser) {
    return json({ message: "User not found." }, { status: 404 });
  }

  if (hasActiveSubscriptionConflict(currentUser?.profileSubscription)) {
    return json({
      message: "An active subscription already exists. Concurrent subscriptions are not allowed.",
      code: "SUBSCRIPTION_CONFLICT",
    }, { status: 409 });
  }

  const idempotencyKey = resolveIdempotencyKey(request, body);
  if (idempotencyKey) {
    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "subscription_initial",
    }).sort({ createdAt: -1 }).lean();

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingTier = String(existing.subscriptionTier || "").trim().toLowerCase();
      if (existingAmount !== plan.wonPrice || existingTier !== tier) {
        return json({
          message: "Idempotency key conflict. Request payload does not match existing subscription preparation.",
          code: "IDEMPOTENCY_CONFLICT",
        }, { status: 409 });
      }

      return json({
        message: "Subscription payment preparation already completed.",
        idempotent: true,
        order: {
          merchantUid: String(existing.merchantUid || ""),
          customerUid: buildSubscriptionCustomerUid(auth.userId),
          tier,
          paymentAmount: existingAmount,
          productName: `${plan.name} 정기결제`,
          profileLimit: plan.profileLimit,
          durationDays: plan.durationDays,
        },
      });
    }
  }

  const merchantUid = buildSubscriptionMerchantUid(auth.userId, tier);
  const customerUid = buildSubscriptionCustomerUid(auth.userId);

  try {
    await Payment.create({
      userId: auth.userId,
      merchantUid,
      idempotencyKey,
      paymentAmount: plan.wonPrice,
      expectedChargedPoints: 0,
      chargedPoints: 0,
      paymentMethod,
      status: "pending",
      source: "prepare",
      paymentType: "subscription_initial",
      subscriptionTier: tier,
    });
  } catch (error) {
    if (Number(error?.code) !== 11000 || !idempotencyKey) throw error;

    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "subscription_initial",
    }).sort({ createdAt: -1 }).lean();

    if (!existing) throw error;

    const existingAmount = Number(existing.paymentAmount || 0);
    const existingTier = String(existing.subscriptionTier || "").trim().toLowerCase();
    if (existingAmount !== plan.wonPrice || existingTier !== tier) {
      return json({
        message: "Idempotency key conflict. Request payload does not match existing subscription preparation.",
        code: "IDEMPOTENCY_CONFLICT",
      }, { status: 409 });
    }

    return json({
      message: "Subscription payment preparation already completed.",
      idempotent: true,
      order: {
        merchantUid: String(existing.merchantUid || ""),
        customerUid,
        tier,
        paymentAmount: existingAmount,
        productName: `${plan.name} 정기결제`,
        profileLimit: plan.profileLimit,
        durationDays: plan.durationDays,
      },
    });
  }

  return json({
    message: "Subscription payment preparation completed.",
    idempotent: false,
    order: {
      merchantUid,
      customerUid,
      tier,
      paymentAmount: plan.wonPrice,
      productName: `${plan.name} 정기결제`,
      profileLimit: plan.profileLimit,
      durationDays: plan.durationDays,
    },
  }, { status: 201 });
}

async function handleSubscriptionConfirm(request, env, auth) {
  const body = await readJson(request);
  const impUid = String(body?.impUid || body?.paymentId || "").trim();
  const tier = String(body?.tier || "").trim().toLowerCase();
  const customerUidFromClient = String(body?.customerUid || "").trim();
  const merchantUidHint = String(body?.merchantUid || body?.merchant_uid || "").trim();
  const paymentMethodHint = normalizePaymentMethod(body?.paymentMethod || "card");
  const plan = resolveSubscriptionPlan(tier);

  if (!impUid || !plan) {
    return json({ message: "impUid and valid tier are required." }, { status: 400 });
  }

  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(env, impUid);
  } catch (error) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid: merchantUidHint || undefined,
      source: "confirm",
      stage: "subscription_portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "PortOne payment lookup failed.",
      status: 502,
      payload: body,
    });
    return json({ message: "Failed to verify payment." }, { status: 502 });
  }

  const portOneStatus = String(portOnePayment?.status || "").toLowerCase();
  const portOneAmount = Number(portOnePayment?.amount || 0);
  const merchantUid = String(portOnePayment?.merchant_uid || merchantUidHint || "").trim();
  const resolvedPaymentMethod = normalizePaymentMethod(portOnePayment?.pay_method || paymentMethodHint);

  if (merchantUidHint && merchantUidHint !== merchantUid) {
    return json({ message: "merchantUid mismatch." }, { status: 400 });
  }

  const paymentRecord = await findPaymentRecord(impUid, merchantUid);
  if (!paymentRecord) {
    return json({ message: "Payment record not found." }, { status: 404 });
  }

  if (String(paymentRecord.userId) !== String(auth.userId)) {
    return json({ message: "Only your own payment can be processed." }, { status: 403 });
  }

  if (paymentRecord.status === "success") {
    const currentUser = await User.findById(auth.userId).select("profileSubscription").lean();
    const sub = currentUser?.profileSubscription || {};
    return json({
      message: "Subscription payment already processed.",
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
      failureMessage: `Unexpected payment status: ${portOneStatus || "unknown"}`,
      failureStage: "subscription_status_validate",
      incrementAttempt: true,
    });
    return json({ message: "Payment is not completed.", status: portOneStatus || "unknown" }, { status: 400 });
  }

  if (!Number.isInteger(portOneAmount) || portOneAmount !== plan.wonPrice) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod: resolvedPaymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "subscription_amount_mismatch",
      failureMessage: "Subscription payment amount mismatch.",
      failureStage: "subscription_amount_validate",
      incrementAttempt: true,
    });
    return json({ message: "Subscription payment amount mismatch." }, { status: 400 });
  }

  const now = new Date();
  const paidAt = portOnePayment?.paid_at ? toDateFromUnixSeconds(portOnePayment.paid_at) : now;
  const expiresAt = new Date(Math.max(now.getTime(), paidAt.getTime()) + plan.durationDays * 86400000);
  const customerUid = customerUidFromClient || buildSubscriptionCustomerUid(auth.userId);

  const existingUser = await User.findById(auth.userId).select("profileSubscription").lean();
  if (hasActiveSubscriptionConflict(existingUser?.profileSubscription)) {
    return json({
      message: "An active subscription already exists. Concurrent subscriptions are not allowed.",
      code: "SUBSCRIPTION_CONFLICT",
    }, { status: 409 });
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
    auth.userId,
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
    { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
  ).lean();

  return json({
    message: "Card subscription has been activated.",
    idempotent: false,
    payment: formatPaymentResponse(await Payment.findById(paymentRecord._id).lean()),
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
      id: String(auth.userId),
      points: Number(updatedUser?.points || 0),
    },
  });
}

async function handleConfirm(request, env, auth) {
  const body = await readJson(request);
  const hasMinimalRedirectPayload = Boolean(
    (body?.impUid || body?.paymentId)
      && (body?.merchantUid || body?.merchant_uid)
      && (body?.paymentAmount === undefined && body?.amount === undefined),
  );

  let isValid = false;
  let errors = [];
  let sanitized = null;

  if (hasMinimalRedirectPayload) {
    sanitized = {
      impUid: String(body?.impUid || body?.paymentId || "").trim(),
      merchantUid: String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined,
      paymentAmount: undefined,
      chargePoints: undefined,
      paymentMethod: String(body?.paymentMethod || "").trim() || undefined,
    };
    isValid = Boolean(sanitized.impUid);
    if (!isValid) errors = ["impUid is required."];
  } else {
    const validated = validatePointChargePayload(body);
    isValid = validated.isValid;
    errors = validated.errors;
    sanitized = validated.sanitized;
  }

  if (!isValid) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid: String(body?.impUid || body?.paymentId || "").trim() || undefined,
      merchantUid: String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined,
      source: "confirm",
      stage: "payload_validate",
      code: "invalid_confirm_payload",
      message: "Invalid payment confirm payload.",
      status: 400,
      payload: { ...body, errors },
    });

    return json({ message: "Invalid payment confirm payload.", errors }, { status: 400 });
  }

  const settled = await settlePaymentByImpUid({
    env,
    impUid: sanitized.impUid,
    requestedUserId: auth.userId,
    requestedAmount: sanitized.paymentAmount,
    requestedChargePoints: sanitized.chargePoints,
    requestedPaymentMethod: sanitized.paymentMethod,
    merchantUidHint: sanitized.merchantUid,
    source: "confirm",
    strictAmountMatch: true,
    request,
    body,
  });

  if (!settled.ok) {
    return json({
      message: settled.message,
      ...(settled.clientAmount !== undefined ? { clientAmount: settled.clientAmount } : {}),
      ...(settled.portOneAmount !== undefined ? { portOneAmount: settled.portOneAmount } : {}),
      ...(settled.expectedAmount !== undefined ? { expectedAmount: settled.expectedAmount } : {}),
      ...(settled.portOneStatus ? { status: settled.portOneStatus } : {}),
    }, { status: settled.status || 400 });
  }

  return json({
    message: settled.idempotent ? "Payment was already processed." : "Point charge completed.",
    idempotent: Boolean(settled.idempotent),
    user: settled.user,
    payment: settled.payment,
  });
}

async function runCancelUpdate({ paymentRecord, canceledPortOne, pointsToRollback, auth, user, requestedCancelAmount, paidAmount }) {
  const runWithoutTransaction = async () => {
    const canceledPayment = await Payment.findByIdAndUpdate(
      paymentRecord._id,
      {
        $set: {
          status: "cancelled",
          rawPortOne: canceledPortOne,
          paymentMethod: normalizePaymentMethod(canceledPortOne?.pay_method || paymentRecord.paymentMethod),
          failureCode: null,
          failureMessage: null,
          failureStage: null,
        },
      },
      { returnDocument: "after" },
    ).lean();

    let updatedPoints = Number(user.points || 0);
    if (pointsToRollback > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        auth.userId,
        { $inc: { points: -pointsToRollback } },
        { returnDocument: "after", projection: { points: 1 } },
      ).lean();
      updatedPoints = Number(updatedUser?.points || 0);

      await PointHistory.create({
        userId: auth.userId,
        kind: "deduct",
        delta: -pointsToRollback,
        balanceAfter: updatedPoints,
        reason: "Point rollback after payment cancellation",
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
              paymentMethod: normalizePaymentMethod(canceledPortOne?.pay_method || paymentRecord.paymentMethod),
              failureCode: null,
              failureMessage: null,
              failureStage: null,
            },
          },
          { returnDocument: "after", session },
        ).lean();

        let updatedPoints = Number(user.points || 0);
        if (pointsToRollback > 0) {
          const updatedUser = await User.findByIdAndUpdate(
            auth.userId,
            { $inc: { points: -pointsToRollback } },
            { returnDocument: "after", projection: { points: 1 }, session },
          ).lean();
          updatedPoints = Number(updatedUser?.points || 0);

          await PointHistory.create([{
            userId: auth.userId,
            kind: "deduct",
            delta: -pointsToRollback,
            balanceAfter: updatedPoints,
            reason: "Point rollback after payment cancellation",
            paymentId: paymentRecord._id,
            impUid: paymentRecord.impUid,
            merchantUid: paymentRecord.merchantUid,
            metadata: {
              source: "cancel",
              cancelAmount: Number(canceledPortOne?.cancel_amount || requestedCancelAmount || paidAmount || 0),
            },
          }], { session });
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
    if (!isTransactionUnsupported(error)) throw error;
    return runWithoutTransaction();
  }
}

async function handleCancel(request, env, auth) {
  const body = await readJson(request);
  const impUid = String(body?.impUid || body?.imp_uid || "").trim() || undefined;
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined;
  const reason = String(body?.reason || "Customer refund request").trim().slice(0, 120);
  const requestedCancelAmountRaw = body?.cancelAmount ?? body?.amount;
  const requestedCancelAmount = requestedCancelAmountRaw === undefined || requestedCancelAmountRaw === null
    ? undefined
    : Number(requestedCancelAmountRaw);

  if (!impUid && !merchantUid) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "confirm",
      stage: "cancel_payload",
      code: "missing_cancel_key",
      message: "impUid or merchantUid is required.",
      status: 400,
      payload: body,
    });
    return json({ message: "impUid or merchantUid is required." }, { status: 400 });
  }

  if (requestedCancelAmount !== undefined && (!Number.isInteger(requestedCancelAmount) || requestedCancelAmount <= 0)) {
    return json({ message: "cancelAmount must be a positive integer." }, { status: 400 });
  }

  const paymentRecord = await findPaymentRecord(impUid, merchantUid);
  if (!paymentRecord) return json({ message: "Payment not found." }, { status: 404 });

  if (String(paymentRecord.userId) !== String(auth.userId)) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid,
      source: "confirm",
      stage: "cancel_owner",
      code: "forbidden_owner_mismatch",
      message: "Only your own payment can be cancelled.",
      status: 403,
      payload: body,
    });
    return json({ message: "Only your own payment can be cancelled." }, { status: 403 });
  }

  if (paymentRecord.status === "cancelled") {
    return json({
      message: "Payment was already cancelled.",
      idempotent: true,
      payment: formatPaymentResponse(paymentRecord),
    });
  }

  if (paymentRecord.status !== "success") {
    return json({ message: "Only successful payments can be cancelled." }, { status: 400 });
  }

  const paidAmount = Number(paymentRecord.paymentAmount || 0);
  if (requestedCancelAmount !== undefined && requestedCancelAmount > paidAmount) {
    return json({ message: "Cancel amount exceeds paid amount." }, { status: 400 });
  }

  const pointsToRollback = Number(paymentRecord.chargedPoints || paymentRecord.expectedChargedPoints || 0);
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  if (pointsToRollback > 0 && Number(user.points || 0) < pointsToRollback) {
    return json({
      message: "Automatic refund is blocked because the charged points were already used. Please contact support.",
    }, { status: 409 });
  }

  const canceledPortOne = await cancelPortOnePayment(env, {
    impUid: paymentRecord.impUid || impUid,
    merchantUid: paymentRecord.merchantUid || merchantUid,
    reason,
    amount: requestedCancelAmount,
    checksum: paidAmount > 0 ? paidAmount : undefined,
  });

  const updateResult = await runCancelUpdate({
    paymentRecord,
    canceledPortOne,
    pointsToRollback,
    auth,
    user,
    requestedCancelAmount,
    paidAmount,
  });

  return json({
    message: "Payment cancelled.",
    idempotent: false,
    user: {
      id: String(auth.userId),
      points: Number(updateResult?.updatedPoints || 0),
    },
    payment: formatPaymentResponse(updateResult?.canceledPayment),
  });
}

async function handleReportFailure(request, auth) {
  const body = await readJson(request);
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined;
  const impUid = String(body?.impUid || body?.paymentId || "").trim() || undefined;
  const reasonCode = String(body?.reasonCode || "client_failure").trim().slice(0, 80);
  const reasonMessage = String(body?.reasonMessage || "Payment was not completed on the client.").trim().slice(0, 500);

  const payment = await findPaymentRecord(impUid, merchantUid);
  if (payment && String(payment.userId) !== String(auth.userId)) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid,
      source: "client",
      stage: "report_failure",
      code: "forbidden_owner_mismatch",
      message: "Only your own payment can be reported.",
      status: 403,
      payload: body,
    });
    return json({ message: "Only your own payment can be reported." }, { status: 403 });
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
    request,
    userId: auth.userId,
    impUid,
    merchantUid,
    source: "client",
    stage: "client_report",
    code: reasonCode,
    message: reasonMessage,
    status: 200,
    payload: body,
  });

  return json({ ok: true, message: "Payment failure report recorded." });
}

function formatPointHistoryEntry(entry) {
  return {
    id: String(entry?._id || ""),
    kind: entry?.kind,
    delta: Number(entry?.delta || 0),
    balanceAfter: Number(entry?.balanceAfter || 0),
    reason: entry?.reason,
    featureKey: entry?.featureKey,
    createdAt: entry?.createdAt,
  };
}

function buildSubscriptionSummary(profileSubscription) {
  const sub = profileSubscription || {};
  const tier = String(sub.tier || "free").trim() || "free";
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  const validExpiresAt = expiresAt && Number.isFinite(expiresAt.getTime())
    ? expiresAt.toISOString()
    : null;
  const isActive = tier !== "free" && !!validExpiresAt && new Date(validExpiresAt).getTime() > Date.now();

  if (!isActive) return [];

  return [{
    tier,
    source: String(sub.source || "coin"),
    isActive,
    expiresAt: validExpiresAt,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    cancelRequestedAt: toIsoOrNull(sub.cancelRequestedAt),
  }];
}

function buildMeResponseBody(auth, user, recentPayments, pointHistories) {
  const safeUser = user || {};
  const unlockedFeatures = Array.isArray(safeUser.unlockedFeatures) ? safeUser.unlockedFeatures : [];
  const unlockMap = Object.create(null);
  for (let i = 0; i < unlockedFeatures.length; i += 1) {
    const key = String(unlockedFeatures[i] || "").trim();
    if (key) unlockMap[key] = true;
  }

  const mappedPayments = Array.isArray(recentPayments)
    ? recentPayments.map((payment) => formatPaymentResponse(payment)).filter(Boolean)
    : [];
  const mappedTransactions = Array.isArray(pointHistories)
    ? pointHistories.map((entry) => formatPointHistoryEntry(entry)).filter((entry) => entry.id)
    : [];
  const subscriptions = buildSubscriptionSummary(safeUser.profileSubscription);
  const balance = Number(safeUser.points || 0);

  return {
    success: true,
    ok: true,
    data: {
      balance,
      transactions: mappedTransactions,
      payments: mappedPayments,
      subscriptions,
    },
    user: {
      id: String(auth.userId),
      name: safeUser.name || "",
      email: safeUser.email || "",
      points: balance,
      unlockedFeatures,
    },
    unlockedFeatures,
    unlockMap,
    payments: mappedPayments,
    pointHistories: mappedTransactions,
    subscriptions,
  };
}

function buildTokenFallbackPaymentsMe(auth, message) {
  const balance = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
  return {
    success: true,
    ok: true,
    message: message || "Payment data is temporarily unavailable. Loaded safe account data from token.",
    userFound: false,
    source: "token",
    data: {
      balance,
      transactions: [],
      payments: [],
      subscriptions: [],
    },
    user: {
      id: String(auth?.userId || ""),
      name: String(auth?.name || ""),
      email: String(auth?.email || ""),
      points: balance,
      unlockedFeatures: [],
    },
    unlockedFeatures: [],
    unlockMap: {},
    payments: [],
    pointHistories: [],
    subscriptions: [],
  };
}

async function handleMe(auth) {
  try {
    const user = await findUserByIdRaw(auth.userId, {
      name: 1,
      email: 1,
      points: 1,
      unlockedFeatures: 1,
      profileSubscription: 1,
    });

    const [recentPayments, pointHistories] = await Promise.all([
      Payment.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(10).lean(),
      PointHistory.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const body = buildMeResponseBody(auth, user, recentPayments, pointHistories);
    if (!user) {
      body.message = "User profile is missing. Returned safe defaults.";
      body.userFound = false;
    }

    return json(body);
  } catch (error) {
    console.warn("[payments/me] degraded fallback to token:", String(error?.message || "unknown"));
    return json(buildTokenFallbackPaymentsMe(auth));
  }
}

async function handlePointsMe(auth) {
  try {
    const user = await findUserByIdRaw(auth.userId, {
      name: 1,
      email: 1,
      points: 1,
    });

    const pointHistories = await PointHistory.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const transactions = Array.isArray(pointHistories)
      ? pointHistories.map((entry) => formatPointHistoryEntry(entry)).filter((entry) => entry.id)
      : [];
    const balance = Number(user?.points || 0);

    return json({
      success: true,
      ok: true,
      data: {
        balance,
        transactions,
        payments: [],
        subscriptions: [],
      },
      user: {
        id: String(auth.userId),
        name: user?.name || "",
        email: user?.email || "",
        points: balance,
      },
      pointHistories: transactions,
      transactions,
    });
  } catch (error) {
    console.warn("[payments/points-me] degraded fallback to token:", String(error?.message || "unknown"));
    const fallbackBody = buildTokenFallbackPaymentsMe(auth, "Point history is temporarily unavailable. Loaded safe account data from token.");
    return json({
      success: true,
      ok: true,
      source: fallbackBody.source,
      message: fallbackBody.message,
      data: {
        balance: fallbackBody.data.balance,
        transactions: [],
        payments: [],
        subscriptions: [],
      },
      user: {
        id: fallbackBody.user.id,
        name: fallbackBody.user.name,
        email: fallbackBody.user.email,
        points: fallbackBody.user.points,
      },
      pointHistories: [],
      transactions: [],
    });
  }
}

export async function handlePaymentRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/payments");
  const trace = {
    route: "payments",
    requestPath: new URL(request.url).pathname,
    method,
    authPresent: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    authVerified: false,
    dbConnected: false,
    mongoQueryFailed: false,
    paymentProviderFailed: false,
    env: {
      mongoUriConfigured: Boolean(getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI")),
      jwtSecretConfigured: Boolean(getEnv(env, "JWT_SECRET") || getEnv(env, "AUTH_SECRET")),
      portoneApiKeyConfigured: Boolean(getEnv(env, "PORTONE_API_KEY") || getEnv(env, "PORTONE_REST_API_KEY")),
      portoneApiSecretConfigured: Boolean(getEnv(env, "PORTONE_API_SECRET") || getEnv(env, "PORTONE_REST_API_SECRET")),
    },
  };

  try {
    const readOnlyEndpoints = method === "GET" && (path === "/me" || path === "/points/me");
    const keyFeature = readOnlyEndpoints ? "auth-basic" : "payments-core";
    const keyHealth = evaluateFeatureKeyHealth(env, keyFeature);
    if (!keyHealth.ok) {
      return json(buildConfigErrorBody(keyFeature, keyHealth), { status: 503 });
    }

    if (method === "POST" && path === "/webhook") {
      await connectDb(env);
      trace.dbConnected = true;
      return await handleWebhook(request, env);
    }

    const auth = await requireAuth(request, env);
    trace.authVerified = true;

    await connectDb(env);
    trace.dbConnected = true;

    if (method === "POST" && path === "/prepare") return await handlePrepare(request, env, auth);
    if (method === "POST" && path === "/subscription/prepare") return await handleSubscriptionPrepare(request, auth);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env, auth);
    if (method === "POST" && path === "/subscription/confirm") return await handleSubscriptionConfirm(request, env, auth);
    if (method === "POST" && path === "/cancel") return await handleCancel(request, env, auth);
    if (method === "POST" && path === "/report-failure") return await handleReportFailure(request, auth);
    if (method === "GET" && path === "/me") return await handleMe(auth);
    if (method === "GET" && path === "/points/me") return await handlePointsMe(auth);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error && error.code === 11000) {
      return json({ message: "Duplicate payment key." }, { status: 409 });
    }
    const errorText = String(error?.message || "");
    trace.mongoQueryFailed = /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(errorText);
    trace.paymentProviderFailed = /portone|iamport|payment provider|merchant_uid|imp_uid/i.test(errorText);
    return handleRouteError(error, { request, env, trace });
  }
}

export const __paymentsTestUtils = {
  handlePrepare,
  handleSubscriptionPrepare,
  resolveIdempotencyKey,
  normalizeIdempotencyKey,
};
