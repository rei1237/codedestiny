/**
 * Self-contained MongoDB connection for Next.js App Router / CF Workers.
 * Does NOT import from server/ to avoid OpenNext bundling issues.
 */
import mongoose from "mongoose";

let _connectionPromise = null;

function normalizeUri(raw) {
  let uri = String(raw || "").trim();
  if (!uri) return "";
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }
  uri = uri.replace(/^mongodb\+srv:\/([^/])/, "mongodb+srv://$1");
  uri = uri.replace(/^mongodb:\/([^/])/, "mongodb://$1");
  return uri;
}

export async function dbConnect() {
  const uri = normalizeUri(process.env.MONGO_URI || process.env.MONGODB_URI);
  if (!uri) throw new Error("MONGO_URI 환경변수가 설정되지 않았습니다.");

  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  if (_connectionPromise) {
    try { await _connectionPromise; return; } catch { _connectionPromise = null; }
  }

  mongoose.set("strictQuery", true);
  _connectionPromise = mongoose.connect(uri, {
    dbName: process.env.MONGO_DB_NAME || undefined,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 15000,
  });

  try {
    await _connectionPromise;
  } catch (err) {
    _connectionPromise = null;
    throw err;
  }
}
