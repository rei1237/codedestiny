import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { HOME_QUICK_LINKS } from '../../lib/seo/home-discovery.mjs';
import { getFortuneLanding } from '../../lib/fortune-landings.mjs';

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

test('home discovery distinguishes the free calculator from its reading guide', () => {
  assert.equal(HOME_QUICK_LINKS.find(link => link.title === '무료 만세력')?.href, '/manse/');
  assert.equal(HOME_QUICK_LINKS.find(link => link.key === 'saju')?.href, '/saju/');
  assert.equal(new Set(HOME_QUICK_LINKS.map(link => link.href)).size, HOME_QUICK_LINKS.length);
});

test('sukuyo entry exposes calculation guidance without advertising free pair analysis', () => {
  const story = getFortuneLanding('/sukuyo/');
  assert.equal(story.guide.href, '/sukuyo/guide/');
  assert.match(story.guide.label, /계산 기준/);
  assert.ok(story.topics.some(([, body]) => body.includes('별도 유료')));
  const hero = readFileSync('app/components/FortuneLandingHero.tsx', 'utf8');
  assert.match(hero, /href=\{story\.guide\.href\}/);
});

test('today hub separates general readings from personal input and links final public routes', () => {
  const source = readFileSync('app/fortune/[period]/page.tsx', 'utf8');
  const guide = source.match(/<section aria-labelledby="today-reading-choice"[\s\S]*?<\/section>/)?.[0];
  assert.ok(guide);
  assert.match(guide, /href="\/today\/"/);
  assert.match(guide, /href="\/manse\/"/);
  assert.match(guide, /個人|개인의 전체 사주/);
  assert.match(guide, /유료 상담은 별개/);
  const landings = readFileSync('lib/seo-landing-pages.js', 'utf8');
  const manse = landings.split('  manse: page({')[1].split('  today: page({')[0];
  assert.match(manse, /ctaHref: "\/ggulggul\/\?action=cdOneStepFreeSajuEntry"/);
  assert.match(manse, /ctaLabel: "사주 보기"/);
  assert.match(manse, /h1: "무료 만세력/);
});