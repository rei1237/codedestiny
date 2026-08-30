#!/usr/bin/env node
/**
 * 앱 소셜 로그인 복귀 경로(딥링크) 계약 검사.
 *
 * 왜 필요한가:
 *   워커는 OAuth 콜백을 끝낼 때 앱이면 302 대신 `com.codedestiny.app://auth?...` 딥링크를
 *   중계 페이지로 넘긴다. 그 파라미터를 앱 브릿지가 읽지 않으면 **아무 화면에도 나타나지 않고**
 *   사용자는 진행 오버레이만 계속 본다. 실제로 그렇게 났다 — 워커는 실패 사유를
 *   `social_error` 로 성실히 보냈는데(worker/routes/auth.js 의 catch 블록) 브릿지는
 *   `social_grant` 만 보고 조용히 no-op 했고, 증상은 "로그인 로딩 화면에서 멈춘다" 였다.
 *   같은 이유로 스킴·호스트가 네 곳(워커·브릿지·네이티브 플러그인·매니페스트) 중 하나만
 *   어긋나도 복귀가 통째로 죽는데, 어느 쪽도 에러를 내지 않는다.
 *
 * 🔴 fail-closed 다(CLAUDE.md 원칙 10). 손으로 쓴 대상 목록을 두지 않고 소스에서 전수
 *    발견하며, 발견 건수가 0이면 "통과"가 아니라 **실패**로 끝낸다 — 파서가 소스와
 *    어긋나 아무것도 못 본 상태를 초록불로 넘기지 않기 위해서다.
 *
 * 사용법: node scripts/verify-oauth-app-handoff.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const notes = [];

function read(rel) {
  try {
    return readFileSync(path.join(ROOT, rel), "utf8");
  } catch (error) {
    failures.push(`${rel} 를 읽지 못했다 (${error.code || error.message}) — 계약을 검증할 수 없다`);
    return "";
  }
}

const WORKER = "worker/routes/auth.js";
const BRIDGE = "scripts/app-native-bridge.js";
const PLUGIN = "apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyNavigationPlugin.java";
const MANIFEST = "apps/mobile/android/app/src/main/AndroidManifest.xml";

const worker = read(WORKER);
const bridge = read(BRIDGE);
const plugin = read(PLUGIN);
const manifest = read(MANIFEST);

// ─────────────────────────────────────────────────────────────────────────
// [1] 딥링크 스킴·호스트가 네 곳에서 같은가
// ─────────────────────────────────────────────────────────────────────────
console.log("[1] 딥링크 스킴·호스트 4면 일치");

/** `parsed.protocol !== "x:" || parsed.host !== "y"` 형태에서 (scheme, host) 를 뽑는다. */
function fromUrlCheck(source, label) {
  const match = /protocol\s*!==\s*"([a-z0-9.+-]+):"\s*\|\|\s*\w+\.host\s*!==\s*"([a-z0-9.-]+)"/i.exec(source);
  if (!match) {
    failures.push(`${label}: 딥링크 검사식을 찾지 못했다 — 형태가 바뀌었으면 이 가드를 함께 고쳐야 한다`);
    return null;
  }
  return { scheme: match[1], host: match[2] };
}
/** `"com.codedestiny.app://auth"` 형태의 상수에서 뽑는다. */
function fromLiteral(source, label) {
  const match = /"([a-z0-9.+-]+):\/\/([a-z0-9.-]+)"/i.exec(source);
  if (!match) {
    failures.push(`${label}: 딥링크 상수를 찾지 못했다`);
    return null;
  }
  return { scheme: match[1], host: match[2] };
}

