// 버그 제보실 관리자 API.
//
// 인증은 admin.js 의 authorizeAdminRequest 가 끝낸 뒤 이 모듈로 위임된다(cms.js 선례).
// 공개 라우트(routes/feedback.js)와 첨부 읽기·티켓번호 생성을 공유한다.

import { connectDb, withMongoRetry } from "../lib/db.js";
import { getEnv } from "../lib/env.js";
import {
  createHttpError,
  handleRouteError,
  json,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_CATEGORY_LIST,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_PRIORITY_LIST,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_LIST,
  Feedback,
  priorityRankOf,
} from "../lib/feedback-models.js";
import { buildTicketNo, readFeedbackAttachmentObject } from "./feedback.js";
import { notifyFeedbackReply, getSiteBaseUrl } from "../lib/feedback-notify.js";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const CATEGORY_SET = new Set(FEEDBACK_CATEGORY_LIST);
const STATUS_SET = new Set(FEEDBACK_STATUS_LIST);
const PRIORITY_SET = new Set(FEEDBACK_PRIORITY_LIST);
const ID_PATTERN = /^\/[a-f0-9]{24}$/i;

// admin.js:42 의 adminMongoRead 와 동일 — 관리자 읽기는 재시도를 한 번 더 준다.
function adminMongoRead(env, operation) {
  return withMongoRetry(env, operation, { retries: 2 });
}

function toText(value) {
  return String(value || "").trim();
}

function clampText(value, max) {
  return toText(value).slice(0, max);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseId(path) {
  const id = String(path || "").slice(1);
  return /^[a-f0-9]{24}$/i.test(id) ? id : "";
}

function buildAttachmentUrl(request, key) {
  const origin = new URL(request.url).origin;
  const encoded = String(key || "").split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `${origin}/api/admin/feedback/attachments/${encoded}`;
}

// 관리자 응답은 내부 필드를 포함하지만, 원본 IP 는 애초에 저장되지 않는다(해시만).
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
    locale: toText(doc?.locale),
    status: toText(doc?.status),
    statusLabel: FEEDBACK_STATUS_LABELS[doc?.status] || "",
    priority: toText(doc?.priority),
    priorityLabel: FEEDBACK_PRIORITY_LABELS[doc?.priority] || "",
    details: (Array.isArray(doc?.details) ? doc.details : []).map((entry) => ({
      key: toText(entry?.key), label: toText(entry?.label), value: toText(entry?.value),
    })),
    client: (Array.isArray(doc?.client) ? doc.client : []).map((entry) => ({
      key: toText(entry?.key), label: toText(entry?.label), value: toText(entry?.value),
    })),
    attachments: (Array.isArray(doc?.attachments) ? doc.attachments : []).map((file) => ({
      key: toText(file?.key),
      url: buildAttachmentUrl(request, toText(file?.key)),
      originalName: toText(file?.originalName),
      mimeType: toText(file?.mimeType),
      size: Number(file?.size || 0),
    })),
    replies: (Array.isArray(doc?.replies) ? doc.replies : []).map((reply) => ({
      body: toText(reply?.body),
      authorName: toText(reply?.authorName),
      emailed: Boolean(reply?.emailed),
      createdAt: reply?.createdAt ? new Date(reply.createdAt).toISOString() : "",
    })),
    assigneeId: toText(doc?.assigneeId),
    assigneeName: toText(doc?.assigneeName),
    tags: Array.isArray(doc?.tags) ? doc.tags.map(toText).filter(Boolean) : [],
    adminNote: toText(doc?.adminNote),
    autoFlagReasons: Array.isArray(doc?.autoFlagReasons) ? doc.autoFlagReasons : [],
    userAgent: toText(doc?.meta?.userAgent),
    upvoteCount: Number(doc?.upvoteCount || 0),
    isPublic: Boolean(doc?.isPublic),
    notifiedAt: doc?.notifiedAt ? new Date(doc.notifiedAt).toISOString() : "",
    notifyError: toText(doc?.notifyError),
    resolvedAt: doc?.resolvedAt ? new Date(doc.resolvedAt).toISOString() : "",
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

function buildFilter(url) {
  const filter = {};

  const status = toText(url.searchParams.get("status"));
  if (status && status !== "all" && STATUS_SET.has(status)) filter.status = status;

  const category = toText(url.searchParams.get("category"));
  if (category && category !== "all" && CATEGORY_SET.has(category)) filter.category = category;

  const priority = toText(url.searchParams.get("priority"));
  if (priority && priority !== "all" && PRIORITY_SET.has(priority)) filter.priority = priority;

  const assigneeId = toText(url.searchParams.get("assigneeId"));
  if (assigneeId) filter.assigneeId = assigneeId;

  if (["1", "true", "yes"].includes(toText(url.searchParams.get("hasAttachment")).toLowerCase())) {
    filter["attachments.0"] = { $exists: true };
  }

  const q = clampText(url.searchParams.get("q"), 120);
  if (q) {
    // text 인덱스를 만들지 않았으므로 정규식으로 좁힌다. 이미 status/category 로 필터된
    // 뒤라 스캔 범위가 작다. 특수문자는 반드시 이스케이프한다.
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: pattern }, { content: pattern }, { authorEmail: pattern }, { url: pattern }];
  }

  return filter;
}

