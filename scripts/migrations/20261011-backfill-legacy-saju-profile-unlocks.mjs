#!/usr/bin/env node
/**
 * 대운·종합 사주를 결제(코인 차감·결제)했는데 해금 행이 없어 잠긴 고객에게 PROFILE 해금 행을 만든다.
 * 계획은 scripts/lib/legacy-saju-profile-unlock-plan.mjs(순수 함수, 단위 테스트 있음).
 *
 *   --dry-run (기본)  계획과 수치만 찍는다. 쓰기 없음.
 *   --apply           PROFILE 행을 $setOnInsert upsert 로 만든다. 기존 행은 고치지 않는다. 다시 돌려도 같은 결과다.
 *   --check           남은 쓰기 후보 수를 센다. 0 이 아니면 exit 1.
 *
 * orderId 는 출생 기반 이관(20261010-birth-scope-unlocks.mjs)과 같은 값(차감 requestId || _id, 결제 merchantUid)이라
 * 이관 계획기가 같은 주문으로 묶어 BIRTH 행으로 복사한다.
 */
import { config } from "dotenv";
import { resolvePaidContentUnlockTarget } from "../../worker/lib/content-unlocks.js";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement, Payment, PointHistory, ProfileCard } from "../../worker/lib/models.js";
import {
  birthScopedFeatureKeyVariants,
  canonicalBirthFeatureKey,
  pairPointRefunds,
} from "../lib/birth-scope-unlock-plan.mjs";
import {
  LEGACY_SAJU_FEATURE_KEYS,
  hashUserId,
  planLegacySajuProfileUnlocks,
} from "../lib/legacy-saju-profile-unlock-plan.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const LEGACY_SAJU_CONTENT_KEYS = LEGACY_SAJU_FEATURE_KEYS.map((featureKey) => resolvePaidContentUnlockTarget({ featureKey }).contentKey);
const PAID_PAYMENT_STATUSES =["paid", "success", "fulfilled"];
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

function str(value) {
  return String(value ?? "").trim();
}

function profileIdFrom(...sources) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const value = str(source.profileId || source.selectedProfileId);
    if (value && value !== "__user__") return value.slice(0, 80);
  }
  return "";
}

function toObjectId(value) {
  const text = str(value);
  return mongoose.isValidObjectId(text) ? new mongoose.Types.ObjectId(text) : null;
}

/** 대운·종합의 모든 표기(정본·`_`/`-`·별칭). */
function featureKeyVariants() {
  return birthScopedFeatureKeyVariants().filter((key) => LEGACY_SAJU_FEATURE_KEYS.includes(canonicalBirthFeatureKey(key)));
}

