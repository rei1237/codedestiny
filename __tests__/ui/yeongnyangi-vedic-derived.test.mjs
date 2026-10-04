import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Vedic derived facts: moolatrikona dignity, classical yogas with their conditions (full/partial/cancelled),
// and health from the 1·6·8·12 house lords. Deterministic, mock only, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/vedic/derived';
 export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7';
 export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';
 export {auditV7Chapter} from './worker/yeongnyangi/fortune/reading-v7-quality';
 export {products} from './worker/yeongnyangi/payments/catalog';
 export {domains} from './worker/yeongnyangi/fortune/index';
 `,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-vedic-derived.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

// 로직 검증용 합성 — 실제 성립 차트 아님. Whole-sign houses from the lagna sign; spec is {planet:[signIndex,degree,extra]}.
const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const LORDS=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const chart=(lagna,spec)=>({
 planets:Object.entries(spec).map(([name,[sign,degree=10,extra={}]])=>({name,sign:SIGNS[sign],signIndex:sign,degree,longitude:sign*30+degree,
  house:lagna==null?null:((sign-lagna+12)%12)+1,dignity:'neutral',combust:false,retrograde:false,...extra})),
 houses:lagna==null?[]:Array.from({length:12},(_,i)=>({house:i+1,sign:SIGNS[(lagna+i)%12],lord:LORDS[(lagna+i)%12]})),
});
const has=(lines,text)=>assert.ok(lines.some(l=>l.includes(text)),`missing: ${text}\n${lines.join('\n')}`);
const yoga=(list,name)=>list.find(y=>y.name===name);

test('물라트리코나는 도수로 가른다 — 달(황소 3도~)·수성(처녀 15~20도, 20도~ 자기 별자리)', ()=>{
 const d=(name,sign,degree,dignity)=>m.refinedVedicDignity({name,sign,degree,dignity});
 assert.equal(d('Moon','Taurus',10,'exalted'),'moolatrikona');
 assert.equal(d('Moon','Taurus',2,'exalted'),'exalted');
 assert.equal(d('Mercury','Virgo',17,'exalted'),'moolatrikona');
 assert.equal(d('Mercury','Virgo',25,'exalted'),'own sign');
 assert.equal(d('Sun','Leo',10,'own sign'),'moolatrikona');
 assert.equal(d('Sun','Leo',25,'own sign'),'own sign');
 assert.equal(d('Jupiter','Cancer',5,'exalted'),'exalted');
});

test('황소 라그나: 사사·부다디트야(연소 부분)·하르샤(라그나 주인 부분)·비말라·라자(요가카라카 토성)', ()=>{
 const {planets,houses}=chart(1,{Saturn:[10,25,{dignity:'own sign'}],Venus:[8],Mars:[6],Sun:[2],Mercury:[2,12,{combust:true}],Moon:[1,10,{dignity:'exalted'}],Jupiter:[3,5,{dignity:'exalted'}]});
 const y=m.buildVedicYogas(planets,houses);
 assert.equal(yoga(y,'Sasa Yoga').status,'full');
 assert.deepEqual(yoga(y,'Sasa Yoga').conditions,['토성이 10하우스(켄드라)에 있다','토성이 자기 별자리에 있다']);
 assert.equal(yoga(y,'Hamsa Yoga'),undefined,'목성은 켄드라가 아니다');
 assert.equal(yoga(y,'Budhaditya Yoga').status,'partial');
 assert.equal(yoga(y,'Harsha Yoga').status,'partial');
 has(yoga(y,'Harsha Yoga').conditions,'금성은 1하우스 주인이기도 해');
 assert.equal(yoga(y,'Vimala Yoga').status,'full');
 has(yoga(y,'Vimala Yoga').conditions,'12하우스 주인 화성이 6하우스에 있다');
 const raja=yoga(y,'Raja Yoga');
 assert.equal(raja.status,'full');
 has(raja.conditions,'토성이 10하우스와 9하우스를 함께 다스리는 요가카라카로 10하우스에 있다');
 has(raja.conditions,'4하우스 주인 태양과 5하우스 주인 수성이 2하우스에 함께 있다 — 약해지는 조건이 있어 부분 성립');
 assert.equal(yoga(y,'Kemadruma Yoga'),undefined,'달 다음 별자리에 수성이 있다');
});

test('케마드루마는 상쇄를 따로 적고, 니차 방가는 별자리 주인이 라그나 켄드라에 있을 때만', ()=>{
 const alone={Moon:[0],Mars:[2],Mercury:[4],Venus:[5],Jupiter:[5],Saturn:[8],Sun:[4]};
 const full=yoga(m.buildVedicYogas(chart(null,alone).planets,[]),'Kemadruma Yoga');
 assert.equal(full.status,'full');
 const cancelled=yoga(m.buildVedicYogas(chart(null,{...alone,Jupiter:[6]}).planets,[]),'Kemadruma Yoga');
 assert.equal(cancelled.status,'cancelled');
 has(cancelled.conditions,'달의 켄드라(같은 별자리 포함)에 목성 — 상쇄된다');
 has(cancelled.conditions,'목성이 달을 바라봐 상쇄된다');
 // 게 라그나: 천칭자리의 태양(낮은 품위), 천칭자리 주인 금성이 양자리(10하우스).
 const neecha=yoga(m.buildVedicYogas(...Object.values(chart(3,{Sun:[6,10,{dignity:'debilitated'}],Venus:[0],Saturn:[4],Moon:[2],Jupiter:[2],Mars:[2],Mercury:[7]}))),'Neecha Bhanga Raja Yoga');
 assert.deepEqual(neecha.conditions,['태양이 낮은 품위(Libra)에 있다','Libra의 주인 금성이 라그나의 켄드라에 있다']);
 const none=m.buildVedicYogas(...Object.values(chart(3,{Sun:[6,10,{dignity:'debilitated'}],Venus:[1],Saturn:[4],Moon:[2],Jupiter:[2],Mars:[2],Mercury:[7]})));
 assert.equal(yoga(none,'Neecha Bhanga Raja Yoga'),undefined);
});

test('건강 근거: 1·6·8·12하우스 주인과 흉성, 달의 밝기를 생활 리듬으로만 적고 고지문을 싣는다', ()=>{
 // 천칭 라그나: 금성(1·8 주인)이 처녀자리 12하우스에서 낮은 품위·연소, 6하우스 주인 목성이 1하우스, 12하우스 주인 수성이 12하우스.
 const {planets,houses}=chart(6,{Venus:[5,10,{dignity:'debilitated',combust:true}],Jupiter:[6],Mercury:[5,25],Mars:[11],Saturn:[0],Moon:[7,10,{dignity:'debilitated'}],Sun:[5,15]});
 const h=m.buildVedicHealthBasis(planets,houses);
 has(h.links,'1하우스 주인 금성이 낮은 품위(데빌리테이션)에 있다');
 has(h.links,'1하우스 주인 금성이 12하우스에 있다 — 소모와 늦은 생활 쪽으로');
 has(h.links,'1하우스 주인 금성이 태양에 가려 연소된다');
 has(h.links,'6하우스 주인 목성이 1하우스에 있다 — 일상의 무리가 곧바로 몸의 컨디션으로');
 has(h.links,'8하우스 주인 금성이 12하우스에 있다 — 긴장을 오래 끌지 않고 정리하는 힘(사랄라 조건)');
 has(h.links,'12하우스 주인 수성이 12하우스에 있다');
 has(h.links,'6하우스의 화성 — 일상의 무리를 이겨 내는 힘(우파차야)');
 has(h.links,'12하우스에 태양 — 잠과 쉼이 소모되기 쉬운');
 has(h.links,'달이 낮은 품위(데빌리테이션)에 있다 — 감정의 피로가');
 has(h.links,'어두운 달');
 assert.ok(h.links.every(l=>!/질환|병에 걸|진단|수명|사고/.test(l)));
 assert.deepEqual(h.lords.map(r=>[r.house,r.lord,r.placedHouse]),[[1,'Venus',12],[6,'Jupiter',1],[8,'Venus',12],[12,'Mercury',12]]);
 assert.equal(h.disclaimer,m.VEDIC_HEALTH_DISCLAIMER);
 assert.equal(h.limitation,undefined);
 const timeless=m.buildVedicHealthBasis(chart(null,{Moon:[7,10,{dignity:'debilitated'}],Sun:[1]}).planets,[]);
 assert.deepEqual(timeless.lords,[]);
 assert.match(timeless.limitation,/출생 시각을 몰라/);
 has(timeless.links,'달이 낮은 품위');
});

test('배선: 실제 차트 context 에 정밀 품위·파생 요가·건강 근거가 실리고 건강 장·참치 요가 장이 소유한다', async()=>{
 const asOf='2026-09-15T00:00:00Z';
 const personA={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
 const engine=m.domains.vedic;
 const stored=engine.buildContext(await engine.calculate(engine.validateInput({personA,question:'건강은 어떤가요?',readingMode:'personal'}),{asOf}));
 const fact=l=>stored.facts.find(f=>f.label===l)?.value;
 assert.equal(fact('healthBasis')?.version,m.VEDIC_DERIVED_VERSION);
 for(const p of fact('planets'))assert.equal(p.dignity,m.refinedVedicDignity(p),p.name);
 assert.ok(fact('yogas').some(y=>!Object.hasOwn(m.VEDIC_YOGA_SLUGS,y.name)),'엔진 요가는 그대로 남는다');
 assert.ok(fact('yogas').some(y=>Object.hasOwn(m.VEDIC_YOGA_SLUGS,y.name)),'파생 요가가 덧붙는다');
 for(const fish of ['salmon','flounder','tuna']){
  const product=m.products.find(p=>p.id===`vedic_${fish}`);
  const {ledger,chapters,unowned}=m.resolveV7Ledger(m.readingManifestV7(product,{id:'personal'}),stored,{asOf});
  assert.deepEqual(ledger.unclassified,[],fish);
  assert.deepEqual(unowned,[],fish);
  const owner=test=>chapters.find(c=>c.owns.some(test))?.key;
  assert.equal(owner(id=>id.endsWith('.healthBasis')),'health',fish);
  assert.equal(owner(id=>id.includes('.yogas.')),fish==='tuna'?'yogas':undefined,fish);
  if(fish!=='tuna')continue;
  const body=paragraphs=>({summary:'요약',analysis:[],example:'',advice:'',persona:'페르소나',highlights:['결론'],sources:[],topics:[],blocks:[{id:'insight-1',title:'insight-1',paragraphs,sources:[]}]});
  const foreign=(key,paragraphs)=>m.auditV7Chapter({body:body(paragraphs),chapter:chapters.find(c=>c.key===key),previous:[]}).violations.filter(v=>v.code==='V7_FOREIGN_FACT');
  // The health chapter names the 8th and 12th lords and their planets through its basis; the yoga chapter names kendra houses and planets.
  assert.deepEqual(foreign('health',['8하우스 주인 토성이 12하우스에 있어 쉼이 필요합니다.','토성은 8하우스의 긴장을 오래 끌지 않게 돕고 12하우스의 잠을 지킵니다.']),[]);
  assert.deepEqual(foreign('yogas',['목성이 4하우스에 있어 켄드라 조건을 채웁니다.','목성과 토성이 7하우스와 10하우스를 다스려 이어집니다.']),[]);
  assert.ok(foreign('career',['목성이 6하우스에 있습니다.','목성은 다시 6하우스를 봅니다.']).length>0,'다른 장은 여전히 남의 하우스·행성을 쓰지 못한다');
 }
});
