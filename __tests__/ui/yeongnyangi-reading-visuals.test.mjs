import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export * from './app/yeongnyangi/_lib/reading-visuals';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const chapter=chars=>({title:'',summary:'요약',persona:'',analysis:[],blocks:[{title:'t',paragraphs:['가'.repeat(chars)]}]});

test('only readings with 10,000+ body characters get the rich layout',()=>{
 assert.equal(m.isRichReading([chapter(5000),chapter(4999)]),false);
 assert.equal(m.isRichReading([chapter(5000),chapter(5000)]),true);
 assert.equal(m.isRichReading([{...chapter(0),blocks:[],analysis:['가'.repeat(9000)],questionAnswers:[{answer:'가'.repeat(500),reason:'가'.repeat(500),timing:'',action:''}]}]),true);
});

test('every expression and illustration the layout can pick is whitelisted and shipped',()=>{
 const themes=['self','wealth','love','career','relations','timing','cross','action',undefined];
 for(const theme of themes)for(let i=0;i<6;i++){
  const e=m.expressionFor(theme,i);
  assert.ok(m.EXPRESSIONS.includes(e),`${theme}:${e}`);
 }
 for(const e of m.EXPRESSIONS)assert.ok(existsSync(`public${m.expressionSrc(e)}`),e);
 for(const a of m.ART)assert.ok(existsSync(`public${m.artSrc(a)}`),a);
});

test('illustrations appear about every 7,000 characters and never after the last chapter',()=>{
 const chapters=[4000,4000,3000,8000,2000,9000].map(chapter);
 const manifest=['self','wealth','timing','action','love','cross'].map(theme=>({theme}));
 const breaks=m.interludes(chapters,manifest);
 assert.deepEqual([...breaks.keys()],[1,3]);
 assert.equal(breaks.get(1),'timeline');
 assert.equal(breaks.get(3),'rest');
 assert.equal(m.interludes([chapter(20000)],[{theme:'self'}]).size,0);
});

test('timing rows parse years and dates and keep missing values table-only',()=>{
 const group=(id,start,end)=>({id,label:id,kind:'timing',items:[{label:'주기',value:id},{label:'시작',value:start},{label:'끝',value:end}]});
 const rows=m.timingRows([{domain:'saju',groups:[group('대운','자료 없음',''),group('대운','2024','2033'),group('다샤','2014-08-31','2030-08-31'),group('세운','자료 없음','자료 없음')]}],new Date(2026,8,27));
 assert.deepEqual(rows.map(r=>[r.from,r.to,r.now]),[[2024,2034,true],[rows[1].from,rows[1].to,true],[undefined,undefined,false]]);
 assert.ok(rows[1].from>2014.6&&rows[1].from<2014.7);
 assert.equal(m.yearValue('34세'),undefined);
});
