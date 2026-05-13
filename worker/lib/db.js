import mongoose from "mongoose";

import { getEnv, installProcessEnv } from "./env.js";

let connectPromise = null;

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function extractDbNameFromUri(uri) {
  try {
    const parsed = new URL(String(uri || ""));
    const pathname = String(parsed.pathname || "").replace(/^\/+/, "");
    if (!pathname) return "";
    const firstSegment = pathname.split("/")[0] || "";
    return firstSegment.trim();
  } catch {
    return "";
  }
}

export function resolveMongoDbName(env = {}) {
  const explicit = (
    getEnv(env, "MONGO_DB_NAME")
    || getEnv(env, "MONGO_NAME")
    || getEnv(env, "MONGODB_DB_NAME")
  );
  if (explicit) return explicit;

  const uri = getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI");
  return extractDbNameFromUri(uri) || "code_destiny";
}

export async function resetMongooseConnection() {
  const disconnectTimeoutMs = 1500;
  try {
    if (mongoose.connection.readyState !== 0) {
      await Promise.race([
        mongoose.disconnect(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("mongoose_disconnect_timeout")), disconnectTimeoutMs);
        }),
      ]);
    }
  } catch {
    // Ignore disconnect failures; next connect attempt will retry.
  }
}

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function createConnectTask(env = {}, stage = "initial") {
  const guardTimeoutMS = Number(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "8000"));
  const serverSelectionTimeoutMS = Number(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000"));
  const connectTimeoutMS = Number(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "5000"));
  const socketTimeoutMS = Number(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "15000"));

  const uri = getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI");
  if (!uri) {
    throw new Error("MONGO_URI or MONGODB_URI is required for Worker-native API routes.");
  }

  console.log(`[db-connect] starting mongodb connection (${stage})...`);
  const connectTask = mongoose.connect(uri, {
    dbName: resolveMongoDbName(env) || undefined,
    maxPoolSize: Number(getEnv(env, "MONGO_MAX_POOL_SIZE", "5")),
    serverSelectionTimeoutMS,
    connectTimeoutMS,
    socketTimeoutMS,
    bufferCommands: false,
    family: Number(getEnv(env, "MONGO_IP_FAMILY", "4")),
    autoIndex: false,
  });

  connectTask
    .then(() => console.log(`[db-connect] mongodb connected successfully (${stage}).`))
    .catch((err) => {
      console.error(`[db-connect-error] mongodb connection failed (${stage}):`, err.message);
    });

  return withTimeout(
    connectTask,
    guardTimeoutMS,
    "MongoDB connection timed out in Worker.",
  );
}

export async function connectDb(env = {}) {
  installProcessEnv(env);

  const shouldPingConnectedSocket = isTruthyFlag(getEnv(env, "MONGO_VERIFY_PING_EACH_REQUEST", "false"));
  const retryOnceOnFail = isTruthyFlag(getEnv(env, "MONGO_CONNECT_RETRY_ONCE", "true"));

  if (mongoose.connection.readyState === 1) {
    if (!shouldPingConnectedSocket) {
      return mongoose.connection;
    }

    const pingTimeoutMS = Number(getEnv(env, "MONGO_PING_TIMEOUT_MS", "2500"));
    try {
      await withTimeout(
        mongoose.connection.db.command({ ping: 1 }),
        pingTimeoutMS,
        "MongoDB ping timed out in Worker.",
      );
      return mongoose.connection;
    } catch {
      await resetMongooseConnection();
      connectPromise = null;
    }
  }

  if (!connectPromise) {
    connectPromise = createConnectTask(env, "initial").catch((error) => {
      console.error("[db-connect-error] connection promise failed (initial):", error.message);
      resetMongooseConnection().catch(() => {});
      throw error;
    });
  }

  try {
    await connectPromise;
  } catch (initialError) {
    if (!retryOnceOnFail) {
      throw initialError;
    }

    console.warn("[db-connect] initial connect failed, retrying once:", initialError?.message || initialError);
    connectPromise = null;
    await resetMongooseConnection().catch(() => {});

    connectPromise = createConnectTask(env, "retry").catch((retryError) => {
      console.error("[db-connect-error] connection promise failed (retry):", retryError.message);
      resetMongooseConnection().catch(() => {});
      throw retryError;
    });

    await connectPromise;
  } finally {
    // Allow a fresh attempt on the next request if current state is unhealthy.
    if (mongoose.connection.readyState !== 1) {
      connectPromise = null;
    }
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB connection is not ready in Worker.");
  }

  return mongoose.connection;
}

export { mongoose };
