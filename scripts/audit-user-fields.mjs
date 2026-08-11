/**
 * users 컬렉션 필드 실사용 감사 — 읽기 전용(쓰기 없음).
 *
 * 스키마 선언과 무관하게 "실제 문서에 어떤 키가 존재하고, 그중 몇 개가 기본값이 아닌
 * 의미 있는 값인가"를 집계한다. present ≫ meaningful 인 필드가 곧 삭제 후보 근거다.
 * 스키마에 없는 유령 필드(네이티브 드라이버로 쓰인 값)도 $objectToArray 키 센서스로 잡는다.
 *
 * 🔴 개인정보 무출력 원칙: 이 스크립트는 어떤 문서의 값도 출력하지 않는다. 카운트·타입·
 *    형식 분류만 낸다. PII_PATHS 에 든 경로는 분포 집계 대상에서도 제외한다.
 *    (전화번호는 값이 아니라 "평문 / 암호화 봉투 / 빈값" 개수만 센다 — 암호화 마이그레이션
 *     진행률 지표. scripts/migrate-encrypt-user-phone.mjs 참고)
 *
 * 이 스크립트는 아무것도 쓰지 않는다. countDocuments/aggregate 외의 연산을 넣지 말 것.
 *
 * 실행:
 *   node scripts/audit-user-fields.mjs [--json] [--out <path>] [--max-time-ms 120000]
 *
 * --out 은 파일로 직접 쓴다. worker/lib/db.js 의 연결 로그가 stdout 으로 나가서
 * `--json > file` 리다이렉트가 JSON 을 오염시키기 때문이다(DB 쓰기와 무관).
 */

import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";

// quiet: dotenv 배너는 stdout 으로 나가 --json 출력을 오염시킨다.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const OUT_PATH = String(argValue("--out", "") || "");
const AS_JSON = process.argv.includes("--json") || Boolean(OUT_PATH);
const MAX_TIME_MS = Math.max(1000, Math.floor(Number(argValue("--max-time-ms", 120000))) || 120000);
const AGG_OPTIONS = { maxTimeMS: MAX_TIME_MS, allowDiskUse: false };

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
  MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
  MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
  MONGO_WORKER_CONNECT_GUARD_MS: process.env.MONGO_WORKER_CONNECT_GUARD_MS || "15000",
  MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

/** 값을 절대 출력하지 않는 경로. 분포(distribution) 집계에서도 제외한다. */
const PII_PATHS = new Set([
  "email",
  "name",
  "phoneNumber",
  "passwordHash",
  "profileImage",
  "birthDate",
  "birthTime",
  "twoFA.totpSecret",
  "twoFA.backupCodesHash",
  "adminRefreshTokenHash",
  "socialAccounts.google.id",
  "socialAccounts.naver.id",
  "socialAccounts.kakao.id",
  "guardianConsent.guardianEmail",
  "guardianConsent.consentIp",
  "destinyProfiles",
  "destinyProfilesCurrentId",
  "destinyProfilesLockedCurrentId",
  "tamagotchi",
  "profileSubscription.customerUid",
  "profileSubscription.lastPassOrderId",
  "recentConsumeRequestIds",
]);

/** 키 센서스를 재귀로 돌 하위 객체 경로. 스키마상 object 인 것만 명시한다. */
const NESTED_ROOTS = [
  "licenses",
  "localAuth",
  "legalConsents",
  "guardianConsent",
  "socialAccounts",
  "socialAccounts.google",
  "socialAccounts.naver",
  "socialAccounts.kakao",
  "twoFA",
  "profileSubscription",
  "monthlySubscription",
];

/** 배열 길이 통계를 낼 경로 — 문서 성장 위험 지점. */
const ARRAY_PATHS = [
  "recentConsumeRequestIds",
  "unlockedFeatures",
  "paidFeatures",
  "destinyProfiles",
  "twoFA.backupCodesHash",
  "profileSubscription.membershipCreditLots",
];

/** 값 분포를 낼 저카디널리티 경로 (PII 아님). */
const DISTRIBUTION_PATHS = [
  "status",
  "role",
  "gender",
  "localAuth.enabled",
  "guardianConsent.status",
  "guardianConsent.required",
  "twoFA.enabled",
  "has_started_paid_service",
  "licenses.status",
  "monthlySubscription.active",
  "monthlySubscription.status",
  "monthlySubscription.tier",
  "profileSubscription.tier",
  "profileSubscription.passTier",
  "profileSubscription.source",
  "profileSubscription.productType",
  "profileSubscription.lastBillingStatus",
  "profileSubscription.paymentMethod",
  "profileSubscription.cancelAtPeriodEnd",
  "profileSubscription.legacyCoinCreditSeeded",
  "legalConsents.termsVersion",
  "legalConsents.privacyVersion",
];

