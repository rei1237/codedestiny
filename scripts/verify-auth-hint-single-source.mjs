#!/usr/bin/env node
/**
 * verify-auth-hint-single-source
 *
 * 왜 필요한가 — "로그인 힌트가 있는가"(서버에 물어볼지 말지를 정하는 단축 경로)를 정적 셸
 * (index.html, 2곳) · React(user-session-cache.ts · billing-client.ts) · 독립 정적 페이지
 * (destiny-profile.js) 다섯 곳이 각자 손으로 localStorage/쿠키를 파싱해 판정하다가 서로 조금씩
 * 갈라졌다. 힌트가 잘못 false 로 나오면 일부 소비처는 서버를 부르지 않고 게스트 응답을 합성하므로,
 * 실제로는 로그인된 사용자가 로그아웃된 것처럼 보이는 장애가 난 적이 있다
 * (worker/routes/auth.js 의 appendAuthRoleCookie 주석 참고).
 *
 * 그래서 판정 로직을 js/core/auth-hint.js 단일 정본(window.__cdAuthHint)으로 옮겼다. 이 가드는
 * 그 정본이 다시 사본으로 갈라지는 것을 막는다 — 소비처가 __cdAuthHint 를 참조하지 않고
 * localStorage.getItem("fortune_auth_token") 류의 원시 스토리지/쿠키 파싱을 새로 정의하면 실패한다.
 *
 * 블랙리스트가 아니라 "정본을 실제로 참조하는가"를 보는 화이트리스트 검사다.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function read(relPath) {
  return readFileSync(path.join(repoRoot, relPath), "utf8");
}

/** name(...) { ... } 형태 함수 하나를 중괄호 균형으로 잘라낸다(정규식 . 하나로는 중첩을 못 자른다). */
function extractFunctionBody(source, functionName) {
  const marker = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const startMatch = marker.exec(source);
  if (!startMatch) return null;
  const braceOpen = source.indexOf("{", startMatch.index);
  if (braceOpen === -1) return null;
  let depth = 0;
  for (let i = braceOpen; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceOpen, i + 1);
    }
  }
  return null;
}

const RAW_STORAGE_PATTERNS = [
  /localStorage\s*\.\s*getItem\(\s*['"]fortune_auth_token['"]/,
  /sessionStorage\s*\.\s*getItem\(\s*['"]fortune_auth_token['"]/,
  /document\.cookie[\s\S]{0,80}fortune_auth_role/,
];

const CANONICAL_REF = /__cdAuthHint/;

function checkFunction(relPath, source, functionName) {
  const body = extractFunctionBody(source, functionName);
  if (!body) {
    fail(relPath, `${functionName}() 를 찾을 수 없다 — 이름이 바뀌었으면 이 가드도 함께 갱신할 것.`);
    return;
  }
  if (!CANONICAL_REF.test(body)) {
    fail(relPath, `${functionName}() 가 __cdAuthHint(js/core/auth-hint.js 정본)를 참조하지 않는다.`);
  }
  for (const pattern of RAW_STORAGE_PATTERNS) {
    if (pattern.test(body)) {
      fail(relPath, `${functionName}() 안에 원시 스토리지/쿠키 파싱 사본이 되살아났다(${pattern}) — auth-hint.js 를 고칠 것.`);
    }
  }
}

const indexHtml = read("index.html");
checkFunction("index.html", indexHtml, "hasClientAuthHint");
checkFunction("index.html", indexHtml, "hasAuthSessionHint");

const destinyProfile = read("js/destiny-profile.js");
checkFunction("js/destiny-profile.js", destinyProfile, "_dpHasSessionHint");

const userSessionCache = read("app/_lib/user-session-cache.ts");
checkFunction("app/_lib/user-session-cache.ts", userSessionCache, "hasClientAuthHint");

const billingClient = read("app/_lib/billing-client.ts");
checkFunction("app/_lib/billing-client.ts", billingClient, "hasClientAuthSessionHint");

if (failures.length) {
  console.error("로그인 힌트 판정이 다시 사본으로 갈라졌습니다:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\n판정 로직은 js/core/auth-hint.js 단일 정본(window.__cdAuthHint.hasAuthHint())에만 둡니다.\n" +
      "소비처는 그 정본을 호출만 하고, 원시 storage/cookie 파싱을 다시 손으로 만들지 마세요.\n",
  );
  process.exit(1);
}

console.log("Auth hint single source OK (소비처 4개 검사).");