const seen = [];
if (worker) {
  const value = fromUrlCheck(worker, `${WORKER} sanitizeAppOAuthRedirect`);
  if (value) seen.push([`${WORKER} sanitizeAppOAuthRedirect`, value]);
}
if (bridge) {
  const value = fromUrlCheck(bridge, `${BRIDGE} completeMobileOAuth`);
  if (value) seen.push([`${BRIDGE} completeMobileOAuth`, value]);
}
if (plugin) {
  const constant = /APP_OAUTH_REDIRECT\s*=\s*"([^"]+)"/.exec(plugin);
  if (!constant) failures.push(`${PLUGIN}: APP_OAUTH_REDIRECT 상수를 찾지 못했다`);
  else {
    const value = fromLiteral(`"${constant[1]}"`, `${PLUGIN} APP_OAUTH_REDIRECT`);
    if (value) seen.push([`${PLUGIN} APP_OAUTH_REDIRECT`, value]);
  }
}
if (manifest) {
  const scheme = /android:scheme="([^"]+)"/.exec(manifest);
  const host = /android:host="([^"]+)"/.exec(manifest);
  if (!scheme || !host) failures.push(`${MANIFEST}: intent-filter 의 android:scheme/android:host 를 찾지 못했다`);
  else seen.push([`${MANIFEST} intent-filter`, { scheme: scheme[1], host: host[1] }]);
}
// 워커가 실제로 만드는 intent:// 중계 URL. 여기의 scheme 이 어긋나면 크롬이 앱을 못 깨운다.
if (worker) {
  const intent = /scheme=([a-z0-9.+-]+);package=([a-z0-9.+-]+);/i.exec(worker);
  if (!intent) failures.push(`${WORKER}: buildAppOAuthHandoffResponse 의 intent:// 파라미터를 찾지 못했다`);
  else if (intent[1] !== intent[2]) {
    failures.push(`${WORKER}: intent:// 의 scheme(${intent[1]}) 과 package(${intent[2]}) 가 다르다`);
  } else seen.push([`${WORKER} buildAppOAuthHandoffResponse intent://`, { scheme: intent[1], host: null }]);
}

