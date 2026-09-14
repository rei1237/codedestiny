import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const detail = {
  slug: 'tea', title: '운명의 찻집', href: '/fortune-tea-house/', featureKey: '', accessType: 'free',
  image: '', headline: '마음을 읽는 시간', description: '설명', ctaLabel: '시작하기',
  verification: 'verified', aliases: ['tea'], evidence: ['index.html'], panels: [],
};

function installDom(lang = 'ko') {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div class="pvw-open"><h2 id="tilePvwTitle">제목</h2><p id="tilePvwDesc">폐기할 옛 설명</p><span id="tilePvwCost">이용 조건 확인</span><button id="tilePvwCtaBtn">기존 시작</button></div></body></html>', { url: 'https://code-destiny.com/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Event = dom.window.Event;
  globalThis.MutationObserver = dom.window.MutationObserver;
  document.documentElement.lang = lang;
  return { dom, overlay: document.querySelector('.pvw-open') };
}

function installFetch() {
  globalThis.fetch = async url => ({
    ok: true,
    json: async () => String(url).endsWith('catalog.json') ? [{ slug: 'tea', aliases: ['tea'] }] : detail,
  });
}

test('static preview waits for CSS before replacing the existing detail sections', async () => {
  const { dom, overlay } = installDom();
  installFetch();
  const { mountFeatureDetailPreview } = await import('../../js/feature-detail-preview.mjs?css-success');
  const mounting = mountFeatureDetailPreview(overlay, ['tea']);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(overlay.classList.contains('pvw-visual'), false);
  const stylesheet = document.getElementById('featureVisualDetailStyles');
  assert.ok(stylesheet);
  stylesheet.dispatchEvent(new Event('load'));
  await mounting;
  assert.equal(overlay.classList.contains('pvw-visual'), true);
  assert.match(overlay.textContent, /기존 시작/);
  assert.ok(overlay.querySelector('[data-feature-share="native"]'));
  assert.equal(overlay.querySelector('a'), null);
  dom.window.close();
});

test('CSS failure retires old descriptions while preserving the original action and retry', async () => {
  const { dom, overlay } = installDom();
  installFetch();
  const { mountFeatureDetailPreview } = await import('../../js/feature-detail-preview.mjs?css-failure');
  const mounting = mountFeatureDetailPreview(overlay, ['tea']);
  await new Promise(resolve => setTimeout(resolve, 0));
  document.getElementById('featureVisualDetailStyles').dispatchEvent(new Event('error'));
  await mounting;
  assert.equal(overlay.classList.contains('pvw-visual'), false);
  assert.match(overlay.textContent, /상세 내용 다시 불러오기/);
  assert.equal(document.getElementById('tilePvwDesc').style.display, 'none');
  assert.equal(document.getElementById('tilePvwCtaBtn').disabled, false);
  dom.window.close();
});

test('non-Korean locale removes a previously mounted visual preview', async () => {
  const { dom, overlay } = installDom('en');
  overlay.classList.add('pvw-visual');
  const old = document.createElement('div');
  old.dataset.featureVisualHost = '';
  overlay.append(old);
  const { mountFeatureDetailPreview } = await import('../../js/feature-detail-preview.mjs?locale-reset');
  await mountFeatureDetailPreview(overlay, ['tea']);
  assert.equal(overlay.classList.contains('pvw-visual'), false);
  assert.equal(overlay.querySelector('[data-feature-visual-host]'), null);
  dom.window.close();
});


test('hero action delegates once to original CTA and follows its price and disabled state', async () => {
  const { dom, overlay } = installDom();
  installFetch();
  const { mountFeatureDetailPreview } = await import('../../js/feature-detail-preview.mjs?action-contract');
  let starts = 0;
  const source = document.getElementById('tilePvwCtaBtn');
  source.addEventListener('click', () => starts++);
  const mounting = mountFeatureDetailPreview(overlay, ['tea']);
  await new Promise(resolve => setTimeout(resolve, 0));
  document.getElementById('featureVisualDetailStyles').dispatchEvent(new Event('load'));
  await mounting;
  const hero = overlay.querySelector('.fortuneAction button');
  hero.click();
  assert.equal(starts, 1);
  source.setAttribute('aria-disabled', 'true');
  document.getElementById('tilePvwCost').textContent = '가격 조회 실패';
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(hero.disabled, true);
  assert.equal(overlay.querySelector('.fortuneAction p').textContent, '가격 조회 실패');
  hero.click();
  assert.equal(starts, 1);
  overlay.classList.remove('pvw-open');
  await new Promise(resolve => setTimeout(resolve, 0));
  dom.window.close();
});
