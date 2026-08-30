/**
 * 🔴 읽기 전용. 요청 경로 쿼리를 executionStats explain 으로 돌려 COLLSCAN 여부를 실측한다.
 *
 * 이 파일은 explain · $indexStats · indexes() · estimatedDocumentCount · 표본 findOne 만 부른다.
 * 인덱스 생성·드롭·갱신·삭제 계열 API 이름은 문자열로도 존재하지 않는다(아래 자가 단언).
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 08-24 의 $indexStats 실측(docs/db-index-usage-2026-08-24.md)은 "어느 인덱스가 쓰이나"를 답했지만
 * "어느 쿼리가 인덱스를 못 타나"는 답하지 않는다. 정적 분석으로 고른 후보(계획 db-wild-beaver 1단계 표)는
 * 추정이라, 인덱스를 **만들기 전에** winningPlan 으로 확정한다. 문서 수가 작은 컬렉션은 COLLSCAN 이
 * 정상이므로 결과는 docsExamined/nReturned 와 문서 수를 함께 읽는다.
 *
 * 표본 값(userId·profileId 등)은 pointhistories 에서 실제 문서 하나를 읽어 쓴다 — 가짜 값이면
 * nReturned=0 이라 docsExamined 가 인덱스 유무를 못 가른다.
 *
 * 실행: MONGO_URI=... node scripts/audit-mongo-query-plans.mjs   (출력은 마크다운)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";

config({ path: ".env.local" });
config({ path: ".env" });

// 자가 단언: 쓰기 계열 API 이름이 이 파일에 없어야 한다. 있으면 실행 전에 죽는다.
{
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const forbidden = ["create" + "Index", "drop" + "Index", "update" + "One", "update" + "Many", "delete" + "One", "delete" + "Many", "insert" + "One", "insert" + "Many", "bulk" + "Write", "find" + "OneAndUpdate", "find" + "OneAndDelete"];
  const hit = forbidden.find((name) => self.includes(name));
  if (hit) throw new Error(`read-only audit contains a write API name: ${hit}`);
}

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};

const BACKFILL_SUCCESS = ["success", "paid", "fulfilled"]; // worker/routes/access.js:58
const LEVEL_REWARD_PAID = ["paid", "success", "fulfilled"]; // worker/routes/rpg.js:136
const PUBLIC_INSIGHT_STATUS = (now) => ({ $or: [{ status: "published" }, { status: "scheduled", publishedAt: { $lte: now } }] }); // insights.js:280
const INSIGHT_TYPE_OR = { $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }] };

/** 코드에서 그대로 옮긴 쿼리 모양. sample 은 실제 문서에서 채운다. */
function buildCases(sample) {
  const now = new Date();
  const kstMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 9 * 3600 * 1000);
  const { userId, profileId, featureKey, referralCode } = sample;
  const aliases = [featureKey, `${featureKey}-alias`];
  const profileOr = [{ "metadata.profileId": profileId }, { "metadata.selectedProfileId": profileId }];
  return [
    { id: "auth.js:186", coll: "users", op: "find", filter: { referralCode }, limit: 1 },
    { id: "access.js:259", coll: "pointhistories", op: "find", filter: { userId, kind: "deduct", featureKey: { $in: aliases }, $or: profileOr }, sort: { createdAt: -1 }, limit: 20 },
    {
      id: "access.js:281", coll: "payments", op: "find", limit: 1,
      filter: {
        userId, paymentType: "digital_content", status: { $in: BACKFILL_SUCCESS },
        $and: [
          { $or: [{ "pricingSnapshot.profileId": profileId }, { "pricingSnapshot.selectedProfileId": profileId }] },
          { $or: [{ featureKey: { $in: aliases } }, { contentKey: { $in: aliases } }, { contentId: { $in: aliases } }, { "pricingSnapshot.featureKey": { $in: aliases } }, { "pricingSnapshot.contentKey": { $in: aliases } }, { "pricingSnapshot.contentId": { $in: aliases } }] },
        ],
      },
    },
    {
      id: "access.js:358", coll: "payments", op: "find", sort: { paidAt: -1, updatedAt: -1, createdAt: -1 },
      filter: {
        userId, paymentType: "digital_content", status: { $in: BACKFILL_SUCCESS },
        $or: [{ _id: { $in: [] } }, { $and: [{ $or: [{ "pricingSnapshot.profileId": profileId }, { "pricingSnapshot.selectedProfileId": profileId }] }, { $or: [{ featureKey: { $in: aliases } }, { contentKey: { $in: aliases } }] }] }],
      },
    },
    { id: "fortune.js:2342", coll: "pointhistories", op: "distinct", key: "featureKey", filter: { userId, kind: "deduct", featureKey: { $in: aliases }, $or: profileOr } },
    { id: "fortune.js:2360", coll: "pointhistories", op: "distinct", key: "featureKey", filter: { userId, kind: "deduct", featureKey: { $in: aliases } } },
    { id: "fortune.js:5989", coll: "pointhistories", op: "count", filter: { userId, kind: "share_reward", createdAt: { $gte: kstMidnight } } },
    {
      id: "billing.js:876 (_id 점조회 — 계획 표의 COLLSCAN 후보 지목은 오류)", coll: "users", op: "find", limit: 1,
      filter: { _id: userId, $and: [{ $or: [{ "profileSubscription.tier": { $in: ["basic"] } }, { plan: { $in: ["basic"] } }] }, { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }] }] },
    },
    { id: "insights.js:364", coll: "insights", op: "find", filter: INSIGHT_TYPE_OR, limit: 6000 },
    { id: "insights.js:496", coll: "insights", op: "find", filter: { $and: [PUBLIC_INSIGHT_STATUS(now), INSIGHT_TYPE_OR] }, sort: { publishedAt: -1, updatedAt: -1, createdAt: -1 } },
    { id: "insights.js:540", coll: "insights", op: "find", filter: { $and: [PUBLIC_INSIGHT_STATUS(now), INSIGHT_TYPE_OR, { $or: [{ tags: { $in: ["사주"] } }] }] } },
    { id: "rpg.js:897", coll: "payments", op: "find", filter: { userId, status: { $in: LEVEL_REWARD_PAID } }, sort: { createdAt: -1 }, limit: 60 },
    { id: "payment-reconcile-task.js:74 (cron)", coll: "payments", op: "find", filter: { status: { $in: ["pending", "processing"] }, createdAt: { $lte: now, $gte: new Date(now.getTime() - 7 * 86400000) }, $or: [{ "metadata.reconcile.attempts": { $exists: false } }, { "metadata.reconcile.attempts": { $lt: 5 } }] } },
    { id: "daily-fortune-task.js:456 (cron)", coll: "dailyfortunesubscriptions", op: "find", filter: { isActive: true, subDaily: true } },
    { id: "monthly-credit-expiry-task.js:102 (cron)", coll: "users", op: "find", filter: { "profileSubscription.membershipCreditLots": { $elemMatch: { expiresAt: { $lte: now }, remaining: { $gt: 0 } } } } },
    { id: "monthly-credit-store.js:12 (cron)", coll: "users", op: "find", filter: { $or: [{ "profileSubscription.membershipCreditLotsVersion": 0 }, { "profileSubscription.membershipCreditLotsVersion": { $exists: false } }] } },
  ];
}