if (seen.length < 5) {
  failures.push(`딥링크 정의를 5곳에서 모두 찾지 못했다 (발견 ${seen.length}곳) — 미발견은 통과가 아니다`);
}
{
  const schemes = new Set(seen.map(([, value]) => value.scheme));
  const hosts = new Set(seen.filter(([, value]) => value.host).map(([, value]) => value.host));
  if (schemes.size > 1) {
    failures.push(`딥링크 scheme 이 갈렸다: ${seen.map(([label, v]) => `${label}=${v.scheme}`).join(" / ")}`);
  }
  if (hosts.size > 1) {
    failures.push(`딥링크 host 가 갈렸다: ${seen.filter(([, v]) => v.host).map(([label, v]) => `${label}=${v.host}`).join(" / ")}`);
  }
  if (schemes.size === 1 && hosts.size === 1) {
    console.log(`  ✓ ${[...schemes][0]}://${[...hosts][0]} — ${seen.length}곳 일치`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// [2] 워커가 딥링크에 싣는 파라미터를 브릿지가 전부 읽는가
// ─────────────────────────────────────────────────────────────────────────
console.log("[2] 딥링크 파라미터 계약 (워커 → 브릿지)");

/** `buildAppOAuthRedirect(x, { ... })` 의 객체 리터럴 본문을 통째로 돌려준다. */
function objectArgs(source, fnName) {
  const results = [];
  const needle = `${fnName}(`;
  let from = 0;
  for (;;) {
    const at = source.indexOf(needle, from);
    if (at === -1) break;
    from = at + needle.length;
    // 정의부(`function buildAppOAuthRedirect(`)는 호출부가 아니다.
    if (/function\s+$/.test(source.slice(Math.max(0, at - 10), at))) continue;
    const open = source.indexOf("{", at);
    if (open === -1) continue;
    let depth = 0;
    let close = -1;
    for (let i = open; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) { close = i; break; }
      }
    }
    if (close === -1) continue;
    results.push({ callAt: at, bodyAt: open, body: source.slice(open, close + 1) });
  }
  return results;
}

const lineOf = (source, index) => source.slice(0, index).split("\n").length;
const lineTextAt = (source, index) => source.split("\n")[lineOf(source, index) - 1] || "";

/** 이름으로 함수 본문(중괄호 블록)만 잘라낸다. 파일 전체를 보면 안 되는 검사에 쓴다. */
function functionBody(source, declaration, label) {
  const at = source.indexOf(declaration);
  if (at === -1) {
    failures.push(`${label}: \`${declaration}\` 를 찾지 못했다 — 이름이 바뀌었으면 이 가드를 함께 고쳐야 한다`);
    return "";
  }
  const open = source.indexOf("{", at);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return "";
}

// 🔴 브릿지가 딥링크에서 실제로 꺼내 쓰는 키 — **completeMobileOAuth 안에서만** 센다.
//    파일 전체를 세면 앵커 가드가 OAuth **시작 URL** 에서 읽는 flow/next 가 섞여 들어와,
//    딥링크가 그 키를 무시하고 있어도 초록불이 된다(실제로 그렇게 통과했다).
const deepLinkHandler = functionBody(bridge, "async function completeMobileOAuth(", BRIDGE);
const bridgeKeys = new Set(
  [...deepLinkHandler.matchAll(/searchParams\.get\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]),
);
if (bridge && bridgeKeys.size === 0) {
  failures.push(`${BRIDGE}: completeMobileOAuth 안에서 searchParams.get 호출을 하나도 찾지 못했다 — 파서가 소스와 어긋났다`);
}

const callSites = worker ? objectArgs(worker, "buildAppOAuthRedirect") : [];
if (worker && callSites.length === 0) {
  failures.push(`${WORKER}: buildAppOAuthRedirect 호출부를 찾지 못했다 — 미발견은 통과가 아니다`);
}
let checkedKeys = 0;
for (const site of callSites) {
  const callLine = lineOf(worker, site.callAt);
  // 🔴 `flow,` 같은 ES6 축약 키도 잡아야 한다. 콜론만 보면 축약 키가 조용히 빠져
  //    "검사했는데 초록불"이 되는데, 그게 바로 이 가드가 막으려는 상태다.
  for (const match of site.body.matchAll(/(?:^|[{,])\s*([A-Za-z_$][\w$]*)\s*(?=[:,}])/g)) {
    const key = match[1];
    checkedKeys += 1;
    if (bridgeKeys.has(key)) continue;
    // 브릿지가 안 읽어도 되는 키는 **그 자리에** 그렇게 적혀 있어야 한다.
    const keyIndex = site.bodyAt + match.index + match[0].length;
    if (/\/\/\s*app-bridge:\s*unused/.test(lineTextAt(worker, keyIndex))) {
      notes.push(`${WORKER}:${lineOf(worker, keyIndex)} ${key} — 브릿지 미사용으로 선언됨`);
      continue;
    }
    failures.push(
      `${WORKER}:${callLine} 의 딥링크 파라미터 "${key}" 를 ${BRIDGE} 가 읽지 않는다 — `
        + `브릿지에 처리를 넣거나, 필요 없으면 그 줄에 "// app-bridge: unused" 를 붙여 선언하라`,
    );
  }
}
if (checkedKeys === 0 && callSites.length > 0) {
  failures.push(`${WORKER}: buildAppOAuthRedirect 호출부에서 파라미터 키를 하나도 못 읽었다`);
}
console.log(`  ✓ 호출부 ${callSites.length}곳 · 키 ${checkedKeys}개 검사 (브릿지 판독 키 ${bridgeKeys.size}개)`);

// ─────────────────────────────────────────────────────────────────────────
// [3] 만든 딥링크가 중계 페이지로 나가는가 (302 로 새지 않는가)
// ─────────────────────────────────────────────────────────────────────────
console.log("[3] 딥링크가 intent:// 중계 응답으로 나가는가");
const HANDOFF_WINDOW = 14; // 호출 이후 이 줄 수 안에 소비처가 있어야 한다
for (const site of callSites) {
  const callLine = lineOf(worker, site.callAt);
  const window = worker.split("\n").slice(callLine - 1, callLine - 1 + HANDOFF_WINDOW).join("\n");
  const handedOff = window.includes("buildAppOAuthHandoffResponse(");
  // complete-signup 은 302 가 아니라 JSON 본문으로 돌려준다(앱이 직접 이동한다).
  const inJsonBody = /appRedirectUrl\s*=/.test(window);
  if (!handedOff && !inJsonBody) {
    failures.push(
      `${WORKER}:${callLine} 이 딥링크를 만들지만 ${HANDOFF_WINDOW}줄 안에 `
        + `buildAppOAuthHandoffResponse 도 appRedirectUrl 대입도 없다 — 302 로 새면 `
        + `크롬이 커스텀 스킴 이동을 막아 사용자가 커스텀탭에 갇힌다`,
    );
  }
}
console.log(`  ✓ 호출부 ${callSites.length}곳 검사`);

// ─────────────────────────────────────────────────────────────────────────
// [4] 교환에 성공한 세션이 앱 요청에 실제로 실리는가
//
// 딥링크 교환이 성공해도 이후 요청이 토큰을 안 실으면 사용자에게는 "로그인이 안 된다"와
// 구분되지 않는다. 2026-08-29 기기 트레이스에서 exchangeOk 두 번 뒤 부팅 프로브의
// /api/auth/me 가 401 을 받아 __cdForceSignOut 이 저장 토큰 3종을 지웠다.
// 셸 호출부는 Authorization 을 안 붙이므로 브릿지의 /api/* 리타게팅이 유일한 부착 지점이다.
// ─────────────────────────────────────────────────────────────────────────
console.log("[4] 앱 /api/* 리타게팅이 세션 자격증명을 싣는가");
const retarget = functionBody(bridge, "function installAppApiRetarget(", BRIDGE);
if (retarget) {
  if (!/headers\.set\(\s*"Authorization"\s*,\s*"Bearer "/.test(retarget)) {
    failures.push(
      `${BRIDGE} installAppApiRetarget 이 Authorization 을 붙이지 않는다 — 앱은 `
        + `SameSite=Lax 쿠키를 못 실어 모든 /api/* 요청이 게스트로 나간다`,
    );
  }
  if (!retarget.includes("fortune_auth_token")) {
    failures.push(`${BRIDGE} installAppApiRetarget 이 fortune_auth_token 을 읽지 않는다`);
  }
  if (!/headers\.has\(\s*"Authorization"\s*\)/.test(retarget)) {
    failures.push(
      `${BRIDGE} installAppApiRetarget 이 호출부가 이미 단 Authorization 을 존중하지 않는다 `
        + `— 리프레시·구독 조회가 자기 토큰을 잃는다`,
    );
  }
  if (!/headers\.set\(\s*"X-Code-Destiny-Refresh-Token"/.test(retarget)) {
    failures.push(
      `${BRIDGE} installAppApiRetarget 이 만료 시 X-Code-Destiny-Refresh-Token 을 싣지 않는다 `
        + `— 앱엔 refresh 쿠키가 없어 액세스 TTL(기본 30분)마다 세션이 끊긴다`,
    );
  }
}

// 실어 보낸 헤더를 받는 쪽(인증 리졸버)이 실제로 읽는지 — 한쪽만 고치면 조용히 401 이다.
const LIB_AUTH = "worker/lib/auth.js";
const libAuth = read(LIB_AUTH);
// functionBody 는 여기 못 쓴다 — 선언의 `options = {}` 기본값이 첫 중괄호라 본문 대신 그걸 집는다.
const RESOLVER_DECL = "async function verifyRefreshSessionToAuth(";
const resolverAt = libAuth ? libAuth.indexOf(RESOLVER_DECL) : -1;
if (libAuth && resolverAt === -1) {
  failures.push(`${LIB_AUTH}: \`${RESOLVER_DECL}\` 를 찾지 못했다 — 이름이 바뀌었으면 이 가드를 함께 고쳐야 한다`);
}
const refreshResolver = resolverAt === -1
  ? ""
  : libAuth.split("\n").slice(lineOf(libAuth, resolverAt) - 1, lineOf(libAuth, resolverAt) + 11).join("\n");
if (refreshResolver && !refreshResolver.includes("readRequestRefreshToken(")) {
  failures.push(
    `${LIB_AUTH} verifyRefreshSessionToAuth 가 쿠키만 읽는다 — 앱은 refresh 쿠키를 받지 못하므로 `
      + `readRequestRefreshToken(앱 헤더 폴백)을 타야 한다`,
  );
}
if (libAuth && !/export function isMobileAppAuthRequest\(/.test(libAuth)) {
  failures.push(`${LIB_AUTH} 가 isMobileAppAuthRequest 를 export 하지 않는다 — 판정 사본이 갈린다`);
}
if (worker && /^function isMobileAppAuthRequest\(/m.test(worker)) {
  failures.push(
    `${WORKER} 에 isMobileAppAuthRequest 사본이 다시 생겼다 — 정본은 ${LIB_AUTH} 하나여야 한다`,
  );
}
console.log("  ✓ 브릿지 부착 4항목 · 리졸버 수신 3항목 검사");

// ─────────────────────────────────────────────────────────────────────────
if (notes.length > 0) {
  console.log("\n선언된 예외:");
  for (const note of notes) console.log(`  · ${note}`);
}
if (failures.length > 0) {
  console.error(`\n[verify-oauth-app-handoff] 실패 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\n[verify-oauth-app-handoff] OK");
