/**
 * 폐기된 이용권 등급 별칭 제거가 라이브 계정을 무료로 떨어뜨리는지 조회 — 읽기 전용(쓰기 0건).
 *
 * `worker/lib/profile-limits.js` 의 `tierFromValue()` 는 planId·productId·label 같은 자유
 * 문자열을 등급으로 승격시키는 유일한 지점이다. 여기서 별칭을 빼면, 그 이름으로 저장된 라이브
 * 계정은 배포 즉시 이용권을 잃는다. mock 으로는 확인할 수 없다 — 답이 코드가 아니라 데이터에 있다.
 *
 * 그래서 별칭을 정규식으로 추측하지 않고 **차등(differential)** 으로 센다: 라이브 커밋의
 * profile-limits.js 와 현재 트리의 것을 같은 문서에 돌려, 결과가 달라지는 계정만 보고한다.
 * 이 모듈은 import 가 0개인 자립 모듈이라 두 버전을 나란히 로드할 수 있다(data: URL, 임시파일 없음).
 *
 * 실행:
 *   node scripts/query-retired-pass-tier-aliases.mjs [--base <ref>] [--limit 50] [--json]
 *
 * 종료코드: 불일치 0건 → 0, 1건 이상 → 1 (배포 게이트로 쓸 수 있게)
 */

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { Payment, User } from "../worker/lib/models.js";
import {
  normalizeHoneyPassEntitlement as nextNormalizeEntitlement,
  normalizePassTier as nextNormalizePassTier,
} from "../worker/lib/profile-limits.js";

config({ path: ".env.local" });
config({ path: ".env" });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const SAMPLE_LIMIT = Math.max(1, Math.floor(Number(argValue("--limit", 50))) || 50);
const AS_JSON = process.argv.includes("--json");

// 비교 기준은 "지금 라이브에 떠 있는 커밋"이다. 배포 상태 파일이 정본이고, 없으면 --base 로 받는다.
function resolveBaseRef() {
  const explicit = argValue("--base", "");
  if (explicit) return explicit;
  try {
    const state = JSON.parse(fs.readFileSync(".deploy-state/state.json", "utf8"));
    const commit = String(state?.git?.commit || "").trim();
    if (commit) return commit;
  } catch {
    /* 상태 파일이 없으면 아래에서 안내한다 */
  }
  return "";
}

const env = {
  ...process.env,
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
};

