import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const runtime = read('js/core/index-inline-runtime.js');
const honey = read('js/prompt-hub-honey.js');
const PATH = '/ggulggul/?action=openTarot&concern=job';

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' 정의가 있어야 한다');
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && (depth -= 1) === 0) return source.slice(start, i + 1);
  }
  throw new Error(name + ' 본문을 끝까지 읽지 못했다');
}

// 게이트 함수를 jsdom 창 위에서 실행하되, 이동은 location.assign 대신 기록만 한다.
function bootGate(setup) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test' + PATH + '#frag' });
  const calls = { modal: [], assigned: [] };
  const { pathname, search } = dom.window.location;
  const win = { location: { pathname, search, hash: '#frag', assign: url => calls.assigned.push(url) } };
  setup(win, calls);
  const gate = runInNewContext('(function (window) {' + extractFunction(runtime, '__cdGateLogin') + '; return __cdGateLogin; })', {})(win);
  return { gate, calls };
}

test('잠금 타일, 토템, 꽃 아틀리에 로그인 게이트에 confirm 과 루트 복귀가 남지 않는다', () => {
  for (const n of ['001', '002', '003']) {
    assert.ok(!runtime.includes('_indexRuntimeText("indexRuntime.confirm.' + n + '")'), 'confirm.' + n + ' 호출이 남았다');
  }
  assert.ok(!runtime.includes("'/login?next=%2F'"), "'/login?next=%2F' 가 남았다");
  assert.equal((runtime.match(/__cdGateLogin\('/g) || []).length >= 3, true);
});

test('꿀방울 출석 로그인은 홈 루트 대신 현재 경로로 돌아온다', () => {
  assert.ok(!honey.includes("encodeURIComponent('/')"));
  assert.ok(honey.includes('__cdGateLogin'));
});

test('로그인 모달이 있으면 쿼리까지 담은 현재 경로를 nextPath 로 넘긴다', () => {
  const { gate, calls } = bootGate((w, c) => {
    w.__cdOpenLoginRequiredModal = opts => { c.modal.push(opts); return true; };
  });
  assert.equal(gate('tile_lock'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.modal)), [{ nextPath: PATH, reason: 'tile_lock' }]);
  assert.deepEqual(calls.assigned, []);
});

test('__cdResolveLoginNextPath 가 있으면 그 결과를 nextPath 로 쓴다', () => {
  const { gate, calls } = bootGate((w, c) => {
    w.__cdOpenLoginRequiredModal = opts => { c.modal.push(opts); return true; };
    w.__cdResolveLoginNextPath = (p, reason) => p + '#resolved-' + reason;
  });
  gate('coin_gate');
  assert.equal(calls.modal[0].nextPath, PATH + '#resolved-coin_gate');
});

test('로그인 모달이 없으면 /login/?next=현재경로 로 이동한다', () => {
  const { gate, calls } = bootGate(() => {});
  assert.equal(gate('tile_lock'), false);
  assert.deepEqual(calls.assigned, ['/login/?next=' + encodeURIComponent(PATH)]);
});
