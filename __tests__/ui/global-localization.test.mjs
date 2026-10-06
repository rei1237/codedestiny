import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
import {buildOutputLanguageDirective} from '../../lib/i18n/ai-locale.js';
const require=createRequire(import.meta.url);
const checkout=require('../../js/core/checkout-entry.js');
const bundle=await build({stdin:{contents:`export {blockChartCopy} from './app/yeongnyangi/_lib/block-chart-copy';export {ziweiChartCopy} from './app/yeongnyangi/_lib/ziwei-chart-copy';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const charts=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const strings=value=>typeof value==='string'?[value]:Object.values(value).flatMap(strings);
const authored=JSON.parse(readFileSync('i18n/authored/globalReading-01.json','utf8'));

test('every supported locale receives complete chart explanations, without English fallback',()=>{
 for(const locale of RUNTIME_LOCALES){
  const block=charts.blockChartCopy(locale),ziwei=charts.ziweiChartCopy(locale);
  assert.equal(strings(block).length,4);assert.equal(strings(ziwei).length,29);
  for(const text of [...strings(block),...strings(ziwei)])assert.ok(text.trim());
  if(locale!=='en') {assert.notEqual(block.pillars,charts.blockChartCopy('en').pillars);assert.notEqual(ziwei.how[0],charts.ziweiChartCopy('en').how[0]);}
  assert.deepEqual(Object.keys(ziwei.grades),Object.keys(charts.ziweiChartCopy('ko').grades));
 }
});
test('international guidance is published in every runtime dictionary',()=>{
 for(const locale of RUNTIME_LOCALES){
  const dictionary=JSON.parse(readFileSync('public/i18n/'+locale.toLowerCase()+'.json','utf8'));
  for(const [key,translations] of Object.entries(authored)){
   assert.ok(translations[locale]);assert.equal(key.split('.').reduce((o,k)=>o[k],dictionary),translations[locale]);
  }
 }
});
test('PayPal guidance preserves all methods and the fail-closed unavailable state',()=>{
 const before=globalThis.window, beforeTranslate=globalThis.cdTranslate;
 try {
  globalThis.window={cdGetCurrentLanguage:()=> 'en',cdTranslate:(key,_vars,fallback)=>authored[key]?.en||fallback};
  globalThis.cdTranslate=window.cdTranslate;
  const html=checkout.buildDirectPayMethodStepHtml({});
  assert.match(html,/PayPal · International \(USD\)/);
  assert.match(html,/review the USD total/i);
  const methods=[...html.matchAll(/data-pay-method="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(methods,checkout.DIRECT_PAY_METHOD_ORDER);
  assert.match(html,/data-pay-method="PAYPAL" aria-disabled="true"/);
  assert.doesNotMatch(html,/data-mode=/);
 }finally {globalThis.window=before;globalThis.cdTranslate=beforeTranslate;}
});
test('localized reading style preserves schema and calculation evidence',()=>{
 for(const locale of RUNTIME_LOCALES.filter(l=>l!=='ko')){
  const directive=buildOutputLanguageDirective(locale);
  assert.match(directive,/Keep JSON keys, enum values/);
  assert.match(directive,/Do not infer nationality/);
  assert.match(directive,/Preserve supplied dates, birth time, time zone and calculation evidence/);
 }
});