if (!env.MONGO_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

/** `normalizeHoneyPassEntitlement` 이 source 하나에서 읽는 필드 전량. 빠뜨리면 차등이 거짓음성이 된다. */
const TIER_FIELDS = ["tier", "plan", "planId", "productId", "subscriptionTier", "membershipTier", "passTier", "label"];
const SOURCE_FIELDS = [
  ...TIER_FIELDS,
  "startedAt", "firstSubAt", "currentPeriodStart", "startsAt", "startAt", "validFrom",
  "expiresAt", "currentPeriodEnd", "endsAt", "endAt", "validUntil",
  "status", "subscriptionStatus", "membershipStatus", "lastBillingStatus",
  "isActive", "isSubscribed", "active", "enabled", "valid", "isValid", "registered",
  "source",
];
/** 사용자 문서에서 source 로 채택되는 하위 객체 전량(문서 루트도 source 라 별도로 투영한다). */
const SOURCE_SUBTREES = [
  "profileSubscription", "subscription", "membership",
  "membershipPass", "pass", "entitlement", "licensePass", "accessGateResult",
];

function buildProjection() {
  const projection = { _id: 1, email: 1 };
  for (const key of SOURCE_SUBTREES) projection[key] = 1;
  for (const field of SOURCE_FIELDS) projection[field] = 1;
  return projection;
}

function maskEmail(value) {
  const text = String(value || "").trim();
  if (!text.includes("@")) return text ? `${text.slice(0, 2)}***` : "(no-email)";
  const [local, domain] = text.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/** 라이브 커밋의 profile-limits.js 를 임시파일 없이 그대로 모듈로 로드한다. */
async function loadBaselineModule(ref) {
  const source = execFileSync("git", ["show", `${ref}:worker/lib/profile-limits.js`], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const url = `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
  return import(url);
}

function entitlementShape(entitlement) {
  return {
    tier: entitlement?.tier ?? null,
    passTier: entitlement?.passTier ?? null,
    isActive: entitlement?.isActive === true,
    maxCoveredCoin: Number(entitlement?.maxCoveredCoin || 0),
    source: entitlement?.source ?? null,
  };
}

function sameShape(a, b) {
  return a.tier === b.tier
    && a.passTier === b.passTier
    && a.isActive === b.isActive
    && a.maxCoveredCoin === b.maxCoveredCoin
    && a.source === b.source;
}

/**
 * 어떤 필드의 어떤 값이 등급을 잃었는지 짚어 준다. `normalizePassTier` 가 곧 `tierFromValue` 를
 * 지나므로, 같은 값에 두 버전을 돌려 비교하면 원인 필드가 정확히 나온다.
 */
function attributeCauses(doc, baselineNormalizePassTier) {
  const causes = [];
  const inspect = (holder, path) => {
    if (!holder || typeof holder !== "object") return;
    for (const field of TIER_FIELDS) {
      const raw = holder[field];
      if (typeof raw !== "string" || !raw.trim()) continue;
      const before = baselineNormalizePassTier(raw);
      const after = nextNormalizePassTier(raw);
      if (before === after) continue;
      causes.push({ path: path ? `${path}.${field}` : field, value: raw, before: before || null, after: after || null });
    }
  };
  inspect(doc, "");
  for (const key of SOURCE_SUBTREES) {
    inspect(doc[key], key);
    inspect(doc[key]?.subscription, `${key}.subscription`);
  }
  return causes;
}

async function scanUsers(baseline) {
  const cursor = User.collection.aggregate(
    [
      { $project: buildProjection() },
      // lot 배열은 등급 판정에 쓰이지 않는데 문서마다 수십 건이라, 전수 스캔에서는 빼고 읽는다.
      { $unset: "profileSubscription.membershipCreditLots" },
    ],
    { allowDiskUse: false },
  );

  let scanned = 0;
  let lostPass = 0;
  const samples = [];
  for await (const doc of cursor) {
    scanned += 1;
    const before = entitlementShape(baseline.normalizeHoneyPassEntitlement(doc));
    const after = entitlementShape(nextNormalizeEntitlement(doc));
    if (sameShape(before, after)) continue;
    if (before.isActive && !after.isActive) lostPass += 1;
    if (samples.length < SAMPLE_LIMIT) {
      samples.push({
        userId: String(doc._id),
        email: maskEmail(doc.email),
        before,
        after,
        causes: attributeCauses(doc, baseline.normalizePassTier),
      });
    }
  }
  return { scanned, mismatched: samples.length, lostPass, samples };
}

/**
 * 보조 확인 — Payment 행의 등급 문자열. `buildPassTierMatchValues` 가 결제 이력을 등급 문자열로
 * 매칭하므로, 사용자 문서가 멀쩡해도 여기 남은 폐기 별칭은 별도로 세어 둔다.
 */
async function scanPayments(baseline) {
  const fields = ["productId", "subscriptionTier"];
  const filter = {
    $or: fields.map((field) => ({ [field]: { $type: "string", $ne: "" } })),
  };
  const cursor = Payment.collection.find(filter, {
    projection: { _id: 1, productId: 1, subscriptionTier: 1 },
  });

  let scanned = 0;
  const hits = [];
  for await (const doc of cursor) {
    scanned += 1;
    for (const field of fields) {
      const raw = doc[field];
      if (typeof raw !== "string" || !raw.trim()) continue;
      const before = baseline.normalizePassTier(raw);
      const after = nextNormalizePassTier(raw);
      if (before === after) continue;
      if (hits.length < SAMPLE_LIMIT) {
        hits.push({ paymentId: String(doc._id), field, value: raw, before: before || null, after: after || null });
      }
    }
  }
  return { scanned, hits };
}

async function main() {
  const baseRef = resolveBaseRef();
  if (!baseRef) {
    console.error("❌ 비교 기준 커밋을 찾지 못했습니다. .deploy-state/state.json 이 없으면 --base <ref> 를 주세요.");
    process.exit(1);
  }
  console.log(`📌 비교 기준(라이브) 커밋: ${baseRef.slice(0, 12)}`);
  const baseline = await loadBaselineModule(baseRef);

  console.log("🔌 MongoDB 연결 중... (읽기 전용)");
  await connectDb(env);
  console.log("✅ MongoDB 연결 완료\n");

  const users = await scanUsers(baseline);
  const payments = await scanPayments(baseline);

  if (AS_JSON) {
    console.log(JSON.stringify({ baseRef, users, payments }, null, 2));
  } else {
    console.log(`👤 사용자 ${users.scanned.toLocaleString()}건 검사 — 판정이 달라진 계정 ${users.mismatched}건, 그중 이용권 상실 ${users.lostPass}건`);
    for (const row of users.samples) {
      console.log(`\n  · ${row.email} (${row.userId})`);
      console.log(`    before: tier=${row.before.tier} passTier=${row.before.passTier} active=${row.before.isActive}`);
      console.log(`    after : tier=${row.after.tier} passTier=${row.after.passTier} active=${row.after.isActive}`);
      for (const cause of row.causes) {
        console.log(`    원인  : ${cause.path} = ${JSON.stringify(cause.value)}  (${cause.before} → ${cause.after})`);
      }
    }
    console.log(`\n💳 결제 ${payments.scanned.toLocaleString()}건 검사 — 폐기 별칭을 든 행 ${payments.hits.length}건`);
    for (const hit of payments.hits) {
      console.log(`  · ${hit.paymentId} ${hit.field}=${JSON.stringify(hit.value)}  (${hit.before} → ${hit.after})`);
    }
  }

  const total = users.mismatched + payments.hits.length;
  if (total > 0) {
    console.log(`\n❌ 폐기 별칭이 라이브 데이터에 남아 있습니다(${total}건). 해당 별칭을 tierFromValue 에 되살린 뒤 배포하세요.`);
    process.exitCode = 1;
    return;
  }
  console.log("\n✅ 판정이 달라지는 계정·결제가 없습니다. 티어 별칭 제거는 안전합니다.");
}

main()
  .catch((err) => {
    console.error("❌ 조회 실패:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결 종료");
  });
