import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// Approved v7 rollout pins new eligible purchase contracts. Legacy, fusion and
// ineligible tier rows retain the pre-rollout hashes.
// All calls are mocks: providers are stubbed, ask analysis falls back to its rules, time and randomness are fixed.
// An intended change outside v7 wiring (engine, prompt, catalog) refreshes the table: YEONGNYANGI_INVARIANCE_PRINT=1.
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__invariance={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>({updatedAt:null,birth:{year:filter.profileId==='partner'?1994:1997,month:2,day:10,hour:12,minute:0,timeUnknown:filter.profileId==='notime',calType:'solar'},gender:'F',location:filter.profileId==='noplace'?{}:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__invariance.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{const row=globalThis.__invariance.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
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
const kindsFor=p=>[undefined,...m.consultationKinds[m.consultationDomain(p)]].filter(k=>!k||m.supportsKind(p,k));
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

// Four-system counseling intentionally changes only requests (2026-09-29); all other columns stay pinned.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED={
 "saju_mackerel:legacy": "532f8f0c5f45 afcd33019a67 c470bf602b59 851da5b221c0 8b73190c4eb8",
 "saju_mackerel:personal": "e08b7c644bc1 2b988f7b4f47 2459ed5d5f57 1aebd5c72506 73f644833274",
 "saju_mackerel:compatibility": "23593e99bc26 addc24fca7c7 bc01c27a410d bc0afe7b8e34 b4feb0e2060a",
 "saju_mackerel:love": "a834bc566d51 cccb24a2474b ea6e21134af4 92750dc70bc6 e387640606d4",
 "saju_mackerel:work": "cb73156e4e8b 86ca0b32f48b f41c52cbebb8 2128afc784de 1dfa9237efd8",
 "saju_mackerel:money": "7ddf26677d92 752401af56ea 43cd51f2202f 51d4c9bc0be0 054738d4280d",
 "saju_mackerel:ask": "011f0115da3b 57bdb457b69d 47969b70f86a 5e464a47c141 ac4eb5435ab6",
 "saju_salmon:legacy": "3650ddd617e9 83ba7f3371ba d90eb2b5f695 6b661ff4434a 08f01b92e660",
 "saju_salmon:personal": "206bbf842dd4 3274e2997bb8 becdb875e58d debb2dc65c35 a9108f244a70",
 "saju_salmon:compatibility": "b0dec7668d32 83b1e1d1d44f 9d1f59158962 eb7db84b3fbe de55f005535f",
 "saju_salmon:love": "574e81fe84bc 996793fec306 9ab00208a7e6 ef1007d4876d 6913aca975af",
 "saju_salmon:work": "79feb14a4130 80ffdea12fc5 e9ee052f6f16 dc13148a2077 fa41008e9044",
 "saju_salmon:money": "370174e786ea 755e7e23fb85 6dc20c59d299 e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "1ad9370511f7 75f30ba92238 5f24a5ad455b d3bf8b061ef7 a9108f244a70",
 "saju_flounder:legacy": "6e00806f3c35 fbdf99d6be06 74ca60be57ca 7d92f793f98f 6d0df7a238c4",
 "saju_flounder:personal": "3f24fb6e7b46 6baf82603831 0f10d7167b44 0c9d9a318826 61c642e3d72e",
 "saju_flounder:compatibility": "ef6a25c28cfc f55145f4ec00 6b5608c90d4b b78ac7299f4b c5bce8f8a3ca",
 "saju_flounder:love": "37e490936edd be6d4c9b0057 779a9e10eebb 7b8e27b79390 45cdf76b8942",
 "saju_flounder:work": "0cd12ef38e03 731dad7c3751 48f86f2ced8d 636a02d3779c f7f756f6a7c3",
 "saju_flounder:money": "cab1b22801e4 34c3cea5f8d9 42fb615f5dcd 4066fe599d94 6c151b1de8ff",
 "saju_flounder:ask": "c99df0bb8cd0 d242cfd4d34e e7acbff5711f e67c863a2b64 61c642e3d72e",
 "saju_tuna:legacy": "0eef0db7dd90 c58225c4497d 965a03fcb550 ab0ef8a1df44 7266f902c6d4",
 "saju_tuna:personal": "124519f41f9c 4779bcc5e9d0 2a75cc6c1609 7ff7aabfedf2 7250e568b2a1",
 "saju_tuna:compatibility": "15384a3ef4e4 3300278a94bb 27d94b5b7e73 2ee4558a4249 14b76362baa5",
 "saju_tuna:timing": "9783c202ec54 206705958e52 4ea63dd8ad06 92fe0346f477 d8509d5c00a7",
 "saju_tuna:love": "51a06a277135 22b6c3818d9c e9279c5b46f8 ec5fc0958cdd 7c9b284576de",
 "saju_tuna:work": "e250df7a1b64 33cc03e84efc 979a140316d8 a84cca5bc498 bcc5a192599a",
 "saju_tuna:money": "dba822ad5ca1 01c53ef21f0d 3fd3f458c848 dbef1793f156 d0bff6c53db5",
 "saju_tuna:ask": "fbded797c388 698dfe29f4a2 20b4ca25e74c b616cdab4814 7250e568b2a1",
 "ziwei_mackerel:legacy": "d57f7a6310e3 1af01af32d9b fd5bbd714113 8dcc94333f84 f0f57311a50f",
 "ziwei_mackerel:personal": "b09aead75e88 dd92258e8faf 33bd58ea04ed 5ebe0d469597 575175147460",
 "ziwei_mackerel:money": "99a39543089a e9ae514639d9 e22c01360fab a85adc8ad5eb a50ae1a95053",
 "ziwei_mackerel:ask": "4814fb775a44 94715b180797 bded8b860a34 03b92c6e7005 279b65fe829c",
 "ziwei_salmon:legacy": "f9152fc93d31 5ceeae28e097 ee4520b2b45c ec7df4cdc33c 541dfb3677ed",
 "ziwei_salmon:personal": "4a698a5cf120 ef4d4f1d421c 6beb408f4780 904ca1c54647 612433ee52aa",
 "ziwei_salmon:money": "e12f9df4e43f 92590b769870 09f47b3b4abc f1f19a2b7409 251643d2a1ce",
 "ziwei_salmon:ask": "2c52e4de4878 ba9fe26f6614 ff35f51da527 084e1fe62458 612433ee52aa",
 "ziwei_flounder:legacy": "344a58d94f7e 529f07b0fec2 6ae651f88b23 fbcfeaea5d1c 84d204935a81",
 "ziwei_flounder:personal": "e43b741c28fa 9ce52f79f91e 835b5c733383 9c8bbda09714 661fc5586a20",
 "ziwei_flounder:money": "7aaa0ac2fb87 48c25c88a582 bafe1e3632da 872f2c6115c9 8578838c07ca",
 "ziwei_flounder:ask": "80a4f9a7c48e fac5debf1ce2 268e89649c48 ae5eb4f87252 661fc5586a20",
 "ziwei_tuna:legacy": "8326dcd3d66e f4435168305f 3a8eb5238d09 2d78e2ec4902 f2f6719e832d",
 "ziwei_tuna:personal": "bda5635d423d 5a59e6b66d38 a6b1a84759de 91306f7db4aa 2b8b8b998443",
 "ziwei_tuna:money": "c481b94511db 16feb5b92915 db9b905ece32 8c4ec6e06fcc 54b63770fa33",
 "ziwei_tuna:ask": "e7bc0bf52e51 bcf0faf97f24 d4f0df2db76e 4c10ad3a49b8 2b8b8b998443",
 "sukuyo_mackerel:legacy": "5b57264b2d2f 39430cdcb4b9 aff77610fb54 44cd533fa901 09cac5e57c93",
 "sukuyo_mackerel:personal": "03c7f6a7165b 238673b5e8f4 103f7a424e3e 075af8d7cba4 60c2f71db056",
 "sukuyo_mackerel:compatibility": "7d84669df0ec e84dfb314c69 adcab0f156b8 3102e3f611fa 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "48ec4b51f111 606e8fb24125 b8eeb9c25614 dde19dd835a2 51c64f67c10e",
 "sukuyo_mackerel:ask": "f0d2e42536f5 3f85303ee25c d342a107635e e7932a93564d c1b4a3466991",
 "sukuyo_salmon:legacy": "8e640965d4ac 7ae852c35f39 f3213fc5bc46 257ffcf7e282 40764a5a48f1",
 "sukuyo_salmon:personal": "ac28ff653e5f 37fc56ee0767 f19dba81c825 07427d4498a6 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "408731b2b641 2bb9cac3befc 5e73aca897ed 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "f8d5f94d112b 4ba7c758f9ae 2a222a3f65fc 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "54b731135a8b e01b132c5494 8779f4306ac8 4e6c68d99dad c7963d52d5c2",
 "sukuyo_flounder:legacy": "e923d1013711 beab64938138 8c29ece2766f a0dfc7e1f08b 41630a4b9f1f",
 "sukuyo_flounder:personal": "4e4db345b53e 96a2a655c38b a51e7e9a83e3 f33eab7ebecd 337c369df170",
 "sukuyo_flounder:compatibility": "310c21ddc549 5335fbf6d30c 10a82e913b91 b6ccb9e17557 3b18417c9ffd",
 "sukuyo_flounder:relationship": "937d9a409a2d c8affa1339dc 7eaef45710f3 315c7cf86ecb b69fd6f8148e",
 "sukuyo_flounder:ask": "bbea488d384c d41307049f12 29ff6cd167dd b473da369c35 337c369df170",
 "sukuyo_tuna:legacy": "75ec611463f1 5c3a2d8f89c1 0fb7e7b790e4 843fd664cc19 bbdcc5db3d05",
 "sukuyo_tuna:personal": "cf9f5be5f840 eccd7a1e8b16 e1af10f17955 618b965e36f2 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "34aafdcc35a6 b044228c241a e03d0da56109 6a7a8df1fce5 cf557e59d9fd",
 "sukuyo_tuna:relationship": "38f36358de8c f55efaab0fa7 fa4678459ade fc915298f689 6371bf908ad4",
 "sukuyo_tuna:ask": "2b77a40b6d0d e0d5907e63e4 a8972abb2b80 0cde3ef1d9ba 933a3eee4cc4",
 "vedic_mackerel:legacy": "a1025b147e16 27fd56db0f59 ae25ac4c62c1 55c917577306 0ab96e7ba746",
 "vedic_mackerel:personal": "65d9950f2575 e45913567a3f 105646d1d888 3d3d31254ccc 3b771e8d6049",
 "vedic_mackerel:ask": "578cac0d3cdd cc20006e8192 f7552c5f7d54 28185f76087d 0f802baef856",
 "vedic_salmon:legacy": "ae4ae7ed41e5 dd58e6332f6a 418671b7b1d9 05a4d938566c d832b44c39d3",
 "vedic_salmon:personal": "e55f9cac05b1 a1de063cabb4 3e27926e9afe 301ce5172836 ac338df4e9f4",
 "vedic_salmon:ask": "4868f52d5c31 5746a88c570d d8ba5439a934 ac57a04942d7 ac338df4e9f4",
 "vedic_flounder:legacy": "56f2a9033bb8 38926d15ff65 33d89bd9c9a4 a0ff1d4a7654 f4c3879ba491",
 "vedic_flounder:personal": "b4b8c7aeb1df 4e57ed0b02e8 ebbb7e03a438 dd91fc06bc8b 7d3b159ecd72",
 "vedic_flounder:ask": "12435a200ba3 2529b2263be0 001b16371e16 9c49454ea629 7d3b159ecd72",
 "vedic_tuna:legacy": "6b8909db8208 06792fdeb0df 5c029b6ef9f7 57059879822b 9a50bce25627",
 "vedic_tuna:personal": "f6e855d0ef36 f95915a85d92 262166bffb40 557ffb81ce59 428ba79f9a99",
 "vedic_tuna:timing": "69658cac3f8d 985e095e5d7c 3d45b4db781a d0496c00fa1c d48d8fcb6c1c",
 "vedic_tuna:ask": "6166e30c3927 d38463339575 c06a4668aff1 abc427074dc1 428ba79f9a99",
 "astrology_mackerel:legacy": "a9a603b44b12 6ab3fe41619c dd7d7b11cd5d a90330b26600 a01f7e3b5491",
 "astrology_mackerel:personal": "e0713fed4b5f c874d6c67be0 12680e87eb0b bc4b7fca3b8a 97192bfd920b",
 "astrology_mackerel:work": "f80b73aeb83f 2f9998d5d393 0beb538500e3 40bf8989cfbf e4a4f0f408bf",
 "astrology_mackerel:ask": "0bdcbf0900a0 059eecbde322 32da235acc0b de61b69108a4 91f01265e663",
 "astrology_salmon:legacy": "df56a6ff7943 6bb2703bdf6c cd4c2411fbec 81ecee88196e 86295650d714",
 "astrology_salmon:personal": "6301b8b41b81 45a084eb8435 aa1848cf2824 431a8ea8e444 e9cd1e6be39e",
 "astrology_salmon:work": "18cb54020f2e d69210a1506b 7f43479710f1 bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "6a6fa8d27028 094dcc15a944 130493ab4337 34d1f06a39b2 e9cd1e6be39e",
 "astrology_flounder:legacy": "57a0568d6cac e707bbc2238d 95e147e47ba4 49133bf42f84 30093a83fd6a",
 "astrology_flounder:personal": "d9c6532874e7 8b549f8c3f4d 7d1d48a39f5b cec5d15239e7 1f6d2b4df594",
 "astrology_flounder:work": "8d46072b688b 659699e0d7a7 5598f622082f c7125b7acde0 39c8e4a84a00",
 "astrology_flounder:ask": "19276242c426 5c9ddc2954ec 8f0912efa0f8 94d8fa48a656 1f6d2b4df594",
 "astrology_tuna:legacy": "a7de72c24d79 3f22d0cf206a f2c53d3276cd a0be649fc735 448e1eeab4e4",
 "astrology_tuna:personal": "f4094260e78e 2bc1dbf56f7a 4d28e182a5cf fbd51b7d9edc 85918032d0e7",
 "astrology_tuna:work": "1fcf562a3790 9cf340805b1f 25bfc21cc25d faad9e29a3e8 22515b7f0512",
 "astrology_tuna:ask": "d88d54b4129f a1f4df00ec68 65db276c4b17 32bab9073df9 85918032d0e7",
 "tarot_mackerel:legacy": "b8697ff4eb9c 17e85ca55943 6e7625d8a448 28fbe3a172a1 6aa275b457cb",
 "tarot_mackerel:choice": "8cd405fb514c 4666d8c6332c 893bca77e0e4 ab63b66c51fc d825334382d4",
 "tarot_mackerel:love": "79173a41dc3e e4aa17cc7cd9 385e3400a1fe ab63b66c51fc 104ab9efa89e",
 "tarot_salmon:legacy": "3f2a60f7e8f5 05ec62de0cf1 46eb0d920083 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "3c052f303c3b 00397646806c a55aa648e6e4 b9803d41684e c5d59e90fbe2",
 "tarot_salmon:love": "1249c3001451 6f1967f0b781 e37c873870b3 e5e4fd3fbab7 3b0dfe5c23de",
 "tarot_flounder:legacy": "ac6ed92e4d6e d353a285449e a2b1a54b6ced 77f6e0cc6fa7 200019185775",
 "tarot_flounder:choice": "e6b8c38cdfb3 80cf7a5f5068 2a5fdb9b5e30 eec2494bf5b4 0a393f5c5c47",
 "tarot_flounder:love": "d9201a3f70aa ba249164aaab 3d702adb5838 4c68fbd20b83 3f3e038b6dd8",
 "tarot_tuna:legacy": "658c78b450f7 5561a9cefde9 67103faecef6 171c651f45cc cdfa81f3a8a1",
 "tarot_tuna:choice": "aeff082f2619 458e2e295c22 a820961c6949 49c5a018bac0 818105ef441b",
 "tarot_tuna:love": "d055a34b971f 73ce7a916904 ab631791b614 b37bc5f4da7d f90ac169ab5e",
 "fusion_saju_ziwei:legacy": "8e41fdc6c761 0cc836a9e1d9 7f934fafa108 118e34b767b7 0d9429c32910",
 "fusion_saju_ziwei:personal": "ab5419840ee2 7f07966cdf49 2538ec4b3640 8bb94d84f4c0 bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "370220dbd3f2 009343616c35 692a4990bc8d 5f3897a28626 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "679e697b6d40 e765ae288d8b d36e000bdfc8 1f7f1dc7c6aa 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "577c1db518e0 2ca6af6ee5aa d60beb8aa831 f57da6eadea2 70b570d09783",
 "fusion_sukuyo_vedic:ask": "549e7d12faff 1bf309f32ab7 3d54e6918967 6c7f4f7e2358 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "7848ac8d3e6f 1712169feaf5 092cbb90968b 75b386e49681 032738bbd603",
 "fusion_astrology_tarot:personal": "c8752f987f6e be1bfa7c1344 41d4e33f29c7 bc93d5d32e45 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "2a5956d4cafa ecec10e11d97 5f3f43b5fd99 4467b7a6c875 032738bbd603",
 "fusion_all:legacy": "91b732886404 daeacb81318c e3348f03fcf5 794e866c7a30 6e8d23af93ea",
 "fusion_all:personal": "16c00a57abfb befc67b4cd5c 1e694e36132f 2bca232332b3 d3753452ec82",
 "fusion_all:ask": "98de5f4619fa a8d71da85be4 9ed78cca0c30 b73798444a0a 6e8d23af93ea",
 "saju_salmon@timeUnknown": "08d2ebb9e45b da49fb800328 15f8f58f4b76 f4b82284858e -",
 "saju_salmon@timeUnknown:ask": "f50729a416df f39798ac4f07 094e9329c2e5 76bed90de67e -",
 "ziwei_salmon@noPlace": "4f372ab54262 897a8c091c28 6beb408f4780 904ca1c54647 -",
 "ziwei_salmon@noPlace:ask": "71a4244dee5b 860f33fcd290 ff35f51da527 084e1fe62458 -",
 "saju_mackerel@spirit": "9fed71573999 f534870eb198 6c2ebf3b2e24 c3b521dd1883 -"
};

test('approved v7 paths pin new purchase contracts while legacy and fusion remain invariant',{timeout:600000},async()=>{
  const actual={};
  for(const p of m.products)for(const k of kindsFor(p))actual[`${p.id}:${k?.id||'legacy'}`]=row(await prepared(p.id,k?.id),topicManifests(p,k));
  for(const [key,extra] of Object.entries(variants)){
    const [productId]=key.split('@');
    actual[key]=row(await prepared(productId,extra.mode?undefined:'personal',extra),'-');
    if(!extra.mode)actual[key+':ask']=row(await prepared(productId,'ask',extra),'-');
  }
  if(process.env.YEONGNYANGI_INVARIANCE_PRINT==='1')console.log(JSON.stringify(actual,null,1));
  // Fail closed: a new product or kind without a pinned row is not silently accepted.
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(EXPECTED).sort());
  for(const key of Object.keys(EXPECTED))assert.equal(actual[key],EXPECTED[key],`${key}: id prepare requests validated manifests changed; refresh only for an intended change with YEONGNYANGI_INVARIANCE_PRINT=1`);
});
