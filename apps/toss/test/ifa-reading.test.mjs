import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {extractIfaEngine} from '../service/ifa-engine-loader.mjs';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

const html=await readFile(new URL('../../../public/ifa-oracle.html',import.meta.url),'utf8');
const moduleSource=extractIfaEngine(html);
const {CATEGORY_META,readIfaPattern}=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
const script=html.match(/<script>\s*(const O = \[[\s\S]*?)<\/script>/)[1];
// Run the original web definitions. Leave the DOM, payment hooks and animations out.
const web=runInNewContext(script.slice(0,script.indexOf('/* ── 결제 후 자동 재개'))+
  '\n((values,l,r,c)=>{bits=values;return getInterp(l,r,c);})');

test('all 256 Odu preserve their index, marks and full web reading for every category',()=>{
  assert.equal(isFreeFortuneFeatureKey('ifa-oracle'),true);
  assert.deepEqual(Object.keys(CATEGORY_META),['total','love','wealth','health']);
  for(let left=0;left<16;left++)for(let right=0;right<16;right++){
    const bits=[left,right].flatMap(pillar=>[0,1,2,3].map(i=>(pillar>>i)&1));
    for(const category of Object.keys(CATEGORY_META)){
      const actual=readIfaPattern(bits,category);
      assert.equal(actual.num,left*16+right+1);
      assert.equal(actual.text,web(bits,left,right,category));
      assert.deepEqual(actual.bits,bits);
      assert.equal(actual.name.endsWith(' Meji'),left===right);
    }
  }
});

test('invalid marks and categories never produce a reading',()=>{
  for(const input of [[],Array(7).fill(1),[2,0,0,0,0,0,0,0]])assert.throws(()=>readIfaPattern(input,'total'));
  assert.throws(()=>readIfaPattern(Array(8).fill(1),'__proto__'));
  assert.throws(()=>extractIfaEngine(html.replace('function getInterp(l,r,cat){','function changed(){')));
});
