import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { HOME_CONCERNS } from '../../lib/marketing/home-concerns.mjs';
import { CURRENT_PASS_PLANS } from '../../lib/payment/pass-policy.js';
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY } from '../../worker/lib/paid-feature-registry.js';
import { mountYehwaHome } from '../../js/core/yehwa-home.mjs';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const html = read('public/ggulggul/index.html');
const won = amount => amount.toLocaleString('ko-KR') + '원';
const text = el => el.textContent.replace(/\s+/g, ' ').trim();
const offers = () => {
  const sandbox = {};
  sandbox.window = sandbox;
  runInNewContext(read('js/core/saju/concern-offers.generated.js'), sandbox);
  return sandbox.CdConcernOffers;
};
const freeEntry = '/ggulggul/?action=cdOneStepFreeSajuEntry';

test('꿀꿀 홈은 구매 순서로 섹션을 놓는다', () => {
  const doc = new JSDOM(html).window.document;
  const order = [
    '.yh-hero', 'nav.yh-entries', '#cdhProof', '#cdSignatureConsult', '#cdhFusionSignatureSlot', '#cdhPass',
    '.cdh-free', '#cdhYeongnyangiSlot', '#cdhMoonlightMv', '.cd-help-entry', '.cdh-all-cta', 'nav.cdh-directory',
  ].map(selector => {
    const nodes = doc.querySelectorAll('#cdHomeFunnel ' + selector);
    assert.equal(nodes.length, 1, selector);
    return [selector, nodes[0]];
  });
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i - 1][1].compareDocumentPosition(order[i][1]) & 4, `${order[i - 1][0]} → ${order[i][0]}`);
  }
  assert.equal(doc.querySelector('#cdhMoonlightMv').closest('details'), null, 'MV는 접히지 않는다');
  assert.equal(doc.querySelector('#cdhPass').closest('details'), null, '이용권은 접히지 않는다');
});

test('히어로는 질문·고민 칩 5개·신뢰 문구·CTA 하나를 담는다', () => {
  const doc = new JSDOM(html).window.document;
  const hero = doc.querySelector('#cdHomeFunnel .yh-hero');
  assert.match(text(hero.querySelector('h1')), /\?$/);
  const chips = [...hero.querySelectorAll('[data-concern]')];
  assert.deepEqual(chips.map(chip => chip.dataset.concern), HOME_CONCERNS.map(concern => concern.id));
  const generated = offers();
  for (const [index, chip] of chips.entries()) {
    const concern = HOME_CONCERNS[index];
    const amount = FEATURE_KEY_PRICE_TABLE[concern.featureKey].amountKRW;
    assert.equal(generated.concerns[concern.id].amountKRW, amount);
    assert.ok(text(chip).startsWith(concern.label), concern.id);
    assert.ok(text(chip).endsWith(won(amount)), concern.id);
  }
  assert.match(text(hero), /10년 경력 명리학자 · 무료 시작 가능/);
  assert.ok([...hero.querySelectorAll('a')].some(a => text(a) === '명리학자 박병하(네오) 소개 →'));
  const ctas = hero.querySelectorAll(`a[href^="${freeEntry}"]`);
  assert.equal(ctas.length, 1);
  assert.ok(ctas[0].hasAttribute('data-cdh-free'));
  assert.equal(ctas[0].hasAttribute('data-action'), false);
  assert.match(text(hero), /상담은 유료예요\. 가격과 결과 예시는 먼저 확인할 수 있어요\./);
  assert.equal(doc.querySelectorAll('[data-concern-picker]').length, 1);
  assert.equal(doc.querySelectorAll('.yh-find').length, 0);
});

test('비로그인 헤더는 이용권 최저가를 한 번만 보여 준다', () => {
  const doc = new JSDOM(html).window.document;
  const min = Math.min(...Object.values(CURRENT_PASS_PLANS).map(plan => plan.wonPrice));
  const label = `이용권 ${won(min)}부터`;
  const guest = [...doc.querySelectorAll('#cdHomeFunnel .cdh-nav *')].filter(el => !el.children.length && text(el) === label);
  assert.equal(guest.length, 1);
  assert.equal(doc.body.textContent.split(label).length - 1, 1);
});

test('고민 가격 파일은 레지스트리에서 생성된다', () => {
  const generated = offers();
  assert.equal(generated.bundle.featureKey, 'saju_lifetime_bundle');
  assert.equal(generated.bundle.amountKRW, UNLOCK_PRODUCT_BY_FEATURE_KEY.saju_lifetime_bundle.amountKRW);
  assert.equal(generated.bundle.amountKRW, 29000);
  assert.equal(generated.bundle.priceLabel, won(29000));
  assert.deepEqual(Object.keys(generated.concerns), HOME_CONCERNS.map(concern => concern.id));
  for (const concern of HOME_CONCERNS) {
    const offer = generated.concerns[concern.id];
    assert.equal(offer.featureKey, concern.featureKey);
    assert.equal(offer.label, concern.label);
    assert.equal(offer.amountKRW, 5000);
    assert.match(offer.href, /^\/features\/[a-z0-9-]+\/$/);
  }
  assert.equal(generated.concerns.money.href, generated.concerns.year.href);
});

function mountHero({ storage } = {}) {
  const dom = new JSDOM(`<!doctype html><div id="cdHomeFunnel">${new JSDOM(html).window.document.querySelector('[data-yh-home]').outerHTML}</div>`, { url: 'https://example.invalid/ggulggul/' });
  const win = dom.window;
  win.matchMedia = () => ({ matches: false, addEventListener() {} });
  if (storage) Object.defineProperty(win, 'sessionStorage', { configurable: true, get: () => storage });
  globalThis.window = win;
  globalThis.location = win.location;
  mountYehwaHome(win.document.querySelector('[data-yh-home]'));
  return win;
}

test('고민 칩을 누르면 선택 표시·CTA 주소·세션 저장이 바뀐다', () => {
  const win = mountHero();
  const doc = win.document;
  const cta = doc.querySelector(`.yh-hero a[href^="${freeEntry}"]`);
  doc.querySelector('[data-concern="reunion"]').click();
  assert.equal(doc.querySelector('[data-concern="reunion"]').getAttribute('aria-pressed'), 'true');
  assert.equal(doc.querySelector('[data-concern="love"]').getAttribute('aria-pressed'), 'false');
  assert.equal(new URL(cta.href).searchParams.get('concern'), 'reunion');
  assert.equal(new URL(cta.href).searchParams.get('action'), 'cdOneStepFreeSajuEntry');
  assert.equal(win.sessionStorage.getItem('cd:home-concern'), 'reunion');
});

test('목록 밖 고민은 무시하고 저장소 오류가 있어도 CTA는 바뀐다', () => {
  const win = mountHero({ storage: { setItem() { throw new Error('denied'); } } });
  const doc = win.document;
  const cta = doc.querySelector(`.yh-hero a[href^="${freeEntry}"]`);
  const before = cta.getAttribute('href');
  const rogue = doc.querySelector('[data-concern="love"]');
  rogue.dataset.concern = 'health';
  rogue.click();
  assert.equal(cta.getAttribute('href'), before);
  assert.equal(rogue.getAttribute('aria-pressed'), 'false');
  doc.querySelector('[data-concern="job"]').click();
  assert.equal(new URL(cta.href).searchParams.get('concern'), 'job');
});
