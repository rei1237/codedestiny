// 월정석 lot의 DB 반영(서버 전용) — 순수 회계는 monthly-credit-lots.js, 여기선 User 문서 write.
import { RECENT_CONSUME_REQUEST_ID_CAP, User } from "./models.js";
import { applyGrantLot, deductLotsFIFO, ensureLotsForBalance } from "./monthly-credit-lots.js";

const MAX_ATTEMPTS = 5;

function buildLotsVersionFilter(version) {
  if (version !== 0) return { "profileSubscription.membershipCreditLotsVersion": version };
  return {
    $or: [
      { "profileSubscription.membershipCreditLotsVersion": 0 },
      { "profileSubscription.membershipCreditLotsVersion": { $exists: false } },
    ],
  };
}

// 월정석 지급분별(lot) FIFO 차감: 만료분은 제외하고 오래된 지급분부터 소진한다.
// 여러 라우트에 흩어진 인라인 차감(구독형 접근)을 이 헬퍼로 통일해 lot/스칼라 정합을 보장한다.
// 반환: { ok, balance(차감 후 유효잔액|부족 시 현재 유효잔액), user(갱신본|null), reason }
// incrementUsed:false 는 **회수**(결제 취소로 지급 자체가 무효가 된 경우)용이다 — 사용자가 쓴 게
// 아니므로 membershipCreditUsed 를 올리면 사용량 통계가 부풀고 환불 회계가 어긋난다.
// (restoreMonthlyCreditLot 의 decrementUsed/incrementGranted 와 같은 관례.)
export async function consumeMonthlyCreditLots({ userId, amount, pushRequestId = "", incrementUsed = true } = {}) {
  const need = Math.max(0, Math.floor(Number(amount || 0)));
  if (!userId) return { ok: false, reason: "USER_NOT_FOUND", balance: 0, user: null };
  if (need <= 0) return { ok: true, reason: "NOOP", balance: null, user: null };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const current = await User.findById(userId).select("profileSubscription recentConsumeRequestIds").lean();
    if (!current?._id) return { ok: false, reason: "USER_NOT_FOUND", balance: 0, user: null };
    // 멱등: 이미 처리된 요청이면 재차감하지 않는다.
    if (pushRequestId && Array.isArray(current.recentConsumeRequestIds) && current.recentConsumeRequestIds.includes(pushRequestId)) {
      return { ok: false, reason: "ALREADY_PROCESSED", balance: null, user: current };
    }
    const sub = current.profileSubscription || {};
    const ensured = ensureLotsForBalance(sub, Date.now());
    const deduction = deductLotsFIFO(ensured.lots, need, Date.now());
    if (!deduction.ok) return { ok: false, reason: "INSUFFICIENT", balance: ensured.balance, user: current };
    const version = Math.floor(Number(sub.membershipCreditLotsVersion || 0));
    const updated = await User.findOneAndUpdate(
      {
        _id: userId,
        "profileSubscription.membershipCreditLotsVersion": version,
        ...(pushRequestId ? { recentConsumeRequestIds: { $ne: pushRequestId } } : {}),
      },
      {
        $set: {
          "profileSubscription.membershipCreditLots": deduction.lots,
          "profileSubscription.membershipCreditBalance": deduction.balance,
        },
        $inc: {
          ...(incrementUsed ? { "profileSubscription.membershipCreditUsed": need } : {}),
          "profileSubscription.membershipCreditLotsVersion": 1,
        },
        // 중복 방지는 위 필터의 `$ne: pushRequestId` 가드가 담당한다($push는 스스로 못 막는다).
        ...(pushRequestId ? {
          $push: {
            recentConsumeRequestIds: { $each: [pushRequestId], $slice: -RECENT_CONSUME_REQUEST_ID_CAP },
          },
        } : {}),
      },
      { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
    ).lean();
    if (updated) {
      // 월정석 잔량이 바뀌었으니 billing.js의 표시용 잔량 캐시(globalThis 공유)를 즉시 무효화한다
      // — 결제 직후 결제창 재개폐에서 stale 잔량이 뜨지 않게 한다. import 순환 없이 globalThis로 접근.
      try { globalThis.__billingBalanceCache?.invalidateForUser?.(userId); } catch {}
      return { ok: true, reason: "OK", balance: deduction.balance, user: updated };
    }
    // 버전 충돌 → 재조회 후 재시도.
  }
  return { ok: false, reason: "CONTENDED", balance: null, user: null };
}