function safeKey(path) {
  return path.replace(/[^A-Za-z0-9]/g, "_");
}

/**
 * "의미 있는 값"의 정의: 없음/null/빈문자열/0/빈배열/빈객체가 아닌 것.
 * 모두 스키마 기본값이므로, 이 판정이 false 인 문서는 그 필드를 실제로 쓴 적이 없다.
 */
function meaningfulExpr(path) {
  const ref = `$${path}`;
  return {
    $let: {
      vars: { v: ref, t: { $type: ref } },
      in: {
        $switch: {
          branches: [
            { case: { $in: ["$$t", ["missing", "null"]] }, then: false },
            { case: { $eq: ["$$t", "string"] }, then: { $gt: [{ $strLenCP: "$$v" }, 0] } },
            { case: { $in: ["$$t", ["int", "long", "double", "decimal"]] }, then: { $ne: ["$$v", 0] } },
            { case: { $eq: ["$$t", "array"] }, then: { $gt: [{ $size: "$$v" }, 0] } },
            { case: { $eq: ["$$t", "bool"] }, then: "$$v" },
            { case: { $eq: ["$$t", "object"] }, then: { $gt: [{ $size: { $objectToArray: "$$v" } }, 0] } },
          ],
          default: true,
        },
      },
    },
  };
}

/** 최상위 또는 하위 객체의 실제 키 목록 + 타입 (스키마 미선언 유령 필드 포함). */
async function keyCensus(coll, rootPath) {
  const target = rootPath ? `$${rootPath}` : "$$ROOT";
  const pipeline = [];
  if (rootPath) pipeline.push({ $match: { [rootPath]: { $type: "object" } } });
  pipeline.push(
    { $project: { k: { $objectToArray: target } } },
    { $unwind: "$k" },
    { $group: { _id: "$k.k", present: { $sum: 1 }, types: { $addToSet: { $type: "$k.v" } } } },
    { $sort: { _id: 1 } },
  );
  const rows = await coll.aggregate(pipeline, AGG_OPTIONS).toArray();
  return rows.map((row) => ({
    path: rootPath ? `${rootPath}.${row._id}` : String(row._id),
    key: String(row._id),
    present: Number(row.present || 0),
    types: (row.types || []).map(String).sort(),
  }));
}

/** 경로별 present / meaningful 카운트. 누산기가 많아지므로 배치로 나눠 돈다. */
async function meaningfulCounts(coll, paths, batchSize = 45) {
  const result = new Map();
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const group = { _id: null, total: { $sum: 1 } };
    for (const path of batch) {
      const key = safeKey(path);
      group[`present_${key}`] = {
        $sum: { $cond: [{ $eq: [{ $type: `$${path}` }, "missing"] }, 0, 1] },
      };
      group[`meaningful_${key}`] = { $sum: { $cond: [meaningfulExpr(path), 1, 0] } };
    }
    const [row] = await coll.aggregate([{ $group: group }], AGG_OPTIONS).toArray();
    for (const path of batch) {
      const key = safeKey(path);
      result.set(path, {
        present: Number(row?.[`present_${key}`] || 0),
        meaningful: Number(row?.[`meaningful_${key}`] || 0),
      });
    }
  }
  return result;
}

async function arrayStats(coll, paths) {
  const group = { _id: null };
  for (const path of paths) {
    const key = safeKey(path);
    const size = arraySize(path);
    group[`max_${key}`] = { $max: size };
    group[`avg_${key}`] = { $avg: size };
    group[`nonEmpty_${key}`] = { $sum: { $cond: [{ $gt: [size, 0] }, 1, 0] } };
  }
  const [row] = await coll.aggregate([{ $group: group }], AGG_OPTIONS).toArray();
  return paths.map((path) => {
    const key = safeKey(path);
    return {
      path,
      maxLength: Number(row?.[`max_${key}`] || 0),
      avgLength: Number((row?.[`avg_${key}`] || 0).toFixed?.(2) ?? 0),
      nonEmptyDocs: Number(row?.[`nonEmpty_${key}`] || 0),
    };
  });
}

