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
// D8 (2026-10-10): new snapshots carry chapterTimeoutPolicy (per-tier chapter timeout); only the prepare hash moves, requests/validated/manifests are unchanged.
// D7 (2026-10-10): fusion-book-v2 gives fusion products 28/36 chapters, so the 12 fusion rows move prepare/requests/validated. The mock fixture now writes a section's lead sentence once (longer D7 sections repeated it and tripped DUPLICATE_CHAPTER); that alone moves validated hashes and the request hashes of 9 pair rows whose mock repairs disappear. With the old fixture only the 12 fusion rows change.
// D (2026-10-10): the saju prevention packet sent to the model keeps only the current major luck, 10 years and 12 months it judges and states repeated candidate guides once,
// so the 27 saju prevention rows move only their request hash; stored facts, prepare, validated and manifests are unchanged.
// MO (2026-10-10): the ask first chapter sends a prompt copy whose values already in CALCULATED_DATA become references
// and whose provenance implied by the F/T source is stated once, so the 26 ask rows move only their request hash.
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
 "saju_mackerel:legacy": "6e349b9090e2 c6e363c8a93c d99a1a751ff2 1bfa36a7a76f 42f2c5c373fe",
 "saju_mackerel:personal": "4f5d6510d8a8 95a30afa4384 7c44eb174a95 16b2a44ce5be 8c9adb9e6d01",
 "saju_mackerel:compatibility": "6d5316fb339a 6e57aaa44e46 42f8ca35e8b4 55e83e57f700 163444337fa9",
 "saju_mackerel:love": "70c5b2fcb02f 3b9537dd83c6 98e24f235cca 98759f2fadc5 3e239ee154a7",
 "saju_mackerel:work": "544462ead054 1f9baaadbfd6 ef8d5d0487e0 581ab0f96374 1dfa9237efd8",
 "saju_mackerel:money": "17a13e55902f b722ed954acf e589bec7fcc0 5666783b6eb2 054738d4280d",
 "saju_mackerel:health": "926f57364e98 a57257edce67 33978de0fbe4 967f5197a983 6f349850e339",
 "saju_mackerel:marriage": "e4030cd9f2aa 3546827c3553 427dacd41b16 bc843a992f3d d0f64253c7e4",
 "saju_mackerel:movement": "77330f5a3baa daf0978fb8cb 5ca3145e98bd 80d30827a033 2629d158d3bf",
 "saju_mackerel:ask": "d5164b5c6528 90aed766f43c 257fc900853a 2d6a7faae292 b9cb87c20d32",
 "saju_salmon:legacy": "c4059953b1c4 91608c6e7efc 1835a5beca02 b65bb3226098 5a931b290957",
 "saju_salmon:personal": "4fad35d30e39 d5d5653b878a 2a21932b0b44 bef8e5fd5411 459c1c844aea",
 "saju_salmon:compatibility": "2fbc83ced648 1ff9a2a04c07 e9fb1ce435de cfecae67051c 5ee9aa8dd2ae",
 "saju_salmon:love": "4bb9738214c2 5069354c72d7 30e86cbc3399 478c31dcfa30 8fe7b01b938d",
 "saju_salmon:work": "147bc8320bfa 1be74836f9d7 590221e3729b fee54eeddbe0 fa41008e9044",
 "saju_salmon:money": "48307058160b 8b87f33ff3ef 7279018d20f3 3ae937379548 6ae138fbccb6",
 "saju_salmon:health": "f6b385b92a0f 3d44ffcd9aaf 4c5bb073dbf4 34a732fe9eb4 c2825221fee0",
 "saju_salmon:marriage": "0c15e4d1d0df f502b5582d3c a16082794675 16b2ab41b30a f9ab1067c762",
 "saju_salmon:movement": "2fcdc70d66e3 318c2b9fdc41 701ed5e0e4cd c45512ab2658 7dfcbf891f12",
 "saju_salmon:ask": "11530890db73 f3527762a1f8 be14f08cb76a 24a6fff0ee15 459c1c844aea",
 "saju_flounder:legacy": "2f03e9541f66 30d7e86db616 1365f1d3fde1 0e581c4b7ebb d0a1fba4b309",
 "saju_flounder:personal": "27847cb7453f ce61a3620f65 77eca9494a5c 7202471c0fa2 9092b43d5b23",
 "saju_flounder:compatibility": "d23151e45632 0083584f1c9a 28383e4f41b2 eb044b2a5703 3e8926b65705",
 "saju_flounder:love": "2d8501ac26fc 14ec5ee5cdd9 2d815bbe8198 f829576a3b46 703f985f1df5",
 "saju_flounder:work": "00a830fc552b 2e40e26bd73b c90436d489fa ba3aecfe9321 686fbc52450a",
 "saju_flounder:money": "b9cf42af5cac 7b85665b9098 b5b95b274a97 d19a9678745d 6c151b1de8ff",
 "saju_flounder:health": "3819175f0fff 1354809c36ce 539d736bdd3c 8abba083cbe9 1944e876aec8",
 "saju_flounder:marriage": "295b713484dc 096ff48df81f ac20794e7a0b 0fe21aaae3ab c9a479d092d3",
 "saju_flounder:movement": "f4862e9b8c23 2175c7cf0c43 6d1b8a87c806 a94f7fe5e878 caadd5f9127a",
 "saju_flounder:ask": "87bc8fe3f10d 9930e58edf08 48d0bcf865fe c8b9db36e8b0 9092b43d5b23",
 "saju_tuna:legacy": "356b024ce814 a3237bb533f9 4f5102d80216 8a1778e06f1d a19a748c8350",
 "saju_tuna:personal": "7d578af159f3 80f89b210519 835acfe4fde7 605d84b614cc 004fdfa8ed6a",
 "saju_tuna:compatibility": "f8642c297702 7ea076da6bae 420382d934d2 550fd61ed012 6e327a0ca069",
 "saju_tuna:timing": "18921fa9dc3a 2e366e38cfe1 197273263ce4 bfb0793d5f7f 410bef112275",
 "saju_tuna:love": "f0eaae6bc658 1adaafdb957a 2b3ac0e4eae9 5d5648c69990 135beac68a67",
 "saju_tuna:work": "c7d4fe25ba4b 3b988b0d0295 67999fb559f6 01bf24cba927 f96ef8e37722",
 "saju_tuna:money": "e83acdf4d7a6 7662a655961e 933654266724 1154a444601e d0bff6c53db5",
 "saju_tuna:health": "9acfae2ce6a0 1ba2f259f948 6a41f4af6c13 58addf6000cb 0ff921b2a8bb",
 "saju_tuna:marriage": "17fde381a0ce e4f4d654603b 1a3fd2685524 a9fcd9a9f51a 0ec0359f02ad",
 "saju_tuna:movement": "dc1bca68fda8 1c9a449c397e 2293866ba7f4 c2c416baef62 128d0b22895e",
 "saju_tuna:ask": "470fd152414b 889919b2e2cb 8665339b3880 f0eb36bd2df8 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "29742ed89149 e86f27195712 a8e67e158cf8 d8a434aa452d 2371774a80c3",
 "ziwei_mackerel:personal": "6cc29878e8f4 cfbf785b1026 be8918aa4651 53ee302f4422 4d36af752c53",
 "ziwei_mackerel:money": "8945757509f6 be829ed0e75e 6e04f7aa5e1c d44271a0176c 49682968473e",
 "ziwei_mackerel:business": "5315a99b5124 b32a25304eb0 c95e8cbcddec 7060854ef9b6 8760a0a3cb97",
 "ziwei_mackerel:love": "b08deb8bb7a5 026f11b51966 0834bf3cd1b9 7f70dcd84384 5263a982930a",
 "ziwei_mackerel:marriage": "171a4840e196 af944000d1d0 7fa3d9a8b682 b985d0d2986c 34fd69b9fa1a",
 "ziwei_mackerel:health": "fd750a86b434 ae457d9ed7ce 6abf6cf07b10 57d921266171 5c5632463fed",
 "ziwei_mackerel:compatibility": "475609ba3a21 a5cea1b3b47d 4d71bcb2258d d8030486c36a 18e9ddeda17d",
 "ziwei_mackerel:ask": "2ce3c28cea28 5463c706ab9c 4414e1968237 205d35a63f27 11a73d36d268",
 "ziwei_salmon:legacy": "4eba21beffe8 3c5bb8df045f 52efaf8af2ef 0923075ed97e 3fbe37463d18",
 "ziwei_salmon:personal": "182619b304b2 8534910da38e 6a1d90ba29e4 58713471d73f e53afa1fd005",
 "ziwei_salmon:money": "5cf3ff225d95 393da6bca938 1112ed294225 9d0611b725aa 5b9032100edd",
 "ziwei_salmon:business": "b9e70f75c588 84d9b932e69e d03fde48e41a b219f5302e25 6369360a3c1a",
 "ziwei_salmon:love": "5c701f74b891 0023024aa4b8 cd2dd4a0da88 531378441765 04b6c4bb9963",
 "ziwei_salmon:marriage": "47622e938dcf 2eb854590ce4 89aefa046ede 10583ed0b276 87adae473ea9",
 "ziwei_salmon:health": "26f94b2db815 446f25f81302 465e378e11f2 ad5aa8135f99 68bd7a6f8c8f",
 "ziwei_salmon:compatibility": "bd5a1739767f 09cff7f2d89a e12944e1abcd d55240acdca6 b2dde48c94ff",
 "ziwei_salmon:ask": "e6f8681435ac d89793ed62c1 bfe277dd2c1f 1cd4c4dcea29 e53afa1fd005",
 "ziwei_flounder:legacy": "012f25e16f38 c72a078c29f4 497ea5aec6a6 b2c7b3afe72b 9201b10cbef5",
 "ziwei_flounder:personal": "102b4e9ae7f3 2ce452b7eeb1 de1dad04441c d4b7c2bf8692 379f9e9c59c7",
 "ziwei_flounder:money": "4ceb2c62e792 b5779af340be 05f7ba1ceaa9 470d53599ed7 93ce966131ef",
 "ziwei_flounder:business": "7d35a09bfbd0 1467abdd2630 e8848a86d9ce fcca332dd55e f57c13332209",
 "ziwei_flounder:love": "0c45753b2686 73973c3e7654 a9205d64e1ff ccc2875965b7 3641d17b484b",
 "ziwei_flounder:marriage": "b6e02fd1749a f4bf5d49e7ab 8b8a46ea38e3 a901d000daeb 7617a833fc9e",
 "ziwei_flounder:health": "775e9c1581c0 e0b241ec19fe caf8ce4b95c5 0688fb3c21c3 583e184502b9",
 "ziwei_flounder:compatibility": "5336dfd3e6e2 878729a2940a 60504d002129 07144354163a 63bf3208b946",
 "ziwei_flounder:ask": "a50a6db1b065 b8be0e062d21 ab82c1ab3406 c457c5b7f2b6 379f9e9c59c7",
 "ziwei_tuna:legacy": "cd3c28740b2d 561345cb7910 76c31227ec3d 2483fb87f9c3 8d87087ff586",
 "ziwei_tuna:personal": "410661889360 617e58dfd974 f3b903087523 a01d494fcb5c 4f4beb638beb",
 "ziwei_tuna:money": "062748ca9df5 734e64cb4a49 88c405711678 1afff2b9f109 f3746b2a9fe7",
 "ziwei_tuna:business": "cf33dd97f67e 8f6680443541 8256a5ccb24c 6219fb91cfc5 ce52fe2adca8",
 "ziwei_tuna:love": "eb5564a368a4 7db34d8cc508 3a4e1524756b 70df6635a0b5 300807ac1eec",
 "ziwei_tuna:marriage": "873accb48a98 bf26c5122c0c f85603793911 edb8a0670249 93391b2a2e3b",
 "ziwei_tuna:health": "262fb7a38515 10ba451e05da 488092440ee3 449553b250d8 65bbc46fd5db",
 "ziwei_tuna:compatibility": "0c2f3fd7ba7b acdccb9675cf b37cbfcc87b3 f8c5cb661fd7 3edd1557eb29",
 "ziwei_tuna:ask": "7af1ae953142 91cb53570b2e cedcd691c8a2 04ede67128a0 4f4beb638beb",
 "sukuyo_mackerel:legacy": "c98f91daf034 4f4f7362fa62 d48839f7ef87 a449f043448f 09cac5e57c93",
 "sukuyo_mackerel:personal": "540fdaaed22b febc3b90a5a8 adb396b0921f 5d81d8861aed 60c2f71db056",
 "sukuyo_mackerel:compatibility": "9c37f9df5ccd 1fb5d92e5717 f4c10176cb37 7c8fbb017035 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "8daadcfae9b4 91a39d7c3515 18a0cf090d49 5f41f101797d 51c64f67c10e",
 "sukuyo_mackerel:ask": "3b5ab6faba21 65d1b70ea0bc 66e22c6439b9 a7911e46235a c1b4a3466991",
 "sukuyo_salmon:legacy": "a346632ae5b9 a6e55f4bc4e2 c380cee5df49 b72cfebdfe27 40764a5a48f1",
 "sukuyo_salmon:personal": "863336e61976 647671f26995 50490ea9297a 9a39b75ba869 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "0ccdf133cca1 c55681e9a08e 298884802e55 511fc07919d3 cc372c1aa463",
 "sukuyo_salmon:relationship": "ef726da94c1d 1bf90bb231c5 a0dd8af5c505 675515733d62 4a2ab417052e",
 "sukuyo_salmon:ask": "3e67f0cb3aae 3b0c323b7b7d 225c003808d0 777030280c73 c7963d52d5c2",
 "sukuyo_flounder:legacy": "091b2f61c49d d19d73956676 71f66c2aa232 a3a3c5ae25be 41630a4b9f1f",
 "sukuyo_flounder:personal": "1a83a81b3eb0 e87c5325585c afb61175e501 5134f933585f 337c369df170",
 "sukuyo_flounder:compatibility": "26ab2a0c3f1b 3309fbc11c81 ce32083522c3 52fb8c9bfc45 3b18417c9ffd",
 "sukuyo_flounder:relationship": "59452a618926 58b871ae3d9f beba0984cf79 39655e32eb1b b69fd6f8148e",
 "sukuyo_flounder:ask": "f591aaf79c2f bd9c3ab4bb48 a2eae6d84f49 8950a5fb9410 337c369df170",
 "sukuyo_tuna:legacy": "fc3bb70ae112 c464fd98237f 068fce50c364 90218cf2bfde bbdcc5db3d05",
 "sukuyo_tuna:personal": "d2255f58d54a c7af60566650 e0f1519811fd 70349d12137a 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "ad30c87bfdee 6f53a24c5b4c 4f4149c5c982 a47a1db94aa4 cf557e59d9fd",
 "sukuyo_tuna:relationship": "ccc767726a42 e7284a4319c3 37d3e72ba53e 80d8843d3e6e 6371bf908ad4",
 "sukuyo_tuna:ask": "7398acfb95e0 70f32d8be3f6 8df4ae436d24 e5cbd184afba 933a3eee4cc4",
 "vedic_mackerel:legacy": "601e9176b770 1d01c6b23f50 c1f27e3018a4 0096ff6a2f05 0ab96e7ba746",
 "vedic_mackerel:personal": "8ae8ab526eff 2d76cb87d0c5 41cccd74b53a b4ca340d4b5d 3b771e8d6049",
 "vedic_mackerel:compatibility": "c242718fc82f aa6c5124f329 941589399352 c60e004270a8 93639036c9de",
 "vedic_mackerel:health": "ce8ee9e924ed d30f4bb0222e 3cf6425fb85e a794e235952c 1d731a0d27b6",
 "vedic_mackerel:ask": "43877c0fd80c d72cac250469 310bcafbbcc6 f0c0f46def80 0f802baef856",
 "vedic_salmon:legacy": "1cf8d0c0d653 8369cbf3488c eb6fc2ae8f37 a84871023771 d832b44c39d3",
 "vedic_salmon:personal": "58d3b9b568dd 8e6cfb4abe71 00819d6238ee 6ac5773867ba 5474c6f3d686",
 "vedic_salmon:compatibility": "6b62cecab87f 3587c9a75220 69b0738d6364 67213258e2bb fa9d3f4db03e",
 "vedic_salmon:health": "35eb1b62abca 98609240443a e9933e59f67e e75680000a4b f88b928d0896",
 "vedic_salmon:ask": "4c1722747bbe acea2844af8d 7e82a054df68 c7eeedac1d4a 5474c6f3d686",
 "vedic_flounder:legacy": "6a0bea633287 6a8e8f0155d6 842a587bd0c5 4caa5f878224 f4c3879ba491",
 "vedic_flounder:personal": "abaf3b9494d7 6829149ec412 8a51208e7fdc 31af598f92b5 fc7c88f2f9c7",
 "vedic_flounder:compatibility": "8328560d474c 1b31c90cc9a9 4da1e6319d0a 68a0696b2005 42739f81cb7b",
 "vedic_flounder:health": "ee32023ada94 0aeec5164bcb 41ccc65d44f2 0ab77e276e4b 966635149b77",
 "vedic_flounder:ask": "954cf2dfaf7c 5d8576f9aff1 ac7b783c0b5f fa3757e16cf0 fc7c88f2f9c7",
 "vedic_tuna:legacy": "0eb28fa5e6ea eb7fc10d0486 3a2d2190eeda 4ff2f14f79e8 9a50bce25627",
 "vedic_tuna:personal": "4327a12db79b fb438261fb31 976110d1ee18 4eeee8d91d64 621ad1cb46ba",
 "vedic_tuna:compatibility": "58273a8ae81d e75bc094fa21 fb9e211b6d15 d205043cd2a7 81b70a1080b0",
 "vedic_tuna:timing": "188577efe11d ab2a87464575 54722b73dc4e 057a78489289 d48d8fcb6c1c",
 "vedic_tuna:health": "498eae4d0156 30d4a84a2a4b 214690c96604 5074bb2df060 2c61521bdda7",
 "vedic_tuna:ask": "421d2289a789 96b20846d861 b7bdb77d7b06 841aaf39ded3 621ad1cb46ba",
 "astrology_mackerel:legacy": "e9599ad3b02d 5667d020ce45 e1a378037d7a 35ad5816864e a01f7e3b5491",
 "astrology_mackerel:personal": "9712f50a0f82 52a8c5e44422 8bf673490b31 13ba36c1e3e4 97192bfd920b",
 "astrology_mackerel:compatibility": "613543aa8e7b fe37815cda86 c0f240661b27 d1a94dd80f87 947276fd4fb0",
 "astrology_mackerel:work": "dab8f72df97a 5945409e8cc6 261bc327291c baa45aa47698 e4a4f0f408bf",
 "astrology_mackerel:health": "8ddf7591e7e0 5f29f116be0c 6671181d2aa8 a193b0b8f149 d385b09c4704",
 "astrology_mackerel:ask": "631eeec5dfd0 9676beb61697 200c34a26db5 612e843cb82e 91f01265e663",
 "astrology_salmon:legacy": "8a76e447cc61 3321b06849bc 82f8003fd788 e2d178efdaee 86295650d714",
 "astrology_salmon:personal": "91da07d355b4 2a9e025accb8 13a34f39f8a5 86ca63e01edc 72ca7e92b68c",
 "astrology_salmon:compatibility": "2e454eacebbd f35efcd06d65 e3eb5d3fa277 fa60dc20a202 44ac79cc8a00",
 "astrology_salmon:work": "0721e9876abf b223e7cb0260 4d726ffd6787 cd8d5297ecdb fff231879a7a",
 "astrology_salmon:health": "71732a16a04d 355d136756fa 1b9c7b984a93 0a10ab0d29f0 20e4a60a5d0a",
 "astrology_salmon:ask": "42311c91b1c6 b9966261bd46 9eab401df78d a668f895a00f 72ca7e92b68c",
 "astrology_flounder:legacy": "a2efc96291f6 76e155c13959 af3dae4b8938 0f7e6ba31905 30093a83fd6a",
 "astrology_flounder:personal": "4ac0fb69d4e7 0af481784147 8646b7326b5f e6d340adcb14 6c9e8804cea9",
 "astrology_flounder:compatibility": "d783f722df13 3cc56b8381a1 7e5b3909dc3d b65345602c55 ec7069c5b342",
 "astrology_flounder:work": "44be169bcf65 1f93c4cb8676 5caccd1f5a5c 2c4120f140b5 39c8e4a84a00",
 "astrology_flounder:health": "585805418e52 d1ac81e52685 3682ef5450e3 153b7219e502 4d71440d56a5",
 "astrology_flounder:ask": "df51574722ab 7debe3d088e1 533eebaa74dc 602dd4e175c9 6c9e8804cea9",
 "astrology_tuna:legacy": "02b06023eff5 3a0086a3a37f 48fc71cec933 a7c402d39a0b 448e1eeab4e4",
 "astrology_tuna:personal": "12b4149e79e3 4bb320256cb1 ef5ead90e596 f7f85730e598 24cb225a6499",
 "astrology_tuna:compatibility": "90243a278a20 09978260891f 8a4775d65ef8 c5ab256d00aa 5a7751a54441",
 "astrology_tuna:work": "8d0e5d1bd6b0 30eebdef5c5c 8b9705d53541 f5192dd36591 22515b7f0512",
 "astrology_tuna:health": "8d1af0567569 2e202b03b1f8 44f5a6fef9e7 e15fcff350cb d1a3aa0ef9a0",
 "astrology_tuna:ask": "8777a917b06b ad4fc376aefc 0893c26c6efd 413eb8287adf 24cb225a6499",
 "tarot_mackerel:legacy": "0e8ed6e4e08d 7a8f968dec53 f98faf403094 ba44c1332ca9 6aa275b457cb",
 "tarot_mackerel:choice": "e1271ef3af5d 1609e1dccc64 bf40ce71ea00 c6d110f4cf29 3040b60d8f9a",
 "tarot_mackerel:love": "3fc0a8526e33 a8a30a50c4a0 e348c95f59c1 9af4e3199486 ec43dbbb0b03",
 "tarot_mackerel:feelings": "910b35fd6a9e 1086cab90acd 0b66b3edc4c2 d2f92c4c53e8 bc0e5ae95bf7",
 "tarot_mackerel:contact": "3ae7b73a21af 44f118f36c94 07a3c37e7526 4ee3c2c06bec 21a5bd9065e1",
 "tarot_mackerel:reunion": "d3afa11c3a99 7a4a3ff61ad0 fca39151883d 9fa9d19a0d4f df15382a96e6",
 "tarot_mackerel:compatibility": "c31c91d1e638 24fac15d9513 a5ea6eda4268 4bd28c918692 4d861b98fe65",
 "tarot_mackerel:career": "bc444721b1b0 169f71962960 09431dd5dfbd 3c33bc383612 13497923b755",
 "tarot_mackerel:money": "e2516b99e12f b9f6737d5c91 7b195e653eec 63c03e027386 224b9c813d4f",
 "tarot_mackerel:healing": "a49657926574 a8365af62021 c9f86428de60 a1427bceda16 1eb77aa56722",
 "tarot_salmon:legacy": "02a2113fb58f 815c13787684 8d7b66b9941a aec1c40187eb c3a12d10a0fe",
 "tarot_salmon:choice": "22ad81699315 a075d71ef49d 8475d197242f fa865bbf3830 0847bd77ffd7",
 "tarot_salmon:love": "9ebc7bf82c5b ace576f5a653 78b4445b063b 53d9676ffe2b 827911f6ce9f",
 "tarot_salmon:feelings": "5d0dc9176e81 bfa9a17e3f96 f4902a02705d e90a68ddb485 70b9d4e56209",
 "tarot_salmon:contact": "da70e4c43cf3 32ecd8cab61a f86178aec2ad f30bbe742031 4941803d57e7",
 "tarot_salmon:reunion": "81f6005fc885 141e1d8f1fdc 467da575f361 1e56ad50dc19 44d11dd84fc6",
 "tarot_salmon:compatibility": "c483afc19fa5 2cb6ee590a03 849f5bd5f23f 31826a4c452a d804ba957030",
 "tarot_salmon:career": "daae35abc7d3 9ca397526ec4 391355092385 c031bfaddddf f46beb4fa9d6",
 "tarot_salmon:money": "808fdec17993 bd156ba83f63 01b1dcb1b27d b30ed18c75cd 21e2fafe34b6",
 "tarot_salmon:healing": "4f2eff4b855d 81d1a969b6da 93ceefd0d937 2abf20d8aee1 430442c7d301",
 "tarot_flounder:legacy": "5bb33ea9da2c 90261ad2a09a eb2e8bac8308 2e87e4b83f0b 200019185775",
 "tarot_flounder:choice": "e99e140779dc 5b41751b4169 f3d1cf1db460 59f4247b9708 157bdc132835",
 "tarot_flounder:love": "4d17426f5fe6 dec5eba73ae0 d1a37ab28c05 ec4ad01413ba cbc2d0bac5dd",
 "tarot_flounder:feelings": "66fc99f9e3ee 7cdcc721c1e3 082e973bb43b 15c7f7083c70 155ee41a74e9",
 "tarot_flounder:contact": "1312e1e517ec d1de2a068bb5 177d5d4c33f6 97d22f088430 a58662eaa3b3",
 "tarot_flounder:reunion": "fe59c2e78693 1d2588d32728 be155fee4bbf 2b3b593d7efa 965f27fad840",
 "tarot_flounder:compatibility": "6bc29b34260f 87e49a8a7cff 341aca8676b1 cf82ce7040ba 0bf12194b51a",
 "tarot_flounder:career": "4a11d79dd748 0deb11e38017 512a7428767c 847667becfd2 d2acb7269ee1",
 "tarot_flounder:money": "0512f632f9fd 7fcbc334db6c 14e1700338a4 63027624c785 21275b3046ea",
 "tarot_flounder:healing": "6eff81a01e07 46ee076343a0 8c5f114d6cf5 c31935325177 0f7fa52555e7",
 "tarot_tuna:legacy": "d752a896960b 03e953f1a54a 9de224ff27d5 c8da201e064b cdfa81f3a8a1",
 "tarot_tuna:choice": "b10b6fda1154 21979edb8982 843015b1b175 49fec8428427 e4dde4d5d80d",
 "tarot_tuna:love": "080da1df3506 ebcc11a5972d 383bdda6b9b2 577edc40f2f0 f40bb48c0c1e",
 "tarot_tuna:feelings": "777177460814 359483434cde ed3b4860aa94 4d589714a023 b25624fbfb68",
 "tarot_tuna:contact": "aaaf3c2a30d4 23c04b45472f df47fa600c0a 63455c1efba3 570e72f29211",
 "tarot_tuna:reunion": "e301692fc335 193b141584d5 386db0108cdb 2902a3112cb7 fc87f92e1b6c",
 "tarot_tuna:compatibility": "db2a0da1dbd3 fb5cc7215754 969a94e13940 c4f89c83aa30 40fdc1754827",
 "tarot_tuna:career": "9f2b96b69e7e 4ac3503f2010 01202cb5d4c2 b6ce71632f30 8b7cba3384f8",
 "tarot_tuna:money": "8c537b6a25d0 c791ed220a96 3055e0ff6a1b f4fe4398c3e2 3f92ccf43eb9",
 "tarot_tuna:healing": "95237eaf1eb6 9df793bdf36a 908b4e0ad79a 7968e7e88f17 65e3551e850c",
 "fusion_saju_ziwei:legacy": "522ca417ff39 1fb25c5c22ae 61591d4245ab 909e337ffe8d ed9d5b331bcd",
 "fusion_saju_ziwei:personal": "e51cc152f074 1a63af4ed028 8279f54470be 43f74c17dd37 1662aaf3878f",
 "fusion_saju_ziwei:ask": "f63ce39aeb48 115f2c7f3fb5 313c8042d1c8 b279f04ff432 ed9d5b331bcd",
 "fusion_sukuyo_vedic:legacy": "82e9e4df560e 92886c0adc63 21bc8e9a3a21 c7ecd03a5f7a f5e2367a6a10",
 "fusion_sukuyo_vedic:personal": "5c87ec4b0518 6d46657e5064 52da992f5fe2 74b3e0a99b92 defabda6a501",
 "fusion_sukuyo_vedic:ask": "578ef34a776b dc0dc060c4cf a77ad9d33428 fc57db8a179d f5e2367a6a10",
 "fusion_astrology_tarot:legacy": "7c45247157ec 634f61c4195e 4145c1643488 1d38eddff911 25e4aacb63c5",
 "fusion_astrology_tarot:personal": "d018fe943539 902b80ce3666 2b67a289afa4 b01d5662ab3e 656712d72276",
 "fusion_astrology_tarot:ask": "cf4f17e0b788 cdff7292f283 633dc9f1e9fd 3ee00573e4c2 25e4aacb63c5",
 "fusion_all:legacy": "9ac84fd14af9 b6bd1438118b feb88d038f7f 046717a921f1 ff9dc0354606",
 "fusion_all:personal": "9adfb1e5f6c0 cd505786d0c6 5ed34b7d7893 d0c5b9a3db67 7dadcd23d71e",
 "fusion_all:ask": "bf3a8064c8b8 494e44b4d0e8 61acadaf21ac 7c72dff7626b ff9dc0354606",
 "saju_salmon@timeUnknown": "5426a2557336 f58a0b54452c 28f0f1d43830 3cbca35fe723 -",
 "saju_salmon@timeUnknown:ask": "1344071d85ab 09524aa5a670 b6907a6b2d81 446ce98d9b2d -",
 "ziwei_salmon@noPlace": "0f299ae8dbbf 118e7d7fd4c8 6a1d90ba29e4 58713471d73f -",
 "ziwei_salmon@noPlace:ask": "5dd073abf565 54b61b336302 bfe277dd2c1f 1cd4c4dcea29 -",
 "saju_mackerel@spirit": "7030b70c907f 8d8835db08e5 cd0378aba330 c3b521dd1883 -"
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
