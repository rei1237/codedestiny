import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareKakao, publicShareUrl, shareThrough } from '../../js/share-service.mjs';
const data = { title: '공개 소개', text: '나의 흐름 알아보기', url: 'https://code-destiny.com/saju/', image: 'https://code-destiny.com/og/example.webp' };
test('share URL drops birth, question, payment and hash data; rejects foreign origin', () => {
  assert.equal(publicShareUrl('/saju/?birth=1990-10-14&question=private&merchantUid=x#result'), data.url);
  assert.throws(() => publicShareUrl('https://example.com/private'));
  assert.throws(() => publicShareUrl('javascript:alert(1)'));
  const id = 'gf_' + 'a'.repeat(24);
  assert.equal(publicShareUrl('/fortune/share/?id=' + id + '&name=private'), 'https://code-destiny.com/fortune/share/?id=' + id);
});
test('native cancellation is distinct from failure and never silently copies', async () => {
  for (const [name, status] of [['AbortError', 'cancelled'], ['NotAllowedError', 'failed']]) {
    const host = { navigator: { share: async () => { throw Object.assign(new Error(), { name }); }, clipboard: { writeText: () => assert.fail('unexpected copy') } } };
    assert.equal((await shareThrough('native', data, host)).status, status);
  }
  assert.equal((await shareThrough('native', data, { navigator: {} })).status, 'unavailable');
});
test('clipboard denial and absence expose manual-copy outcome', async () => {
  assert.equal((await shareThrough('copy', data, { navigator: {} })).status, 'manual');
  assert.equal((await shareThrough('copy', data, { navigator: { clipboard: { writeText: async () => { throw new Error(); } } } })).status, 'manual');
  let copied;
  assert.equal((await shareThrough('copy', data, { navigator: { clipboard: { writeText: async value => { copied = value; } } } })).status, 'copied');
  assert.equal(copied, data.url);
});
test('Kakao sends a feed with landing CTA and reports opening, not delivery', async () => {
  let template;
  const host = { Kakao: { isInitialized: () => true, Share: { sendDefault: value => { template = value; } } } };
  assert.equal((await shareThrough('kakao', data, host)).status, 'opened');
  assert.equal(template.content.imageUrl, data.image);
  assert.equal(template.buttons[0].link.mobileWebUrl, data.url);
  assert.equal((await shareThrough('kakao', data, {})).status, 'unavailable');
});

test('SDK loading deduplicates, times out, and can retry after a blocked append', async () => {
  let script, timer, appends = 0;
  const host = {
    document: {
      createElement: () => (script = { remove() {} }),
      head: { appendChild: () => { appends++; } },
    },
    setTimeout: callback => { timer = callback; return 1; },
    clearTimeout() {},
  };
  assert.equal(await prepareKakao('', host), false);
  const first = prepareKakao('public-js-key', host);
  assert.equal(prepareKakao('public-js-key', host), first);
  assert.equal(appends, 1);
  timer();
  assert.equal(await first, false);
  host.document.head.appendChild = () => { throw new Error('CSP blocked'); };
  assert.equal(await prepareKakao('public-js-key', host), false);
  host.document.head.appendChild = () => { appends++; };
  const retry = prepareKakao('public-js-key', host);
  host.Kakao = { isInitialized: () => true, Share: { sendDefault() {} } };
  script.onload();
  assert.equal(await retry, true);
  assert.equal(appends, 2);
});
