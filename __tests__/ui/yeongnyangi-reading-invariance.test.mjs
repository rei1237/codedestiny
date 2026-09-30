import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// New preparations pin the concise profile across all supported products and kinds.
// Engine facts, request identities and the original catalog manifests stay fixed.
// A legacy-client label below means a new request without a consultation kind;
// it is not a previously purchased and stored reading.
// All calls are mocks: providers are stubbed, ask analysis falls back to its rules, time and randomness are fixed.
// An intended change outside v7 wiring (engine, prompt, catalog) refreshes the table: YEONGNYANGI_INVARIANCE_PRINT=1.
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__invariance={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>({updatedAt:null,birth:{year:filter.profileId==='partner'?1994:1997,month:2,day:10,hour:12,minute:0,timeUnknown:filter.profileId==='notime',calType:'solar'},gender:'F',location:filter.profileId==='noplace'?{}:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup in this fixture');};export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__invariance.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{const row=globalThis.__invariance.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export {prepareFortune} from './worker/yeongnyangi/service'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {products} from './worker/yeongnyangi/payments/catalog'; export {topicIds} from './worker/yeongnyangi/fortune/topics'; export {readingLocale} from './worker/yeongnyangi/fortune/reading-locale'; export {analyzeAsk} from './worker/yeongnyangi/fortune/ask/analysis'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('reading-invariance-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;

const canon=value=>JSON.stringify(value,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]])):v);
const sha=value=>createHash('sha256').update(typeof value==='string'?value:canon(value)).digest('hex').slice(0,12);
const errorCode=error=>`error:${error?.code||error?.message}`;
const RealDate=Date,NOW=RealDate.parse('2026-09-28T03:00:00Z');
class FixedDate extends RealDate{constructor(...a){super(...(a.length?a:[NOW]));}static now(){return NOW;}}
function fixedWorld(){
  let seed=0x9e3779b9;
  const next=()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
  const saved={Date:globalThis.Date,random:Math.random,values:crypto.getRandomValues};
  globalThis.Date=FixedDate;Math.random=next;
  crypto.getRandomValues=array=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(next()*256);return array;};
  return ()=>{globalThis.Date=saved.Date;Math.random=saved.random;crypto.getRandomValues=saved.values;};
}

const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const kindsFor=p=>[undefined,...m.consultationKinds[m.consultationDomain(p)]].filter(k=>!k||!k.koOnly&&m.supportsKind(p,k));
// New Korean relationship contracts have dedicated calculation/manifest tests; these hashes pin legacy products.
const variants={'saju_salmon@timeUnknown':{profileId:'notime'},'ziwei_salmon@noPlace':{profileId:'noplace'},'saju_mackerel@spirit':{mode:'spirit-v1',topicId:'relationship',spirit:{relationship:'헤어진 사이',topic:'space',situation:'차단한 상황'}}};

