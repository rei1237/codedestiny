import { connectDb, mongoose } from "../lib/db.js";
import { FortuneChatSession, GuardianFortuneChatCreditBalance } from "../lib/models.js";
import { getOptionalUserFromRequest } from "../lib/auth.js";
import { cookieValue, getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import {
  buildGuardianFortuneGuestCookie,
  buildGuardianFortuneUsageStatus,
  createGuardianFortuneGuestId,
  createMongoGuardianFortuneStore,
  hashGuardianFortuneGuestId,
  mergeGuardianFortuneAnonymousUsage,
} from "../lib/guardian-fortune-usage.js";
import { buildFusionFortuneStatus, createMongoFusionFortuneStore, isFusionFortuneApiEnabled } from "../lib/fusion-fortune.js";

function objectIdOrString(value) { return mongoose.Types.ObjectId.isValid(String(value || "")) ? new mongoose.Types.ObjectId(String(value)) : value; }
function newSessionId() { return globalThis.crypto?.randomUUID?.() || `fortune-chat-${Date.now()}-${Math.random()}`; }
async function identity(request, env) {
  const auth = await getOptionalUserFromRequest(request, env, { allowDbFallback: true });
  const existingGuestId = String(cookieValue(request, "guardian_fortune_guest_id") || "").trim();
  const guestId = existingGuestId || createGuardianFortuneGuestId();
  return {
    userId: auth?.userId ? String(auth.userId) : "",
    guestIdHash: await hashGuardianFortuneGuestId(guestId, { env }),
    cookie: existingGuestId ? "" : buildGuardianFortuneGuestCookie(guestId, { secure: new URL(request.url).protocol === "https:" }),
  };
}
function ownedSessionFilter(sessionId, who) {
  const sessionFilter = { sessionId: String(sessionId || "").slice(0, 120) };
  if (who.userId) {
    return { ...sessionFilter, userId: objectIdOrString(who.userId) };
  }
  if (who.guestIdHash) {
    return { ...sessionFilter, anonymousSessionId: who.guestIdHash };
  }
  return null;
}
async function bootstrap(request, env) {
  const who = await identity(request, env); await connectDb(env);
  if (who.userId && who.guestIdHash) {
    await mergeGuardianFortuneAnonymousUsage({ userId: who.userId, guestIdHash: who.guestIdHash, env });
  }
  const usage = await buildGuardianFortuneUsageStatus({ userId: who.userId, guestIdHash: who.guestIdHash, store: createMongoGuardianFortuneStore({ env }) });
  const [credit, fusion] = await Promise.all([
    who.userId ? GuardianFortuneChatCreditBalance.findOne({ userId: objectIdOrString(who.userId) }).lean() : null,
    buildFusionFortuneStatus({
      userId: who.userId,
      store: createMongoFusionFortuneStore(),
      enabled: isFusionFortuneApiEnabled(env),
    }),
  ]);
  const accountFilter = who.userId ? { userId: objectIdOrString(who.userId) } : null;
  const anonymousFilter = who.guestIdHash ? { anonymousSessionId: who.guestIdHash } : null;
  let session = accountFilter ? await FortuneChatSession.findOne(accountFilter).sort({ updatedAt: -1 }).lean() : null;
  if (!session && anonymousFilter) {
    session = await FortuneChatSession.findOne(anonymousFilter).sort({ updatedAt: -1 }).lean();
    if (session && who.userId && !session.userId) {
      session = await FortuneChatSession.findOneAndUpdate(
        { _id: session._id, userId: null, anonymousSessionId: who.guestIdHash },
        { $set: { userId: objectIdOrString(who.userId) } },
        { new: true },
      ).lean();
    }
  }
  if (!session) session = await FortuneChatSession.create({ sessionId: newSessionId(), userId: who.userId ? objectIdOrString(who.userId) : null, anonymousSessionId: who.guestIdHash, messages: [] });
  return json({
    ok: true,
    session,
    usage: {
      ...usage,
      accountFreeLimit: who.userId ? 3 : 0,
      accountFreeRemaining: who.userId ? usage.dailyFreeRemaining : 0,
      conversationCreditsRemaining: Math.max(0, Number(credit?.remaining || 0)),
    },
    fusion: {
      ticketRemaining: Math.max(0, Number(fusion?.ticket?.remaining || 0)),
      canGenerate: Boolean(fusion?.canGenerate),
      nextAction: fusion?.nextAction || "disabled",
    },
  }, { headers: who.cookie ? { "Set-Cookie": who.cookie } : undefined });
}
export async function handleFortuneChatRoutes(request, env) {
  const path = getRoutePath(request, "/api/fortune-chat");
  if (request.method === "GET" && path === "/bootstrap") return bootstrap(request, env);
  if (request.method === "POST" && path === "/merge-anonymous") {
    const who = await identity(request, env);
    if (!who.userId) return notFound();
    const result = await mergeGuardianFortuneAnonymousUsage({ userId: who.userId, guestIdHash: who.guestIdHash, env });
    return json({ ok: true, ...result }, { headers: who.cookie ? { "Set-Cookie": who.cookie } : undefined });
  }
  if (request.method === "GET" && path.startsWith("/sessions/")) {
    const who = await identity(request, env); const filter = ownedSessionFilter(path.slice(10), who);
    if (!filter) return notFound(); await connectDb(env);
    const session = await FortuneChatSession.findOne(filter).lean(); return session ? json({ ok: true, session }) : notFound();
  }
  if (request.method === "POST" && path.startsWith("/sessions/")) {
    const who = await identity(request, env); const filter = ownedSessionFilter(path.slice(10), who);
    if (!filter) return notFound(); const body = await readJson(request); await connectDb(env);
    const existing = await FortuneChatSession.findOne(filter).lean(); if (!existing) return notFound();
    const incoming = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
    const messages = body?.append === true ? [...(existing.messages || []), ...incoming].slice(-80) : incoming;
    const session = await FortuneChatSession.findOneAndUpdate(filter, { $set: { messages, selectedTopic: String(body?.selectedTopic || existing.selectedTopic || "").slice(0, 80), mode: body?.mode === "fusion_deep_reading" ? "fusion_deep_reading" : existing.mode, paymentStatus: String(body?.paymentStatus || existing.paymentStatus || "idle").slice(0, 40), generationStatus: String(body?.generationStatus || existing.generationStatus || "idle").slice(0, 40) } }, { new: true }).lean(); return json({ ok: true, session });
  }
  if (["/bootstrap", "/merge-anonymous"].includes(path) || path.startsWith("/sessions/")) return methodNotAllowed();
  return notFound();
}
