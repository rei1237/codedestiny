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

// 차감 CAS 가 읽는 필드와 돌려받는 필드. 두 커넥션 계층이 같은 문서 모양을 보도록 한 곳에서 만든다.
// 상수로 공유하지 않고 매번 새로 만드는 이유: mongoose 는 옵션 객체를 자기 쿼리 상태로 흡수하며
// 손댈 수 있어서, 같은 객체를 돌려 쓰면 호출 간섭이 생긴다(동결하면 그 순간 throw 다).
const consumeReadOptions = () => ({ projection: { profileSubscription: 1, recentConsumeRequestIds: 1 } });
const consumeWriteOptions = () => ({ returnDocument: "after", projection: { points: 1, profileSubscription: 1 } });

// 🔴 버전 가드는 반드시 buildLotsVersionFilter 를 경유한다. version 계산이
// `Number(sub.membershipCreditLotsVersion || 0)` 이라 **필드가 아예 없는 문서도 0** 인데,
// Mongo 의 `{f: 0}` 은 f 가 없는 문서를 매칭하지 않는다. 그 갈래를 빠뜨렸던 탓에 lot 마이그레이션
// 이전 계정(스칼라 잔액만 있고 ensureLotsForBalance 가 lot 을 합성해 주는 그 집단)은 CAS 가
// 5회 전부 null → CONTENDED → **잔량이 충분한데도 결정론적 409** 였다(2026-08-12).
// 환불 경로(restoreMonthlyCreditLot)는 처음부터 이 필터를 써서 같은 사고를 겪지 않았다.
function buildConsumeFilter(userId, version, pushRequestId) {
  return {
    _id: userId,
    ...buildLotsVersionFilter(version),
    ...(pushRequestId ? { recentConsumeRequestIds: { $ne: pushRequestId } } : {}),
  };
}

function buildConsumeUpdate({ deduction, need, incrementUsed, pushRequestId }) {
  return {
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
  };
}

// 낙관적 CAS 루프. **읽기·쓰기 두 갈래만** 주입받고 필터·업데이트 문서는 여기서만 조립한다 —
// mongoose 경로와 결제 레인 경로가 같은 write 를 내는 것이 이 분리의 요점이고, 두 벌로 갈라 두면
// 한쪽만 고쳐질 때 조용한 회계 손상이 된다(lot/스칼라 정합·멱등 마커가 전부 이 write 에 실려 있다).
async function runConsumeCas({ userId, amount, pushRequestId, incrementUsed, readUser, applyUpdate }) {
  const need = Math.max(0, Math.floor(Number(amount || 0)));
  if (!userId) return { ok: false, reason: "USER_NOT_FOUND", balance: 0, user: null };
  if (need <= 0) return { ok: true, reason: "NOOP", balance: null, user: null };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const current = await readUser();
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
    const updated = await applyUpdate(
      buildConsumeFilter(userId, version, pushRequestId),
      buildConsumeUpdate({ deduction, need, incrementUsed, pushRequestId }),
    );
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

// 월정석 지급분별(lot) FIFO 차감: 만료분은 제외하고 오래된 지급분부터 소진한다.
// 여러 라우트에 흩어진 인라인 차감(구독형 접근)을 이 헬퍼로 통일해 lot/스칼라 정합을 보장한다.
// 반환: { ok, balance(차감 후 유효잔액|부족 시 현재 유효잔액), user(갱신본|null), reason }
// incrementUsed:false 는 **회수**(결제 취소로 지급 자체가 무효가 된 경우)용이다 — 사용자가 쓴 게
// 아니므로 membershipCreditUsed 를 올리면 사용량 통계가 부풀고 환불 회계가 어긋난다.
// (restoreMonthlyCreditLot 의 decrementUsed/incrementGranted 와 같은 관례.)
export async function consumeMonthlyCreditLots({ userId, amount, pushRequestId = "", incrementUsed = true } = {}) {
  return runConsumeCas({
    userId,
    amount,
    pushRequestId,
    incrementUsed,
    readUser: () => User.findById(userId).select("profileSubscription recentConsumeRequestIds").lean(),
    applyUpdate: (filter, update) => User.findOneAndUpdate(filter, update, consumeWriteOptions()).lean(),
  });
}

/* 드라이버 7 은 findOneAndUpdate 가 문서를 직접 준다. 예전 형태({value})도 받아 두는 이유는
   드라이버 상향 한 번에 조용히 null 로 읽혀 **모든 CAS 가 "졌다"로 보이는** 사고를 막기 위해서다
   (worker/payments/orders.js 의 unwrap 과 같은 관례). */
function unwrapDoc(result) {
  if (result && typeof result === "object" && "value" in result && !("_id" in result)) return result.value;
  return result;
}

/**
 * 결제 컨텍스트(worker/payments/) 전용 차감. 위 함수와 **같은 CAS·같은 write** 를 그 요청의
 * db 핸들(네이티브 드라이버)로 돈다.
 *
 * 🔴 왜 따로 있는가: mongoose 모델 API 는 **기본(공유) 커넥션에만** 붙는다. 결제 컨텍스트는 결제
 * 전용 레인을 쓰고 공유 핸드셰이크를 건너뛸 수 있어(worker/payments/db.js skipSharedConnect),
 * 그 상태에서 mongoose 를 부르면 bufferCommands:false 때문에 버퍼링 없이 즉시 MongooseError 가
 * 되고 503 DB_UNAVAILABLE 로 나간다 — 잔량이 충분해도 월정석 결제만 전면 실패하던 원인이다
 * (2026-08-12). 네이티브로 돌면 레인이 켜져 있든 꺼져 있든 그 요청이 쥔 커넥션을 그대로 쓴다.
 *
 * @param {{ findOne: Function, findOneAndUpdate: Function }} db withPaymentDb 가 준 핸들(왕복이 계수된다)
 * @param userId 🔴 **ObjectId 여야 한다.** 네이티브 드라이버는 캐스팅하지 않으므로 문자열을 넘기면
 *   아무것도 매칭되지 않고 조용히 USER_NOT_FOUND 가 된다(worker/payments/db.js toObjectId 경유).
 */
export async function consumeMonthlyCreditLotsWithDb(db, { userId, amount, pushRequestId = "", incrementUsed = true } = {}) {
  return runConsumeCas({
    userId,
    amount,
    pushRequestId,
    incrementUsed,
    readUser: () => db.findOne(User, { _id: userId }, consumeReadOptions()),
    applyUpdate: async (filter, update) => unwrapDoc(
      await db.findOneAndUpdate(User, filter, update, consumeWriteOptions()),
    ),
  });
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