// The chapter fixture writes no questionAnswers, so assigned questions get fixed answers; ask answers stay limited.
async function mockBody(input){
  const c=input.analysis.consultation,assigned=c?.questions?.filter(q=>q.chapterId===input.chapter.id)||[];
  if(!assigned.length)return new m.MockChapterProvider().generateChapter(input);
  const body=await new m.MockChapterProvider().generateChapter({...input,ask:undefined,analysis:{...input.analysis,consultation:{...c,questions:c.questions.filter(q=>!assigned.includes(q))}}});
  return {...body,questionAnswers:assigned.map(q=>({questionId:q.id,answer:'주어진 근거로 지금의 선택지를 차분히 살펴보세요.',reason:'계산된 흐름을 바탕으로 선택지의 조건을 비교합니다.',
    timing:'정해진 시점보다 현재 흐름을 점검하는 기간으로 참고해 보세요.',action:'기록한 상황과 선택지를 나란히 적어 비교해 보세요.',...(input.ask?{factIds:[],timingIds:[],evidenceStatus:'limited'}:{})}))};
}
async function chapterRun(row){
  const {snapshot}=row,requests=[],validated=[],previous=[];
  const checkpoint=row.generationCheckpoint;
  const ask=checkpoint?{analysis:await m.analyzeAsk(snapshot.analysis.consultation,async()=>{throw new Error('mock: rules only');}),evidence:checkpoint.evidence}:undefined;
  for(const [ordinal,chapter] of snapshot.manifest.entries()){
    const input={locale:m.readingLocale(snapshot.locale),chapter,analysis:snapshot.analysis,previous:[...previous],repair:undefined,ask:ordinal===0?ask:undefined};
    let body;
    try{body=await mockBody(input);}catch(error){body=undefined;validated.push(`mock ${errorCode(error)}`);}
    const capture={async generate(request){requests.push(sha(request));return {provider:'mock',model:'mock',result:body};}};
    try{await new m.StructuredChapterProvider(capture).generateChapter(input);}catch(error){requests.push(errorCode(error));}
    let result;
    if(body){try{result=m.validateChapter(body,input);validated.push(sha(result));}catch(error){validated.push(errorCode(error));}}
    previous.push(result||{summary:`fixture ${ordinal}`,example:'',topics:[]});
  }
  return {requests,validated};
}
async function prepared(productId,kindId,extra={}){
  globalThis.__invariance.rows=new Map();
  const restore=fixedWorld();
  try{
    const body={productId,profileId:'self',timezone:'Asia/Seoul',topicId:'general',question:'올해 일과 관계에서 무엇을 먼저 살필까요?',...(kindId?{consultationKind:kindId}:{}),...extra};
    const kind=kindId&&m.consultationKinds[m.consultationDomain(m.products.find(p=>p.id===productId))].find(k=>k.id===kindId);
    if(kind?.partner)body.partnerProfileId='partner';
    const row=await m.prepareFortune(env,'owner',body);
    const {snapshot}=row,{contexts,consultation,...analysis}=snapshot.analysis;
    const prepare={id:row._id,fingerprint:row.fingerprint,amountKRW:row.amountKRW,productId:row.productId,featureKey:row.featureKey,
      checkpoint:row.generationCheckpoint?.version,snapshotKeys:Object.keys(snapshot).sort(),product:snapshot.product,manifest:snapshot.manifest,consultation,
      analysisKeys:Object.keys(analysis).sort(),facts:Object.fromEntries(Object.entries(contexts).map(([d,c])=>[d,c.facts.map(f=>f.id)]))};
    return {id:row._id,prepare,...await chapterRun(row)};
  }finally{restore();}
}
const row=(r,manifests)=>[sha(r.id),sha(r.prepare),sha(r.requests),sha(r.validated),manifests].join(' ');
const topicManifests=(p,k)=>sha(Object.fromEntries(m.topicIds.map(t=>[t,m.consultationManifest(p,k,t)])));

