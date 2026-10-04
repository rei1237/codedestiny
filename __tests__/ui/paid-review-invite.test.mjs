import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('only completed paid results invite a review, once, with server-approved reward and retry-safe fallback', async () => {
  const previous = { document: globalThis.document, fetch: globalThis.fetch };
  const dom = new JSDOM('<div id="cdReviewInvite" data-review-krw-per-stone="10"></div><main></main>', { url: 'http://localhost' });
  globalThis.document = dom.window.document;
  const host = document.querySelector('main');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({rewardPolicy:{amount:100,currency:'moonstone',trigger:'approved'}}) });
  try {
    const { mountPaidReviewInvite } = await import('../../js/review-reward-invite.mjs');
    for (const state of [{paid:false,completed:true},{paid:true,completed:false},{paid:true,completed:undefined}]) {
      assert.equal(mountPaidReviewInvite({host,...state}), false);
      assert.equal(host.children.length, 0);
    }
    mountPaidReviewInvite({host,paid:true,completed:true});
    mountPaidReviewInvite({host,paid:true,completed:true});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(host.querySelectorAll('[data-paid-review-invite]').length, 1);
    assert.match(host.textContent, /연이/);
    assert.match(host.textContent, /공개 승인 후 월정석 100개 · 1,000원 상당/);
    assert.equal(host.querySelector('a').getAttribute('href'), '/reviews/?write=1');
    assert.match(host.querySelector('img').src, /yeoni/);
    globalThis.fetch = async () => { throw new Error('offline'); };
    mountPaidReviewInvite({host,paid:true,completed:true});
    await new Promise(resolve => setImmediate(resolve));
    assert.match(host.querySelector('.cd-review-invite__reward').textContent, /공개 승인 후 월정석 지급/);
    assert.doesNotMatch(host.querySelector('.cd-review-invite__reward').textContent, /100|즉시/);
    assert.ok(host.querySelector('a'), 'writing a review remains available when policy loading fails');
    mountPaidReviewInvite({host,paid:true,completed:false});
    assert.equal(host.children.length, 0);
  } finally {
    globalThis.document = previous.document; globalThis.fetch = previous.fetch; dom.window.close();
  }
});
