// 관리자 버그 제보 조회·상태 변경·확인 보상(월정석) 지급 API.
//
// admin.js 는 이미 5천 줄이 넘어 admin-orders.js/admin-monthly-credits.js 선례대로 별도 모듈로 둔다.
// 월정석 지급은 새 배관을 만들지 않는다 — grantMonthlyCreditLotDetailed(monthly-credit-store.js)와
// MonthlyCreditLedger 원장 기록은 admin-monthly-credits.js 의 마케팅 지급과 동일한 방식을 그대로 쓴다.
// 다른 점은 지급 단위뿐이다: 이메일 입력이 아니라 feedbackId 하나가 곧 멱등키(lotId)다 —
// 같은 제보를 두 번 "확정"해도 lotId 가 같아 중복 지급되지 않으므로, 마케팅 화면에 있던
// idempotencyKey 수동 입력 UI는 여기선 필요 없다.

import { connectDb, withMongoRetry } from "../lib/db.js";
import {
  createHttpError,
  handleRouteError,
  json,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import { MonthlyCreditLedger, User } from "../lib/models.js";
import { grantMonthlyCreditLotDetailed } from "../lib/monthly-credit-store.js";
import { isAdminMonthlyCreditGrantEnabled } from "./admin-monthly-credits.js";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LIST,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_LIST,
  Feedback,
  priorityRankOf,
} from "../lib/feedback-models.js";
import { buildTicketNo, readFeedbackAttachmentObject } from "./feedback.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const LIST_LIMIT = 50;
export const BUG_REPORT_REWARD_AMOUNT = 300;
const BUG_REWARD_SERVICE_KEY = "admin_bug_bounty";

function adminMongoRead(env, operation) {
  return withMongoRetry(env, operation, { retries: 2 });
}

function toText(value) {
  return String(value || "").trim();
}

export function buildBugRewardSourceId(feedbackId) {
  return `feedback-bug-reward:${feedbackId}`;
}

function buildAdminAttachmentUrl(request, key) {
  const origin = new URL(request.url).origin;
  const encoded = String(key || "").split("/").filter(Boolean).map((segment) => encodeURIComponent(segment)).join("/");
  return `${origin}/api/admin/feedback/attachments/${encoded}`;
}

// 사용자 응답용 toOwnFeedbackItem(feedback.js)과 달리, 관리자 전용 엔드포인트라
// adminNote·assignee·autoFlagReasons·meta 처럼 사용자에게 절대 보이면 안 되는 필드까지 그대로 낸다.
function toAdminFeedbackItem(doc, request) {
  return {
    id: String(doc?._id || ""),
    ticketNo: buildTicketNo(doc),
    userId: toText(doc?.userId),
    authorName: toText(doc?.authorName),
    authorEmail: toText(doc?.authorEmail),
    category: toText(doc?.category),
    categoryLabel: FEEDBACK_CATEGORY_LABELS[doc?.category] || "",
    title: toText(doc?.title),
    content: toText(doc?.content),
    url: toText(doc?.url),
    status: toText(doc?.status),
    statusLabel: FEEDBACK_STATUS_LABELS[doc?.status] || "",
    priority: toText(doc?.priority) || "normal",
    details: (Array.isArray(doc?.details) ? doc.details : []).map((entry) => ({
      key: entry?.key || "", label: entry?.label || "", value: entry?.value || "",
    })),
    client: (Array.isArray(doc?.client) ? doc.client : []).map((entry) => ({
      key: entry?.key || "", label: entry?.label || "", value: entry?.value || "",
    })),
    attachments: (Array.isArray(doc?.attachments) ? doc.attachments : []).map((file) => ({
      key: toText(file?.key),
      url: buildAdminAttachmentUrl(request, toText(file?.key)),
      mimeType: toText(file?.mimeType),
      size: Number(file?.size || 0),
    })),
    replies: (Array.isArray(doc?.replies) ? doc.replies : []).map((reply) => ({
      body: toText(reply?.body),
      authorName: toText(reply?.authorName),
      createdAt: reply?.createdAt ? new Date(reply.createdAt).toISOString() : "",
    })),
    autoFlagReasons: Array.isArray(doc?.autoFlagReasons) ? doc.autoFlagReasons : [],
    adminNote: toText(doc?.adminNote),
    bugReward: {
      granted: Boolean(doc?.bugReward?.granted),
      amount: Number(doc?.bugReward?.amount || 0),
      grantedAt: doc?.bugReward?.grantedAt ? new Date(doc.bugReward.grantedAt).toISOString() : null,
      grantedBy: toText(doc?.bugReward?.grantedBy),
    },
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

async function handleList(request, env) {
  await connectDb(env);

  const params = new URL(request.url).searchParams;
  const statusRaw = toText(params.get("status")).toLowerCase();
  const categoryRaw = toText(params.get("category")).toLowerCase();

  const query = {};
  if (FEEDBACK_STATUS_LIST.includes(statusRaw)) query.status = statusRaw;
  if (categoryRaw) query.category = categoryRaw;

  const [items, statusCounts] = await Promise.all([
    adminMongoRead(env, () => Feedback.find(query)
      .sort({ priorityRank: 1, createdAt: -1 })
      .limit(LIST_LIMIT)
      .lean()),
    adminMongoRead(env, () => Feedback.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])).catch(() => []),
  ]);

  const counts = {};
  for (const status of FEEDBACK_STATUS_LIST) counts[status] = 0;
  for (const row of Array.isArray(statusCounts) ? statusCounts : []) {
    const key = toText(row?._id);
    if (key in counts) counts[key] = Number(row?.count || 0);
  }

  return json({
    ok: true,
    items: (Array.isArray(items) ? items : []).map((doc) => toAdminFeedbackItem(doc, request)),
    counts,
  });
}

