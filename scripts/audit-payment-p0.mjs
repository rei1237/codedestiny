// Explicit read-only incident audit. No models are initialized and no writes/PG calls occur.
import { config } from "dotenv";
import { MongoClient } from "mongodb";

const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const envFile = arg("env-file");
if (envFile) config({ path: envFile, quiet: true });
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const database = process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || (uri ? new URL(uri).pathname.slice(1) : "");
if (!uri || !database || arg("expected-db") !== database) throw new Error("Explicit --expected-db must match the configured database");
const orderId = arg("order");
if (!orderId) throw new Error("--order is required");

async function auditPaidJoins(db, opts) {
  const orders = await db.collection("payments").find({ status: { $in: ["paid", "success", "fulfilled"] }, paymentType: "digital_content" }, {
    ...opts, projection: { merchantUid: 1, impUid: 1, userId: 1, featureKey: 1, requestId: 1, idempotencyKey: 1 },
  }).limit(101).toArray();
  if (orders.length > 100) throw new Error("Use a paginated audit for more than 100 digital purchases");
  const groups = {};
  for (const order of orders) {
    const ids = [order.merchantUid, order.impUid, order.requestId, order.idempotencyKey].filter(Boolean);
    const executions = await db.collection("paid_execution_records").find({ userId: String(order.userId), featureId: order.featureKey,
      $or: ["paymentId", "orderId", "requestId"].map(key => ({ [key]: { $in: ids } })),
    }, { ...opts, projection: { status: 1 } }).toArray();
    const entitlement = await db.collection("content_entitlements").findOne({ userId: String(order.userId), featureKey: order.featureKey,
      $or: ["paymentId", "orderId", "evidenceId"].map(key => ({ [key]: { $in: ids } })),
    }, { ...opts, projection: { _id: 1 } });
    const namingResult = executions.length ? await db.collection("paid_execution_records").findOne({
      _id: { $in: executions.map(row => row._id) },
      $or: ["result.namingPrompt.generatedResult", "result.namingPrompt.generatedPrompt"].map(key => ({ [key]: { $exists: true, $nin: [null, ""] } })),
    }, { ...opts, projection: { _id: 1 } }) : null;
    const unlocked = await db.collection("users").findOne({ _id: order.userId,
      $or: [{ unlockedFeatures: order.featureKey }, { paidFeatures: order.featureKey }],
    }, { ...opts, projection: { _id: 1 } });
    const group = groups[order.featureKey] ||= { orders: 0, linkedExecution: 0, linkedEntitlement: 0, storedNamingResult: 0, legacyUnlock: 0, unlinked: 0 };
    group.orders += 1;
    group.linkedExecution += Number(executions.length > 0);
    group.linkedEntitlement += Number(Boolean(entitlement));
    group.storedNamingResult += Number(Boolean(namingResult));
    group.legacyUnlock += Number(Boolean(unlocked));
    group.unlinked += Number(!executions.length && !entitlement && !unlocked);
  }
  console.log(JSON.stringify({ digitalPurchaseJoins: groups, note: "Exact owned links only; missing linkage does not prove nondelivery. No writes or result text output." }));
}
const client = new MongoClient(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 10000, socketTimeoutMS: 15000, retryWrites: false });
try {
  await client.connect();
  const db = client.db(database);
  const opts = { maxTimeMS: 10000 };
  if (process.argv.includes("--paid-joins")) await auditPaidJoins(db, opts);
  if (process.argv.includes("--indexes")) {
    for (const collection of ["payments", "paid_execution_records", "masterLoveCodexSessions", "pointhistories"]) {
      const indexes = await db.collection(collection).listIndexes(opts).toArray();
      console.log(JSON.stringify({ collection, indexes: indexes.map(index => ({ key: index.key, unique: index.unique === true || (index.key._id === 1 && Object.keys(index.key).length === 1), partial: Boolean(index.partialFilterExpression) })) }));
    }
  }
  if (process.argv.includes("--summary")) {
    const paidFilter = { status: { $in: ["paid", "success", "fulfilled"] } };
    const totalPayments = await db.collection("payments").countDocuments({}, opts);
    const paidPayments = await db.collection("payments").countDocuments(paidFilter, opts);
    const missingGrantMarker = await db.collection("payments").countDocuments({ ...paidFilter, entitlementGrantedAt: null }, opts);
    const stuckCodex = await db.collection("masterLoveCodexSessions").countDocuments({ status: "generating", generationProgress: null, "chapters.0": { $exists: false } }, opts);
    console.log(JSON.stringify({ summary: { totalPayments, paidPayments, missingGrantMarker, stuckCodex },
      interpretation: "Marker absence includes legacy orders and is not a confirmed missing entitlement. Stuck sessions include refunded and pass runs; ownership/refund review is required before repair. No writes performed." }));
  }
  const order = await db.collection("payments").findOne({ merchantUid: orderId }, { ...opts, projection: {
    userId: 1, featureKey: 1, productId: 1, requestId: 1, idempotencyKey: 1, status: 1,
    orderState: 1, paymentAmount: 1, paymentMethod: 1, pgProvider: 1, paymentType: 1, paidAt: 1, refundedAt: 1, createdAt: 1, updatedAt: 1,
    entitlementGrantedAt: 1, failureCode: 1, failureStage: 1, "metadata.reconcile.lastPgStatus": 1,
  } });
  if (!order) { console.log(JSON.stringify({ orderFound: false, database })); }
  else {
    const keys = [order.requestId, order.idempotencyKey, orderId].filter(Boolean);
    const sessions = await db.collection("masterLoveCodexSessions").find({ userId: String(order.userId),
      $or: [{ paymentId: orderId }, { idempotencyKey: { $in: keys } }, { billingRequestId: { $in: keys } }],
    }, { ...opts, projection: { status: 1, accessType: 1, mode: 1, createdAt: 1, updatedAt: 1, "chapters.ok": 1, "generationError.code": 1, generationProgress: 1 } }).toArray();
    const execution = await db.collection("paid_execution_records").find({ userId: String(order.userId),
      $or: [{ orderId }, { paymentId: orderId }, { requestId: { $in: keys } }],
    }, { ...opts, projection: { status: 1, featureId: 1, accessMethod: 1, resultId: 1, createdAt: 1 } }).toArray();
    const security = await db.collection("security_events").find({ userId: order.userId,
      createdAt: { $gte: new Date(new Date(order.createdAt).getTime() - 60000), $lte: new Date(new Date(order.createdAt).getTime() + 3600000) },
      endpoint: { $regex: "master-love-codex" },
    }, { ...opts, projection: { _id: 0, endpoint: 1, reason: 1, level: 1, createdAt: 1 } }).limit(50).toArray();
    const user = await db.collection("users").findOne({ _id: order.userId }, { ...opts, projection: {
      name: 1, email: 1, phoneNumber: 1, birthDate: 1, gender: 1, "profileSubscription.tier": 1, "profileSubscription.isActive": 1,
    } });
    console.log(JSON.stringify({ orderFound: true, database,
      order: Object.fromEntries(["featureKey", "productId", "status", "orderState", "paymentType", "paymentMethod", "pgProvider", "paymentAmount", "paidAt", "refundedAt", "createdAt", "updatedAt", "entitlementGrantedAt", "failureCode", "failureStage"].map(key => [key, order[key] ?? null])),
      sessions: sessions.map(({ _id, chapters, generationProgress, ...rest }) => ({ ...rest, progressNull: generationProgress === null, progressMissing: generationProgress === undefined, completedChapters: generationProgress?.completed || 0, chapterCount: chapters?.length || 0, failedChapters: chapters?.filter(chapter => chapter.ok === false).length || 0 })),
      securityEvents: security,
      executions: execution.map(row => ({ status: row.status, featureId: row.featureId, accessMethod: row.accessMethod, hasResult: Boolean(row.resultId), createdAt: row.createdAt })),
      currentAccount: { found: Boolean(user), hasName: Boolean(user?.name), hasEmail: Boolean(user?.email), hasPhone: Boolean(user?.phoneNumber), hasBirthDate: Boolean(user?.birthDate), hasGender: Boolean(user?.gender), passTier: user?.profileSubscription?.tier || null },
      note: "Current account fields do not prove their values at the incident time; missing execution record is not proof of non-delivery.",
    }, null, 2));
  }
} catch (error) {
  console.error(JSON.stringify({ auditFailed: true, name: error.name, code: error.code || null }));
  process.exitCode = 1;
} finally { await client.close(); }
