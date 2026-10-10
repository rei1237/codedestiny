/**
 * 출생 기반 영구 해금을 "계정 + 생년월일(birthKey)" 행(scope BIRTH)으로 옮긴다.
 *
 * 기본은 읽기 전용(dry-run)이다. 계획은 scripts/lib/birth-scope-unlock-plan.mjs(순수 함수, 단위 테스트 있음).
 *
 *   --dry-run (기본)  원천을 읽어 계획과 수치만 찍는다. 쓰기 없음.
 *   --apply           BIRTH 행을 upsert 로 **복사 생성**하고, 구매 프로필을 모르는 행에 birthScopeExcludedAt 을 표시한다.
 *                     원본 행은 지우거나 고치지 않는다(profileId 는 감사용으로 남는다). 다시 돌려도 같은 결과다.
 *   --create-index    birth_unlock_identity 인덱스를 만든다(중복 사전 스캔 통과 시에만).
 *   --check           인덱스 존재·중복만 확인한다.
 *
 * 알려진 한계: 구매 후 출생 정보를 고쳤는지는 알 수 없다 — 구매 프로필의 **현재** 출생 정보로 birthKey 를 만든다.
 *
 * 🔴 운영 순서: --dry-run 검토 → --apply → --create-index 를 **운영 승격 전에** 끝낸다.
 *    승격 후 읽기 경로는 BIRTH 행만 근거로 보므로, 이 스크립트를 건너뛰면 기존 구매가 잠긴다.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement, Payment, PointHistory, ProfileCard, User } from "../../worker/lib/models.js";
import {
  birthScopedFeatureKeyVariants,
  canonicalBirthFeatureKey,
  pairPointRefunds,
  planBirthScopeMigration,
} from "../lib/birth-scope-unlock-plan.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const CREATE_INDEX = process.argv.includes("--create-index");
const CHECK = process.argv.includes("--check");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

// worker/lib/models.js 의 선언과 일치해야 한다.
const spec = { userId: 1, birthKey: 1, serviceKey: 1, contentKey: 1 };
const options = {
  unique: true,
  name: "birth_unlock_identity",
  partialFilterExpression: { scope: "BIRTH", birthKey: { $type: "string" } },
};

const PAID_PAYMENT_STATUSES = ["paid", "success", "fulfilled"];
const SAMPLE_LIMIT = 20;

/** 출생 기반 키의 모든 표기(정본·`_`/`-`·별칭) + 연도 접미사(`키:2027`)를 잡는 $in 값. */
function featureKeyMatchers() {
  const variants = birthScopedFeatureKeyVariants();
  const escaped = variants.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return [...variants, new RegExp(`^(?:${escaped.join("|")}):`)];
}

// 정본과 다른 표기로 저장된 원천 수 — 예상 밖 표기를 dry-run 에서 확인한다.
const variantKeysSeen = {};
let pointRefundStats = null;
function noteVariant(raw) {
  const key = str(raw);
  const canonical = canonicalBirthFeatureKey(key);
  if (canonical && canonical !== key) variantKeysSeen[key] = (variantKeysSeen[key] || 0) + 1;
}

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