async function handleStatusUpdate(id, request, env) {
  await connectDb(env);
  if (!OBJECT_ID_PATTERN.test(id)) return notFound();

  const body = await readJson(request);
  const update = {};

  if (body?.status !== undefined) {
    const statusRaw = toText(body.status).toLowerCase();
    if (!FEEDBACK_STATUS_LIST.includes(statusRaw)) {
      throw createHttpError(400, `status는 ${FEEDBACK_STATUS_LIST.join(" / ")} 중 하나여야 합니다.`, { code: "VALIDATION_ERROR" });
    }
    update.status = statusRaw;
    update.resolvedAt = statusRaw === "resolved" ? new Date() : null;
  }
  if (body?.priority !== undefined) {
    const priorityRaw = toText(body.priority).toLowerCase();
    if (!FEEDBACK_PRIORITY_LIST.includes(priorityRaw)) {
      throw createHttpError(400, `priority는 ${FEEDBACK_PRIORITY_LIST.join(" / ")} 중 하나여야 합니다.`, { code: "VALIDATION_ERROR" });
    }
    update.priority = priorityRaw;
    update.priorityRank = priorityRankOf(priorityRaw);
  }
  if (typeof body?.adminNote === "string") update.adminNote = body.adminNote.trim().slice(0, 1000);

  if (!Object.keys(update).length) {
    throw createHttpError(400, "변경할 값이 없습니다.", { code: "VALIDATION_ERROR" });
  }

  const doc = await Feedback.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!doc) return notFound();

  return json({ ok: true, item: toAdminFeedbackItem(doc, request) });
}

function buildRewardResponse({ feedbackDoc, user, amount, balanceAfter, idempotent }) {
  return {
    ok: true,
    idempotent: Boolean(idempotent),
    reward: {
      feedbackId: String(feedbackDoc?._id || ""),
      userId: String(user?._id || feedbackDoc?.userId || ""),
      email: String(user?.email || ""),
      amount: Math.max(0, Math.floor(Number(amount || 0))),
      balanceAfter: Math.max(0, Math.floor(Number(balanceAfter || 0))),
      grantedAt: feedbackDoc?.bugReward?.grantedAt ? new Date(feedbackDoc.bugReward.grantedAt).toISOString() : null,
    },
  };
}

