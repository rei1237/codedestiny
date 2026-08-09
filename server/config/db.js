const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

let __cdTriedServerEnvFallback = false;
let __cdConnectionPromise = null;

function normalizeMongoUri(rawUri) {
  let uri = String(rawUri || "").trim();
  if (!uri) return "";

  // .env 값이 따옴표까지 포함된 경우를 방어합니다.
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  // 흔한 오타를 최소 보정합니다.
  uri = uri.replace(/^mongodb\+srv:\/([^/])/, "mongodb+srv://$1");
  uri = uri.replace(/^mongodb:\/([^/])/, "mongodb://$1");
  uri = uri.replace(/^mongodb\+srv\/\//, "mongodb+srv://");
  uri = uri.replace(/^mongodb\/\//, "mongodb://");

  return uri;
}

function loadServerEnvFallbackIfNeeded() {
  if (__cdTriedServerEnvFallback) return;
  __cdTriedServerEnvFallback = true;

  // Next.js API route에서는 server/server.js의 dotenv 로딩이 실행되지 않으므로,
  // URI가 비어있을 때만 server/.env 및 루트 .env를 한 번 시도합니다.
  if (process.env.MONGO_URI || process.env.MONGODB_URI) return;

  const serverEnvPath = path.resolve(__dirname, "..", ".env");
  if (fs.existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath });
  }

  if (process.env.MONGO_URI || process.env.MONGODB_URI) return;

  const rootEnvPath = path.resolve(__dirname, "..", "..", ".env");
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }
}

async function connectDB() {
  loadServerEnvFallbackIfNeeded();

  const mongoUri = normalizeMongoUri(process.env.MONGO_URI || process.env.MONGODB_URI);

  if (!mongoUri) {
    throw new Error("MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다. server/.env 또는 루트 .env 파일을 확인하세요.");
  }

  if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
    throw new Error("MongoDB URI 형식이 올바르지 않습니다. mongodb:// 또는 mongodb+srv:// 로 시작해야 합니다.");
  }

  if (mongoUri.includes("<") || mongoUri.includes(">")) {
    throw new Error(
      "MongoDB URI에 placeholder 꺾쇠(< >)가 남아 있습니다. 예시 표기(<db_password> 등)를 실제 값으로 바꾸고 꺾쇠를 제거하세요."
    );
  }

  if (mongoUri.includes("<db_password>")) {
    throw new Error(
      "MONGO_URI의 <db_password>를 MongoDB Atlas 실제 비밀번호로 교체하세요. " +
      "비밀번호에 @, #, % 등 특수문자가 있으면 URL 인코딩(encodeURIComponent)이 필요합니다."
    );
  }

  mongoose.set("strictQuery", true);

  // 이미 연결된 경우 즉시 반환
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // 연결 중인 경우 완료 대기
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  // 기존 연결 promise 재사용 (동시 요청 중복 연결 방지)
  if (__cdConnectionPromise) {
    try {
      await __cdConnectionPromise;
      return;
    } catch (e) {
      __cdConnectionPromise = null;
    }
  }

  const connectOptions = {
    dbName: process.env.MONGO_DB_NAME || undefined,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 20000,
    heartbeatFrequencyMS: 10000,
    maxPoolSize: 10,
    bufferCommands: true,
    autoIndex: process.env.NODE_ENV !== "production",
  };

  __cdConnectionPromise = mongoose.connect(mongoUri, connectOptions);

  try {
    await __cdConnectionPromise;
    console.log("[DB] MongoDB 연결됨");

    // 연결 끊어지면 캐시 초기화하여 재연결 가능하게 함
    mongoose.connection.once("disconnected", () => {
      __cdConnectionPromise = null;
    });
    mongoose.connection.once("error", () => {
      __cdConnectionPromise = null;
    });
  } catch (firstErr) {
    __cdConnectionPromise = null;
    console.warn("[DB] 첫 연결 실패, 재시도 중...", firstErr?.message);

    // cold start 재시도 1회
    await new Promise((r) => setTimeout(r, 1500));
    __cdConnectionPromise = mongoose.connect(mongoUri, connectOptions);
    try {
      await __cdConnectionPromise;
      console.log("[DB] MongoDB 재연결 성공");
      mongoose.connection.once("disconnected", () => {
        __cdConnectionPromise = null;
      });
      mongoose.connection.once("error", () => {
        __cdConnectionPromise = null;
      });
    } catch (retryErr) {
      __cdConnectionPromise = null;
      throw retryErr;
    }
  }
}

module.exports = connectDB;
