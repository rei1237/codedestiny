/**
 * payments V2 가 featureKey 로 접어 저장한 ContentEntitlement.serviceKey 를 정본 유도값으로 되돌린다.
 *
 * 배경: worker/payments/entitlements.js 의 resolveEntitlementIdentity 가 serviceKey 를
 * `serviceKey || featureKey` 로 접었다. 그런데 레포의 모든 리더는 정본 serviceKey
 * ("sukuyo"/"ziwei"/"saju"…)로 조회한다 — serviceKey === featureKey 로 찾는 리더는 하나도 없다.
 * 그래서 V2 로 결제된 권한은 저장은 됐지만 **영영 안 읽혔다**(= 결제해도 계속 잠김).
 * 런타임은 2026-08-13 에 고쳤고, 이 스크립트는 그 전에 쌓인 행을 뒤늦게 맞춘다.
 *
 * 🔴 기본은 읽기 전용이다. --check(기본과 동일한 스캔 + 종료코드) / --dry-run 으로 먼저 규모를 본 뒤,
 * 사용자 승인 하에 --apply 로만 쓴다. 행을 지우지 않는다(감사 추적 보존).
 *
 * 판정은 런타임과 **같은 모듈**에서 import 한다(resolvePaidContentServiceKey). 여기에 매핑을 다시
 * 적으면 런타임과 드리프트가 생기고, 그 드리프트가 곧 "고쳤는데 안 고쳐진 행"이 된다.
 *
 * 정본 쌍둥이가 이미 있는 행은 **건드리지 않는다**. serviceKey 를 바꾸면
 * {userId,profileId,serviceKey,contentKey,scope} unique 인덱스와 충돌하고(E11000),
 * 어차피 리더는 정본 행을 찾으므로 옛 행이 남아도 사용자에게는 문제가 없다.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement } from "../../worker/lib/models.js";
import { resolvePaidContentServiceKey } from "../../worker/lib/content-unlocks.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

// V2 지급만 대상으로 한다. 레거시 쓰기 경로(upsertPaidContentUnlock)는 처음부터 정본 유도를 썼다.
const V2_SOURCES = ["payment", "PAYMENT", "monthly", "MONTHLY", "pass", "PASS"];
const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";
const SAMPLE_LIMIT = 20;

function canonicalServiceKeyFor(featureKey) {
  const feature = String(featureKey || "").trim();
  if (!feature) return "";
  // fallback 에 feature 를 넘기는 것이 런타임과 동일한 계약이다 — 매핑 없는 기능은 안 건드린다.
  return resolvePaidContentServiceKey(feature, feature);
}

async function collectRewritableRows() {
  const rows = await ContentEntitlement.collection
    .find(
      {
        $expr: { $eq: ["$serviceKey", "$featureKey"] },
        featureKey: { $exists: true, $type: "string", $gt: "" },
        source: { $in: V2_SOURCES },
      },
      { projection: { userId: 1, profileId: 1, featureKey: 1, contentKey: 1, scope: 1, serviceKey: 1, status: 1, source: 1, orderId: 1, grantedAt: 1 } },
    )
    .toArray();

  const rewritable = [];
  const skippedUnmapped = [];
  for (const row of rows) {
    const canonical = canonicalServiceKeyFor(row.featureKey);
    if (!canonical || canonical === row.serviceKey) {
      skippedUnmapped.push(row);
      continue;
    }
    rewritable.push({ row, canonical });
  }
  return { rewritable, skippedUnmapped, scanned: rows.length };
}

// 정본 쌍둥이가 있으면 rename 이 E11000 을 맞는다. 미리 갈라 둔다(쓰기 전에 확인, 예외로 배우지 않는다).
async function partitionByCanonicalTwin(rewritable) {
  const renamable = [];
  const blockedByTwin = [];
  for (const item of rewritable) {
    const twin = await ContentEntitlement.collection.findOne({
      userId: item.row.userId,
      profileId: item.row.profileId,
      serviceKey: item.canonical,
      contentKey: item.row.contentKey,
      scope: item.row.scope,
    }, { projection: { _id: 1 } });
    if (twin) blockedByTwin.push(item);
    else renamable.push(item);
  }
  return { renamable, blockedByTwin };
}

/* 별도 리포트: 셸이 contentKey 를 안 실어 보내던 시절(index.html _cdBuildDirectCheckoutPayload)에
   카드로 산 숙요 1년운은 contentKey 에서 **연도가 소실**됐다. serviceKey 를 고쳐도 연도별 조회
   키와 어긋나 계속 잠긴다. 🔴 연도를 추측해 채우지 않는다 — 틀리면 엉뚱한 상품을 열어 준다.
   운영자가 기존 증빙 경로(/api/sukuyo/yearly-fortune/verify-payment 또는 관리자 해금 확인)로
   개별 구제할 수 있도록 목록만 뽑는다. */