function buildSort(sortKey) {
  if (sortKey === "priority") return { priorityRank: 1, createdAt: -1 };
  if (sortKey === "oldest") return { createdAt: 1 };
  return { createdAt: -1 };
}

async function handleList(request, env) {
  await connectDb(env);

  const url = new URL(request.url);
  const filter = buildFilter(url);
  const pageRaw = Number.parseInt(String(url.searchParams.get("page") || ""), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const sizeRaw = Number.parseInt(String(url.searchParams.get("pageSize") || ""), 10);
  const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

  const [items, total, statusCounts] = await Promise.all([
    adminMongoRead(env, () => Feedback.find(filter)
      .sort(buildSort(toText(url.searchParams.get("sort"))))
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()),
    adminMongoRead(env, () => Feedback.countDocuments(filter)),
    adminMongoRead(env, () => Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])),
  ]);

  const counts = { all: 0 };
  for (const status of FEEDBACK_STATUS_LIST) counts[status] = 0;
  for (const row of Array.isArray(statusCounts) ? statusCounts : []) {
    const status = toText(row?._id);
    const count = Number(row?.count || 0);
    if (status in counts) counts[status] = count;
    counts.all += count;
  }

  return json({
    ok: true,
    items: (Array.isArray(items) ? items : []).map((doc) => toAdminFeedbackItem(doc, request)),
    counts,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

async function handleSummary(request, env) {
  await connectDb(env);

  const rows = await adminMongoRead(env, () => Feedback.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]));

  const counts = { all: 0 };
  for (const status of FEEDBACK_STATUS_LIST) counts[status] = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const status = toText(row?._id);
    const count = Number(row?.count || 0);
    if (status in counts) counts[status] = count;
    counts.all += count;
  }

  return json({
    ok: true,
    counts,
    // 알림 주소 미설정은 장애가 아니라 설정 누락이다. key-health 에 넣어 헬스를 빨갛게
    // 만드는 대신(진짜 장애와 구분 불가) 관리자 화면이 소프트 안내를 띄우도록 신호만 준다.
    adminFeedbackEmailConfigured: Boolean(toText(getEnv(env, "ADMIN_FEEDBACK_EMAIL"))),
  });
}

async function handleDetail(path, request, env) {
  await connectDb(env);
  const id = parseId(path);
  if (!id) return notFound();

  const doc = await adminMongoRead(env, () => Feedback.findById(id).lean());
  if (!doc) return notFound();

  return json({ ok: true, item: toAdminFeedbackItem(doc, request) });
}

async function handlePatch(path, request, env, adminContext) {
  await connectDb(env);
  const id = parseId(path);
  if (!id) return notFound();

  const body = await readJson(request);
  const update = {};

  if (body?.status !== undefined) {
    const status = toText(body.status);
    if (!STATUS_SET.has(status)) {
      throw createHttpError(400, "지원하지 않는 상태입니다.", { code: "INVALID_STATUS" });
    }
    update.status = status;
    update.resolvedAt = status === FEEDBACK_STATUSES.RESOLVED ? new Date() : null;
  }

  if (body?.priority !== undefined) {
    const priority = toText(body.priority);
    if (!PRIORITY_SET.has(priority)) {
      throw createHttpError(400, "지원하지 않는 우선순위입니다.", { code: "INVALID_PRIORITY" });
    }
    update.priority = priority;
    // 🔴 priorityRank 를 같이 쓰지 않으면 우선순위 정렬이 옛 값으로 조용히 틀린다.
    update.priorityRank = priorityRankOf(priority);
  }

  if (body?.assigneeId !== undefined) update.assigneeId = clampText(body.assigneeId, 120);
  if (body?.assigneeName !== undefined) update.assigneeName = clampText(body.assigneeName, 60);
  if (body?.adminNote !== undefined) update.adminNote = clampText(body.adminNote, 1000);
  if (body?.isPublic !== undefined) {
    update.isPublic = Boolean(body.isPublic);
    update.publishedAt = update.isPublic ? new Date() : null;
  }
  if (body?.publicSummary !== undefined) update.publicSummary = clampText(body.publicSummary, 300);

  if (body?.tags !== undefined) {
    const raw = Array.isArray(body.tags)
      ? body.tags
      : String(body.tags || "").split(",");
    update.tags = raw.map((tag) => clampText(tag, 40)).filter(Boolean).slice(0, 12);
  }

  if (!Object.keys(update).length) {
    throw createHttpError(400, "변경할 항목이 없습니다.", { code: "NOTHING_TO_UPDATE" });
  }

  const doc = await Feedback.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!doc) return notFound();

  console.log("[admin/feedback] patched", { id, by: String(adminContext?.userId || ""), fields: Object.keys(update) });
  return json({ ok: true, item: toAdminFeedbackItem(doc, request) });
}

