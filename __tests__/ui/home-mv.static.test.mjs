import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const SHELLS=['index.html','public/ggulggul/index.html'];
const section=html=>{const start=html.indexOf('<section class="cdh-mv" id="cdhMoonlightMv"');assert.ok(start>=0,'music video section');return html.slice(start,html.indexOf('</section>',start));};
test('home music video sits between the Fusion recommendation and Yeongnyangi, outside the folded catalogue',()=>{
 for(const file of SHELLS){
  const html=readFileSync(file,'utf8');
  const start=html.indexOf('id="cdhMoonlightMv"');
  assert.equal((html.match(/id="cdhMoonlightMv"/g)||[]).length,1,file);
  assert.ok(start>html.indexOf('id="cdFusionRecommendation"'),file+' follows Fusion');
  assert.ok(start<html.indexOf('data-marker="cd-soulcat-home-primary-v20261008"'),file+' precedes Yeongnyangi');
  assert.ok(start<html.indexOf('id="cdhGardenBody"'),file+' stays in the primary flow');
 }
});
test('video waits for a tap, points at content-hashed R2 files and ships 27 Korean lyric cues',()=>{
 const mv=section(readFileSync('index.html','utf8'));
 const video=mv.match(/<video[^>]*>/)[0];
 assert.match(video,/preload="none"/);assert.match(video,/playsinline/);
 assert.doesNotMatch(video,/\s(src|autoplay|controls)[=\s>]/,'no bytes or sound before a tap');
 for(const q of ['1080','720'])assert.match(video,new RegExp(`data-src-${q}="https://assets\\.code-destiny\\.com/ggulggul/mv/moonlight-destiny-${q}p-[0-9a-f]{12}\\.mp4"`));
 assert.match(mv,/<track kind="subtitles" srclang="ko" label="[^"]+" src="\/media\/mv\/moonlight-destiny-ko-v1\.vtt" default>/);
 const vtt=readFileSync('public/media/mv/moonlight-destiny-ko-v1.vtt','utf8');
 assert.ok(vtt.startsWith('WEBVTT\n'),'no BOM, LF header');assert.doesNotMatch(vtt,/\r/);
 const sec=t=>t.split(':').reduce((sum,part)=>sum*60+Number(part),0);
 const cues=[...vtt.matchAll(/^([\d:.]+) --> ([\d:.]+)/gm)].map(m=>[sec(m[1]),sec(m[2])]);
 assert.equal(cues.length,27);
 cues.forEach(([from,to],i)=>{assert.ok(to>from,`cue ${i}`);if(i)assert.ok(from>=cues[i-1][1],`cue ${i} order`);});
 assert.ok(cues.at(-1)[1]<=92.66,'lyrics end inside the 92.66s video');
 const images=[...new Set(mv.match(/\/images\/home\/mv\/[a-z0-9-]+\.webp/g))];
 assert.equal(images.length,12);
 for(const path of images)assert.ok(existsSync('public'+path),path);
});
test('music video stylesheet and script carry content cache keys in every home shell',()=>{
 for(const file of SHELLS){
  const html=readFileSync(file,'utf8');
  assert.match(html,/href="\/styles\/home-mv\.css\?v=build-[0-9a-f]{12}"/,file);
  assert.match(html,/<script defer src="\/js\/core\/home-mv\.js\?v=build-[0-9a-f]{12}"><\/script>/,file);
 }
});
test('every music video phrase is authored in all 12 locales and merged into the dictionaries',()=>{
 const mv=section(readFileSync('index.html','utf8'));
 const script=readFileSync('js/core/home-mv.js','utf8');
 const authored=JSON.parse(readFileSync('i18n/authored/homeMv-01.json','utf8'));
 const files={ko:'ko',en:'en',ja:'ja','zh-CN':'zh-cn','zh-TW':'zh-tw',vi:'vi',hi:'hi',es:'es',fr:'fr',de:'de',nl:'nl',ms:'ms'};
 const dictionaries=Object.fromEntries(Object.entries(files).map(([locale,file])=>[locale,JSON.parse(readFileSync(`public/i18n/${file}.json`,'utf8'))]));
 for(const [key,translations] of Object.entries(authored)){
  assert.ok(mv.includes(key)||script.includes(`'${key.slice('home.mv.'.length)}'`),key+' is used');
  assert.equal(Object.keys(translations).length,12,key);
  for(const locale of Object.keys(files))assert.equal(key.split('.').reduce((value,part)=>value?.[part],dictionaries[locale]),translations[locale],`${locale} ${key}`);
 }
});
test('music video styling follows the theme tokens, motion and tap-target rules',()=>{
 const css=readFileSync('styles/home-mv.css','utf8');
 assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b/,'colours come from theme tokens only');
 assert.doesNotMatch(css,/prefers-color-scheme|content-visibility/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 for(const selector of ['.cdh-mv__chapter','.cdh-mv__lyrics','.cdh-mv .cdh-mv__more'])assert.match(css,new RegExp(`${selector.replace(/[.]/g,'\\.')} \\{[^}]*min-height: 44px`),selector);
 assert.match(css,/\.cdh-mv__cover\[hidden\] \{ display: none; \}/);
});
