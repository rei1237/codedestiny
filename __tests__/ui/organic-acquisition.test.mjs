import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const analytics = readFileSync('js/core/analytics.js', 'utf8');
const template = readFileSync('app/components/SeoLandingTemplate.jsx', 'utf8');

function tracking(referrer) {
  const dom = new JSDOM('<head></head>', {
    url: 'https://code-destiny.com/manse/', referrer, runScripts: 'outside-only',
  });
  try {
    dom.window.eval(analytics);
    return Array.from(dom.window.dataLayer, row => Array.from(row));
  } finally {
    dom.window.close();
  }
}

test('identity and payment returns ignore referral attribution before the first config', () => {
  for (const host of ['accounts.google.com', 'nid.naver.com', 'kauth.kakao.com', 'accounts.kakao.com', 'ksmobile.inicis.com', 'stgmobile.inicis.com', 'fcmobile.inicis.com', 'online-payment.kakaopay.com']) {
    const calls = tracking(`https://${host}/return?token=private`);
    const at = calls.findIndex(row => row[0] === 'set' && row[1] === 'ignore_referrer');
    assert.ok(at >= 0, host);
    assert.equal(calls[at][2], true);
    assert.ok(at < calls.findIndex(row => row[0] === 'config'), host);
    assert.equal(calls.filter(row => row[0] === 'config').length, 1);
    assert.doesNotMatch(JSON.stringify(calls), /token=private/);
  }
});

test('search, social, AI, ordinary referrals and lookalike domains retain attribution', () => {
  for (const host of ['www.google.com', 'm.search.naver.com', 'naver.com', 'blog.naver.com', 'l.threads.com', 'chatgpt.com', 'example.org', 'accounts.google.com.example.org', 'online-payment.kakaopay.com.example.org']) {
    const calls = tracking(`https://${host}/`);
    assert.equal(calls.some(row => row[1] === 'ignore_referrer'), false, host);
    assert.equal(calls[0][0], 'consent');
    assert.equal(calls[0][2].analytics_storage, 'denied');
  }
});

const mergeSource = template.match(/function mergeFaqs\(pageFaqs\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(mergeSource, 'evaluate the actual FAQ selection function');
const defaults = [{ question: 'default one', answer: 'one' }, { question: 'default two', answer: 'two' }];
const merge = vm.runInNewContext(`(${mergeSource})`, { DEFAULT_FAQS: defaults });

test('all authored landing answers survive the rendered/schema FAQ selection', () => {
  const authored = Array.from({ length: 8 }, (_, index) => ({ question: `question ${index}`, answer: `answer ${index}` }));
  assert.equal(JSON.stringify(merge(authored)), JSON.stringify(authored));
  assert.equal(merge([{ question: 'duplicate', answer: 'first' }, { question: 'duplicate', answer: 'second' }]).filter(row => row.question === 'duplicate').length, 1);
  assert.equal(merge(null).length, defaults.length);
  assert.equal(merge([{ question: '', answer: 'invalid' }]).length, defaults.length);
});