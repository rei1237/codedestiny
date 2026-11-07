import '../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const rows = new Map(), llm = [];
let allowProfile = true, blockedCalls = 0;
const owner = 'mock-owner';
function read(env,user,id) {
  const row = rows.get(id);
  if (!row || row.userId!==user) throw Object.assign(Error('missing'),{code:'FORTUNE_NOT_FOUND'});
  return structuredClone(row);
}
const repo = {
  ownerId:id=>id, readRequest:read, allowedChapterAttempts:()=>1, userCanRetry:()=>false, holdAutoResumes:()=>false,
  createRequest(env,user,id,values) {
    if (!rows.has(id)) rows.set(id,structuredClone({...values,_id:id,userId:user,state:'CREATED',chapters:[]}));
    return read(env,user,id);
  },
  attachPayment(env,user,id) {
    const row=read(env,user,id);
    assert.equal(env.mockReceipt,id);
    if(row.state==='CREATED') Object.assign(rows.get(id),{state:'PAID',accessMethod:'DIRECT_KRW',paymentId:'mock-paid'});
    return read(env,user,id);
  },
  claimChapter(env,user,id) {
    const row=read(env,user,id);
    assert.ok(row.paymentId);
    return {row,token:row.state==='COMPLETED'?null:'mock-lease'};
  },
  finishChapter(env,user,id,token,ordinal,chapter,total) {
    const row=rows.get(id);
    assert.equal(row.chapters.length,ordinal);
    row.chapters.push(structuredClone(chapter));
    row.state=row.chapters.length===total?'COMPLETED':'GENERATING';
    return read(env,user,id);
  },
  failChapter(){ throw Error('failed generation'); }, saveChapterDraft(){},
};
const mockProfile = {birth:{year:2024,month:1,day:15,hour:12,minute:0,calType:'solar'},
  gender:'F',location:{label:'서울',lat:37.57,lng:126.98,tz:'Asia/Seoul'}};
globalThis.__sukuyoAudit = {repo, blocked(){blockedCalls++;throw Error('BLOCKED_SWISS_PATH');},
  profile(){ assert.ok(allowProfile); return structuredClone(mockProfile); },
  generate(request) {
    const rules=JSON.parse(request.domainRules), chapter=rules.chapter;
    llm.push(structuredClone(request.calculatedData));
    const paragraph=(title,i)=>Array.from({length:32},(_,j)=>title+' '+(i+1)+'장 '+(j+1)+'번째 확인한 합성 상담 문장입니다.').join(' ');
    const blocks=(chapter.sections||[]).map((s,i)=>({id:s.id,title:s.title||chapter.title,paragraphs:[paragraph(s.title||s.id,i)],sources:['sukuyo.personA']}));
    return {chapterId:chapter.id,complete:true,summary:chapter.title+' 합성 상담',blocks,
      analysis:blocks.length?[]:[paragraph(chapter.title,chapter.ordinal)],sources:['sukuyo.personA'],
      questionAnswers:(rules.assignedQuestions||[]).map(q=>({questionId:q.id,answer:'저장된 본명숙을 기준으로 대화의 속도를 살펴보세요.'}))};
  },
};
const substitutions = {
  'repository.js':'module.exports=globalThis.__sukuyoAudit.repo',
  'models.js':'exports.ProfileCard={findOne:()=>({lean:async()=>globalThis.__sukuyoAudit.profile()})};exports.CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};',
  'db.js':'exports.connectDb=async()=>{};exports.withMongoRetry=async(e,f)=>f();',
  'queue.js':'exports.enqueueConsultation=async()=>{};',
  'code-destiny':'exports.CodeDestinyProvider=class {async generate(request){return {result:globalThis.__sukuyoAudit.generate(request),provider:"mock",model:"fixture"};}};',
};
const root=process.cwd();
const lockedLibrary=file=>JSON.parse(fs.readFileSync(file)).packages['node_modules/astronomy-engine'];
const serviceLock=lockedLibrary('package-lock.json');
const oracleLock=lockedLibrary('tools/oracle/ephemeris-candidate/package-lock.json');
assert.equal(serviceLock.version,oracleLock.version);
assert.equal(serviceLock.integrity,oracleLock.integrity);
const reviewedSources=['tools/oracle/ephemeris-candidate/node_modules','node_modules'].map(dir=>path.resolve(dir,'astronomy-engine/esm/astronomy.js'));
const reviewedSource=reviewedSources.find(file=>fs.existsSync(file));
assert.ok(reviewedSource);
assert.equal(createHash('sha256').update(fs.readFileSync(reviewedSource)).digest('hex'),'068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7');
const built=await build({stdin:{contents:`export {prepareFortune,activateFortune,generateNextChapter,presentFortune,snapshotAnalysis} from './worker/yeongnyangi/service';
export {calculateFree} from './worker/yeongnyangi/fortune/free/readings';`,resolveDir:root,loader:'ts'},
  bundle:true,platform:'node',format:'cjs',write:false,metafile:true,plugins:[{name:'mock-only',setup(b){
    b.onResolve({filter:/swiss-ephemeris|sukuyo-astronomy/},()=>({path:'denied',namespace:'fixture'}));
    b.onResolve({filter:/swisseph|sweph|\.wasm/i},args=>{throw Error('Forbidden dependency: '+args.path)});
    b.onResolve({filter:/^astronomy-engine$/},()=>({path:reviewedSource}));
    b.onResolve({filter:/(?:repository\.js|models\.js|db\.js|queue\.js|providers\/code-destiny)$/},args=>{
      const key=path.basename(args.path);
      if(key==='code-destiny' && !args.importer.endsWith('service.ts'))return;
      if(key==='repository.js' && !args.importer.includes('yeongnyangi'))return;
      return {path:key,namespace:'fixture'};
    });
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='denied'?
      'module.exports=new Proxy({}, {get:(t,k)=>k==="__esModule"?false:globalThis.__sukuyoAudit.blocked})':substitutions[args.path]}));
  }}]});
