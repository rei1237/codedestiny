import { isHoneyPromptHubSpend, HONEY_PROMPT_HUB_FEATURE_KEY, HONEY_SCOPE_MESSAGE } from './honey-unlock-catalog.js';
import { mongoose, mongoTransactionOptions, withMongoRetry } from "./db.js";
import { scopeConnection } from "./db-scope-connection.js";
import { createHttpError } from "./http.js";

// 찻집 꿀방울 지갑을 그대로 쓴다 — 같은 컬렉션·같은 scope 라 찻집 꿀편지와 잔액이 하나다.
// 찻집 라우트(fortune-tea-house.js)는 LLM 의존이 무거워 여기서 import 하지 않고 이름만 맞춘다.
export const HONEY_SCOPE = "FORTUNE_TEA_HOUSE";
// 출석 N번마다 1방울. 출석 횟수는 누적이라 연속이 끊겨도 다음 지급까지 남은 수는 유지된다.
export const HONEY_ATTENDANCE_EVERY = 1;
export const PROMPT_HUB_HONEY_COST = 1;
// 연이 운명 상담 1회 = 꿀방울 30개. 기본 사주 리포트와 같은 승인 비율(5,000원 : 30방울)이며 현금 가치가 아니다.
export const FORTUNE_CHAT_HONEY_COST = 30;
export const fortuneChatHoneyLedgerId = (userId, requestId) => `fortune-chat:${userId}:fc-${requestId}`;

export const kstDay = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
const failure = (status, code, extra = {}) => createHttpError(status, code, { code, ...extra });
const isDuplicate = (error) => Number(error?.code) === 11000;
const unwrap = (result) => (result && Object.prototype.hasOwnProperty.call(result, "value") ? result.value : result) || null;
const count = (value) => Math.max(0, Math.floor(Number(value) || 0));

export function honeyCollections() {
  const db = (scopeConnection() || mongoose.connection).db;
  return {
    wallets: db.collection("fortune_tea_house_honey_wallets"),
    ledgers: db.collection("fortune_tea_house_honey_ledgers"),
  };
}

export async function withHoneyTransaction(env, run) {
  return withMongoRetry(env, async () => {
    const session = await (scopeConnection() || mongoose).startSession();
    try {
      let out;
      await session.withTransaction(async () => { out = await run(session); }, mongoTransactionOptions(env));
      return out;
    } finally {
      await session.endSession();
    }
  });
}

const collections = honeyCollections;
const inTransaction = withHoneyTransaction;

function statePayload(wallet, day, attended) {
  const attendanceCount = count(wallet?.attendanceCount);
  return {
    serviceScope: HONEY_SCOPE,
    day,
    balance: count(wallet?.balance),
    attended: Boolean(attended),
    attendanceCount,
    attendanceEvery: HONEY_ATTENDANCE_EVERY,
    nextRewardIn: HONEY_ATTENDANCE_EVERY - (attendanceCount % HONEY_ATTENDANCE_EVERY),
    promptCost: PROMPT_HUB_HONEY_COST,
  };
}

const attendanceLedgerId = (userId, day) => `attendance:${userId}:${day}`;

export async function honeyAttendanceStatus(env, userId, now = new Date()) {
  const uid = String(userId), day = kstDay(now);
  const { wallets, ledgers } = collections();
  const [wallet, attendance] = await withMongoRetry(env, () => Promise.all([
    wallets.findOne({ userId: uid, serviceScope: HONEY_SCOPE }),
    ledgers.findOne({ _id: attendanceLedgerId(uid, day) }, { projection: { _id: 1, amount: 1 } }),
  ]));
  // A legacy same-day attendance with zero reward can claim its one-time top-up.
  return statePayload(wallet, day, attendance && count(attendance.amount) >= 1);
}

