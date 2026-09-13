#!/usr/bin/env node
/**
 * 세션 캐시 계약 가드 (Phase 4 D5.1 — 2026-09-13 신설).
 *
 * 실행: npm run verify:session-cache-contract
 *
 * 이 가드가 지키는 것 — `window.fetch` 를 감싸 사용자 접근 상태를 캐시하는 구현이 **두 벌**이다:
 *   ① 정적 셸: `index.html` 의 `<script id="cd-user-access-session-cache-*">` 인라인 블록
 *   ② React: `app/_lib/user-session-cache.ts` 의 `installUserAccessFetchCache`
 * 같은 `js/core/access-store.js` 호출이 런타임에 따라 어느 래퍼를 지나는지가 달라지므로, 두
 * 표(엔드포인트→캐시 종류, 종류→TTL)가 어긋나면 **같은 사용자·같은 기능·같은 순간에 답이 둘**이
 * 된다. 그 어긋남은 화면에서 "해금했는데 잠겨 보인다"로만 드러나 원인 추적이 극히 어렵다.
 *
 * 파일을 합치지 않는 이유: 셸 블록은 React 번들보다 먼저 실행돼야 하는 인라인 스크립트다(그게
 * 존재 이유다). 그래서 **구현은 둘로 두고 계약으로 묶는다.** 선례는 verify-pass-tier-policy.mjs —
 * 정본과 하드코딩 사본을 기계로 대조하는 방식.
 *
 * 무엇을 강제하는가:
 *   ① 엔드포인트→캐시 종류 매핑이 양쪽에서 같다(셸 전용 허용 목록 밖의 차이는 실패)
 *   ② 공통 캐시 종류의 **유효 TTL**(명시값 없으면 기본값)이 양쪽에서 같다
 *   ③ 기본 TTL(표에 없는 종류)이 양쪽에서 같다
 *   ④ React `CacheKind` 유니온이 실제 두 표가 쓰는 종류 집합과 일치한다
 *   ⑤ 모르는 경로는 양쪽 다 "캐시하지 않음"으로 떨어진다(셸 `''` / React `null`)
 *   ⑥ 설치 가드가 **양쪽 플래그를 다 본다**(D5.2). 두 구현이 같은 문서에 실리면 `window.fetch` 가
 *     2중으로 감싸져 TTL·in-flight 합류·무효화가 두 겹이 된다. 지금은 문서가 갈려 있어 발생하지
 *     않지만, "지금은 안 일어난다"는 가드를 빼는 이유가 못 된다(원칙 10).
 *
 * fail-closed 설계(코딩 원칙 10):
 *   - 인라인 블록·함수 4개 중 하나라도 못 찾으면 통과가 아니라 실패다. 정규식이 리팩터링에
 *     빗나갔을 때 "검사 대상이 0건이라 초록불"이 되는 것이 이 종류 가드의 전형적 사고다.
 *   - 조건문이 예상 모양(`x === '/api/…'` 의 `||` 나열)을 벗어나면 해석을 포기하고 실패한다.
 *     읽지 못한 분기를 "없는 것"으로 세지 않는다.
 *   - 엔트리 수 바닥을 둔다. 한쪽에서 엔드포인트가 사라지면 표가 조용히 줄지 않고 깨진다.
 *
 * 2차 대상(이번 범위 아님 — Phase 4 설계 D5.3):
 *   - 경로 B(`/api/billing/unlock-status`)의 층 차이. 셸에만 10초 API 결과 캐시
 *     (`getApiResultCacheTtl`)가 한 층 더 있다. 경로 A 수렴과 독립이라 이번엔 고치지 않는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHELL_FILE = "index.html";
const REACT_FILE = "app/_lib/user-session-cache.ts";

const failures = [];
const check = (label, ok, detail = "") => {
  if (ok) return;
  failures.push(detail ? `${label} — ${detail}` : label);
};
const fatal = (message) => {
  failures.push(message);
  report();
};

/** 셸에만 있어도 되는 엔드포인트. 이유를 적지 않은 예외는 두지 않는다. */
const SHELL_ONLY_ENDPOINTS = new Map([
  ["/api/version", { kind: "systemStatus", why: "셸만 쓰는 배포 버전 폴링. React 번들에는 소비자가 없다" }],
]);
/** React 에만 있어도 되는 엔드포인트. 현재 없음 — 생기면 여기에 사유와 함께 적는다. */
const REACT_ONLY_ENDPOINTS = new Map();

/** 표가 조용히 비는 것을 막는 바닥. 엔드포인트를 정말 줄일 때만 이 숫자도 함께 내린다. */
const FLOOR = { shellEndpoints: 12, reactEndpoints: 11, shellTtlKinds: 5, reactTtlKinds: 4 };

