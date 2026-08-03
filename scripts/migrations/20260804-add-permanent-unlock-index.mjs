/**
 * Adds the canonical permanent-unlock identity index.
 *
 * Existing documents are not backfilled or deleted. Only documents with a
 * non-empty featureKey participate, so legacy entitlement rows remain readable.
 * Use --check or --dry-run for read-only validation before an approved run.
 */
import { config } from "dotenv";
import { connectDb, mongoose } from "../../worker/lib/db.js";
import { ContentEntitlement } from "../../worker/lib/models.js";

config({ path: ".env.local" });
config({ path: ".env" });

const CHECK = process.argv.includes("--check");
const DRY_RUN = process.argv.includes("--dry-run");
const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
};
const spec = { userId: 1, profileId: 1, featureKey: 1, scope: 1 };
const options = {
  unique: true,
  name: "permanent_unlock_identity",
  partialFilterExpression: { featureKey: { $exists: true, $type: "string", $gt: "" } },
};

async function migrate() {
  if (!env.MONGO_URI && !env.MONGODB_URI) throw new Error("MONGO_URI or MONGODB_URI is required");
  await connectDb(env);
  const indexes = await ContentEntitlement.collection.indexes();
  const present = indexes.some((index) => index.name === options.name);
  console.log(`${present ? "OK" : "MISSING"} ${options.name}`);
  if (CHECK && !present) process.exitCode = 1;
  if (!present && !CHECK && !DRY_RUN) {
    await ContentEntitlement.collection.createIndex(spec, options);
    console.log(`CREATED ${options.name}`);
  }
}

migrate()
  .catch((error) => {
    console.error(`Permanent unlock index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
