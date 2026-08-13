// 관리자 주문 조회·환불 API.
//
// 왜 /api/admin 아래인가: /admin 화면이 쓰는 flower-admin 토큰은 /api/payments 를 인증할 수 없다
// (auth.js 의 PAID_SERVICE_ADMIN_AUTH_PATHS 에 /api/payments 가 없다). 그 허용 목록을 넓혀 결제
// 엔드포인트를 flower 토큰에 열어 주면 권한 폭발 반경이 커지므로, 반대로 관리자 네임스페이스 안에
// 주문 API 를 두고 authorizeAdminRequest 로 인증한다.
//
// admin.js 는 5천 줄이라 더 키우지 않는다 — admin-feedback.js 선례대로 별도 모듈로 둔다.
import { json, methodNotAllowed, notFound, readJson, createHttpError, handleRouteError } from "../lib/http.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import {
  ContentEntitlement,
  Payment,
  PaymentFailureLog,
  PaymentWebhookEvent,
  User,
} from "../lib/models.js";
import { fetchPortOnePayment } from "../lib/portone.js";
import { refundPaymentAsOperator } from "../lib/payment-refund.js";
import { runPaymentReconcileTask } from "../lib/payment-reconcile-task.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
// 🔴 Payment 에 {status, createdAt} 복합 인덱스가 없다. 기본 조회창을 반드시 걸어 풀스캔을 막는다.
const DEFAULT_WINDOW_DAYS = 90;
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

// 옵션 근거는 admin.js 의 같은 이름 래퍼 주석 참조.
function adminMongoRead(env, operation) {
  return withMongoRetry(env, operation, {
    retries: 1,
    retryOnOperationTimeout: true,
    retryAdmissionOnOverload: true,
  });
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readPositiveInt(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// 관리자에게는 사용자 API 가 감추는 필드(userId·pricingSnapshot·confirmAttempts 등)까지 보여 준다.
// 사용자용 formatPaymentResponse 는 건드리지 않는다.
function toAdminOrder(payment) {
  if (!payment) return null;
  return {
    id: String(payment._id),
    userId: payment.userId ? String(payment.userId) : "",
    impUid: payment.impUid || "",
    merchantUid: payment.merchantUid || "",
    paymentAmount: Number(payment.paymentAmount || 0),
    chargedPoints: Number(payment.chargedPoints || 0),
    coinPrice: Number(payment.coinPrice || 0),
    membershipCreditCost: Number(payment.membershipCreditCost || 0),
    featureKey: payment.featureKey || "",
    productId: payment.productId || "",
    paymentType: payment.paymentType || "",
    accessType: payment.accessType || "",
    subscriptionTier: payment.subscriptionTier || "",
    status: payment.status || "",
    orderState: payment.orderState || "",
    source: payment.source || "",
    paymentMethod: payment.paymentMethod || "",
    confirmAttempts: Number(payment.confirmAttempts || 0),
    failureCode: payment.failureCode || "",
    failureMessage: payment.failureMessage || "",
    failureStage: payment.failureStage || "",
    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
    paidAt: payment.paidAt || null,
    lastErrorAt: payment.lastErrorAt || null,
    pricingSnapshot: payment.pricingSnapshot || null,
    metadata: payment.metadata || null,
  };
}

async function buildListFilter(request, env) {
  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim();
  const email = String(url.searchParams.get("email") || "").trim();
  const userId = String(url.searchParams.get("userId") || "").trim();
  const status = String(url.searchParams.get("status") || "").trim();
  const orderState = String(url.searchParams.get("orderState") || "").trim();
  const paymentType = String(url.searchParams.get("paymentType") || "").trim();
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();

  const filter = {};
  if (status) filter.status = status;
  if (orderState) filter.orderState = orderState;
  if (paymentType) filter.paymentType = paymentType;

  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ merchantUid: rx }, { impUid: rx }, { featureKey: rx }, { productId: rx }];
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.userId = new mongoose.Types.ObjectId(userId);
  } else if (email) {
    const user = await adminMongoRead(env, () => User.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } }).select("_id").lean());
    // 매칭되는 사용자가 없으면 전체 조회로 새지 않도록 결과 0건이 되는 조건을 건다.
    filter.userId = user?._id || new mongoose.Types.ObjectId("000000000000000000000000");
  }

  const createdAt = {};
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) createdAt.$gte = fromDate;
  if (toDate && !Number.isNaN(toDate.getTime())) createdAt.$lte = toDate;
  // 주문번호를 콕 집어 찾는 경우가 아니면 기본 조회창을 강제한다.
  if (!createdAt.$gte && !q && !filter.userId) {
    createdAt.$gte = new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }
  if (Object.keys(createdAt).length) filter.createdAt = createdAt;

  return { filter, url };
}

