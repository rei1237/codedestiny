import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {build} from 'esbuild';

const bundled=await build({entryPoints:['app/yeongnyangi/_components/SampleExposure.tsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react','@/lib/analytics']});
test('sample exposure fires only when visible, once, with no input or URL data',()=>{
 let effect,observe,callback,disconnected=0;
 const events=[];
 const heading={};
 const context={exports:{},require:id=>id==='react'?{useEffect:fn=>{effect=fn;}}:{trackEvent:(...args)=>events.push(args)},window:{IntersectionObserver:true},document:{getElementById:()=>({querySelector:()=>heading})},IntersectionObserver:class{constructor(fn){callback=fn;}observe(node){observe=node;}disconnect(){disconnected++;}}};
 context.module={exports:{}};
 vm.runInNewContext(bundled.outputFiles[0].text,context);
 context.module.exports.default({targetId:'example',itemId:'yeongnyangi-saju-mackerel'});
 const cleanup=effect();
 assert.equal(observe,heading);
 callback([{isIntersecting:false}]);assert.equal(events.length,0);
 callback([{isIntersecting:true}]);callback([{isIntersecting:true}]);
 assert.equal(events.length,1);
 assert.equal(events[0][0],'sample_view');
 assert.deepEqual(JSON.parse(JSON.stringify(events[0][1])),{service:'yeongnyangi',item_id:'yeongnyangi-saju-mackerel',sample_type:'editorial',content_id:'mackerel-question-v1',locale:'ko'});
 cleanup();assert.equal(disconnected,2);
});

test('question CTA selects a supported mackerel consultation and sample precedes long comparison',async()=>{
 const page=readFileSync('app/yeongnyangi/1000-won-fortune/page.tsx','utf8');
 const href=page.match(/const QUESTION_HREF='([^']+)'/)[1];
 const params=new URL(href,'https://code-destiny.com').searchParams;
 const result=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node'});
 const sandbox={exports:{},module:{exports:{}}};sandbox.module.exports=sandbox.exports;
 vm.runInNewContext(result.outputFiles[0].text,sandbox);
 const {products,consultationKinds,supportsKind}=sandbox.module.exports;
 const product=products.find(p=>p.domain===params.get('domain')&&p.fishId===params.get('fish')&&p.readingKind==='single');
 const kind=consultationKinds[product.domain].find(k=>k.id===params.get('consultationKind'));
 assert.equal(product.priceKRW,1000);assert.equal(kind.question,true);assert.equal(supportsKind(product,kind),true);
 assert.ok(page.indexOf('id="example"')<page.indexOf('id="systems"'));
 assert.match(page,/실제 고객 데이터나 AI가 생성한 상담 원문이 아니/);
});
