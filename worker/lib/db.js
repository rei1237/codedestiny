import mongoose from "mongoose";

import { getEnv, installProcessEnv } from "./env.js";

let connectPromise = null;
// 마지막으로 연결 건강을 확인한 시각(ping 성공 또는 신규 연결 성공).
// 웜 커넥션 재사용 시 매 요청 ping 왕복을 피하기 위해 유휴 임계 이내면 ping을 생략한다.
let lastHealthyAt = 0;

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

function clampTimeoutMs(rawValue, fallback, min, max) {
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

  const guardTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "10000"), 10000, 3000, 20000);
  const serverSelectionTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"), 8000, 2000, 15000);
  const connectTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "8000"), 8000, 2000, 15000);
  const socketTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "20000"), 20000, 5000, 45000);
  const retryCount = clampInt(getEnv(env, "MONGO_WORKER_CONNECT_RETRIES", "2"), 2, 0, 4);
  const retryBaseDelayMS = clampInt(getEnv(env, "MONGO_WORKER_RETRY_DELAY_MS", "220"), 220, 0, 2000);

  if (mongoose.connection.readyState === 1) {
    // 최근에 건강을 확인했다면(유휴 임계 이내) ping 왕복을 생략해 요청 지연을 줄인다.
    const pingMinIntervalMS = clampTimeoutMs(getEnv(env, "MONGO_PING_MIN_INTERVAL_MS", "20000"), 20000, 0, 60000);
    if (lastHealthyAt && Date.now() - lastHealthyAt < pingMinIntervalMS) {
      return mongoose.connection;
    }
    const pingTimeoutMS = clampTimeoutMs(getEnv(env, "MONGO_PING_TIMEOUT_MS", "3500"), 3500, 1000, 10000);
    try {
      await withTimeout(
        mongoose.connection.db.command({ ping: 1 }),
        pingTimeoutMS,
        "MongoDB ping timed out in Worker.",
      );
      lastHealthyAt = Date.now();
      return mongoose.connection;
    } catch (e) {
      await resetMongooseConnection();
      connectPromise = null;
      lastHealthyAt = 0;
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
        const connectOptions = {
          dbName: resolveMongoDbName(env) || undefined,
          maxPoolSize: Number(getEnv(env, "MONGO_MAX_POOL_SIZE", "5")),
          serverSelectionTimeoutMS,
          connectTimeoutMS,
          socketTimeoutMS,
          bufferCommands: false,
          autoIndex: false,
        };
        if (ipFamily === 4 || ipFamily === 6) {
          connectOptions.family = ipFamily;
        }

        const connectTask = mongoose.connect(uri, connectOptions);

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
        lastHealthyAt = Date.now();
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

// stateless Worker에서 웜 연결을 재사용하다 백그라운드 모니터 타임아웃 등으로 풀이 초기화되면
// (MongoPoolClearedError) 확립된 풀 위에서 실행되던 쿼리가 실패한다. 이런 '일시적' 에러는
// 재연결 후 재시도하면 대개 성공하므로 여기서 판별한다.
export function isTransientMongoError(error) {
  if (!error) return false;
  const name = String(error.name || "");
  if (
    name === "MongoPoolClearedError"
    || name === "PoolClearedError"
    || name === "MongoNetworkError"
    || name === "MongoNetworkTimeoutError"
    || name === "MongoServerSelectionError"
  ) {
    return true;
  }
  const message = String(error.message || "");
  return /pool .*was cleared|was cleared because|connection .*timed out|socket .*timed out|network (error|timeout)|ECONNRESET|EPIPE|ETIMEDOUT|server selection timed out|connection is not ready/i.test(message);
}

// 일시적 Mongo 에러에 대해 연결을 재확인/재수립하고 작업을 재시도한다.
// connectDb는 '연결 수립'만 재시도할 뿐 확립된 풀에서 실행되는 쿼리 실패는 재시도하지 않으므로,
// 이용권/구독 조회 같은 핫 리드 경로를 이 헬퍼로 감싸 풀 초기화 순간에도 정확한 결과를 돌려준다.
export async function withMongoRetry(env = {}, operation, options = {}) {
  if (typeof operation !== "function") {
    throw new TypeError("withMongoRetry(env, operation): operation must be a function");
  }
  const maxRetries = clampInt(
    options.retries != null ? options.retries : getEnv(env, "MONGO_OP_RETRIES", "1"),
    1,
    0,
    3,
  );
  const baseDelayMS = clampInt(
    options.baseDelayMS != null ? options.baseDelayMS : getEnv(env, "MONGO_OP_RETRY_DELAY_MS", "120"),
    120,
    0,
    1000,
  );
  // 각 시도(connectDb+operation)를 setTimeout 기반 시간 상한으로 감싼다. 대기 중인 타이머가 항상
  // 존재하므로, 죽은 소켓에서 Mongo 작업 프로미스가 멈춰도 Cloudflare의 "hung"(대기 I/O 없는 미해결
  // 프로미스) 데드락 감지가 발동하지 않는다. 상한 초과 시 즉시 예외를 던져 호출부의 degraded 폴백이
  // 빠르게 응답하게 하고(재시도로 또 hang을 만들지 않도록 타임아웃은 재시도하지 않는다).
  const attemptTimeoutMS = clampTimeoutMs(
    options.attemptTimeoutMS != null ? options.attemptTimeoutMS : getEnv(env, "MONGO_OP_ATTEMPT_TIMEOUT_MS", "7000"),
    7000,
    1500,
    12000,
  );

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await withTimeout(
        (async () => {
          await connectDb(env);
          return await operation();
        })(),
        attemptTimeoutMS,
        "MongoDB operation timed out in Worker.",
      );
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isTransientMongoError(error)) throw error;
      // 다음 시도에서 강제로 재연결하도록 웜 상태를 무효화한다.
      lastHealthyAt = 0;
      connectPromise = null;
      await resetMongooseConnection();
      await sleep(baseDelayMS * (attempt + 1));
    }
  }
  throw lastError;
}

export { mongoose };
