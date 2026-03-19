const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

let __cdTriedServerEnvFallback = false;

function loadServerEnvFallbackIfNeeded() {
  if (__cdTriedServerEnvFallback) return;
  __cdTriedServerEnvFallback = true;

  // Next.js API route에서는 server/server.js의 dotenv 로딩이 실행되지 않으므로,
  // MONGO_URI가 비어있을 때만 server/.env를 한 번 시도해 기존 타로 설정을 재사용합니다.
  if (process.env.MONGO_URI) return;

  const serverEnvPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(serverEnvPath)) return;

  dotenv.config({ path: serverEnvPath });
}

async function connectDB() {
  loadServerEnvFallbackIfNeeded();

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI 환경변수가 필요합니다. server/.env 파일을 확인하세요.");
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
