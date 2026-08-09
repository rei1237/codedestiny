import { connectDb, resolveMongoDbName } from "../lib/db.js";
import { User } from "../lib/models.js";
import { getEnv } from "../lib/env.js";
import { getRoutePath, json, methodNotAllowed, notFound } from "../lib/http.js";

function isDebugModeEnabled(env) {
  const raw = String(getEnv(env, "DEBUG_MODE", "")).trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

function requireDebugMode(env) {
  if (!isDebugModeEnabled(env)) {
    return json({
      ok: false,
      error: "debug_mode_disabled",
      message: "Set DEBUG_MODE=true in Worker environment to access debug routes.",
    }, { status: 403 });
  }
  return null;
}

function sanitizeError(error) {
  const message = String(error?.message || "").slice(0, 240);
  return {
    name: String(error?.name || "Error"),
    message,
  };
}

function getMongoEnvHealth(env) {
  const mongoUriConfigured = Boolean(getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI"));
  const mongoDbNameConfigured = Boolean(
    getEnv(env, "MONGO_DB_NAME")
    || getEnv(env, "MONGO_NAME")
    || getEnv(env, "MONGODB_DB_NAME")
  );

  return {
    mongoUriConfigured,
    mongoDbNameConfigured,
    dbName: resolveMongoDbName(env) || "",
  };
}

async function handleMongoWriteTest(request, env) {
  const blocked = requireDebugMode(env);
  if (blocked) return blocked;

  const requestId = String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "").slice(0, 120);
  const envHealth = getMongoEnvHealth(env);

  const steps = {
    connect: { ok: false },
    insert: { ok: false },
    findOne: { ok: false },
    delete: { ok: false },
  };

  const result = {
    ok: false,
    requestId,
    dbName: envHealth.dbName,
    env: {
      mongoUriConfigured: envHealth.mongoUriConfigured,
      mongoDbNameConfigured: envHealth.mongoDbNameConfigured,
    },
    steps,
  };

  try {
    await connectDb(env);
    steps.connect.ok = true;

    const db = User.db;
    const collectionName = "debug_runtime_checks";
    const collection = db.collection(collectionName);

    const doc = {
      marker: "mongo_write_test",
      requestId,
      createdAt: new Date(),
    };

    const insertResult = await collection.insertOne(doc);
    const insertedId = insertResult?.insertedId;
    steps.insert = {
      ok: Boolean(insertedId),
      insertedId: insertedId ? String(insertedId) : "",
      collection: collectionName,
    };

    const foundDoc = insertedId ? await collection.findOne({ _id: insertedId }) : null;
    steps.findOne = {
      ok: Boolean(foundDoc),
      found: Boolean(foundDoc),
    };

    const deleteResult = insertedId ? await collection.deleteOne({ _id: insertedId }) : null;
    steps.delete = {
      ok: Boolean(deleteResult && deleteResult.deletedCount === 1),
      deletedCount: Number(deleteResult?.deletedCount || 0),
    };

    result.ok = steps.connect.ok && steps.insert.ok && steps.findOne.ok && steps.delete.ok;
    return json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const safeError = sanitizeError(error);
    const firstFailed = (
      !steps.connect.ok ? "connect" :
      !steps.insert.ok ? "insert" :
      !steps.findOne.ok ? "findOne" :
      !steps.delete.ok ? "delete" :
      "unknown"
    );

    steps[firstFailed] = {
      ...(steps[firstFailed] || {}),
      ok: false,
      error: safeError,
    };

    return json({
      ...result,
      failedStep: firstFailed,
    }, { status: 500 });
  }
}

async function handleUserExists(request, env) {
  const blocked = requireDebugMode(env);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) {
    return json({ ok: false, error: "missing_email", message: "email query parameter is required." }, { status: 400 });
  }

  await connectDb(env);

  // 내부 ID/role/가입일은 응답에 담지 않는다 — DEBUG_MODE 하나에만 기대는 이 라우트가
  // 그 필드들까지 새면 프로덕션에서 열거 공격의 가치가 커진다. 존재 여부만으로 충분한
  // 용도(scripts/test-signup.mjs 등)만 지원한다.
  const user = await User.collection.findOne(
    { email },
    { projection: { _id: 1 }, maxTimeMS: 5000 },
  );

  return json({
    ok: true,
    email,
    exists: Boolean(user),
  });
}

export async function handleDebugRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/debug");

  if (method === "GET" && path === "/mongo-write-test") {
    return handleMongoWriteTest(request, env);
  }

  if (method === "GET" && path === "/user-exists") {
    return handleUserExists(request, env);
  }

  if (path === "/mongo-write-test" || path === "/user-exists") {
    return methodNotAllowed();
  }

  return notFound();
}
