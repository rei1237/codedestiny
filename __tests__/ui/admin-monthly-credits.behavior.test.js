
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const React = require('react');
const { act } = React;

function loadPage(api) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const req = (id) => {
      if (id.endsWith('/admin-api')) return { adminFetch: api, describeAdminError: error => ({ message: error.message }) };
      if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      if (id === 'next/image') return { __esModule: true, default: props => React.createElement('img', props) };
      if (!id.startsWith('.')) return require(id);
      return load(path.resolve(path.dirname(file), id + '.ts'));
    };
    new Function('require', 'module', 'exports', source)(req, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load(path.resolve('app/admin/monthly-credits/page.tsx')).default;
}

async function mount(api) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://example.test/admin/monthly-credits/' });
  for (const key of ['window', 'document', 'HTMLElement', 'Event', 'MouseEvent']) global[key] = dom.window[key];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.requestAnimationFrame = fn => setTimeout(fn, 0);
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(loadPage(api))));
  return {
    input: id => document.getElementById(id),
    button: () => document.querySelector('button[type="submit"]'),
    confirmation: () => document.querySelector('input[type="checkbox"]'),
    async change(id, value) {
      await act(async () => {
        const element = document.getElementById(id);
        Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set.call(element, value);
        element.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
    },
    async click(element) { await act(async () => element.click()); },
    async submit() { await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))); },
    async fill() {
      await this.change('grant-email', ' Review@Example.test ');
      await this.change('grant-amount', '2000');
      await this.change('grant-reason', ' 상담 지연 보상 ');
      await this.change('grant-campaign', ' test-campaign ');
    },
    async close() { await act(async () => root.unmount()); dom.window.close(); },
  };
}

const response = (idempotent = false) => ({
  ok: true, idempotent,
  grant: { email: '', amount: 2000, balanceAfter: 2500, expiresAt: '2026-11-27T01:00:00.000Z' },
});

test('review follows edits; submission locks, success ends the request, and next grant starts explicitly', async () => {
  const calls = [];
  let finish;
  const ui = await mount((url, options) => { calls.push({ url, ...options }); return new Promise(resolve => { finish = resolve; }); });
  try {
    assert.ok(ui.button().disabled);
    assert.ok(ui.confirmation().disabled);
    await ui.fill();
    await ui.click(ui.confirmation());
    assert.equal(ui.button().disabled, false);
    await ui.change('grant-reason', '확인한 보상 사유');
    assert.equal(ui.confirmation().checked, false);
    assert.ok(ui.button().disabled);
    await ui.click(ui.confirmation());
    await ui.submit();
    assert.ok(ui.button().disabled);
    assert.equal(ui.input('grant-email').matches(':disabled'), true);
    assert.match(ui.button().textContent, /지급 처리 중/);
    await ui.submit();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/admin/monthly-credits/grant');
    assert.deepEqual(Object.keys(calls[0].body).sort(), ['amount', 'campaignId', 'email', 'idempotencyKey', 'reason']);
    assert.equal(calls[0].body.email, 'review@example.test');
    assert.equal(calls[0].body.amount, 2000);
    assert.equal(calls[0].body.campaignId, 'test-campaign');
    await act(async () => finish(response()));
    assert.equal(ui.button(), null);
    assert.equal(document.activeElement.id, 'grant-result-title');
    assert.match(document.querySelector('[aria-labelledby="grant-result-title"]').textContent, /review@example.test/);
    await ui.submit();
    assert.equal(calls.length, 1);
    const next = [...document.querySelectorAll('button')].find(button => button.textContent.includes('새 지급 준비하기'));
    await ui.click(next);
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)));
    assert.equal(ui.input('grant-email').value, '');
    assert.equal(ui.input('grant-amount').value, '');
    assert.equal(document.activeElement.id, 'grant-email');
    assert.ok(ui.button().disabled);
  } finally { await ui.close(); }
});

test('invalid quantity stays disabled and a retry preserves the same request key', async () => {
  const calls = [];
  const ui = await mount(async (url, options) => {
    calls.push({ url, ...options });
    if (calls.length === 1) throw new Error('모의 응답 오류: 다시 확인해 주세요.');
    return response(true);
  });
  try {
    await ui.fill();
    await ui.change('grant-amount', '1000000');
    assert.ok(ui.button().disabled);
    assert.ok(ui.confirmation().disabled);
    await ui.change('grant-amount', '2000');
    await ui.click(ui.confirmation());
    await ui.submit();
    assert.match(document.querySelector('[role="alert"]').textContent, /모의 응답 오류/);
    assert.equal(ui.button().disabled, false);
    await ui.submit();
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.idempotencyKey, calls[1].body.idempotencyKey);
    assert.match(document.body.textContent, /이미 처리된 요청의 결과/);
    assert.equal(ui.button(), null);
  } finally { await ui.close(); }
});

test('a response without a grant keeps recovery guidance and does not show completion', async () => {
  const ui = await mount(async () => ({ ok: true }));
  try {
    await ui.fill();
    await ui.click(ui.confirmation());
    await ui.submit();
    assert.match(document.querySelector('[role="alert"]').textContent, /지급 응답을 확인하지 못했습니다/);
    assert.equal(document.getElementById('grant-result-title'), null);
    assert.equal(ui.input('grant-email').matches(':disabled'), false);
  } finally { await ui.close(); }
});
