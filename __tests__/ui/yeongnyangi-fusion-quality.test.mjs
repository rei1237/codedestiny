import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// Fusion MA·MO quality defects, stage A (docs/handoff/2026-10-10-yeongnyangi-fusion-quality-defects.md): deterministic
// data only. Fixed fixture profile, no provider call; the chapter request is captured before any network.
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__invariance={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>({updatedAt:null,birth:{year:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`
  const db=()=>globalThis.__invariance.rows;
  export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected')};
  export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const ownerId=x=>x;
  export const createRequest=async(e,u,id,v)=>{if(!db().has(id))db().set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[],chapterAttempts:{}});return db().get(id)};
  export const readRequest=async(e,u,id)=>{if(!db().has(id))throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return db().get(id)};
  export const attachPayment=async()=>{throw new Error('no payment in test')};
  export const claimChapter=0,saveChapterDraft=0,saveAskAnalysis=0,finishChapter=0,failChapter=0;`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('no provider in test')}}`,
};
const bundle=await build({stdin:{contents:[
  "export {prepareFortune} from './worker/yeongnyangi/service';",
  "export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts';",
  "export {buildLuckOverlap} from './worker/yeongnyangi/fortune/saju/luck-overlap';",
  "export {askPromptView} from './worker/yeongnyangi/fortune/ask/prompt';",
  "export {analyzeAsk} from './worker/yeongnyangi/fortune/ask/analysis';",
  "export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter';",
  "export {fitChapterFacts,estimateRequestTokens,CHAPTER_INPUT_TOKEN_TARGET} from './worker/yeongnyangi/providers/input-budget';",
  "export {readerEvidence} from './worker/yeongnyangi/prompts/domain/reader-counsel';",
  "export {ASK_PERIOD_GUIDE} from './worker/yeongnyangi/fortune/ask/prompt';",
  "export {preventionFacts} from './worker/yeongnyangi/fortune/prevention';",
  "export {tarotTimeFrame} from './worker/yeongnyangi/fortune/tarot/time-frame';",
 ].join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},
 plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const p=args.path.replaceAll('\\','/');const key=Object.keys(replacements).find(k=>p.endsWith(k)||p.endsWith(k+'.ts')||p.endsWith(k.replace(/\.js$/,'.ts')));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('fusion-quality-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const QUESTION='내년 상반기에 스타트업으로 이직하는 게 나을까, 지금 회사에 남는 게 나을까?';
const prepare=async(productId,kind='personal')=>{globalThis.__invariance.rows=new Map();
 return m.prepareFortune(env,'owner',{productId,profileId:'self',timezone:'Asia/Seoul',consultationKind:kind,...(kind==='ask'?{question:QUESTION}:{})});};
const fact=(facts,label)=>facts.find(f=>f.label===label)?.value;
const byKey=(manifest,key)=>manifest.find(c=>c.key===key);
async function captureRequest(row,chapter,withAsk,previous=[]){
 let sent;
 const ask=withAsk?{analysis:await m.analyzeAsk(row.snapshot.analysis.consultation,async()=>{throw new Error('offline');}),evidence:row.generationCheckpoint.evidence}:undefined;
 await new m.StructuredChapterProvider({generate:async request=>{sent=request;throw new Error('captured');}})
  .generateChapter({deliveryContract:'chapter-delivery-v1',locale:'ko',chapter,analysis:row.snapshot.analysis,previous,ask}).catch(error=>{if(error.message!=='captured')throw error;});
 return sent;
}

// 1A: the stored rows relate luck only to the natal chart; a 세운×대운 relation was left to the model.
const pillar=(label,p)=>({label,pillar:p,heavenlyStem:p[0],earthlyBranch:p[1]});
const sajuFacts=hour=>[
 {label:'pillarDetails',value:{year:pillar('연주','甲子'),month:pillar('월주','丙寅'),day:pillar('일주','戊辰'),hour:pillar('시주',hour)}},
 {label:'majorLuck',value:{direction:'forward',cycles:[{index:3,startYear:2024,endYear:2033,pillar:'壬戌',heavenlyStem:'壬',earthlyBranch:'戌'}]}},
 {label:'yearlyLuck',value:[{year:2027,pillar:'丁未'}]},
 {label:'monthlyLuck',value:[{start:{year:2027,month:1,day:5},pillar:'辛丑'}]},
];
test('1A luckOverlap: 戌 대운 × 未 세운 is 미술파, and a 축술미형 needs 丑 among 대운·세운·원국',()=>{
 const without=m.buildLuckOverlap(sajuFacts('庚申'));
 const year=without.years.find(r=>r.year===2027);
 assert.equal(year.majorLuckPillar,'壬戌');
 assert.ok(year.relations.some(r=>r.type==='지지파'&&r.between.includes('세운')&&r.between.includes('대운')),JSON.stringify(year.relations));
 assert.ok(!year.relations.some(r=>r.type==='지지형'),'no 丑, so no 형');
 const withOx=m.buildLuckOverlap(sajuFacts('乙丑'));
 const punish=withOx.years[0].relations.find(r=>r.type==='지지형');
 assert.ok(punish&&['세운','대운','시주'].every(x=>punish.between.includes(x)),JSON.stringify(withOx.years[0].relations));
 // 辛丑 월운 joins 戌 대운 and 未 is absent from the natal chart: a 丑戌 pair is not a three-branch 형.
 assert.ok(!without.months[0].relations.some(r=>r.type==='지지형'));
 assert.equal(m.buildLuckOverlap([{label:'pillarDetails',value:{}}]),undefined,'no 대운, no overlap');
});
test('1A luckOverlap: 寅 in the chart completes 인사신형 with 巳 대운 and 申 세운; a year no 대운 covers has no row',()=>{
 const facts=[{label:'pillarDetails',value:{year:pillar('연주','丁丑'),month:pillar('월주','壬寅'),day:pillar('일주','癸未'),hour:pillar('시주','戊午')}},
  {label:'majorLuck',value:{cycles:[{index:3,startYear:2020,endYear:2029,pillar:'己巳',heavenlyStem:'己',earthlyBranch:'巳'}]}},
  {label:'yearlyLuck',value:[{year:2028,pillar:'戊申'},{year:2029,pillar:'己酉'},{year:2031,pillar:'辛亥'}]},
  {label:'monthlyLuck',value:[{start:{year:2026,month:2,day:4},pillar:'庚寅'}]}];
 const {years,months}=m.buildLuckOverlap(facts),labels=year=>years.find(r=>r.year===year).relations.map(r=>r.label).sort();
 assert.deepEqual(labels(2028),['사신파','사신합','인사신형']);
 assert.deepEqual([...years[0].relations.find(r=>r.label==='인사신형').between].sort(),['대운','세운','월주'].sort());
 assert.deepEqual(labels(2029),['사유축 삼합']);
 assert.equal(years.some(r=>r.year===2031),false);
 assert.equal(months[0].majorLuckPillar,'己巳');
 assert.ok(months[0].relations.every(r=>r.between.includes('월운')&&r.between.includes('대운')));
});
test('1A luckOverlap reaches a timing chapter as a fact it may cite',async()=>{
 const row=await prepare('fusion_all');
 const chapter=byKey(row.snapshot.manifest,'life-year');
 const facts=m.selectChapterFacts(row.snapshot.analysis.contexts.saju,chapter);
 const overlap=fact(facts,'luckOverlap');
 assert.ok(overlap&&overlap.rule&&overlap.years.length===1,'one scoped year');
 assert.equal(overlap.years[0].year,fact(facts,'yearlyLuck')[0].year);
 assert.ok(!row.snapshot.analysis.contexts.saju.facts.some(f=>f.label==='luckOverlap'),'derived per request, not stored');
 // Tiers without 대운 lose the 대운 overlap with it.
 const tier=t=>fact(m.selectChapterFacts(row.snapshot.analysis.contexts.saju,{...chapter,tier:t}),'luckOverlap');
 assert.ok(tier('omakase'));assert.equal(tier('mackerel'),undefined);
});

// 2A: a palace subset and 대한·유년 rows carry the 12-palace 대궁·삼합 names.
test('2A ziwei: relation table on a palace subset and palaceRelations on 대한·유년 rows',async()=>{
 const row=await prepare('fusion_saju_ziwei');
 const chapter=row.snapshot.manifest.find(c=>(c.factSelectors?.ziwei||[]).some(s=>s.startsWith('palaces['))&&(c.factSelectors.ziwei||[]).includes('yearlyTimeline'))
  ||row.snapshot.manifest.find(c=>(c.factSelectors?.ziwei||[]).some(s=>s.startsWith('palaces[')));
 const facts=m.selectChapterFacts(row.snapshot.analysis.contexts.ziwei,chapter);
 const palaces=fact(facts,'palaces');
 assert.ok(palaces.palaces.length<12);
 assert.equal(Object.keys(palaces.relationTable).length,12);
 assert.deepEqual({...palaces.relationTable['명궁'],trines:[...palaces.relationTable['명궁'].trines].sort()},{facing:'천이궁',trines:['관록궁','재백궁']});
 for(const [name,r] of Object.entries(palaces.relationTable)){assert.equal(palaces.relationTable[r.facing].facing,name);assert.ok(r.trines.every(t=>palaces.relationTable[t].trines.includes(name)),name);}
 const decade=m.selectChapterFacts(row.snapshot.analysis.contexts.ziwei,{...chapter,factSelectors:{ziwei:['majorLuck','yearlyTimeline']},questionPolicy:'test'});
 const rows=[...fact(decade,'majorLuck'),...fact(decade,'yearlyTimeline')];
 assert.ok(rows.length&&rows.every(r=>r.palaceRelations&&r.palaceRelations.facing===palaces.relationTable[r.palaceName].facing),'every row names its 대궁');
});

// 3A: every chapter carries each pillar's ten gods, so a pillar's ten god is never written from memory.
test('3A saju base: tenGodsByPillar summary in a chapter without the full table',async()=>{
 const row=await prepare('fusion_saju_ziwei');
 const chapter=row.snapshot.manifest.find(c=>(c.factSelectors?.saju||[]).length&&!(c.factSelectors.saju||[]).includes('tenGodsByPillar'));
 assert.ok(chapter.factSelectors.saju.includes('tenGodsByPillar.summary'));
 const summary=fact(m.selectChapterFacts(row.snapshot.analysis.contexts.saju,chapter),'tenGodsByPillar');
 const full=fact(row.snapshot.analysis.contexts.saju.facts,'tenGodsByPillar');
 for(const key of Object.keys(full).filter(k=>full[k])){
  assert.equal(summary[key].stemTenGod,full[key].stemTenGod);
  assert.equal(summary[key].branchMainTenGod,full[key].primaryHiddenTenGod);
  assert.equal(summary[key].hiddenStemTenGods,undefined,'summary only');
 }
});

// 4: each chapter reads its own year. A 내년 상반기 question no longer turns every chapter into 2027.
test('4 scope: 올해·내년 예고·10년 주기 장이 각자의 시기를 읽는다',async()=>{
 const row=await prepare('fusion_all');
 const saju=row.snapshot.analysis.contexts.saju,first=fact(saju.facts,'yearlyLuck')[0].year;
 const years=key=>fact(m.selectChapterFacts(saju,byKey(row.snapshot.manifest,key)),'yearlyLuck')?.map(r=>r.year);
 assert.deepEqual(years('life-year'),[first]);
 assert.deepEqual(years('life-next-year'),[first+1]);
 const months=fact(m.selectChapterFacts(saju,byKey(row.snapshot.manifest,'life-next-year')),'monthlyLuck')||[];
 assert.ok(months.every(r=>r.start.year===first+1));
 const thisYear=fact(m.selectChapterFacts(saju,byKey(row.snapshot.manifest,'life-year')),'monthlyLuck')||[];
 assert.ok(thisYear.length&&thisYear.every(r=>r.start.year===first),'올해 장은 그해 월운만');
 const spill={...saju,facts:saju.facts.map(f=>f.label==='monthlyLuck'?{...f,value:[...f.value,{start:{year:first+1,month:2,day:4},pillar:'甲寅'}]}:f)};
 assert.ok(fact(m.selectChapterFacts(spill,byKey(row.snapshot.manifest,'life-year')),'monthlyLuck').every(r=>r.start.year===first),'다음 해 월운은 올해 장에 없다');
 const ziwei=row.snapshot.analysis.contexts.ziwei;
 assert.equal(fact(m.selectChapterFacts(ziwei,byKey(row.snapshot.manifest,'life-next-year')),'yearlyLuck'),undefined,'기준 연도 유년은 내년 장에 없다');
 assert.ok(fact(m.selectChapterFacts(ziwei,byKey(row.snapshot.manifest,'life-year')),'yearlyLuck'));
 const major=fact(m.selectChapterFacts(saju,byKey(row.snapshot.manifest,'life-decade')),'majorLuck');
 const stored=fact(saju.facts,'majorLuck');
 assert.equal(major.currentCycle.index,stored.currentCycle.index);
 assert.deepEqual(major.cycles.map(c=>c.index),[stored.currentCycle.index+1],'지금의 10년과 다음 10년');
});
test('4 scope: ask question chapters read the requested period; life chapters do not get it',async()=>{
 const row=await prepare('fusion_all','ask');
 const {period}=row.snapshot.analysis.consultation,manifest=row.snapshot.manifest,saju=row.snapshot.analysis.contexts.saju;
 assert.equal(period.kind,'requested');
 const want=period.years.map(y=>y.year);
 for(const chapter of [manifest[0],byKey(manifest,'answer'),byKey(manifest,'timing')])assert.deepEqual(chapter.timeScope,{years:want,start:period.start,end:period.end},chapter.key);
 for(const key of ['question-year','life-year','life-decade','prevention','action'])assert.equal(byKey(manifest,key).timeScope,undefined,key);
 const scoped=m.selectChapterFacts(saju,byKey(manifest,'timing'));
 assert.deepEqual(fact(scoped,'yearlyLuck').map(r=>r.year),want);
 const date=s=>`${s.year}-${String(s.month).padStart(2,'0')}-${String(s.day).padStart(2,'0')}`;
 const stored=fact(saju.facts,'monthlyLuck');
 for(const r of fact(scoped,'monthlyLuck')||[]){
  const next=stored[stored.findIndex(x=>date(x.start)===date(r.start))+1];
  assert.ok(date(r.start)<=period.end&&(!next||date(next.start)>period.start),'month overlaps the period');
 }
 const life=JSON.parse((await captureRequest(row,byKey(manifest,'life-year'))).domainRules);
 assert.equal(life.consultation.period.kind,'default');
 assert.doesNotMatch(life.timeContract,/period.years에 이미 확정|period.label에 명시한 기간/);
 const answer=JSON.parse((await captureRequest(row,byKey(manifest,'answer'))).domainRules);
 assert.deepEqual(answer.consultation.period,period);
 assert.match(answer.timeContract,/period.years에 이미 확정/);
});

// 9A: a tarot position is the moment of the question, never a month of the requested period.
test('9A tarot: each card names its time frame and the prompt copy drops image fields',async()=>{
 const row=await prepare('fusion_all');
 const tarot=row.snapshot.analysis.contexts.tarot,chapter=row.snapshot.manifest.find(c=>(c.factSelectors?.tarot||[]).includes('cards'));
 const cards=fact(m.selectChapterFacts(tarot,chapter),'cards');
 assert.ok(cards.length);
 for(const card of cards){
  assert.match(card.timeFrame,/달력 시기 아님$/,card.positionKey);
  assert.ok(!Object.keys(card).some(k=>/image/i.test(k)),'no image fields');
 }
 const current=cards.find(c=>c.positionKey==='current');
 if(current)assert.equal(current.timeFrame,'카드를 뽑은 지금 · 달력 시기 아님');
 assert.ok(fact(tarot.facts,'cards').every(c=>!('timeFrame' in c)),'stored draw unchanged');
 // Only the month spread's 1–4주 차 positions are dated, and only from the draw.
 assert.equal(m.tarotTimeFrame('week2'),'카드를 뽑은 날부터 2주 차');
 const consult=fact(m.selectChapterFacts({...tarot,facts:[{id:'tarot.tarotConsultation',label:'tarotConsultation',value:{cards:[{positionKey:'current',imageKey:'x'}]}}]},{...chapter,factSelectors:{tarot:['tarotConsultation']}}),'tarotConsultation');
 assert.equal(consult.cards[0].timeFrame,'카드를 뽑은 지금 · 달력 시기 아님');
});

// 12: the ask opening answers the question across systems; its catalog title named only the first system.
test('12 answer leads once and every system retains its independent foundation',async()=>{
 for(const productId of ['fusion_saju_ziwei','fusion_all']){
  const row=await prepare(productId,'ask'),manifest=row.snapshot.manifest;
  assert.doesNotMatch(manifest[0].title,/타고난 성향과 지금의 흐름/,productId);
  assert.equal(manifest[0].key,'answer');
  assert.equal(manifest.filter(c=>c.key==='answer').length,1);
  assert.equal(manifest.filter(c=>c.layoutRole==='foundation').length,row.snapshot.product.systems.length);
  assert.equal(manifest[0].title.split(' · ')[0],byKey(manifest,'answer').title.split(' · ')[0]);
 }
});

// 13A: dedupe by the packet's row key and the palaces wrapper; the chapter copy may carry annotation fields.
test('13A askPromptView references named rows, the palaces wrapper and annotated copies',()=>{
 const source=(factId,path)=>({system:factId.split('.')[0],contextDomain:factId.split('.')[0],engineVersion:'v',factId,path});
 const palace={name:'명궁',mainStars:['자미']},card={positionKey:'current',name:'The Fool'};
 const prompt={evidence:{facts:[
  {id:'F1',label:'ziwei.palaces.명궁',value:palace,source:source('ziwei.palaces','명궁'),subject:'self'},
  {id:'F2',label:'tarot.cards.current',value:card,source:source('tarot.cards','current'),subject:'self'},
  {id:'F3',label:'vedic.houses.2',value:{house:2,sign:'Taurus'},source:source('vedic.houses','2'),subject:'self'},
  {id:'F4',label:'tarot.cards.inner',value:{positionKey:'inner',name:'Other'},source:source('tarot.cards','inner'),subject:'self'},
 ],timing:[]}};
 const view=m.askPromptView(prompt,[
  {id:'ziwei.palaces',value:{palaces:[palace],rule:'r'}},
  {id:'tarot.cards',value:[{...card,timeFrame:'지금'},{positionKey:'inner',name:'Changed'}]},
  {id:'vedic.houses',value:[{house:1,sign:'Aries'},{house:2,sign:'Taurus'}]},
 ]);
 const [p,t,h,changed]=view.evidence.facts;
 assert.equal(p.valueInCalculatedData,true);assert.equal(p.value,undefined);
 assert.equal(t.valueInCalculatedData,true);
 assert.equal(h.valueInCalculatedData,true,'house 2 is the row with house 2, not array index 2');
 assert.deepEqual(changed.value,{positionKey:'inner',name:'Other'},'a different value stays inline');
});
test('13A token ladder drops the 기준일 하루 근거 first and keeps one fact per system',()=>{
 const facts={facts:[
  {id:'saju.todaySaju',label:'todaySaju',value:'x'.repeat(60000)},{id:'saju.pillars',label:'pillars',value:'p'},
  {id:'ziwei.yearlyTimeline',label:'yearlyTimeline',value:'y'.repeat(60000)},
 ]};
 const build=f=>({system:'s',domainRules:'{}',calculatedData:f,outputSchema:{}});
 const fitted=m.fitChapterFacts(facts,build);
 assert.deepEqual(fitted.dropped,['saju.todaySaju']);
 assert.ok(fitted.request.calculatedData.facts.some(f=>f.id==='ziwei.yearlyTimeline'),'the last ziwei fact stays');
});
test('13A both ask openings stay at or under 40,000 estimated input tokens with no today rows outside the period',async()=>{
 for(const productId of ['fusion_saju_ziwei','fusion_all']){
  const row=await prepare(productId,'ask'),chapter=row.snapshot.manifest[0];
  const request=await captureRequest(row,chapter,true);
  assert.ok(m.estimateRequestTokens(request)<=m.CHAPTER_INPUT_TOKEN_TARGET,`${productId}: ${m.estimateRequestTokens(request)}`);
  const ids=request.calculatedData.facts.map(f=>f.id);
  assert.ok(!ids.some(id=>/^saju\.today/.test(id)),'기준일 is outside 내년 상반기');
  const askView=JSON.parse(request.domainRules).askFirstChapter;
  const palaceRows=askView.evidence.facts.filter(e=>e.source.factId==='ziwei.palaces'&&chapter.factSelectors.ziwei.some(s=>s.includes(e.source.path)));
  assert.ok(palaceRows.length&&palaceRows.every(e=>e.valueInCalculatedData),'palaces in CALCULATED_DATA are not sent twice');
 }
});

// 14A: 신궁 is forced in only where the reader's own nature or money is the subject.
test('14A bodyPalace is added only to self and wealth chapters',async()=>{
 const row=await prepare('fusion_all'),stored=row.snapshot.analysis.contexts.ziwei;
 // The fixture's 신궁 sits in 명궁, which every chapter already selects; move it to a palace no chapter names.
 const ziwei={...stored,facts:stored.facts.map(f=>f.label==='bodyPalace'?{...f,value:'질액궁'}:f)};
 const names=chapter=>fact(m.selectChapterFacts(ziwei,chapter),'palaces').palaces.map(p=>p.name);
 const manifest=row.snapshot.manifest;
 assert.ok(names(byKey(manifest,'life-money')).includes('질액궁'),'wealth keeps 신궁');
 assert.ok(!names(byKey(manifest,'life-love')).includes('질액궁'),'love does not');
 assert.ok(!names(byKey(manifest,'life-people')).includes('질액궁'),'relations does not');
});

// Stage C: prompt contracts. Their effect on prose needs a live re-run; these pin what the request carries.
const rulesOf=async(row,chapter,withAsk,previous)=>JSON.parse((await captureRequest(row,chapter,withAsk,previous)).domainRules);
test('C4 timeContract names the period each fusion chapter reads',async()=>{
 const row=await prepare('fusion_all','ask'),manifest=row.snapshot.manifest,{period,asOf}=row.snapshot.analysis.consultation;
 const year=Number(asOf.slice(0,4));
 const timing=(await rulesOf(row,byKey(manifest,'timing'))).timeContract;
 assert.ok(timing.includes(period.start)&&timing.includes(period.end),'question chapter: the requested period');
 const life=(await rulesOf(row,byKey(manifest,'life-year'))).timeContract;
 assert.match(life,new RegExp(`이 장은 기준 연도 ${year}년`));assert.ok(!life.includes(period.start));
 assert.match((await rulesOf(row,byKey(manifest,'life-next-year'))).timeContract,new RegExp(`다음 해\\(${year+1}년\\)`));
 assert.match((await rulesOf(row,byKey(manifest,'life-decade'))).timeContract,/이 장은 현재 대운과 다음 대운/);
 assert.match((await rulesOf(row,manifest.find(c=>c.layoutRole==='foundation'&&c.ordinal>0))).timeContract,/이 장은 출생 구조/);
});
test('C5A readerEvidence turns 조후·강약 scores into words, in chapter facts and the ask packet alike',()=>{
 const season={score:-4,type:'cool',advice:'a',badgeCls:'jb-cool',badgeTxt:'b',improve:'i',season:'겨울',fc:0,wc:2,wdc:1,mc:2,moistType:'wet',moistAdvice:'m',moistCnt:4,dryCnt:1};
 const strength={isStrong:true,score:41,yongshin:['fire'],dayEl:'metal'};
 const out=m.readerEvidence({facts:[{id:'saju.seasonalBalance',label:'seasonalBalance',value:season},{id:'saju.strengthHeuristic',label:'strengthHeuristic',value:strength}],
  askFirstChapter:{evidence:{facts:[{id:'F1',label:'seasonalBalance',value:season},{id:'F2',label:'strengthHeuristic',value:{...strength,isStrong:false,score:27}}]}}});
 const [s,p]=out.facts.map(f=>f.value),[as,ap]=out.askFirstChapter.evidence.facts.map(f=>f.value);
 for(const v of [s,p,as,ap])assert.ok(!Object.values(v).some(x=>typeof x==='number'),JSON.stringify(v));
 assert.equal(s.temperature,'서늘한 편');assert.equal(s.humidity,'습한 편');assert.equal(s.season,'겨울');assert.equal(s.type,undefined);
 assert.equal(p.strengthLevel,'신강이 뚜렷함');assert.equal(ap.strengthLevel,'신약 쪽이지만 경계에 가까움');
 assert.deepEqual(as,s);
});
test('C8 the fusion ask opening carries one evidence slot per system',async()=>{
 for(const productId of ['fusion_saju_ziwei','fusion_all']){
  const row=await prepare(productId,'ask'),chapter=row.snapshot.manifest[0];
  const request=await captureRequest(row,chapter,true),ids=request.calculatedData.facts.map(f=>f.id);
  const {systemSlots}=JSON.parse(request.domainRules);
  assert.deepEqual(systemSlots.slots.map(s=>s.system),chapter.systems,productId);
  for(const slot of systemSlots.slots){
   assert.ok(slot.name&&slot.sources.length&&slot.sources.every(id=>id.startsWith(slot.system+'.')&&ids.includes(id)),JSON.stringify(slot));
  }
  assert.match(systemSlots.rule,/evidence/);
 }
});
test('C9 ASK_PERIOD_GUIDE keeps tarot positions out of the requested period',()=>{
 assert.match(m.ASK_PERIOD_GUIDE,/타로 position을 시기로 옮기지 않는다/);
 assert.match(m.ASK_PERIOD_GUIDE,/1~4주 차 자리는 카드를 뽑은 날부터/);
});
test('C10 saju prevention candidates are pre-ranked, and conditions·signals must name the 충·파 anchor',async()=>{
 const tension=(kind,label)=>({kind,label});
 const cand=(key,period,tensions)=>({key,system:'saju',period,anchors:tensions?{tensions,support:[]}:{visibleTenGods:[]},opportunity:'o',burden:'b',observe:'s',action:'a',limitation:'l'});
 const value={system:'saju',anchors:[],saju:{candidates:[
  cand('interaction-tension',{kind:'year',year:2027},[tension('branchHarms','자미해')]),
  cand('interaction-tension',{kind:'natal'},[tension('branchClashes','자오충')]),
  cand('resource-balance',{kind:'natal'}),
  cand('interaction-tension',{kind:'year',year:2028},[tension('branchBreaks','미술파'),tension('branchClashes','인신충')]),
 ]}};
 const chapter={key:'prevention',preventionVersion:'prevention-20260930-v1'};
 const [packet]=m.preventionFacts({domain:'saju',facts:[{id:'saju.preventionEvidence',label:'preventionEvidence',value}]},chapter);
 const sent=packet.value.saju.candidates;
 assert.deepEqual(sent.map(c=>c.period.year??c.period.kind),[2027,'natal','natal',2028],'list order stays the stored order');
 const ranked=[...sent].sort((a,b)=>a.rank-b.rank);
 assert.deepEqual(ranked.map(c=>c.rank),[1,2,3,4]);
 assert.deepEqual(ranked.map(c=>c.period.year??c.period.kind),[2028,'natal',2027,'natal'],'충 in a year → 충 natal → 해 → no tension');
 assert.deepEqual(ranked[0].tensionNames,['인신충','미술파']);
 assert.equal(ranked[3].tensionNames,undefined);
 assert.match(packet.value.saju.rankRule,/충/);
 const row=await prepare('fusion_all');
 const rules=await rulesOf(row,byKey(row.snapshot.manifest,'prevention'));
 assert.match(rules.preventionAnchorContract,/conditions/);assert.match(rules.preventionAnchorContract,/signals/);
 assert.match(rules.preventionAnchorContract,/rank/);
});
test('C11 fusion chapters ask for about 80% of the target low; the question layout keeps its own ratio',async()=>{
 for(const productId of ['fusion_saju_ziwei','fusion_all']){
  const manifest=(await prepare(productId,'ask')).snapshot.manifest;
  for(const c of manifest)assert.equal(c.minimumChars,Math.ceil(c.targetChars[0]*.8),`${productId}/${c.key}`);
 }
});
test('C14 fusion chapters carry a ledger of evidence earlier chapters already leaned on',async()=>{
 const row=await prepare('fusion_all'),chapter=byKey(row.snapshot.manifest,'life-work');
 const prev=sources=>({summary:'s',example:'',topics:[],sources});
 const rules=await rulesOf(row,chapter,false,[prev(['ziwei.bodyPalace','saju.pillars']),prev(['ziwei.bodyPalace']),prev(['ziwei.bodyPalace','saju.pillars','saju.dayMaster'])]);
 assert.deepEqual(rules.claimLedger.uses,{'ziwei.bodyPalace':3,'saju.pillars':2});
 assert.match(rules.claimLedger.rule,/3개 장 이상/);
 assert.equal((await rulesOf(row,chapter,false,[prev(['saju.pillars'])])).claimLedger,undefined,'one use is not a ledger entry');
});


test('v3 direct answer carries review conditions, distinct foundation facts and sufficient output headroom',async()=>{
 for(const productId of ['fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_astrology_tarot','fusion_all']){
  const row=await prepare(productId,'ask'),chapter=row.snapshot.manifest[0];
  const request=await captureRequest(row,chapter,true),rules=JSON.parse(request.domainRules);
  assert.equal(chapter.key,'answer');assert.match(rules.directAnswer,/결론 → 실제 근거 → 지금 할 행동/);
  assert.ok(request.outputSchema.properties.questionAnswers.items.required.includes('review'));
  assert.ok(request.maxOutputTokens>chapter.targetChars[1]);assert.ok(request.maxOutputTokens<=24576);
  assert.ok(row.snapshot.manifest.filter(c=>c.layoutRole==='foundation').every(c=>c.systems.length===1&&c.ordinal>0));
 }
});
