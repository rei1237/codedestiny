const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

let __cdTriedServerEnvFallback = false;

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

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGO_DB_NAME || undefined,
  });

  console.log("[DB] MongoDB 연결됨");
}

module.exports = connectDB;
