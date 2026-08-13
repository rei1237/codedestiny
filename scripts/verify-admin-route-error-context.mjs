#!/usr/bin/env node
/**
 * 관리자 라우트의 `handleRouteError(error)` 가 context 없이 호출되는 것을 막는다.
 *
 * 무슨 일이 있었나: worker/routes/admin.js 의 최종 catch 가 `handleRouteError(error)` 였다.
 * context 가 없으면 http.js 가 requestMeta 를 못 구해 응답 헤더 X-Request-ID 가 문자열 "unknown" 이
 * 되고, `[worker-route-error]` 로그의 route / requestPath 가 빈 값이 된다. 그래서 관리자 화면이
 * 503 을 뱉어도 **어느 엔드포인트의 어떤 에러인지 특정할 수 없었다** — admin-feedback.js 만 context 를
 * 넘겨 그쪽 실패만 추적이 됐다. 정적 검사인 이유: 이 결함은 응답이 정상 형태라 테스트로는 안 잡히고,
 * 관측이 필요한 순간(장애 중)에만 드러난다.
 *
 * resolveErrorStage 도 context.trace 를 읽어야 db-op-timeout / db-op-admission 을 구분하므로,
 * context 누락은 곧 X-CD-Error-Stage 의 정확도 손실이기도 하다.
 *
 * 사용: node scripts/verify-admin-route-error-context.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTE_DIR = "worker/routes";
const TARGET_PATTERN = /^admin.*\.js$/;

/** 인자가 하나뿐인 handleRouteError 호출. 두 번째 인자가 있으면 쉼표가 잡힌다. */
const CONTEXT_LESS_CALL = /handleRouteError\(\s*([A-Za-z_$][\w$]*)\s*\)/g;

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const failures = [];

let entries;
try {
  entries = readdirSync(ROUTE_DIR);
} catch (error) {
  console.error(`❌ ${ROUTE_DIR} 를 읽지 못했습니다: ${error?.message || error}`);
  process.exit(1);
}

const targets = entries.filter((name) => TARGET_PATTERN.test(name)).sort();
if (targets.length === 0) {
  console.error(`❌ ${ROUTE_DIR} 에서 admin*.js 를 하나도 못 찾았습니다 — 경로 규칙이 바뀌었는지 확인하세요.`);
  process.exit(1);
}

for (const name of targets) {
  const path = join(ROUTE_DIR, name);
  const source = stripComments(readFileSync(path, "utf8"));
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    CONTEXT_LESS_CALL.lastIndex = 0;
    let match;
    while ((match = CONTEXT_LESS_CALL.exec(line)) !== null) {
      failures.push({ path, line: index + 1, snippet: line.trim(), variable: match[1] });
    }
  });
}

if (failures.length > 0) {
  console.error("❌ context 없이 handleRouteError 를 호출하는 곳이 있습니다.");
  console.error("   { request, env, trace: { route, method, requestPath } } 를 함께 넘기세요.");
  console.error("   (정본 예시: worker/routes/admin-feedback.js 의 최종 catch)\n");
  for (const failure of failures) {
    console.error(`   ${failure.path}:${failure.line}  ${failure.snippet}`);
  }
  process.exit(1);
}

console.log(`✅ 관리자 라우트 ${targets.length}개 모두 handleRouteError 에 context 를 넘깁니다 (${targets.join(", ")})`);
