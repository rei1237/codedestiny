#!/usr/bin/env node
/**
 * 로그아웃 → 재로그인 세션 안정성 가드 (진단 재현 + 회귀 방지).
 *
 * 사고 경위(2026-08-11 진단): 사용자 증상은 "로그아웃 후 로그인을 시도할 때 불안정하다.
 * 로그인 이후에는 안정적으로 보인다. 결제에도 영향이 있는 듯하다" 였다. 코드에서 읽은 원인은
 * 방어 부재가 아니라 **로그아웃 응답과 로그인 응답의 Set-Cookie 경합**이다.
 *
 *   1. auth-store.logout() 은 서버 로그아웃을 `void` 로 던지고 기다리지 않는다.
 *   2. 그 POST 는 keepalive:true 라 페이지를 이동해도 계속 살아 있다.
 *   3. 로그인 페이지로 이동하면 JS 컨텍스트가 파괴돼 모듈 스코프의 logoutInFlight 프로미스가 사라진다.
 *   4. 새 페이지의 login() 은 waitForAuthLogoutToSettle() 로 기다리지만, 프로미스가 없으므로
 *      localStorage 마커 폴백을 타고 상한이 PERSISTED_LOGOUT_SETTLE_CAP_MS(800ms) 다.
 *   5. 그런데 로그아웃 POST 자체의 상한은 LOGOUT_TIMEOUT_MS(3500ms) 다.
 *   => 로그아웃 응답이 800ms 보다 늦으면 로그인은 기다리기를 포기하고 진행하고,
 *      뒤늦게 도착한 로그아웃 응답의 Max-Age=0 이 방금 로그인이 받은 세션 쿠키를 지운다.
 *
 * 이 스크립트는 문자열 검사가 아니라 **실제 app/_lib/auth-client.ts 를 transpile 해서
 * jsdom 쿠키 jar 위에서 실행**한다. "내가 버그를 재구현한 것"이 아니라 "당신 코드가 쿠키를
 * 잃는 것"을 보여야 진단 근거가 되기 때문이다(마스터 프롬프트: 추측 금지, 근거는 실측).
 *
 * 🔴 네트워크는 전량 mock 이다. 실제 서버·DB·LLM 을 호출하지 않는다(CLAUDE.md 코딩 원칙 8).
 *
 * 케이스
 *   T1  로그아웃 응답 지연(>800ms) + 재로그인 → 세션 쿠키가 살아남아야 한다
 *   T2  T1 직후 /api/me/access-state → 200 이어야 한다(결제/이용권 인식 경로)
 *   T3  hasClientAuthHint() 가 false 여도 /api/auth/me 는 서버에 물어야 한다(게스트 위조 금지)
 *   T4  /api/auth/refresh 응답이 fortune_auth_role 힌트 쿠키를 재발행해야 한다
 *
 * 수정 전에는 4건 모두 실패하는 것이 정상이다. 수정 후 전건 통과가 완료 조건이다.
 *
 * 사용법: node scripts/verify-auth-session-stability.mjs [--verbose]
 */

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');
const VERBOSE = process.argv.includes('--verbose');

const PAGE_ORIGIN = 'https://code-destiny.com';
const PAGE_URL = `${PAGE_ORIGIN}/`;

