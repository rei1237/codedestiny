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
// Post-pilot native-only preparation omits the separate hub for new single-system legacy-client/ask requests;
// 42 prepare and 25 mock-body hashes change, while all IDs/catalog manifests and fusion preparations stay fixed.
// The evidence-language writing contract changes all 123 new concise request hashes.
// The worker 천요 fix (全書 丑起正月) changes the 24 Ziwei-bearing request hashes; ids, prepares, validations and manifests stay.
// Ziwei now charts the longitude+DST corrected birth clock (lib/ziwei-birth-clock.js) with a new chart note, so the same 24 request hashes change again; ids, prepares, validations and manifests stay.
// saju.seasonalBalance (조후) joined the saju anchor refs, so the 8 saju v7 rows change prepare, requests and manifests; ids and validations stay.
// All calls are mocks: providers are stubbed, ask analysis falls back to its rules, time and randomness are fixed.
// An intended change outside v7 wiring (engine, prompt, catalog) refreshes the table: YEONGNYANGI_INVARIANCE_PRINT=1.
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__invariance={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>({updatedAt:null,birth:{year:filter.profileId==='partner'?1994:1997,month:2,day:10,hour:12,minute:0,timeUnknown:filter.profileId==='notime',calType:'solar'},gender:'F',location:filter.profileId==='noplace'?{}:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup in this fixture');};export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__invariance.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{const row=globalThis.__invariance.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
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
    if(chapter.key==='prevention')assert.ok(result,`prevention must deliver a valid mock chapter: ${snapshot.product.id}: ${validated.at(-1)}`);
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
// Combined with main: saju conditional-basis v1.1 and corrected strength/useful-god
// facts also update saju-containing and cross-daily request payloads.
// Request IDs, prepared concise contracts, validated mock prose and original
// catalog manifests are separately checked against the pre-merge concise table.
// Ziwei palace strength (2026-10-01): consultation quality v2 and the paid-scope text no longer
// ban 삼방사정, so request hashes change for single-system and Ziwei fusion rows. Ziwei salmon/flounder
// v7 manifests drop 삼방사정 from mustNotCover (prepare and manifest columns). IDs and validated prose stay fixed.
// Persona speech level (2026-10-02): the Korean reading contract leaves 존댓말/반말 to the counselor persona and
// Yeongnyangi speaks 반말, so all 123 request hashes change. IDs, preparations, validated prose and manifests stay fixed.
// Blunter Yeongnyangi (2026-10-02, second pass): section openings, hedges and closings tightened in the persona only;
// again every request hash changes and the other four columns stay fixed.
// Ask period consultation (2026-10-02): only the '무엇이든 물어보기' kind resolves the question's
// week/month/year into the stored period (resolver ask-period-v1) and gets the v3 first-chapter prompt,
// so prepare and request hashes change for :ask rows only. IDs, validated prose and manifests stay fixed.
// Persona register directive (2026-10-02): the reading contract now uses the shared builder's persona register
// (the same text the provider appends with outputRegister:'persona'), so all 123 request hashes change; other columns fixed.
// Saju derived signals (2026-10-04): elementProfile·tenGodProfile·movementSignals·healthBasis join the saju facts, the
// v7 anchor/health/timing chapters and the mackerel self chapter, and their four names join the shared evidence-name
// vocabulary every request carries. Saju rows change prepare/requests/validated/manifests (work·money and saju fusions
// prepare/requests), every other row changes requests only, and all IDs stay fixed.
// Saju v7 chapters (2026-10-04): romanceTiming (spouse star, 도화·홍염, day-branch links by year) joins the saju facts
// and the shared vocabulary; elementProfile splits balance from traits; tuna gains elements·loveLuck·marriageLuck·movement.
// Saju personal/ask change prepare/requests/validated/manifests, other saju rows prepare/requests, the rest requests only.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED = {
 "saju_mackerel:legacy": "19e2143ae891 9a8a353cbc1d ae944dbfa5b2 523f22b7e9d2 42f2c5c373fe",
 "saju_mackerel:personal": "2b23e51ded9f 132a3f583aaf ce611e299068 576a177dd119 8c9adb9e6d01",
 "saju_mackerel:compatibility": "5092e14d00c0 1df03aac9187 8fb8708db57b d850d63e7b8d 163444337fa9",
 "saju_mackerel:love": "3b76aa003732 dfb5bb38d623 9040d85a611c bd61958026a4 3e239ee154a7",
 "saju_mackerel:work": "955f508ab668 a0af95dd59ac fa3c4e03c7ec 5dfc73127678 1dfa9237efd8",
 "saju_mackerel:money": "cdbe95c856e1 0d5bef3c07c4 8664625ef846 c4202c21b93e 054738d4280d",
 "saju_mackerel:ask": "f5ee6960f26a 1043cc5d3993 dd61474ebc30 c518b7fcbe38 b9cb87c20d32",
 "saju_salmon:legacy": "57913d88b470 4c5e05ad0dce 892effdf0dce 6e55eca0cd90 5a931b290957",
 "saju_salmon:personal": "37f20270d48d f642df0faa53 1c463cb76d69 ee73364e5e65 459c1c844aea",
 "saju_salmon:compatibility": "10f81d9a5876 fa6f6051d113 8381faa9d0c9 896fd690c8f2 5ee9aa8dd2ae",
 "saju_salmon:love": "145a385afb0f 9d0be6beaf1e 8a7778dd4dd4 a0acd49a317c 8fe7b01b938d",
 "saju_salmon:work": "6089a129ebde 904af6bee287 3b809ed5a71a dc13148a2077 fa41008e9044",
 "saju_salmon:money": "52beec216bf4 812d0d9b1f2f 66b57c69b8fe e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "de3672b4c9ac e19313ad534c 66310b846cbe d1ffd9baa627 459c1c844aea",
 "saju_flounder:legacy": "55ae6a8298d8 e2ca01baf801 45dfe41335e6 f0eb4c1c53a6 d0a1fba4b309",
 "saju_flounder:personal": "d287003d59c7 c1047fbce907 6e35997dccf7 a056d8c0af1d 9092b43d5b23",
 "saju_flounder:compatibility": "3f437d5180e7 0394a23c5ba5 a4a44b0b4855 506896de9240 3e8926b65705",
 "saju_flounder:love": "18057694882d 43de4ea0175e d8baf32c3a80 f97f4074da08 703f985f1df5",
 "saju_flounder:work": "901c2cbf9d64 e5475af23f27 ed3c1ce45a28 6b4e32d9f821 686fbc52450a",
 "saju_flounder:money": "e75aad0e06b3 e4e18bef7569 4f7030e30890 5af2ce216b02 6c151b1de8ff",
 "saju_flounder:ask": "b090e65248a1 095913a1dd44 072ff4116222 ea126435b7b9 9092b43d5b23",
 "saju_tuna:legacy": "c86fa6771aa8 d2982dbb782d 2caf52776186 ef60db5db116 a19a748c8350",
 "saju_tuna:personal": "57914638d670 e56b27809061 83095c0e3686 525d3bdc1115 004fdfa8ed6a",
 "saju_tuna:compatibility": "b501d4ee1668 750fc40c1671 e1878acf3a34 a38016580b21 6e327a0ca069",
 "saju_tuna:timing": "33b61ed630d4 5f93585f748f 709e37fa8f30 77f281344d05 410bef112275",
 "saju_tuna:love": "ca10e3762aa3 dcbe070eb157 69832fb3de33 0757839598d6 135beac68a67",
 "saju_tuna:work": "0b472b29c308 0334f20aa85c eb3d24e4f7a0 1103bf8ee618 f96ef8e37722",
 "saju_tuna:money": "3864285d3e0a 1080a5176ce0 0035bde71daa eddea4a1731b d0bff6c53db5",
 "saju_tuna:ask": "175aa391cc59 0d460131d3d5 5affe228bd89 53de150652b7 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "d57f7a6310e3 abdcf7f8a5b6 6b46446d2938 e4b382fc07ca f0f57311a50f",
 "ziwei_mackerel:personal": "b09aead75e88 ab479c3d1a62 84c72f5f5d07 613a593bc74c 575175147460",
 "ziwei_mackerel:money": "99a39543089a 3a77bd3bad32 5b8271df414b 2d577b0f5465 a50ae1a95053",
 "ziwei_mackerel:ask": "4814fb775a44 ea29376a18b2 20d8c5c33191 7e2c25d4dae9 279b65fe829c",
 "ziwei_salmon:legacy": "f9152fc93d31 31e858e62bda df78d3e059e7 bcfa0ba6906e 541dfb3677ed",
 "ziwei_salmon:personal": "4a698a5cf120 d18c0a715960 52a554a5179e b43270c880d1 f90adf448d6a",
 "ziwei_salmon:money": "e12f9df4e43f b344981e7f3c 0ce9ded1e0fb f1f19a2b7409 251643d2a1ce",
 "ziwei_salmon:ask": "2c52e4de4878 0e67ef586584 fe54afbf775e d3efc6ef4910 f90adf448d6a",
 "ziwei_flounder:legacy": "8a6ea911f8e1 a0a2da42deaa 386a8667d40d 109192cf4aac 84d204935a81",
 "ziwei_flounder:personal": "979c73dabe33 66e222df402c b92eb19bdeef cb91862b4be6 e961ce567304",
 "ziwei_flounder:money": "1253bc270272 31165e69b460 fbe05515b002 284ec3b8cde9 8578838c07ca",
 "ziwei_flounder:ask": "473aca21e162 ff7b495e1784 17b10f04c015 7509deb061d7 e961ce567304",
 "ziwei_tuna:legacy": "996ef1225e9c d2145c834251 45c30dd99dfb 91a2d37f2e61 f2f6719e832d",
 "ziwei_tuna:personal": "a817f1028734 c8a5495e0fed ecb232528478 c286f4903fe0 2b8b8b998443",
 "ziwei_tuna:money": "e435810f059b 7810bbe598a1 5e73931e29a7 6310635cf1f4 54b63770fa33",
 "ziwei_tuna:ask": "c7a6d3ef9c71 53cce3834842 4855fdf05b70 c3e41d52a1d0 2b8b8b998443",
 "sukuyo_mackerel:legacy": "5b57264b2d2f 184ab6ab826c a714b7f89b99 0fcf0d66b984 09cac5e57c93",
 "sukuyo_mackerel:personal": "03c7f6a7165b d16b2a93dbc3 0d286cb09ed9 49345666bd18 60c2f71db056",
 "sukuyo_mackerel:compatibility": "7d84669df0ec 52090db8f04e feb5eed69588 2f84d874b2bd 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "48ec4b51f111 cdfb1377dcfa 878a6b40990f 981eb9605406 51c64f67c10e",
 "sukuyo_mackerel:ask": "f0d2e42536f5 1b1e86f61595 afbaa0d52ed6 d2b0d069839c c1b4a3466991",
 "sukuyo_salmon:legacy": "8e640965d4ac 8abfa6aee560 c2b8eb71e955 c3ae5e8f2735 40764a5a48f1",
 "sukuyo_salmon:personal": "ac28ff653e5f 07d4ca895954 602562212870 9814fc14064a c7963d52d5c2",
 "sukuyo_salmon:compatibility": "408731b2b641 bd06d4f10653 8ac97e1e6261 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "f8d5f94d112b aeb485a7db8b fbe295c58dce 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "54b731135a8b 73ca30809948 4d34edbde496 ab1985ef4e08 c7963d52d5c2",
 "sukuyo_flounder:legacy": "0f44842202b7 8f6a351b6519 da0ac5b61b9f 5ccb039d632a 41630a4b9f1f",
 "sukuyo_flounder:personal": "704bf89b0e9d b6e1671ed1fb fbf7b54b8439 eeae4d38448b 337c369df170",
 "sukuyo_flounder:compatibility": "818932a52708 714eb16884f5 ee2cbc728466 2304eee6e9a6 3b18417c9ffd",
 "sukuyo_flounder:relationship": "b5cd7a8f1501 a5cc456b07cf debbdf008a8c 6d1a77ac89dc b69fd6f8148e",
 "sukuyo_flounder:ask": "5a1025dd6a4c 961e7386ed13 2ff878b5adcf 7c11adb2741e 337c369df170",
 "sukuyo_tuna:legacy": "6b0d169cc015 f933d659800f 2eb912e33073 ef0aef6230ad bbdcc5db3d05",
 "sukuyo_tuna:personal": "1b034ca5a91a c396e120a7b9 17222eaea84f 844483faf4c1 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "611b89dc2a1d 4514da9a896d c2858cf42fb6 7be4b42fb211 cf557e59d9fd",
 "sukuyo_tuna:relationship": "f9f495f58621 d7c6947e8925 04e48a1a69f8 08e96b3c39dc 6371bf908ad4",
 "sukuyo_tuna:ask": "5dff4de33afc ed58b9a4e802 d4bc536b9abe 560109187680 933a3eee4cc4",
 "vedic_mackerel:legacy": "a1025b147e16 f31c5b29b77a 31735b5973a8 157f8ec92c43 0ab96e7ba746",
 "vedic_mackerel:personal": "65d9950f2575 beb666926420 ba21f278d1b1 d56983683d0a 3b771e8d6049",
 "vedic_mackerel:ask": "578cac0d3cdd a719ef45dafd c2f6b6c63149 9f608f719a53 0f802baef856",
 "vedic_salmon:legacy": "ae4ae7ed41e5 85519216a266 616ebd3444a9 a3733622132c d832b44c39d3",
 "vedic_salmon:personal": "e55f9cac05b1 e0f22f09ce28 3f6cc523c9b0 236c16a3eb0c ac338df4e9f4",
 "vedic_salmon:ask": "4868f52d5c31 6c5070abd66a 073bf3c5dfdb 18422a0edb74 ac338df4e9f4",
 "vedic_flounder:legacy": "dc377cefb135 265c81e0c249 b4e89a133d80 a5b37804b873 f4c3879ba491",
 "vedic_flounder:personal": "7f52682910de ce9bd1b45a22 ad8cb2384e8f 6c8eaef5a605 7d3b159ecd72",
 "vedic_flounder:ask": "cacbb035bb94 482637cceef7 6a6425cba059 e9be220bc41f 7d3b159ecd72",
 "vedic_tuna:legacy": "12ca77e8cd03 0fd0d909be92 e2a17d8bfc63 6f49931d037d 9a50bce25627",
 "vedic_tuna:personal": "4860a9e84a54 5aa6b51901c5 381e030563a8 5441a5e47555 428ba79f9a99",
 "vedic_tuna:timing": "594534a5527b 42b8dc585424 f6a91c1a46eb e27b3c1646a7 d48d8fcb6c1c",
 "vedic_tuna:ask": "a1473f63b5b2 cf451427e75f a10ba994d966 ed27412b3ee6 428ba79f9a99",
 "astrology_mackerel:legacy": "a9a603b44b12 11ac47bfeac6 e9aeed0066ad 0ab26bf80752 a01f7e3b5491",
 "astrology_mackerel:personal": "e0713fed4b5f d4af1c357178 9a79c39971c9 21f42be82895 97192bfd920b",
 "astrology_mackerel:work": "f80b73aeb83f a61dc986347a 332f32bfc75d 8f712fbe7c2a e4a4f0f408bf",
 "astrology_mackerel:ask": "0bdcbf0900a0 a11717e3fd97 bab857d65751 df6b6ff71777 91f01265e663",
 "astrology_salmon:legacy": "df56a6ff7943 25603cf66f7d d650b9dd2f52 d8dcf8655d16 86295650d714",
 "astrology_salmon:personal": "6301b8b41b81 55b49d66d21e aaab4ade077f 468c7f60a9de e9cd1e6be39e",
 "astrology_salmon:work": "18cb54020f2e a8fde25727d8 1ebdf7064a02 bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "6a6fa8d27028 6f2e9d3e787b 4e260519edda 725e7c0786ae e9cd1e6be39e",
 "astrology_flounder:legacy": "4a56fa53a7e3 8aec54eeb82b d73c2efc384d 4543b7aa3ff3 30093a83fd6a",
 "astrology_flounder:personal": "f3d486aae66d cdac3adfc028 35dc4e753405 9807b31cf2c6 1f6d2b4df594",
 "astrology_flounder:work": "7cdc3c5b790f 8cc376185f99 35ce839cd1e2 fc1a121401e3 39c8e4a84a00",
 "astrology_flounder:ask": "0f1f3b061c3e 6e14e82cd068 833b638e4271 a467423ce1a8 1f6d2b4df594",
 "astrology_tuna:legacy": "be1f5382c476 22888431f655 ed4e601be298 1792225f3938 448e1eeab4e4",
 "astrology_tuna:personal": "ec67dd2731cb 6488ed2bf0fb 07947dfc1ae1 f9faf655b034 85918032d0e7",
 "astrology_tuna:work": "c7bb408b8666 847fd0b53890 44bdf12512ad 7e19641312b0 22515b7f0512",
 "astrology_tuna:ask": "222f22dd779f 84b8061e780c 752c65efb408 0ac20bf61967 85918032d0e7",
 "tarot_mackerel:legacy": "b8697ff4eb9c 34a99c69f203 11b8d52096a0 744acfb0228d 6aa275b457cb",
 "tarot_mackerel:choice": "d9101ea94d78 be70e135f2f8 7521471630e2 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "40679d816dbe 0574a3031be3 abdc070c54fe 94dcac1bb98c ec43dbbb0b03",
 "tarot_salmon:legacy": "3f2a60f7e8f5 62078e273468 4955003c9c96 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "f3cfd282e806 9f84ed5677e5 538390d3c338 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "98862054f11b f54ef794f2f6 b403f5e46468 92bb7cdeb91c 827911f6ce9f",
 "tarot_flounder:legacy": "2fbe5ba32198 a2fc0829bffc c8e33126beb0 7ef6af5f5ccb 200019185775",
 "tarot_flounder:choice": "5d8961341ca3 519ef2f3fcf5 bbb6db6900b1 5477b2d1cb4a 157bdc132835",
 "tarot_flounder:love": "8489a3eb6568 ff29e0aa0c49 17dbc9536b79 400e98cb574c cbc2d0bac5dd",
 "tarot_tuna:legacy": "396cd61fb96d 4288b3dbce8a 1509348b7e9a 1f1a9da039cc cdfa81f3a8a1",
 "tarot_tuna:choice": "b8f2fb0d9fa7 d108b4ea4dc2 56d400df27c7 2b59965a8514 e4dde4d5d80d",
 "tarot_tuna:love": "1dd883f570df e658a6d42727 733aa1bff5c3 8ad984c34e5e f40bb48c0c1e",
 "fusion_saju_ziwei:legacy": "61fb1125d06d 1ea3d3ed7ec6 1e4f1a8b13f5 e2ce9773a784 0d9429c32910",
 "fusion_saju_ziwei:personal": "526a58460331 da24606c40c1 c0f6a020ea5d a47c9edb48cc bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "a344a559e66e dc54d37d0f55 4e1c3fca94a1 3da8e4cc8efd 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "fc7a166448a2 9a5034b5c12d 86a73db6039c dee56456ba5c 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "7d5cf9ba32e5 6622ca633026 2cd03611f434 6d95d605a8a5 70b570d09783",
 "fusion_sukuyo_vedic:ask": "490edee3085d ca4cd00e8cea 362b5bd2b9f5 b8c3fa27dfb2 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "7cca60637cb1 1de95ea04781 249935f1598d deaca8cbfcc9 032738bbd603",
 "fusion_astrology_tarot:personal": "9240d186346f 1502fd826cb3 d8326d499f04 a00536217799 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "9df86cc8c6cb eee0ad780278 9ebd96a53c89 869558d03bd5 032738bbd603",
 "fusion_all:legacy": "0c0008f54613 7c60baace442 2a0de77946d5 190a0088f6f3 6e8d23af93ea",
 "fusion_all:personal": "6a6de48b2330 a14c34077b45 695c17ad5a0a 78c18f7b6ec3 d3753452ec82",
 "fusion_all:ask": "3c010b57452b 852f4b9416c3 5710c58a6e12 631de32565b5 6e8d23af93ea",
 "saju_salmon@timeUnknown": "71627c589411 283662ec44f7 17a406d7fe39 83e96cbac642 -",
 "saju_salmon@timeUnknown:ask": "b6114fe5862e 756a22d690d7 010e147fd13f 86a2e75add4b -",
 "ziwei_salmon@noPlace": "4f372ab54262 44ed766a1b54 52a554a5179e b43270c880d1 -",
 "ziwei_salmon@noPlace:ask": "71a4244dee5b 34542d8b79c4 fe54afbf775e d3efc6ef4910 -",
 "saju_mackerel@spirit": "b3266c0a3126 1ed57ae6acec 776d19cdf40d c3b521dd1883 -"
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
