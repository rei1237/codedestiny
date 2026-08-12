/**
 * 데이터 마이그레이션의 변경 전 이미지(before-image) 기록.
 *
 * 전량 백업(scripts/backup-mongo.mjs)이 최후 안전망이라면, 이건 정밀 롤백 근거다.
 * "이 마이그레이션이 어떤 문서의 어떤 값을 무엇으로 바꿨는가"만 담으므로, 되돌릴 때
 * 다른 세션이 그 사이 바꾼 값까지 함께 덮어쓰는 사고를 피할 수 있다.
 *
 * 🔴 산출물에는 개인정보(이메일 등)가 들어갈 수 있다. 기본 출력 경로가 backups/ 아래인
 *    이유이며(.gitignore 등록됨), 검증이 끝나면 파기한다.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * @param {string} operationId 마이그레이션 식별자. 파일명에 그대로 쓰인다.
 * @param {Array<object>} rows  문서별 변경 전 값. 최소한 _id 를 포함해야 롤백이 가능하다.
 * @param {object} [meta]       실행 컨텍스트(대상 수, 필터 등). 사람이 읽을 요약.
 * @param {string} [outDir]     기본 backups/migrations
 * @returns {string} 기록한 파일 경로
 */
export function writeBeforeImage(operationId, rows, meta = {}, outDir = "backups/migrations") {
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${operationId}.before.json`);
  const payload = {
    operationId,
    // Date.now() 를 파일명이 아니라 본문에만 쓴다 — 재실행 시 파일이 갈라지면 롤백 근거가 흩어진다.
    recordedAt: new Date().toISOString(),
    documentCount: rows.length,
    meta,
    documents: rows,
  };
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path.resolve(file);
}

/** 모든 마이그레이션이 같은 Mongo 연결 옵션을 쓰도록 한 곳에 모은다. */
export function buildMongoEnv() {
  return {
    MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.DB_NAME || "",
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || process.env.DB_NAME || "",
    MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
    MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
    MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
    MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
    MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
    MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
  };
}

export function requireMongoUri(env) {
  if (!env.MONGO_URI && !env.MONGODB_URI) {
    console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
    process.exit(1);
  }
}

export function maskEmail(value) {
  const [local, domain] = String(value || "").split("@");
  if (!domain) return "(invalid)";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}
