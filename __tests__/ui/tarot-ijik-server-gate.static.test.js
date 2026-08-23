/**
 * 커리어 전환 타로의 리딩 생성기가 브라우저로 되돌아오지 않게 막는 가드.
 *
 * 2026-08-24 이전 상태: 결제는 `/api/billing/coin-gate` 가 서버에서 차감하는데 **리딩은
 * 브라우저가 만들었다.** 같은 페이지의 `callTarotApi` 는 정의만 있고 호출부가 0곳이라,
 * 서버는 이 상품의 콘텐츠를 한 번도 만든 적이 없었다. 콘솔 한 줄이면 5,000원짜리 결과가
 * 공짜로 나왔다.
 *
 * 🔴 정적 호스팅이라 `js/**` 아래 파일은 아무도 import 하지 않아도 URL 로 그냥 열린다.
 *    "import 를 끊었다"로는 부족하고 파일이 그 아래 **없어야** 한다. 배포되는 것은 미러이므로
 *    `public/` 도 함께 본다 — 꽃 작업에서 미러가 남아 우회가 열려 있던 실사고가 있었다.
 *
 * 🔴 **여기는 배치만 본다.** 게이트가 실제로 막는지는 라우트를 돌리는
 *    `__tests__/worker/tarot-ijik-reading.route.test.js` 가 본다. 둘 중 하나만 남기지 말 것.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const PAGE_REL = 'tarot-ijik.html';
const ENGINE_REL = 'worker/lib/tarot-ijik-reading.js';
const ROUTE_REL = 'worker/routes/tarot.js';

/** 🔴 주석을 걷어낸다 — 이 가드를 설명하는 주석에 금지 심볼이 들어가 자기 자신에 걸린다. */
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((line) => line.replace(/^\s*\/\/.*$/, ''))
  .join('\n');

/** 브라우저에 서빙되는 JS/HTML 을 전수 수집한다. 0건이면 실패 — fail-closed. */
function browserServedFiles() {
  const out = [];
  const skip = new Set(['node_modules', '.git', 'coverage']);
  const roots = ['js', 'public'].filter((rel) => exists(rel));
  assert.equal(roots.length, 2, 'js/ 또는 public/ 을 찾지 못했다 — 스캐너가 빗나갔다');
  for (const rel of roots) {
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(js|html)$/.test(entry.name)) out.push(path.relative(root, full).split(path.sep).join('/'));
      }
    })(path.join(root, rel));
  }
  out.push(PAGE_REL);
  assert.ok(out.length > 100, `서빙 파일을 ${out.length}개만 찾았다 — 스캐너가 빗나갔다`);
  assert.ok(out.some((f) => f.startsWith('public/')), '미러를 하나도 못 봤다 — 배포되는 쪽을 안 보는 가드는 가드가 아니다');
  return out;
}

test('판정 모듈이 브라우저 경로에 없다', () => {
  assert.ok(exists(ENGINE_REL), '워커에 리딩 모듈이 없다 — 옮기다 만 상태다');
  for (const dir of ['js', 'public/js']) {
    assert.ok(
      !exists(`${dir}/tarot-job-change-assessment.js`),
      `${dir} 에 판정 모듈이 돌아왔다 — URL 로 그대로 열린다`,
    );
  }
});

test('브라우저에 서빙되는 어디에도 리딩 생성기가 없다', () => {
  // 유료 산출물을 만드는 심볼. 하나라도 브라우저 쪽에 있으면 로컬 생성이 가능하다는 뜻이다.
  const FORBIDDEN = [
    'createLocalJobChangeReading',
    'JOB_CHANGE_READING_BY_POSITION',
    'CARD_SIGNAL_BY_ID',
    'buildIjikAiPromptText',
    'assessJobChange',
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const symbol of FORBIDDEN) {
      if (source.includes(symbol)) offenders.push(`${rel} → ${symbol}`);
    }
  }
  assert.deepEqual(offenders, [], '브라우저에 리딩 생성기가 남아 있다:\n  ' + offenders.join('\n  '));
});