async function loadSources() {
  const featureKeys = featureKeyMatchers();
  const entitlements = await ContentEntitlement.find({
    status: "ACTIVE",
    scope: { $ne: "BIRTH" },
  }).lean();

  // USER 행의 구매 프로필은 결제 증거에서만 알 수 있다.
  const userRowOrderIds = entitlements
    .filter((row) => row.scope === "USER" || row.profileId === "__user__")
    .flatMap((row) => [row.orderId, row.paymentId, row.evidenceId].map(str).filter(Boolean));
  const evidenceProfileByOrderId = new Map();
  if (userRowOrderIds.length) {
    const orderObjectIds = userRowOrderIds.map(toObjectId).filter(Boolean);
    const payments = await Payment.find({
      $or: [
        { merchantUid: { $in: userRowOrderIds } },
        { impUid: { $in: userRowOrderIds } },
        { requestId: { $in: userRowOrderIds } },
        ...(orderObjectIds.length ? [{ _id: { $in: orderObjectIds } }] : []),
      ],
    }).select("merchantUid impUid requestId pricingSnapshot metadata").lean();
    for (const payment of payments) {
      const profileId = profileIdFrom(payment.pricingSnapshot, payment.metadata);
      if (!profileId) continue;
      for (const id of [payment._id, payment.merchantUid, payment.impUid, payment.requestId].map(str).filter(Boolean)) {
        evidenceProfileByOrderId.set(id, profileId);
      }
    }
  }
  for (const row of entitlements) {
    if (!(row.scope === "USER" || row.profileId === "__user__")) continue;
    const orderId = [row.orderId, row.paymentId, row.evidenceId].map(str).find((id) => evidenceProfileByOrderId.has(id));
    if (orderId) row.evidenceProfileId = evidenceProfileByOrderId.get(orderId);
  }

  const evidence = [];
  const paidPayments = await Payment.find({
    featureKey: { $in: featureKeys },
    status: { $in: PAID_PAYMENT_STATUSES },
  }).select("userId featureKey merchantUid impUid pricingSnapshot metadata paidAt createdAt").lean();
  for (const payment of paidPayments) {
    noteVariant(payment.featureKey);
    evidence.push({
      userId: str(payment.userId),
      featureKey: str(payment.featureKey),
      profileId: profileIdFrom(payment.pricingSnapshot, payment.metadata),
      serviceKey: str(payment.pricingSnapshot?.serviceKey),
      contentKey: str(payment.pricingSnapshot?.contentKey),
      orderId: str(payment.merchantUid || payment.impUid || payment._id),
      at: payment.paidAt || payment.createdAt,
    });
  }

  const pointRows = await PointHistory.find({
    kind: { $in: ["deduct", "refund"] },
    featureKey: { $in: featureKeys },
  }).select("_id userId kind featureKey metadata createdAt").lean();
  // 환불은 짝지은 차감만 근거에서 뺀다 — 같은 키의 다른 구매까지 지우지 않는다.
  const pointByKind = (kind) => pointRows
    .filter((row) => row.kind === kind)
    .map((row) => ({ ...row, _id: str(row._id), userId: str(row.userId), rawFeatureKey: str(row.featureKey), featureKey: canonicalBirthFeatureKey(row.featureKey) }));
  const paired = pairPointRefunds(pointByKind("deduct"), pointByKind("refund"));
  pointRefundStats = paired.stats;
  for (const row of paired.kept) {
    noteVariant(row.rawFeatureKey);
    evidence.push({
      userId: str(row.userId),
      featureKey: str(row.featureKey),
      profileId: profileIdFrom(row.metadata),
      orderId: str(row.metadata?.requestId || row._id),
      at: row.createdAt,
    });
  }

  const users = await User.find({
    $or: [{ unlockedFeatures: { $in: featureKeys } }, { paidFeatures: { $in: featureKeys } }],
  }).select("_id unlockedFeatures paidFeatures").lean();

  const userIds = new Set([
    ...entitlements.map((row) => str(row.userId)),
    ...evidence.map((item) => item.userId),
  ]);
  const userObjectIds = Array.from(userIds).map(toObjectId).filter(Boolean);
  const profiles = userObjectIds.length
    ? (await ProfileCard.find({ userId: { $in: userObjectIds } }).select("userId profileId gender birth").lean())
      .map((card) => ({ ...card, userId: str(card.userId) }))
    : [];

  return {
    entitlements,
    evidence,
    users: users.map((user) => ({ ...user, _id: str(user._id) })),
    profiles,
  };
}

