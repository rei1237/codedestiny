import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Ziwei derived facts: business luck reads 재백궁 with 자녀궁 (and 전택·관록) through palace-stem flying transformations,
// health reads 질액궁 with its facing 부모궁 and 복덕궁. Deterministic, mock only, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/ziwei/derived';
 export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7';
 export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';
 export {auditV7Chapter} from './worker/yeongnyangi/fortune/reading-v7-quality';
 export {products} from './worker/yeongnyangi/payments/catalog';
 export {domains} from './worker/yeongnyangi/fortune/index';
 `,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-ziwei-derived.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

// 로직 검증용 합성 — 실제 성립 명반 아님. Palace i sits on branch i, so the facing palace is i+6
// (명↔천이, 자녀↔전택, 재백↔복덕, 질액↔부모, 관록↔부부). An empty stem flies nothing.
const NAMES=['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
const chart=(over={})=>NAMES.map((name,i)=>({name,branchIndex:i,stem:'',mainStars:[],assistantStars:[],maleficStars:[],transformations:[],...over[name]}));
const has=(links,text)=>assert.ok(links.some(l=>l.includes(text)),`missing: ${text}\n${links.join('\n')}`);

test('재백궁 화록이 자녀궁으로 들면 확장 연결, 화기가 자녀궁에 들면 대궁 전택궁 충', ()=>{
 // 갑 궁간: 화록 염정, 화기 태양 — 둘 다 자녀궁에 앉힌다.
 const b=m.buildZiweiBusinessBasis(chart({재백궁:{stem:'갑'},자녀궁:{mainStars:['염정','태양']}}));
 has(b.links,'재백궁의 화록(염정)이 자녀궁으로 들어간다 — 번 돈을 동업·투자·확장에 돌리면 불어나기 쉬운 연결');
 has(b.links,'재백궁의 화기(태양)가 자녀궁에 들어 대궁 전택궁을 충한다 — 동업·투자·확장이 쌓아 둔 자산을 깎기 쉬운 조건');
 assert.deepEqual(b.flights.map(f=>[f.from,f.kind,f.to]),[['재백궁','화록','자녀궁'],['재백궁','화권',null],['재백궁','화과',null],['재백궁','화기','자녀궁']]);
 assert.deepEqual(b.palaces.map(p=>p.palace),['재백궁','자녀궁','전택궁','관록궁']);
 assert.equal(b.limitation,undefined);
});

test('관록궁과 재백궁이 화록을 주고받으면 서로 미는 구조로 적는다', ()=>{
 const b=m.buildZiweiBusinessBasis(chart({재백궁:{stem:'갑',mainStars:['천기']},관록궁:{stem:'을',mainStars:['염정']}}));
 has(b.links,'관록궁의 화록(천기)이 재백궁으로 들어간다 — 일의 형태가 바로 돈을 만드는 연결');
 has(b.links,'재백궁과 관록궁이 화록을 주고받는다');
});

test('자화록은 새는 곳으로, 연결이 없으면 판정하지 않는다', ()=>{
 has(m.buildZiweiBusinessBasis(chart({재백궁:{stem:'갑',mainStars:['염정']}})).links,'재백궁의 화록(염정)이 제자리에서 흩어진다(자화록)');
 const none=m.buildZiweiBusinessBasis(chart(),true);
 assert.deepEqual(none.flights,[]);
 assert.equal(none.links.length,1);
 assert.match(none.links[0],/연결이 없다 — 사업운은 각 궁의 별과 강약으로만 읽는다/);
 assert.match(none.limitation,/출생 시각을 몰라/);
});

test('건강 근거: 질액궁 살성·날아든 화기는 생활 영역으로만 적고 고지문을 싣는다', ()=>{
 const h=m.buildZiweiHealthBasis(chart({질액궁:{mainStars:['태양'],maleficStars:['경양']},재백궁:{stem:'갑'}}));
 has(h.links,'질액궁에 경양 —');
 has(h.links,'돈 문제의 부담이 화기(태양)로 질액궁에 들어 대궁 부모궁을 충한다');
 // The sending palace is named by its life area so the health chapter never names another chapter's palace.
 assert.ok(h.links.every(l=>!/재백궁|자녀궁|관록궁|전택궁/.test(l)));
 assert.ok(h.links.every(l=>!/질환|병에 걸|진단/.test(l)));
 assert.equal(h.disclaimer,m.ZIWEI_HEALTH_DISCLAIMER);
 assert.deepEqual(h.palaces.map(p=>p.palace),['질액궁','부모궁','복덕궁']);
 assert.match(m.buildZiweiHealthBasis(chart()).links[0],/연결이 없다/);
});

test('배선: 실제 명반 context 에 두 근거가 실리고 참치 사업운 장·연어/광어 재물 장·건강 장이 소유한다', async()=>{
 const asOf='2026-09-15T00:00:00Z';
 const personA={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
 const engine=m.domains.ziwei;
 const stored=engine.buildContext(await engine.calculate(engine.validateInput({personA,question:'사업을 시작해도 될까요?',readingMode:'personal'}),{asOf}));
 const fact=l=>stored.facts.find(f=>f.label===l)?.value;
 assert.equal(fact('businessBasis')?.version,m.ZIWEI_DERIVED_VERSION);
 assert.equal(fact('healthBasis')?.disclaimer,m.ZIWEI_HEALTH_DISCLAIMER);
 for(const fish of ['salmon','flounder','tuna']){
  const product=m.products.find(p=>p.id===`ziwei_${fish}`);
  const {ledger,chapters}=m.resolveV7Ledger(m.readingManifestV7(product,{id:'personal'}),stored,{asOf});
  assert.deepEqual(ledger.unclassified,[],fish);
  const owner=id=>chapters.find(c=>c.owns.some(o=>o.endsWith(id)))?.key;
  assert.equal(owner('.businessBasis'),fish==='tuna'?'business':'wealth',fish);
  assert.equal(owner('.healthBasis'),'health',fish);
  if(fish!=='tuna')continue;
  const business=chapters.find(c=>c.key==='business');
  // The business chapter may name 자녀궁·전택궁 freely through its basis; the audit does not prune them as foreign.
  const paragraphs=['재백궁의 화록이 자녀궁으로 들어가 확장이 돈이 되는 연결입니다.','자녀궁의 화기가 전택궁을 흔들 수 있으니 자녀궁 쪽 투자는 전택궁 자산과 나눠 둡니다.'];
  const audit=m.auditV7Chapter({body:{summary:'요약',analysis:[],example:'',advice:'',persona:'페르소나',highlights:['결론'],sources:[],topics:[],blocks:[{id:'insight-1',title:'insight-1',paragraphs,sources:[]}]},chapter:business,previous:[]});
  assert.ok(!audit.violations.some(v=>v.code==='V7_FOREIGN_FACT'),JSON.stringify(audit.violations));
 }
});
