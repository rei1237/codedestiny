/**
 * 월정석 차감. **트랜잭션 없이.**
 *
 * ## 지금 이 결제수단은 죽어 있다
 *
 * 구 코드는 lot 차감·원장·PointHistory·권한을 `mongoose.startSession().withTransaction()` 으로 묶는데,
 * Atlas M0 에는 리플리카셋이 없어 세션이 아예 안 열린다. 그 실패가 503 MONTHLY_ATOMIC_UNAVAILABLE 로
 * 나가는데 **재시도로 절대 성공하지 않는 영구 503** 이다(worker/routes/billing.js:4318).
 * 즉 월정석은 결제창에 보이지만 고르면 반드시 실패한다.
 *
 * ## 트랜잭션이 실제로 하던 일
 *
 * lot 차감 자체는 이미 올바른 낙관적 CAS 다(monthly-credit-store.js — 버전 필드 + 5회 재시도 +
 * recentConsumeRequestIds 멱등 가드). 트랜잭션은 그 위에 원장·권한을 **함께 묶으려는 래퍼**였을 뿐이다.
 * 그러니 필요한 것은 CAS 로의 교체가 아니라 **쓰기 순서 재배치**다.
 *
 *     원장 예약(미정산) → lot 차감 → 원장 정산 → 권한 지급
 *
 * 1↔2 사이에서 죽으면 **미정산 원장 + 미차감 잔액** 이 남는다. 사용자는 과금되지 않았고 재시도가 안전하다.
 * 반대 순서(차감 먼저)가 트랜잭션이 가리고 있던 **유일하게 나쁜 인터리빙**이다 — 거기서 죽으면
 * 기록 없이 차감만 남아 사람이 찾아내기 전까지 복구가 안 된다.
 *
 * ## PointHistory 를 쓰지 않는다
 *
 * 폐지된 통화(코인)의 0-delta 감사행이라 신규 시스템은 쓰지 않는다. 월정석의 회계 정본은
 * MonthlyCreditLedger 하나다. 구 데이터는 그대로 보존되며 아무것도 지우지 않는다.
 */
import { MonthlyCreditLedger, User } from "../lib/models.js";
import { consumeMonthlyCreditLotsWithDb } from "../lib/monthly-credit-store.js";
import { paymentError } from "./errors.js";
import { toObjectId } from "./db.js";

const SPEND = "MONTHLY_CREDIT_SPEND";

/** 미정산 예약행을 골라내는 조건. `settledAt` 에 default 를 두지 않은 이유가 이것이다. */
export const UNSETTLED_FILTER = Object.freeze({ settledAt: { $exists: false } });

function ledgerFilter(uid, sourceId) {
  return { userId: uid, type: SPEND, sourceId };
}

/**
 * 월정석으로 결제한다.
 *
 * @param {object} db withPaymentDb 가 준 핸들(왕복이 계수된다)
 * @param {{ userId: string, product: object, purchaseId: string, profileId?: string }} input
 * @param {{ consumeLots?: (input: object) => Promise<object> }} [deps] 테스트용 주입 — 차감 결과를
 *   고정해 **쓰기 순서와 실패 시 되돌림**만 따로 보기 위한 것이다. 그게 트랜잭션을 대체하는
 *   부분이고, 틀리면 돈이 사라진다. 주입하지 않으면 실제 CAS 가 아래 db 핸들로 그대로 돈다.
 * @returns {Promise<{ balance: number, replayed: boolean, ledgerId: string }>}
 */
