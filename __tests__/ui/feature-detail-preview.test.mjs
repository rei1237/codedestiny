import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const detail = {
  slug: 'tea', title: '운명의 찻집', href: '/fortune-tea-house/', featureKey: '', accessType: 'free',
  image: '', headline: '마음을 읽는 시간', description: '설명', ctaLabel: '시작하기',
  verification: 'verified', aliases: ['tea'], evidence: ['index.html'], panels: [],
};

function installDom(lang = 'ko') {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div class="pvw-open"><h2 id="tilePvwTitle">제목</h2></div></body></html>', { url: 'https://code-destiny.com/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Event = dom.window.Event;
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
  assert.match(overlay.textContent, /상세페이지 새 화면에서 보기/);
  dom.window.close();
});

test('CSS failure keeps legacy content visible and offers a precise retry', async () => {
  const { dom, overlay } = installDom();
  installFetch();
  const { mountFeatureDetailPreview } = await import('../../js/feature-detail-preview.mjs?css-failure');
  const mounting = mountFeatureDetailPreview(overlay, ['tea']);
  await new Promise(resolve => setTimeout(resolve, 0));
  document.getElementById('featureVisualDetailStyles').dispatchEvent(new Event('error'));
  await mounting;
  assert.equal(overlay.classList.contains('pvw-visual'), false);
  assert.match(overlay.textContent, /상세 내용 다시 불러오기/);
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
