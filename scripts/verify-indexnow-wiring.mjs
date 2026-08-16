#!/usr/bin/env node
/**
 * IndexNow 배선 가드.
 *
 * 이 가드가 없으면 조용히 죽는 방식이 셋이다. 셋 다 **에러를 남기지 않는다**:
 *
 *  1. 실행 경로가 없다. 2026-08-16 이전이 정확히 그 상태였다 — `scripts/indexnow-submit.ts:3` 이
 *     `npm run seo:indexnow` 를 안내하는데 그 스크립트가 package.json 에 없었다. 아무도 못 알아챘다.
 *  2. 제출 소스가 sitemap.xml 이 아니다. `lib/seo-site-urls.ts` 는 실제 사이트맵과 별개인 병렬
 *     목록이라(실측: 429 vs 95) 사이트맵이 일부러 뺀 noindex URL 을 검색엔진에 제출하게 된다.
 *  3. 키가 어긋난다. 키 회전 때 `lib/indexnow.ts` 와 `public/<key>.txt` 중 한쪽만 바꾸면
 *     IndexNow 는 403 만 돌려주고 색인 신호는 그냥 사라진다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const failures = [];

function read(rel) {
  const abs = resolve(rootDir, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function fail(message) {
  failures.push(message);
}

// 1) 실행 경로가 실재하는가
const pkg = JSON.parse(read("package.json") || "{}");
const submitScript = pkg.scripts?.["seo:indexnow"];
if (!submitScript) {
  fail("package.json 에 seo:indexnow 스크립트가 없습니다 — 제출 경로가 0입니다.");
} else {
  const referenced = /(scripts\/[\w.-]+\.mjs)/.exec(submitScript);
  if (!referenced) {
    fail(`seo:indexnow 가 scripts/*.mjs 를 가리키지 않습니다: ${submitScript}`);
  } else if (!existsSync(resolve(rootDir, referenced[1]))) {
    fail(`seo:indexnow 가 가리키는 ${referenced[1]} 파일이 없습니다.`);
  }
}

// 2) 제출 소스가 sitemap.xml 인가
const submitter = read("scripts/indexnow-submit.mjs");
if (!submitter) {
  fail("scripts/indexnow-submit.mjs 가 없습니다.");
} else {
  if (!submitter.includes("sitemap.xml")) {
    fail("indexnow-submit.mjs 가 sitemap.xml 을 읽지 않습니다 — 제출 목록의 정본은 사이트맵입니다.");
  }
  // 🔴 주석에서 "쓰지 말 것" 으로 언급하는 것과 실제 import 를 구분한다.
  if (/^\s*import[^\n]*seo-site-urls/m.test(submitter) || /require\(["'][^"']*seo-site-urls/.test(submitter)) {
    fail("indexnow-submit.mjs 가 lib/seo-site-urls 를 사용합니다 — 사이트맵과 별개인 병렬 목록입니다.");
  }
  if (!submitter.includes("--dry-run")) {
    fail("indexnow-submit.mjs 에 --dry-run 이 없습니다 — 외부 POST 를 리허설할 수단이 있어야 합니다.");
  }
}

// 3) 키 정본과 키 파일이 일치하는가
const contract = read("lib/indexnow.ts");
if (!contract) {
  fail("lib/indexnow.ts 가 없습니다 — 키·호스트 정본입니다(임포터가 0이어도 삭제 금지).");
} else {
  const keyMatch = /INDEXNOW_KEY\s*=\s*"([^"]+)"/.exec(contract);
  if (!keyMatch) {
    fail("lib/indexnow.ts 에서 INDEXNOW_KEY 를 찾지 못했습니다.");
  } else {
    const key = keyMatch[1];
    const keyFileRel = `public/${key}.txt`;
    const keyFile = read(keyFileRel);
    if (keyFile === null) {
      fail(`키 파일 ${keyFileRel} 이 없습니다 — 소유권 확인에 실패해 전량 403 이 됩니다.`);
    } else if (keyFile.trim() !== key) {
      fail(`${keyFileRel} 의 내용이 INDEXNOW_KEY 와 다릅니다 (파일 "${keyFile.trim()}").`);
    }
  }
}

// 4) 배포 워크플로가 실제로 부르는가 — 그리고 실패해도 배포를 되돌리지 않는가
const workflowRel = ".github/workflows/cloudflare-pages-deploy.yml";
const workflow = read(workflowRel);
if (!workflow) {
  fail(`${workflowRel} 이 없습니다.`);
} else if (!workflow.includes("seo:indexnow")) {
  fail(`${workflowRel} 이 seo:indexnow 를 부르지 않습니다 — 배포 후 제출이 일어나지 않습니다.`);
} else {
  // 🔴 continue-on-error 가 없으면 IndexNow 장애가 deploy-safe 를 통해 멀쩡한 배포를 롤백시킨다.
  const stepStart = workflow.indexOf("seo:indexnow");
  const stepBlock = workflow.slice(Math.max(0, stepStart - 600), stepStart + 200);
  if (!stepBlock.includes("continue-on-error: true")) {
    fail(`${workflowRel} 의 IndexNow 스텝에 continue-on-error: true 가 없습니다 — 제출 실패가 배포를 롤백시킵니다.`);
  }
}

if (failures.length > 0) {
  console.error("[verify:indexnow-wiring] 실패:");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("[verify:indexnow-wiring] OK");
