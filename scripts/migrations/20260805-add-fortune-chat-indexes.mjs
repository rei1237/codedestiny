/**
 * Fortune Chat index migration. Never run automatically; --check is read-only.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { FortuneChatSession, GuardianFortuneAccountUsage, GuardianFortuneAnonymousMerge } from "../../worker/lib/models.js";
config({ path: ".env.local" }); config({ path: ".env" });
const check = process.argv.includes("--check");
const env = { MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "", MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "" };
if (!env.MONGO_URI) { console.error("MONGO_URI or MONGODB_URI is required."); process.exit(1); }
const specs = [
  [GuardianFortuneAccountUsage, { userId: 1 }, { unique: true, name: "guardian_account_user_unique" }],
  [GuardianFortuneAnonymousMerge, { userId: 1, guestIdHash: 1 }, { unique: true, name: "guardian_anonymous_merge_unique" }],
  [FortuneChatSession, { sessionId: 1 }, { unique: true, name: "fortune_chat_session_unique" }],
  [FortuneChatSession, { userId: 1, updatedAt: -1 }, { name: "fortune_chat_user_updated" }],
];
await connectDb(env);
let missing = 0;
for (const [model, key, options] of specs) {
  const exists = check ? (await model.collection.indexes()).some((item) => JSON.stringify(item.key) === JSON.stringify(key)) : false;
  if (check) { console.log(`${exists ? "OK" : "MISSING"} ${options.name}`); if (!exists) missing += 1; }
  else { await model.collection.createIndex(key, options); console.log(`OK ${options.name}`); }
}
await mongoose.disconnect();
if (missing) process.exitCode = 1;