async function handleReply(path, request, env, adminContext) {
  await connectDb(env);
  const id = parseId(String(path).replace(/\/replies$/i, ""));
  if (!id) return notFound();

  const body = await readJson(request);
  const replyBody = clampText(body?.body, 2000);
  if (!replyBody) {
    throw createHttpError(400, "답변 내용을 입력해 주세요.", { code: "VALIDATION_ERROR" });
  }

  const doc = await adminMongoRead(env, () => Feedback.findById(id).lean());
  if (!doc) return notFound();

  // 제보자 메일 발송은 요청당 opt-in 이다(기본 OFF). 무조건 발송이면 짧은 진행 답변이
  // 연달아 나가 받은편지함을 도배하고, 이 흐름에는 구독 해지 경로가 없다.
  const shouldNotify = body?.notifyUser === true;
  let emailed = false;
  let emailError = "";

  if (shouldNotify) {
    const result = await notifyFeedbackReply(env, doc, replyBody, { siteBaseUrl: getSiteBaseUrl(env) });
    emailed = Boolean(result?.ok);
    emailError = toText(result?.error);
  }

  const updated = await Feedback.findByIdAndUpdate(id, {
    $push: {
      replies: {
        body: replyBody,
        authorId: clampText(adminContext?.userId, 120),
        authorName: clampText(body?.authorName, 60) || "CODE DESTINY 연구소",
        emailed,
        createdAt: new Date(),
      },
    },
  }, { new: true }).lean();

  return json({ ok: true, item: toAdminFeedbackItem(updated, request), emailed, emailError });
}

async function handleDelete(path, request, env) {
  await connectDb(env);
  const id = parseId(path);
  if (!id) return notFound();

  const doc = await Feedback.findByIdAndDelete(id).lean();
  if (!doc) return notFound();

  // 첨부를 지우지 않으면 삭제된 제보의 이미지가 R2 에 영구 잔류한다.
  // 실패해도 삭제 응답을 막지 않는다.
  const bucket = env?.FEEDBACK_IMAGES_BUCKET;
  if (bucket && typeof bucket.delete === "function") {
    await Promise.allSettled((Array.isArray(doc.attachments) ? doc.attachments : [])
      .map((file) => bucket.delete(String(file?.key || ""))));
  }

  return json({ ok: true, id });
}

/** admin.js 가 인증을 마친 뒤 호출한다. path 는 "/api/admin/feedback" 이후 구간. */
export async function handleAdminFeedbackRoutes(path, request, env, adminContext) {
  try {
    const method = request.method.toUpperCase();

    if (path === "/" || path === "") {
      if (method === "GET") return await handleList(request, env);
      return methodNotAllowed();
    }

    if (path === "/summary") {
      if (method === "GET") return await handleSummary(request, env);
      return methodNotAllowed();
    }

    if (path.startsWith("/attachments/")) {
      // 관리자 인증이 이미 끝났으므로 uploaderId 대조는 생략한다.
      if (method === "GET") return await readFeedbackAttachmentObject(env, path.slice("/attachments/".length));
      return methodNotAllowed();
    }

    if (/^\/[a-f0-9]{24}\/replies$/i.test(path)) {
      if (method === "POST") return await handleReply(path, request, env, adminContext);
      return methodNotAllowed();
    }

    if (ID_PATTERN.test(path)) {
      if (method === "GET") return await handleDetail(path, request, env);
      if (method === "PATCH") return await handlePatch(path, request, env, adminContext);
      if (method === "DELETE") return await handleDelete(path, request, env);
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
