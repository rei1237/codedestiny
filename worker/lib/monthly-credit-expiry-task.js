// 월정석 만료 스윕(매일 크론): 지급일+30일이 지난 미사용 lot을 소멸시키고 원장에 기록한다.
// 지연소멸(소비/조회 시 유효잔액 제외)과 이중화 — 여기선 물리적 제거 + MONTHLY_CREDIT_EXPIRE 원장 남김.
// Cloudflare rate-limit 안전: 배치·상한·terminal 종료(무한 루프 금지).
import { connectDb, withMongoRetry } from "./db.js";
import { MonthlyCreditLedger, User } from "./models.js";
import { normalizeLots } from "./monthly-credit-lots.js";

function clampInt(value, fallback, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// 소멸 원장 기록(멱등 upsert). sourceId = expire:<lotId>:<expiresAtMs> 로 lot당 1회만.
async function recordExpiryLedger(userId, lot, expiredAt) {
  const amount = Math.max(0, Math.floor(Number(lot?.remaining || 0)));
  if (amount <= 0) return;
  const expiresMs = lot?.expiresAt ? new Date(lot.expiresAt).getTime() : expiredAt.getTime();
  const sourceId = `expire:${String(lot?.lotId || "")}:${expiresMs}`.slice(0, 180);
  try {
    await MonthlyCreditLedger.updateOne(
      { userId, type: "MONTHLY_CREDIT_EXPIRE", sourceId },
      {
        $setOnInsert: {
          userId,
          type: "MONTHLY_CREDIT_EXPIRE",
          amount,
          reason: "monthly_credit_expired",
          sourceId,
          serviceKey: "",
          profileId: "",
          metadata: {
            lotId: String(lot?.lotId || ""),
            grantedAt: lot?.grantedAt || null,
            expiresAt: lot?.expiresAt || null,
            expiredAt,
          },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (Number(error?.code) !== 11000) {
      console.warn("[CRON] monthly-credit expire ledger insert failed", String(error?.message || error));
    }
  }
}

// 한 유저의 만료 lot을 소멸 처리. 원장 먼저(멱등) → 버전 가드로 lot/잔액 갱신.
export async function sweepExpiredMonthlyCreditForUser(userDoc, now) {
  const userId = userDoc?._id;
  if (!userId) return { changed: false, expiredAmount: 0 };
  const sub = userDoc?.profileSubscription || {};
  const { activeLots, expiredLots, activeBalance } = normalizeLots(sub.membershipCreditLots, now.getTime());
  if (!expiredLots.length) return { changed: false, expiredAmount: 0 };

  let expiredAmount = 0;
  for (const lot of expiredLots) {
    expiredAmount += Math.max(0, Math.floor(Number(lot.remaining || 0)));
    await recordExpiryLedger(userId, lot, now);
  }

  const version = Math.floor(Number(sub.membershipCreditLotsVersion || 0));
  const nextLots = activeLots.map((lot) => ({
    lotId: lot.lotId,
    amount: lot.amount,
    remaining: lot.remaining,
    grantedAt: lot.grantedAt,
    expiresAt: lot.expiresAt,
  }));
  const updated = await User.findOneAndUpdate(
    { _id: userId, "profileSubscription.membershipCreditLotsVersion": version },
    {
      $set: {
        "profileSubscription.membershipCreditLots": nextLots,
        "profileSubscription.membershipCreditBalance": activeBalance,
      },
      $inc: { "profileSubscription.membershipCreditLotsVersion": 1 },
    },
    { returnDocument: "after", projection: { _id: 1 } },
  ).lean();
  // updated=null(버전 충돌)이면 lot은 그대로 남지만 유효잔액에서 이미 제외되므로 다음 회차가 재처리(원장 멱등).
  return { changed: Boolean(updated), expiredAmount };
}

export async function runMonthlyCreditExpiryTask(env) {
  const startedAt = Date.now();
  try {
    await connectDb(env);
    const limit = clampInt(env?.MONTHLY_CREDIT_EXPIRE_SWEEP_LIMIT, 200, 1, 1000);
    const maxBatches = clampInt(env?.MONTHLY_CREDIT_EXPIRE_MAX_BATCHES, 5, 1, 50);
    const now = new Date();

    let scanned = 0;
    let sweptUsers = 0;
    let expiredCredits = 0;
    let batches = 0;
    let limitReached = false;

    for (batches = 0; batches < maxBatches; batches += 1) {
      // 만료 lot(잔량>0)을 가진 유저만 좁혀 조회. 스윕된 유저는 다음 조회에서 자연히 빠진다.
      const users = await withMongoRetry(env, () => User.find({
        "profileSubscription.membershipCreditLots": {
          $elemMatch: { expiresAt: { $lte: now }, remaining: { $gt: 0 } },
        },
      })
        .select("profileSubscription.membershipCreditLots profileSubscription.membershipCreditLotsVersion")
        .limit(limit)
        .lean());
      if (!users.length) break;
      scanned += users.length;

      for (const userDoc of users) {
        try {
          // 🔴 유저 단위로 통째로 감싼다 — 안에 원장 upsert + lot CAS 두 op 이 있는데, 등록하지 않으면
          // db.js 의 in-flight 가드가 못 보고 옆 태스크의 ping 실패에 함께 끊긴다(2026-09-03 실사고).
          // {retries:0} — $inc(membershipCreditLotsVersion)를 포함한다. 버전 CAS 가 이중 적용을 막지만
          // 재시도로 같은 유저를 두 번 도는 경로를 애초에 만들지 않는다.
          // 🔴 이 서브트리 안에 재시도를 새로 추가하지 말 것(verify:no-nested-retry 가 잡는다).
          const res = await withMongoRetry(env, () => sweepExpiredMonthlyCreditForUser(userDoc, now), { retries: 0 });
          if (res.changed) {
            sweptUsers += 1;
            expiredCredits += res.expiredAmount;
          }
        } catch (error) {
          console.warn("[CRON] monthly-credit expire sweep (user) failed", String(error?.message || error));
        }
      }

      if (users.length < limit) break;
      if (batches + 1 >= maxBatches) limitReached = true;
    }

    const result = { ok: true, scanned, sweptUsers, expiredCredits, batches: batches + 1, limitReached };
    console.log("[CRON] monthly-credit expiry task completed", JSON.stringify({ ...result, durationMs: Date.now() - startedAt }));
    return result;
  } catch (error) {
    console.error("[CRON] monthly-credit expiry task failed", String(error?.message || error));
    return { ok: false, error: String(error?.message || error) };
  }
}
