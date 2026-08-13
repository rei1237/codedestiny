/**
 * 단계 ⑥ entitlement 지급. **결제 컨텍스트에서 권한을 쓰는 유일한 깔때기.**
 *
 * 구 코드는 권한 쓰기가 최소 7곳(payments.js 5곳 · billing.js 2곳 · app-store.js 3곳)에 흩어져 있었고,
 * 각자 조금씩 다른 필드를 채웠다. 중복 지급이 나면 어디서 났는지 찾는 것부터 일이었다.
 * 여기서는 지급 경로가 하나뿐이고, 그래서 **멱등성을 한 곳에서만 보장하면 된다.**
 *
 * ## 🔴 인덱스가 있다고 가정하지 않는다
 *
 * 프로덕션 실측 결과(2026-08-11) `permanent_unlock_identity`({userId,profileId,featureKey,contentKey,scope})는
 * **선언만 되어 있고 만들어진 적이 없다.** db.js 가 autoIndex:false 라 선언은 인덱스를 만들지 않고,
 * 마이그레이션이 아직 안 돌았다. 즉 그 인덱스에 기대는 중복 방지는 지금 **작동하지 않는다.**
 *
 * 그래서 신원 키를 **실제로 존재하는** 인덱스({userId,profileId,serviceKey,contentKey,scope}, unique)에
 * 맞춘다. 그리고 그것마저 없는 환경을 위해 upsert 가 E11000 을 만나면 재조회로 접어, 인덱스가
 * 있으면 DB 가 막고 없으면 최소한 조용히 두 벌이 되지는 않게 한다.
 *
 * ## 타입 함정
 *
 * ContentEntitlement.userId 는 **String** 이고 나머지 결제 컬렉션은 ObjectId 다. 네이티브 드라이버는
 * 캐스팅하지 않으므로 섞이면 unique 인덱스가 아예 충돌하지 않는다 — 중복 방지가 소리 없이 사라진다.
 * 이 파일은 toUserIdString 만 쓴다(User 갱신에서만 toObjectId).
 */
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  User,
} from "../lib/models.js";
import { USER_SCOPE_PROFILE_ID } from "../lib/content-unlocks.js";
import { paymentError } from "./errors.js";
import { toObjectId, toUserIdString } from "./db.js";

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * 주문 하나가 어떤 권한 신원으로 떨어지는지. **순수 함수** — 같은 주문이면 항상 같은 키가 나온다.
 * 그 결정성이 멱등성의 근거다(재생·webhook·크론이 전부 같은 문서를 가리킨다).
 */
export function resolveEntitlementIdentity({ featureKey, profileId, serviceKey, contentKey, scope }) {
  const feature = clean(featureKey, 160);
  if (!feature) throw paymentError("INVALID_REQUEST", "featureKey 가 필요합니다.");

  const wantsProfile = clean(profileId, 80) && scope !== CONTENT_ENTITLEMENT_SCOPES.USER;
  const resolvedScope = wantsProfile ? CONTENT_ENTITLEMENT_SCOPES.PROFILE : CONTENT_ENTITLEMENT_SCOPES.USER;
  return {
    userId: "", // 호출부가 채운다(타입 실수를 막으려고 여기서 만들지 않는다)
    profileId: wantsProfile ? clean(profileId, 80) : USER_SCOPE_PROFILE_ID,
    // serviceKey·contentKey 가 없으면 featureKey 로 접는다. 연도별 상품처럼 contentKey 가 실제로
    // 다른 것들은 호출부가 반드시 넘겨야 한다 — 안 넘기면 한 프로필이 두 해를 보유하지 못한다.
    serviceKey: clean(serviceKey, 80) || feature,
    contentKey: clean(contentKey, 120) || feature,
    scope: resolvedScope,
    featureKey: feature,
  };
}

/**
 * 지급. **멱등이다** — 같은 주문으로 몇 번을 불러도 권한은 한 벌이고 두 번 늘어나지 않는다.
 *
 * @returns {{ entitlement: object, alreadyOwned: boolean }}
 */
