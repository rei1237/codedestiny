#!/usr/bin/env node
/**
 * 자격증명 단위 엣지 캐시(worker/lib/credential-scoped-cache.js)의 안전조건 가드.
 *
 * 왜 필요한가:
 *   이 캐시는 틀리면 **남의 세션이 보이거나 남의 Set-Cookie 가 재생된다.** 안전은 네 가지 조건에
 *   걸려 있는데 넷 다 "정리하다가" 사라지기 쉬운 형태다 — 키를 짧게 만들고, 중복 검사처럼 보이는
 *   Set-Cookie 조건을 빼고, stale 폴백을 "가용성 개선"으로 되살리고, 우회 분기를 "죽은 코드"로 지운다.
 *
 * 🔴 fail-closed 축은 **접두사 레지스트리**다.
 *   강제 새로고침이 오면 그 자격증명의 **모든** 접두사를 지워야 정합성이 맞는다(결제 직후
 *   클라이언트는 /api/auth/me 만 강제로 부르는데, /api/profile 이 옛 구독을 들고 있으면 어긋난다).
 *   그래서 라우트가 쓰는 접두사를 **소스에서 전수로 발견**해, CREDENTIAL_CACHE_PREFIXES 에 없는 것이
 *   하나라도 있으면 실패한다. 손으로 쓴 목록이 스스로를 지키지 못하게 하는 장치다.
 *   반대 방향(레지스트리에만 있고 아무도 안 쓰는 접두사)도 실패시킨다 — 낡은 선언이 쌓이면
 *   목록이 거짓말이 된다.
 *
 * 실행: npm run verify:credential-cache [--self-test]
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MODULE_PATH = "worker/lib/credential-scoped-cache.js";
const ROUTES_DIR = "worker/routes";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

/** 모듈이 선언한 접두사 레지스트리. */
export function declaredPrefixes(moduleSource) {
  const block = moduleSource.match(/CREDENTIAL_CACHE_PREFIXES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/**
 * readThroughCredentialCache 호출 **안쪽**의 인자 객체만 잘라 낸다.
 * 🔴 파일 전체에서 `prefix:` 를 grep 하면 안 된다 — 무관한 객체 리터럴(예: worker/routes/fortune.js 의
 *    프롬프트 빌더)에도 같은 키가 있어 오탐이 난다. 중괄호 균형으로 실제 호출 범위만 본다.
 */
function credentialCacheCallBodies(source) {
  const bodies = [];
  const needle = "readThroughCredentialCache(";
  let from = 0;
  for (;;) {
    const at = source.indexOf(needle, from);
    if (at === -1) break;
    const open = source.indexOf("{", at + needle.length);
    if (open === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = open; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) break;
    bodies.push(source.slice(open, end + 1));
    from = end + 1;
  }
  return bodies;
}

/**
 * 라우트가 실제로 쓰는 접두사를 전수로 찾는다.
 * `prefix: "리터럴"` 과 `prefix: 상수` 를 모두 받고, 상수는 같은 파일의 `const 이름 = "리터럴";` 로 푼다.
 * 못 푼 것은 resolved:false 로 남겨 호출부에서 실패시킨다(조용히 건너뛰지 않는다).
 */
export function usedPrefixes(routeSources) {
  const used = [];
  for (const [file, source] of routeSources) {
    for (const body of credentialCacheCallBodies(source)) {
      for (const match of body.matchAll(/\bprefix:\s*([A-Za-z_$][\w$]*|"[^"]*")/g)) {
        const raw = match[1];
        if (raw.startsWith('"')) {
          used.push({ file, name: raw.slice(1, -1), resolved: true });
          continue;
        }
        const constMatch = source.match(new RegExp(`const\\s+${raw}\\s*=\\s*"([^"]+)"`));
        used.push({ file, name: constMatch ? constMatch[1] : raw, resolved: Boolean(constMatch) });
      }
    }
  }
  return used;
}

export function auditCredentialCache(moduleSource, routeSources) {
  const problems = [];
  const fail = (message) => problems.push(message);

  // ── 안전조건 ①  키는 자격증명 표면 전체 ────────────────────────────────
  if (!moduleSource.includes('request.headers.get("authorization")')) fail("캐시 키가 Authorization 헤더를 안 본다.");
  if (!moduleSource.includes('request.headers.get("cookie")')) fail("캐시 키가 Cookie 헤더 전체를 안 본다.");
  if (/ACCESS_COOKIE_NAME|REFRESH_COOKIE_NAME/.test(moduleSource)) {
    fail("캐시 키가 쿠키 이름을 손으로 고른다 — 새 인증 쿠키가 생기면 키가 안 바뀌어 남의 세션이 보인다.");
  }
  if (!/crypto\.subtle\.digest\("SHA-256"/.test(moduleSource)) fail("캐시 키가 SHA-256 해시를 안 쓴다.");

  // ── 안전조건 ②  캐시 조건 3개 ─────────────────────────────────────────
  if (!moduleSource.includes("response.status !== 200")) fail("200 이 아닌 응답을 걸러내지 않는다.");
  if (!moduleSource.includes('response.headers.has("set-cookie")')) {
    fail("Set-Cookie 가 붙은 응답을 걸러내지 않는다 — refresh 회전이 남의 요청에 재생된다.");
  }
  if (!moduleSource.includes("isCacheable(body) !== true")) fail("본문 기준 캐시 가능 판정을 안 한다.");

  // ── 안전조건 ③  stale 폴백 금지 ────────────────────────────────────────
  if (!moduleSource.includes("staleTtlSeconds: CREDENTIAL_CACHE_TTL_SECONDS")) {
    fail("stale 폴백이 살아 있다 — 낡은 인증은 느린 인증보다 나쁘다.");
  }

  // ── 안전조건 ④  강제 새로고침이 모든 접두사를 지운다 ───────────────────
  if (!moduleSource.includes("request.headers.get(CREDENTIAL_CACHE_REFRESH_HEADER)")) {
    fail("강제 새로고침 우회 분기가 없다 — 결제 직후 정합성이 여기 걸려 있다.");
  }
  if (!moduleSource.includes("purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES)")) {
    fail("강제 새로고침이 모든 접두사를 지우지 않는다 — 다른 엔드포인트가 옛 구독 상태를 들고 있게 된다.");
  }

  // ── fail-closed: 접두사 레지스트리 ─────────────────────────────────────
  const declared = declaredPrefixes(moduleSource);
  if (declared.length === 0) fail("CREDENTIAL_CACHE_PREFIXES 를 못 읽었다 — 레지스트리가 비면 강제 새로고침이 아무것도 안 지운다.");

  const used = usedPrefixes(routeSources);
  if (used.length === 0) fail("라우트에서 이 캐시를 쓰는 곳을 하나도 못 찾았다 — 검사 대상이 없는 가드는 가드가 아니다.");

  for (const entry of used) {
    if (!entry.resolved) {
      fail(`${entry.file}: prefix 로 넘긴 상수 ${entry.name} 를 리터럴로 풀지 못했다. 같은 파일에 const ${entry.name} = "..." 로 둘 것.`);
      continue;
    }
    if (!declared.includes(entry.name)) {
      fail(`${entry.file}: 접두사 "${entry.name}" 가 CREDENTIAL_CACHE_PREFIXES 에 없다 — 강제 새로고침이 이 캐시를 못 지운다.`);
    }
  }
  for (const name of declared) {
    if (!used.some((entry) => entry.resolved && entry.name === name)) {
      fail(`CREDENTIAL_CACHE_PREFIXES 의 "${name}" 를 아무 라우트도 안 쓴다 — 낡은 선언은 목록을 거짓말로 만든다.`);
    }
  }

  return problems;
}

/** 라우트 배선 — 두 진입점이 실제로 캐시를 지나야 한다. */
export function auditRouteWiring(authSource, profileSource) {
  const problems = [];
  const fail = (message) => problems.push(message);

  if (!authSource.includes("return await readThroughCredentialCache({")) {
    fail("worker/routes/auth.js: /api/auth/me 가 캐시를 지나지 않는다.");
  }
  if (!/isCacheable:\s*\(body\)\s*=>\s*body\.authenticated === true/.test(authSource)) {
    fail("worker/routes/auth.js: 인증된 응답만 캐시한다는 판정이 없다.");
  }

  // 🔴 캐시가 인증 왕복보다 앞이어야 한다. 그 구조는 "내보내는 함수는 래퍼이고,
  //    Mongo 를 타는 본체는 별도 함수" 로만 성립한다.
  if (!profileSource.includes("export async function handleProfileRoutes(request, env) {")) {
    fail("worker/routes/profile.js: handleProfileRoutes 진입점이 없다.");
  }
  if (!profileSource.includes("async function handleProfileRoutesUncached(request, env) {")) {
    fail("worker/routes/profile.js: 캐시 없는 본체(handleProfileRoutesUncached)가 없다 — 캐시가 인증 왕복 뒤로 밀렸다는 뜻이다.");
  }
  const wrapperAt = profileSource.indexOf("export async function handleProfileRoutes(request, env) {");
  const bodyAt = profileSource.indexOf("async function handleProfileRoutesUncached(request, env) {");
  if (wrapperAt >= 0 && bodyAt >= 0 && wrapperAt > bodyAt) {
    fail("worker/routes/profile.js: 래퍼가 본체보다 뒤에 있다 — 진입 순서를 확인할 것.");
  }
  if (!profileSource.includes("requireUserFromRequest") || !profileSource.includes("handler: handleProfileRoutesUncached")) {
    fail("worker/routes/profile.js: 캐시가 본체를 handler 로 감싸지 않는다.");
  }

  /* 🔴 쓰기는 자기 목록 캐시를 지워야 한다 — 카드 추가·삭제가 최대 TTL 만큼 안 보이면 안 된다.
     손으로 "네 곳" 을 세지 않는다. 디스패치에서 **쓰기 메서드 분기를 전수로 발견**해, 그중 purge 를
     안 거치는 것이 하나라도 있으면 실패한다. 나중에 쓰기 라우트가 하나 늘어도 그대로 잡힌다.

     🔴 정규식 한 방으로 훑지 말 것 — 창(window)이 겹쳐 matchAll 이 다음 분기를 통째로 삼킨다
     (그렇게 4곳 중 2곳만 잡혀 음성시험이 통과해 버렸다). 줄 단위로 세고 뒤 두 줄만 본다. */
  const profileLines = profileSource.split(/\r?\n/);
  const mutatingBranches = [];
  for (let i = 0; i < profileLines.length; i += 1) {
    if (!/if \(.*method === "(?:POST|PATCH|PUT|DELETE)"/.test(profileLines[i])) continue;
    mutatingBranches.push({
      condition: profileLines[i].trim(),
      purged: profileLines.slice(i, i + 3).join("\n").includes("withProfileListPurge"),
    });
  }
  if (mutatingBranches.length === 0) {
    fail("worker/routes/profile.js: 쓰기 분기를 하나도 못 찾았다 — 검사 대상이 없는 가드는 가드가 아니다.");
  }
  for (const branch of mutatingBranches) {
    if (!branch.purged) fail(`worker/routes/profile.js: 쓰기 분기가 목록 캐시를 지우지 않는다 — ${branch.condition.slice(0, 90)}`);
  }
  if (/withProfileListPurge\(request,\s*handleGet/.test(profileSource)) {
    fail("worker/routes/profile.js: 읽기 경로에 purge 가 붙었다 — 캐시가 매번 비워져 무의미해진다.");
  }

  return problems;
}

function routeSources() {
  const dir = resolve(root, ROUTES_DIR);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => [`${ROUTES_DIR}/${name}`, readFileSync(join(dir, name), "utf8")]);
}

function runSelfTest() {
  const moduleSource = read(MODULE_PATH);
  const authSource = read("worker/routes/auth.js");
  const profileSource = read("worker/routes/profile.js");
  const sources = routeSources();

  const baseline = [...auditCredentialCache(moduleSource, sources), ...auditRouteWiring(authSource, profileSource)];
  if (baseline.length) throw new Error(`self-test 기준선 실패:\n  ${baseline.join("\n  ")}`);

  const moduleMutations = [
    ["Cookie 헤더를 키에서 뺀다", (t) => t.replace('request.headers.get("cookie") || ""', "ACCESS_COOKIE_NAME")],
    ["Set-Cookie 검사를 뺀다", (t) => t.replace(' || response.headers.has("set-cookie")', "")],
    ["stale 폴백을 되살린다", (t) => t.replace("staleTtlSeconds: CREDENTIAL_CACHE_TTL_SECONDS", "staleTtlSeconds: 900")],
    ["강제 새로고침이 자기 키만 지운다", (t) => t.replace("purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES)", "purgeCmsCache([key])")],
    ["레지스트리를 비운다", (t) => t.replace(/Object\.freeze\(\["auth-me:v1", "profile-list:v1"\]\)/, "Object.freeze([])")],
    ["레지스트리에서 프로필 접두사를 뺀다", (t) => t.replace(/Object\.freeze\(\["auth-me:v1", "profile-list:v1"\]\)/, 'Object.freeze(["auth-me:v1"])')],
    ["아무도 안 쓰는 접두사를 레지스트리에 넣는다", (t) => t.replace(/Object\.freeze\(\["auth-me:v1", "profile-list:v1"\]\)/, 'Object.freeze(["auth-me:v1", "profile-list:v1", "ghost:v1"])')],
  ];

  for (const [label, mutate] of moduleMutations) {
    const mutated = mutate(moduleSource);
    if (mutated === moduleSource) throw new Error(`self-test 픽스처가 모듈을 못 바꿨다: ${label}`);
    if (auditCredentialCache(mutated, sources).length === 0) throw new Error(`단언이 공허하다 — ${label}`);
  }

  const routeMutations = [
    ["프로필 캐시 래퍼를 없앤다", (a, p) => [a, p.replace("async function handleProfileRoutesUncached(request, env) {", "async function somethingElse(request, env) {")]],
    ["프로필 쓰기 purge 를 하나 없앤다", (a, p) => [a, p.replace("withProfileListPurge(request, handleDeleteProfile", "(handleDeleteProfile")]],
    ["읽기 경로에 purge 를 붙인다", (a, p) => [a, p.replace("return await handleGetProfiles(auth, env);", "return await withProfileListPurge(request, handleGetProfiles(auth, env));")]],
    ["auth 가 인증 판정 없이 캐시한다", (a, p) => [a.replace("isCacheable: (body) => body.authenticated === true", "isCacheable: () => true"), p]],
  ];

  for (const [label, mutate] of routeMutations) {
    const [mutatedAuth, mutatedProfile] = mutate(authSource, profileSource);
    if (mutatedAuth === authSource && mutatedProfile === profileSource) throw new Error(`self-test 픽스처가 라우트를 못 바꿨다: ${label}`);
    if (auditRouteWiring(mutatedAuth, mutatedProfile).length === 0) throw new Error(`단언이 공허하다 — ${label}`);
  }

  // 🔴 접두사 발견이 소스 기반인지도 증명한다: 라우트에 미등록 접두사를 넣으면 실패해야 한다.
  const ghostRoutes = sources.map(([file, source]) => (file.endsWith("profile.js")
    ? [file, `${source}\nconst GHOST = "unregistered:v1";\nreadThroughCredentialCache({ request, env, prefix: GHOST, handler, isCacheable });\n`]
    : [file, source]));
  if (auditCredentialCache(moduleSource, ghostRoutes).length === 0) {
    throw new Error("단언이 공허하다 — 라우트의 미등록 접두사를 못 잡는다");
  }

  console.log(`[verify-credential-cache] self-test passed (모듈 ${moduleMutations.length} · 라우트 ${routeMutations.length} · 접두사 발견 1)`);
}

function main() {
  if (process.argv.includes("--self-test")) return runSelfTest();

  const moduleSource = read(MODULE_PATH);
  for (const problem of auditCredentialCache(moduleSource, routeSources())) assert(false, problem);
  for (const problem of auditRouteWiring(read("worker/routes/auth.js"), read("worker/routes/profile.js"))) assert(false, problem);

  if (failures.length) {
    console.error("[verify-credential-cache] FAIL");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  const declared = declaredPrefixes(moduleSource);
  console.log(`[verify-credential-cache] OK — 접두사 ${declared.length}개(${declared.join(" · ")}) 전부 라우트에서 쓰이고 레지스트리에 등록됨.`);
}

main();
