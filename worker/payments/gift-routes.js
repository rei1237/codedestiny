import { json, getRequestMeta } from "../lib/http.js";
import { peekAccessTokenUserId } from "../lib/auth.js";
import { AbuseScore, Payment, User } from "../lib/models.js";
import { Gift, GiftClaimContext } from "../lib/gift-models.js";
import { toObjectId } from "./db.js";
import { classify, paymentError } from "./errors.js";
import { CREDENTIAL_CACHE_PREFIXES, purgeCredentialCache } from "../lib/credential-scoped-cache.js";
import { invalidateBalanceSnapshot } from "./index.js";
import {
  assertRawGiftToken, hashGiftToken, newGiftToken, claimGift, issueGiftLink,
  listGifts, presentGift, assertGiftIndexes,
} from "./gifts.js";

const COOKIE = "cd_gift_context";
const CONTEXT_MS = 30 * 60 * 1000;
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
export function assertGiftOrigin(request, env) {
  const allowed = new Set([new URL(request.url).origin]);
  for (const value of [env?.AUTH_FRONTEND_BASE_URL, env?.SITE_BASE_URL]) {
    try { if (value) allowed.add(new URL(value).origin); } catch { /* invalid config is not trusted */ }
  }
  const origin = request.headers.get("Origin");
  if (!origin || !allowed.has(origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    throw paymentError("ORDER_FORBIDDEN", "사이트에서 다시 시도해 주세요.");
  }
}
async function limitRequests(db, request, userId, path) {
  const endpoint = path === "/preview" ? "gift-preview" : "gift-change";
  const bucket = Math.floor(Date.now() / 60_000);
  const subjectHash = await hashGiftToken(`${userId || getRequestMeta(request).ip || "anonymous"}:${endpoint}:${bucket}`);
  const doc = await db.findOneAndUpdate(AbuseScore, { subjectHash, endpoint, kind: "rate_limit" }, {
    $inc: { score: 1 }, $set: { expiresAt: new Date(Date.now() + 120_000), updatedAt: new Date() },
    $setOnInsert: { createdAt: new Date() },
  }, { upsert: true, returnDocument: "after" });
  if (Number(doc?.score || 0) > (path === "/preview" ? 30 : 15)) throw paymentError("GIFT_RATE_LIMITED", "요청이 많습니다. 잠시 후 다시 시도해 주세요.");
}
async function contextHash(db, request, body) {
  if (body.token) {
    assertRawGiftToken(body.token);
    return hashGiftToken(body.token);
  }
  const raw = request.headers.get("Cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  assertRawGiftToken(raw);
  const context = await db.findOne(GiftClaimContext, { contextHash: await hashGiftToken(raw), expiresAt: { $gt: new Date() } });
  if (!context) throw paymentError("GIFT_NOT_FOUND", "선물 링크를 다시 열어 주세요.");
  return context.claimTokenHash;
}
export async function handleGiftRoute({ request, env, ctx, path, withDb }) {
  try {
    const method = request.method;
    const publicRoute = path === "/preview" || path === "/context";
    const userId = await peekAccessTokenUserId(request, env) || "";
    if (!publicRoute && !userId) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
    if (!["GET", "POST"].includes(method)) return json({ code: "METHOD_NOT_ALLOWED" }, { status: 405, headers });
    let body = {};
    if (method === "POST") {
      assertGiftOrigin(request, env);
      if (!request.headers.get("Content-Type")?.includes("application/json")) throw paymentError("INVALID_REQUEST", "JSON 요청이 필요합니다.");
      const text = await request.text();
      if (text.length > 4096) throw paymentError("INVALID_REQUEST", "요청이 너무 큽니다.");
      try { body = JSON.parse(text); } catch { throw paymentError("INVALID_REQUEST", "요청을 확인해 주세요."); }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw paymentError("INVALID_REQUEST", "요청을 확인해 주세요.");
    }
    const result = await withDb(env, ctx, async db => {
      if (method === "POST") await limitRequests(db, request, userId, path);
      if (method === "POST" && ["/preview", "/context"].includes(path)) {
        const tokenHash = await contextHash(db, request, body);
        const gift = await db.findOne(Gift, { claimTokenHash: tokenHash });
        const presented = presentGift(gift);
        if (path === "/context") {
          const raw = newGiftToken();
          await db.insertOne(GiftClaimContext, { contextHash: await hashGiftToken(raw), claimTokenHash: tokenHash, expiresAt: new Date(Date.now() + CONTEXT_MS), createdAt: new Date() });
          const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
          return json({ ok: true }, { headers: { ...headers, "Set-Cookie": `${COOKIE}=${raw}; Path=/api/payments/gifts; HttpOnly; SameSite=Lax; Max-Age=1800${secure}` } });
        }
        return { gift: presented };
      }
      if (method === "POST" && path === "/claim") {
        await assertGiftIndexes(db);
        const result = await claimGift(db, { tokenHash: await contextHash(db, request, body), userId });
        return { ...result, grant: { source: "GIFT", giftId: result.grant.giftId, appliedSubscription: result.grant.after, grantedAt: result.grant.grantedAt } };
      }
      if (method === "GET" && ["/sent", "/received"].includes(path)) return listGifts(db, { userId, received: path === "/received", cursor: new URL(request.url).searchParams.get("cursor") || "" });
      if (method === "GET" && path === "/account") {
        const user = await db.findOne(User, { _id: toObjectId(userId) }, { projection: { nickname: 1, name: 1, profileSubscription: 1 } });
        if (!user) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
        return { displayName: user.name || user.nickname || "현재 로그인한 계정", subscription: user.profileSubscription || null };
      }
      const match = path.match(/^\/([^/]+)(?:\/(link|refund-request))?$/);
      if (match) {
        const giftId = decodeURIComponent(match[1]);
        if (method === "POST" && match[2] === "link") return issueGiftLink(db, { giftId, userId, version: body.tokenVersion });
        const gift = await db.findOne(Gift, { giftId, purchaserUserId: toObjectId(userId) });
        if (!gift) throw paymentError("GIFT_NOT_FOUND", "선물을 찾을 수 없습니다.");
        if (method === "POST" && match[2] === "refund-request") {
          if (["CANCELLED", "REFUNDED", "PENDING_PAYMENT"].includes(gift.status)) throw paymentError("GIFT_UNCLAIMABLE", "환불 요청할 수 없는 상태입니다.");
          await db.updateOne(Gift, { _id: gift._id }, { $set: { reviewRequired: true, refundRequestedAt: new Date(), updatedAt: new Date() } });
          await db.updateOne(Payment, { merchantUid: gift.orderId }, { $set: { adminReviewRequired: true, failureStage: "gift_refund_requested" } });
          return { requested: true };
        }
        if (method === "GET" && !match[2]) return { gift: presentGift(gift, { owner: true }) };
      }
      throw paymentError("GIFT_NOT_FOUND", "선물을 찾을 수 없습니다.");
    });
    if (method === "POST" && path === "/claim") {
      invalidateBalanceSnapshot(userId);
      try { await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES); }
      catch { /* A display cache failure must not turn a committed claim into an error. */ }
    }
    if (method === "POST" && !publicRoute) console.info("[GIFT_EVENT]", { action: path.split("/").pop(), userId, giftId: result?.gift?.giftId || "" });
    return result instanceof Response ? result : json({ ok: true, ...result }, { headers });
  } catch (error) {
    const contract = classify(error);
    console.warn("[GIFT_REQUEST_FAILED]", { code: contract.code, requestId: ctx.requestId });
    return json({ ok: false, code: contract.code, message: contract.status >= 500 ? "선물 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." : error.message }, { status: contract.status, headers });
  }
}
