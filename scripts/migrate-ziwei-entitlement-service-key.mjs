// 자미두수 기본 유료 섹션(A유형 영구 해금)의 ContentEntitlement 서비스키를 정본으로 정정한다.
//
// 배경: worker/routes/payments.js 가 ziwei 매핑을 몰라서, 원화 단건결제(PortOne)로 해금한 문서가
// serviceKey="saju" + contentKey=featureKey 원문으로 저장됐다. 조회/접근판정은 serviceKey="ziwei" +
// contentKey="ziwei.*" 로 하므로 영원히 매칭되지 않아 결제 후에도 다시 잠겼다.
// 쓰기 경로는 payments.js 에서 고쳤고, 이 스크립트는 그 전에 결제한 사용자를 되살린다.
//
// 기본은 dry-run(읽기 전용). 실제 반영은 --apply 를 붙일 때만 수행한다.
//
//   node scripts/migrate-ziwei-entitlement-service-key.mjs            # dry-run
//   node scripts/migrate-ziwei-entitlement-service-key.mjs --apply    # 실제 반영
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { ContentEntitlement, CONTENT_ENTITLEMENT_STATUSES } from "../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

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
  console.error("MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const TAG = "[migrate-ziwei-entitlement-service-key]";
const ZIWEI_SERVICE_KEY = "ziwei";

// 정본: worker/lib/content-unlocks.js ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY
const CANONICAL_CONTENT_KEY_BY_FEATURE_KEY = {
  ziwei_decade_luck: "ziwei.decadeLuck",
  ziwei_love_deep: "ziwei.loveDeep",
  ziwei_twelve_palaces: "ziwei.twelvePalaces",
  ziwei_symbolic_layer: "ziwei.symbolicLayer",
  ziwei_life_yearly_flow: "ziwei.lifeYearlyFlow",
};

// 레거시 문서는 contentKey 에 featureKey 원문이 들어있을 수도, 정본 ziwei.* 가 들어있을 수도 있다.
const CANONICAL_BY_ANY_KEY = {
  ...CANONICAL_CONTENT_KEY_BY_FEATURE_KEY,
  ...Object.fromEntries(Object.values(CANONICAL_CONTENT_KEY_BY_FEATURE_KEY).map((key) => [key, key])),
};
const ALL_MATCHABLE_KEYS = Object.keys(CANONICAL_BY_ANY_KEY);

await connectDb(env);

try {
  // serviceKey 가 정본과 다른 ACTIVE 문서만 대상. contentKey 만 어긋난 문서도 같이 정정된다.
  const stale = await ContentEntitlement.find({
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    contentKey: { $in: ALL_MATCHABLE_KEYS },
    $or: [
      { serviceKey: { $ne: ZIWEI_SERVICE_KEY } },
      { contentKey: { $in: Object.keys(CANONICAL_CONTENT_KEY_BY_FEATURE_KEY) } },
    ],
  }).lean();

  if (!stale.length) {
    console.log(`${TAG} 정정 대상 없음 — 모든 ziwei 해금이 이미 정본 serviceKey/contentKey 다.`);
    process.exit(0);
  }

  console.log(`${TAG} 대상 후보 ${stale.length}건 (mode=${APPLY ? "APPLY" : "DRY-RUN"})`);

  let repaired = 0;
  let redundant = 0;
  let skipped = 0;

  for (const doc of stale) {
    const canonicalContentKey = CANONICAL_BY_ANY_KEY[String(doc.contentKey || "")];
    if (!canonicalContentKey) {
      skipped += 1;
      continue;
    }
    const alreadyCanonical = doc.serviceKey === ZIWEI_SERVICE_KEY && doc.contentKey === canonicalContentKey;
    if (alreadyCanonical) {
      skipped += 1;
      continue;
    }

    const label = `user=${doc.userId} profile=${doc.profileId} ${doc.serviceKey}/${doc.contentKey} -> ${ZIWEI_SERVICE_KEY}/${canonicalContentKey}`;

    // 유니크 인덱스(userId, profileId, serviceKey, contentKey, scope) 충돌 방지:
    // 이미 정본 문서가 있으면 레거시 행은 중복이므로 건드리지 않는다(결제 이력은 Payment 에 남아있다).
    const twin = await ContentEntitlement.findOne({
      _id: { $ne: doc._id },
      userId: doc.userId,
      profileId: doc.profileId,
      serviceKey: ZIWEI_SERVICE_KEY,
      contentKey: canonicalContentKey,
      scope: doc.scope,
    }).select("_id status").lean();

    if (twin) {
      redundant += 1;
      console.log(`${TAG} REDUNDANT ${label} (정본 문서 이미 존재: ${twin._id} status=${twin.status}, 그대로 둠)`);
      continue;
    }

    repaired += 1;
    console.log(`${TAG} ${APPLY ? "REPAIR" : "WOULD-REPAIR"} ${label}`);

    if (APPLY) {
      await ContentEntitlement.updateOne(
        { _id: doc._id },
        { $set: { serviceKey: ZIWEI_SERVICE_KEY, contentKey: canonicalContentKey, updatedAt: new Date() } },
      );
    }
  }

  console.log(`${TAG} 요약 — 정정${APPLY ? "" : "(예정)"}: ${repaired}, 중복(보존): ${redundant}, 해당없음: ${skipped}`);
  if (!APPLY && repaired > 0) {
    console.log(`${TAG} 실제 반영하려면 --apply 를 붙여 다시 실행한다.`);
  }
} finally {
  await mongoose.disconnect();
}
