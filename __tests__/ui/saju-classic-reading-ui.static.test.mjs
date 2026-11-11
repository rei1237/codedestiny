import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const shell=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../../styles/saju-reading.css',import.meta.url),'utf8');
const persona=fs.readFileSync(new URL('../../js/core/saju/reading-personas.js',import.meta.url),'utf8');
test('calculation overlay uses the existing lightweight Yeoni asset with stable dimensions',()=>{
  const overlay=shell.match(/<div id="sajuCalcLoadingOverlay"[\s\S]*?<\/div>/)[0];
  assert.match(overlay,/yeoni-clue-160\.webp/);
  assert.match(overlay,/yeoni-clue-320\.webp 320w/);
  assert.match(overlay,/sizes="160px" width="160" height="160"/);
  assert.doesNotMatch(overlay,/lotus-bloom/);
  assert.match(shell,/@media\(prefers-reduced-motion:reduce\)[^\n]*saju-calc-loading-overlay__yeoni/);
  for(const size of [160,320])assert.ok(fs.statSync(new URL(`../../public/images/saju/yeoni-clue-${size}.webp`,import.meta.url)).size<20000);
});
test('open natal chart precedes the large introduction and persona header',()=>{
  assert.ok(shell.indexOf('id="sajuCard"')<shell.indexOf('<section class="card saju-result-guide"'));
  assert.match(persona,/natal\.insertAdjacentElement\('afterend',header\)/);
  assert.doesNotMatch(shell.match(/<section class="card" id="sajuCard"[^>]*>/)[0],/hidden/);
  const ids=['sajuCard','iljuCard','tenshinCard','johuCard','ukbuCard','terms24Card'];
  for(let i=1;i<ids.length;i++)assert.ok(shell.indexOf(`id="${ids[i-1]}"`)<shell.indexOf(`id="${ids[i]}"`));
});
test('interpretation icons use a single decorative line vocabulary while labels remain',()=>{
  const icons=[...shell.matchAll(/<svg class="saju-section-icon"[^>]*>/g)].map(m=>m[0]);
  assert.equal(icons.length,5);
  for(const name of ['shinsal','climate','balance','flow','season'])assert.ok(icons.some(icon=>icon.includes(`data-saju-icon="${name}"`)));
  for(const icon of icons){assert.match(icon,/stroke="currentColor"/);assert.match(icon,/stroke-width="1.5"/);assert.match(icon,/aria-hidden="true" focusable="false"/);}
  assert.match(shell,/명식에 머문 신살/);
  assert.match(shell,/한난조습 \(寒暖燥濕\) 조후 분석/);
  assert.match(shell,/억부\(抑扶\) · 종격\(從格\) 분석/);
  assert.match(shell,/내 절기 리듬 \(月令\)/);
  assert.match(css,/\.saju-section-icon[^}]*color:var\(--cd-accent\)/);
});
