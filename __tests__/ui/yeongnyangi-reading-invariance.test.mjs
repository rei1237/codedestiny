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
// saju healthBasis.climate gained birthSeason (월지 계절) and its rule, so the 11 saju-bearing rows change requests only; ids, prepares, validations and manifests stay.
// Later chapters now receive the question chapter's answers as fixedConclusions (D3, 2026-10-10), so the 102 rows whose mock question chapter answers change requests only; ids, prepares, validations and manifests stay.
// D4 (2026-10-10): the summary-only contract and explainedEvidence change all 199 request hashes. CHAPTER_SUMMARY_REPEATED rejected the
// v5 fixture's fixed '${title} · 모의 상담 구성 확인' summary for parallel titles ('첫 번째/다른 선택의 가능성과 부담'), so the fixture
// summary now carries two seeded words; 198 validated hashes follow that fixture text. ids, prepares and manifests stay.
// D5 (2026-10-10): astrology prompt facts show essential dignity and sect in Korean (자기 별자리(룰러십), 주간…)
// instead of English codes, so the 26 rows carrying astrology facts change request hashes. Stored facts keep the codes.
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
const bundle=await build({stdin:{contents:"export {prepareFortune,snapshotAnalysis} from './worker/yeongnyangi/service'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {products} from './worker/yeongnyangi/payments/catalog'; export {topicIds} from './worker/yeongnyangi/fortune/topics'; export {readingLocale} from './worker/yeongnyangi/fortune/reading-locale'; export {analyzeAsk} from './worker/yeongnyangi/fortune/ask/analysis'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {deliverChapter} from './worker/yeongnyangi/providers/delivery';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
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
const kindsFor=p=>[undefined,...m.consultationKinds[m.consultationDomain(p)]].filter(k=>!k||k.id!=='spread'&&m.supportsKind(p,k));
// Standard localized kinds now join the pinned matrix. V3's pre-payment AWAITING_DRAW contract
// is independently exercised by yeongnyangi-tarot-spread-v3.test.mjs, including all purchase locales.
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
    const input={locale:m.readingLocale(snapshot.locale),chapter,analysis:m.snapshotAnalysis(snapshot),previous:[...previous],repair:undefined,ask:ordinal===0?ask:undefined};
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
    if(productId.startsWith('tarot_')&&kindId==='compatibility')body.participants={self:'Alex',partner:'Sam'};
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
// Health safety (2026-10-04): the health chapter of each system carries domainRules.healthContract (HEALTH_RULES), so the
// 28 saju·ziwei·vedic·astrology v7 rows change requests only; IDs, prepare, validated and manifests stay fixed.
// 2026-10-07: equal basic quality updates prompt requests; saju compatibility adds actual cross-chart evidence. IDs, validated prose and legacy manifests stay fixed.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
// 2026-10-05 approved price correction: price is part of the fingerprint, so IDs and preparations change.
// All provider requests, validated prose and manifests remain identical; mackerel rows are unchanged.
// Locale opening adds the formerly Korean-only standard kinds; all existing 123 rows stay identical.
// 2026-10-06 purpose-counsel-v1: 198 new ordinary identities/preparations/prompts change.
// Only saju tuna personal/timing/ask mock bodies change (cycle ownership/coverage).
// All 199 catalog manifests and the spirit contract remain identical. Stored purchases are not regenerated.
// 2026-10-07 grounded recognition changes prompt requests only; all identities, preparations, validated bodies and manifests are unchanged.
// Topic-linked opening and reader-only evidence change request hashes; calculations, identities, validation and manifests stay fixed.
// 2026-10-10 D1: Ziwei yearly facts drop the natal-sihua copy and carry recalculated annual sihua, so the 19 rows that send yearlyLuck/yearlyTimeline change request hashes only.
const EXPECTED = {
 "saju_mackerel:legacy": "6e349b9090e2 aa440fd1fb24 d99a1a751ff2 2e1efdaff1e3 42f2c5c373fe",
 "saju_mackerel:personal": "4f5d6510d8a8 0e8c03395de1 7c44eb174a95 e9593bd7b1ed 8c9adb9e6d01",
 "saju_mackerel:compatibility": "6d5316fb339a 32f1d5823351 42f8ca35e8b4 45e5cf6d1374 163444337fa9",
 "saju_mackerel:love": "70c5b2fcb02f 1662a1d9f07a 98e24f235cca 1608c05632d3 3e239ee154a7",
 "saju_mackerel:work": "544462ead054 58caaf78469d ef8d5d0487e0 08129487724d 1dfa9237efd8",
 "saju_mackerel:money": "17a13e55902f d757a3a9e636 e589bec7fcc0 3b89c09cd6ef 054738d4280d",
 "saju_mackerel:health": "926f57364e98 6132fbd88af5 33978de0fbe4 ec8bc2e75b5e 6f349850e339",
 "saju_mackerel:marriage": "e4030cd9f2aa 0ffa4beb79df 427dacd41b16 3bb6daeff7aa d0f64253c7e4",
 "saju_mackerel:movement": "77330f5a3baa 21e2b33d6cc1 5ca3145e98bd 80911c2c96cf 2629d158d3bf",
 "saju_mackerel:ask": "d5164b5c6528 cc3cc97e9243 2f61b59d57d1 b19cd3dad9b7 b9cb87c20d32",
 "saju_salmon:legacy": "c4059953b1c4 7ee009e203c7 1835a5beca02 81508b48f66c 5a931b290957",
 "saju_salmon:personal": "4fad35d30e39 27698d603ca7 2a21932b0b44 bef8e5fd5411 459c1c844aea",
 "saju_salmon:compatibility": "2fbc83ced648 32b74912f657 e9fb1ce435de 02f306f67d90 5ee9aa8dd2ae",
 "saju_salmon:love": "4bb9738214c2 f87b1d57d03a 30e86cbc3399 04f6233667c0 8fe7b01b938d",
 "saju_salmon:work": "147bc8320bfa 0dee25e268c6 590221e3729b 3ee2757ed834 fa41008e9044",
 "saju_salmon:money": "48307058160b 71ce8c1ee56b 7279018d20f3 6a16ff94d693 6ae138fbccb6",
 "saju_salmon:health": "f6b385b92a0f 1f2ba9f64baf 4c5bb073dbf4 3c9fbc1618dd c2825221fee0",
 "saju_salmon:marriage": "0c15e4d1d0df 04d5e42be59f a16082794675 60a1e9b9657f f9ab1067c762",
 "saju_salmon:movement": "2fcdc70d66e3 9de3771b220b 701ed5e0e4cd 4c756bdebde0 7dfcbf891f12",
 "saju_salmon:ask": "11530890db73 5f542454d7bf 4cf91de20a68 24a6fff0ee15 459c1c844aea",
 "saju_flounder:legacy": "2f03e9541f66 7cbf63822ac2 e104270e3256 0e581c4b7ebb d0a1fba4b309",
 "saju_flounder:personal": "27847cb7453f de7a1fb75383 36cf30e13493 7202471c0fa2 9092b43d5b23",
 "saju_flounder:compatibility": "d23151e45632 be2f6cf5ba5c 50b4bd6cdba6 eb044b2a5703 3e8926b65705",
 "saju_flounder:love": "2d8501ac26fc a62d87953b19 1ab43709474f f829576a3b46 703f985f1df5",
 "saju_flounder:work": "00a830fc552b 3fb15c81541b 692d9cd0338b ba3aecfe9321 686fbc52450a",
 "saju_flounder:money": "b9cf42af5cac c37250879754 48bc682cf54c d19a9678745d 6c151b1de8ff",
 "saju_flounder:health": "3819175f0fff abb25408f884 85c48ebb7a2f 8abba083cbe9 1944e876aec8",
 "saju_flounder:marriage": "295b713484dc c0ed08f652ea 385b2ed81861 0fe21aaae3ab c9a479d092d3",
 "saju_flounder:movement": "f4862e9b8c23 e78bf1d2b125 b2715543ceb8 a94f7fe5e878 caadd5f9127a",
 "saju_flounder:ask": "87bc8fe3f10d b9cf23771ab6 2910d287673e c8b9db36e8b0 9092b43d5b23",
 "saju_tuna:legacy": "356b024ce814 264e7f6feb97 4f5417d3f9cd dc60524d9360 a19a748c8350",
 "saju_tuna:personal": "7d578af159f3 a86c6a924821 3f152252ccf4 605d84b614cc 004fdfa8ed6a",
 "saju_tuna:compatibility": "f8642c297702 f993b4f5bb78 4fc52f6031a7 550fd61ed012 6e327a0ca069",
 "saju_tuna:timing": "18921fa9dc3a ba7db858f79b 44463589f148 f7e4f4d2f4cc 410bef112275",
 "saju_tuna:love": "f0eaae6bc658 e67fa8558511 ea811012c410 f0f415adcc4a 135beac68a67",
 "saju_tuna:work": "c7d4fe25ba4b 5a1cb4e8e5e8 2ead2542b78a dfe9e3c8759c f96ef8e37722",
 "saju_tuna:money": "e83acdf4d7a6 cc342dd40223 fe07802fbec7 ee549146f517 d0bff6c53db5",
 "saju_tuna:health": "9acfae2ce6a0 b88868a4ab07 1259ea950729 2b83a0ea3c17 0ff921b2a8bb",
 "saju_tuna:marriage": "17fde381a0ce 05de23f0a1ed 789e98687fb5 22a8022babcc 0ec0359f02ad",
 "saju_tuna:movement": "dc1bca68fda8 202f967a58de 9ee3195b3027 8eaad5cf41fd 128d0b22895e",
 "saju_tuna:ask": "470fd152414b 37359df32421 8ee5eddeaf5a f0eb36bd2df8 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "29742ed89149 3dbce7e75607 a8e67e158cf8 4fa1bc81724f 2371774a80c3",
 "ziwei_mackerel:personal": "6cc29878e8f4 90d67fc13a2d be8918aa4651 2f9b814278c0 4d36af752c53",
 "ziwei_mackerel:money": "8945757509f6 ddfda75c60ca 6e04f7aa5e1c 6b6cb0c08bd3 49682968473e",
 "ziwei_mackerel:business": "5315a99b5124 c9e82e8846b9 c95e8cbcddec bc115d86c42d 8760a0a3cb97",
 "ziwei_mackerel:love": "b08deb8bb7a5 e6c0c90a2fb4 0834bf3cd1b9 55fe80cfc959 5263a982930a",
 "ziwei_mackerel:marriage": "171a4840e196 b49d7b592422 7fa3d9a8b682 becad0a79756 34fd69b9fa1a",
 "ziwei_mackerel:health": "fd750a86b434 36325237f9e4 6abf6cf07b10 35455382f7c7 5c5632463fed",
 "ziwei_mackerel:compatibility": "475609ba3a21 1c789554df2a 4d71bcb2258d f06df0402b05 18e9ddeda17d",
 "ziwei_mackerel:ask": "2ce3c28cea28 688603d3936d 36532c098e44 74c79e9b812f 11a73d36d268",
 "ziwei_salmon:legacy": "4eba21beffe8 1c849a2fab1c 52efaf8af2ef 28c3f1244941 3fbe37463d18",
 "ziwei_salmon:personal": "182619b304b2 715058312f7e 6a1d90ba29e4 58713471d73f e53afa1fd005",
 "ziwei_salmon:money": "5cf3ff225d95 ba3eddb5a3c3 1112ed294225 81dc33e2b077 5b9032100edd",
 "ziwei_salmon:business": "b9e70f75c588 516494c72b50 d03fde48e41a 83b8ac5bcde7 6369360a3c1a",
 "ziwei_salmon:love": "5c701f74b891 94d74c8815d5 8beafe1ae918 516b1ef2ed75 04b6c4bb9963",
 "ziwei_salmon:marriage": "47622e938dcf 0eb013e392d8 47e17ac39741 73ab44ff7378 87adae473ea9",
 "ziwei_salmon:health": "26f94b2db815 e20a774b4d94 465e378e11f2 c4842921e636 68bd7a6f8c8f",
 "ziwei_salmon:compatibility": "bd5a1739767f d86f3ec90892 182bc2ee37cd a73db7447c81 b2dde48c94ff",
 "ziwei_salmon:ask": "e6f8681435ac ea774a2e33f7 d1f1e37e1540 1cd4c4dcea29 e53afa1fd005",
 "ziwei_flounder:legacy": "012f25e16f38 922534a8a7e3 497ea5aec6a6 b2c7b3afe72b 9201b10cbef5",
 "ziwei_flounder:personal": "102b4e9ae7f3 924c860b4d1c de1dad04441c d4b7c2bf8692 379f9e9c59c7",
 "ziwei_flounder:money": "4ceb2c62e792 7113cf49567f 05f7ba1ceaa9 470d53599ed7 93ce966131ef",
 "ziwei_flounder:business": "7d35a09bfbd0 8ef520b101f1 e8848a86d9ce fcca332dd55e f57c13332209",
 "ziwei_flounder:love": "0c45753b2686 30007ecd7af6 a9205d64e1ff 6185199980f9 3641d17b484b",
 "ziwei_flounder:marriage": "b6e02fd1749a 9686371afe00 8b8a46ea38e3 96ca52ca25f3 7617a833fc9e",
 "ziwei_flounder:health": "775e9c1581c0 f3787cb777bf caf8ce4b95c5 0688fb3c21c3 583e184502b9",
 "ziwei_flounder:compatibility": "5336dfd3e6e2 f4dd3da5f7b4 2a6a45a8cd63 f9c366aad22b 63bf3208b946",
 "ziwei_flounder:ask": "a50a6db1b065 1c84d0ad272e d2de4c8a04c8 c457c5b7f2b6 379f9e9c59c7",
 "ziwei_tuna:legacy": "cd3c28740b2d 6aa645251ee6 76c31227ec3d c70ba8ddfe3e 8d87087ff586",
 "ziwei_tuna:personal": "410661889360 05bb64d29a6c f3b903087523 a01d494fcb5c 4f4beb638beb",
 "ziwei_tuna:money": "062748ca9df5 12ae11303726 88c405711678 f4f25d8a151d f3746b2a9fe7",
 "ziwei_tuna:business": "cf33dd97f67e 7d575ab69f80 8256a5ccb24c 6a33d211f2aa ce52fe2adca8",
 "ziwei_tuna:love": "eb5564a368a4 175e06ecade2 3a4e1524756b 1e2b812f4fb0 300807ac1eec",
 "ziwei_tuna:marriage": "873accb48a98 dd8d3160791e f85603793911 9309d2cd2314 93391b2a2e3b",
 "ziwei_tuna:health": "262fb7a38515 b4722a10fc67 488092440ee3 30a84715cfe0 65bbc46fd5db",
 "ziwei_tuna:compatibility": "0c2f3fd7ba7b a12a6028185e bf9314965b32 55233a730602 3edd1557eb29",
 "ziwei_tuna:ask": "7af1ae953142 6602a13e74cb a87a2e964f08 04ede67128a0 4f4beb638beb",
 "sukuyo_mackerel:legacy": "c98f91daf034 5f2ab5293cd9 d48839f7ef87 c213f2a15e7c 09cac5e57c93",
 "sukuyo_mackerel:personal": "540fdaaed22b 0fddadc792d6 adb396b0921f a84a2b0f125a 60c2f71db056",
 "sukuyo_mackerel:compatibility": "9c37f9df5ccd d3d0ad0358f1 f4c10176cb37 eb7406256731 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "8daadcfae9b4 618c82768f3d 18a0cf090d49 01913e144554 51c64f67c10e",
 "sukuyo_mackerel:ask": "3b5ab6faba21 a2eb80124426 43262d965a04 fa3f9e369d76 c1b4a3466991",
 "sukuyo_salmon:legacy": "a346632ae5b9 bf03e21a754c c380cee5df49 31c12096960d 40764a5a48f1",
 "sukuyo_salmon:personal": "863336e61976 35bfc596aaa6 50490ea9297a 9a39b75ba869 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "0ccdf133cca1 52e824304355 298884802e55 52cdc0364a79 cc372c1aa463",
 "sukuyo_salmon:relationship": "ef726da94c1d 53e5da12365c a0dd8af5c505 d32c500dc227 4a2ab417052e",
 "sukuyo_salmon:ask": "3e67f0cb3aae 91b830560aa9 5c6ecd05a15e 777030280c73 c7963d52d5c2",
 "sukuyo_flounder:legacy": "091b2f61c49d f7261ba33890 71f66c2aa232 a3a3c5ae25be 41630a4b9f1f",
 "sukuyo_flounder:personal": "1a83a81b3eb0 82a8206876f0 afb61175e501 5134f933585f 337c369df170",
 "sukuyo_flounder:compatibility": "26ab2a0c3f1b 3c7cea883c36 ce32083522c3 52fb8c9bfc45 3b18417c9ffd",
 "sukuyo_flounder:relationship": "59452a618926 7d87d67f149d beba0984cf79 39655e32eb1b b69fd6f8148e",
 "sukuyo_flounder:ask": "f591aaf79c2f 3777a1fa8f84 f168f41207c6 8950a5fb9410 337c369df170",
 "sukuyo_tuna:legacy": "fc3bb70ae112 cdc2a5c6f6cf 068fce50c364 90218cf2bfde bbdcc5db3d05",
 "sukuyo_tuna:personal": "d2255f58d54a 80c718d737b2 e0f1519811fd 70349d12137a 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "ad30c87bfdee f8810911ea22 4f4149c5c982 a47a1db94aa4 cf557e59d9fd",
 "sukuyo_tuna:relationship": "ccc767726a42 d6681e9884e5 37d3e72ba53e 80d8843d3e6e 6371bf908ad4",
 "sukuyo_tuna:ask": "7398acfb95e0 18664b07174c ec75b1d97a4b e5cbd184afba 933a3eee4cc4",
 "vedic_mackerel:legacy": "601e9176b770 bdb2af9c3265 c1f27e3018a4 dabe511ee98f 0ab96e7ba746",
 "vedic_mackerel:personal": "8ae8ab526eff 9684772267d7 41cccd74b53a c033215bf37f 3b771e8d6049",
 "vedic_mackerel:compatibility": "c242718fc82f 3e6fa60cbb02 941589399352 7ea95d76580e 93639036c9de",
 "vedic_mackerel:health": "ce8ee9e924ed 5befc043403f 3cf6425fb85e 40ddf0bd3f36 1d731a0d27b6",
 "vedic_mackerel:ask": "43877c0fd80c fa8badee7d29 b7822e2edfc6 9e2e5c31924a 0f802baef856",
 "vedic_salmon:legacy": "1cf8d0c0d653 fb385b5cedbd eb6fc2ae8f37 ed2d5b211933 d832b44c39d3",
 "vedic_salmon:personal": "58d3b9b568dd 9f3ecc095da8 00819d6238ee 6ac5773867ba 5474c6f3d686",
 "vedic_salmon:compatibility": "6b62cecab87f c22c019d01e2 3dfe34a9ecaa 5b53b8ee9f0d fa9d3f4db03e",
 "vedic_salmon:health": "35eb1b62abca 1450d836cc8c e9933e59f67e e380cc3d45da f88b928d0896",
 "vedic_salmon:ask": "4c1722747bbe 225ab874fad2 c4cf22179590 c7eeedac1d4a 5474c6f3d686",
 "vedic_flounder:legacy": "6a0bea633287 c59867fd5cc2 842a587bd0c5 4caa5f878224 f4c3879ba491",
 "vedic_flounder:personal": "abaf3b9494d7 d6ca8e94cb18 8a51208e7fdc 31af598f92b5 fc7c88f2f9c7",
 "vedic_flounder:compatibility": "8328560d474c e0cba0e082f1 4da1e6319d0a 0516d20a6281 42739f81cb7b",
 "vedic_flounder:health": "ee32023ada94 8a4397aa81e5 41ccc65d44f2 0ab77e276e4b 966635149b77",
 "vedic_flounder:ask": "954cf2dfaf7c b03e4d4e5791 4411dac5b692 fa3757e16cf0 fc7c88f2f9c7",
 "vedic_tuna:legacy": "0eb28fa5e6ea 70bdba8726f4 3a2d2190eeda bc95aa81e9c6 9a50bce25627",
 "vedic_tuna:personal": "4327a12db79b c52461e61e43 976110d1ee18 4eeee8d91d64 621ad1cb46ba",
 "vedic_tuna:compatibility": "58273a8ae81d 0b6e12a074ab 38c6209e17c9 5af975688a70 81b70a1080b0",
 "vedic_tuna:timing": "188577efe11d e17038b8c0d8 54722b73dc4e 80f3214b47e0 d48d8fcb6c1c",
 "vedic_tuna:health": "498eae4d0156 b01e941beee4 214690c96604 54d91a78dece 2c61521bdda7",
 "vedic_tuna:ask": "421d2289a789 69676660fb61 f95fa5d4858c 841aaf39ded3 621ad1cb46ba",
 "astrology_mackerel:legacy": "e9599ad3b02d b312fbbea97b e1a378037d7a 6301864406cf a01f7e3b5491",
 "astrology_mackerel:personal": "9712f50a0f82 bb1ba86e0da5 8bf673490b31 b7eb5c9e3bc0 97192bfd920b",
 "astrology_mackerel:compatibility": "613543aa8e7b 38a4f8117e03 c0f240661b27 642ddf3bc074 947276fd4fb0",
 "astrology_mackerel:work": "dab8f72df97a 18295eddf1ec 261bc327291c d0c79c9932c3 e4a4f0f408bf",
 "astrology_mackerel:health": "8ddf7591e7e0 6bbbb46285c1 6671181d2aa8 1beaf2687600 d385b09c4704",
 "astrology_mackerel:ask": "631eeec5dfd0 fa12cdf604f2 9e3363ceb78c c34565b6d555 91f01265e663",
 "astrology_salmon:legacy": "8a76e447cc61 e25259181baa 82f8003fd788 87be10b85a00 86295650d714",
 "astrology_salmon:personal": "91da07d355b4 fe3e0be36318 13a34f39f8a5 86ca63e01edc 72ca7e92b68c",
 "astrology_salmon:compatibility": "2e454eacebbd 908f5317f6a6 d3bda2a0575d cae27db372b9 44ac79cc8a00",
 "astrology_salmon:work": "0721e9876abf 3d841be4fa37 4d726ffd6787 b3eb6204536f fff231879a7a",
 "astrology_salmon:health": "71732a16a04d 7a5236009204 1b9c7b984a93 ce8fc0ba6c08 20e4a60a5d0a",
 "astrology_salmon:ask": "42311c91b1c6 fb322cc8c7f0 20cde54cdaff a668f895a00f 72ca7e92b68c",
 "astrology_flounder:legacy": "a2efc96291f6 1430473d2427 af3dae4b8938 0f7e6ba31905 30093a83fd6a",
 "astrology_flounder:personal": "4ac0fb69d4e7 3a8f4ce6439a 8646b7326b5f e6d340adcb14 6c9e8804cea9",
 "astrology_flounder:compatibility": "d783f722df13 f52362ffb181 7e5b3909dc3d 159d2d78fad3 ec7069c5b342",
 "astrology_flounder:work": "44be169bcf65 11563e0e492c 5caccd1f5a5c 2c4120f140b5 39c8e4a84a00",
 "astrology_flounder:health": "585805418e52 57eb67d62e44 3682ef5450e3 153b7219e502 4d71440d56a5",
 "astrology_flounder:ask": "df51574722ab 0127c0096a5e 16df2ac5604e 602dd4e175c9 6c9e8804cea9",
 "astrology_tuna:legacy": "02b06023eff5 0aefa332436a 48fc71cec933 e1f1e060c194 448e1eeab4e4",
 "astrology_tuna:personal": "12b4149e79e3 a5f8bb080e3b ef5ead90e596 f7f85730e598 24cb225a6499",
 "astrology_tuna:compatibility": "90243a278a20 690bc6bdcbc7 bee51d197fe0 98225ca76a65 5a7751a54441",
 "astrology_tuna:work": "8d0e5d1bd6b0 b1314c5e4eae 8b9705d53541 5fe06d497a30 22515b7f0512",
 "astrology_tuna:health": "8d1af0567569 f23051b27f32 44f5a6fef9e7 bb5430e80905 d1a3aa0ef9a0",
 "astrology_tuna:ask": "8777a917b06b 5363e0f5d684 e5468df72bd2 413eb8287adf 24cb225a6499",
 "tarot_mackerel:legacy": "0e8ed6e4e08d f6340eccf496 f98faf403094 26e958a8af81 6aa275b457cb",
 "tarot_mackerel:choice": "e1271ef3af5d 3bc40c591add bf40ce71ea00 736e7500cde3 3040b60d8f9a",
 "tarot_mackerel:love": "3fc0a8526e33 59fe3551b087 e348c95f59c1 82b4fc1a5500 ec43dbbb0b03",
 "tarot_mackerel:feelings": "910b35fd6a9e 8c65eb50246a 0b66b3edc4c2 0c4d3a8013dd bc0e5ae95bf7",
 "tarot_mackerel:contact": "3ae7b73a21af 5f0ec5cd5ff4 07a3c37e7526 109961546d6c 21a5bd9065e1",
 "tarot_mackerel:reunion": "d3afa11c3a99 00379ad0fb72 fca39151883d 9bd24ef12b62 df15382a96e6",
 "tarot_mackerel:compatibility": "c31c91d1e638 e8fb547881cd a5ea6eda4268 afa8d7064c8b 4d861b98fe65",
 "tarot_mackerel:career": "bc444721b1b0 b484aa2e0d3d 09431dd5dfbd d7354b76cb67 13497923b755",
 "tarot_mackerel:money": "e2516b99e12f ad9bf5458fb6 7b195e653eec 3f195d9641a7 224b9c813d4f",
 "tarot_mackerel:healing": "a49657926574 02d7e26dc759 c9f86428de60 0affdf37eea6 1eb77aa56722",
 "tarot_salmon:legacy": "02a2113fb58f a336c02a80b4 8d7b66b9941a e4348e0c3bc7 c3a12d10a0fe",
 "tarot_salmon:choice": "22ad81699315 2719f160331c 8475d197242f fa865bbf3830 0847bd77ffd7",
 "tarot_salmon:love": "9ebc7bf82c5b bcdf1de2e43d 78b4445b063b 53d9676ffe2b 827911f6ce9f",
 "tarot_salmon:feelings": "5d0dc9176e81 eaf21fbf27df f4902a02705d e90a68ddb485 70b9d4e56209",
 "tarot_salmon:contact": "da70e4c43cf3 d3fa110367f9 f86178aec2ad f30bbe742031 4941803d57e7",
 "tarot_salmon:reunion": "81f6005fc885 bb284fa2a88f 467da575f361 1e56ad50dc19 44d11dd84fc6",
 "tarot_salmon:compatibility": "c483afc19fa5 9b36da6f1060 849f5bd5f23f 31826a4c452a d804ba957030",
 "tarot_salmon:career": "daae35abc7d3 eb1c0f2dceb2 391355092385 c031bfaddddf f46beb4fa9d6",
 "tarot_salmon:money": "808fdec17993 b694bfcbb545 01b1dcb1b27d b30ed18c75cd 21e2fafe34b6",
 "tarot_salmon:healing": "4f2eff4b855d 01cfb28dccc2 93ceefd0d937 2abf20d8aee1 430442c7d301",
 "tarot_flounder:legacy": "5bb33ea9da2c 08984488001c eb2e8bac8308 2e87e4b83f0b 200019185775",
 "tarot_flounder:choice": "e99e140779dc 75e33a7fd754 f3d1cf1db460 59f4247b9708 157bdc132835",
 "tarot_flounder:love": "4d17426f5fe6 49aa83f88d3c d1a37ab28c05 ec4ad01413ba cbc2d0bac5dd",
 "tarot_flounder:feelings": "66fc99f9e3ee a23a6ce72bb8 082e973bb43b 15c7f7083c70 155ee41a74e9",
 "tarot_flounder:contact": "1312e1e517ec e40b4f19193c 177d5d4c33f6 97d22f088430 a58662eaa3b3",
 "tarot_flounder:reunion": "fe59c2e78693 1bd62bccb8a1 be155fee4bbf 2b3b593d7efa 965f27fad840",
 "tarot_flounder:compatibility": "6bc29b34260f fd6464b022c5 341aca8676b1 cf82ce7040ba 0bf12194b51a",
 "tarot_flounder:career": "4a11d79dd748 678440edf033 512a7428767c 847667becfd2 d2acb7269ee1",
 "tarot_flounder:money": "0512f632f9fd 2a9a852a3269 14e1700338a4 63027624c785 21275b3046ea",
 "tarot_flounder:healing": "6eff81a01e07 741d1de57b38 8c5f114d6cf5 c31935325177 0f7fa52555e7",
 "tarot_tuna:legacy": "d752a896960b d37b61687ef7 9de224ff27d5 c8da201e064b cdfa81f3a8a1",
 "tarot_tuna:choice": "b10b6fda1154 090043f0ce7a 843015b1b175 63d3ecf62a4a e4dde4d5d80d",
 "tarot_tuna:love": "080da1df3506 4f7d83b7527d 383bdda6b9b2 577edc40f2f0 f40bb48c0c1e",
 "tarot_tuna:feelings": "777177460814 522ecb2b66ad ed3b4860aa94 4d589714a023 b25624fbfb68",
 "tarot_tuna:contact": "aaaf3c2a30d4 7d34028db4fd df47fa600c0a 63455c1efba3 570e72f29211",
 "tarot_tuna:reunion": "e301692fc335 453000d48465 386db0108cdb 2902a3112cb7 fc87f92e1b6c",
 "tarot_tuna:compatibility": "db2a0da1dbd3 2ff82e067530 969a94e13940 c4f89c83aa30 40fdc1754827",
 "tarot_tuna:career": "9f2b96b69e7e 0e977a00e084 01202cb5d4c2 b6ce71632f30 8b7cba3384f8",
 "tarot_tuna:money": "8c537b6a25d0 e234c9e3560b 3055e0ff6a1b f4fe4398c3e2 3f92ccf43eb9",
 "tarot_tuna:healing": "95237eaf1eb6 2f50739fb71b 908b4e0ad79a 7968e7e88f17 65e3551e850c",
 "fusion_saju_ziwei:legacy": "522ca417ff39 6bf3c7a5e670 97495a0e2472 bb786ec748a8 ed9d5b331bcd",
 "fusion_saju_ziwei:personal": "e51cc152f074 d7f64f0964f3 8cb6ec1eff54 407deb1f8e0b 1662aaf3878f",
 "fusion_saju_ziwei:ask": "f63ce39aeb48 0a087774ce04 ddaf71ac1b33 886cc30a8054 ed9d5b331bcd",
 "fusion_sukuyo_vedic:legacy": "82e9e4df560e 79e07546c434 bd5aca38f6a1 65006138c7af f5e2367a6a10",
 "fusion_sukuyo_vedic:personal": "5c87ec4b0518 b588b97998b4 add038024b7c 3b0df348e395 defabda6a501",
 "fusion_sukuyo_vedic:ask": "578ef34a776b 05cf735596a3 3b55a7c26caf 1cca47024a28 f5e2367a6a10",
 "fusion_astrology_tarot:legacy": "7c45247157ec 1f9bec3b6b3d e4a655997aac b6f325e14169 25e4aacb63c5",
 "fusion_astrology_tarot:personal": "d018fe943539 7db7540ba2ea c1e844b83b11 54d948ac3fba 656712d72276",
 "fusion_astrology_tarot:ask": "cf4f17e0b788 89b3eecd4037 0969084219a5 fcf3c834e894 25e4aacb63c5",
 "fusion_all:legacy": "9ac84fd14af9 b07225579748 8c2cc44a734e 4c749e7971c9 ff9dc0354606",
 "fusion_all:personal": "9adfb1e5f6c0 f55d14e9bdc6 67d0a2c9184f 736c2eae13b6 7dadcd23d71e",
 "fusion_all:ask": "bf3a8064c8b8 eb942314d3e3 9550f007ad7e 326ea9b03f26 ff9dc0354606",
 "saju_salmon@timeUnknown": "5426a2557336 5f0150c77595 28f0f1d43830 3cbca35fe723 -",
 "saju_salmon@timeUnknown:ask": "1344071d85ab a8ca6ef6fa24 f329c998fac4 446ce98d9b2d -",
 "ziwei_salmon@noPlace": "0f299ae8dbbf 2a520008301b 6a1d90ba29e4 58713471d73f -",
 "ziwei_salmon@noPlace:ask": "5dd073abf565 b54e3eab1296 d1f1e37e1540 1cd4c4dcea29 -",
 "saju_mackerel@spirit": "7030b70c907f ade0a9f1cdc2 cd0378aba330 c3b521dd1883 -"
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