// New concise preparation changes only snapshot, request and validated prose hashes (2026-09-30).
// Every request ID and original topic manifest hash was checked against the previous pinned table.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED={
 "saju_mackerel:legacy": "19e2143ae891 0f90a3bf6e90 08ae83064590 d07ca967455c 8b73190c4eb8",
 "saju_mackerel:personal": "2b23e51ded9f 7273558c5395 9f239e0d0840 376d7dcee78c 73f644833274",
 "saju_mackerel:compatibility": "5092e14d00c0 6d1228800c3b cd630f3139d9 a98f53fd2920 b4feb0e2060a",
 "saju_mackerel:love": "3b76aa003732 0f4285601d9b 6f5cb5da9e39 445f0d8ece8d e387640606d4",
 "saju_mackerel:work": "955f508ab668 802caef226ec 07b5c5165556 5dfc73127678 1dfa9237efd8",
 "saju_mackerel:money": "cdbe95c856e1 c0bcb52f7ccb 1911967faf68 c4202c21b93e 054738d4280d",
 "saju_mackerel:ask": "f5ee6960f26a 784a27f02ffb 5760fb1f091b 8f9f9b28a629 ac4eb5435ab6",
 "saju_salmon:legacy": "57913d88b470 19e1b92efd7c 6e3c61fb6d2a 6b661ff4434a 08f01b92e660",
 "saju_salmon:personal": "37f20270d48d 8837df4b405b 25bb6f30f69c ef7d411955d0 a9108f244a70",
 "saju_salmon:compatibility": "10f81d9a5876 f34b03e0b0c2 fcd319bc17d3 eb7db84b3fbe de55f005535f",
 "saju_salmon:love": "145a385afb0f 6aac210d6b91 0b441de57c20 ef1007d4876d 6913aca975af",
 "saju_salmon:work": "6089a129ebde 4570f26e3133 5d96ec82448b dc13148a2077 fa41008e9044",
 "saju_salmon:money": "52beec216bf4 f5042de44d43 cfdf19fe6e9e e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "de3672b4c9ac c9ddb5e4d79f 2f4b86d3a125 618f76f4b1dc a9108f244a70",
 "saju_flounder:legacy": "6a7e90822519 41f824b47e35 5fbe1c7ff9b8 7d92f793f98f 6d0df7a238c4",
 "saju_flounder:personal": "087cf60e017e e1c0a5d07aa3 4075b9dd1808 584a5eb40ef1 61c642e3d72e",
 "saju_flounder:compatibility": "019a1b69a70e 45142ce6fe72 2497f37f708e b78ac7299f4b c5bce8f8a3ca",
 "saju_flounder:love": "640ad6aec8b9 ea971db5fc9a 0f70e03949b9 7b8e27b79390 45cdf76b8942",
 "saju_flounder:work": "a5290e7572e1 2ad45988e192 d6d40aa991a4 636a02d3779c f7f756f6a7c3",
 "saju_flounder:money": "40a15f10ec07 ff7646c9a9bd 98ddd11e164d 4066fe599d94 6c151b1de8ff",
 "saju_flounder:ask": "affa5a2a327f 73897f02dcf9 20cbe799df23 8a6f9ff2ab1b 61c642e3d72e",
 "saju_tuna:legacy": "5a9c9ed12cc2 31b0633db569 03229e3910fc 6d960d49edcb 7266f902c6d4",
 "saju_tuna:personal": "fc1157b67a96 b500f6ef9300 01f39f765fff c4733f3c6fff 7250e568b2a1",
 "saju_tuna:compatibility": "a7be73c8068b 68f52700947f b9c5b121fbd9 41c531e014a3 14b76362baa5",
 "saju_tuna:timing": "5fe47eaf982b f173ea2208b6 5a19d3cad3f7 bba4996322b0 d8509d5c00a7",
 "saju_tuna:love": "77d2db5730bb 8092f1b6d09a 68b1c52761f4 c595befab8cd 7c9b284576de",
 "saju_tuna:work": "07b3fa40a681 b0689d7184b4 dd5a95243e62 f5d72f0e3613 bcc5a192599a",
 "saju_tuna:money": "41d558941795 970c6acd00fc 68164bf9eba3 a9bab5eee04e d0bff6c53db5",
 "saju_tuna:ask": "933f0e0f8885 a7d3c93345b3 91f7830b515f b7175676d149 7250e568b2a1",
 "ziwei_mackerel:legacy": "d57f7a6310e3 0858f67297f9 b2926311f8d8 dd92f865cc50 f0f57311a50f",
 "ziwei_mackerel:personal": "b09aead75e88 ab479c3d1a62 ac7ad40e28a4 613a593bc74c 575175147460",
 "ziwei_mackerel:money": "99a39543089a 3a77bd3bad32 97596c4aa2a2 2d577b0f5465 a50ae1a95053",
 "ziwei_mackerel:ask": "4814fb775a44 4ca549124b14 ada2d59fb21c 19260fde98cb 279b65fe829c",
 "ziwei_salmon:legacy": "f9152fc93d31 f0b7ee423bba a87fe607f649 ec7df4cdc33c 541dfb3677ed",
 "ziwei_salmon:personal": "4a698a5cf120 fd8e71754678 92c00eeaea16 b43270c880d1 612433ee52aa",
 "ziwei_salmon:money": "e12f9df4e43f b344981e7f3c 151375b2d4fa f1f19a2b7409 251643d2a1ce",
 "ziwei_salmon:ask": "2c52e4de4878 9d208ea07cb8 2cf8b6cfc265 c4222a322cf0 612433ee52aa",
 "ziwei_flounder:legacy": "344a58d94f7e 12e88eb0a6c3 9a5433b1c725 fbcfeaea5d1c 84d204935a81",
 "ziwei_flounder:personal": "e43b741c28fa c58e33eabc52 a264f694ff76 476ec8adfe71 661fc5586a20",
 "ziwei_flounder:money": "7aaa0ac2fb87 207e6efe3356 612d708c83da 872f2c6115c9 8578838c07ca",
 "ziwei_flounder:ask": "80a4f9a7c48e 46ef5f7e755e 0df73d46722c 2ec926b317a5 661fc5586a20",
 "ziwei_tuna:legacy": "8326dcd3d66e d85609c71ecf 6e2ae11770ac 07c5848e21d8 f2f6719e832d",
 "ziwei_tuna:personal": "bda5635d423d c58e19c3e821 92b62f7758bc b2eb0a402aa6 2b8b8b998443",
 "ziwei_tuna:money": "c481b94511db 8b9a5c343c0d 53b06358223c 074186d61792 54b63770fa33",
 "ziwei_tuna:ask": "e7bc0bf52e51 240d4d2ff3df 7756b123225e b7e37febaf57 2b8b8b998443",
 "sukuyo_mackerel:legacy": "5b57264b2d2f 3c931f94e0c9 b159abdea975 5de9c3d6f807 09cac5e57c93",
 "sukuyo_mackerel:personal": "03c7f6a7165b d16b2a93dbc3 1ed9c75896b8 49345666bd18 60c2f71db056",
 "sukuyo_mackerel:compatibility": "7d84669df0ec 52090db8f04e 7579e2b46c5c 2f84d874b2bd 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "48ec4b51f111 cdfb1377dcfa 7eb42a652f74 981eb9605406 51c64f67c10e",
 "sukuyo_mackerel:ask": "f0d2e42536f5 19069b0a921d fa8b8e550834 33c7182b1a0d c1b4a3466991",
 "sukuyo_salmon:legacy": "8e640965d4ac 3cb0151d40b8 fef3d330ca70 257ffcf7e282 40764a5a48f1",
 "sukuyo_salmon:personal": "ac28ff653e5f 07d4ca895954 59acc6f8b471 9814fc14064a c7963d52d5c2",
 "sukuyo_salmon:compatibility": "408731b2b641 bd06d4f10653 f7fa1a248707 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "f8d5f94d112b aeb485a7db8b b2780bdeffa8 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "54b731135a8b 397f3056207e 317c764ef78a 537730cb980b c7963d52d5c2",
 "sukuyo_flounder:legacy": "e923d1013711 18105c2558c1 2fa67cdb53f7 a0dfc7e1f08b 41630a4b9f1f",
 "sukuyo_flounder:personal": "4e4db345b53e ccb1260f793c 1fab3d10d544 9b98f5d13d01 337c369df170",
 "sukuyo_flounder:compatibility": "310c21ddc549 936f1b49049a 643fb4bb6251 b6ccb9e17557 3b18417c9ffd",
 "sukuyo_flounder:relationship": "937d9a409a2d a74444477754 5f5034fc06a0 315c7cf86ecb b69fd6f8148e",
 "sukuyo_flounder:ask": "bbea488d384c 8a9fcdaca6d2 362da1ceec66 b60255657156 337c369df170",
 "sukuyo_tuna:legacy": "75ec611463f1 53e2df8d68cf 2f0a984f7e3c 06b0fbb5e726 bbdcc5db3d05",
 "sukuyo_tuna:personal": "cf9f5be5f840 9a5b50c5a252 6d1280b59a5a b994bfde83ea 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "34aafdcc35a6 c9cc194fae0f 28c858f81003 8d4c2f48fe62 cf557e59d9fd",
 "sukuyo_tuna:relationship": "38f36358de8c ba65f9d7b454 edfbc2d19888 be857e3d5c78 6371bf908ad4",
 "sukuyo_tuna:ask": "2b77a40b6d0d 044500ea2520 cb8457a997c9 0d45c1ab79ec 933a3eee4cc4",
 "vedic_mackerel:legacy": "a1025b147e16 e0f991d96235 f43326e5a911 482ac5165b2d 0ab96e7ba746",
 "vedic_mackerel:personal": "65d9950f2575 beb666926420 6c54be170d7e d56983683d0a 3b771e8d6049",
 "vedic_mackerel:ask": "578cac0d3cdd fa1b32c76142 9294ba0b7eaf 31189541bed2 0f802baef856",
 "vedic_salmon:legacy": "ae4ae7ed41e5 c2c3f361566d 2cfe7a02ddbe 05a4d938566c d832b44c39d3",
 "vedic_salmon:personal": "e55f9cac05b1 e0f22f09ce28 2b317e273663 236c16a3eb0c ac338df4e9f4",
 "vedic_salmon:ask": "4868f52d5c31 5b02ddb87533 68c7457f7e9b 71173eb8b965 ac338df4e9f4",
 "vedic_flounder:legacy": "56f2a9033bb8 c8827db86d2b eccb9aa85f23 a0ff1d4a7654 f4c3879ba491",
 "vedic_flounder:personal": "b4b8c7aeb1df 15f72ff98603 34825dfcb2a8 0f436addd3f0 7d3b159ecd72",
 "vedic_flounder:ask": "12435a200ba3 621a9f5ee81d b9dd950bf561 88c9b323f2f3 7d3b159ecd72",
 "vedic_tuna:legacy": "6b8909db8208 2e5270d74259 367ccd3be134 1e949bd44984 9a50bce25627",
 "vedic_tuna:personal": "f6e855d0ef36 0c949b69069a fd95718dcb74 47d5d420a61b 428ba79f9a99",
 "vedic_tuna:timing": "69658cac3f8d f31f710bedc1 7ad33a31ac93 89f2a8182665 d48d8fcb6c1c",
 "vedic_tuna:ask": "6166e30c3927 182d98146eea a56d8bbd03bb 0b22a0f60ea7 428ba79f9a99",
 "astrology_mackerel:legacy": "a9a603b44b12 d568b0403747 75717a90e474 d9936d8d59b7 a01f7e3b5491",
 "astrology_mackerel:personal": "e0713fed4b5f d4af1c357178 364cabad6252 21f42be82895 97192bfd920b",
 "astrology_mackerel:work": "f80b73aeb83f a61dc986347a 8bd21571b000 8f712fbe7c2a e4a4f0f408bf",
 "astrology_mackerel:ask": "0bdcbf0900a0 e0c8444f6ff9 aaad83f5c2da 93d1c10d527b 91f01265e663",
 "astrology_salmon:legacy": "df56a6ff7943 8cfd74a4c554 2ff0cfdd6e6d 81ecee88196e 86295650d714",
 "astrology_salmon:personal": "6301b8b41b81 55b49d66d21e 026af9786847 468c7f60a9de e9cd1e6be39e",
 "astrology_salmon:work": "18cb54020f2e a8fde25727d8 3af3506e8bf6 bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "6a6fa8d27028 264df8de00ee 52734c52a95c a8fea79f7cde e9cd1e6be39e",
 "astrology_flounder:legacy": "57a0568d6cac fec902f0d681 2de4cf992e67 49133bf42f84 30093a83fd6a",
 "astrology_flounder:personal": "d9c6532874e7 b38e4ba3e441 0d348d5ea5f7 7c961a2d8f4b 1f6d2b4df594",
 "astrology_flounder:work": "8d46072b688b 51e06bca6661 2739514b214f c7125b7acde0 39c8e4a84a00",
 "astrology_flounder:ask": "19276242c426 bcd5d9c6c2cf 664de1093920 349f85cf95de 1f6d2b4df594",
 "astrology_tuna:legacy": "a7de72c24d79 935a44f0f57c 0f3dca062bb3 04cbd6fe48ea 448e1eeab4e4",
 "astrology_tuna:personal": "f4094260e78e ab9e269120b5 c72a2bc78b06 6564567a69a3 85918032d0e7",
 "astrology_tuna:work": "1fcf562a3790 add346f90c3b 72c568e3ee75 e709a762942a 22515b7f0512",
 "astrology_tuna:ask": "d88d54b4129f 6792525172f5 36ba352b58c4 95565089ca8d 85918032d0e7",
 "tarot_mackerel:legacy": "b8697ff4eb9c 34a99c69f203 523a4d37fe5e 744acfb0228d 6aa275b457cb",
 "tarot_mackerel:choice": "d9101ea94d78 be70e135f2f8 5f3855da3762 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "40679d816dbe 0574a3031be3 17f4737aacb3 94dcac1bb98c ec43dbbb0b03",
 "tarot_salmon:legacy": "3f2a60f7e8f5 62078e273468 e9ba63ac1d9a e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "f3cfd282e806 9f84ed5677e5 3e59d42b6127 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "98862054f11b f54ef794f2f6 998fe8bfbf51 92bb7cdeb91c 827911f6ce9f",
 "tarot_flounder:legacy": "ac6ed92e4d6e 90e23f6e5425 4014ab8744b5 77f6e0cc6fa7 200019185775",
 "tarot_flounder:choice": "1172412da761 bc6b9b06f3aa 718bf0057c60 358f2b973686 157bdc132835",
 "tarot_flounder:love": "05b2e55b02c9 43359b7aa3b4 2afb482dc556 200ad771bfc7 cbc2d0bac5dd",
 "tarot_tuna:legacy": "658c78b450f7 86b4629fc7fa 2aa39d83ab78 2e0f7ba19bcf cdfa81f3a8a1",
 "tarot_tuna:choice": "9a082858af6b 41bc443779b1 f4a941db7dd0 daa9150e09dd e4dde4d5d80d",
 "tarot_tuna:love": "d906d40792d3 9c6836612e14 800bfcbed3e3 b3ab2233b63e f40bb48c0c1e",
 "fusion_saju_ziwei:legacy": "f63b0a1d754d 475cf2dc0739 5b7f162fe3f8 1eb64574f40c 0d9429c32910",
 "fusion_saju_ziwei:personal": "2a885e35287e 4ce34c1299db 0bab63671d1a b1811142eae7 bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "ecc16f5499f1 b540065c353e f854e24e6889 aad3e8ec27de 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "679e697b6d40 e95e5f183b4f 034f7f4e9c33 30233ef2e9e3 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "577c1db518e0 29ab8ffe80a9 ed8eb1b9b990 b823193b14c9 70b570d09783",
 "fusion_sukuyo_vedic:ask": "549e7d12faff 490255121361 b519883099ff e9eb9967a34e 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "7848ac8d3e6f 70dfe45a3af0 6164dfad1e67 80ad122d17cb 032738bbd603",
 "fusion_astrology_tarot:personal": "c8752f987f6e 9be409914ef7 8121b90d3d33 913d3c0f0149 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "2a5956d4cafa be9e94d88527 c93e96864597 68504bbe338f 032738bbd603",
 "fusion_all:legacy": "2b3008241c3e 487d4debcc20 3a2a3dbeb009 794e866c7a30 6e8d23af93ea",
 "fusion_all:personal": "51eaf0d7ddfb 4302e545e0d0 2b00787bc06f 2bca232332b3 d3753452ec82",
 "fusion_all:ask": "58bdeb24874b e692246a959c bb99ccbd97a0 b73798444a0a 6e8d23af93ea",
 "saju_salmon@timeUnknown": "71627c589411 b4c7c4d8ef79 adfddc76960f fc4b9fca2d38 -",
 "saju_salmon@timeUnknown:ask": "b6114fe5862e 2027e222045b c45c3fea9aee 9ac7890c65c1 -",
 "ziwei_salmon@noPlace": "4f372ab54262 e63b3407a9d6 92c00eeaea16 b43270c880d1 -",
 "ziwei_salmon@noPlace:ask": "71a4244dee5b a437b3922f12 2cf8b6cfc265 c4222a322cf0 -",
 "saju_mackerel@spirit": "b3266c0a3126 d5d82461ce72 05e6cbf09a66 c3b521dd1883 -"
};

test('new concise preparations preserve calculation and identity contracts across products',{timeout:600000},async()=>{
  const actual={};
  for(const p of m.products)for(const k of kindsFor(p))actual[`${p.id}:${k?.id||'legacy'}`]=row(await prepared(p.id,k?.id),topicManifests(p,k));
  for(const [key,extra] of Object.entries(variants)){
    const [productId]=key.split('@');
    actual[key]=row(await prepared(productId,extra.mode?undefined:'personal',extra),'-');
    if(!extra.mode)actual[key+':ask']=row(await prepared(productId,'ask',extra),'-');
  }
  if(process.env.YEONGNYANGI_INVARIANCE_PRINT==='1')console.log('INVARIANCE_SNAPSHOT_BEGIN'+JSON.stringify(actual,null,1)+'INVARIANCE_SNAPSHOT_END');
  // Fail closed: a new product or kind without a pinned row is not silently accepted.
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(EXPECTED).sort());
  for(const key of Object.keys(EXPECTED))assert.equal(actual[key],EXPECTED[key],`${key}: id prepare requests validated manifests changed; refresh only for an intended change with YEONGNYANGI_INVARIANCE_PRINT=1`);
});