// 환불/재지급: 복원 금액을 신규 30일 lot으로 적립하고(기존 lot의 만료는 되살리지 않음),
// membershipCreditUsed를 되돌린다. lotId로 멱등(중복 lot 방지). 버전 가드 낙관적 write + 재시도.
// 반환: 갱신된 user(lean) | null(유저 없음/경합 소진).
export async function restoreMonthlyCreditLot({
  userId,
  lotId,
  amount,
  decrementUsed = true,
  incrementGranted = false,
  pullRequestId = "",
  returnDetails = false,
} = {}) {
  const restoreAmount = Math.max(0, Math.floor(Number(amount || 0)));
  if (!userId || restoreAmount <= 0) return null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const current = await User.findById(userId).select("profileSubscription").lean();
    if (!current?._id) return null;
    const sub = current.profileSubscription || {};
    const ensured = ensureLotsForBalance(sub, Date.now());
    const granted = applyGrantLot(ensured.lots, {
      lotId,
      amount: restoreAmount,
      grantedAt: new Date(),
      now: Date.now(),
    });
    const version = Math.floor(Number(sub.membershipCreditLotsVersion || 0));
    const updated = await User.findOneAndUpdate(
      { _id: userId, ...buildLotsVersionFilter(version) },
      {
        $set: {
          "profileSubscription.membershipCreditLots": granted.lots,
          "profileSubscription.membershipCreditBalance": granted.balance,
        },
        $inc: {
          "profileSubscription.membershipCreditLotsVersion": 1,
          ...(decrementUsed ? { "profileSubscription.membershipCreditUsed": -restoreAmount } : {}),
          ...(incrementGranted && granted.added ? { "profileSubscription.membershipCreditGranted": restoreAmount } : {}),
        },
        ...(pullRequestId ? { $pull: { recentConsumeRequestIds: pullRequestId } } : {}),
      },
      { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
    ).lean();
    if (updated) {
      try { globalThis.__billingBalanceCache?.invalidateForUser?.(userId); } catch {}
      if (returnDetails) {
        return {
          user: updated,
          added: granted.added,
          lot: granted.lot,
          beforeBalance: ensured.balance,
          afterBalance: granted.balance,
        };
      }
      return updated;
    }
    // 버전 충돌 → 재조회 후 재시도.
  }
  return null;
}

// 이벤트/보상 지급: 새 30일 lot을 적립한다. restoreMonthlyCreditLot 과 회계가 같지만
// 환불이 아니라 신규 지급이므로 membershipCreditUsed 를 되돌리지 않는다(decrementUsed:false).
// lotId 로 멱등하므로 같은 보상이 두 번 들어오지 않는다.
export async function grantMonthlyCreditLot({ userId, lotId, amount } = {}) {
  return restoreMonthlyCreditLot({ userId, lotId, amount, decrementUsed: false });
}

// 관리자·마케팅처럼 누적 지급량도 별도로 추적해야 하는 신규 지급 경로.
// 기존 보상 호출자는 grantMonthlyCreditLot()의 호환 동작을 유지한다.
export async function grantMonthlyCreditLotDetailed({ userId, lotId, amount } = {}) {
  return restoreMonthlyCreditLot({
    userId,
    lotId,
    amount,
    decrementUsed: false,
    incrementGranted: true,
    returnDetails: true,
  });
}