async function applyPlan(plan) {
  const now = new Date();
  let upserted = 0;
  let matched = 0;
  for (const { filter, doc } of plan.creates) {
    const { sourceEntitlementIds, mergedOrderIds, ...insertFields } = doc;
    const result = await ContentEntitlement.collection.updateOne(
      filter,
      {
        $setOnInsert: { ...insertFields, createdAt: now, updatedAt: now },
        $addToSet: {
          sourceEntitlementIds: { $each: sourceEntitlementIds },
          mergedOrderIds: { $each: mergedOrderIds },
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) upserted += 1;
    else matched += 1;
  }
  console.log(`APPLIED_BIRTH_ROWS upserted=${upserted} alreadyPresent=${matched}`);

  const byReason = new Map();
  for (const item of plan.excludes) {
    const id = toObjectId(item._id);
    if (!id) continue;
    if (!byReason.has(item.reason)) byReason.set(item.reason, []);
    byReason.get(item.reason).push(id);
  }
  for (const [reason, ids] of byReason) {
    const result = await ContentEntitlement.collection.updateMany(
      { _id: { $in: ids }, birthScopeExcludedAt: { $exists: false } },
      { $set: { birthScopeExcludedAt: now, birthScopeExcludedReason: reason, updatedAt: now } },
    );
    console.log(`MARKED_EXCLUDED ${reason} ${result.modifiedCount}`);
  }
}

async function scanIndexDuplicates() {
  const groups = await ContentEntitlement.collection.aggregate([
    { $match: options.partialFilterExpression },
    {
      $group: {
        _id: { userId: "$userId", birthKey: "$birthKey", serviceKey: "$serviceKey", contentKey: "$contentKey" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 200 },
  ], { allowDiskUse: true }).toArray();
  console.log(`INDEX_DUPLICATE_GROUPS ${groups.length}`);
  for (const group of groups.slice(0, SAMPLE_LIMIT)) {
    const { userId, birthKey, serviceKey, contentKey } = group._id;
    console.log(`DUP ${userId} ${birthKey} ${serviceKey} ${contentKey} count=${group.count}`);
  }
  return groups.length;
}

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);

  if (CHECK || CREATE_INDEX) {
    const indexes = await ContentEntitlement.collection.indexes();
    const present = indexes.some((index) => index.name === options.name);
    console.log(`${present ? "OK" : "MISSING"} ${options.name}`);
    const duplicates = await scanIndexDuplicates();
    if (duplicates > 0) {
      console.log("RESULT DUPLICATES");
      process.exitCode = 1;
      return;
    }
    if (CHECK || present) {
      console.log(present ? "RESULT OK" : "RESULT MISSING_INDEX");
      if (CHECK && !present) process.exitCode = 1;
      return;
    }
    await ContentEntitlement.collection.createIndex(spec, options);
    console.log(`CREATED ${options.name}`);
    console.log("RESULT OK");
    return;
  }

  const sources = await loadSources();
  const plan = planBirthScopeMigration(sources);
  console.log(`MODE ${APPLY ? "APPLY" : "DRY_RUN"}`);
  for (const [key, value] of Object.entries(plan.stats)) {
    console.log(`STAT ${key} ${typeof value === "object" ? JSON.stringify(value) : value}`);
  }
  console.log(`STAT pointRefundPairing ${JSON.stringify(pointRefundStats)}`);
  console.log(`STAT variantKeysSeen ${JSON.stringify(variantKeysSeen)}`);
  for (const item of plan.creates.slice(0, SAMPLE_LIMIT)) {
    console.log(`PLAN_BIRTH ${item.filter.userId} ${item.doc.featureKey} ${item.filter.contentKey} from=${item.purchaseProfileIds.join(",")} sources=${item.doc.sourceEntitlementIds.length}`);
  }
  for (const item of plan.excludes.slice(0, SAMPLE_LIMIT)) {
    console.log(`PLAN_EXCLUDE ${item.userId} ${item._id} ${item.reason}`);
  }
  if (!APPLY) {
    console.log("RESULT DRY_RUN (no writes). Re-run with --apply after review.");
    return;
  }
  await applyPlan(plan);
  console.log("RESULT APPLIED");
}

migrate()
  .catch((error) => {
    console.error(`Birth scope unlock migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
