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
import { USER_SCOPE_PROFILE_ID, resolvePaidContentServiceKey } from "../lib/content-unlocks.js";
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
    /* 🔴 serviceKey 는 featureKey 로 접지 않고 **정본 유도표**로 접는다(content-unlocks.js).
       featureKey 로 접던 동안 V2 가 쓴 행은 serviceKey 가 "sukyo_yearly_fortune_unlock" 이었는데,
       리더는 전부 정본 serviceKey("sukuyo"/"ziwei"/"saju"…)로 조회한다 — 레포에 serviceKey===featureKey
       로 찾는 리더는 하나도 없다. 그래서 결제해도 영영 안 읽히는 권한이 쌓였다.
       fallback 인자에 feature 를 넘기는 것이 중요하다: 안 넘기면 매핑 없는 기능이 "paid_content" 로
       뭉뚱그려져 신원이 불필요하게 이동한다. 이러면 **명시 매핑이 있는 기능만** 바뀐다.
       contentKey 는 종전대로 featureKey 로 접는다 — 연도별 상품처럼 실제로 다른 것들은 호출부가
       반드시 넘겨야 한다(안 넘기면 한 프로필이 두 해를 보유하지 못한다). */
    serviceKey: clean(serviceKey, 80) || resolvePaidContentServiceKey(feature, feature),
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

  /* 🔴 과도기 가드 (2026-08-13 도입, 백필 후 제거 예정).
     serviceKey 유도가 'featureKey 접기'에서 '정본 유도'로 바뀌기 **전에** 지급된 행은 옛
     serviceKey(=featureKey)로 저장돼 있다. 그 행을 못 본 채 새 신원으로 upsert 하면
     ① 유니크 인덱스가 없는 환경: 새 행이 생겨 alreadyOwned=false → 월정석·이용권 경로가 **재차감**
     ② 있는 환경: E11000 → 아래 catch 의 재조회가 새 필터로 돌아 doc=null → 영구 잠금
     둘 다 사용자 손해다. 신원이 실제로 바뀌는 기능에 한해 옛 신원을 1회만 확인한다.
     REFUNDED 행은 소유로 치지 않는다(다시 사면 되살아나야 한다).
     제거 조건: scripts/migrations/20260813-normalize-v2-entitlement-service-keys.mjs --check 가 0건. */
  if (identity.serviceKey !== identity.featureKey) {
    const legacyTwin = await db.findOne(ContentEntitlement, {
      ...filter,
      serviceKey: identity.featureKey,
      status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    });
    if (legacyTwin) return { alreadyOwned: true, identity, entitlement: legacyTwin };
  }

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