/** winningPlan 트리에서 스테이지 이름과 쓰인 인덱스를 모은다. */
function summarizePlan(plan, acc = { stages: [], indexes: [] }) {
  if (!plan || typeof plan !== "object") return acc;
  if (plan.stage) acc.stages.push(plan.stage);
  if (plan.indexName) acc.indexes.push(plan.indexName);
  for (const child of [plan.inputStage, ...(plan.inputStages || []), plan.queryPlan]) summarizePlan(child, acc);
  return acc;
}

async function explainCase(db, c) {
  const coll = db.collection(c.coll);
  let out;
  if (c.op === "find") {
    let cursor = coll.find(c.filter);
    if (c.sort) cursor = cursor.sort(c.sort);
    if (c.limit) cursor = cursor.limit(c.limit);
    out = await cursor.explain("executionStats");
  } else if (c.op === "distinct") {
    out = await db.command({ explain: { distinct: c.coll, key: c.key, query: c.filter }, verbosity: "executionStats" });
  } else if (c.op === "count") {
    out = await db.command({ explain: { count: c.coll, query: c.filter }, verbosity: "executionStats" });
  }
  const qp = out.queryPlanner || {};
  const es = out.executionStats || {};
  const { stages, indexes } = summarizePlan(qp.winningPlan);
  return {
    stages: Array.from(new Set(stages)).join(">"),
    indexes: Array.from(new Set(indexes)).join(",") || "-",
    collscan: stages.includes("COLLSCAN"),
    nReturned: es.nReturned ?? "?",
    keysExamined: es.totalKeysExamined ?? "?",
    docsExamined: es.totalDocsExamined ?? "?",
    ms: es.executionTimeMillis ?? "?",
  };
}