async function distributions(coll, paths) {
  const out = [];
  for (const path of paths) {
    const rows = await coll
      .aggregate([
        { $group: { _id: `$${path}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ], AGG_OPTIONS)
      .toArray();
    out.push({
      path,
      values: rows.map((row) => ({ value: row._id === undefined ? "(missing)" : row._id, count: Number(row.count || 0) })),
    });
  }
  return out;
}

/** 문자열 비교는 타입 오염(레거시 문서의 숫자/불리언)에 터지지 않도록 항상 문자열로 좁힌다. */
function asString(path) {
  return { $cond: [{ $eq: [{ $type: `$${path}` }, "string"] }, `$${path}`, ""] };
}

function nonEmptyString(path) {
  return { $ne: [asString(path), ""] };
}

function arraySize(path) {
  return { $cond: [{ $isArray: `$${path}` }, { $size: `$${path}` }, 0] };
}

/** 정책 교차 지표. 전부 카운트/합계이며 어떤 값도 그대로 노출하지 않는다. */
async function policyMetrics(coll, now) {
  const [row] = await coll
    .aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withdrawn: { $sum: { $cond: [{ $eq: ["$status", "withdrawn"] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
          localAuthUsers: { $sum: { $cond: [nonEmptyString("passwordHash"), 1, 0] } },
          googleLinked: { $sum: { $cond: [nonEmptyString("socialAccounts.google.id"), 1, 0] } },
          naverLinked: { $sum: { $cond: [nonEmptyString("socialAccounts.naver.id"), 1, 0] } },
          kakaoLinked: { $sum: { $cond: [nonEmptyString("socialAccounts.kakao.id"), 1, 0] } },
          phonePlaintext: { $sum: { $cond: [{ $regexMatch: { input: asString("phoneNumber"), regex: /^01\d{8,9}$/ } }, 1, 0] } },
          phoneEncrypted: { $sum: { $cond: [{ $regexMatch: { input: asString("phoneNumber"), regex: /^v1:/ } }, 1, 0] } },
          phoneEmpty: { $sum: { $cond: [{ $eq: [asString("phoneNumber"), ""] }, 1, 0] } },
          pointsPositive: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$points", 0] }, 0] }, 1, 0] } },
          pointsTotal: { $sum: { $ifNull: ["$points", 0] } },
          passActive: {
            $sum: { $cond: [{ $gt: [{ $ifNull: ["$profileSubscription.expiresAt", new Date(0)] }, now] }, 1, 0] },
          },
          passExpired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $ifNull: ["$profileSubscription.expiresAt", null] }, null] },
                    { $lte: ["$profileSubscription.expiresAt", now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          creditBalancePositive: {
            $sum: { $cond: [{ $gt: [{ $ifNull: ["$profileSubscription.membershipCreditBalance", 0] }, 0] }, 1, 0] },
          },
          creditBalanceTotal: { $sum: { $ifNull: ["$profileSubscription.membershipCreditBalance", 0] } },
          creditGrantedTotal: { $sum: { $ifNull: ["$profileSubscription.membershipCreditGranted", 0] } },
          creditUsedTotal: { $sum: { $ifNull: ["$profileSubscription.membershipCreditUsed", 0] } },
          hasUnlocks: { $sum: { $cond: [{ $gt: [arraySize("unlockedFeatures"), 0] }, 1, 0] } },
          hasDestinyProfiles: { $sum: { $cond: [{ $gt: [arraySize("destinyProfiles"), 0] }, 1, 0] } },
          hasCreditLots: { $sum: { $cond: [{ $gt: [arraySize("profileSubscription.membershipCreditLots"), 0] }, 1, 0] } },
          licensesNonZero: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $add: [
                        { $ifNull: ["$licenses.standard", 0] },
                        { $ifNull: ["$licenses.premium", 0] },
                        { $ifNull: ["$licenses.vvip", 0] },
                      ],
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ], AGG_OPTIONS)
    .toArray();
  const metrics = { ...(row || {}) };
  delete metrics._id;
  return metrics;
}

/** 영구해금 키 상위 목록. 상품 키라 개인정보가 아니다. */
async function topUnlockedFeatures(coll, limit = 60) {
  const rows = await coll
    .aggregate([
      { $match: { "unlockedFeatures.0": { $exists: true } } },
      { $unwind: "$unlockedFeatures" },
      { $group: { _id: "$unlockedFeatures", accounts: { $sum: 1 } } },
      { $sort: { accounts: -1 } },
      { $limit: limit },
    ], AGG_OPTIONS)
    .toArray();
  return rows.map((row) => ({ featureKey: String(row._id), accounts: Number(row.accounts || 0) }));
}

async function main() {
  console.error("🔌 MongoDB 연결 중...");
  await connectDb(env);
  const db = mongoose.connection.db;
  const coll = db.collection("users");
  const now = new Date();
  console.error(`✅ 연결 완료 (db: ${db.databaseName})\n`);

  const total = await coll.countDocuments({}, { maxTimeMS: MAX_TIME_MS });
  console.error(`  users 총 ${total.toLocaleString()}건 — 키 센서스 수집 중...`);

  const census = [];
  census.push(...(await keyCensus(coll, "")));
  for (const root of NESTED_ROOTS) {
    census.push(...(await keyCensus(coll, root)));
  }

  const countablePaths = census.map((row) => row.path).filter((path) => path !== "_id" && path !== "__v");
  console.error(`  ${countablePaths.length}개 경로의 실사용 카운트 집계 중...`);
  const counts = await meaningfulCounts(coll, countablePaths);

  console.error("  배열 길이 · 값 분포 · 정책 지표 집계 중...");
  const arrays = await arrayStats(coll, ARRAY_PATHS);
  const dists = await distributions(coll, DISTRIBUTION_PATHS.filter((path) => !PII_PATHS.has(path)));
  const metrics = await policyMetrics(coll, now);
  const unlockKeys = await topUnlockedFeatures(coll);

  const fields = census
    .filter((row) => row.path !== "_id" && row.path !== "__v")
    .map((row) => {
      const count = counts.get(row.path) || { present: row.present, meaningful: 0 };
      return {
        path: row.path,
        types: row.types,
        present: count.present,
        meaningful: count.meaningful,
        presentPct: total ? Number(((count.present / total) * 100).toFixed(1)) : 0,
        meaningfulPct: total ? Number(((count.meaningful / total) * 100).toFixed(1)) : 0,
        pii: PII_PATHS.has(row.path),
        allDefault: count.meaningful === 0,
      };
    })
    .sort((a, b) => b.meaningful - a.meaningful || a.path.localeCompare(b.path));

  const payload = {
    generatedAt: now.toISOString(),
    database: db.databaseName,
    collection: "users",
    totalDocuments: total,
    fields,
    arrays,
    distributions: dists,
    policyMetrics: metrics,
    topUnlockedFeatures: unlockKeys,
    allDefaultFields: fields.filter((field) => field.allDefault).map((field) => field.path),
  };

  if (AS_JSON) {
    const text = JSON.stringify(payload, null, 2);
    if (OUT_PATH) {
      writeFileSync(OUT_PATH, `${text}\n`, "utf8");
      console.error(`💾 저장 완료: ${OUT_PATH}`);
    } else {
      console.log(text);
    }
    return;
  }

  const pad = (value, width) => String(value).padEnd(width);
  const padL = (value, width) => String(value).padStart(width);

  console.log(`\n👤 users 필드 실사용 — 총 ${total.toLocaleString()}건\n`);
  console.log(`  ${pad("field", 52)} ${padL("존재", 8)} ${padL("의미있음", 9)} ${padL("%", 6)}  type`);
  console.log(`  ${"-".repeat(52)} ${"-".repeat(8)} ${"-".repeat(9)} ${"-".repeat(6)}  ${"-".repeat(20)}`);
  for (const field of fields) {
    console.log(
      `  ${pad(field.path.slice(0, 52), 52)} ${padL(field.present.toLocaleString(), 8)} ` +
      `${padL(field.meaningful.toLocaleString(), 9)} ${padL(`${field.meaningfulPct}%`, 6)}  ${field.types.join("|")}`,
    );
  }

  console.log(`\n🟡 전 계정이 기본값인 필드 (${payload.allDefaultFields.length}개 — 삭제 후보 1차)`);
  for (const path of payload.allDefaultFields) console.log(`  · ${path}`);

  console.log("\n📏 배열 길이");
  for (const row of arrays) {
    console.log(`  · ${pad(row.path, 46)} max ${padL(row.maxLength, 6)}  avg ${padL(row.avgLength, 8)}  비어있지않음 ${row.nonEmptyDocs.toLocaleString()}`);
  }

  console.log("\n📊 정책 지표");
  for (const [key, value] of Object.entries(metrics)) {
    console.log(`  · ${pad(key, 26)} ${Number(value || 0).toLocaleString()}`);
  }

  console.log("\n📊 값 분포");
  for (const row of dists) {
    const summary = row.values.map((item) => `${item.value === "" ? "(빈문자열)" : item.value}=${item.count}`).join(", ");
    console.log(`  · ${pad(row.path, 44)} ${summary}`);
  }

  console.log(`\n🔓 영구해금 키 상위 ${unlockKeys.length}개`);
  for (const row of unlockKeys) console.log(`  · ${pad(row.featureKey, 46)} ${row.accounts.toLocaleString()}명`);
}

main()
  .catch((error) => {
    console.error("❌ 감사 실패:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.error("\n🔌 MongoDB 연결 종료");
  });
