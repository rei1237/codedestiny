import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { HONEY_UNLOCK_PRODUCTS } from '../../worker/lib/honey-unlock-catalog.js';
const source = fs.readFileSync(new URL('../../js/prompt-hub-honey.js', import.meta.url), 'utf8');
const widget = '<section data-cd-honey-widget><strong data-cd-honey-balance></strong><button data-cd-honey-attend></button><p data-cd-honey-status></p><button data-cd-honey-retry hidden>retry</button></section>';
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
async function setup(mode = 'ok') {
  const dom = new JSDOM('<body>' + widget, { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  let status = mode, attendanceCalls = 0, finish;
  const win = dom.window, observers = [];
  const Observer = win.MutationObserver;
  win.MutationObserver = class extends Observer { constructor(callback) { super(callback); observers.push(this); } };
  win.cdBirthScopeCurrentProfileId = () => 'my-profile';
  win._cdAIPromptRequestJson = async (url, init) => {
    if (url.endsWith('/catalog')) return { ok: true, payload: { ok: true, products: HONEY_UNLOCK_PRODUCTS, otherUses: [] } };
    attendanceCalls++;
    if (status === 'pending') return new Promise(resolve => { finish = resolve; });
    if (status !== 'ok') return { ok: false, status: status === 'guest' ? 401 : 503, payload: {} };
    return { ok: true, payload: { ok: true, balance: 7, attended: init.method === 'POST' } };
  };
  win.eval(source); await tick();
  return { win, close: () => { observers.forEach(observer => observer.disconnect()); win.close(); }, status: value => { status = value; }, calls: () => attendanceCalls, finish: value => finish(value) };
}
test('guest attendance remains visible; failure is not a zero balance and retry recovers', async () => {
  const app = await setup('guest');
  try {
    const doc = app.win.document;
    assert.equal(doc.querySelector('[data-cd-honey-attend]').textContent, '출석 체크 하기');
    assert.equal(doc.querySelector('[data-cd-honey-attend]').disabled, false);
    app.status('error'); await app.win.CdHoney.refresh();
    assert.equal(doc.querySelector('[data-cd-honey-balance]').textContent, '조회 실패');
    assert.equal(doc.querySelector('[data-cd-honey-retry]').hidden, false);
    app.status('ok'); doc.querySelector('[data-cd-honey-retry]').click(); await tick();
    assert.equal(doc.querySelector('[data-cd-honey-balance]').textContent, '7개');
  } finally { app.close(); }
});
test('all product button adapters preserve cash handlers and show server honey prices', async () => {
  const app = await setup();
  try {
    let cashClicks = 0;
    for (const item of HONEY_UNLOCK_PRODUCTS.filter(item => item.billingType === 'birth_unlock')) {
      const button = app.win.document.createElement('button');
      button.dataset.honeyCashKey = item.featureKey;
      button.addEventListener('click', () => cashClicks++);
      app.win.document.body.append(button);
    }
    app.win.CdHoney.refreshLabels();
    for (const item of HONEY_UNLOCK_PRODUCTS.filter(item => item.billingType === 'birth_unlock')) {
      const button = app.win.document.querySelector(`[data-honey-cash-key="${item.featureKey}"]`);
      assert.match(button.textContent, new RegExp(item.cashPriceKRW.toLocaleString('ko-KR')));
      assert.equal(button.nextElementSibling.querySelector('strong').textContent, `${item.honeyCost}개`);
      button.click();
    }
    assert.equal(cashClicks, 22);
  } finally { app.close(); }
});
test('double clicks coalesce and stale account responses cannot overwrite the new balance', async () => {
  const app = await setup();
  try {
    app.status('pending');
    app.win.document.querySelector('[data-cd-honey-attend]').click();
    app.win.document.querySelector('[data-cd-honey-attend]').click();
    assert.equal(app.calls(), 2);
    app.status('guest'); app.win.dispatchEvent(new app.win.Event('cd:auth-changed')); await tick();
    app.finish({ ok: true, payload: { ok: true, balance: 999, attended: true } }); await tick();
    assert.equal(app.win.document.querySelector('[data-cd-honey-balance]').textContent, '로그인 후 확인');
  } finally { app.close(); }
});

test('attendance copy stays actionable until the server confirms today, then shows completion', async () => {
  const app=await setup();
  try {
    const button=app.win.document.querySelector('[data-cd-honey-attend]');
    assert.equal(button.textContent,'출석 체크 하기');
    app.status('pending'); button.click();
    assert.equal(button.textContent,'출석 체크 하기');
    assert.equal(button.getAttribute('aria-busy'),'true');
    app.finish({ok:true,payload:{ok:true,balance:8,attended:true}}); await tick();
    assert.equal(button.textContent,'오늘 출석 체크 완료');
    assert.equal(button.disabled,true);
  } finally { app.close(); }
});
