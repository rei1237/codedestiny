import '../../tools/oracle/next-delivery/guard.cjs';
import {build} from 'esbuild';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
const mock={vedicCalls:[],sukuyoCalls:[],vedicChart:{lagna:{sign:'Aries'},moon:{sign:'Taurus',nakshatra:'Rohini',nakshatraLord:'Moon',pada:2},planets:[{name:'Moon',sign:'Taurus',house:2,nakshatra:'Rohini',nakshatraLord:'Moon',pada:2}],houses:[],calculationMeta:{fallbackUsed:false}},sukuyoChart:{name:'각숙',nameKo:'각숙',index:0,keywords:['관찰'],strengths:['차분한 정리'],shadows:['생각이 길어짐']}};
const built=await build({stdin:{contents:"export * from './worker/yeongnyangi/fortune/shared/natal-profile';export * from './worker/yeongnyangi/fortune/shared/domain';export * from './worker/yeongnyangi/fortune/shared/prompt';export * from './worker/yeongnyangi/fortune/chapter-facts';export {vedic} from './worker/yeongnyangi/fortune/vedic';export {sukuyo} from './worker/yeongnyangi/fortune/sukuyo';export * from './worker/yeongnyangi/fortune/shared/consumer-facts';export * from './worker/yeongnyangi/fortune/charts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'guard',setup(b){b.onResolve({filter:/.*/},a=>{if(a.path.endsWith('/vedic-ai-chart.js'))return {path:'vedic',namespace:'fixture'};if(a.path.endsWith('/sukuyo-astronomy.js'))return {path:'sukuyo',namespace:'fixture'};if(a.path.endsWith('/sukuyo-verified-provider.js'))return {path:'sukuyo-verified',namespace:'fixture'};if(a.path==='@/lib/r2-public-url')return {path:process.cwd()+'/lib/r2-public-url.ts'};if(!a.path.startsWith('.')||/swiss|sweph|ephemeris|db\.js|models/.test(a.path))throw Error('BLOCKED:'+a.path)});b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='sukuyo-verified'?"export function verifiedSukuyoForCivilTime(...args){globalThis.mock.sukuyoCalls.push(args);return structuredClone(globalThis.mock.sukuyoChart)}":a.path==='vedic'?"export async function calculateVedicAiChart(...args){globalThis.mock.vedicCalls.push(args);return structuredClone(globalThis.mock.vedicChart)}":"export async function calculateSukuyoForMoment(...args){globalThis.mock.sukuyoCalls.push(args);return structuredClone(globalThis.mock.sukuyoChart)}"}));}}]});
const ctx=vm.createContext({module:{exports:{}},mock,structuredClone,TextEncoder,console,process:{env:{NEXT_PUBLIC_ASSETS_BASE_URL:'https://mock.test'}}});vm.runInContext(built.outputFiles[0].text,ctx);const api=ctx.module.exports;
const clone=x=>JSON.parse(JSON.stringify(x));
const birth={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male',birthPlace:{latitude:37.5,longitude:127,timezone:'Asia/Seoul'}};
const input={personA:birth,readingMode:'personal',question:'타고난 성향을 자세히 설명해 줘'};
const options={runtimeEnv:{YEONGNYANGI_NATAL_PROFILE_V1:'true',PROVIDER_MARKER:'mock-only'},asOf:'2026-11-02'};
for(const domain of ['vedic','sukuyo'])test(domain+': free/LLM/chapter share static birth traits after date, question and timing change',async()=>{
 const first=await api[domain].calculate(input,options);const second=await api[domain].calculate({...input,question:'다른 질문'},{...options,asOf:'2030-05-01'});
 assert.deepEqual(clone(api.natalProfileOf(first)),clone(api.natalProfileOf(second)));
 const p=api.natalProfileOf(first);assert.ok(p.paragraphs.length>=3);assert.equal(first.engineFacts.support,'pending');
 const saved=clone(first);api.validateDomainFacts(saved);const prompt=api[domain].buildPrompt(input,saved,'mackerel');assert.match(prompt.system,/무료 해설과 같은/);assert.deepEqual(clone(prompt.calculatedData.facts.find(f=>f.label==='natalProfile').value),clone(p));
 assert.ok(api.selectChapterFacts(saved,{key:'nature',factIds:[],version:'legacy'}).some(f=>f.label==='natalProfile'));
 saved.facts.find(f=>f.label==='natalProfile').value.summary='changed';assert.throws(()=>api.validateDomainFacts(saved),/MISMATCH/);
 const off=await api[domain].calculate(input,{runtimeEnv:{}});assert.equal(api.natalProfileOf(off),undefined);assert.equal(off.engineFacts,undefined);
});
test('sukuyo passes runtime env to provider rather than the options wrapper',()=>{assert.equal(mock.sukuyoCalls[0][0].PROVIDER_MARKER,'mock-only');assert.equal(mock.sukuyoCalls[0][2].strictSwiss,true)});
test('vedic differing birth placements change explained traits; no fallback provider admitted',async()=>{
 const first=await api.vedic.calculate(input,options);mock.vedicChart.moon={sign:'Virgo',nakshatra:'Hasta',nakshatraLord:'Moon',pada:1};const other=await api.vedic.calculate(input,options);assert.notEqual(api.natalProfileOf(first).sourceDigest,api.natalProfileOf(other).sourceDigest);assert.notEqual(api.natalProfileOf(first).summary,api.natalProfileOf(other).summary);
 mock.vedicChart.calculationMeta.fallbackUsed=true;await assert.rejects(api.vedic.calculate(input,options));mock.vedicChart.calculationMeta.fallbackUsed=false;
});
test('saju natal profile ignores annual/major luck, preserves unknown hour and uses existing temperament',()=>{
 const facts={pillars:{year:'庚辰',month:'辛巳',day:'癸酉',hour:null},dayMaster:'癸',yearlyLuck:{year:2026},majorLuck:{pillar:'甲子'}};const first=api.context('saju',facts);const second=api.context('saju',{...facts,yearlyLuck:{year:2030},majorLuck:{pillar:'乙丑'}});
 assert.deepEqual(clone(api.buildNatalProfile(first)),clone(api.buildNatalProfile(second)));assert.ok(api.buildNatalProfile(first).basis.some(b=>b.label==='시주'&&b.value==='미상'));
});
test('saju natal profile leads with the person, keeps one voice and never names a single useful element',()=>{
 const profile=hour=>api.buildNatalProfile(api.context('saju',{pillars:{year:'庚午',month:'辛巳',day:'壬午',hour},dayMaster:'壬'}));
 const timed=profile('丁未');const untimed=profile(null);
 for(const p of [timed,untimed]){assert.match(p.summary,/^네 바탕에서/);const body=p.paragraphs.join(' ');assert.doesNotMatch(body,/습니다|세요.|쉬움|한다./);assert.match(body,/일 쪽부터/);assert.match(body,/돈 쪽도/)}
 assert.equal(timed.basis.find(b=>b.label==='격국').value,'편인격');assert.equal(untimed.basis.find(b=>b.label==='격국').value,'판정 보류');assert.equal(untimed.basis.find(b=>b.label==='도움이 되는 기운 후보').value,'판정 보류');
});
test('actual free natal branch has no today-moon calculation and reuses paid natal profile',async()=>{
 const source=fs.readFileSync('worker/yeongnyangi/fortune/free/readings.ts','utf8');const ast=ts.createSourceFile('readings.ts',source,ts.ScriptTarget.Latest,true);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='calculateFree');
 const sandbox=vm.createContext({...api,domains:{vedic:api.vedic,sukuyo:api.sukuyo},freeCategories:[{id:'vedic',label:'베다점'},{id:'sukuyo',label:'숙요점'}],FortuneError:Error,buildDomainPrompt:(d,i,c)=>JSON.stringify(api[d].buildPrompt(i,c,'mackerel')),withContinuation:x=>x});vm.runInContext(ts.transpile(fn.getText(ast).replace('export ','')),sandbox);
 for(const d of ['vedic','sukuyo']){const a=await sandbox.calculateFree(d,input,{},'2026-11-02',options.runtimeEnv);const b=await sandbox.calculateFree(d,input,{},'2030-05-01',options.runtimeEnv);assert.deepEqual(clone(a.paragraphs),clone(b.paragraphs));assert.deepEqual(clone(a.natalProfile),clone(b.natalProfile));assert.ok(!a.basis.some(x=>/오늘/.test(x.label)));assert.ok(a.prompt.includes(a.natalProfile.sourceDigest))}
});

test('all six domains and all four paid fish keep the same native profile, never reinterpret tarot as birth',()=>{
 const examples={saju:{pillars:{year:'庚辰',month:'辛巳',day:'癸酉',hour:null},dayMaster:'癸'},vedic:mock.vedicChart,sukuyo:{personA:mock.sukuyoChart},ziwei:{lifePalace:'명궁',bodyPalace:'명궁',palaces:[{name:'명궁',branchIndex:0,mainStars:['자미'],assistantStars:[],maleficStars:[]}]},astrology:{planets:{Sun:{sign:0,signKo:'양자리'},Moon:{sign:1,signKo:'황소자리'}},elementBalance:{traits:['불 우세 — 먼저 움직이고 시도하는 힘']}},tarot:{cards:[{nameKo:'마법사',positionLabel:'현재',orientation:'upright',interpretation:'가진 도구로 선택을 시작하는 상징'}],spreadId:'fixed'}};
 for(const [d,f] of Object.entries(examples)){
  const c=api.pinDomainFacts(api.attachNatalProfile(api.context(d,f),input,options),input,options);const p=api.natalProfileOf(c);assert.ok(p,d);assert.equal(p.scope,d==='tarot'?'draw':'birth');
  for(const fish of ['mackerel','salmon','flounder','tuna']){
   const prompt=api.buildPrompt(input,c,fish,'same system',['성향']);assert.deepEqual(clone(prompt.calculatedData.facts.find(f=>f.label==='natalProfile').value),clone(p));
   const facts=api.selectChapterFacts(c,{key:'nature',tier:fish,version:'legacy',factIds:[]});assert.equal(facts.find(f=>f.label==='natalProfile').value.sourceDigest,p.sourceDigest);
  }
 }
});