async function reportSukuyoYearlyYearlessRows() {
  const rows = await ContentEntitlement.collection
    .find(
      { featureKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY, contentKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY },
      { projection: { userId: 1, profileId: 1, orderId: 1, paymentId: 1, status: 1, source: 1, grantedAt: 1 } },
    )
    .toArray();
  console.log(`SUKYO_YEARLY_YEARLESS ${rows.length}`);
  for (const row of rows.slice(0, SAMPLE_LIMIT)) {
    console.log(`YEARLESS user=${row.userId} profile=${row.profileId} order=${row.orderId || ""} status=${row.status || ""} grantedAt=${row.grantedAt ? new Date(row.grantedAt).toISOString() : ""}`);
  }
  if (rows.length > SAMPLE_LIMIT) console.log(`YEARLESS_TRUNCATED ${rows.length - SAMPLE_LIMIT} more rows not shown`);
  return rows.length;
}

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);

  const { rewritable, skippedUnmapped, scanned } = await collectRewritableRows();
  const { renamable, blockedByTwin } = await partitionByCanonicalTwin(rewritable);

  console.log(`SCANNED_ROWS ${scanned}`);
  console.log(`SKIPPED_UNMAPPED ${skippedUnmapped.length}`);
  console.log(`BLOCKED_BY_CANONICAL_TWIN ${blockedByTwin.length}`);
  console.log(`REWRITABLE ${renamable.length}`);

  const byFeature = new Map();
  for (const item of renamable) {
    const label = `${item.row.featureKey} -> ${item.canonical}`;
    byFeature.set(label, (byFeature.get(label) || 0) + 1);
  }
  for (const [label, count] of [...byFeature.entries()].sort((a, b) => b[1] - a[1]).slice(0, SAMPLE_LIMIT)) {
    console.log(`PLAN ${label} count=${count}`);
  }
  for (const item of blockedByTwin.slice(0, SAMPLE_LIMIT)) {
    console.log(`TWIN user=${item.row.userId} profile=${item.row.profileId} feature=${item.row.featureKey} content=${item.row.contentKey}`);
  }

  await reportSukuyoYearlyYearlessRows();

  if (CHECK || DRY_RUN || !APPLY) {
    // 🔴 --apply 없이는 절대 쓰지 않는다. 인자 없는 실행도 읽기 전용이다.
    console.log(`RESULT ${renamable.length === 0 ? "OK" : "PENDING"}`);
    if (CHECK && renamable.length > 0) process.exitCode = 1;
    return;
  }

  let renamed = 0;
  for (const item of renamable) {
    const result = await ContentEntitlement.collection.updateOne(
      { _id: item.row._id, serviceKey: item.row.serviceKey },
      { $set: { serviceKey: item.canonical, updatedAt: new Date() } },
    );
    renamed += Number(result?.modifiedCount || 0);
  }
  console.log(`RENAMED ${renamed}`);
  console.log("RESULT OK");
}

migrate()
  .catch((error) => {
    console.error(`V2 entitlement serviceKey normalization failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
