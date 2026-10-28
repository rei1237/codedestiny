import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { HONEY_UNLOCK_PRODUCTS } from '../../worker/lib/honey-unlock-catalog.js';
const source = fs.readFileSync(new URL('../../js/prompt-hub-honey.js', import.meta.url), 'utf8');
const widget = '<section class="cdh-honey" data-cd-honey-widget><img class="cdh-honey__yeoni"><div class="cdh-honey__wallet"><img src="/images/fortune-tea-house/honey-drop-jewel-v1.webp"></div><strong data-cd-honey-balance></strong><button data-cd-honey-attend></button><p data-cd-honey-status></p><button data-cd-honey-retry hidden>retry</button></section>';
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
async function setup(mode = 'ok', options = {}) {
  const dom = new JSDOM('<body>' + widget, { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  let status = mode, attendanceCalls = 0, finish;
  const win = dom.window, observers = [], animations = [];
  const requests = [];
  function setLocale(locale) {
    const dictionary = JSON.parse(fs.readFileSync(new URL('../../public/i18n/' + locale.toLowerCase() + '.json', import.meta.url), 'utf8'));
    win.document.documentElement.lang = locale;
    win.cdGetCurrentLanguage = () => locale;
    win.cdTranslate = (key, vars, fallback) => {
      const value = key.split('.').reduce((node, part) => node?.[part], dictionary);
      assert.equal(typeof value, 'string', locale + ': ' + key);
      return (value || fallback).replace(/\{(\w+)\}/g, (_, name) => vars[name]);
    };
    win.dispatchEvent(new win.Event('cd:locale-ready'));
  }
  if (options.locale) setLocale(options.locale);
  win.matchMedia = () => ({ matches: Boolean(options.reducedMotion) });
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 160 });
  win.HTMLElement.prototype.animate = function () {
    if (options.animationError) throw new Error("Animation unavailable");
    const entry = { cancelled: false }; animations.push(entry);
    return { cancel: () => { entry.cancelled = true; } };
  };
  const Observer = win.MutationObserver;
  win.MutationObserver = class extends Observer { constructor(callback) { super(callback); observers.push(this); } };
  win.cdBirthScopeCurrentProfileId = () => 'my-profile';
  win._cdAIPromptRequestJson = async (url, init) => {
    requests.push({ url, method: init.method });
    if (url.endsWith('/catalog')) return { ok: true, payload: { ok: true, products: HONEY_UNLOCK_PRODUCTS, otherUses: [] } };
    if (url.includes('/unlocks?')) return {ok:true,payload:{ok:true,featureKeys:[]}};
    attendanceCalls++;
    if (status === 'pending') return new Promise(resolve => { finish = resolve; });
    if (status !== 'ok') return { ok: false, status: status === 'guest' ? 401 : 503, payload: {} };
    return { ok: true, payload: { ok: true, balance: init.method === 'POST' && !options.noCredit ? 8 : 7, attended: init.method === 'POST' } };
  };
  win.eval(source); await tick();
  return { win, animations, requests, setLocale, close: () => { observers.forEach(observer => observer.disconnect()); win.close(); }, status: value => { status = value; }, calls: () => attendanceCalls, finish: value => finish(value) };
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
    assert.equal(app.animations.length, 0);
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
 test('collection plays only on a credited attendance and cancels on account change', async () => {
  const app = await setup();
  try {
    assert.equal(app.animations.length, 0, 'initial balance lookup must not celebrate');
    await app.win.CdHoney.refresh(true);
    assert.equal(app.animations.length, 5);
    assert.equal(app.win.document.querySelectorAll('.cdh-honey__collection img').length, 4);
    assert.equal(app.win.document.querySelector('[data-cd-honey-balance]').textContent, '8개');
    await app.win.CdHoney.refresh(true);
    assert.equal(app.animations.length, 5, 'already credited responses must not replay');
    app.win.dispatchEvent(new app.win.Event('cd:auth-changed'));
    assert.equal(app.win.document.querySelector('.cdh-honey__collection'), null);
    assert.ok(app.animations.every(animation => animation.cancelled));
    await tick();
  } finally { app.close(); }
 });
 test('reduced motion, zero credit and request failure never create collection particles', async () => {
  for (const [mode, options] of [['ok', { reducedMotion: true }], ['ok', { noCredit: true }], ['error', {}]]) {
    const app = await setup(mode, options);
    try {
      await app.win.CdHoney.refresh(true);
      assert.equal(app.animations.length, 0);
      assert.equal(app.win.document.querySelector('.cdh-honey__collection'), null);
    } finally { app.close(); }
  }
 });
 test('animation failure does not hide a successful credit or leave a decorative layer', async () => {
  const app = await setup('ok', { animationError: true });
  try {
    await app.win.CdHoney.refresh(true);
    assert.equal(app.win.document.querySelector('[data-cd-honey-balance]').textContent, '8개');
    assert.match(app.win.document.querySelector('[data-cd-honey-status]').textContent, /꿀방울 1개를 모았어요! 현재 8개/);
    assert.equal(app.win.document.querySelector('.cdh-honey__collection'), null);
  } finally { app.close(); }
 });

test('use guide groups catalog products and labels costs, eligibility and per-request terms', async()=>{
 const app=await setup();try{
 const d=app.win.document;d.body.insertAdjacentHTML('beforeend','<button data-cd-sheet-open="cdHoneySheet">사용처 보기</button><div id="cdHoneySheet"><p data-cd-honey-sheet-state></p><div data-cd-honey-uses></div></div>');
 d.querySelector('[data-cd-sheet-open]').click();await tick();await tick();
 assert.equal(d.querySelectorAll('.cd-honey-use-group').length,6);
 assert.equal(d.querySelectorAll('.cd-honey-use').length,HONEY_UNLOCK_PRODUCTS.length);
 assert.equal(d.querySelectorAll('.cd-honey-use .cd-honey-eligible').length,HONEY_UNLOCK_PRODUCTS.length);
 for(const row of d.querySelectorAll('.cd-honey-use')){assert.match(row.querySelector('.cd-honey-use__meta').textContent,/꿀방울 \d+개/);assert.ok(row.querySelector('a').getAttribute('aria-label'));}
 assert.match(d.querySelector('[data-cd-honey-uses]').textContent,/요청할 때마다 사용/);
 assert.match(d.querySelector('[data-cd-honey-uses]').textContent,/추가 사용 없음/);
 assert.match(d.querySelector('[data-cd-honey-sheet-state]').textContent,/7개/);
 assert.equal(d.querySelectorAll('.cd-honey-use button').length,0,'discovery never charges');
 }finally{app.close();}
});


test('per-use confirmation explains each request and cancellation never unlocks', async()=>{
 const app=await setup();
 try {
  const item=HONEY_UNLOCK_PRODUCTS.find(p=>p.billingType==='per_use');
  const doc=app.win.document;
  doc.body.insertAdjacentHTML('beforeend','<dialog id="cdHoneyUnlockSheet"><p data-honey-confirm-title></p><p data-honey-confirm-cost></p><p data-honey-confirm-condition></p><button data-honey-confirm></button></dialog><button id="useHoney"></button>');
  app.win.isTileKeyUnlocked=()=>true; // A legacy UI flag cannot skip a per-use confirmation.
  app.win.CodeDestinyShellSheet={open(){},close(){}};
  const before=app.calls();
  const pending=app.win.CdHoney.unlockUse(doc.querySelector('#useHoney'),item.featureKey,{},'mock-request');
  await tick();
  assert.match(doc.querySelector('[data-honey-confirm-condition]').textContent,/이번 요청/);
  assert.match(doc.querySelector('[data-honey-confirm-cost]').textContent,/개/);
  doc.querySelector('dialog').dispatchEvent(new app.win.Event('cancel'));
  assert.equal(await pending,false);
  assert.equal(app.calls(),before+1); // Only the read-only balance refresh.
 } finally { app.close(); }
});

test('reduced motion still announces credit; no credit and failed requests never claim a reward', async () => {
  for (const [mode, options, credited] of [['ok', { reducedMotion: true }, true], ['ok', { noCredit: true }, false], ['error', {}, false]]) {
    const app = await setup(mode, options);
    try {
      await app.win.CdHoney.refresh(true);
      assert.equal(app.win.document.querySelector('[data-cd-honey-status]').textContent.includes('1개를 모았어요'), credited);
      assert.equal(app.animations.length, 0);
    } finally { app.close(); }
  }
});

for (const locale of ['en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
  test(locale + ': all 24 products, prices, controls and a cancelled confirmation use the locale', async () => {
    const app = await setup('ok', { locale });
    try {
      const { win } = app, doc = win.document;
      doc.body.insertAdjacentHTML('beforeend', '<button data-cd-sheet-open="cdHoneySheet">open</button><dialog id="cdHoneySheet" open><p data-cd-honey-sheet-state></p><div data-cd-honey-uses></div></dialog><button id="useHoney"></button><dialog id="cdHoneyUnlockSheet"><h3 data-honey-confirm-title></h3><p data-honey-confirm-cost></p><p data-honey-confirm-condition></p><button data-honey-confirm></button></dialog>');
      doc.querySelector('[data-cd-sheet-open]').click(); await tick();
      assert.equal(doc.querySelectorAll('.cd-honey-use').length, 24);
      for (const row of doc.querySelectorAll('.cd-honey-use')) {
        assert.doesNotMatch(row.textContent + row.querySelector('a').getAttribute('aria-label'), /[가-힣]|\{\w+\}|honeyUI\./);
        const key = new URL(row.querySelector('a').href).searchParams.get('honeyContent');
        const item = HONEY_UNLOCK_PRODUCTS.find(product => product.featureKey === key);
        assert.ok(item);
        assert.ok(row.querySelector('.cd-honey-use__meta').textContent.includes(Number(item.honeyCost).toLocaleString(locale)));
      }
      assert.doesNotMatch(doc.querySelector('[data-cd-honey-widget]').textContent, /[가-힣]/);
      win.CodeDestinyShellSheet = { open() {}, close() {} };
      const item = HONEY_UNLOCK_PRODUCTS.find(product => product.billingType === 'per_use');
      const pending = win.CdHoney.unlockUse(doc.querySelector('#useHoney'), item.featureKey, {}, 'test-only');
      await tick();
      assert.doesNotMatch(doc.querySelector('#cdHoneyUnlockSheet').textContent, /[가-힣]|\{\w+\}/);
      app.setLocale('ko'); await tick();
      assert.match(doc.querySelector('#cdHoneyUnlockSheet').textContent, /이번 요청/);
      app.setLocale(locale); await tick();
      assert.doesNotMatch(doc.querySelector('#cdHoneyUnlockSheet').textContent, /[가-힣]/);
      doc.querySelector('#cdHoneyUnlockSheet').dispatchEvent(new win.Event('cancel'));
      assert.equal(await pending, false);
      assert.ok(app.requests.every(request => request.method === 'GET'), 'translation and cancel must not spend or grant anything');
    } finally { app.close(); }
  });
}
test('honey cash choice shows the Play currency and retains server honey cost', async () => {
  const app = await setup('ok', { locale: 'ja' });
  try {
    const { win } = app, item = HONEY_UNLOCK_PRODUCTS[0];
    win.__cdPlayDisplayPrice = { isApp: () => true, read: async () => ({ formattedPrice: '¥650' }), label: result => result?.formattedPrice || '価格を確認' };
    const button = win.document.createElement('button'); button.dataset.honeyCashKey = item.featureKey;
    win.document.body.append(button); win.CdHoney.refreshLabels(); await tick();
    assert.match(button.textContent, /¥650/);
    assert.match(button.getAttribute('aria-label'), /¥650/);
    assert.equal(button.nextElementSibling.querySelector('strong').textContent, item.honeyCost + '個');
    assert.ok(app.requests.every(request => request.method === 'GET'));
  } finally { app.close(); }
});
