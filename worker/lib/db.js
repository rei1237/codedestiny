import mongoose from "mongoose";

import { getEnv, installProcessEnv } from "./env.js";

let connectPromise = null;

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function connectDb(env = {}) {
  installProcessEnv(env);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI");
  if (!uri) {
    throw new Error("MONGO_URI or MONGODB_URI is required for Worker-native API routes.");
  }

  if (!connectPromise) {
    const serverSelectionTimeoutMS = Number(getEnv(env, "MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000"));
    const connectTimeoutMS = Number(getEnv(env, "MONGO_CONNECT_TIMEOUT_MS", "5000"));
    const socketTimeoutMS = Number(getEnv(env, "MONGO_SOCKET_TIMEOUT_MS", "15000"));
    const guardTimeoutMS = Number(getEnv(env, "MONGO_WORKER_CONNECT_GUARD_MS", "8000"));

    const mongooseConnect = mongoose.connect(uri, {
      dbName: getEnv(env, "MONGO_DB_NAME") || undefined,
      maxPoolSize: Number(getEnv(env, "MONGO_MAX_POOL_SIZE", "5")),
      serverSelectionTimeoutMS,
      connectTimeoutMS,
      socketTimeoutMS,
      bufferCommands: false,
      family: Number(getEnv(env, "MONGO_IP_FAMILY", "4")),
    });

    mongooseConnect.catch(() => {});

    connectPromise = withTimeout(
      mongooseConnect,
      guardTimeoutMS,
      "MongoDB connection timed out in Worker.",
    ).catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
  return mongoose.connection;
}

export { mongoose };