/* ── 소스에서 함수 본문을 떼어 온다 ────────────────────────────────────────
   문자열·주석 안의 중괄호에 속지 않도록 스캔한다. 못 떼면 실패다(해석 포기 ≠ 통과). */
function skipString(source, index) {
  const quote = source[index];
  for (let i = index + 1; i < source.length; i += 1) {
    if (source[i] === "\\") { i += 1; continue; }
    if (source[i] === quote) return i;
  }
  return -1;
}

function blockAfter(source, fromIndex) {
  const begin = source.indexOf("{", fromIndex);
  if (begin < 0) return null;
  let depth = 0;
  for (let i = begin; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "/") { i = source.indexOf("\n", i); if (i < 0) return null; continue; }
    if (ch === "/" && source[i + 1] === "*") { i = source.indexOf("*/", i); if (i < 0) return null; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { i = skipString(source, i); if (i < 0) return null; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return source.slice(begin + 1, i); }
  }
  return null;
}

function functionBody(source, pattern, label) {
  const match = pattern.exec(source);
  if (!match) fatal(`${label} 를 찾지 못했다 — 함수가 사라졌거나 모양이 바뀌었다(가드가 대상을 잃으면 실패다)`);
  const body = blockAfter(source, match.index + match[0].length - 1);
  if (body === null) fatal(`${label} 의 본문을 닫는 괄호를 찾지 못했다`);
  return body;
}

