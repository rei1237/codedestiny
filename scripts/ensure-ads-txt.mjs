// ads.txt 자가치유/검증 가드 (AdSense 승인 필수 파일 보호).
//
// 배경: 과거 대량 "sync local development state" 커밋(2fbe1502)이 public/ads.txt를
// 실수로 삭제해 라이브에서 ads.txt가 사라진 사건이 있었다(719ad61e에서 복구).
// 재발을 원천 차단하기 위해, 모든 Cloudflare 빌드의 최초 단계(prebuild:cf)에서
// 이 스크립트를 실행해 root/public의 ads.txt를 하드코딩 레코드로 자가치유한다.
// git에서 지워져도 빌드 산출물에는 항상 존재하게 된다.
//
// 사용:
//   node scripts/ensure-ads-txt.mjs            # 누락/불일치 시 재기록 (자가치유)
//   node scripts/ensure-ads-txt.mjs --check    # 검증만; 불일치 시 큰 소리로 실패(exit 1)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// verify-adsense-readiness.mjs 와 동일한 레코드(단일 정본 값).
const ADS_TXT_RECORD = "google.com, pub-9863227498729828, DIRECT, f08c47fec0942fa0";
const ADS_TXT_CONTENT = `${ADS_TXT_RECORD}\n`;

const rootDir = process.cwd();
const targets = [resolve(rootDir, "ads.txt"), resolve(rootDir, "public", "ads.txt")];

const checkOnly = process.argv.slice(2).includes("--check");

function hasRecord(path) {
  if (!existsSync(path)) return false;
  try {
    return readFileSync(path, "utf8").includes(ADS_TXT_RECORD);
  } catch {
    return false;
  }
}

const problems = [];

for (const path of targets) {
  if (hasRecord(path)) continue;

  if (checkOnly) {
    problems.push(existsSync(path) ? `${path}: AdSense 퍼블리셔 레코드 누락/불일치` : `${path}: 파일 없음`);
    continue;
  }

  writeFileSync(path, ADS_TXT_CONTENT, "utf8");
  console.log(`[ensure-ads-txt] 재기록: ${path}`);
}

if (checkOnly) {
  if (problems.length > 0) {
    console.error("[ensure-ads-txt] ads.txt 검증 실패 — ads.txt는 절대 삭제/변경 금지 파일입니다:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(`  기대 레코드: ${ADS_TXT_RECORD}`);
    console.error("  복구: node scripts/ensure-ads-txt.mjs 실행 후 root/public의 ads.txt를 커밋하세요.");
    process.exit(1);
  }
  console.log("[ensure-ads-txt] ads.txt 검증 통과 (root/public 모두 레코드 존재)");
}
