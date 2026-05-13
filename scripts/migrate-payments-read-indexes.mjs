import mongoose from "mongoose";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = String(
  process.env.MONGO_URI
  || process.env.MONGODB_URI
  || "",
).trim().replace(/^['\"]|['\"]$/g, "");

if (!MONGO_URI) {
  console.error("[migrate-payments-read-indexes] MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

async function ensureIndex(collection, spec, options = {}) {
  const name = options.name || Object.entries(spec).map(([k, v]) => `${k}_${v}`).join("_");
  try {
    await collection.createIndex(spec, { background: true, ...options });
    console.log(`[ok] ${collection.collectionName} -> ${name}`);
  } catch (error) {
    const code = Number(error?.code || 0);
    const message = String(error?.message || "");
    if (code === 85 || code === 86) {
      console.warn(`[warn] index conflict, recreate: ${collection.collectionName} -> ${name}`);
      await collection.dropIndex(name).catch(() => {});
      await collection.createIndex(spec, { background: true, ...options });
      console.log(`[ok] recreated ${collection.collectionName} -> ${name}`);
      return;
    }
    if (code === 11000 || message.includes("already exists")) {
      console.log(`[skip] already exists: ${collection.collectionName} -> ${name}`);
      return;
    }
    throw error;
  }
}

async function migrate() {
  console.log("[migrate-payments-read-indexes] connecting to mongodb...");
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existingCollections.map((entry) => String(entry?.name || "").trim()));

  const payments = db.collection("payments");
  await ensureIndex(payments, { userId: 1, createdAt: -1 }, { name: "idx_payments_user_createdAt" });

  const pointHistoryCandidates = ["pointhistories", "point_histories"];
  for (const collectionName of pointHistoryCandidates) {
    if (!existingNames.has(collectionName)) {
      console.log(`[skip] collection not found: ${collectionName}`);
      continue;
    }

    const historyCollection = db.collection(collectionName);
    await ensureIndex(historyCollection, { userId: 1, createdAt: -1 }, { name: "idx_point_history_user_createdAt" });
    await ensureIndex(historyCollection, { userId: 1, kind: 1, createdAt: -1 }, { name: "idx_point_history_user_kind_createdAt" });
  }

  console.log("[migrate-payments-read-indexes] done.");
}

migrate()
  .catch((error) => {
    console.error("[migrate-payments-read-indexes] failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
