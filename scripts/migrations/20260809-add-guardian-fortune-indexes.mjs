/**
 * Guardian Fortune / Fortune Chat index migration. Never run automatically; --check is read-only.
 *
 * 2026-08-09 실측: 프로덕션의 guardian·fortune-chat 컬렉션 4개에 `_id_` 외 인덱스가 **하나도 없었다**.
 * 20260805-add-fortune-chat-indexes.mjs 는 작성만 되고 실행된 적이 없어, 그 스펙까지 여기에 포함한다
 * (createIndex 는 멱등이라 겹쳐도 안전하다).
 *
 * 왜 중요한가:
 *  · requestId unique 가 없으면 beginAttempt 의 `code === 11000` 멱등성 분기가 영원히 안 걸린다
 *    → 같은 requestId 재전송이 중복 attempt 를 만든다(결제 증빙이 requestId 에 묶여 있어 위험).
 *  · expiresAt TTL 이 없으면 예약 행이 영원히 남는다 — 실제로 17건이 status=reserved 로 고여 있었다.
 *  · guestIdHash / userId unique 가 없으면 동시 upsert 가 같은 주체의 사용량 행을 둘로 쪼갤 수 있다.
 *
 * 사용: node scripts/migrations/20260809-add-guardian-fortune-indexes.mjs [--check]
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import {
  FortuneChatSession,
  GuardianFortuneAccountUsage,
  GuardianFortuneAnonymousMerge,
  GuardianFortuneGenerationAttempt,
  GuardianFortuneGuestUsage,
} from "../../worker/lib/models.js";

config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = { MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "", MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "" };
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }

const specs = [
  [GuardianFortuneGuestUsage, { guestIdHash: 1 }, { unique: true, name: "guardian_guest_hash_unique" }],
  [GuardianFortuneGenerationAttempt, { requestId: 1 }, { unique: true, name: "guardian_attempt_request_unique" }],
  [GuardianFortuneGenerationAttempt, { expiresAt: 1 }, { expireAfterSeconds: 0, name: "guardian_attempt_expiry_ttl" }],
  [GuardianFortuneAccountUsage, { userId: 1 }, { unique: true, name: "guardian_account_user_unique" }],
  [GuardianFortuneAnonymousMerge, { userId: 1, guestIdHash: 1 }, { unique: true, name: "guardian_anonymous_merge_unique" }],
  [FortuneChatSession, { sessionId: 1 }, { unique: true, name: "fortune_chat_session_unique" }],
  [FortuneChatSession, { userId: 1, updatedAt: -1 }, { name: "fortune_chat_user_updated" }],
];

await connectDb(env);
let missing = 0;
for (const [model, key, options] of specs) {
  const label = `${model.collection.collectionName} ${options.name}`;
  const existing = await model.collection.indexes();
  const exists = existing.some((item) => JSON.stringify(item.key) === JSON.stringify(key));
  if (check) {
    console.log(`${exists ? "OK" : "MISSING"} ${label}`);
    if (!exists) missing += 1;
    continue;
  }
  if (exists) { console.log(`SKIP ${label} (already present)`); continue; }
  try {
    await model.collection.createIndex(key, options);
    console.log(`CREATED ${label}`);
  } catch (error) {
    // unique 인덱스는 기존 중복 데이터가 있으면 실패한다. 조용히 넘기지 말고 그대로 드러낸다.
    console.error(`FAILED ${label}: ${error?.codeName || error?.code || ""} ${error?.message || error}`);
    process.exitCode = 1;
  }
}
await mongoose.disconnect();
if (check && missing) process.exitCode = 1;
