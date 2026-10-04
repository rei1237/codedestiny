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
// ziwei.businessBasis·healthBasis (궁간 비화 사업운·질액궁 건강, ziwei/derived.ts) joined the Ziwei context and the evidence-name table, so the 16 Ziwei rows change prepare, requests, validations and manifests, the Ziwei fusions change prepare and requests, and every other row changes requests only; ids stay.
// vedic planets·grahas dignity gains moolatrikona and yogas·healthBasis (클래식 요가 성립 조건·1·6·8·12하우스 주인 건강, vedic/derived.ts) joined the Vedic context, so only the Vedic rows and the Vedic fusions change; the evidence-name table already had healthBasis, so no other row moves and ids stay.
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
const bundle=await build({stdin:{contents:"export {prepareFortune} from './worker/yeongnyangi/service'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {products} from './worker/yeongnyangi/payments/catalog'; export {topicIds} from './worker/yeongnyangi/fortune/topics'; export {readingLocale} from './worker/yeongnyangi/fortune/reading-locale'; export {analyzeAsk} from './worker/yeongnyangi/fortune/ask/analysis'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {deliverChapter} from './worker/yeongnyangi/providers/delivery';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
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
// End to end through the paid delivery gate (chapter-delivery-contract.js): every mock chapter the strict validator
// accepts must also be delivered under the purchase's contract. Hashes above are untouched by this check.
const deliveryFailures=[];
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
    if(result)try{m.deliverChapter({...body,chapterId:chapter.id,complete:true},{...input,deliveryContract:snapshot.deliveryContract});}
      catch(error){deliveryFailures.push(`${snapshot.product.id}:${snapshot.analysis.consultation?.consultationKind||'legacy'}#${ordinal}/${chapter.key||chapter.id}/${chapter.minimumChars} ${errorCode(error)}`);}
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
    // Delivery metadata is deliberately new; retain the historical calculation,
    // identity and manifest hashes and pin that metadata independently.
    assert.equal(snapshot.deliveryContract,'chapter-delivery-20261004');
    const prepare={id:row._id,fingerprint:row.fingerprint,amountKRW:row.amountKRW,productId:row.productId,featureKey:row.featureKey,
      checkpoint:row.generationCheckpoint?.version,snapshotKeys:Object.keys(snapshot).filter(key=>key!=='deliveryContract').sort(),product:snapshot.product,manifest:snapshot.manifest,consultation,
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
// Astrology derived facts (2026-10-04): traditional dignity on planets, chartSect, houseRulers 1·6·7·10, elementBalance
// and healthBasis join the astrology facts and the shared vocabulary. Astrology v7 rows change all but IDs, other astrology
// and astrology-fusion rows prepare/requests, the rest requests only; all IDs stay fixed.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED = {
 "saju_mackerel:legacy": "19e2143ae891 9a8a353cbc1d 376333857e28 523f22b7e9d2 42f2c5c373fe",
 "saju_mackerel:personal": "2b23e51ded9f 132a3f583aaf 491fdb26378e 576a177dd119 8c9adb9e6d01",
 "saju_mackerel:compatibility": "5092e14d00c0 1df03aac9187 3a80e1605bb2 d850d63e7b8d 163444337fa9",
 "saju_mackerel:love": "3b76aa003732 dfb5bb38d623 1ca624feb144 bd61958026a4 3e239ee154a7",
 "saju_mackerel:work": "955f508ab668 a0af95dd59ac f2b5eb123ecb 5dfc73127678 1dfa9237efd8",
 "saju_mackerel:money": "cdbe95c856e1 0d5bef3c07c4 b03b02eae569 c4202c21b93e 054738d4280d",
 "saju_mackerel:ask": "f5ee6960f26a 1043cc5d3993 6f9f8d07f635 c518b7fcbe38 b9cb87c20d32",
 "saju_salmon:legacy": "57913d88b470 4c5e05ad0dce 08254337bbd3 6e55eca0cd90 5a931b290957",
 "saju_salmon:personal": "37f20270d48d f642df0faa53 8c8a00d572da ee73364e5e65 459c1c844aea",
 "saju_salmon:compatibility": "10f81d9a5876 fa6f6051d113 4460b6158176 896fd690c8f2 5ee9aa8dd2ae",
 "saju_salmon:love": "145a385afb0f 9d0be6beaf1e bc05cd9cad6e a0acd49a317c 8fe7b01b938d",
 "saju_salmon:work": "6089a129ebde 904af6bee287 c79156973cf8 dc13148a2077 fa41008e9044",
 "saju_salmon:money": "52beec216bf4 812d0d9b1f2f dde7f7b7710c e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "de3672b4c9ac e19313ad534c e4c919d19e87 d1ffd9baa627 459c1c844aea",
 "saju_flounder:legacy": "55ae6a8298d8 e2ca01baf801 4d12decf52c1 f0eb4c1c53a6 d0a1fba4b309",
 "saju_flounder:personal": "d287003d59c7 c1047fbce907 a44327c8c233 a056d8c0af1d 9092b43d5b23",
 "saju_flounder:compatibility": "3f437d5180e7 0394a23c5ba5 10a7082a1546 506896de9240 3e8926b65705",
 "saju_flounder:love": "18057694882d 43de4ea0175e 920912958ed2 f97f4074da08 703f985f1df5",
 "saju_flounder:work": "901c2cbf9d64 e5475af23f27 74c4966496b4 6b4e32d9f821 686fbc52450a",
 "saju_flounder:money": "e75aad0e06b3 e4e18bef7569 0fa388d43f8b 5af2ce216b02 6c151b1de8ff",
 "saju_flounder:ask": "b090e65248a1 095913a1dd44 c44f57492e60 ea126435b7b9 9092b43d5b23",
 "saju_tuna:legacy": "c86fa6771aa8 d2982dbb782d 5ae2bb74774b ef60db5db116 a19a748c8350",
 "saju_tuna:personal": "57914638d670 e56b27809061 810907928808 525d3bdc1115 004fdfa8ed6a",
 "saju_tuna:compatibility": "b501d4ee1668 750fc40c1671 0649286246c1 a38016580b21 6e327a0ca069",
 "saju_tuna:timing": "33b61ed630d4 5f93585f748f d085deb2874b 77f281344d05 410bef112275",
 "saju_tuna:love": "ca10e3762aa3 dcbe070eb157 9d1dfd826cee 0757839598d6 135beac68a67",
 "saju_tuna:work": "0b472b29c308 0334f20aa85c b7b34fee0a62 1103bf8ee618 f96ef8e37722",
 "saju_tuna:money": "3864285d3e0a 1080a5176ce0 92bbb6e382d2 eddea4a1731b d0bff6c53db5",
 "saju_tuna:ask": "175aa391cc59 0d460131d3d5 924e77ea3092 53de150652b7 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "d57f7a6310e3 b4e86527c0b8 029e2e870bc1 a724a0893fc4 2371774a80c3",
 "ziwei_mackerel:personal": "b09aead75e88 85acdc8cd48c a3655ff3a9a1 912682461437 4d36af752c53",
 "ziwei_mackerel:money": "99a39543089a 8a5bfee4df3f 5f085b214098 057bccc22952 49682968473e",
 "ziwei_mackerel:ask": "4814fb775a44 387d91eb64de 004944acc64c 5b7e32196b3a 11a73d36d268",
 "ziwei_salmon:legacy": "f9152fc93d31 7764a2ae5660 139c93d110c8 24a1eb454199 3fbe37463d18",
 "ziwei_salmon:personal": "4a698a5cf120 1bdd4e1ce1d5 23914e127e83 dfaf78dcaa09 e53afa1fd005",
 "ziwei_salmon:money": "e12f9df4e43f 98bdf51fb736 a579d96705a8 55c1ca0b38ee 5b9032100edd",
 "ziwei_salmon:ask": "2c52e4de4878 49c4905150b2 1ea89ba24a1b cecb90defc5e e53afa1fd005",
 "ziwei_flounder:legacy": "8a6ea911f8e1 bbf8f8fd24f2 8d17b55a2858 5d55ae525ab7 9201b10cbef5",
 "ziwei_flounder:personal": "979c73dabe33 b5a899b22172 82255710b11e fa9e4c4c4cd6 379f9e9c59c7",
 "ziwei_flounder:money": "1253bc270272 ac33a79e2ae8 58d7a2558515 e3577ffba1ec 93ce966131ef",
 "ziwei_flounder:ask": "473aca21e162 9047aabf6b61 5eba448155a1 e121d001222b 379f9e9c59c7",
 "ziwei_tuna:legacy": "996ef1225e9c 4f201715fcfe 9daee3302a40 c2da084256c1 8d87087ff586",
 "ziwei_tuna:personal": "a817f1028734 f31ee2cec915 97e4dc8c3015 7f2cce5d925d 4f4beb638beb",
 "ziwei_tuna:money": "e435810f059b cc98b3dbe541 58c55381e751 6bca0d46f96f f3746b2a9fe7",
 "ziwei_tuna:ask": "c7a6d3ef9c71 14cf733f4906 63b943edaadd 921ae83c354a 4f4beb638beb",
 "sukuyo_mackerel:legacy": "5b57264b2d2f 184ab6ab826c 1c90eaedf87e 0fcf0d66b984 09cac5e57c93",
 "sukuyo_mackerel:personal": "03c7f6a7165b d16b2a93dbc3 f4e7f752a4a6 49345666bd18 60c2f71db056",
 "sukuyo_mackerel:compatibility": "7d84669df0ec 52090db8f04e 8da55bde25e1 2f84d874b2bd 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "48ec4b51f111 cdfb1377dcfa 97216091ecbe 981eb9605406 51c64f67c10e",
 "sukuyo_mackerel:ask": "f0d2e42536f5 1b1e86f61595 0e9abb2fd67e d2b0d069839c c1b4a3466991",
 "sukuyo_salmon:legacy": "8e640965d4ac 8abfa6aee560 092c55835d22 c3ae5e8f2735 40764a5a48f1",
 "sukuyo_salmon:personal": "ac28ff653e5f 07d4ca895954 a106570ad4ca 9814fc14064a c7963d52d5c2",
 "sukuyo_salmon:compatibility": "408731b2b641 bd06d4f10653 9d6abf152b21 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "f8d5f94d112b aeb485a7db8b 379b4eda856e 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "54b731135a8b 73ca30809948 c2ee1db8ef15 ab1985ef4e08 c7963d52d5c2",
 "sukuyo_flounder:legacy": "0f44842202b7 8f6a351b6519 8d046ea2368e 5ccb039d632a 41630a4b9f1f",
 "sukuyo_flounder:personal": "704bf89b0e9d b6e1671ed1fb a2728cb8aca7 eeae4d38448b 337c369df170",
 "sukuyo_flounder:compatibility": "818932a52708 714eb16884f5 693532d33ef1 2304eee6e9a6 3b18417c9ffd",
 "sukuyo_flounder:relationship": "b5cd7a8f1501 a5cc456b07cf f4a7f55c524a 6d1a77ac89dc b69fd6f8148e",
 "sukuyo_flounder:ask": "5a1025dd6a4c 961e7386ed13 6efa4d48b254 7c11adb2741e 337c369df170",
 "sukuyo_tuna:legacy": "6b0d169cc015 f933d659800f 3747113f182a ef0aef6230ad bbdcc5db3d05",
 "sukuyo_tuna:personal": "1b034ca5a91a c396e120a7b9 33344b9e83e0 844483faf4c1 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "611b89dc2a1d 4514da9a896d 1955c6ce02dc 7be4b42fb211 cf557e59d9fd",
 "sukuyo_tuna:relationship": "f9f495f58621 d7c6947e8925 2847d52e2968 08e96b3c39dc 6371bf908ad4",
 "sukuyo_tuna:ask": "5dff4de33afc ed58b9a4e802 937051132483 560109187680 933a3eee4cc4",
 "vedic_mackerel:legacy": "a1025b147e16 dcef2af90d8a 53f51f203ba0 157f8ec92c43 0ab96e7ba746",
 "vedic_mackerel:personal": "65d9950f2575 09a93578633e b58eefee7551 d56983683d0a 3b771e8d6049",
 "vedic_mackerel:ask": "578cac0d3cdd 88e81170502b a459c6e8a24f 9f608f719a53 0f802baef856",
 "vedic_salmon:legacy": "ae4ae7ed41e5 1f71b7bcad25 3383e44f4ee0 a3733622132c d832b44c39d3",
 "vedic_salmon:personal": "e55f9cac05b1 7d135a066c07 efd00227b7c2 dc655f5a6711 5474c6f3d686",
 "vedic_salmon:ask": "4868f52d5c31 fb64954384d7 7158b201d450 a2ca79d5ec77 5474c6f3d686",
 "vedic_flounder:legacy": "dc377cefb135 b930ce68b76e 2e8639aff415 a5b37804b873 f4c3879ba491",
 "vedic_flounder:personal": "7f52682910de 8498b68c7467 801be3dd2d26 f18b7fa49924 fc7c88f2f9c7",
 "vedic_flounder:ask": "cacbb035bb94 9e6c4d83f88a 7f34bda4adb4 acc64bcffe55 fc7c88f2f9c7",
 "vedic_tuna:legacy": "12ca77e8cd03 6ce79a43150e ddc61292af50 6f49931d037d 9a50bce25627",
 "vedic_tuna:personal": "4860a9e84a54 5d23e76eae68 d33b9c9c6dcc bac5fbae7e04 621ad1cb46ba",
 "vedic_tuna:timing": "594534a5527b 548c3b9bc0a8 685b1c8e2910 e27b3c1646a7 d48d8fcb6c1c",
 "vedic_tuna:ask": "a1473f63b5b2 e755bc391e35 85aa50e212b0 358159b4a8a8 621ad1cb46ba",
 "astrology_mackerel:legacy": "a9a603b44b12 c92947baeee4 3b50159039d6 0ab26bf80752 a01f7e3b5491",
 "astrology_mackerel:personal": "e0713fed4b5f eb8756d45876 827a8f0af09f 21f42be82895 97192bfd920b",
 "astrology_mackerel:work": "f80b73aeb83f c169d5005f0a 8ce54a7c60be 8f712fbe7c2a e4a4f0f408bf",
 "astrology_mackerel:ask": "0bdcbf0900a0 9d88783f57c3 9ff92299a982 df6b6ff71777 91f01265e663",
 "astrology_salmon:legacy": "df56a6ff7943 9c73a39d27d8 6d5d5105282a d8dcf8655d16 86295650d714",
 "astrology_salmon:personal": "6301b8b41b81 ad8db0503d54 5c6e0b6a18d0 edc0e569b3e5 72ca7e92b68c",
 "astrology_salmon:work": "18cb54020f2e 736b66311684 9a874582ef9b bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "6a6fa8d27028 c018758aaffc 61eefec1d448 71418c9eabef 72ca7e92b68c",
 "astrology_flounder:legacy": "4a56fa53a7e3 5f6d12ae1db0 dd24ad735a52 4543b7aa3ff3 30093a83fd6a",
 "astrology_flounder:personal": "f3d486aae66d 293eb716762d 7cdfbba97274 0070521b42d3 6c9e8804cea9",
 "astrology_flounder:work": "7cdc3c5b790f 9099db2abb9c 98271abcc8a9 fc1a121401e3 39c8e4a84a00",
 "astrology_flounder:ask": "0f1f3b061c3e 3e6eb9128c19 0ecc4a812874 e4f5952623cc 6c9e8804cea9",
 "astrology_tuna:legacy": "be1f5382c476 46492c165a85 2636e778e274 1792225f3938 448e1eeab4e4",
 "astrology_tuna:personal": "ec67dd2731cb 52bd553fd704 6602933daede c288b9e85360 24cb225a6499",
 "astrology_tuna:work": "c7bb408b8666 f6ac1df59b55 a6d03752ec02 7e19641312b0 22515b7f0512",
 "astrology_tuna:ask": "222f22dd779f a569ec3a74ef de233c07d3ad 2813db9d7031 24cb225a6499",
 "tarot_mackerel:legacy": "b8697ff4eb9c 34a99c69f203 0ecc482caac0 744acfb0228d 6aa275b457cb",
 "tarot_mackerel:choice": "d9101ea94d78 be70e135f2f8 e7fe2474302a 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "40679d816dbe 0574a3031be3 755a5ef7f104 94dcac1bb98c ec43dbbb0b03",
 "tarot_salmon:legacy": "3f2a60f7e8f5 62078e273468 578ae030d636 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "f3cfd282e806 9f84ed5677e5 4f0f892cbd7d 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "98862054f11b f54ef794f2f6 aa02285381a0 92bb7cdeb91c 827911f6ce9f",
 "tarot_flounder:legacy": "2fbe5ba32198 a2fc0829bffc 00bb3aef2d48 7ef6af5f5ccb 200019185775",
 "tarot_flounder:choice": "5d8961341ca3 519ef2f3fcf5 393b8afe3c69 5477b2d1cb4a 157bdc132835",
 "tarot_flounder:love": "8489a3eb6568 ff29e0aa0c49 cddbdcafb10a 400e98cb574c cbc2d0bac5dd",
 "tarot_tuna:legacy": "396cd61fb96d 4288b3dbce8a 7d6abb35600c 1f1a9da039cc cdfa81f3a8a1",
 "tarot_tuna:choice": "b8f2fb0d9fa7 d108b4ea4dc2 90db1e1ecc85 2b59965a8514 e4dde4d5d80d",
 "tarot_tuna:love": "1dd883f570df e658a6d42727 e7c9bafb6b60 8ad984c34e5e f40bb48c0c1e",
 "fusion_saju_ziwei:legacy": "61fb1125d06d 1d58df83637c 3c81f029eca0 e2ce9773a784 0d9429c32910",
 "fusion_saju_ziwei:personal": "526a58460331 8c14376263cd 95de3733970c a47c9edb48cc bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "a344a559e66e fb73e96e9059 0af8662eb448 3da8e4cc8efd 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "fc7a166448a2 c02dac9d836e 8315fdb93cdd dee56456ba5c 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "7d5cf9ba32e5 7ed8855f0f69 6795431e95b9 6d95d605a8a5 70b570d09783",
 "fusion_sukuyo_vedic:ask": "490edee3085d 08197ce5546a 0e5c08443b7b b8c3fa27dfb2 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "7cca60637cb1 bffdb42fa724 81616f439673 deaca8cbfcc9 032738bbd603",
 "fusion_astrology_tarot:personal": "9240d186346f aae3ecd5b053 9ccf77a10b71 a00536217799 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "9df86cc8c6cb a558ec2d2533 69aa4bab396c 869558d03bd5 032738bbd603",
 "fusion_all:legacy": "0c0008f54613 d9a5cdccdb39 cc76f3eb1821 190a0088f6f3 6e8d23af93ea",
 "fusion_all:personal": "6a6de48b2330 1600e73f3907 468ebd6b8072 78c18f7b6ec3 d3753452ec82",
 "fusion_all:ask": "3c010b57452b fe2124496801 1830b1522837 631de32565b5 6e8d23af93ea",
 "saju_salmon@timeUnknown": "71627c589411 283662ec44f7 cce1b68a4c5d 83e96cbac642 -",
 "saju_salmon@timeUnknown:ask": "b6114fe5862e 756a22d690d7 a68d05567d54 86a2e75add4b -",
 "ziwei_salmon@noPlace": "4f372ab54262 15abd3fbdd7d 23914e127e83 dfaf78dcaa09 -",
 "ziwei_salmon@noPlace:ask": "71a4244dee5b c820c2173b06 1ea89ba24a1b cecb90defc5e -",
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
  assert.deepEqual(deliveryFailures,[],'every validated mock chapter must pass the delivery contract');
  // Fail closed: a new product or kind without a pinned row is not silently accepted.
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(EXPECTED).sort());
  for(const key of Object.keys(EXPECTED))assert.equal(actual[key],EXPECTED[key],`${key}: id prepare requests validated manifests changed; refresh only for an intended change with YEONGNYANGI_INVARIANCE_PRINT=1`);
});
