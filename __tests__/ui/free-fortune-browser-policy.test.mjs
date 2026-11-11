import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {FREE_FORTUNE_FEATURE_KEYS,isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
const read=path=>fs.readFileSync(path,'utf8');
test('generated browser allowlist matches Worker policy, with paid exceptions closed',()=>{
  const context={window:{}};vm.runInNewContext(read('js/core/free-fortune-policy.js'),context);
  assert.deepEqual(Array.from(context.window.cdFreeFortuneFeatureKeys),Array.from(FREE_FORTUNE_FEATURE_KEYS));
  for(const key of FREE_FORTUNE_FEATURE_KEYS)assert.equal(context.window.cdIsFreeFortuneFeatureKey(key),true,key);
  for(const key of ['section_summary','section_daewun','saju_lifetime_bundle','allPaidSaju','relationship-boundary-test','saju-guardian-unlock','unknown-premium']){
    assert.equal(isFreeFortuneFeatureKey(key),false,key);assert.equal(context.window.cdIsFreeFortuneFeatureKey(key),false,key);
  }
});
test('local deterministic fun tiles no longer borrow the paid summary key',()=>{
 const source=read('js/core/saju/reportDashboard.js');
 const catalog=source.slice(source.indexOf('var REPORT_CARDS = ['),source.indexOf('(function ensureSajuAnimalCardOrder'));
 assert.doesNotMatch(catalog,/lockKey:'section_summary'/);
 for(const id of ['sajuprompt','tbal','tetoegen','4CUT','dopamine']){
   const line=catalog.split('\n').find(line=>line.includes("id:'"+id+"'"));
   assert.ok(line,id);assert.match(line,/lockKey:'saju_fun_shared', coinCost:0/);assert.match(line,/thumb:/);
 }
 assert.match(source,/block.coinCost=0/);
});
test('basic natal delivery is separate from paid summary and daewun',()=>{
 assert.match(read('js/core/saju/section-client.js'),/var NATAL_KEY = 'saju_natal_reading'/);
 assert.match(read('js/saju-engine.js'),/var _CD_NATAL_BUNDLE_KEY = 'saju_natal_reading'/);
 assert.equal(isFreeFortuneFeatureKey('saju_natal_reading'),true);
});
test('user-facing registration copy has no partner branding, original route retained',()=>{
 const page=read('app/components/activation/SnuWelcome.tsx');
 assert.doesNotMatch(page,/SNULIFE (회원|게시물)|서울대학교|assets\/marketing\/snulife/);
 assert.doesNotMatch(read('app/snu/page.tsx'),/SNULIFE/);
 assert.match(read('js/core/snu-reading-flow.mjs'),/entry=snulife/);
 assert.match(page,/snu\/code/);assert.match(page,/snu\/unlock/);
});
