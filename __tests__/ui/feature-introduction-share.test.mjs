import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { introductionShareData, shareIntroductionFromButton } from '../../js/feature-introduction-share.mjs';
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';

const detail = { slug: 'ziwei', title: '자미두수', headline: '나는 왜 비슷한 선택을 할까요?', verification: 'verified', href: '/private?birth=secret', result: 'private-result' };
test('noindex public introductions can be shared while private paths remain blocked', () => {
  const { getShareMetadata } = loadTsModule('lib/share.v2.ts');
  const intro = getShareMetadata({ path: '/features/ziwei/', contentType: 'software', title: '자미두수' });
  assert.equal(intro.shareable, true);
  assert.equal(new URL(intro.url).searchParams.get('utm_medium'), 'share');
  for (const path of ['/admin/', '/api/payments/']) {
    assert.equal(getShareMetadata({ path, contentType: 'software', title: 'private' }).shareable, false);
  }
  assert.equal(getShareMetadata({ path: '/features/ziwei/', contentType: 'software', title: 'hidden', noindex: true }).shareable, false);
});
function setup(navigator, channel = 'native') {
  const dom = new JSDOM(`<section data-feature-share-section><button data-feature-share="${channel}">공유</button><input hidden><p role="status"></p></section>`);
  const events = [];
  return { doc: dom.window.document, button: dom.window.document.querySelector('button'), host: { navigator, location: { href: 'https://code-destiny.com/?birth=secret&paymentId=private' }, cdTrack: (...args) => events.push(args) }, events };
}
test('public feature and site share URLs exclude result, payment, and location state', () => {
  const data = introductionShareData(detail);
  assert.equal(new URL(data.url).pathname, '/features/ziwei/');
  assert.deepEqual([...new URL(data.url).searchParams.keys()].sort(), ['utm_campaign', 'utm_medium', 'utm_source']);
  assert.doesNotMatch(JSON.stringify(data), /secret|private|birth|payment/);
  assert.equal(new URL(introductionShareData(detail, 'site').url).pathname, '/');
  assert.throws(() => introductionShareData({ ...detail, slug: '../private' }));
  assert.throws(() => introductionShareData({ ...detail, verification: 'source-inventory-only' }));
});
test('cancelling native share never copies or reports success', async () => {
  let copied = false;
  const state = setup({ share: async () => { throw { name: 'AbortError' }; }, clipboard: { writeText: async () => { copied = true; } } });
  await shareIntroductionFromButton(state.button, detail, state.host);
  assert.equal(copied, false);
  assert.match(state.doc.querySelector('[role=status]').textContent, /취소/);
  assert.equal(state.events.at(-1)[1].outcome, 'cancelled');
});
test('unsupported native share falls back to copy; unavailable clipboard reveals safe manual URL', async () => {
  let copied;
  const state = setup({ clipboard: { writeText: async url => { copied = url; } } });
  await shareIntroductionFromButton(state.button, detail, state.host);
  assert.equal(new URL(copied).pathname, '/features/ziwei/');
  const manual = setup({});
  await shareIntroductionFromButton(manual.button, detail, manual.host);
  assert.equal(manual.doc.querySelector('input').hidden, false);
  assert.doesNotMatch(manual.doc.querySelector('input').value, /secret|private/);
});
test('double click shares once and analytics failure does not block sharing', async () => {
  let resolve, calls = 0;
  const state = setup({ share: () => { calls++; return new Promise(done => { resolve = done; }); } });
  state.host.cdTrack = () => { throw new Error('offline'); };
  const pending = shareIntroductionFromButton(state.button, detail, state.host);
  await shareIntroductionFromButton(state.button, detail, state.host);
  assert.equal(calls, 1);
  resolve(); await pending;
  assert.equal(state.button.disabled, false);
});
