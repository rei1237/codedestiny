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
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED = {
 "saju_mackerel:legacy": "19e2143ae891 84a531a78ff0 345a957f9c1d 6172c42c9384 8b73190c4eb8",
 "saju_mackerel:personal": "2b23e51ded9f 7273558c5395 4bc16c6fbab7 376d7dcee78c 73f644833274",
 "saju_mackerel:compatibility": "5092e14d00c0 6d1228800c3b 965f38c34b17 a98f53fd2920 b4feb0e2060a",
 "saju_mackerel:love": "3b76aa003732 0f4285601d9b 5ad60c56de01 445f0d8ece8d e387640606d4",
 "saju_mackerel:work": "955f508ab668 802caef226ec a92f0357bb4a 5dfc73127678 1dfa9237efd8",
 "saju_mackerel:money": "cdbe95c856e1 c0bcb52f7ccb 544947f89038 c4202c21b93e 054738d4280d",
 "saju_mackerel:ask": "f5ee6960f26a 1cbb524b8902 2744c5f1d4b4 68dd6be25f9c ac4eb5435ab6",
 "saju_salmon:legacy": "57913d88b470 a93ddc930da5 c81e0f2fe753 3693165b1f33 08f01b92e660",
 "saju_salmon:personal": "37f20270d48d 8837df4b405b e7e00706332f ef7d411955d0 a9108f244a70",
 "saju_salmon:compatibility": "10f81d9a5876 f34b03e0b0c2 6c953da75f04 eb7db84b3fbe de55f005535f",
 "saju_salmon:love": "145a385afb0f 6aac210d6b91 ec81808163c3 ef1007d4876d 6913aca975af",
 "saju_salmon:work": "6089a129ebde 4570f26e3133 ff720698a7c0 dc13148a2077 fa41008e9044",
 "saju_salmon:money": "52beec216bf4 f5042de44d43 6681025f0d7b e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "de3672b4c9ac d8a73e0c83e9 9d7cba49df45 618f76f4b1dc a9108f244a70",
 "saju_flounder:legacy": "55ae6a8298d8 bd50caa83994 9eecf3703725 398450b1daee 6d0df7a238c4",
 "saju_flounder:personal": "d287003d59c7 19100f4f7ca5 4be29a33de51 798d5b253191 61c642e3d72e",
 "saju_flounder:compatibility": "3f437d5180e7 1b702b9f3670 be589ba68f0e 8635657f6703 c5bce8f8a3ca",
 "saju_flounder:love": "18057694882d 59eedfcc7ab4 7baca4c9158a 759b63dd861e 45cdf76b8942",
 "saju_flounder:work": "901c2cbf9d64 9e08a6d18596 d4b18290a578 4040723f2058 f7f756f6a7c3",
 "saju_flounder:money": "e75aad0e06b3 d4d21c2854c9 ae0daecd21ea 5af2ce216b02 6c151b1de8ff",
 "saju_flounder:ask": "b090e65248a1 a5eb81407a41 795523d1315b af62890315a5 61c642e3d72e",
 "saju_tuna:legacy": "c86fa6771aa8 d7c6a9f195c2 f438792ce550 a0c94fb8260a 7266f902c6d4",
 "saju_tuna:personal": "57914638d670 0ef6d197cc46 5d4ecc689b97 79c7c564f387 7250e568b2a1",
 "saju_tuna:compatibility": "b501d4ee1668 eac991d96a26 dfaac4732535 0c853e374e37 14b76362baa5",
 "saju_tuna:timing": "33b61ed630d4 14ad807272ff aaaa2bb23e75 850ca8de7463 d8509d5c00a7",
 "saju_tuna:love": "ca10e3762aa3 242ba3e59def 927f1a509c97 dd60e7c70fc6 7c9b284576de",
 "saju_tuna:work": "0b472b29c308 3e03ba7eb4d8 4ba5cfd49326 9a27d8152ce3 bcc5a192599a",
 "saju_tuna:money": "3864285d3e0a 8bcb66d43958 c12df4856188 eddea4a1731b d0bff6c53db5",
 "saju_tuna:ask": "175aa391cc59 a4f89a62f1e7 c38c71acb1ad 804b853bb52e 7250e568b2a1",
 "ziwei_mackerel:legacy": "d57f7a6310e3 abdcf7f8a5b6 90fbbbb6c559 e4b382fc07ca f0f57311a50f",
 "ziwei_mackerel:personal": "b09aead75e88 ab479c3d1a62 10da5eebdea2 613a593bc74c 575175147460",
 "ziwei_mackerel:money": "99a39543089a 3a77bd3bad32 d2f08f2a6d70 2d577b0f5465 a50ae1a95053",
 "ziwei_mackerel:ask": "4814fb775a44 52ee6b74a2f3 774d30522d2d 1b9637c4776c 279b65fe829c",
 "ziwei_salmon:legacy": "f9152fc93d31 31e858e62bda 1cce20e8c46c bcfa0ba6906e 541dfb3677ed",
 "ziwei_salmon:personal": "4a698a5cf120 d18c0a715960 49a70070ae81 b43270c880d1 f90adf448d6a",
 "ziwei_salmon:money": "e12f9df4e43f b344981e7f3c bad26d3694a1 f1f19a2b7409 251643d2a1ce",
 "ziwei_salmon:ask": "2c52e4de4878 ea70d304bb4f 2a1d877f2739 c4222a322cf0 f90adf448d6a",
 "ziwei_flounder:legacy": "8a6ea911f8e1 a0a2da42deaa 670412c97f88 109192cf4aac 84d204935a81",
 "ziwei_flounder:personal": "979c73dabe33 66e222df402c d487294f2929 cb91862b4be6 e961ce567304",
 "ziwei_flounder:money": "1253bc270272 31165e69b460 f22711f5b98e 284ec3b8cde9 8578838c07ca",
 "ziwei_flounder:ask": "473aca21e162 9fc06581eb47 2f4ca65c0989 ba453142ccb5 e961ce567304",
 "ziwei_tuna:legacy": "996ef1225e9c d2145c834251 5138449bdeef 91a2d37f2e61 f2f6719e832d",
 "ziwei_tuna:personal": "a817f1028734 c8a5495e0fed 3d334f9bc95e c286f4903fe0 2b8b8b998443",
 "ziwei_tuna:money": "e435810f059b 7810bbe598a1 33f19bb2479a 6310635cf1f4 54b63770fa33",
 "ziwei_tuna:ask": "c7a6d3ef9c71 7f4d8ac2ff8e 25251b6c8fad df3c4d3ff0ee 2b8b8b998443",
 "sukuyo_mackerel:legacy": "5b57264b2d2f 184ab6ab826c 258fb9aac1f2 0fcf0d66b984 09cac5e57c93",
 "sukuyo_mackerel:personal": "03c7f6a7165b d16b2a93dbc3 03da5e726f48 49345666bd18 60c2f71db056",
 "sukuyo_mackerel:compatibility": "7d84669df0ec 52090db8f04e 45d52812e343 2f84d874b2bd 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "48ec4b51f111 cdfb1377dcfa 2ebbc121dab9 981eb9605406 51c64f67c10e",
 "sukuyo_mackerel:ask": "f0d2e42536f5 4c487859c39a ee061e46e6cd c23246cc2e78 c1b4a3466991",
 "sukuyo_salmon:legacy": "8e640965d4ac 8abfa6aee560 0f3a263e797c c3ae5e8f2735 40764a5a48f1",
 "sukuyo_salmon:personal": "ac28ff653e5f 07d4ca895954 4aba405b905f 9814fc14064a c7963d52d5c2",
 "sukuyo_salmon:compatibility": "408731b2b641 bd06d4f10653 ca0d77b227b5 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "f8d5f94d112b aeb485a7db8b 0e6e09b0d53e 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "54b731135a8b 246d51814459 d55d655440d3 537730cb980b c7963d52d5c2",
 "sukuyo_flounder:legacy": "0f44842202b7 8f6a351b6519 4d546cf795a5 5ccb039d632a 41630a4b9f1f",
 "sukuyo_flounder:personal": "704bf89b0e9d b6e1671ed1fb f4edc08577d6 eeae4d38448b 337c369df170",
 "sukuyo_flounder:compatibility": "818932a52708 714eb16884f5 86db97a64f55 2304eee6e9a6 3b18417c9ffd",
 "sukuyo_flounder:relationship": "b5cd7a8f1501 a5cc456b07cf 2d39c29d57ba 6d1a77ac89dc b69fd6f8148e",
 "sukuyo_flounder:ask": "5a1025dd6a4c 9d6210be3a3f 238ff4acc9ed 3196cd8aa2c9 337c369df170",
 "sukuyo_tuna:legacy": "6b0d169cc015 f933d659800f 17f685145d58 ef0aef6230ad bbdcc5db3d05",
 "sukuyo_tuna:personal": "1b034ca5a91a c396e120a7b9 017dd27d5156 844483faf4c1 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "611b89dc2a1d 4514da9a896d 2a98f0334655 7be4b42fb211 cf557e59d9fd",
 "sukuyo_tuna:relationship": "f9f495f58621 d7c6947e8925 e6ac8342ac96 08e96b3c39dc 6371bf908ad4",
 "sukuyo_tuna:ask": "5dff4de33afc 0ba3285990b1 3856b86342ae 56ce98f0fbd2 933a3eee4cc4",
 "vedic_mackerel:legacy": "a1025b147e16 f31c5b29b77a dce0911f4143 157f8ec92c43 0ab96e7ba746",
 "vedic_mackerel:personal": "65d9950f2575 beb666926420 7e5a2ee96db0 d56983683d0a 3b771e8d6049",
 "vedic_mackerel:ask": "578cac0d3cdd c6cd7249a075 0efc684e76a0 8273e1ece06f 0f802baef856",
 "vedic_salmon:legacy": "ae4ae7ed41e5 85519216a266 893d3ca74f9c a3733622132c d832b44c39d3",
 "vedic_salmon:personal": "e55f9cac05b1 e0f22f09ce28 4d04ef476345 236c16a3eb0c ac338df4e9f4",
 "vedic_salmon:ask": "4868f52d5c31 7456f2ecdf79 34e8fc108102 71173eb8b965 ac338df4e9f4",
 "vedic_flounder:legacy": "dc377cefb135 265c81e0c249 8f9a32f8fe16 a5b37804b873 f4c3879ba491",
 "vedic_flounder:personal": "7f52682910de ce9bd1b45a22 b4cab6c8e0d7 6c8eaef5a605 7d3b159ecd72",
 "vedic_flounder:ask": "cacbb035bb94 4349723e7ab4 755a7d2a0c6d 8dd57094d977 7d3b159ecd72",
 "vedic_tuna:legacy": "12ca77e8cd03 0fd0d909be92 e41e28cc8611 6f49931d037d 9a50bce25627",
 "vedic_tuna:personal": "4860a9e84a54 5aa6b51901c5 e20e87298370 5441a5e47555 428ba79f9a99",
 "vedic_tuna:timing": "594534a5527b 42b8dc585424 7f96729bd1bc e27b3c1646a7 d48d8fcb6c1c",
 "vedic_tuna:ask": "a1473f63b5b2 8de56953ae23 804a2d6e366c 24a38d1a0a1d 428ba79f9a99",
 "astrology_mackerel:legacy": "a9a603b44b12 11ac47bfeac6 4edf258d51db 0ab26bf80752 a01f7e3b5491",
 "astrology_mackerel:personal": "e0713fed4b5f d4af1c357178 20949fbb3785 21f42be82895 97192bfd920b",
 "astrology_mackerel:work": "f80b73aeb83f a61dc986347a 370b655b5694 8f712fbe7c2a e4a4f0f408bf",
 "astrology_mackerel:ask": "0bdcbf0900a0 d52e6cbd5c70 13eeafb4e99a 79e2b52fd5b8 91f01265e663",
 "astrology_salmon:legacy": "df56a6ff7943 25603cf66f7d b6f15f4e822b d8dcf8655d16 86295650d714",
 "astrology_salmon:personal": "6301b8b41b81 55b49d66d21e d31bd0deb4bf 468c7f60a9de e9cd1e6be39e",
 "astrology_salmon:work": "18cb54020f2e a8fde25727d8 c7208cba5728 bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "6a6fa8d27028 e03565e5888a 8485bd4bc3c8 a8fea79f7cde e9cd1e6be39e",
 "astrology_flounder:legacy": "4a56fa53a7e3 8aec54eeb82b f9194203a7c2 4543b7aa3ff3 30093a83fd6a",
 "astrology_flounder:personal": "f3d486aae66d cdac3adfc028 b5652c899ad4 9807b31cf2c6 1f6d2b4df594",
 "astrology_flounder:work": "7cdc3c5b790f 8cc376185f99 3a4dba36021f fc1a121401e3 39c8e4a84a00",
 "astrology_flounder:ask": "0f1f3b061c3e 5c9962daf242 0d94d5f8ba7f 235d8e4c5bd1 1f6d2b4df594",
 "astrology_tuna:legacy": "be1f5382c476 22888431f655 61eaa38c95f5 1792225f3938 448e1eeab4e4",
 "astrology_tuna:personal": "ec67dd2731cb 6488ed2bf0fb 0282392641ea f9faf655b034 85918032d0e7",
 "astrology_tuna:work": "c7bb408b8666 847fd0b53890 80d2acb95789 7e19641312b0 22515b7f0512",
 "astrology_tuna:ask": "222f22dd779f 7a8691acf5d8 364feb402ac4 e6d480e01b74 85918032d0e7",
 "tarot_mackerel:legacy": "b8697ff4eb9c 34a99c69f203 132a603506c1 744acfb0228d 6aa275b457cb",
 "tarot_mackerel:choice": "d9101ea94d78 be70e135f2f8 4460ec051dd1 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "40679d816dbe 0574a3031be3 64ffa99cdbea 94dcac1bb98c ec43dbbb0b03",
 "tarot_salmon:legacy": "3f2a60f7e8f5 62078e273468 da28f4133529 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "f3cfd282e806 9f84ed5677e5 fae818d83579 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "98862054f11b f54ef794f2f6 96f96e103906 92bb7cdeb91c 827911f6ce9f",
 "tarot_flounder:legacy": "2fbe5ba32198 a2fc0829bffc 66651d5bf36b 7ef6af5f5ccb 200019185775",
 "tarot_flounder:choice": "5d8961341ca3 519ef2f3fcf5 94589f56b459 5477b2d1cb4a 157bdc132835",
 "tarot_flounder:love": "8489a3eb6568 ff29e0aa0c49 7f55043438fa 400e98cb574c cbc2d0bac5dd",
 "tarot_tuna:legacy": "396cd61fb96d 4288b3dbce8a 21088af31b49 1f1a9da039cc cdfa81f3a8a1",
 "tarot_tuna:choice": "b8f2fb0d9fa7 d108b4ea4dc2 891f154dddd9 2b59965a8514 e4dde4d5d80d",
 "tarot_tuna:love": "1dd883f570df e658a6d42727 7e4c91044a1a 8ad984c34e5e f40bb48c0c1e",
 "fusion_saju_ziwei:legacy": "61fb1125d06d 4d88a0532a4e 6d614a7f803e e2ce9773a784 0d9429c32910",
 "fusion_saju_ziwei:personal": "526a58460331 49e39819c3d7 de60410907b2 a47c9edb48cc bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "a344a559e66e dbf1c024f3bd ed47f4080917 4c4bcbc7f6d9 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "fc7a166448a2 9a5034b5c12d d7b13d8e429d dee56456ba5c 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "7d5cf9ba32e5 6622ca633026 c8061eddc48c 6d95d605a8a5 70b570d09783",
 "fusion_sukuyo_vedic:ask": "490edee3085d 35343f211daa b247ddf79f0b dd06f18fad0a 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "7cca60637cb1 1de95ea04781 3aad971422eb deaca8cbfcc9 032738bbd603",
 "fusion_astrology_tarot:personal": "9240d186346f 1502fd826cb3 7b9abd9d08ae a00536217799 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "9df86cc8c6cb bb2634947bc6 b9fc6e753721 0274161bb55f 032738bbd603",
 "fusion_all:legacy": "0c0008f54613 2eccc40a7f2e b7c34dafd494 190a0088f6f3 6e8d23af93ea",
 "fusion_all:personal": "6a6de48b2330 3a9156dd0fe0 f4d98f39be2e 78c18f7b6ec3 d3753452ec82",
 "fusion_all:ask": "3c010b57452b 8c4ca82a87ae 65108f0cab0a 3d75f244a4a1 6e8d23af93ea",
 "saju_salmon@timeUnknown": "71627c589411 b4c7c4d8ef79 778c8b0da7ab fc4b9fca2d38 -",
 "saju_salmon@timeUnknown:ask": "b6114fe5862e b582696f8131 a80fc106bba7 9ac7890c65c1 -",
 "ziwei_salmon@noPlace": "4f372ab54262 44ed766a1b54 49a70070ae81 b43270c880d1 -",
 "ziwei_salmon@noPlace:ask": "71a4244dee5b 87401b51f2a6 2a1d877f2739 c4222a322cf0 -",
 "saju_mackerel@spirit": "b3266c0a3126 d5d82461ce72 ebcd20ecc754 c3b521dd1883 -"
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