export async function grantEntitlement(db, {
  userId, product, orderId, paymentId = "", profileId = "", serviceKey = "", contentKey = "", scope = "",
  source = CONTENT_ENTITLEMENT_SOURCES.PAYMENT, now = new Date(),
}) {
  const uid = toUserIdString(userId);
  if (!uid) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");

  const identity = resolveEntitlementIdentity({
    featureKey: product.featureKey, profileId, serviceKey, contentKey, scope,
  });
  const filter = {
    userId: uid,
    profileId: identity.profileId,
    serviceKey: identity.serviceKey,
    contentKey: identity.contentKey,
    scope: identity.scope,
  };

  /* 이미 있으면 그대로 둔다. 재생 시 grantedAt·orderId 를 덮어쓰면 "언제 무엇으로 샀는가"라는
     회계 사실이 재생 때마다 바뀐다 — 환불 근거가 흔들린다. $setOnInsert 만 쓰는 이유다.
     status 만은 $set 이다: 환불로 REFUNDED 가 된 권한을 **다시 사면** 되살아나야 한다. */
  const update = {
    $setOnInsert: {
      ...filter,
      featureKey: identity.featureKey,
      source,
      grantType: "permanent_unlock",
      orderId: clean(orderId, 160),
      paymentId: clean(paymentId || orderId, 160),
      coinPrice: Number(product.priceCoins || 0),
      coinAmount: Number(product.priceCoins || 0),
      amountKRW: Number(product.priceKRW || 0),
      unlockedAt: now,
      grantedAt: now,
      expiresAt: null,
      createdAt: now,
    },
    $set: { status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, updatedAt: now },
  };

  let doc;
  let created = false;
  try {
    const before = await db.findOneAndUpdate(ContentEntitlement, filter, update, {
      upsert: true,
      returnDocument: "before",
    });
    doc = before;
    created = !before;
  } catch (error) {
    // 인덱스가 있는 환경에서 동시 upsert 가 붙으면 한쪽이 E11000 을 받는다. 진 쪽은 이미 남이
    // 만들어 둔 문서를 쓰면 되므로 실패가 아니다.
    if (Number(error?.code) !== 11000) throw error;
    doc = await db.findOne(ContentEntitlement, filter);
    created = false;
  }

  return { alreadyOwned: !created, identity, entitlement: doc };
}

/**
 * 계정 단위 해금 목록 갱신. `$addToSet` 이라 본질적으로 멱등이고 읽기가 필요 없다.
 * 확정 경로가 users 를 **읽지** 않는 이유가 이것이다 — 쓰기는 하되 왕복은 1회다.
 */
export async function markUserFeatureUnlocked(db, { userId, featureKey, now = new Date() }) {
  const uid = toObjectId(userId);
  const feature = clean(featureKey, 160);
  if (!uid || !feature) return false;
  const result = await db.updateOne(
    User,
    { _id: uid },
    {
      $addToSet: { unlockedFeatures: feature, paidFeatures: feature },
      $set: { updatedAt: now },
    },
  );
  return Number(result?.matchedCount || 0) === 1;
}

/**
 * 🔴 **차감 실패 보상 전용.** 방금 이 요청이 만든 지급을 없던 일로 되돌린다.
 *
 * 환불이 아니다 — 환불은 revokeEntitlementForOrder(상태만 REFUNDED) 를 쓴다. 여기서 상태 변경이
 * 아니라 **삭제**인 이유는 grantEntitlement 의 alreadyOwned 판정이 status 가 아니라 **문서 존재
 * 여부**이기 때문이다(위 findOneAndUpdate 의 returnDocument:"before"). 남겨 두면 다음 시도가
 * alreadyOwned=true 로 접혀 차감 없이 무료로 열린다 — 고치려던 문제가 더 나빠진다.
 *
 * orderId 를 필터에 함께 거는 것이 안전장치다. 호출부는 alreadyOwned===false 인 경우에만 부르므로
 * 그 문서의 orderId 는 이번 요청의 것이고, 동시에 들어온 다른 주문이 만든 문서는 지우지 않는다.
 */
export async function dropEntitlementByIdentity(db, { userId, identity, orderId }) {
  const uid = toUserIdString(userId);
  const order = clean(orderId, 160);
  if (!uid || !identity || !order) return false;
  const result = await db.deleteOne(ContentEntitlement, {
    userId: uid,
    profileId: identity.profileId,
    serviceKey: identity.serviceKey,
    contentKey: identity.contentKey,
    scope: identity.scope,
    orderId: order,
  });
  return Number(result?.deletedCount || 0) === 1;
}

/**
 * 환불 시 권한 회수. 문서를 지우지 않고 상태만 바꾼다 —
 * 사용자가 무엇을 언제 샀다가 환불했는지는 남아야 하고, 다시 사면 같은 문서가 되살아난다.
 */
export async function revokeEntitlementForOrder(db, { orderId, now = new Date() }) {
  const result = await db.updateOne(
    ContentEntitlement,
    { orderId: clean(orderId, 160), status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE },
    { $set: { status: CONTENT_ENTITLEMENT_STATUSES.REFUNDED, updatedAt: now } },
  );
  return Number(result?.modifiedCount || 0) === 1;
}

export const __entitlementTestUtils = { clean };