async function handleList(request, env) {
  await connectDb(env);
  const { filter, url } = await buildListFilter(request, env);

  const page = readPositiveInt(url.searchParams.get("page")) || 1;
  const pageSize = Math.min(readPositiveInt(url.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const [items, total, statusCounts] = await Promise.all([
    adminMongoRead(env, () => Payment.find(filter)
      .select("userId merchantUid impUid paymentAmount status orderState paymentType accessType featureKey productId paymentMethod createdAt paidAt failureCode confirmAttempts")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()),
    adminMongoRead(env, () => Payment.countDocuments(filter)),
    adminMongoRead(env, () => Payment.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$paymentAmount" } } },
    ])),
  ]);

  return json({
    ok: true,
    items: items.map(toAdminOrder),
    counts: statusCounts.map((row) => ({ status: row._id || "", count: row.count, amount: row.amount || 0 })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

async function handleDetail(orderId, request, env) {
  await connectDb(env);
  if (!OBJECT_ID_PATTERN.test(orderId)) throw createHttpError(400, "잘못된 주문 ID 입니다.", { code: "INVALID_ORDER_ID" });

  const payment = await adminMongoRead(env, () => Payment.findById(orderId).lean());
  if (!payment) throw createHttpError(404, "주문을 찾을 수 없습니다.", { code: "ORDER_NOT_FOUND" });

  const lookupId = payment.impUid || payment.merchantUid;
  // 🔴 이번 장애의 본질이 "우리 DB 상태 ≠ PortOne 상태" 였다. 두 값을 나란히 보여 주려고 실시간 조회한다.
  // 조회가 실패해도 화면은 떠야 하므로 degrade 한다.
  let portOne = null;
  let portOneError = "";
  if (lookupId) {
    try {
      portOne = await fetchPortOnePayment(env, lookupId);
    } catch (error) {
      portOneError = String(error?.message || error || "PortOne 조회 실패").slice(0, 300);
    }
  }

  const [webhookEvents, failureLogs, entitlements, buyer] = await Promise.all([
    adminMongoRead(env, () => PaymentWebhookEvent.find({ paymentId: payment.merchantUid })
      .select("eventId eventType status attempts receivedAt processedAt lastAttemptAt lastError")
      .sort({ createdAt: -1 }).limit(20).lean()),
    adminMongoRead(env, () => PaymentFailureLog.find({
      $or: [{ merchantUid: payment.merchantUid }, { impUid: payment.impUid || "__none__" }],
    }).select("source stage code message status createdAt").sort({ createdAt: -1 }).limit(30).lean()),
    adminMongoRead(env, () => ContentEntitlement.find({
      $or: [{ paymentId: payment.merchantUid }, { orderId: payment.merchantUid }],
    }).select("serviceKey contentKey status source scope profileId createdAt expiresAt").limit(30).lean()),
    payment.userId
      ? adminMongoRead(env, () => User.findById(payment.userId).select("email name profileSubscription.tier profileSubscription.expiresAt points").lean())
      : Promise.resolve(null),
  ]);

  return json({
    ok: true,
    order: toAdminOrder(payment),
    portOne: portOne
      ? {
        status: portOne.status || "",
        amount: Number(portOne.amount || 0),
        currency: portOne.currency || "",
        paidAt: portOne.paid_at || null,
        payMethod: portOne.pay_method || "",
        receiptUrl: portOne.receipt_url || "",
      }
      : null,
    portOneError,
    buyer: buyer
      ? {
        id: String(buyer._id),
        email: buyer.email || "",
        name: buyer.name || "",
        points: Number(buyer.points || 0),
        passTier: buyer?.profileSubscription?.tier || "",
        passExpiresAt: buyer?.profileSubscription?.expiresAt || null,
      }
      : null,
    webhookEvents,
    failureLogs,
    entitlements,
  });
}

async function handleRefund(orderId, request, env, adminContext) {
  await connectDb(env);
  if (!OBJECT_ID_PATTERN.test(orderId)) throw createHttpError(400, "잘못된 주문 ID 입니다.", { code: "INVALID_ORDER_ID" });

  const body = await readJson(request);
  const reason = String(body?.reason || "").trim();
  if (!reason) throw createHttpError(400, "환불 사유는 필수입니다.", { code: "REASON_REQUIRED" });

  const amount = readPositiveInt(body?.amount);
  const currentCancellableAmount = readPositiveInt(body?.currentCancellableAmount);
  if (amount !== undefined && currentCancellableAmount === undefined) {
    throw createHttpError(400, "부분 환불에는 currentCancellableAmount 가 필요합니다.", { code: "CURRENT_CANCELLABLE_AMOUNT_REQUIRED" });
  }

  const payment = await adminMongoRead(env, () => Payment.findById(orderId).lean());
  if (!payment) throw createHttpError(404, "주문을 찾을 수 없습니다.", { code: "ORDER_NOT_FOUND" });

  const actorId = String(adminContext?.userId || "admin");
  const result = await refundPaymentAsOperator({
    env,
    payment,
    reason,
    amount,
    currentCancellableAmount,
    actorId,
  });

  // 환불은 되돌릴 수 없는 조작이다 — 성공/실패 모두 감사 기록을 남긴다.
  await PaymentFailureLog.create({
    userId: payment.userId,
    impUid: payment.impUid,
    merchantUid: payment.merchantUid,
    source: "system",
    stage: "admin_order_refund",
    code: result.ok ? "admin_refund_succeeded" : String(result.code || "admin_refund_failed"),
    message: `actor=${actorId} reason=${reason}`.slice(0, 500),
    status: Number(result.status || 0),
    payload: { actorId, reason, amount: amount || null, adminReviewRequired: result.adminReviewRequired === true },
  }).catch(() => {});

  if (!result.ok) {
    return json({ ok: false, code: result.code, message: result.message }, { status: result.status || 400 });
  }
  return json({
    ok: true,
    idempotent: Boolean(result.idempotent),
    orderState: result.orderState,
    unlockRevoked: result.unlockRevoked === true,
    adminReviewRequired: result.adminReviewRequired === true,
    revocation: result.revocation || null,
    order: toAdminOrder(result.payment || payment),
  });
}

async function handleReconcile(request, env) {
  const body = await readJson(request).catch(() => ({}));
  const result = await runPaymentReconcileTask(env, {
    limit: readPositiveInt(body?.limit),
    windowDays: readPositiveInt(body?.windowDays),
  });
  return json({ ok: true, result });
}

export async function handleAdminOrderRoutes(path, request, env, adminContext) {
  try {
    const method = request.method.toUpperCase();

    if (path === "/" || path === "") {
      if (method === "GET") return await handleList(request, env);
      return methodNotAllowed();
    }

    if (path === "/reconcile") {
      if (method === "POST") return await handleReconcile(request, env);
      return methodNotAllowed();
    }

    const refundMatch = path.match(/^\/([a-f0-9]{24})\/refund$/i);
    if (refundMatch) {
      if (method === "POST") return await handleRefund(refundMatch[1], request, env, adminContext);
      return methodNotAllowed();
    }

    const detailMatch = path.match(/^\/([a-f0-9]{24})$/i);
    if (detailMatch) {
      if (method === "GET") return await handleDetail(detailMatch[1], request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/admin/orders", method: request.method },
    });
  }
}