// 🔴 지급은 되돌릴 수 없는 조작이다. feedbackId 를 lotId 로 써서 같은 제보를 두 번 확정 눌러도
// grantMonthlyCreditLotDetailed 내부(lot 존재 검사)에서 한 번만 반영된다 — 아래 doc.bugReward.granted
// 사전 체크는 그 위에 얹는 빠른 경로(재조회 없이 즉시 멱등 응답)일 뿐 유일한 방어선이 아니다.
async function handleReward(id, request, env, adminContext) {
  if (!isAdminMonthlyCreditGrantEnabled(env)) {
    throw createHttpError(503, "관리자 월정석 지급 기능이 비활성화되어 있습니다.", {
      code: "ADMIN_MONTHLY_CREDIT_GRANT_DISABLED",
    });
  }

  await connectDb(env);
  if (!OBJECT_ID_PATTERN.test(id)) return notFound();

  const feedbackDoc = await adminMongoRead(env, () => Feedback.findById(id).lean());
  if (!feedbackDoc) return notFound();

  if (feedbackDoc.bugReward?.granted) {
    const user = await adminMongoRead(env, () => User.findById(feedbackDoc.userId).select("email profileSubscription").lean());
    return json(buildRewardResponse({
      feedbackDoc,
      user,
      amount: feedbackDoc.bugReward.amount,
      balanceAfter: user?.profileSubscription?.membershipCreditBalance,
      idempotent: true,
    }));
  }

  const user = await adminMongoRead(env, () => User.findById(feedbackDoc.userId).select("email status profileSubscription").lean());
  if (!user?._id) {
    throw createHttpError(404, "제보자 계정을 찾을 수 없습니다.", { code: "TARGET_USER_NOT_FOUND" });
  }
  if (toText(user.status || "active").toLowerCase() === "withdrawn") {
    throw createHttpError(409, "탈퇴한 계정에는 월정석을 지급할 수 없습니다.", { code: "TARGET_USER_WITHDRAWN" });
  }

  const actorId = toText(adminContext?.userId) || "admin";
  const sourceId = buildBugRewardSourceId(id);

  const applied = await grantMonthlyCreditLotDetailed({
    userId: user._id,
    lotId: sourceId,
    amount: BUG_REPORT_REWARD_AMOUNT,
  });
  if (!applied?.user) {
    throw createHttpError(503, "월정석 지급 중 일시적인 문제가 발생했습니다. 다시 시도해 주세요.", {
      code: "MONTHLY_CREDIT_GRANT_FAILED",
    });
  }

  const afterBalance = Math.max(0, Math.floor(Number(applied.user?.profileSubscription?.membershipCreditBalance || 0)));

  try {
    await MonthlyCreditLedger.updateOne(
      { userId: user._id, type: "MONTHLY_CREDIT_GRANT", sourceId },
      {
        $setOnInsert: {
          userId: user._id,
          type: "MONTHLY_CREDIT_GRANT",
          amount: BUG_REPORT_REWARD_AMOUNT,
          beforeBalance: Math.max(0, Math.floor(Number(applied.beforeBalance || 0))),
          afterBalance,
          reason: `버그 제보 확인 보상 (${buildTicketNo(feedbackDoc)})`,
          sourceId,
          serviceKey: BUG_REWARD_SERVICE_KEY,
          profileId: "",
          metadata: { grantKind: "bug_bounty", feedbackId: id, actorId },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }

  const grantedAt = new Date();
  const updatedFeedback = await Feedback.findByIdAndUpdate(id, {
    $set: {
      "bugReward.granted": true,
      "bugReward.amount": BUG_REPORT_REWARD_AMOUNT,
      "bugReward.grantedAt": grantedAt,
      "bugReward.grantedBy": actorId,
      "bugReward.ledgerSourceId": sourceId,
    },
  }, { new: true }).lean();

  return json(buildRewardResponse({
    feedbackDoc: updatedFeedback || feedbackDoc,
    user: applied.user,
    amount: BUG_REPORT_REWARD_AMOUNT,
    balanceAfter: afterBalance,
    idempotent: applied.added !== true,
  }), { status: applied.added ? 201 : 200 });
}

export async function handleAdminFeedbackRoutes(path, request, env, adminContext) {
  try {
    const method = request.method.toUpperCase();

    if (path === "/" || path === "") {
      if (method === "GET") return await handleList(request, env);
      return methodNotAllowed();
    }

    if (path.startsWith("/attachments/")) {
      if (method === "GET") return await readFeedbackAttachmentObject(env, path.slice("/attachments/".length));
      return methodNotAllowed();
    }

    const rewardMatch = path.match(/^\/([a-f0-9]{24})\/reward$/i);
    if (rewardMatch) {
      if (method === "POST") return await handleReward(rewardMatch[1], request, env, adminContext);
      return methodNotAllowed();
    }

    const statusMatch = path.match(/^\/([a-f0-9]{24})\/status$/i);
    if (statusMatch) {
      if (method === "POST") return await handleStatusUpdate(statusMatch[1], request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/admin/feedback", method: request.method },
    });
  }
}
