import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSelection} from '../src/initial-selection.mjs';

test('letter entry selects Yeoni using the existing product registry',()=>{
 const calls=[];const select=(...args)=>{calls.push(args);return 'registry-selection';};const readings=[{id:'default'}];
 assert.equal(initialSelection(new URLSearchParams('adviser=yeoni'),readings,select),'registry-selection');
 assert.deepEqual(calls,[['yeoni','saju','mackerel']]);
 assert.equal(initialSelection(new URLSearchParams('adviser=yeoni&product=explicit'),readings,select),'explicit');
 assert.equal(initialSelection(new URLSearchParams('adviser=unknown'),readings,select),'default');
 assert.equal(initialSelection(new URLSearchParams('adviser=yeoni'),readings,()=>undefined),'default');
});
