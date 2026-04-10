/**
 * Vertex AI 서비스 계정 → 환경 변수 자동 설정 스크립트
 *
 * 실행:  node _setup_vertex_secrets.mjs
 *
 * 수행 내용:
 *   1. key/ 폴더의 JSON 파일을 읽어 project_id / client_email / private_key 추출
 *   2. .env.local 생성 (로컬 Next.js 개발용)
 *   3. Cloudflare Pages 시크릿 등록 (wrangler)
 *   4. Windows 사용자 환경 변수 갱신
 *
 * ⚠️  이 스크립트 자체는 키 값을 화면에 출력하지 않습니다.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY_DIR = join(ROOT, "key");
const ENV_LOCAL = join(ROOT, ".env.local");

// ─── 1. 키 파일 찾기 ──────────────────────────────────────────────
const keyFiles = readdirSync(KEY_DIR).filter(
  (f) => f.startsWith("vertex-") && f.endsWith(".json")
);
if (!keyFiles.length) {
  console.error("❌ key/ 폴더에 vertex-*.json 파일이 없습니다.");
  process.exit(1);
}
const keyPath = join(KEY_DIR, keyFiles[keyFiles.length - 1]); // 가장 최신 파일
const sa = JSON.parse(readFileSync(keyPath, "utf8"));

const PROJECT_ID    = sa.project_id;
const CLIENT_EMAIL  = sa.client_email;
// \n 이스케이프를 유지해야 wrangler secret에서 올바르게 저장됨
const PRIVATE_KEY   = sa.private_key;
const LOCATION      = "us-central1";

console.log(`✅ 서비스 계정 로드: ${keyFiles[keyFiles.length - 1]}`);
console.log(`   프로젝트: ${PROJECT_ID}`);
console.log(`   이메일 앞 8자: ${CLIENT_EMAIL.slice(0, 8)}...`);

// ─── 2. .env.local 생성/갱신 ─────────────────────────────────────
const envContent = [
  "# Vertex AI 서비스 계정 (로컬 개발용 — .gitignore에서 제외됨)",
  `VERTEX_PROJECT_ID=${PROJECT_ID}`,
  `VERTEX_LOCATION=${LOCATION}`,
  `VERTEX_SA_CLIENT_EMAIL=${CLIENT_EMAIL}`,
  // private_key의 개행을 \\n 이스케이프로 저장
  `VERTEX_SA_PRIVATE_KEY="${PRIVATE_KEY.replace(/\n/g, "\\n")}"`,
  "",
].join("\n");

writeFileSync(ENV_LOCAL, envContent, "utf8");
console.log("✅ .env.local 생성 완료");

// ─── 3. Cloudflare Pages 시크릿 등록 ──────────────────────────────
const PROJECT_NAME = "code-destiny-web"; // Cloudflare Pages 프로젝트명

function wranglerSecret(name, value) {
  try {
    // stdin으로 값을 전달해 터미널에 노출 방지
    execSync(`echo "${value.replace(/"/g, '\\"')}" | npx.cmd wrangler pages secret put "${name}" --project-name "${PROJECT_NAME}"`, {
      stdio: ["pipe", "pipe", "pipe"],
      input: value,
      shell: true,
      cwd: ROOT,
    });
    console.log(`✅ Cloudflare Secret 등록: ${name}`);
  } catch (e) {
    // wrangler 미로그인 등 → 수동 안내
    console.warn(`⚠️  ${name} 자동 등록 실패 (수동 등록 필요): ${e.message?.slice(0, 80)}`);
  }
}

// wrangler pages secret put은 stdin 방식이 지원되지 않으므로
// 임시 파일에 값을 쓰고 --env-file 식으로 처리하는 대신
// 각 값을 wrangler secret put의 stdin(--)으로 파이핑
function setSecret(name, value) {
  try {
    const tmp = join(ROOT, `_tmp_secret_${name}.txt`);
    writeFileSync(tmp, value, "utf8");
    execSync(
      `Get-Content "${tmp}" | npx.cmd wrangler pages secret put "${name}" --project-name "${PROJECT_NAME}"`,
      { shell: "powershell.exe", stdio: "pipe", cwd: ROOT }
    );
    // 임시 파일 즉시 삭제
    try { execSync(`Remove-Item -Force "${tmp}"`, { shell: "powershell.exe" }); } catch {} // eslint-disable-line
    console.log(`✅ Cloudflare Secret 등록: ${name}`);
  } catch (e) {
    // 임시 파일 정리 시도
    try { execSync(`Remove-Item -Force "${join(ROOT, `_tmp_secret_${name}.txt`)}"`, { shell: "powershell.exe" }); } catch {} // eslint-disable-line
    console.warn(`⚠️  ${name} 자동 등록 실패: ${e.message?.slice(0, 120)}`);
    console.warn(`   → Cloudflare Dashboard > code-destiny-web > Settings > Environment Variables 에서 수동 등록`);
  }
}

console.log("\n─── Cloudflare Pages 시크릿 등록 중 ───────────────────────");
setSecret("VERTEX_PROJECT_ID",   PROJECT_ID);
setSecret("VERTEX_LOCATION",     LOCATION);
setSecret("VERTEX_SA_CLIENT_EMAIL", CLIENT_EMAIL);
setSecret("VERTEX_SA_PRIVATE_KEY",  PRIVATE_KEY);

// ─── 4. 완료 ──────────────────────────────────────────────────────
console.log(`
────────────────────────────────────────────────────
✅ 설정 완료 요약
  • .env.local      → 로컬 개발에서 즉시 사용 가능
  • Cloudflare      → 자동 등록 시도 (실패 시 위 경고 확인)
  • 환경 변수 이름:
      VERTEX_PROJECT_ID
      VERTEX_LOCATION
      VERTEX_SA_CLIENT_EMAIL
      VERTEX_SA_PRIVATE_KEY

  • 서비스가 시작되면 Vertex AI → GEMINI_API_KEY 순으로 자동 폴백
────────────────────────────────────────────────────
`);
