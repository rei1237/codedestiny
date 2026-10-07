import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('Yeongnyangi home entry keeps its original artwork and background without SoulCat hosting',()=>{
 const html=readFileSync('index.html','utf8');
 const start=html.indexOf('data-marker="cd-soulcat-home-primary-v20261008"');assert.ok(start>=0);
 const entry=html.slice(start,html.indexOf('<div class="cdh-slot" id="cdhFeatured">',start));
 assert.equal((html.match(/class="cd-soulcat-entry"/g)||[]).length,1,'home has one Yeongnyangi entry');
 assert.ok(start>html.indexOf('class="cdh-topics"'),'entry follows the question topics');
 assert.ok(start<html.indexOf('<details class="cdh-more"'),'entry stays outside the folded garden');
 assert.equal(html.includes('cd-soulcat-navigation-template'),false,'legacy runtime entry template removed');
 assert.equal(html.includes('cdh-reading-intro'),false,'legacy compact entry removed');
 assert.ok(!entry.includes('/_soulcat/'),'Independent worker asset dependency returned');
 assert.doesNotMatch(entry,/<style>/);
 const css=readFileSync('styles/saju-reading.css','utf8');
 const paths=[...new Set((entry+css).match(/\/assets\/yeongnyangi\/[a-zA-Z0-9_/.-]+\.webp/g))];
 for(const name of ['hero-800.webp','room-780.webp','room-1440.webp','mackerel.webp'])assert.ok(paths.some(p=>p.endsWith(name)),name);
 for(const path of paths)assert.ok(existsSync('public'+path),path);
});
test('Yeongnyangi primary entry keeps both destinations and localized service appeal copy',()=>{
 const html=readFileSync('index.html','utf8');
 const start=html.indexOf('data-marker="cd-soulcat-home-primary-v20261008"');
 const entry=html.slice(start,html.indexOf('<div class="cdh-slot" id="cdhFeatured">',start));
 assert.match(entry,/href="\/yeongnyangi\/\?utm_source=code_destiny&utm_medium=referral&utm_campaign=yeongnyangi_home&utm_content=hero"/);
 assert.match(entry,/href="\/yeongnyangi\/room\/\?utm_source=code_destiny&utm_medium=referral&utm_campaign=yeongnyangi_home&utm_content=free#daily"/);
 assert.doesNotMatch(entry,/Family 이용권|단건 결제\(카드·카카오페이 등\)/);
 for(const fish of ['mackerel','salmon','flounder','tuna'])assert.match(entry,new RegExp(`data-yeongnyangi-price="${fish}"`));
 const authored=JSON.parse(readFileSync('i18n/authored/homeYeongnyangiEntry-01.json','utf8'));
 const files={ko:'ko',en:'en',ja:'ja','zh-CN':'zh-cn','zh-TW':'zh-tw',vi:'vi',hi:'hi',es:'es',fr:'fr',de:'de',nl:'nl',ms:'ms'};
 for(const [key,translations] of Object.entries(authored)){
  assert.ok(entry.includes(key),key);
  assert.equal(Object.keys(translations).length,12,key);
  for(const [locale,file] of Object.entries(files)){
   const dictionary=JSON.parse(readFileSync(`public/i18n/${file}.json`,'utf8'));
   assert.equal(key.split('.').reduce((value,part)=>value?.[part],dictionary),translations[locale],`${locale} ${key}`);
  }
 }
});
test('Yeongnyangi entry stylesheet carries a content cache key so immutable caching cannot pin old banner CSS',()=>{
 // /styles/*.css 는 1년 immutable 이다. 무버전 링크면 새 마크업이 옛 CSS 와 만나 배너가 깨진다.
 for(const file of ['index.html','public/ggulggul/index.html'])assert.match(readFileSync(file,'utf8'),/href="\/styles\/saju-reading\.css\?v=build-[0-9a-f]{12}"/,file);
});