test('페이지는 결제 뒤에 서버 리딩을 요청한다', () => {
  const page = stripComments(read(PAGE_REL));
  assert.ok(/async function fetchIjikReading\(/.test(page), '서버 리딩 요청 함수가 없다');
  assert.ok(/callTarotApi\('ijik-reading'/.test(page), 'ijik-reading 라우트를 부르지 않는다');
  // 🔴 변수의 존재가 아니라 **호출 지점**을 본다. 선언만 남기고 인자를 비워도 통과하던
  //    느슨한 단언이었다(2026-08-24 음성 테스트에서 놓쳤다).
  assert.ok(
    /fetchIjikReading\(\s*drawnCards\s*,\s*_ijikLastRequestId\s*\)/.test(page),
    '결제 requestId 를 리딩 요청에 넘기지 않는다 — 증빙 조회의 열쇠라 빠지면 결제한 사용자가 402 를 맞는다',
  );
  assert.ok(
    /_ijikLastRequestId\s*=\s*requestId/.test(page),
    '결제 게이트가 만든 requestId 를 보관하지 않는다',
  );

  const gateIndex = page.indexOf('await ijikCoinGate(');
  const fetchIndex = page.indexOf('await fetchIjikReading(');
  assert.ok(gateIndex >= 0 && fetchIndex > gateIndex, '리딩 요청이 결제보다 먼저다');
});

test('서버 실패 시 로컬 폴백으로 새지 않는다', () => {
  const page = stripComments(read(PAGE_REL));
  // 🔴 예전에는 catch 에서 createLocalJobChangeReading 을 다시 불렀다. 그게 곧 무료 우회다.
  const at = page.indexOf('async function getReading(');
  assert.ok(at > 0, 'getReading 을 못 찾았다');
  const body = page.slice(at, page.indexOf('\n}\n', at));
  assert.ok(!/createLocal|JOB_CHANGE_READING_BY_POSITION/.test(body), 'getReading 이 로컬 생성으로 폴백한다');
  assert.ok(/추가 결제 없이/.test(body), '실패 안내가 재결제 불필요를 알리지 않는다');
});

test('라우트가 회당 결제를 확인하고 미결제에 402 를 낸다', () => {
  const route = stripComments(read(ROUTE_REL));
  assert.ok(/"\/ijik-reading"/.test(route), 'ijik-reading 라우트가 없다');
  assert.ok(/IJIK_READING_FEATURE_KEY = "tarot-ijik"/.test(read(ROUTE_REL)), '기능 키가 tarot-ijik 이 아니다');
  assert.ok(/verifyTarotPerUseAccess\(request, env, body, \{/.test(route), '증빙 판정기를 거치지 않는다');
  assert.ok(/verifyPerUsePayment\(/.test(route), 'verifyPerUsePayment 를 쓰지 않는다');

  // 🔴 클라이언트가 보낸 결제 주장을 신뢰하면 그게 곧 우회다.
  assert.ok(
    !/body\?\.(paid|verified|entitled|accessGranted)/.test(route),
    '라우트가 클라이언트가 보낸 결제 주장을 읽는다',
  );
});

test('증빙 판정기가 세 번째 사본이 아니다', () => {
  const route = stripComments(read(ROUTE_REL));
  // verifyPerUsePayment 호출은 라우트마다 하나씩 — 새로 베낀 사본이 늘면 여기서 잡힌다.
  const calls = (route.match(/verifyPerUsePayment\(env, \{/g) || []).length;
  assert.ok(calls <= 3, `verifyPerUsePayment 호출이 ${calls}곳이다 — 증빙 로직을 또 베꼈다`);
  assert.ok(
    /async function verifyTarotPerUseAccess\(request, env, body, spec\)/.test(route),
    '매개변수화된 판정기가 사라졌다',
  );
});
