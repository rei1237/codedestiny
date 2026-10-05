import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeHubLinks } from '../../lib/i18n/localized-hub-links.mjs';

test('locale hubs keep a crawlable destination and the existing interactive action', () => {
  const input = '<a href="/saju/" data-action="cdOneStepFreeSajuEntry">Saju</a><a class="cdh-method" data-cd-service-id="ziwei" href="/ziwei/chart/" data-action="openZiweiModal">Zi Wei</a>';
  for (const locale of ['ja', 'en', 'zh', 'zh-tw']) {
    const output = localizeHubLinks(input, locale);
    assert.ok(output.includes(`href="/${locale}/saju/"`));
    assert.ok(output.includes(`href="/${locale}/ziwei/"`));
    assert.ok(output.includes('data-action="openZiweiModal"'));
    assert.ok(output.includes('data-action="cdOneStepFreeSajuEntry"'));
  }
});

test('missing translations do not acquire fictional hreflang-like destinations', () => {
  const input = '<a href="/fortune-tea-house/">Tea House</a><a href="/saju/compatibility/">Compatibility</a>';
  const output = localizeHubLinks(input, 'zh-tw');
  assert.ok(output.includes('href="/fortune-tea-house/"'));
  assert.ok(output.includes('href="/zh-tw/saju-compatibility/"'));
  assert.ok(localizeHubLinks(input, 'ja').includes('href="/ja/fortune-tea-house/"'));
});

test('payment returns, tool state, fragments and external URLs are untouched', () => {
  const input = '<a href="/index.html?paymentId=fixture">return</a><a href="/ggulggul/?action=openTarotModal">tool</a><a href="/ziwei/chart/?lang=en">chart</a><a href="/saju/#input">input</a><a href="https://elsewhere.example/saju/">external</a><a href="/api/auth/callback">auth</a>';
  assert.equal(localizeHubLinks(input, 'ja'), input);
  assert.equal(localizeHubLinks('<a href="/saju/">Saju</a>', 'ko'), '<a href="/saju/">Saju</a>');
});
import { loadTsModule } from '../../scripts/lib/load-ts-module.mjs';

test('localized FAQ entries remain unique before the visible and JSON-LD renderers share them', () => {
  const { I18N_SEO_PAGES } = loadTsModule('lib/seo/i18nKeywords.ts');
  for (const [page, locales] of Object.entries(I18N_SEO_PAGES)) {
    for (const [locale, copy] of Object.entries(locales)) {
      const questions = copy.faq.map(entry => entry.question.trim());
      assert.equal(new Set(questions).size, questions.length, `${page}/${locale}: duplicate FAQ`);
    }
  }
});