export async function spendMoonstone(db, { userId, product, purchaseId, profileId = "" }, deps = {}) {
  /* 🔴 mongoose 판(consumeMonthlyCreditLots)이 아니라 db 핸들 판이다. 결제 컨텍스트는 공유
     핸드셰이크를 건너뛸 수 있어(worker/payments/db.js), mongoose 모델을 부르면 콜드
     아이솔레이트에서 bufferCommands:false 때문에 즉시 죽어 503 이 된다 — 잔량이 충분해도
     월정석만 실패하던 원인이다(2026-08-12). 회계 로직은 두 판이 같은 CAS 를 공유한다. */
  const consumeLots = deps.consumeLots || ((input) => consumeMonthlyCreditLotsWithDb(db, input));
  const uid = toObjectId(userId);
  if (!uid) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
  const sourceId = String(purchaseId || "").trim();
  if (!sourceId) throw paymentError("IDEMPOTENCY_KEY_REQUIRED", "결제 요청 식별자가 필요합니다.");
  const cost = Math.max(0, Math.floor(Number(product?.monthlyCost || 0)));
  if (cost <= 0) throw paymentError("PRODUCT_NOT_FOUND", "월정석으로 결제할 수 없는 상품입니다.");

  const now = new Date();

  // ── 1. 원장 예약. **효과보다 의도를 먼저 남긴다.**
  //    unique {userId,type,sourceId} 가 프로덕션에 실제로 존재함을 확인했으므로(2026-08-11 실측)
  //    여기서의 중복 판정은 DB 가 보장한다.
  let reserved = true;
  try {
    await db.insertOne(MonthlyCreditLedger, {
      userId: uid,
      type: SPEND,
      amount: cost,
      sourceId,
      serviceKey: String(product.featureKey || ""),
      profileId: String(profileId || ""),
      reason: String(product.label || ""),
      metadata: { purchaseId: sourceId, productId: String(product.productId || "") },
      createdAt: now,
      updatedAt: now,
      // settledAt 은 일부러 넣지 않는다 — 이 순간의 이 행이 '미정산 예약'이라는 표식이다.
    });
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
    reserved = false;
  }

  if (!reserved) {
    // 이미 같은 purchaseId 로 진행됐거나 진행 중이다. 어느 쪽인지는 정산 여부가 말해 준다.
    const existing = await db.findOne(MonthlyCreditLedger, ledgerFilter(uid, sourceId));
    if (existing?.settledAt) {
      return { balance: Number(existing.afterBalance || 0), replayed: true, ledgerId: String(existing._id || "") };
    }
    // 형제 요청이 아직 차감 중이다. 402(잔액부족)로 내면 사용자가 카드로 또 결제해 이중과금이 된다.
    throw paymentError("MOONSTONE_IN_PROGRESS", "월정석 사용을 처리하는 중입니다. 잠시 후 다시 시도해 주세요.", { sourceId });
  }

  // ── 2. lot 차감. 이미 올바른 CAS 를 **그대로** 쓴다(동결 대상 — 여기서 재구현하지 않는다).
  const deducted = await consumeLots({
    userId: uid,
    amount: cost,
    pushRequestId: sourceId,
    incrementUsed: true,
  });

  if (!deducted.ok && deducted.reason !== "ALREADY_PROCESSED") {
    /* 차감이 일어나지 않았다. 예약을 지워 다음 시도가 "형제가 진행 중"으로 오해하지 않게 한다 —
       지우지 않으면 재시도가 영영 409 만 받는 데드락이 된다. */
    await db.deleteOne(MonthlyCreditLedger, { ...ledgerFilter(uid, sourceId), ...UNSETTLED_FILTER });

    if (deducted.reason === "INSUFFICIENT") {
      throw paymentError("INSUFFICIENT_MOONSTONE", "월정석이 부족합니다.", {
        required: cost,
        balance: Number(deducted.balance || 0),
      });
    }
    if (deducted.reason === "USER_NOT_FOUND") throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
    // CONTENDED = 5회 write 가 모두 경합으로 실패 = 미차감. 장애가 아니라 동시성이므로 409 다.
    throw paymentError("MOONSTONE_CONTENDED", "월정석 사용이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.", {
      sourceId,
    });
  }

  /* ALREADY_PROCESSED 인데 예약은 방금 새로 만들어졌다 = 이전 실행이 차감까지 하고 원장을 남기지
     못한 채 죽었다는 뜻이다(recentConsumeRequestIds 에 우리 sourceId 가 있는 것이 그 증거다).
     차감은 이미 됐으므로 다시 하지 않고, 아래 정산·지급만 이어서 마무리한다. */
  const afterBalance = Number(
    deducted.balance ?? deducted.user?.profileSubscription?.membershipCreditBalance ?? 0,
  );

  // ── 3. 정산. 관측된 잔액을 원장에 적어 예약을 확정으로 바꾼다.
  await db.updateOne(
    MonthlyCreditLedger,
    ledgerFilter(uid, sourceId),
    { $set: { beforeBalance: afterBalance + cost, afterBalance, settledAt: new Date(), updatedAt: new Date() } },
  );

  return { balance: afterBalance, replayed: deducted.reason === "ALREADY_PROCESSED", ledgerId: "" };
}

/**
 * 크론용. 예약만 남고 정산되지 않은 행을 마무리하거나 되돌린다.
 *
 * 판정 기준은 **차감이 실제로 일어났는가** 하나뿐이고, 그 증거는 사용자 문서의
 * recentConsumeRequestIds 다(lot CAS 가 차감과 같은 갱신에서 함께 넣는다 — 둘은 한 세트다).
 */
export async function settleOrphanSpends(db, { now = new Date(), olderThanMs = 5 * 60_000, limit = 50 } = {}) {
  const cutoff = new Date(now.getTime() - olderThanMs);
  const orphans = await db.find(
    MonthlyCreditLedger,
    { type: SPEND, ...UNSETTLED_FILTER, createdAt: { $lt: cutoff } },
    { limit },
  );

  let settled = 0;
  let reverted = 0;
  for (const row of orphans) {
    const user = await db.findOne(User, { _id: row.userId }, {
      projection: { recentConsumeRequestIds: 1, "profileSubscription.membershipCreditBalance": 1 },
    });
    const deducted = Array.isArray(user?.recentConsumeRequestIds)
      && user.recentConsumeRequestIds.includes(String(row.sourceId));

    if (deducted) {
      const balance = Number(user?.profileSubscription?.membershipCreditBalance || 0);
      await db.updateOne(MonthlyCreditLedger, { _id: row._id }, {
        $set: { beforeBalance: balance + Number(row.amount || 0), afterBalance: balance, settledAt: now, updatedAt: now },
      });
      settled += 1;
    } else {
      // 차감이 없었다 = 사용자는 과금되지 않았다. 예약만 걷어낸다.
      await db.deleteOne(MonthlyCreditLedger, { _id: row._id, ...UNSETTLED_FILTER });
      reverted += 1;
    }
  }
  return { scanned: orphans.length, settled, reverted };
}

export const __moonstoneTestUtils = { SPEND, ledgerFilter };
