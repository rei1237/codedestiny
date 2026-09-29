import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// Approved v7 rollout pins new eligible purchase contracts. Legacy, fusion and
// ineligible tier rows retain engine, validated output, and manifest hashes.
// Locale expansion intentionally updates only ordinary snapshot and LLM request hashes;
// excluded symbolic modes retain their full original contract.
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

// Four-system counseling intentionally changes only requests (2026-09-29). Tarot choice/love rows pin
// the new v2 purchase contract; no-kind legacy rows remain pinned to the historical contract.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED={
 "saju_mackerel:legacy": "19e2143ae891 7e03c239a4a7 9be01eedcffb 851da5b221c0 8b73190c4eb8",
 "saju_mackerel:personal": "2b23e51ded9f f08e82346ff8 bb5c6d24c235 1aebd5c72506 73f644833274",
 "saju_mackerel:compatibility": "5092e14d00c0 f83888f3c823 ab944f123131 bc0afe7b8e34 b4feb0e2060a",
 "saju_mackerel:love": "3b76aa003732 bd5427a9f890 4db1fa1b17c2 92750dc70bc6 e387640606d4",
 "saju_mackerel:work": "955f508ab668 ab099f48879d 363b1630b39e 2128afc784de 1dfa9237efd8",
 "saju_mackerel:money": "cdbe95c856e1 67e4f7e4effb 2e890129674f 51d4c9bc0be0 054738d4280d",
 "saju_mackerel:ask": "f5ee6960f26a a49502feef03 4ee553f153cb 5e464a47c141 ac4eb5435ab6",
 "saju_salmon:legacy": "57913d88b470 13b03890a965 2c48642b3d6a 6b661ff4434a 08f01b92e660",
 "saju_salmon:personal": "37f20270d48d 5d6b66e828a9 e6410b5116f9 debb2dc65c35 a9108f244a70",
 "saju_salmon:compatibility": "10f81d9a5876 8f0236d7b1d6 0a55a90d490c eb7db84b3fbe de55f005535f",
 "saju_salmon:love": "145a385afb0f 1508a5a8a334 9ca5c12156df ef1007d4876d 6913aca975af",
 "saju_salmon:work": "6089a129ebde eab27378ecae 2dde2742ddcb dc13148a2077 fa41008e9044",
 "saju_salmon:money": "52beec216bf4 c6a2d9db3035 11ff65e9379a e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "de3672b4c9ac 9e54793403cc 6f011c29583f d3bf8b061ef7 a9108f244a70",
 "saju_flounder:legacy": "6a7e90822519 63f440b65e46 30168dc6e411 7d92f793f98f 6d0df7a238c4",
 "saju_flounder:personal": "087cf60e017e 16fec3e41b90 5f9304a0578c 0c9d9a318826 61c642e3d72e",
 "saju_flounder:compatibility": "019a1b69a70e 1b8e37cf6a01 91c236afab98 b78ac7299f4b c5bce8f8a3ca",
 "saju_flounder:love": "640ad6aec8b9 4d41c5bd71b5 89bf2d4a5684 7b8e27b79390 45cdf76b8942",
 "saju_flounder:work": "a5290e7572e1 b29e42d264b1 61cb70721350 636a02d3779c f7f756f6a7c3",
 "saju_flounder:money": "40a15f10ec07 52c4d36acf61 7c2bd0ec536b 4066fe599d94 6c151b1de8ff",
 "saju_flounder:ask": "affa5a2a327f 6440638c4418 683b01b6168c e67c863a2b64 61c642e3d72e",
 "saju_tuna:legacy": "5a9c9ed12cc2 eadb2f1de011 d8a86eec1e57 ab0ef8a1df44 7266f902c6d4",
 "saju_tuna:personal": "fc1157b67a96 3f920b34e9b4 d673bc13f4ce 7ff7aabfedf2 7250e568b2a1",
 "saju_tuna:compatibility": "a7be73c8068b ac744dce4ce8 c060d967bcfc 2ee4558a4249 14b76362baa5",
 "saju_tuna:timing": "5fe47eaf982b 1b7ac811d066 a7d13cdde337 92fe0346f477 d8509d5c00a7",
 "saju_tuna:love": "77d2db5730bb 572bbb7b6d87 e04829cb5c37 ec5fc0958cdd 7c9b284576de",
 "saju_tuna:work": "07b3fa40a681 60c23619830e 46899cc97363 a84cca5bc498 bcc5a192599a",
 "saju_tuna:money": "41d558941795 c1d75e00d88c c686e65233cb dbef1793f156 d0bff6c53db5",
 "saju_tuna:ask": "933f0e0f8885 d32ebe755247 ca5270d92213 b616cdab4814 7250e568b2a1",
 "ziwei_mackerel:legacy": "d57f7a6310e3 af3e0176221d 3005ff9b83a2 8dcc94333f84 f0f57311a50f",
 "ziwei_mackerel:personal": "b09aead75e88 40f405f03ad7 ad208604d70a 5ebe0d469597 575175147460",
 "ziwei_mackerel:money": "99a39543089a 98a1df4f387c d9d1ce5f2004 a85adc8ad5eb a50ae1a95053",
 "ziwei_mackerel:ask": "4814fb775a44 f30d8378e02f 2644e3b7b363 03b92c6e7005 279b65fe829c",
 "ziwei_salmon:legacy": "f9152fc93d31 425ceb80b89b f59b6b00e25f ec7df4cdc33c 541dfb3677ed",
 "ziwei_salmon:personal": "4a698a5cf120 fd9a00db8f9d c8e6063a0618 904ca1c54647 612433ee52aa",
 "ziwei_salmon:money": "e12f9df4e43f f9d90c4dc888 bd2bc47aaf6c f1f19a2b7409 251643d2a1ce",
 "ziwei_salmon:ask": "2c52e4de4878 b2683284f49d cafc44766229 084e1fe62458 612433ee52aa",
 "ziwei_flounder:legacy": "344a58d94f7e 6b8dfd98eb92 86185063643f fbcfeaea5d1c 84d204935a81",
 "ziwei_flounder:personal": "e43b741c28fa 6b92d5267eeb 4b3bbdb7df88 9c8bbda09714 661fc5586a20",
 "ziwei_flounder:money": "7aaa0ac2fb87 c86513d355d1 6ce69ff22b54 872f2c6115c9 8578838c07ca",
 "ziwei_flounder:ask": "80a4f9a7c48e 809ccf4a06f6 818f100d86db ae5eb4f87252 661fc5586a20",
 "ziwei_tuna:legacy": "8326dcd3d66e a58b9f7258bf 5b2b59f01fe2 2d78e2ec4902 f2f6719e832d",
 "ziwei_tuna:personal": "bda5635d423d a47c6ebbb5d9 7466e75b621a 91306f7db4aa 2b8b8b998443",
 "ziwei_tuna:money": "c481b94511db 29dc85c59b3c f3f7bb354afc 8c4ec6e06fcc 54b63770fa33",
 "ziwei_tuna:ask": "e7bc0bf52e51 947843cce8eb 6b183982a82f 4c10ad3a49b8 2b8b8b998443",
 "sukuyo_mackerel:legacy": "5b57264b2d2f eda8152b3104 c9f936472e16 44cd533fa901 09cac5e57c93",
 "sukuyo_mackerel:personal": "03c7f6a7165b 04509b67596a 2d74915058c6 075af8d7cba4 60c2f71db056",
 "sukuyo_mackerel:compatibility": "7d84669df0ec 518f423972a5 d046305a4b1e 3102e3f611fa 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "48ec4b51f111 2365bc9cd5af 63598728d04d dde19dd835a2 51c64f67c10e",
 "sukuyo_mackerel:ask": "f0d2e42536f5 417aa16adab0 d8a859c9c2ee e7932a93564d c1b4a3466991",
 "sukuyo_salmon:legacy": "8e640965d4ac 422ba22f6589 5e09af483167 257ffcf7e282 40764a5a48f1",
 "sukuyo_salmon:personal": "ac28ff653e5f 1da41cb7cdc0 60bab7f47d9c 07427d4498a6 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "408731b2b641 2d086c3166ae 48ad4f6754fc 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "f8d5f94d112b ca6c60c1a78a d712af2cea3e 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "54b731135a8b fe6745e0c139 c8f942c33997 4e6c68d99dad c7963d52d5c2",
 "sukuyo_flounder:legacy": "e923d1013711 ac4f9eafdae8 167a807cb148 a0dfc7e1f08b 41630a4b9f1f",
 "sukuyo_flounder:personal": "4e4db345b53e c8a853e5f964 c37932734a19 f33eab7ebecd 337c369df170",
 "sukuyo_flounder:compatibility": "310c21ddc549 beddcc7b7acb 9d9b22c1472b b6ccb9e17557 3b18417c9ffd",
 "sukuyo_flounder:relationship": "937d9a409a2d c61e3a6126f1 7e86fa6f40b3 315c7cf86ecb b69fd6f8148e",
 "sukuyo_flounder:ask": "bbea488d384c fa2b36855910 de446a2eb20d b473da369c35 337c369df170",
 "sukuyo_tuna:legacy": "75ec611463f1 4804ab3dd48e 774ce3e2a4e1 843fd664cc19 bbdcc5db3d05",
 "sukuyo_tuna:personal": "cf9f5be5f840 bbca4f31efe4 a99a34726971 618b965e36f2 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "34aafdcc35a6 832aa4c78fd4 3e4b489120a1 6a7a8df1fce5 cf557e59d9fd",
 "sukuyo_tuna:relationship": "38f36358de8c 309747fcfc27 578104181819 fc915298f689 6371bf908ad4",
 "sukuyo_tuna:ask": "2b77a40b6d0d 671abf99d927 117d8507dcd6 0cde3ef1d9ba 933a3eee4cc4",
 "vedic_mackerel:legacy": "a1025b147e16 a564e4bb71eb dc60f2289ecc 55c917577306 0ab96e7ba746",
 "vedic_mackerel:personal": "65d9950f2575 cbdfd5462a5b 99181234b033 3d3d31254ccc 3b771e8d6049",
 "vedic_mackerel:ask": "578cac0d3cdd 7d4a5b31a229 9b6448ac5ae9 28185f76087d 0f802baef856",
 "vedic_salmon:legacy": "ae4ae7ed41e5 4490b90f4eba 43dd0c004acf 05a4d938566c d832b44c39d3",
 "vedic_salmon:personal": "e55f9cac05b1 384b4e432ba9 da5c1cee3563 301ce5172836 ac338df4e9f4",
 "vedic_salmon:ask": "4868f52d5c31 a1d38e2088c3 a153089a2ac9 ac57a04942d7 ac338df4e9f4",
 "vedic_flounder:legacy": "56f2a9033bb8 a6059fceedf9 98ddb1f65712 a0ff1d4a7654 f4c3879ba491",
 "vedic_flounder:personal": "b4b8c7aeb1df 4fda782bff66 570db9df5808 dd91fc06bc8b 7d3b159ecd72",
 "vedic_flounder:ask": "12435a200ba3 68bef68069c2 f38be11eeab5 9c49454ea629 7d3b159ecd72",
 "vedic_tuna:legacy": "6b8909db8208 942b5ea6f6ee 2d2a9d0eb80b 57059879822b 9a50bce25627",
 "vedic_tuna:personal": "f6e855d0ef36 de5a510017d2 abf0560da8dd 557ffb81ce59 428ba79f9a99",
 "vedic_tuna:timing": "69658cac3f8d 49fa74760eb8 ca09e58eaff2 d0496c00fa1c d48d8fcb6c1c",
 "vedic_tuna:ask": "6166e30c3927 b505b81ec309 f9ad9914440f abc427074dc1 428ba79f9a99",
 "astrology_mackerel:legacy": "a9a603b44b12 4765880d73b4 5536eeff2d55 a90330b26600 a01f7e3b5491",
 "astrology_mackerel:personal": "e0713fed4b5f 6a2fb82f1d97 9dfaf8894338 bc4b7fca3b8a 97192bfd920b",
 "astrology_mackerel:work": "f80b73aeb83f 784553e20b5f 9a2c31717f7f 40bf8989cfbf e4a4f0f408bf",
 "astrology_mackerel:ask": "0bdcbf0900a0 90eef4ad1109 ce1593a60d9b de61b69108a4 91f01265e663",
 "astrology_salmon:legacy": "df56a6ff7943 4baa495bf908 061b6c804f26 81ecee88196e 86295650d714",
 "astrology_salmon:personal": "6301b8b41b81 0532d8aac057 2ea93960cf26 431a8ea8e444 e9cd1e6be39e",
 "astrology_salmon:work": "18cb54020f2e 2e15816efaaf c325ee26c0af bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "6a6fa8d27028 8ff5aaf9ca27 a73a6083a5b2 34d1f06a39b2 e9cd1e6be39e",
 "astrology_flounder:legacy": "57a0568d6cac 632eec66866e 1661aeb8e417 49133bf42f84 30093a83fd6a",
 "astrology_flounder:personal": "d9c6532874e7 5579b3e7b0fe c743b60a2df3 cec5d15239e7 1f6d2b4df594",
 "astrology_flounder:work": "8d46072b688b a2ee322adf35 20659f922021 c7125b7acde0 39c8e4a84a00",
 "astrology_flounder:ask": "19276242c426 03f6bc48da7d 4b4a2cb369df 94d8fa48a656 1f6d2b4df594",
 "astrology_tuna:legacy": "a7de72c24d79 f9ed2287071f ae5a64500073 a0be649fc735 448e1eeab4e4",
 "astrology_tuna:personal": "f4094260e78e 3f8100470a20 3896dc97b1de fbd51b7d9edc 85918032d0e7",
 "astrology_tuna:work": "1fcf562a3790 3d8384ffdfdb 198a8a664d9a faad9e29a3e8 22515b7f0512",
 "astrology_tuna:ask": "d88d54b4129f 58f0870bcd27 8aaad3279135 32bab9073df9 85918032d0e7",
 "tarot_mackerel:legacy": "b8697ff4eb9c b8650f9fad9a 921019f68a12 28fbe3a172a1 6aa275b457cb",
 "tarot_mackerel:choice": "d9101ea94d78 ff245b6e92b3 edf8ba0f9e8c 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "40679d816dbe 8a575aead6f3 cb56e5b50859 94dcac1bb98c ec43dbbb0b03",
 "tarot_salmon:legacy": "3f2a60f7e8f5 85991733f183 f77e43b3a4e5 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "f3cfd282e806 827a71ba2368 de9b732135a4 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "98862054f11b 9e90fc175d4c d8146aa0095d 92bb7cdeb91c 827911f6ce9f",
 "tarot_flounder:legacy": "ac6ed92e4d6e 34e8c738c2ca 337cb15334c5 77f6e0cc6fa7 200019185775",
 "tarot_flounder:choice": "1172412da761 495e638f048e e62aec216932 358f2b973686 157bdc132835",
 "tarot_flounder:love": "05b2e55b02c9 df0ba03bc5cc 123b8805b104 200ad771bfc7 cbc2d0bac5dd",
 "tarot_tuna:legacy": "658c78b450f7 9ffb292ae10b 950ae5caadf2 171c651f45cc cdfa81f3a8a1",
 "tarot_tuna:choice": "9a082858af6b 02322322580f 841857741f95 20fe26558894 e4dde4d5d80d",
 "tarot_tuna:love": "d906d40792d3 a22b487fb49b e6160c3d1fd0 ce972e6fbea3 f40bb48c0c1e",
 "fusion_saju_ziwei:legacy": "f63b0a1d754d 71cd1db8a40b 2b264746ffb1 118e34b767b7 0d9429c32910",
 "fusion_saju_ziwei:personal": "2a885e35287e 431ec3b4a856 c0272c9aa484 8bb94d84f4c0 bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "ecc16f5499f1 b69bc4e6f46c c70ed2c13dc5 5f3897a28626 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "679e697b6d40 07e76d3931bc 6aef10af0d8f 1f7f1dc7c6aa 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "577c1db518e0 4cde8d4e3085 6e874bda4f96 f57da6eadea2 70b570d09783",
 "fusion_sukuyo_vedic:ask": "549e7d12faff d9519777688e eb2eda20019d 6c7f4f7e2358 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "7848ac8d3e6f a66bf139b689 5f9b87839c6b 75b386e49681 032738bbd603",
 "fusion_astrology_tarot:personal": "c8752f987f6e 11b6579dd0c7 995b3cc22dd8 bc93d5d32e45 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "2a5956d4cafa 90e75a904fe6 0dc1d6c81087 4467b7a6c875 032738bbd603",
 "fusion_all:legacy": "2b3008241c3e a4a9d7b06178 9f688ca01ac3 794e866c7a30 6e8d23af93ea",
 "fusion_all:personal": "51eaf0d7ddfb 859ae4f54526 d51a6e6b21a7 2bca232332b3 d3753452ec82",
 "fusion_all:ask": "58bdeb24874b 8ce66b3f9ba7 e3507659d3c9 b73798444a0a 6e8d23af93ea",
 "saju_salmon@timeUnknown": "71627c589411 a84286b563d2 615328138b52 f4b82284858e -",
 "saju_salmon@timeUnknown:ask": "b6114fe5862e 77a2eef5c290 60d66daf6d77 76bed90de67e -",
 "ziwei_salmon@noPlace": "4f372ab54262 09deccd4f0f6 c8e6063a0618 904ca1c54647 -",
 "ziwei_salmon@noPlace:ask": "71a4244dee5b c0ce59c5f51c cafc44766229 084e1fe62458 -",
 "saju_mackerel@spirit": "b3266c0a3126 6c8a493b05d7 42269ce1a300 c3b521dd1883 -"
};

test('approved versioned paths pin new purchases while legacy and fusion remain invariant',{timeout:600000},async()=>{
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
