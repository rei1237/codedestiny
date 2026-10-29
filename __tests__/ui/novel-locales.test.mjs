import test from 'node:test';
import assert from 'node:assert/strict';
import { NOVEL_LOCALES, resolveNovelLocale } from '../../lib/stories/vn/locales.mjs';

test('novel editions retain Korean and the four approved translations', () => {
  assert.deepEqual(NOVEL_LOCALES, ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']);
  for (const locale of NOVEL_LOCALES) assert.equal(resolveNovelLocale(locale), locale);
});
test('regional Chinese choices retain script and other service languages use English', () => {
  for (const locale of ['zh-HK', 'zh-MO', 'zh_Hant_TW']) assert.equal(resolveNovelLocale(locale), 'zh-TW');
  for (const locale of ['zh', 'zh-SG', 'zh-Hans-CN']) assert.equal(resolveNovelLocale(locale), 'zh-CN');
  for (const locale of ['vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms', '', null]) assert.equal(resolveNovelLocale(locale), 'en');
  assert.equal(resolveNovelLocale('ko-KR'), 'ko');
  assert.equal(resolveNovelLocale('ja-JP'), 'ja');
});
