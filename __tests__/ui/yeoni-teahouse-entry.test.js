const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, URLSearchParams, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }});
  return exports;
}
const entry = load('lib/fortune/yeoni-entry.ts');

test('old entry and payment return select the same chat without changing the URL', () => {
  for (const query of ['', 'character=yeoni', 'paymentId=paid%2Fone&code=SUCCESS&lang=ja']) {
    const params = new URLSearchParams(query), original = params.toString();
    assert.equal(entry.teaHouseSurface(params, true), 'chat');
    assert.equal(params.toString(), original);
  }
});

test('all stored result families resolve without becoming a new tea consultation', () => {
  assert.equal(entry.teaHouseSurface(new URLSearchParams('')), 'tea');
  for (const query of ['counsel=letter', 'session=old-session', `consultation=${'a'.repeat(64)}`]) {
    assert.equal(entry.teaHouseSurface(new URLSearchParams(query)), 'chat');
  }
  assert.equal(entry.teaHouseSurface(new URLSearchParams('resultId=tea-result&counsel=letter')), 'saved-tea');
});

function renderEntry(query) {
  const effects = [], calls = [], params = new URLSearchParams(query);
  const auth = { user: { id: 'owner' } };
  const { default: Component } = load('app/fortune-chat/FortuneChatEntry.tsx', {
    react: { useState: init => [typeof init === 'function' ? init() : init, () => {}], useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx: (type, props, key) => ({ type, props, key }) },
    'next/navigation': { useSearchParams: () => params },
    '@/app/_lib/auth-store': { useAuthStore: () => auth, getAuthState: () => ({ authReady: true }) },
    'next/dynamic': { default: loader => {
      const source = loader.toString();
      if (source.includes('./FortuneChatClient')) return 'legacy';
      assert.ok(source.includes('./ConsultationRoom'), 'Only known consultation leaves are deferred');
      return 'engine';
    } },
    './ConsultationEntrance': { default: 'entrance' },
    './consultation-api': { isConsultationId: value => /^[a-f0-9]{64}$/.test(value), consultationApi: {
      status: () => { calls.push('status'); return Promise.resolve(true); },
    } },
  });
  const view = Component();
  effects.forEach(effect => effect());
  return { view, calls };
}

test('a saved legacy session bypasses the new engine flag and keeps the owner boundary', () => {
  const { view, calls } = renderEntry('session=old-session');
  assert.equal(view.type, 'legacy');
  assert.equal(view.key, 'owner');
  assert.deepEqual(calls, []);
});

test('an existing engine consultation opens its original ID without probing new-consultation availability', () => {
  const id = 'b'.repeat(64);
  const { view, calls } = renderEntry(`consultation=${id}&character=neo`);
  assert.equal(view.type, 'engine');
  assert.equal(view.props.initialId, id);
  assert.equal(view.key, 'owner');
  assert.deepEqual(calls, []);
});

test('compatibility entry reuses the tea house without interrupting checkout returns', () => {
  const source = fs.readFileSync('app/fortune-chat/FortuneChatCompatibility.tsx', 'utf8');
  assert.match(source, /<FortuneTeaHouseClient legacyChat/);
  assert.doesNotMatch(source, /fetch\(|consultationApi|useCoinGate|window.location|router.replace/);
});
