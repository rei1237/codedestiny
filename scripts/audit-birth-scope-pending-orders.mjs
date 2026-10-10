/**
 * 출생 기반 해금 — 프로필 선택 대기 주문 집계 (읽기 전용, 쓰기 없음).
 *
 * 출생 기반 해금(userId + birthKey + contentKey) 전환 전 주문은 pricingSnapshot 에 생년월일이 없다.
 * 저장 프로필이 사라진 주문은 지급 대상을 알 수 없어 보류되고, 사용자가 프로필을 고르면 풀린다
 * (worker/payments/birth-profile-claim.js · docs/PAYMENT_AND_ACCESS.md).
 *
 *   ① pending  — 지금 프로필 선택 대기인 주문(서버 목록과 같은 정의 isBirthProfilePendingOrder)
 *   ② atRisk   — 아직 표식은 없지만 지급되면 보류될 주문: 출생 기반 + 스냅샷 생년월일 없음 + 미지급
 *                (V2 paid·entitlementGrantedAt 없음, 구 단건 processing) + 프로필 id 없음 또는 그 프로필이 지워짐
 *
 * 🔴 find/count 외의 연산을 넣지 말 것. 판정을 다시 구현하지 않는다 — 서버 정의를 그대로 부른다.
 * 🔴 개인정보 무출력: userId·주문번호·프로필·생년월일을 내지 않는다. 건수와 경로·상태 분포만 낸다.
 *
 * 실행:
 *   node scripts/audit-birth-scope-pending-orders.mjs --db code_destiny_staging [--json]
 *   node scripts/audit-birth-scope-pending-orders.mjs --db code_destiny [--json]
 */
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { BIRTH_PROFILE_PENDING_STATUSES, isBirthProfilePendingOrder } from "../worker/payments/birth-profile-claim.js";
import { orderNeedsBirthProfileSelection } from "../worker/payments/birth-identity.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
globalThis.fetch = () => { throw new Error("External HTTP is forbidden in this read-only audit."); };

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DATABASE = argValue("--db", "");
if (!["code_destiny_staging", "code_destiny"].includes(DATABASE)) {
  throw new Error("Required: --db code_destiny_staging | code_destiny (no default — pick the target explicitly).");
}
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) throw new Error("MONGO_URI is not configured (.env.local).");
const OPTS = { maxTimeMS: 60000 };

const pathOf = (order) => {
  const id = String(order.merchantUid || "");
  if (id.startsWith("cd-single-")) return "legacyWeb";
  if (id.startsWith("GPA.") || String(order.paymentMethod || order.pgProvider || "").toLowerCase().includes("google")) return "googlePlay";
  return "v2";
};
const bump = (bucket, order) => {
  const key = `${pathOf(order)}:${order.status}`;
  bucket.total += 1;
  bucket.byPathStatus[key] = (bucket.byPathStatus[key] || 0) + 1;
  bucket.byFeature[order.featureKey] = (bucket.byFeature[order.featureKey] || 0) + 1;
  bucket.users.add(String(order.userId));
};
const emptyBucket = () => ({ total: 0, byPathStatus: {}, byFeature: {}, users: new Set() });

const client = new MongoClient(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 10000, socketTimeoutMS: 70000, retryWrites: false });
try {
  await client.connect();
  const db = client.db(DATABASE);
  const cursor = db.collection("payments").find({
    status: { $in: [...BIRTH_PROFILE_PENDING_STATUSES] },
    purchaseType: { $ne: "GIFT" },
    "pricingSnapshot.birthKey": { $in: [null, ""] },
  }, { ...OPTS, projection: {
    merchantUid: 1, userId: 1, featureKey: 1, status: 1, purchaseType: 1, paymentMethod: 1, pgProvider: 1,
    failureCode: 1, entitlementGrantedAt: 1, "pricingSnapshot.profileId": 1, "pricingSnapshot.partnerProfileId": 1,
    "pricingSnapshot.birthKey": 1, "pricingSnapshot.scope": 1, "pricingSnapshot.birth": 1, "pricingSnapshot.contentKey": 1,
  } });

  const pending = emptyBucket();
  const atRisk = emptyBucket();
  let scannedBirthScoped = 0;
  const profileExists = new Map();
  for await (const order of cursor) {
    if (!orderNeedsBirthProfileSelection(order)) continue;
    scannedBirthScoped += 1;
    if (isBirthProfilePendingOrder(order)) { bump(pending, order); continue; }
    const ungranted = (order.status === "paid" && !order.entitlementGrantedAt) || order.status === "processing";
    if (!ungranted) continue;
    const profileId = String(order.pricingSnapshot?.profileId || "").trim();
    let alive = false;
    if (profileId) {
      const cacheKey = `${order.userId}:${profileId}`;
      if (!profileExists.has(cacheKey)) {
        const card = await db.collection("profilecards").findOne({ userId: order.userId, profileId }, { ...OPTS, projection: { _id: 1 } });
        profileExists.set(cacheKey, Boolean(card));
      }
      alive = profileExists.get(cacheKey);
    }
    if (!alive) bump(atRisk, order);
  }

  const view = (bucket) => ({ total: bucket.total, users: bucket.users.size, byPathStatus: bucket.byPathStatus, byFeature: bucket.byFeature });
  const report = {
    database: DATABASE,
    scannedBirthScopedWithoutBirthKey: scannedBirthScoped,
    pending: view(pending),
    atRisk: view(atRisk),
    note: "pending = 지금 프로필 선택 대기. atRisk = 미지급 + 프로필 없음/삭제 — 지급 시도 때 보류된다. 프로필이 살아 있는 소급 주문은 현재 생년월일로 지급된다(대상 아님). 쓰기 없음.",
  };
  if (process.argv.includes("--json")) console.log(JSON.stringify(report));
  else console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}
