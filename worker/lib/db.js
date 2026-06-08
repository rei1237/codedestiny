import mongoose from "mongoose";

import { getEnv, installProcessEnv } from "./env.js";

let connectPromise = null;

function extractDbNameFromUri(uri) {
  try {
    const parsed = new URL(String(uri || ""));
    const pathname = String(parsed.pathname || "").replace(/^\/+/, "");
    if (!pathname) return "";
    const firstSegment = pathname.split("/")[0] || "";
    return firstSegment.trim();
  } catch (e) {
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

  const uri = (
    getEnv(env, "MONGO_URI")
    || getEnv(env, "MONGODB_URI")
    || getEnv(env, "MONGO_URL")
    || getEnv(env, "DATABASE_URL")
  );
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
  } catch (e) {
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

function clampInt(rawValue, fallback, min, max) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return Math.max(min, Math.min(max, normalized));
}

function isTruthyLike(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function sleep(ms) {
  const wait = Number(ms);
  if (!Number.isFinite(wait) || wait <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, wait);
  });
}

export async function connectDb(env = {}) {
  installProcessEnv(env);

  const guardTimeoutMS = Number(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "8000"));
  const serverSelectionTimeoutMS = Number(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000"));
  const connectTimeoutMS = Number(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "5000"));
  const socketTimeoutMS = Number(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "15000"));
  const retryCount = clampInt(getEnv(env, "MONGO_WORKER_CONNECT_RETRIES", "2"), 2, 0, 4);
  const retryBaseDelayMS = clampInt(getEnv(env, "MONGO_WORKER_RETRY_DELAY_MS", "220"), 220, 0, 2000);

  if (mongoose.connection.readyState === 1) {
    const pingTimeoutMS = Number(getEnv(env, "MONGO_PING_TIMEOUT_MS", "2500"));
    try {
      await withTimeout(
        mongoose.connection.db.command({ ping: 1 }),
        pingTimeoutMS,
        "MongoDB ping timed out in Worker.",
      );
      return mongoose.connection;
    } catch (e) {
      await resetMongooseConnection();
      connectPromise = null;
    }
  }

  const uri = (
    getEnv(env, "MONGO_URI")
    || getEnv(env, "MONGODB_URI")
    || getEnv(env, "MONGO_URL")
    || getEnv(env, "DATABASE_URL")
  );
  if (!uri) {
    throw new Error("Mongo URI is required (MONGO_URI, MONGODB_URI, MONGO_URL, or DATABASE_URL) for Worker-native API routes.");
  }

  const ipFamilyRaw = String(getEnv(env, "MONGO_IP_FAMILY") || "").trim();
  const explicitIpFamily = Number(ipFamilyRaw);
  const familyCandidates = (() => {
    if (Number.isFinite(explicitIpFamily) && explicitIpFamily === 0) return [0];
    if (Number.isFinite(explicitIpFamily) && (explicitIpFamily === 4 || explicitIpFamily === 6)) {
      return isTruthyLike(getEnv(env, "MONGO_IP_FAMILY_AUTO_FALLBACK"))
        ? [explicitIpFamily, 0]
        : [explicitIpFamily];
    }
    return [4, 0];
  })();

  let lastError = null;

  for (let familyIndex = 0; familyIndex < familyCandidates.length; familyIndex += 1) {
    const ipFamily = familyCandidates[familyIndex];

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      if (!connectPromise) {
        console.log(`[db-connect] starting connection to mongodb... family=${ipFamily} attempt=${attempt + 1}/${retryCount + 1}`);
        const connectTask = mongoose.connect(uri, {
          dbName: resolveMongoDbName(env) || undefined,
          maxPoolSize: Number(getEnv(env, "MONGO_MAX_POOL_SIZE", "5")),
          serverSelectionTimeoutMS,
          connectTimeoutMS,
          socketTimeoutMS,
          bufferCommands: false,
          family: ipFamily,
          autoIndex: false,
        });

        connectTask
          .then(() => console.log(`[db-connect] mongodb connected successfully. family=${ipFamily}`))
          .catch((err) => {
            console.error(`[db-connect-error] mongodb connection failed. family=${ipFamily}:`, err.message);
          });

        connectPromise = withTimeout(
          connectTask,
          guardTimeoutMS,
          "MongoDB connection timed out in Worker.",
        ).catch(async (error) => {
          console.error(`[db-connect-error] connection promise failed. family=${ipFamily}:`, error.message);
          await resetMongooseConnection();
          throw error;
        });
      }

      try {
        await connectPromise;
      } catch (error) {
        lastError = error;
        connectPromise = null;
        await resetMongooseConnection();

        const isLastAttemptForFamily = attempt >= retryCount;
        const hasMoreFamilyCandidates = familyIndex < familyCandidates.length - 1;
        if (!isLastAttemptForFamily || hasMoreFamilyCandidates) {
          const delayMs = retryBaseDelayMS * (attempt + 1);
          await sleep(delayMs);
          continue;
        }
        break;
      } finally {
        if (mongoose.connection.readyState !== 1) {
          connectPromise = null;
        }
      }

      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }

      lastError = new Error("MongoDB connection is not ready in Worker.");
      connectPromise = null;
      await resetMongooseConnection();

      const isLastAttemptForFamily = attempt >= retryCount;
      const hasMoreFamilyCandidates = familyIndex < familyCandidates.length - 1;
      if (!isLastAttemptForFamily || hasMoreFamilyCandidates) {
        const delayMs = retryBaseDelayMS * (attempt + 1);
        await sleep(delayMs);
        continue;
      }
    }
  }

  if (lastError) throw lastError;
  throw new Error("MongoDB connection is not ready in Worker.");
}

export { mongoose };
