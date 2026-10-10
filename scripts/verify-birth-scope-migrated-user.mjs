/**
 * 출생 기반 해금 이관 확인 (읽기 전용, 쓰기 없음) — 마이그레이션이 만든 BIRTH 행이 실제 리더로 열리는가.
 *
 * 20261010-birth-scope-unlocks.mjs --apply 뒤에 돌린다. BACKFILL BIRTH 행을 표본으로 뽑아
 *   ① 출생 정보가 같은 저장 프로필에서는 서버 리더(hasPaidUnlockForProfile)가 연다
 *   ② 출생 정보가 다른 저장 프로필에서는 잠근다(그 생년월일로 따로 산 행이 없을 때만 본다)
 * 를 확인한다. 궁합처럼 상대가 필요한 행은 건너뛰고 건수만 센다.
 *
 * 🔴 find/aggregate($sample) 외의 연산을 넣지 말 것.
 * 🔴 개인정보 무출력: userId 는 해시 앞 10자만, 프로필·생년월일은 내지 않는다.
 * CI 게이트가 아니다(실 DB 필요) — verify-guard-wiring UNWIRED_BY_DESIGN 에 사유와 함께 선언돼 있다.
 *
 * 실행:
 *   node scripts/verify-birth-scope-migrated-user.mjs --db code_destiny_staging [--sample 20]
 *   node scripts/verify-birth-scope-migrated-user.mjs --db code_destiny [--sample 20]
 */
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { ContentEntitlement, ProfileCard } from "../worker/lib/models.js";
import { hasPaidUnlockForProfile } from "../worker/lib/content-unlocks.js";
import { computeBirthKey } from "../worker/lib/birth-key.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
globalThis.fetch = () => { throw new Error("External HTTP is forbidden in this read-only check."); };

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DATABASE = argValue("--db", "");
if (!["code_destiny_staging", "code_destiny"].includes(DATABASE)) {
  throw new Error("Required: --db code_destiny_staging | code_destiny (no default — pick the target explicitly).");
}
const SAMPLE = Math.min(200, Math.max(1, Number(argValue("--sample", 20)) || 20));
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) throw new Error("MONGO_URI is not configured (.env.local).");
// --db 가 MONGO_DB_NAME·MONGODB_DB_NAME 둘 다를 덮는다 — 환경 변수 하나만 바꿔 다른 DB 를 읽는 일이 없게.
const env = { MONGO_URI: uri, MONGODB_URI: uri, MONGO_DB_NAME: DATABASE, MONGODB_DB_NAME: DATABASE };

const hashUser = (userId) => createHash("sha256").update(String(userId)).digest("hex").slice(0, 10);

const report = {
  database: DATABASE,
  sampled: 0,
  matchedOpen: 0,
  matchedLocked: 0,
  noMatchingProfile: 0,
  otherLocked: 0,
  otherOpen: 0,
  noOtherProfile: 0,
  partnerSkipped: 0,
  failures: [],
};

try {
  await connectDb(env);
  if (mongoose.connection.db?.databaseName !== DATABASE) {
    throw new Error(`Connected to ${mongoose.connection.db?.databaseName || "?"}, expected ${DATABASE}`);
  }
  const rows = await ContentEntitlement.aggregate([
    { $match: { scope: "BIRTH", source: "BACKFILL", status: "ACTIVE", birthKey: { $type: "string" } } },
    { $sample: { size: SAMPLE } },
  ]);
  for (const row of rows) {
    report.sampled += 1;
    if (row.partnerBirthKey) { report.partnerSkipped += 1; continue; }
    const userId = String(row.userId);
    const cards = mongoose.isValidObjectId(userId)
      ? await ProfileCard.find({ userId: new mongoose.Types.ObjectId(userId) }).select("profileId gender birth").lean()
      : [];
    const keyed = cards.map((card) => ({ profileId: String(card.profileId || ""), birthKey: computeBirthKey(card) })).filter((card) => card.profileId);
    const read = (profileId) => hasPaidUnlockForProfile({
      userId, profileId, featureKey: row.featureKey, serviceKey: row.serviceKey, contentKey: row.contentKey,
    });
    const fail = (kind) => report.failures.push({ kind, user: hashUser(userId), featureKey: row.featureKey });

    const match = keyed.find((card) => card.birthKey === row.birthKey);
    if (!match) report.noMatchingProfile += 1;
    else if (await read(match.profileId)) report.matchedOpen += 1;
    else { report.matchedLocked += 1; fail("matched_locked"); }

    let other = null;
    for (const card of keyed) {
      if (!card.birthKey || card.birthKey === row.birthKey) continue;
      const ownsOther = await ContentEntitlement.exists({
        userId, scope: "BIRTH", birthKey: card.birthKey, contentKey: row.contentKey, status: "ACTIVE",
      });
      if (!ownsOther) { other = card; break; }
    }
    if (!other) report.noOtherProfile += 1;
    else if (await read(other.profileId)) { report.otherOpen += 1; fail("other_birth_open"); }
    else report.otherLocked += 1;
  }
  report.result = report.failures.length ? "FAIL" : "OK";
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length) process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