export async function attendHoney(env, userId, now = new Date()) {
  const uid = String(userId), day = kstDay(now), _id = attendanceLedgerId(uid, day);
  const { wallets, ledgers } = collections();
  let rewarded = 0, awarded = false;
  try {
    await inTransaction(env, async (session) => {
      rewarded = 0; awarded = false;
      const existing = await ledgers.findOne({ _id }, { session });
      if (existing && count(existing.amount) >= 1) return;
      if (existing) {
        const toppedUp = await ledgers.updateOne({ _id, amount: 0 }, {
          $set: { amount: 1, reason: 'HONEY_ATTENDANCE_REWARD', toppedUpAt: now },
        }, { session });
        if (!toppedUp.modifiedCount) return;
        const credited = await wallets.updateOne({ userId: uid, serviceScope: HONEY_SCOPE }, {
          $inc: { balance: 1, totalEarned: 1 }, $set: { lastEarnedAt: now, updatedAt: now },
        }, { session });
        if (!credited.modifiedCount) throw failure(409, "HONEY_WALLET_MISSING");
        rewarded = 1; awarded = true;
        return;
      }
      const wallet = unwrap(await wallets.findOneAndUpdate(
        { userId: uid, serviceScope: HONEY_SCOPE },
        { $inc: { attendanceCount: 1 }, $set: { lastAttendedDay: day, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true, returnDocument: "after", session },
      ));
      const attendanceCount = count(wallet?.attendanceCount);
      rewarded = attendanceCount % HONEY_ATTENDANCE_EVERY === 0 ? 1 : 0;
      if (rewarded) {
        await wallets.updateOne(
          { userId: uid, serviceScope: HONEY_SCOPE },
          { $inc: { balance: 1, totalEarned: 1 }, $set: { lastEarnedAt: now } },
          { session },
        );
      }
      await ledgers.insertOne({
        _id, userId: uid, type: "attendance", amount: rewarded,
        reason: rewarded ? "HONEY_ATTENDANCE_REWARD" : "HONEY_ATTENDANCE",
        serviceScope: HONEY_SCOPE, day, attendanceCount, idempotencyKey: _id, createdAt: now,
        metadata: { source: "honey-attendance" },
      }, { session });
      awarded = true;
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    rewarded = 0; awarded = false;
  }
  return { ...await honeyAttendanceStatus(env, uid, now), awarded, rewarded };
}

/**
 * 프롬프트 1회분을 꿀방울 1개로 결제한다. 같은 requestId 는 같은 입력(inputHash)일 때만 다시
 * 열린다 — 재시도는 무료, 다른 입력을 같은 영수증에 싣는 것은 409.
 */
export async function spendPromptHubHoney(env, userId, { requestId, inputHash, toolId }, now = new Date()) {
  const uid = String(userId), _id = `prompt-hub:${uid}:${requestId}`;
  const { wallets, ledgers } = collections();
  let replayed = false;
  try {
    await inTransaction(env, async (session) => {
      replayed = false;
      const existing = await ledgers.findOne({ _id }, { session });
      if (existing) {
        if (existing.inputHash !== inputHash) throw failure(409, "PROMPT_HUB_REQUEST_MISMATCH");
        replayed = true;
        return;
      }
      if (!isHoneyPromptHubSpend(HONEY_PROMPT_HUB_FEATURE_KEY)) throw createHttpError(403, HONEY_SCOPE_MESSAGE, { code: 'HONEY_GGULGGUL_ONLY' });
      const wallet = unwrap(await wallets.findOneAndUpdate(
        { userId: uid, serviceScope: HONEY_SCOPE, balance: { $gte: PROMPT_HUB_HONEY_COST } },
        { $inc: { balance: -PROMPT_HUB_HONEY_COST, totalSpent: PROMPT_HUB_HONEY_COST }, $set: { updatedAt: now } },
        { returnDocument: "after", session },
      ));
      if (!wallet) throw failure(402, "INSUFFICIENT_HONEY_DROPS");
      await ledgers.insertOne({
        _id, userId: uid, type: "spend", amount: PROMPT_HUB_HONEY_COST, reason: "PROMPT_HUB_GENERATE_SPEND",
        serviceScope: HONEY_SCOPE, toolId, inputHash, idempotencyKey: requestId, createdAt: now,
        metadata: { source: "prompt-hub" },
      }, { session });
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    // 동시에 들어온 같은 요청이 먼저 기록했다 — 입력이 같을 때만 그 영수증을 쓴다.
    const existing = await withMongoRetry(env, () => ledgers.findOne({ _id }));
    if (existing?.inputHash !== inputHash) throw failure(409, "PROMPT_HUB_REQUEST_MISMATCH");
    replayed = true;
  }
  return { replayed, ...await honeyAttendanceStatus(env, uid, now) };
}

/**
 * 연이 상담 한 건에 꿀방울 30개를 쓴다. 호출자의 트랜잭션 안에서만 부르며, 상담 연결과 함께 커밋되거나 함께 되돌아간다.
 * 상담마다 영수증은 하나라 같은 상담의 재시도는 다시 차감하지 않는다.
 */
export async function debitFortuneChatHoney(userId, { requestId, featureKey }, session, now = new Date()) {
  const uid = String(userId), _id = fortuneChatHoneyLedgerId(uid, requestId);
  const { wallets, ledgers } = collections();
  const existing = await ledgers.findOne({ _id }, { session });
  if (existing) {
    if (existing.refundedAt) throw failure(409, "HONEY_ALREADY_RESTORED");
    return { ledgerId: _id, replayed: true };
  }
  const wallet = unwrap(await wallets.findOneAndUpdate(
    { userId: uid, serviceScope: HONEY_SCOPE, balance: { $gte: FORTUNE_CHAT_HONEY_COST } },
    { $inc: { balance: -FORTUNE_CHAT_HONEY_COST, totalSpent: FORTUNE_CHAT_HONEY_COST }, $set: { updatedAt: now } },
    { returnDocument: "after", session },
  ));
  if (!wallet) throw failure(402, "INSUFFICIENT_HONEY_DROPS", { required: FORTUNE_CHAT_HONEY_COST });
  await ledgers.insertOne({
    _id, userId: uid, type: "spend", amount: FORTUNE_CHAT_HONEY_COST, reason: "FORTUNE_CHAT_HONEY_SPEND",
    serviceScope: HONEY_SCOPE, featureKey, requestId: `fc-${requestId}`, idempotencyKey: _id, createdAt: now,
    metadata: { source: "fortune-chat" },
  }, { session });
  return { ledgerId: _id, replayed: false };
}

/** 아무것도 전하지 못한 연이 상담의 꿀방울을 한 번만 돌려준다. 이미 돌려준 영수증이면 false. */
export async function refundFortuneChatHoney(userId, spendLedgerId, session, now = new Date()) {
  const uid = String(userId), refundId = `refund:${spendLedgerId}`;
  const { wallets, ledgers } = collections();
  const spent = unwrap(await ledgers.findOneAndUpdate(
    { _id: String(spendLedgerId || ''), userId: uid, type: "spend", refundedAt: { $exists: false } },
    { $set: { refundedAt: now } },
    { returnDocument: "after", session },
  ));
  if (!spent) return false;
  const amount = count(spent.amount);
  const credited = await wallets.updateOne({ userId: uid, serviceScope: HONEY_SCOPE },
    { $inc: { balance: amount, totalSpent: -amount }, $set: { updatedAt: now } }, { session });
  if (!credited.modifiedCount) throw failure(409, "HONEY_WALLET_MISSING");
  await ledgers.insertOne({
    _id: refundId, userId: uid, type: "refund", amount, reason: "FORTUNE_CHAT_HONEY_REFUND",
    serviceScope: HONEY_SCOPE, featureKey: spent.featureKey, idempotencyKey: refundId, createdAt: now,
    metadata: { source: "fortune-chat", spendLedgerId: spent._id },
  }, { session });
  return true;
}

/**
 * 3,000원 결제 한 건을 입력 하나에 묶는다. 결제 증빙(verifyPerUsePayment)은 라우트가 먼저 확인한다.
 */
export async function bindPromptHubPayment(env, userId, { paymentRequestId, inputHash, toolId, source }, now = new Date()) {
  const uid = String(userId), _id = `prompt-hub-paid:${uid}:${paymentRequestId}`;
  const { ledgers } = collections();
  try {
    await withMongoRetry(env, () => ledgers.insertOne({
      _id, userId: uid, type: "paid", amount: 0, reason: "PROMPT_HUB_GENERATE_PAID",
      serviceScope: HONEY_SCOPE, toolId, inputHash, paymentSource: source, idempotencyKey: paymentRequestId,
      createdAt: now, metadata: { source: "prompt-hub" },
    }));
    return { replayed: false };
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    const existing = await withMongoRetry(env, () => ledgers.findOne({ _id }));
    if (existing?.inputHash !== inputHash) throw failure(409, "PROMPT_HUB_REQUEST_MISMATCH");
    return { replayed: true };
  }
}
