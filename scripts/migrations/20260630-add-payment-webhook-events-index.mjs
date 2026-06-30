import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
const dbName = process.env.MONGODB_DB_NAME || process.env.DB_NAME || "";

if (!mongoUri) {
  console.error("MONGODB_URI or MONGO_URI is required.");
  process.exit(1);
}

await mongoose.connect(mongoUri, dbName ? { dbName } : {});

const db = mongoose.connection.db;
const collection = db.collection("payment_webhook_events");

await collection.createIndex(
  { provider: 1, eventId: 1 },
  {
    unique: true,
    name: "uniq_payment_webhook_provider_event",
  },
);
await collection.createIndex(
  { paymentId: 1, createdAt: -1 },
  { name: "idx_payment_webhook_payment_created" },
);
await collection.createIndex(
  { status: 1, createdAt: -1 },
  { name: "idx_payment_webhook_status_created" },
);

console.log("payment_webhook_events indexes are ready.");

await mongoose.disconnect();