/* ── 표 해석 ─────────────────────────────────────────────────────────────── */
function parseEndpointTable(body, variable, label) {
  const table = new Map();
  const statements = body.matchAll(/if\s*\(([^)]*)\)\s*return\s*(["'])([A-Za-z]\w*)\2\s*;/g);
  for (const [, condition, , kind] of statements) {
    for (const clause of condition.split("||")) {
      const matched = new RegExp(`^\\s*${variable}\\s*===\\s*(["'])(/[^"']*)\\1\\s*$`).exec(clause);
      if (!matched) fatal(`${label} 의 조건을 해석하지 못했다: "${clause.trim()}" — 예상 모양은 \`${variable} === '/api/…'\` 의 || 나열`);
      const endpoint = matched[2];
      if (table.has(endpoint)) fatal(`${label} 에 중복 엔드포인트: ${endpoint}`);
      table.set(endpoint, kind);
    }
  }
  return table;
}

function parseTtlTable(body, variable, constants, label) {
  const table = new Map();
  const branches = [...body.matchAll(new RegExp(`if\\s*\\(\\s*${variable}\\s*===\\s*(["'])(\\w+)\\1\\s*\\)\\s*return\\s*(\\w+)\\s*;`, "g"))];
  for (const [, , kind, rawValue] of branches) table.set(kind, resolveNumber(rawValue, constants, `${label} 의 ${kind}`));
  const withoutBranches = body.replace(/if\s*\([^)]*\)\s*return\s*[\w"']+\s*;/g, "");
  const fallback = /return\s+([\w]+)\s*;/.exec(withoutBranches);
  if (!fallback) fatal(`${label} 의 기본 TTL(조건 밖 return)을 찾지 못했다`);
  return { table, fallback: resolveNumber(fallback[1], constants, `${label} 의 기본값`) };
}

function resolveNumber(raw, constants, label) {
  if (/^\d[\d_]*$/.test(raw)) return Number(raw.replaceAll("_", ""));
  if (constants.has(raw)) return constants.get(raw);
  fatal(`${label} 의 값 "${raw}" 를 숫자로 풀지 못했다 — 상수 선언을 찾을 수 없다`);
  return NaN;
}

/* ── 정본 2벌을 읽는다 ───────────────────────────────────────────────────── */
const shellSource = readFileSync(path.join(ROOT, SHELL_FILE), "utf8");
const shellBlockMatch = /<script id="cd-user-access-session-cache-v\d+">([\s\S]*?)<\/script>/.exec(shellSource);
if (!shellBlockMatch) fatal(`${SHELL_FILE} 에서 <script id="cd-user-access-session-cache-v…"> 인라인 블록을 찾지 못했다`);
const shellBlock = shellBlockMatch[1];

const reactSource = readFileSync(path.join(ROOT, REACT_FILE), "utf8");
const reactConstants = new Map(
  [...reactSource.matchAll(/^const\s+([A-Z][A-Z0-9_]*)\s*=\s*([\d_]+)\s*;/gm)].map(([, name, value]) => [name, Number(value.replaceAll("_", ""))]),
);

const shellEndpoints = parseEndpointTable(functionBody(shellBlock, /function\s+kind\s*\(\s*path\s*\)/, `셸 ${SHELL_FILE} kind(path)`), "path", "셸 kind(path)");
const shellTtl = parseTtlTable(functionBody(shellBlock, /function\s+cacheTtl\s*\(\s*cacheKind\s*\)/, `셸 ${SHELL_FILE} cacheTtl(cacheKind)`), "cacheKind", reactConstants, "셸 cacheTtl(cacheKind)");
const reactEndpoints = parseEndpointTable(functionBody(reactSource, /function\s+resolveCacheKind\s*\(\s*pathname\s*:/, `React ${REACT_FILE} resolveCacheKind()`), "pathname", "React resolveCacheKind()");
const reactTtl = parseTtlTable(functionBody(reactSource, /function\s+getCacheTtlMs\s*\(\s*kind\s*:/, `React ${REACT_FILE} getCacheTtlMs()`), "kind", reactConstants, "React getCacheTtlMs()");

/* ── ⓪ fail-closed 바닥 ──────────────────────────────────────────────────── */
check(`셸 엔드포인트 표 ${FLOOR.shellEndpoints}개 이상`, shellEndpoints.size >= FLOOR.shellEndpoints, `실제=${shellEndpoints.size}`);
check(`React 엔드포인트 표 ${FLOOR.reactEndpoints}개 이상`, reactEndpoints.size >= FLOOR.reactEndpoints, `실제=${reactEndpoints.size}`);
check(`셸 TTL 표 ${FLOOR.shellTtlKinds}종 이상`, shellTtl.table.size >= FLOOR.shellTtlKinds, `실제=${shellTtl.table.size}`);
check(`React TTL 표 ${FLOOR.reactTtlKinds}종 이상`, reactTtl.table.size >= FLOOR.reactTtlKinds, `실제=${reactTtl.table.size}`);

/* ── ① 엔드포인트→종류 매핑 대조 ────────────────────────────────────────── */
for (const [endpoint, kind] of shellEndpoints) {
  if (reactEndpoints.has(endpoint)) {
    check(`엔드포인트 ${endpoint} 의 캐시 종류 일치`, reactEndpoints.get(endpoint) === kind, `셸=${kind} React=${reactEndpoints.get(endpoint)}`);
    check(`${endpoint} 는 셸 전용 목록에 없어야 한다`, !SHELL_ONLY_ENDPOINTS.has(endpoint), "양쪽에 다 있는데 예외로 선언돼 있다 — 낡은 예외를 지울 것");
    continue;
  }
  const allowed = SHELL_ONLY_ENDPOINTS.get(endpoint);
  check(`셸에만 있는 엔드포인트 ${endpoint}`, Boolean(allowed), "React 쪽에 같은 매핑이 없다. 의도된 셸 전용이면 SHELL_ONLY_ENDPOINTS 에 사유와 함께 선언할 것");
  if (allowed) check(`셸 전용 ${endpoint} 의 종류가 선언과 같다`, allowed.kind === kind, `선언=${allowed.kind} 실제=${kind}`);
}
for (const [endpoint, kind] of reactEndpoints) {
  if (shellEndpoints.has(endpoint)) continue;
  const allowed = REACT_ONLY_ENDPOINTS.get(endpoint);
  check(`React 에만 있는 엔드포인트 ${endpoint}`, Boolean(allowed), "셸 쪽에 같은 매핑이 없다. 의도된 React 전용이면 REACT_ONLY_ENDPOINTS 에 사유와 함께 선언할 것");
  if (allowed) check(`React 전용 ${endpoint} 의 종류가 선언과 같다`, allowed.kind === kind, `선언=${allowed.kind} 실제=${kind}`);
}

/* ── ②③ 유효 TTL 대조 ───────────────────────────────────────────────────
   "표에 없으면 기본값"이라 명시값만 비교하면 한쪽이 기본값으로 떨어진 차이를 놓친다. */
check("기본 TTL 일치", shellTtl.fallback === reactTtl.fallback, `셸=${shellTtl.fallback}ms React=${reactTtl.fallback}ms`);
const shellOnlyKinds = new Set([...SHELL_ONLY_ENDPOINTS.values()].map((entry) => entry.kind));
const commonKinds = [...new Set([...shellEndpoints.values(), ...reactEndpoints.values()])].filter((kind) => !shellOnlyKinds.has(kind)).sort();
check("공통 캐시 종류를 뽑았다", commonKinds.length >= FLOOR.reactTtlKinds, `실제=${commonKinds.length}종`);
for (const kind of commonKinds) {
  const shellValue = shellTtl.table.has(kind) ? shellTtl.table.get(kind) : shellTtl.fallback;
  const reactValue = reactTtl.table.has(kind) ? reactTtl.table.get(kind) : reactTtl.fallback;
  check(`캐시 종류 ${kind} 의 유효 TTL 일치`, shellValue === reactValue, `셸=${shellValue}ms React=${reactValue}ms`);
}

/* ── ④ React CacheKind 유니온 ↔ 실제 표 ─────────────────────────────────── */
const unionMatch = /type\s+CacheKind\s*=\s*([^;]+);/.exec(reactSource);
if (!unionMatch) fatal(`${REACT_FILE} 에서 type CacheKind 유니온을 찾지 못했다`);
const declaredKinds = [...unionMatch[1].matchAll(/"(\w+)"/g)].map(([, kind]) => kind).sort();
check(
  "React CacheKind 유니온이 실제 매핑 종류와 같다",
  JSON.stringify(declaredKinds) === JSON.stringify([...new Set(reactEndpoints.values())].sort()),
  `유니온=[${declaredKinds}] 매핑=[${[...new Set(reactEndpoints.values())].sort()}]`,
);

/* ── ⑤ 모르는 경로는 양쪽 다 캐시하지 않는다 ────────────────────────────── */
check(
  "셸 kind() 는 모르는 경로에 '' 를 돌려준다",
  /return\s*''\s*;/.test(functionBody(shellBlock, /function\s+kind\s*\(\s*path\s*\)/, "셸 kind(path)")),
  "기본 분기가 캐시 종류를 돌려주면 미분류 경로가 조용히 캐시된다",
);
check(
  "React resolveCacheKind() 는 모르는 경로에 null 을 돌려준다",
  /return\s+null\s*;/.test(functionBody(reactSource, /function\s+resolveCacheKind\s*\(\s*pathname\s*:/, "React resolveCacheKind()")),
  "기본 분기가 캐시 종류를 돌려주면 미분류 경로가 조용히 캐시된다",
);

/* ── ⑥ 설치 가드 상호 확인 ──────────────────────────────────────────────── */
const INSTALL_FLAGS = ["__cdUserAccessSessionCacheInstalled", "__cdUserAccessFetchCacheInstalled"];
const shellInstallGuard = /if\s*\(([^)]*)\)\s*return\s*;/.exec(shellBlock)?.[1];
if (shellInstallGuard === undefined) fatal(`${SHELL_FILE} 인라인 블록에서 설치 가드(첫 early return)를 찾지 못했다`);
const reactInstallBody = functionBody(reactSource, /export function installUserAccessFetchCache\s*\(/, `React ${REACT_FILE} installUserAccessFetchCache()`);
const reactInstallGuard = [...reactInstallBody.matchAll(/if\s*\(([^)]*)\)\s*return\s*;/g)].map(([, condition]) => condition).join(" || ");
for (const flag of INSTALL_FLAGS) {
  check(`셸 설치 가드가 ${flag} 를 본다`, shellInstallGuard.includes(flag), "상대 구현이 이미 fetch 를 감쌌는지 보지 않으면 2중 래핑된다");
  check(`React 설치 가드가 ${flag} 를 본다`, reactInstallGuard.includes(flag), "상대 구현이 이미 fetch 를 감쌌는지 보지 않으면 2중 래핑된다");
}

function report() {
  if (failures.length) {
    console.error(`\n[실패] 세션 캐시 계약 검증 ${failures.length}건`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error(`\n  정본 2벌: ${SHELL_FILE}(인라인 블록) · ${REACT_FILE}`);
    console.error("  한쪽만 고치면 같은 호출이 런타임에 따라 다른 신선도를 받는다. 두 표를 함께 고칠 것.\n");
    process.exit(1);
  }
  console.log(
    `[통과] 세션 캐시 계약 검증 — 엔드포인트 ${shellEndpoints.size}개(셸) ↔ ${reactEndpoints.size}개(React),`
    + ` 셸 전용 ${SHELL_ONLY_ENDPOINTS.size}개 선언, 공통 캐시 종류 ${commonKinds.length}종 유효 TTL 일치`
    + `(${commonKinds.map((kind) => `${kind}=${shellTtl.table.has(kind) ? shellTtl.table.get(kind) : shellTtl.fallback}ms`).join(" · ")}),`
    + ` 기본 ${shellTtl.fallback}ms, CacheKind 유니온 ${declaredKinds.length}종 정합,`
    + ` 설치 가드 2곳 × 플래그 ${INSTALL_FLAGS.length}개 상호 확인\n`,
  );
}

report();