assert.ok(!Object.keys(built.metafile.inputs).some(file=>/swiss-ephemeris|sweph-wasm|sukuyo-astronomy|\.wasm/i.test(file)));
assert.ok(!Object.keys(built.metafile.inputs).some(file=>/providers[\\/]code-destiny/.test(file)), 'real LLM provider must never be bundled');
const require=createRequire(import.meta.url), Module=require('node:module');
const m=new Module(path.resolve('sukuyo-fixture.cjs'));
m.paths=Module._nodeModulePaths(root);
m._compile(built.outputFiles[0].text,m.id);
const {prepareFortune,activateFortune,generateNextChapter,presentFortune,calculateFree,snapshotAnalysis}=m.exports;

test('신규 숙요 기본 운세·상담·결제 복귀·OFF 재열람은 준비한 명반을 사용한다',async()=>{
  const env={GEMINIF_API_KEY:'mock',LLM_DRY_RUN:'false',SUKUYO_IMD_NEW_ORDERS_V1:'true'};
  const off={GEMINIF_API_KEY:'mock',LLM_DRY_RUN:'false'};
  const body={productId:'sukuyo_mackerel',profileId:'self',timezone:'Asia/Seoul',question:'내 관계의 속도는 어떨까?',
    consultationAttemptId:'12345678-1234-4234-8234-123456789abc',
    questionDecision:{version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'관계',options:'',period:'',constraints:'',confirmed:true}};
  const [first,retry]=await Promise.all([prepareFortune(env,owner,body),prepareFortune(env,owner,body)]);
  assert.deepEqual(first,retry); assert.equal(rows.size,1);
  const stored=first.snapshot.analysis.contexts.sukuyo, version='sukuyo-imd1956-ae2.1.19-v1';
  assert.equal(stored.engineVersion,version); assert.equal(stored.engineFacts.options.providerVersion,version);
  assert.equal(stored.engineFacts.support,'candidate');
  const natal=stored.facts.find(f=>f.label==='personA').value;
  assert.equal(natal.astronomyVersion,version);
  const basic=await calculateFree('sukuyo',{question:body.question,personA:{birthDate:'2024-01-15',birthTime:'12:00',calendarType:'solar',gender:'female',birthPlace:{latitude:37.57,longitude:126.98,timezone:'Asia/Seoul'}}},{},'2024-01-16',env);
  assert.equal(basic.charts[0].source,version);
  assert.ok(basic.prompt.includes(version) && basic.prompt.includes(natal.mansion));
  allowProfile=false;
  assert.deepEqual(await prepareFortune({},owner,body),first);
  assert.equal(presentFortune(first).charts,undefined);
  const returned=await activateFortune({...off,mockReceipt:first._id},owner,first._id);
  assert.equal(returned.snapshot.analysis.contexts.sukuyo.engineFacts.digest,stored.engineFacts.digest);
  await assert.rejects(()=>activateFortune({...off,mockReceipt:first._id},'other',first._id));
  let row=returned;
  for(let i=0;i<first.snapshot.manifest.length;i++) row=await generateNextChapter(off,owner,first._id);
  assert.equal(row.state,'COMPLETED');
  assert.equal(llm.length,row.chapters.length);
  for(const c of llm) {
    assert.equal(c.engineVersion,stored.engineVersion);
    assert.equal(c.chartDigest,stored.engineFacts.digest);
  }
  const sent=llm.flatMap(c=>c.facts).filter(f=>f.id==='sukuyo.personA');
  assert.ok(sent.length);
  for(const fact of sent) {
    assert.equal(fact.value.index,natal.index);
    assert.equal(fact.value.astronomyVersion,natal.astronomyVersion);
  }
  const output=presentFortune(row);
  assert.ok(output.charts.length && output.chapters.length);
  assert.deepEqual(presentFortune(await prepareFortune({},owner,body)),output);
  const old=structuredClone(row);
  const legacy=old.snapshot.analysis.contexts.sukuyo;
  delete legacy.engineFacts; delete legacy.engineFactProtocol; legacy.engineVersion='code-destiny-integrated-v1';
  old.chapters[0].summary='기존 구매 원문';
  assert.equal(presentFortune(old).chapters[0].summary,'기존 구매 원문');
  const tampered=structuredClone(row.snapshot); tampered.analysis.contexts.sukuyo.engineVersion='altered';
  assert.throws(()=>snapshotAnalysis(tampered));
  assert.equal(blockedCalls,0);
  // 2025-01-20 15:00Z is the observed mansion disagreement (midnight KST).
  allowProfile=true;
  for(const [year,month,day,hour] of [[2025,1,21,0],[1990,3,14,12]]) {
    Object.assign(mockProfile.birth,{year,month,day,hour});
    await assert.rejects(()=>prepareFortune(env,owner,{...body,consultationAttemptId:'12345678-1234-4234-8234-123456789def'}),
      error=>error.code==='PRECISION_UNAVAILABLE');
    assert.equal(rows.size,1);
    assert.equal(blockedCalls,0);
  }
});
