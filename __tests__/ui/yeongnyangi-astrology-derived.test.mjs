import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Astrology derived facts: traditional essential dignity, sect, the 1·6·7·10 house rulers, element·mode balance and
// health from the 1·6 rulers with Mars·Moon·Saturn. Deterministic, mock only, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
 export * from './worker/yeongnyangi/fortune/astrology/derived';
 export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7';
 export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';
 export {auditV7Chapter} from './worker/yeongnyangi/fortune/reading-v7-quality';
 export {products} from './worker/yeongnyangi/payments/catalog';
 export {domains} from './worker/yeongnyangi/fortune/index';
 `,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-astrology-derived.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

// 로직 검증용 합성 — 실제 성립 차트 아님. spec is {planet:[signIndex,house,extra]}; cusps are whole-sign from the ascendant sign.
const SIGN_KO=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];
const planets=spec=>m.refineAstrologyPlanets(Object.fromEntries(Object.entries(spec).map(([name,[sign,house=null,extra={}]])=>
 [name,{sign,signKo:SIGN_KO[sign],house,retrograde:false,...extra}])));
const cusps=asc=>Array.from({length:12},(_,i)=>((asc+i)%12)*30+5);
const has=(lines,text)=>assert.ok(lines.some(l=>l.includes(text)),`missing: ${text}\n${lines.join('\n')}`);
const NO_HOUSE=/\d+\s*하우스/;

test('본질 품위는 전통 7행성만 — 룰러십·엑절테이션·디트리먼트·폴, 외행성은 없음', ()=>{
 const d=m.essentialDignity;
 assert.equal(d('Mercury',5),'domicile');
 assert.equal(d('Mercury',11),'detriment');
 assert.equal(d('Venus',0),'detriment');
 assert.equal(d('Mars',3),'fall');
 assert.equal(d('Saturn',0),'fall');
 assert.equal(d('Sun',0),'exaltation');
 assert.equal(d('Jupiter',8),'domicile');
 assert.equal(d('Moon',8),'peregrine');
 assert.equal(d('Uranus',10),null);
 assert.equal(d('Sun',12),null);
 const refined=planets({Mars:[3],Pluto:[7]});
 assert.equal(refined.Mars.dignity,'fall');
 assert.equal(refined.Pluto.dignity,undefined);
});

test('섹트: 태양이 지평선 위면 주간, 섹트 밖 흉성·길성의 품위를 덧붙이고 하우스 번호는 쓰지 않는다', ()=>{
 const day=m.buildAstrologySect(planets({Sun:[0,10],Mars:[3,1],Jupiter:[8,6]}));
 assert.equal(day.chart,'day');
 assert.deepEqual([day.light,day.beneficOfSect,day.maleficOfSect,day.contraryMalefic],['Sun','Jupiter','Saturn','Mars']);
 has(day.lines,'섹트 밖 흉성 화성의 긴장');
 has(day.lines,'화성이 추락(폴) 상태라 그 긴장을 의식해서');
 const night=m.buildAstrologySect(planets({Sun:[4,3],Venus:[0,11],Saturn:[6,5]}));
 assert.equal(night.chart,'night');
 has(night.lines,'섹트 밖 흉성 토성의 긴장');
 has(night.lines,'다만 토성이 고양(엑절테이션) 상태라');
 has(night.lines,'섹트의 길성 금성이 손상(디트리먼트) 상태라 도움이 늦게');
 assert.ok([...day.lines,...night.lines].every(l=>!NO_HOUSE.test(l)));
 const timeless=m.buildAstrologySect(planets({Sun:[4]}));
 assert.equal(timeless.chart,null);
 assert.deepEqual(timeless.lines,[]);
 assert.match(timeless.limitation,/출생 시각을 몰라/);
});

test('하우스 주인: 1·6·7·10하우스 커스프 별자리의 전통 주인과 그 자리·품위·역행, 커스프가 12개가 아니면 없음', ()=>{
 const ps=planets({Moon:[11,10],Jupiter:[8,6,{retrograde:true}],Saturn:[0,10]});
 const rows=m.buildAstrologyHouseRulers(ps,cusps(3));
 assert.deepEqual(rows.map(r=>[r.house,r.ruler,r.placedHouse,r.dignity]),[[1,'Moon',10,'peregrine'],[6,'Jupiter',6,'domicile'],[7,'Saturn',10,'fall'],[10,'Mars',null,'peregrine']]);
 assert.match(rows[3].note,/^10하우스\(양자리\) 주인 화성이 중립\(페레그린\) 상태로 있다/,'차트에 없는 주인은 자리 없이 적는다');
 assert.equal(rows[0].note,'1하우스(게자리) 주인 달이 10하우스 물고기자리에 중립(페레그린) 상태로 있다 — 나를 이끄는 힘(차트 룰러)이 그 자리의 일로 향한다');
 assert.equal(rows[1].note,'6하우스(사수자리) 주인 목성이 6하우스 사수자리에 자기 별자리(룰러십) 상태로 있다 — 일상 루틴과 컨디션이 그 자리의 리듬을 따른다 · 자기 하우스에 있어 그 영역을 직접 챙긴다 · 역행이라 안에서 다시 점검하며 쓰는 힘');
 has(rows.map(r=>r.note),'7하우스(염소자리) 주인 토성이 10하우스 양자리에 추락(폴) 상태로 있다');
 assert.deepEqual(m.buildAstrologyHouseRulers(ps,cusps(3).slice(1)),[]);
 assert.deepEqual(m.buildAstrologyHouseRulers(ps,null),[]);
});

test('원소·모드: 일곱 행성과 상승점 8개 중 우세(원소 3·모드 4 이상)와 없음을 기질로 적고, 고르면 한 줄로', ()=>{
 const tilted=m.buildAstrologyElementBalance(planets({Sun:[0],Moon:[4],Mercury:[0],Venus:[1],Mars:[8],Jupiter:[3],Saturn:[4]}),{sign:9});
 assert.deepEqual(tilted.elements,{불:5,흙:2,공기:0,물:1});
 assert.deepEqual(tilted.modes,{활동:4,고정:3,변통:1});
 assert.deepEqual(tilted.traits,['불 우세(5) — 먼저 움직이고 열정으로 밀어붙이는 기질','공기 없음 — 생각을 말로 정리해 거리를 두는 데 시간이 걸리는 편','활동 우세(4) — 일을 먼저 시작하고 방향을 트는 힘']);
 assert.match(tilted.basis,/8개 기준/);
 const even=m.buildAstrologyElementBalance(planets({Sun:[0],Moon:[1],Mercury:[2],Venus:[3],Mars:[4],Jupiter:[5],Saturn:[6]}),{sign:7});
 assert.deepEqual([even.dominantElements,even.lackingElements,even.dominantModes,even.lackingModes],[[],[],[],[]]);
 assert.deepEqual(even.traits,['원소와 모드가 고르게 퍼져 한쪽 기질로 치우치지 않는다']);
});

test('건강 근거: 1·6하우스 주인과 화성·달·토성, 긴장각을 관리 포인트로만 적고 고지문을 싣는다', ()=>{
 // 게자리 상승: 1하우스 주인 달이 전갈자리(추락) 5하우스, 6하우스 주인 목성이 게자리(고양) 1하우스, 화성 쌍둥이자리 12하우스, 토성 사수자리 6하우스.
 const ps=planets({Moon:[7,5],Jupiter:[3,1],Mars:[2,12],Saturn:[8,6],Sun:[4,2]});
 const aspects=[{p1:'Saturn',p2:'Mars',type:'opposition',orb:2.1},{p1:'Sun',p2:'Mars',type:'square',orb:7.5},{p1:'Moon',p2:'Saturn',type:'trine',orb:1}];
 const h=m.buildAstrologyHealthBasis(ps,cusps(3),aspects);
 has(h.links,'1하우스 주인 달이 추락(폴) 상태 — 컨디션이 환경을 많이 타니');
 has(h.links,'6하우스 주인 목성이 1하우스에 있다 — 일상의 무리가 곧바로 몸의 컨디션으로');
 has(h.links,'6하우스 주인 목성이 고양(엑절테이션) 상태 — 루틴을 세우면');
 has(h.links,'12하우스에 화성 — 잠과 쉼이 소모되기 쉬운 배치');
 has(h.links,'6하우스에 토성 — 몸이 굳고 회복이 느린 경향');
 has(h.links,'달이 추락(폴) 상태 — 감정의 피로가 수면과 식사 리듬으로');
 has(h.links,'화성·토성 오포지션(오브 2.1°) — 밀어붙임과 브레이크가 부딪히는 긴장');
 assert.ok(!h.links.some(l=>l.includes('태양·화성')),'오브 6° 초과 긴장각은 넣지 않는다');
 assert.ok(!h.links.some(l=>l.includes('트라인')),'조화각은 건강 긴장으로 읽지 않는다');
 assert.ok(h.links.every(l=>!/질환|병에 걸|진단|수명|사고/.test(l)));
 assert.deepEqual(h.lords.map(r=>[r.house,r.ruler,r.placedHouse,r.dignity]),[[1,'Moon',5,'fall'],[6,'Jupiter',1,'exaltation']]);
 assert.equal(h.disclaimer,m.ASTROLOGY_HEALTH_DISCLAIMER);
 assert.equal(h.limitation,undefined);
 const timeless=m.buildAstrologyHealthBasis(planets({Mars:[3],Moon:[8]}),[],[]);
 assert.deepEqual(timeless.lords,[]);
 assert.match(timeless.limitation,/출생 시각을 몰라/);
 has(timeless.links,'화성이 추락(폴) 상태 — 에너지가 들쭉날쭉');
 assert.deepEqual(m.buildAstrologyHealthBasis(planets({Mars:[2],Moon:[8],Saturn:[8]}),[],[]).links.length,1);
 has(m.buildAstrologyHealthBasis(planets({Mars:[2],Moon:[8],Saturn:[8]}),[],[]).links,'두드러진 연결이 없다');
});

test('배선: 실제 차트 context 에 품위·섹트·하우스 주인·원소·건강 근거가 실리고 장마다 제 사실만 소유한다', async()=>{
 const asOf='2026-09-15T00:00:00Z';
 const personA={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
 const engine=m.domains.astrology;
 const stored=engine.buildContext(await engine.calculate(engine.validateInput({personA,question:'건강은 어떤가요?',readingMode:'personal'}),{asOf}));
 const fact=l=>stored.facts.find(f=>f.label===l)?.value;
 assert.equal(fact('healthBasis')?.version,m.ASTROLOGY_DERIVED_VERSION);
 assert.deepEqual(fact('houseRulers').map(r=>r.house),m.ASTROLOGY_RULED_HOUSES);
 assert.equal(fact('chartSect').chart,'day');
 assert.equal(fact('elementBalance').basis,'개인 행성 일곱과 상승점, 8개 기준');
 for(const [name,p] of Object.entries(fact('planets')))assert.equal(p.dignity,m.essentialDignity(name,p.sign)??undefined,name);
 for(const fish of ['salmon','flounder','tuna']){
  const product=m.products.find(p=>p.id===`astrology_${fish}`);
  const {ledger,chapters,unowned}=m.resolveV7Ledger(m.readingManifestV7(product,{id:'personal'}),stored,{asOf});
  assert.deepEqual(ledger.unclassified,[],fish);
  assert.deepEqual(unowned.filter(id=>/houseRulers|chartSect|elementBalance|healthBasis/.test(id)),[],fish);
  const owner=id=>chapters.find(c=>c.owns.includes(`astrology.${id}`))?.key;
  assert.deepEqual(['healthBasis','houseRulers.6','houseRulers.1','elementBalance','houseRulers.7','houseRulers.10','chartSect'].map(owner),
   ['health','health','anchor','anchor','love','career',fish==='salmon'?'aspects':'tension'],fish);
  if(fish!=='tuna')continue;
  const body=paragraphs=>({summary:'요약',analysis:[],example:'',advice:'',persona:'페르소나',highlights:['결론'],sources:[],topics:[],blocks:[{id:'insight-1',title:'insight-1',paragraphs,sources:[]}]});
  const foreign=(key,paragraphs)=>m.auditV7Chapter({body:body(paragraphs),chapter:chapters.find(c=>c.key===key),previous:[]}).violations.filter(v=>v.code==='V7_FOREIGN_FACT');
  // The health chapter names the 6th ruler (Jupiter in the 8th) and Mars·Saturn; the love chapter names its 7th ruler; sect names planets only.
  assert.deepEqual(foreign('health',['6하우스 주인 목성이 8하우스에 있어 루틴이 깊은 긴장에 끌려갑니다.','화성과 토성이 맞서 강도를 나눠 쓰는 편이 좋습니다.']),[]);
  assert.deepEqual(foreign('love',['7하우스 주인 토성이 10하우스에 있어 일에서 인연을 만납니다.','토성은 추락 상태라 관계에 책임을 먼저 느낍니다.']),[]);
  assert.deepEqual(foreign('tension',['주간 차트라 섹트 밖 흉성 화성이 가장 거칠게 드러납니다.','화성은 손상 상태라 나눠 써야 합니다.']),[]);
  const stray=['목성이 8하우스에 있습니다.','목성은 다시 8하우스를 봅니다.'];
  assert.ok(foreign('emotion',stray).length>0,'다른 장은 여전히 남의 하우스·행성을 쓰지 못한다');
  assert.ok(foreign('tension',stray).length>0,'섹트는 행성만 열고 하우스 번호는 열지 않는다');
 }
});