async function main() {
  if (!env.MONGO_URI) throw new Error("MONGO_URI is required");
  await connectDb(env);
  const db = mongoose.connection.db;
  console.log(`> db=\`${db.databaseName}\` · ${new Date().toISOString()} · 읽기 전용 explain(executionStats)\n`);

  const ph = db.collection("pointhistories");
  const probe = await ph.findOne({ kind: "deduct", "metadata.profileId": { $exists: true } }, { projection: { userId: 1, featureKey: 1, "metadata.profileId": 1 } });
  const user = probe ? await db.collection("users").findOne({ _id: probe.userId }, { projection: { referralCode: 1 } }) : null;
  const sample = {
    userId: probe?.userId ?? new mongoose.Types.ObjectId(),
    profileId: probe?.metadata?.profileId ?? "no-sample-profile",
    featureKey: probe?.featureKey ?? "flower-fc",
    referralCode: user?.referralCode ?? "NOSAMPLE",
  };
  console.log(`표본: pointhistories.deduct 문서 ${probe ? "있음" : "없음"} · referralCode ${user?.referralCode ? "있음" : "없음"}\n`);

  const cases = buildCases(sample);
  const colls = Array.from(new Set(cases.map((c) => c.coll)));
  console.log("## 컬렉션 규모와 인덱스\n");
  console.log("| 컬렉션 | 문서 수 | 인덱스 키 (ops, 08-24 이후 관측 창 시작) |\n|---|---:|---|");
  for (const name of colls) {
    const coll = db.collection(name);
    const [count, indexes, stats] = await Promise.all([
      coll.estimatedDocumentCount(),
      coll.indexes().catch(() => []),
      coll.aggregate([{ $indexStats: {} }]).toArray().catch(() => []),
    ]);
    const opsBy = new Map(stats.map((s) => [s.name, `${s.accesses?.ops ?? "?"}, ${s.accesses?.since ? new Date(s.accesses.since).toISOString().slice(0, 10) : "?"}`]));
    const list = indexes.map((i) => `\`${JSON.stringify(i.key)}\` (${opsBy.get(i.name) ?? "no stats"})`).join("<br>");
    console.log(`| ${name} | ${count} | ${list} |`);
  }

  console.log("\n## 쿼리별 winningPlan\n");
  console.log("| 위치 | 컬렉션·op | 스테이지 | 인덱스 | nReturned | keys | docs | ms | 판정 |\n|---|---|---|---|---:|---:|---:|---:|---|");
  for (const c of cases) {
    try {
      const r = await explainCase(db, c);
      const verdict = r.collscan ? "🔴 COLLSCAN" : r.docsExamined > 0 && r.nReturned === 0 ? "🟡 IXSCAN(표본 0건)" : "✅ IXSCAN";
      console.log(`| ${c.id} | ${c.coll}·${c.op} | ${r.stages} | ${r.indexes} | ${r.nReturned} | ${r.keysExamined} | ${r.docsExamined} | ${r.ms} | ${verdict} |`);
    } catch (error) {
      console.log(`| ${c.id} | ${c.coll}·${c.op} | ERROR | - | - | - | - | - | ${error.message} |`);
    }
  }
}

main()
  .catch((error) => {
    console.error(`audit failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
