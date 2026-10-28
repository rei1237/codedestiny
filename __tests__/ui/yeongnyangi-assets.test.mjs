import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

test('home keeps one Yeongnyangi card with its destination and artwork', () => {
 const html = readFileSync('index.html', 'utf8');
 const cards = html.match(/<a class="cd-sig-card cd-sig-card--intro" data-cd-signature-id="yeongnyangi-question"[\s\S]*?<\/a>/g) || [];
 assert.equal(cards.length, 1);
 assert.match(cards[0], /href="\/yeongnyangi\/"/);
 assert.match(cards[0], /\/images\/service-introductions\/yeongnyangi-question-v2-640\.webp/);
 assert.ok(existsSync('public/images/service-introductions/yeongnyangi-question-v2-640.webp'));
 assert.doesNotMatch(html, /data-marker="cd-soulcat-home-primary-v20261008"/);
});
test('Yeongnyangi translations remain available to their other surfaces', () => {
 const authored = JSON.parse(readFileSync('i18n/authored/homeYeongnyangiEntry-01.json','utf8'));
 const files = {ko:'ko',en:'en',ja:'ja','zh-CN':'zh-cn','zh-TW':'zh-tw',vi:'vi',hi:'hi',es:'es',fr:'fr',de:'de',nl:'nl',ms:'ms'};
 for (const [key, translations] of Object.entries(authored)) {
  assert.equal(Object.keys(translations).length, 12, key);
  for (const [locale, file] of Object.entries(files)) {
   const dictionary = JSON.parse(readFileSync(`public/i18n/${file}.json`,'utf8'));
   assert.equal(key.split('.').reduce((value, part) => value?.[part], dictionary), translations[locale], `${locale} ${key}`);
  }
 }
});
test('Yeongnyangi stylesheet carries a content cache key', () => {
 for (const file of ['index.html','public/ggulggul/index.html']) assert.match(readFileSync(file,'utf8'), /href="\/styles\/saju-reading\.css\?v=build-[0-9a-f]{12}"/, file);
});