async function loadSources() {
  const featureKeys = featureKeyVariants();
  const evidence = [];

  const payments = await Payment.find({
    featureKey: { $in: featureKeys },
    status: { $in: PAID_PAYMENT_STATUSES },
  }).select("userId featureKey merchantUid impUid paymentAmount coinPrice expectedChargedPoints pricingSnapshot metadata paidAt createdAt").lean();
  for (const payment of payments) {
    evidence.push({
      userId: str(payment.userId),
      featureKey: canonicalBirthFeatureKey(payment.featureKey),
      profileId: profileIdFrom(payment.pricingSnapshot, payment.metadata),
      orderId: str(payment.merchantUid || payment.impUid || payment._id),
      sourceKind: "payment",
      sourceId: str(payment._id),
      at: payment.paidAt || payment.createdAt,
      priceKRW: payment.paymentAmount,
      priceCoins: payment.coinPrice || payment.expectedChargedPoints,
    });
  }

  const pointRows = await PointHistory.find({
    kind: { $in: ["deduct", "refund"] },
    featureKey: { $in: featureKeys },
  }).select("_id userId kind featureKey delta metadata createdAt").lean();
  const pointByKind = (kind) => pointRows
    .filter((row) => row.kind === kind)
    .map((row) => ({ ...row, _id: str(row._id), userId: str(row.userId), featureKey: canonicalBirthFeatureKey(row.featureKey) }));
  const paired = pairPointRefunds(pointByKind("deduct"), pointByKind("refund"));
  for (const row of paired.kept) {
    evidence.push({
      userId: row.userId,
      featureKey: row.featureKey,
      profileId: profileIdFrom(row.metadata),
      orderId: str(row.metadata?.requestId || row._id),
      sourceKind: "point_history",
      sourceId: row._id,
      at: row.createdAt,
      priceCoins: Math.abs(Number(row.delta || 0)),
    });
  }

  const userIds = Array.from(new Set(evidence.map((item) => item.userId).filter(Boolean)));
  const entitlements = userIds.length
    ? await ContentEntitlement.find({
      userId: { $in: userIds },
      status: "ACTIVE",
      // 옛 행은 featureKey 없이 contentKey 만 있다.
      $or: [
        { featureKey: { $in: LEGACY_SAJU_FEATURE_KEYS } },
        { contentKey: { $in: LEGACY_SAJU_CONTENT_KEYS } },
      ],
    }).select("userId profileId scope featureKey contentKey status expiresAt orderId paymentId evidenceId").lean()
    : [];
  const userObjectIds = userIds.map(toObjectId).filter(Boolean);
  // ProfileCard.userId 는 ObjectId 이고 엔타이틀먼트 userId 는 문자열이다 — 두 형태를 다 찾는다.
  const profiles = userIds.length
    ? (await ProfileCard.find({ userId: { $in: [...userObjectIds, ...userIds] } }).select("userId profileId").lean())
      .map((card) => ({ userId: str(card.userId), profileId: str(card.profileId) }))
    : [];

  return { evidence, entitlements, profiles, pointRefundStats: paired.stats };
}

async function applyWrites(writes) {
  const now = new Date();
  let inserted = 0;
  let present = 0;
  for (const { filter, doc } of writes) {
    const result = await ContentEntitlement.collection.updateOne(
      filter,
      { $setOnInsert: { ...doc, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
    else present += 1;
    console.log(`APPLIED user=${hashUserId(filter.userId)} ${doc.featureKey} inserted=${Boolean(result.upsertedCount)}`);
  }
  console.log(`APPLIED_PROFILE_ROWS inserted=${inserted} alreadyPresent=${present}`);
}

async function main() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);
  const { pointRefundStats, ...sources } = await loadSources();
  const plan = planLegacySajuProfileUnlocks(sources);
  console.log(`MODE ${APPLY ? "APPLY" : CHECK ? "CHECK" : "DRY_RUN"}`);
  for (const [key, value] of Object.entries(plan.stats)) {
    console.log(`STAT ${key} ${typeof value === "object" ? JSON.stringify(value) : value}`);
  }
  console.log(`STAT pointRefundPairing ${JSON.stringify(pointRefundStats)}`);
  for (const item of plan.writes) {
    console.log(`PLAN_PROFILE user=${hashUserId(item.filter.userId)} ${item.doc.featureKey} rule=${item.rule} at=${item.doc.unlockedAt.toISOString()}`);
  }
  for (const item of plan.reportOnly) {
    console.log(`REPORT_ONLY user=${hashUserId(item.userId)} ${item.featureKey} cards=${item.cardCount} source=${item.sourceKind}`);
  }
  if (CHECK) {
    console.log(plan.writes.length ? `RESULT PENDING ${plan.writes.length}` : "RESULT OK");
    if (plan.writes.length) process.exitCode = 1;
    return;
  }
  if (!APPLY) {
    console.log("RESULT DRY_RUN (no writes). Re-run with --apply after review.");
    return;
  }
  await applyWrites(plan.writes);
  console.log("RESULT APPLIED");
}

main()
  .catch((error) => {
    console.error(`Legacy saju profile unlock backfill failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
