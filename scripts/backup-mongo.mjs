/**
 * MongoDB 전량 백업 — 읽기 전용(DB 쓰기 없음).
 *
 * 레포에 백업 도구가 하나도 없어(mongodump 참조 0건) 데이터 마이그레이션의 롤백 근거가
 * 없었다. 이 스크립트가 그 자리를 메운다. 컬렉션별 JSON 파일 + manifest.json 을 남긴다.
 *
 * 🔴 산출물에는 이메일·전화번호·비밀번호 해시 등 개인정보가 그대로 들어간다.
 *    - 레포 안에 둘 경우 반드시 `backups/` 아래로 (.gitignore 에 등록돼 있다).
 *    - 보관 위치·기간을 정해 두고, 마이그레이션 검증이 끝나면 파기할 것.
 *
 * 저장 형식은 mongodump 의 BSON 이 아니라 EJSON(Extended JSON) 이다. ObjectId·Date 는
 * `{"$oid":...}` / `{"$date":...}` 로 보존되므로 같은 값으로 되돌릴 수 있다.
 *
 * 실행:
 *   node scripts/backup-mongo.mjs --out backups/mongodb/20260812
 *   node scripts/backup-mongo.mjs --out backups/mongodb/users-only --collections users,payments
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { config } from "dotenv";
import { EJSON } from "bson";
import { connectDb, mongoose } from "../worker/lib/db.js";

// quiet: dotenv 배너가 stdout 으로 나가 진행 출력과 섞인다.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const OUT_DIR = String(argValue("--out", "") || "");
const ONLY = String(argValue("--collections", "") || "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const MAX_TIME_MS = Math.max(1000, Math.floor(Number(argValue("--max-time-ms", 300000))) || 300000);

if (!OUT_DIR) {
  console.error("❌ --out <dir> 이 필요합니다. 예: node scripts/backup-mongo.mjs --out backups/mongodb/20260812");
  process.exit(1);
}

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
  MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
  MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
  MONGO_WORKER_CONNECT_GUARD_MS: process.env.MONGO_WORKER_CONNECT_GUARD_MS || "15000",
  MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

/** 파일명에 쓸 수 없는 문자를 막는다. 컬렉션명은 신뢰 대상이 아니다. */
function safeFileName(name) {
  return String(name).replace(/[^A-Za-z0-9._-]/g, "_");
}

async function main() {
  console.log("🔌 MongoDB 연결 중...");
  await connectDb(env);
  const db = mongoose.connection.db;
  console.log(`✅ 연결 완료 (db: ${db.databaseName})\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const entries = (await db.listCollections().toArray())
    .filter((entry) => !String(entry.name || "").startsWith("system."))
    .filter((entry) => String(entry.type || "collection") === "collection")
    .filter((entry) => (ONLY.length ? ONLY.includes(String(entry.name)) : true))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  if (ONLY.length) {
    const found = new Set(entries.map((entry) => String(entry.name)));
    const missing = ONLY.filter((name) => !found.has(name));
    if (missing.length) {
      console.error(`❌ 존재하지 않는 컬렉션: ${missing.join(", ")}`);
      process.exitCode = 1;
      return;
    }
  }

  const startedAt = new Date().toISOString();
  const files = [];
  let totalDocuments = 0;

  for (const entry of entries) {
    const name = String(entry.name);
    const coll = db.collection(name);
    const docs = await coll.find({}, { maxTimeMS: MAX_TIME_MS }).toArray();
    const fileName = `${safeFileName(name)}.json`;
    const text = `${EJSON.stringify(docs, { relaxed: false })}\n`;
    writeFileSync(path.join(OUT_DIR, fileName), text, "utf8");

    const indexes = await coll.listIndexes().toArray();
    files.push({
      collection: name,
      file: fileName,
      documentCount: docs.length,
      byteLength: Buffer.byteLength(text, "utf8"),
      sha256: createHash("sha256").update(text).digest("hex"),
      indexes,
    });
    totalDocuments += docs.length;
    console.log(`  · ${name.padEnd(38)} ${String(docs.length).padStart(7)}건 → ${fileName}`);
  }

  const manifest = {
    format: "ejson-canonical",
    database: db.databaseName,
    startedAt,
    finishedAt: new Date().toISOString(),
    collectionCount: files.length,
    totalDocuments,
    files,
  };
  writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`\n💾 백업 완료 — 컬렉션 ${files.length}개 / 문서 ${totalDocuments.toLocaleString()}건`);
  console.log(`   위치: ${path.resolve(OUT_DIR)}`);
  console.log("🔴 개인정보가 포함된 산출물입니다. 레포 밖에 보관하고 검증 후 파기하세요.");
}

main()
  .catch((error) => {
    console.error("❌ 백업 실패:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB 연결 종료");
  });