const results = [];
const record = (id, title, passed, detail) => {
  results.push({ id, title, passed, detail });
  const mark = passed ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${id} ${title}`);
  if (detail) console.log(`         ${String(detail).split('\n').join('\n         ')}`);
};
const log = (...args) => { if (VERBOSE) console.log('   ·', ...args); };

/* ------------------------------------------------------------------ *
 * 1. TypeScript 소스를 실행 가능한 ESM 으로 만든다.
 *    esbuild 는 선언되지 않은 전이 의존성이라 쓰지 않는다 — typescript 는 devDependency 다.
 * ------------------------------------------------------------------ */

const ts = (await import('typescript')).default;
const { JSDOM, CookieJar } = await import('jsdom');

const workDir = mkdtempSync(join(tmpdir(), 'cd-auth-stability-'));

function transpile(relPath, importMap = {}) {
  const source = read(relPath);
  const out = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
    fileName: relPath,
  }).outputText;

  // 상대/별칭 import 를 이 작업 디렉터리 안의 실제 파일로 재지정한다.
  return out.replace(/(\bfrom\s*|\bimport\s*\()\s*(["'])([^"']+)\2/g, (whole, prefix, quote, spec) => {
    const mapped = importMap[spec];
    if (!mapped) throw new Error(`${relPath}: import 매핑 누락 → "${spec}"`);
    return `${prefix}${quote}${mapped}${quote}`;
  });
}

function emit(name, code) {
  const file = join(workDir, name);
  writeFileSync(file, code, 'utf8');
  return file;
}

// 의존 모듈 스텁. auth-client 가 실제로 쓰는 표면만 만든다.
emit('stub-api-config.js', `export function getApiBaseUrl() { return "${PAGE_ORIGIN}"; }\n`);
emit('stub-pass-verdict.js', `export default { KEY_PREFIX: "cd_subscription_snapshot_v2::" };\n`);
emit('stub-toast.js', `
export const shownToasts = [];
export function showToast(message, type) { shownToasts.push({ message, type }); }
`);
emit('stub-ai-locale.js', `export const AI_LOCALE_HEADER = "x-code-destiny-ai-locale";\n`);
emit('stub-dictionary.js', `export function detectLocale() { return "ko"; }\n`);
emit('stub-react.js', `
export function useCallback(fn) { return fn; }
export function useSyncExternalStore(_sub, getSnapshot) { return getSnapshot(); }
`);
emit('stub-billing-client.js', `export async function fetchBillingBalance() { return null; }\n`);

// 아래 셋은 import 표면이 좁아 스텁이 아니라 진짜를 그대로 쓴다 — 재현의 신뢰도를 위해서다.
emit('http-client.js', transpile('app/_lib/http-client.ts', {}));
emit('monthly-stone.js', transpile('app/_lib/monthly-stone.ts', {}));
emit('auth-storage.js', transpile('app/_lib/auth-storage.ts', { './monthly-stone': './monthly-stone.js' }));

const authClientFile = emit('auth-client.js', transpile('app/_lib/auth-client.ts', {
  './api-config': './stub-api-config.js',
  './http-client': './http-client.js',
  './auth-storage': './auth-storage.js',
  '@/js/core/pass-verdict.js': './stub-pass-verdict.js',
  '@/lib/i18n/ai-locale': './stub-ai-locale.js',
  '@/lib/i18n/dictionary': './stub-dictionary.js',
}));

const sessionCacheFile = emit('user-session-cache.js', transpile('app/_lib/user-session-cache.ts', {
  react: './stub-react.js',
  '@/app/_lib/billing-client': './stub-billing-client.js',
  '@/app/_lib/auth-client': './auth-client.js',
}));

const authStoreFile = emit('auth-store.js', transpile('app/_lib/auth-store.ts', {
  react: './stub-react.js',
  './api-config': './stub-api-config.js',
  './auth-client': './auth-client.js',
  './http-client': './http-client.js',
  './auth-storage': './auth-storage.js',
  './monthly-stone': './monthly-stone.js',
  '../components/Toast': './stub-toast.js',
}));

/* ------------------------------------------------------------------ *
 * 2. 브라우저 환경 — 쿠키는 jsdom(tough-cookie) jar 가 실제 규칙대로 처리한다.
 *    HttpOnly 쿠키가 document.cookie 에서 감춰지는 것까지 실물과 같다.
 * ------------------------------------------------------------------ */

const jar = new CookieJar();
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: PAGE_URL,
  cookieJar: jar,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.CustomEvent = dom.window.CustomEvent;

const jarCookies = () => {
  const out = {};
  for (const c of jar.getCookiesSync(PAGE_URL, { http: true })) out[c.key] = c.value;
  return out;
};
const applySetCookies = (headers) => {
  for (const h of headers) jar.setCookieSync(h, PAGE_URL, { http: true, ignoreError: false });
};

// 서버가 실제로 내려보내는 헤더를 그대로 복제한다.
// 발급: worker/routes/auth.js appendAuthCookies / appendAuthRoleCookie
const SESSION_SET_COOKIES = [
  'fortune_auth_token=acc.eyJhbGciOi.sig; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax',
  'fortune_auth_refresh=ref.eyJhbGciOi.sig; Path=/; Max-Age=1209600; HttpOnly; Secure; SameSite=Lax',
  'fortune_auth_role=user; Path=/; Max-Age=1209600; Secure; SameSite=Lax',
];
// 삭제: worker/routes/auth.js appendClearAuthCookies (레거시 refresh path 사본 포함)
const CLEAR_SET_COOKIES = [
  'fortune_auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  'fortune_auth_refresh=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  'fortune_auth_refresh=; Path=/api/auth/refresh; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  'fortune_auth_role=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
];
// 갱신: worker/routes/auth.js:3502 (handleRefresh) — role 쿠키가 빠져 있다.
const REFRESH_SET_COOKIES = SESSION_SET_COOKIES.filter((c) => !c.startsWith('fortune_auth_role='));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let serverLog = [];
let logoutResponseDelayMs = 0;
let refreshUsesRoleCookie = false;

function installMockFetch() {
  serverLog = [];
  globalThis.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    const url = new URL(rawUrl, PAGE_URL);
    const method = String(init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    const path = url.pathname;
    const cookieHeader = jar.getCookieStringSync(PAGE_URL, { http: true });
    const hasSession = /(^|;\s*)fortune_auth_token=[^;\s]/.test(cookieHeader);
    const at = Date.now() - t0;
    serverLog.push({ at, method, path, hasSession });
    log(`t+${at}ms  ${method} ${path}  session=${hasSession}`);

    if (path === '/api/auth/logout') {
      if (logoutResponseDelayMs) await sleep(logoutResponseDelayMs);
      applySetCookies(CLEAR_SET_COOKIES);
      log(`t+${Date.now() - t0}ms  <- logout 응답이 쿠키를 삭제함`);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (path === '/api/auth/login') {
      applySetCookies(SESSION_SET_COOKIES);
      return new Response(
        JSON.stringify({ ok: true, user: { id: 'u1', email: 'a@b.com', role: 'user' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (path === '/api/auth/refresh') {
      if (!hasSession) return new Response(JSON.stringify({ ok: false }), { status: 401 });
      applySetCookies(refreshUsesRoleCookie ? SESSION_SET_COOKIES : REFRESH_SET_COOKIES);
      return new Response(JSON.stringify({ ok: true, user: { id: 'u1' } }), { status: 200 });
    }

    if (path === '/api/auth/me' || path === '/api/me/access-state') {
      if (!hasSession) return new Response(JSON.stringify({ ok: false, authenticated: false }), { status: 401 });
      return new Response(
        JSON.stringify({ ok: true, authenticated: true, userId: 'u1', hasActivePass: true, data: { userId: 'u1', hasActivePass: true } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('{}', { status: 200 });
  };
  // user-session-cache 의 몽키패치는 window.fetch 를 감싼다 — jsdom window 에도 같은 것을 심는다.
  dom.window.fetch = globalThis.fetch;
  dom.window.__cdUserAccessFetchCacheInstalled = false;
}

function resetBrowserState() {
  localStorage.clear();
  sessionStorage.clear();
  jar.removeAllCookiesSync();
}

let t0 = Date.now();

/* ------------------------------------------------------------------ *
 * T1 — 로그아웃 응답 지연 + 재로그인 경합
 * ------------------------------------------------------------------ */

console.log('\n로그아웃 → 재로그인 세션 안정성\n');

resetBrowserState();
installMockFetch();
applySetCookies(SESSION_SET_COOKIES);
localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'u1', email: 'a@b.com' }));

// 페이지 A(로그아웃 버튼을 누른 화면)와 페이지 B(이동 후의 로그인 화면)는 서로 다른 모듈
// 인스턴스여야 한다 — 페이지 이동으로 모듈 스코프(logoutInFlight 프로미스)가 사라지고
// localStorage 마커만 남는 상황이 이 결함의 조건이기 때문이다. 페이지 A 는 auth-store(기본
// 인스턴스), 페이지 B 는 auth-client 를 쿼리스트링으로 따로 로드해 두 인스턴스를 만든다.
// 쿠키와 localStorage 는 실제 브라우저처럼 공유된다.
const pageAStore = await import(pathToFileURL(authStoreFile).href);
const pageB = await import(`${pathToFileURL(authClientFile).href}?page=b`);

logoutResponseDelayMs = 1500;
t0 = Date.now();

// 페이지 A: 로그아웃 버튼. AuthWidget.handleLogout 은 `await logout()` 이 끝난 **뒤에**
// location.assign("/") 으로 이동한다. 그러므로 로그아웃이 반환되기 전에는 페이지 B 가 없다.
// logout() 이 서버 응답을 기다리지 않으면 여기가 즉시 반환되고, 그 순간부터 경합이 시작된다.
await pageAStore.logout(PAGE_ORIGIN).catch(() => {});
const logoutReturnedAt = Date.now() - t0;

// 페이지 B: 이동한 뒤의 로그인 화면. auth-store.login() 과 동일한 순서.
const waitStartedAt = Date.now();
await pageB.waitForAuthLogoutToSettle();
const waitedMs = Date.now() - waitStartedAt;
await globalThis.fetch(`${PAGE_ORIGIN}/api/auth/login`, { method: 'POST' });

const cookiesRightAfterLogin = jarCookies();
const loginSucceeded = Boolean(cookiesRightAfterLogin.fortune_auth_token);

// 아직 떠 있을 수 있는 로그아웃 응답이 도착할 시간을 준다.
await sleep(Math.max(50, logoutResponseDelayMs + 300 - (Date.now() - t0)));

const cookiesAfterEverything = jarCookies();
const survived = Boolean(cookiesAfterEverything.fortune_auth_token && cookiesAfterEverything.fortune_auth_refresh);

record(
  'T1',
  '로그아웃 응답이 늦어도 재로그인 세션 쿠키가 살아남는다',
  survived,
  survived
    ? null
    : [
        `logout() 반환 시각 : t+${logoutReturnedAt}ms (여기서 화면이 이동한다)`,
        `로그인 대기 시간   : ${waitedMs}ms (상한 PERSISTED_LOGOUT_SETTLE_CAP_MS=800ms)`,
        `로그아웃 응답 지연 : ${logoutResponseDelayMs}ms (상한 LOGOUT_TIMEOUT_MS=3500ms)`,
        `로그인 직후 쿠키   : ${loginSucceeded ? 'fortune_auth_token 있음 (로그인 성공)' : '없음'}`,
        `최종 쿠키          : ${JSON.stringify(cookiesAfterEverything)}`,
        '→ 뒤늦게 도착한 로그아웃 응답의 Max-Age=0 이 로그인 쿠키를 덮어썼다.',
      ].join('\n'),
);

/* ------------------------------------------------------------------ *
 * T2 — 그 결과가 이용권/결제 인식에 미치는 영향
 * ------------------------------------------------------------------ */

const accessRes = await globalThis.fetch(`${PAGE_ORIGIN}/api/me/access-state`);
record(
  'T2',
  '재로그인 직후 이용권 조회(/api/me/access-state)가 인증된다',
  accessRes.status === 200,
  accessRes.status === 200
    ? null
    : `status=${accessRes.status} — 세션 쿠키가 없어 이용권/해금 스냅샷을 받지 못한다 ("결제했는데 기능이 안 열림"의 경로).`,
);

/* ------------------------------------------------------------------ *
 * T3 — 로컬 힌트가 없다고 클라이언트가 게스트를 위조하면 안 된다
 * ------------------------------------------------------------------ */

resetBrowserState();
installMockFetch();
// 세션 쿠키는 살아 있지만 힌트(localStorage fortune_auth_user / fortune_auth_role 쿠키)만 없는 상태.
// T4 의 결함(refresh 가 role 쿠키를 재발행하지 않음)이 만들어 내는 바로 그 상태다.
applySetCookies([SESSION_SET_COOKIES[0], SESSION_SET_COOKIES[1]]);
sessionStorage.setItem('cd-test-sentinel', 'alive');

const sessionCache = await import(pathToFileURL(sessionCacheFile).href);
sessionCache.installUserAccessFetchCache();
// 브라우저에서는 globalThis === window 라 몽키패치가 곧 전역 fetch 다. 하네스에서도 같게 맞춘다.
globalThis.fetch = dom.window.fetch;

const hintPresent = sessionCache.hasClientAuthHint();
const meBefore = serverLog.filter((e) => e.path === '/api/auth/me').length;

let logoutBroadcast = false;
const onAuthChanged = (event) => {
  if (event?.detail?.event === 'logout') logoutBroadcast = true;
};
window.addEventListener('cd:auth-changed', onAuthChanged);

// T1 이 쓴 인스턴스와 상태가 섞이지 않도록 새 인스턴스로 부트스트랩을 다시 태운다.
const authStore = await import(`${pathToFileURL(authStoreFile).href}?page=t3`);
await authStore.refreshAuth({ force: false }).catch(() => null);

window.removeEventListener('cd:auth-changed', onAuthChanged);
const toastModule = await import(pathToFileURL(join(workDir, 'stub-toast.js')).href);
const meAfter = serverLog.filter((e) => e.path === '/api/auth/me').length;
const sentinelSurvived = sessionStorage.getItem('cd-test-sentinel') === 'alive';
const notTornDown = !logoutBroadcast && sentinelSurvived;

record(
  'T3',
  '합성 게스트 응답이 하드 로그아웃을 유발하지 않는다',
  notTornDown,
  notTornDown
    ? null
    : [
        `hasClientAuthHint() = ${hintPresent} (세션 쿠키는 유효)`,
        `실제 /api/auth/me 서버 요청 = ${meAfter - meBefore}회 (합성 응답이라 0이 정상)`,
        `logout 브로드캐스트 발생 = ${logoutBroadcast}`,
        `sessionStorage 보존      = ${sentinelSurvived}`,
        `표시된 토스트            = ${JSON.stringify(toastModule.shownToasts)}`,
        '→ auth-store.loadMeFromServer 가 클라이언트 합성 응답을 서버 확정 미인증으로 오인해',
        '  handleSessionInvalidated() 로 세션을 파기했다. 정본은 정적 셸의 같은 분기',
        "  (index.html: payload.reason === 'no_auth_hint' || payload.guest === true).",
      ].join('\n'),
);

/* ------------------------------------------------------------------ *
 * T5 — 로그인 직후 권한 조회가 두 번 나가지 않는가
 *      login() 이 무효화 방송("login")을 syncPostLoginData 보다 늦게 보내면, 그 사이에 뜬
 *      /api/me/access-state 응답이 "무효화 이후의 스테일 응답"으로 분류돼 캐시에 저장되지
 *      않는다. 받아 놓고 버리므로 다음 소비자가 같은 요청을 한 번 더 쏜다.
 * ------------------------------------------------------------------ */

resetBrowserState();
installMockFetch();
// 실제 앱은 부트스트랩에서 세션 캐시 몽키패치가 이미 깔린 상태로 로그인한다. installMockFetch 가
// 설치 플래그를 초기화하므로 여기서 다시 깔아야 그 조건이 재현된다 — 안 깔면 캐시가 없는 상태를
// 재는 셈이라 "중복"이 항상 나온다(측정 오류).
sessionCache.installUserAccessFetchCache();
globalThis.fetch = dom.window.fetch;

const loginStore = await import(`${pathToFileURL(authStoreFile).href}?page=t5`);
await loginStore.login({ email: 'a@b.com', password: 'password123', apiBase: PAGE_ORIGIN }).catch(() => null);
// syncPostLoginData 는 void 로 떠나므로 정착을 기다린다.
await sleep(120);
const accessAfterLogin = serverLog.filter((e) => e.path === '/api/me/access-state').length;

// 로그인 후 화면이 권한을 필요로 하는 시점(게이트·헤더 등)을 재현한다.
await sessionCache.ensureUserAccessLoaded();
const accessTotal = serverLog.filter((e) => e.path === '/api/me/access-state').length;
const noDuplicate = accessTotal === accessAfterLogin && accessAfterLogin === 1;

record(
  'T5',
  '로그인 직후 권한 조회(/api/me/access-state)가 한 번만 나간다',
  noDuplicate,
  noDuplicate
    ? null
    : [
        `로그인 중 요청  : ${accessAfterLogin}회`,
        `이후 소비자까지 : ${accessTotal}회 (1회가 정상)`,
        '→ login() 이 publishAuthSync("login") 을 syncPostLoginData 뒤에 보내, 방금 받은',
        '  access-state 응답이 캐시 세대 불일치로 버려졌다. 같은 파일의 hydrateAuthSuccessUser 는',
        '  이미 방송을 먼저 보내는 순서를 지키고 있다.',
      ].join('\n'),
);

/* ------------------------------------------------------------------ *
 * T6 — 로그인 직후 마운트되는 소비자가 /api/auth/me 를 다시 부르지 않는가
 *      login() 은 응답에 실려 온 사용자 스냅샷을 그대로 쓰고 /api/auth/me 를 일부러 건너뛴다.
 *      그런데 재검증 쿨다운(lastRefreshCompletedAt)을 장전하지 않으면, 직후 마운트되는
 *      위젯·게이트의 refreshAuth({force:false}) 가 쿨다운을 통과해 같은 데이터를 다시 가져온다.
 * ------------------------------------------------------------------ */

const meBeforeMount = serverLog.filter((e) => e.path === '/api/auth/me').length;
await loginStore.refreshAuth({ force: false });
const meAfterMount = serverLog.filter((e) => e.path === '/api/auth/me').length;
const noRedundantMe = meAfterMount === meBeforeMount;

record(
  'T6',
  '로그인 직후 마운트되는 소비자가 /api/auth/me 를 다시 부르지 않는다',
  noRedundantMe,
  noRedundantMe
    ? null
    : [
        `추가 /api/auth/me 요청 = ${meAfterMount - meBeforeMount}회`,
        '→ login() 이 성공 후 lastRefreshCompletedAt 을 채우지 않아 재검증 쿨다운이 꺼져 있다.',
        '  로그인 응답이 이미 같은 형태의 사용자를 실어 줬으므로 이 왕복은 순수 낭비다.',
        '  같은 파일의 hydrateAuthSuccessUser(소셜·가입 경로)는 이미 이 값을 채운다.',
      ].join('\n'),
);

/* ------------------------------------------------------------------ *
 * T4 — refresh 가 힌트 쿠키를 재발행하는가 (정적 단언)
 *      worker/ 는 Workers 런타임 전용이라 여기서 실행하지 않고 소스를 검사한다.
 *      이름 grep 이 아니라 중괄호 균형으로 handleRefresh 본문을 잘라 낸다(CLAUDE.md 원칙 6).
 * ------------------------------------------------------------------ */

function sliceBlock(source, openerIndex) {
  const start = source.indexOf('{', openerIndex);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

const workerAuth = read('worker/routes/auth.js');
const refreshIdx = workerAuth.indexOf('async function handleRefresh');
const refreshBody = refreshIdx >= 0 ? sliceBlock(workerAuth, refreshIdx) : '';
const refreshIssuesSession = /appendAuthCookies\s*\(/.test(refreshBody);
const refreshIssuesRoleHint = /appendAuthRoleCookie\s*\(/.test(refreshBody);

record(
  'T4',
  'handleRefresh 가 fortune_auth_role 힌트 쿠키도 함께 재발행한다',
  refreshIssuesSession && refreshIssuesRoleHint,
  refreshIssuesSession && refreshIssuesRoleHint
    ? null
    : [
        `handleRefresh 본문 발견 = ${refreshIdx >= 0}`,
        `appendAuthCookies 호출  = ${refreshIssuesSession}`,
        `appendAuthRoleCookie 호출 = ${refreshIssuesRoleHint}`,
        '→ refresh 쿠키는 회전마다 14일이 리셋되는데 role 힌트 쿠키는 최초 로그인 +14일에 고정 만료한다.',
        '  세션은 살아 있는데 힌트만 먼저 죽어 T3 의 위조 게스트 경로가 발화한다.',
      ].join('\n'),
);

/* ------------------------------------------------------------------ */

rmSync(workDir, { recursive: true, force: true });
dom.window.close();

const failed = results.filter((r) => !r.passed);
console.log('');
if (failed.length) {
  console.log(`${failed.length}/${results.length} 실패 — ${failed.map((r) => r.id).join(', ')}`);
  console.log('진단 단계에서는 이 실패가 결함의 증거다. 수정 후 전건 통과해야 한다.');
  process.exit(1);
}
console.log(`${results.length}/${results.length} 통과.`);
// auth-store 는 임포트 시 세션 하트비트 setInterval 을 건다 — 명시적으로 끝낸다.
process.exit(0);
