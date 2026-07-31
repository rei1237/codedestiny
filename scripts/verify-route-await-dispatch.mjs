// 워커 라우터의 "await 없는 위임" 가드.
//
// 이 가드가 존재하는 이유(2026-08-01 작명 AI 장애):
//   handleNamingPromptRoutes 는 try/catch 로 감싸고도 `return handleCheckout(request, env)` 처럼
//   await 없이 핸들러 프로미스를 그대로 돌려줬다. async 함수의 try/catch 는 "반환된 프로미스"의
//   거부(rejection)를 잡지 못한다 — 그래서 비로그인 사용자의 평범한 401 조차 catch 를 빠져나가
//   Cloudflare 의 불투명한 `error code: 1101` 500 페이지가 됐다(CORS 헤더도 없어 프론트가
//   본문을 읽지도 못한다). /api/naming-prompt 의 checkout·verify-payment·generate·result 4개
//   경로가 전부 이 상태였고, 인라인 json() 을 돌려주는 404 경로만 멀쩡해 보였다.
//
//   증상이 "가끔 500"이 아니라 "에러가 전부 500"이라 원인 추적이 오래 걸린다. 한 글자(await)
//   차이라 리뷰에서도 잘 안 보인다. 그래서 소스 수준에서 강제한다.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const routesDir = resolve(root, 'worker/routes');

// `if (...) return someHandler(request...)` — await 없이 핸들러를 위임하는 형태.
// 인라인 json(...)/notFound()/methodNotAllowed() 같은 즉시 응답은 대상이 아니다
// (프로미스를 돌려주지 않으므로 try/catch 를 빠져나갈 rejection 이 없다).
const DISPATCH_WITHOUT_AWAIT = /^\s+if\s*\(.*\)\s*return\s+(?!await\b)([A-Za-z_$][\w$]*)\s*\(\s*request\b/;

// 🔴 이름 기반 스캔만으로 판단하지 말 것 (CLAUDE.md 원칙 6).
//    파일 전체를 훑으면 `request` 라는 이름의 **평범한 데이터 객체**를 받는 동기 빌더나
//    (fortune-tea-house 의 buildCategorySajuDeepSections), 의도적으로 프로미스를 그대로
//    돌려주는 메모이제이션 헬퍼(billing 의 resolveBillingRequestAuth — 소비자별 catch 의미를
//    보존하려고 일부러 await 하지 않는다)까지 오탐한다. 실제로 이 가드 첫 판에서 둘 다 걸렸다.
//    그래서 라우터 진입점(`export async function handle*Routes`) 본문만 중괄호 균형으로
//    잘라내어 그 안에서만 검사한다.
function extractRouterBodies(source) {
  const bodies = [];
  const entry = /export\s+async\s+function\s+(handle[A-Za-z0-9_]*Routes)\s*\(/g;
  let match;
  while ((match = entry.exec(source))) {
    // 🔴 파라미터 목록을 먼저 건너뛴다. 그냥 다음 '{' 를 잡으면 `(request, env = {})` 의
    //    기본값 중괄호에 걸려 본문이 "{}" 로 잘린다 — 그 라우터는 조용히 미검사로 빠진다
    //    (실제로 master-love-codex·life-book-ai 가 이렇게 새어 변이 테스트에서 드러났다).
    let parenDepth = 1;
    let cursor = entry.lastIndex;
    while (cursor < source.length && parenDepth > 0) {
      const ch = source[cursor];
      if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth -= 1;
      cursor += 1;
    }
    if (parenDepth !== 0) continue;

    const braceStart = source.indexOf('{', cursor);
    if (braceStart < 0) continue;
    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end < 0) continue;
    bodies.push({
      name: match[1],
      body: source.slice(braceStart, end + 1),
      startLine: source.slice(0, braceStart).split('\n').length,
    });
  }
  return bodies;
}

const offenders = [];
let scannedRouters = 0;

for (const file of readdirSync(routesDir).filter((name) => name.endsWith('.js'))) {
  const source = readFileSync(resolve(routesDir, file), 'utf8');

  for (const router of extractRouterBodies(source)) {
    // try 블록이 없는 라우터는 애초에 catch 가 없어 이 함정이 성립하지 않는다.
    if (!/\btry\s*\{/.test(router.body)) continue;
    scannedRouters += 1;

    router.body.split('\n').forEach((line, index) => {
      const match = line.match(DISPATCH_WITHOUT_AWAIT);
      if (!match) return;
      offenders.push(
        `${file}:${router.startLine + index}  (${router.name})  return ${match[1]}(request…)  → 'return await' 필요`,
      );
    });
  }
}

assert.ok(scannedRouters >= 20, `라우터를 ${scannedRouters}개만 스캔했다 — 추출 로직이 깨졌는지 확인 필요`);

assert.deepEqual(
  offenders,
  [],
  `try/catch 안에서 await 없이 핸들러를 위임하면 그 거부(rejection)는 catch 를 빠져나가\n`
    + `Cloudflare 1101(불투명 500, CORS 헤더 없음)이 된다. 'return await' 로 고칠 것:\n  `
    + offenders.join('\n  '),
);

console.log(`[verify-route-await-dispatch] PASS — 라우터 ${scannedRouters}개 검사, await 누락 없음`);
