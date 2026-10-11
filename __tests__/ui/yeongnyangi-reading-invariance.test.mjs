import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
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
// Fusion stage A (2026-10-11): saju gains tenGodsByPillar.summary and luckOverlap (대운×세운·월운), Ziwei palaces/yearly rows carry
// 대궁·삼합 relations, tarot cards carry a timeFrame without image fields, fusion ask chapters read the requested period (timeScope)
// while the others read the stored year, the fusion ask ch1 title names the question, askPromptView keys rows by name, and
// bodyPalace is forced only into self/wealth chapters. 98 rows move: every one moves requests; 19 move prepare (the four fusion-v2
// products and the saju legacy/ask rows whose base group gained the summary), 13 validated, and the 6 saju·ziwei fusion rows manifests. ids stay.
// Fusion stage C (2026-10-11): prompt copies of seasonalBalance/strengthHeuristic carry words instead of scores, ASK_PERIOD_GUIDE keeps
// tarot positions out of the calendar, fusion chapters gain a per-chapter timeContract, systemSlots, claimLedger and the prevention
// anchor contract with ranked candidates, and fusion layouts ask for 80% of the target low. 66 rows move requests (every saju row, every
// ask row, the four fusion-v2 products); the 12 fusion-v2 rows also move prepare (manifest minimumChars). validated, manifests and ids stay.
// Tarot discipline (2026-10-11): tarot chapters keep the answer chapter's conclusion, list the spread only in the positions
// chapter, use the deck's card names and the persona voice, and take timing from the cards. Merged over fusion stage A/C,
// the 46 tarot rows move requests only; prepare, validated, manifests and ids stay.
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
 "saju_mackerel:legacy": "17d4b4370666 27dc5b5899c7 33e2225e92ce 1bfa36a7a76f 42f2c5c373fe",
 "saju_mackerel:personal": "0264bf313263 1897baa34567 5d605f7d2eac 16b2a44ce5be 8c9adb9e6d01",
 "saju_mackerel:compatibility": "74956a1ec8e6 83a583d656e4 8ac288ec006a 55e83e57f700 163444337fa9",
 "saju_mackerel:love": "5f00fa3f2a1e d286aa80e41c c70d6515c305 98759f2fadc5 3e239ee154a7",
 "saju_mackerel:work": "f5085ad62db4 31a612339e2b ef8d5d0487e0 581ab0f96374 1dfa9237efd8",
 "saju_mackerel:money": "806c27287df6 dbc2fe74d128 e589bec7fcc0 5666783b6eb2 054738d4280d",
 "saju_mackerel:health": "4aea95dfb327 3d660c1c9957 f8f859a875a7 967f5197a983 6f349850e339",
 "saju_mackerel:marriage": "83dbe19f17af 7e42e9dd6114 427dacd41b16 bc843a992f3d d0f64253c7e4",
 "saju_mackerel:movement": "1054443973c0 fdb1f5dc857c 5ca3145e98bd 80d30827a033 2629d158d3bf",
 "saju_mackerel:ask": "7b67eab278bf add58811cf56 57e844320da0 2d6a7faae292 b9cb87c20d32",
 "saju_salmon:legacy": "df9cca2a2048 9c3b8d06ae5a c8e1fc7456b7 b65bb3226098 5a931b290957",
 "saju_salmon:personal": "29a0f40357b5 48d7cf79f7a5 4ef6d6e9c826 bef8e5fd5411 459c1c844aea",
 "saju_salmon:compatibility": "acec09214c7f 3afdd1cc4e04 2d71b2c5f715 cfecae67051c 5ee9aa8dd2ae",
 "saju_salmon:love": "c07f53b1b095 2f4fc5ed76f1 9268b50c2994 478c31dcfa30 8fe7b01b938d",
 "saju_salmon:work": "6e66479225b8 15e263bafbe3 db6cf4956034 fee54eeddbe0 fa41008e9044",
 "saju_salmon:money": "e5fd2aa1932b 3abf8769393b a0f71ed9d012 3ae937379548 6ae138fbccb6",
 "saju_salmon:health": "bde7d7b20f20 e1405c658fc5 aeaf20a1f5ab 34a732fe9eb4 c2825221fee0",
 "saju_salmon:marriage": "61c1c8975683 04002cf970f1 a16082794675 16b2ab41b30a f9ab1067c762",
 "saju_salmon:movement": "a8362587312c b6af18ea6888 701ed5e0e4cd c45512ab2658 7dfcbf891f12",
 "saju_salmon:ask": "4a76bfbf2d51 643d989053fb 20ec482f5683 24a6fff0ee15 459c1c844aea",
 "saju_flounder:legacy": "2f03e9541f66 815140370848 357d027f5e23 0e581c4b7ebb d0a1fba4b309",
 "saju_flounder:personal": "27847cb7453f ce61a3620f65 52a5db9ac3a8 7202471c0fa2 9092b43d5b23",
 "saju_flounder:compatibility": "d23151e45632 0083584f1c9a 1db46706013c eb044b2a5703 3e8926b65705",
 "saju_flounder:love": "2d8501ac26fc 14ec5ee5cdd9 635e0e71cef6 f829576a3b46 703f985f1df5",
 "saju_flounder:work": "00a830fc552b 2e40e26bd73b c3fae56bf56f ba3aecfe9321 686fbc52450a",
 "saju_flounder:money": "b9cf42af5cac 7b85665b9098 ef2382589df8 d19a9678745d 6c151b1de8ff",
 "saju_flounder:health": "3819175f0fff 1354809c36ce fd3589ae6dda 8abba083cbe9 1944e876aec8",
 "saju_flounder:marriage": "295b713484dc 096ff48df81f 5b3aff3bcc31 0fe21aaae3ab c9a479d092d3",
 "saju_flounder:movement": "f4862e9b8c23 2175c7cf0c43 c32431b7948c a94f7fe5e878 caadd5f9127a",
 "saju_flounder:ask": "87bc8fe3f10d 901d1dbe2464 ddced45ea61a c8b9db36e8b0 9092b43d5b23",
 "saju_tuna:legacy": "356b024ce814 25bb21721171 abca47e2ad0f 8c4ab04cadea a19a748c8350",
 "saju_tuna:personal": "7d578af159f3 80f89b210519 3b93348ef5d6 605d84b614cc 004fdfa8ed6a",
 "saju_tuna:compatibility": "f8642c297702 7ea076da6bae 384fdd289f2b 550fd61ed012 6e327a0ca069",
 "saju_tuna:timing": "18921fa9dc3a 2e366e38cfe1 1859a58b6ab9 bfb0793d5f7f 410bef112275",
 "saju_tuna:love": "f0eaae6bc658 1adaafdb957a 82decdc75d0f 5d5648c69990 135beac68a67",
 "saju_tuna:work": "c7d4fe25ba4b 3b988b0d0295 59f4290cf3da 01bf24cba927 f96ef8e37722",
 "saju_tuna:money": "e83acdf4d7a6 7662a655961e 092e956124c5 1154a444601e d0bff6c53db5",
 "saju_tuna:health": "9acfae2ce6a0 1ba2f259f948 6e400f497bcd 58addf6000cb 0ff921b2a8bb",
 "saju_tuna:marriage": "17fde381a0ce e4f4d654603b 1f9517e219e6 a9fcd9a9f51a 0ec0359f02ad",
 "saju_tuna:movement": "dc1bca68fda8 1c9a449c397e b750aa6b567c c2c416baef62 128d0b22895e",
 "saju_tuna:ask": "470fd152414b 0dd81071b7e0 e8f673982c67 f0eb36bd2df8 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "3421c7f7caca 2a51e5192648 f6e64ab5c19c d8a434aa452d 2371774a80c3",
 "ziwei_mackerel:personal": "7d29c1ed4c4c 2fce7bc44aed 2af5ea009f05 53ee302f4422 4d36af752c53",
 "ziwei_mackerel:money": "9f434cfdd67b b2aac8a0bb48 3a59478229bb d44271a0176c 49682968473e",
 "ziwei_mackerel:business": "34c0a816b97f 2acef58a2ff6 fe526ad7b543 7060854ef9b6 8760a0a3cb97",
 "ziwei_mackerel:love": "7242682dd7d2 f2a264d2fdab 0834bf3cd1b9 7f70dcd84384 5263a982930a",
 "ziwei_mackerel:marriage": "fe5c435d3404 f98015349d42 7fa3d9a8b682 b985d0d2986c 34fd69b9fa1a",
 "ziwei_mackerel:health": "39ea5619644f 7e8cccff8ef9 3c966f1b256a 57d921266171 5c5632463fed",
 "ziwei_mackerel:compatibility": "efb69088990d 3141e0bbd9bf 4d71bcb2258d d8030486c36a 18e9ddeda17d",
 "ziwei_mackerel:ask": "bf707be7935c 8c4c6e195498 c63fb1b92199 205d35a63f27 11a73d36d268",
 "ziwei_salmon:legacy": "e39e3795ddec fe30f2111f36 96f42eb971c3 0923075ed97e 3fbe37463d18",
 "ziwei_salmon:personal": "db41263d081f 496710bddbd8 dce461d7dfff 58713471d73f e53afa1fd005",
 "ziwei_salmon:money": "3727e62dc338 f2acd5e6c0fe 313abba753f0 9d0611b725aa 5b9032100edd",
 "ziwei_salmon:business": "128b8bee3ddf 74c80829ae42 98f6dc0570ef b219f5302e25 6369360a3c1a",
 "ziwei_salmon:love": "93fd1963f55d ca2787c25b44 cd2dd4a0da88 531378441765 04b6c4bb9963",
 "ziwei_salmon:marriage": "0b6301e7a62a c8c39790b428 89aefa046ede 10583ed0b276 87adae473ea9",
 "ziwei_salmon:health": "ad5a720a47fd 83aff43b9f43 5995533bfc6c ad5aa8135f99 68bd7a6f8c8f",
 "ziwei_salmon:compatibility": "6ea32f14ae60 9871c99a304b e12944e1abcd d55240acdca6 b2dde48c94ff",
 "ziwei_salmon:ask": "c89541ac34df 6d4aaab5781d 71c22914ce41 1cd4c4dcea29 e53afa1fd005",
 "ziwei_flounder:legacy": "012f25e16f38 c72a078c29f4 f52e50d9a6f3 b2c7b3afe72b 9201b10cbef5",
 "ziwei_flounder:personal": "102b4e9ae7f3 2ce452b7eeb1 fb4b5d69d2b2 d4b7c2bf8692 379f9e9c59c7",
 "ziwei_flounder:money": "4ceb2c62e792 b5779af340be b176a1642112 470d53599ed7 93ce966131ef",
 "ziwei_flounder:business": "7d35a09bfbd0 1467abdd2630 92167754fd7f fcca332dd55e f57c13332209",
 "ziwei_flounder:love": "0c45753b2686 73973c3e7654 a9205d64e1ff ccc2875965b7 3641d17b484b",
 "ziwei_flounder:marriage": "b6e02fd1749a f4bf5d49e7ab 8b8a46ea38e3 a901d000daeb 7617a833fc9e",
 "ziwei_flounder:health": "775e9c1581c0 e0b241ec19fe 3dc7455a43f9 0688fb3c21c3 583e184502b9",
 "ziwei_flounder:compatibility": "5336dfd3e6e2 878729a2940a 60504d002129 07144354163a 63bf3208b946",
 "ziwei_flounder:ask": "a50a6db1b065 b8be0e062d21 cd782a19b3c6 c457c5b7f2b6 379f9e9c59c7",
 "ziwei_tuna:legacy": "cd3c28740b2d 561345cb7910 9d7ce34fc862 2483fb87f9c3 8d87087ff586",
 "ziwei_tuna:personal": "410661889360 617e58dfd974 ef5577dbea73 a01d494fcb5c 4f4beb638beb",
 "ziwei_tuna:money": "062748ca9df5 734e64cb4a49 7442c9c9275b 1afff2b9f109 f3746b2a9fe7",
 "ziwei_tuna:business": "cf33dd97f67e 8f6680443541 81da2799b0da 6219fb91cfc5 ce52fe2adca8",
 "ziwei_tuna:love": "eb5564a368a4 7db34d8cc508 3a4e1524756b 70df6635a0b5 300807ac1eec",
 "ziwei_tuna:marriage": "873accb48a98 bf26c5122c0c f85603793911 edb8a0670249 93391b2a2e3b",
 "ziwei_tuna:health": "262fb7a38515 10ba451e05da 301788d03e1a 449553b250d8 65bbc46fd5db",
 "ziwei_tuna:compatibility": "0c2f3fd7ba7b acdccb9675cf b37cbfcc87b3 f8c5cb661fd7 3edd1557eb29",
 "ziwei_tuna:ask": "7af1ae953142 91cb53570b2e 1f2a86528e79 04ede67128a0 4f4beb638beb",
 "sukuyo_mackerel:legacy": "8a7d6dfb497f 69b7f3e0989c d48839f7ef87 a449f043448f 09cac5e57c93",
 "sukuyo_mackerel:personal": "674e65f1d244 4dc6eefea821 adb396b0921f 5d81d8861aed 60c2f71db056",
 "sukuyo_mackerel:compatibility": "37a149f9ba90 38311e97732b f4c10176cb37 7c8fbb017035 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "72785fd6ad77 e867511a9baa 18a0cf090d49 5f41f101797d 51c64f67c10e",
 "sukuyo_mackerel:ask": "6df86302ac1b 4e33574740be cb9d3cdaded4 a7911e46235a c1b4a3466991",
 "sukuyo_salmon:legacy": "05cec69159dc c5108c128f27 c380cee5df49 b72cfebdfe27 40764a5a48f1",
 "sukuyo_salmon:personal": "e42361f90997 2df5118ea086 50490ea9297a 9a39b75ba869 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "1f0a676491f6 fa83c4678c2f 298884802e55 511fc07919d3 cc372c1aa463",
 "sukuyo_salmon:relationship": "74133dba9085 7924f0b21a8e a0dd8af5c505 675515733d62 4a2ab417052e",
 "sukuyo_salmon:ask": "68365e58c63c 5e4cf78a6185 e06c49094b33 777030280c73 c7963d52d5c2",
 "sukuyo_flounder:legacy": "091b2f61c49d d19d73956676 71f66c2aa232 a3a3c5ae25be 41630a4b9f1f",
 "sukuyo_flounder:personal": "1a83a81b3eb0 e87c5325585c afb61175e501 5134f933585f 337c369df170",
 "sukuyo_flounder:compatibility": "26ab2a0c3f1b 3309fbc11c81 ce32083522c3 52fb8c9bfc45 3b18417c9ffd",
 "sukuyo_flounder:relationship": "59452a618926 58b871ae3d9f beba0984cf79 39655e32eb1b b69fd6f8148e",
 "sukuyo_flounder:ask": "f591aaf79c2f bd9c3ab4bb48 fbd72b47f209 8950a5fb9410 337c369df170",
 "sukuyo_tuna:legacy": "fc3bb70ae112 c464fd98237f 068fce50c364 90218cf2bfde bbdcc5db3d05",
 "sukuyo_tuna:personal": "d2255f58d54a c7af60566650 e0f1519811fd 70349d12137a 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "ad30c87bfdee 6f53a24c5b4c 4f4149c5c982 a47a1db94aa4 cf557e59d9fd",
 "sukuyo_tuna:relationship": "ccc767726a42 e7284a4319c3 37d3e72ba53e 80d8843d3e6e 6371bf908ad4",
 "sukuyo_tuna:ask": "7398acfb95e0 70f32d8be3f6 b2010bbc6af6 e5cbd184afba 933a3eee4cc4",
 "vedic_mackerel:legacy": "edd7510e71ce 2c2119dfc633 c1f27e3018a4 0096ff6a2f05 0ab96e7ba746",
 "vedic_mackerel:personal": "df0353e2206d 6d60579587d5 41cccd74b53a b4ca340d4b5d 3b771e8d6049",
 "vedic_mackerel:compatibility": "7e379bb43a59 dbc9f7d0d7e7 941589399352 c60e004270a8 93639036c9de",
 "vedic_mackerel:health": "c63bcff07c33 1e428569a354 3cf6425fb85e a794e235952c 1d731a0d27b6",
 "vedic_mackerel:ask": "e3b00156e5cb 456703b7620e 72cc326c9a9d f0c0f46def80 0f802baef856",
 "vedic_salmon:legacy": "a5791c5bc7b9 2572335ad87d eb6fc2ae8f37 a84871023771 d832b44c39d3",
 "vedic_salmon:personal": "59d84b1e9046 2b4efa160de7 00819d6238ee 6ac5773867ba 5474c6f3d686",
 "vedic_salmon:compatibility": "91156f859b6e 3b4854ea706c 69b0738d6364 67213258e2bb fa9d3f4db03e",
 "vedic_salmon:health": "43feb4672b6b 43a19c572ee2 e9933e59f67e e75680000a4b f88b928d0896",
 "vedic_salmon:ask": "2f641694ec7e 948a9b16b74b f1138ef2abf4 c7eeedac1d4a 5474c6f3d686",
 "vedic_flounder:legacy": "6a0bea633287 6a8e8f0155d6 842a587bd0c5 4caa5f878224 f4c3879ba491",
 "vedic_flounder:personal": "abaf3b9494d7 6829149ec412 8a51208e7fdc 31af598f92b5 fc7c88f2f9c7",
 "vedic_flounder:compatibility": "8328560d474c 1b31c90cc9a9 4da1e6319d0a 68a0696b2005 42739f81cb7b",
 "vedic_flounder:health": "ee32023ada94 0aeec5164bcb 41ccc65d44f2 0ab77e276e4b 966635149b77",
 "vedic_flounder:ask": "954cf2dfaf7c 5d8576f9aff1 3151d7a3c87e fa3757e16cf0 fc7c88f2f9c7",
 "vedic_tuna:legacy": "0eb28fa5e6ea eb7fc10d0486 3a2d2190eeda 4ff2f14f79e8 9a50bce25627",
 "vedic_tuna:personal": "4327a12db79b fb438261fb31 976110d1ee18 4eeee8d91d64 621ad1cb46ba",
 "vedic_tuna:compatibility": "58273a8ae81d e75bc094fa21 fb9e211b6d15 d205043cd2a7 81b70a1080b0",
 "vedic_tuna:timing": "188577efe11d ab2a87464575 54722b73dc4e 057a78489289 d48d8fcb6c1c",
 "vedic_tuna:health": "498eae4d0156 30d4a84a2a4b 214690c96604 5074bb2df060 2c61521bdda7",
 "vedic_tuna:ask": "421d2289a789 96b20846d861 8d4775300575 841aaf39ded3 621ad1cb46ba",
 "astrology_mackerel:legacy": "9177825a2e05 83895df8e6c3 e1a378037d7a 35ad5816864e a01f7e3b5491",
 "astrology_mackerel:personal": "e2ff38e2b92c 0a0a76bb8fd4 8bf673490b31 13ba36c1e3e4 97192bfd920b",
 "astrology_mackerel:compatibility": "2109561ab4ac 60927d633f29 c0f240661b27 d1a94dd80f87 947276fd4fb0",
 "astrology_mackerel:work": "8cae3762a770 fcef006d9c45 261bc327291c baa45aa47698 e4a4f0f408bf",
 "astrology_mackerel:health": "cfaad4b5e540 eaac7b5264c6 6671181d2aa8 a193b0b8f149 d385b09c4704",
 "astrology_mackerel:ask": "aac2659ea7fc 5e2539af0bcd 69fc6b9b3318 612e843cb82e 91f01265e663",
 "astrology_salmon:legacy": "ec31dbab4bbd 8a5356fe654e 82f8003fd788 e2d178efdaee 86295650d714",
 "astrology_salmon:personal": "1ede2df85a5c 5119d6866012 13a34f39f8a5 86ca63e01edc 72ca7e92b68c",
 "astrology_salmon:compatibility": "62dcb9e24ee6 3fdea2623a11 e3eb5d3fa277 fa60dc20a202 44ac79cc8a00",
 "astrology_salmon:work": "330794b6c951 ba4cf7ec649d 4d726ffd6787 cd8d5297ecdb fff231879a7a",
 "astrology_salmon:health": "056f276f07d8 2b95df29d40d 1b9c7b984a93 0a10ab0d29f0 20e4a60a5d0a",
 "astrology_salmon:ask": "56eeafea8a41 5372879df5e2 b6052035464e a668f895a00f 72ca7e92b68c",
 "astrology_flounder:legacy": "a2efc96291f6 76e155c13959 af3dae4b8938 0f7e6ba31905 30093a83fd6a",
 "astrology_flounder:personal": "4ac0fb69d4e7 0af481784147 8646b7326b5f e6d340adcb14 6c9e8804cea9",
 "astrology_flounder:compatibility": "d783f722df13 3cc56b8381a1 7e5b3909dc3d b65345602c55 ec7069c5b342",
 "astrology_flounder:work": "44be169bcf65 1f93c4cb8676 5caccd1f5a5c 2c4120f140b5 39c8e4a84a00",
 "astrology_flounder:health": "585805418e52 d1ac81e52685 3682ef5450e3 153b7219e502 4d71440d56a5",
 "astrology_flounder:ask": "df51574722ab 7debe3d088e1 5e65a9a7f021 602dd4e175c9 6c9e8804cea9",
 "astrology_tuna:legacy": "02b06023eff5 3a0086a3a37f 48fc71cec933 a7c402d39a0b 448e1eeab4e4",
 "astrology_tuna:personal": "12b4149e79e3 4bb320256cb1 ef5ead90e596 f7f85730e598 24cb225a6499",
 "astrology_tuna:compatibility": "90243a278a20 09978260891f 8a4775d65ef8 c5ab256d00aa 5a7751a54441",
 "astrology_tuna:work": "8d0e5d1bd6b0 30eebdef5c5c 8b9705d53541 f5192dd36591 22515b7f0512",
 "astrology_tuna:health": "8d1af0567569 2e202b03b1f8 44f5a6fef9e7 e15fcff350cb d1a3aa0ef9a0",
 "astrology_tuna:ask": "8777a917b06b ad4fc376aefc 9527e805bece 413eb8287adf 24cb225a6499",
 "tarot_mackerel:legacy": "e07534bd2c43 cdecfb4d42b5 f517b6c6766e ba44c1332ca9 6aa275b457cb",
 "tarot_mackerel:choice": "32cf1feaf169 8755483488f6 1707c5727328 c6d110f4cf29 3040b60d8f9a",
 "tarot_mackerel:love": "f6cb8c08a851 e1fe256e8fa8 c1e41b1b0bc4 9af4e3199486 ec43dbbb0b03",
 "tarot_mackerel:feelings": "f7faf97b3f11 bd5530b78715 088ba361bd18 d2f92c4c53e8 bc0e5ae95bf7",
 "tarot_mackerel:contact": "c1a9a02a8670 bb85171b6583 1a813a5e4f92 4ee3c2c06bec 21a5bd9065e1",
 "tarot_mackerel:reunion": "098ac34d9684 0b0f0f34d10d d5d26b6950ce 9fa9d19a0d4f df15382a96e6",
 "tarot_mackerel:compatibility": "0a6ba8c85801 30c3340026fc 6d8abaad1b7a 4bd28c918692 4d861b98fe65",
 "tarot_mackerel:career": "af65902d8a4f 56bb878ba283 b62ef987c745 3c33bc383612 13497923b755",
 "tarot_mackerel:money": "dea26bbf63cc 8708b2882db8 0bc8ceeb901b 63c03e027386 224b9c813d4f",
 "tarot_mackerel:healing": "b169b0720668 f292979bcb80 e67608bab1ac a1427bceda16 1eb77aa56722",
 "tarot_salmon:legacy": "01458e75a5d5 53e0a3f7879e 181f950c21e4 aec1c40187eb c3a12d10a0fe",
 "tarot_salmon:choice": "a23537b13c03 822cc0437555 ba7f9e73fe63 fa865bbf3830 0847bd77ffd7",
 "tarot_salmon:love": "e1f871ad3495 5f6b787c7d0b 7f2546280979 53d9676ffe2b 827911f6ce9f",
 "tarot_salmon:feelings": "6d3a61366458 fbda04f44e6a 24f99f0737e1 e90a68ddb485 70b9d4e56209",
 "tarot_salmon:contact": "f8d7f5c17298 5e2848ad9ebc 0ff2d77ff571 f30bbe742031 4941803d57e7",
 "tarot_salmon:reunion": "b6700ebc9841 dedf501bf6d0 cc7346f7b6d9 1e56ad50dc19 44d11dd84fc6",
 "tarot_salmon:compatibility": "be05b40e2435 34624bb192c1 9baa9cb5baeb 31826a4c452a d804ba957030",
 "tarot_salmon:career": "ca3fb149d799 02cae6cc8835 b89d83cb6749 c031bfaddddf f46beb4fa9d6",
 "tarot_salmon:money": "4dceb5d5f55c 03ccacc07cbb d574601579b4 b30ed18c75cd 21e2fafe34b6",
 "tarot_salmon:healing": "55e8003eb670 d5fa3dbf4bfb 89a43bf8d98a 2abf20d8aee1 430442c7d301",
 "tarot_flounder:legacy": "5bb33ea9da2c 90261ad2a09a cbd506b1178e 2e87e4b83f0b 200019185775",
 "tarot_flounder:choice": "e99e140779dc 5b41751b4169 2e70481104c1 59f4247b9708 157bdc132835",
 "tarot_flounder:love": "4d17426f5fe6 dec5eba73ae0 8d6ebd9579cf ec4ad01413ba cbc2d0bac5dd",
 "tarot_flounder:feelings": "66fc99f9e3ee 7cdcc721c1e3 ae710aa00e27 15c7f7083c70 155ee41a74e9",
 "tarot_flounder:contact": "1312e1e517ec d1de2a068bb5 c8c8e34d1fde 97d22f088430 a58662eaa3b3",
 "tarot_flounder:reunion": "fe59c2e78693 1d2588d32728 9b9b233dd7b2 2b3b593d7efa 965f27fad840",
 "tarot_flounder:compatibility": "6bc29b34260f 87e49a8a7cff 57938a8aa098 cf82ce7040ba 0bf12194b51a",
 "tarot_flounder:career": "4a11d79dd748 0deb11e38017 16f4cffded1a 847667becfd2 d2acb7269ee1",
 "tarot_flounder:money": "0512f632f9fd 7fcbc334db6c b4a691f7ba01 63027624c785 21275b3046ea",
 "tarot_flounder:healing": "6eff81a01e07 46ee076343a0 8a23caf0e695 c31935325177 0f7fa52555e7",
 "tarot_tuna:legacy": "d752a896960b 03e953f1a54a 45ce934063a8 c8da201e064b cdfa81f3a8a1",
 "tarot_tuna:choice": "b10b6fda1154 21979edb8982 5a60033759b1 49fec8428427 e4dde4d5d80d",
 "tarot_tuna:love": "080da1df3506 ebcc11a5972d 592a2bb6a822 577edc40f2f0 f40bb48c0c1e",
 "tarot_tuna:feelings": "777177460814 359483434cde 47b72f9a4a1d 4d589714a023 b25624fbfb68",
 "tarot_tuna:contact": "aaaf3c2a30d4 23c04b45472f 62e457675650 63455c1efba3 570e72f29211",
 "tarot_tuna:reunion": "e301692fc335 193b141584d5 1f4b0ec0555e 2902a3112cb7 fc87f92e1b6c",
 "tarot_tuna:compatibility": "db2a0da1dbd3 fb5cc7215754 a9ea63748084 c4f89c83aa30 40fdc1754827",
 "tarot_tuna:career": "9f2b96b69e7e 4ac3503f2010 bd6024bcc1b9 b6ce71632f30 8b7cba3384f8",
 "tarot_tuna:money": "8c537b6a25d0 c791ed220a96 e60672ea72bb f4fe4398c3e2 3f92ccf43eb9",
 "tarot_tuna:healing": "95237eaf1eb6 9df793bdf36a ed995cdc4c33 7968e7e88f17 65e3551e850c",
 "fusion_saju_ziwei:legacy": "522ca417ff39 ffad85e4edc7 f89040d19844 df44aa7d55ac 8d73543657a4",
 "fusion_saju_ziwei:personal": "e51cc152f074 af3d18091a16 04a84cd4c492 521bb9d69a55 bfa4f82013fa",
 "fusion_saju_ziwei:ask": "f63ce39aeb48 0ff69045e46f 3bbd9b6a0a76 8955a92217cd 8d73543657a4",
 "fusion_sukuyo_vedic:legacy": "82e9e4df560e c7f259037b2d b190a832d04e c7ecd03a5f7a f5e2367a6a10",
 "fusion_sukuyo_vedic:personal": "5c87ec4b0518 11ad07b6d45d 923fe4ea7000 74b3e0a99b92 defabda6a501",
 "fusion_sukuyo_vedic:ask": "578ef34a776b 6583934ee763 fcba686aeedb 43b9a40df562 f5e2367a6a10",
 "fusion_astrology_tarot:legacy": "7c45247157ec b31ac8db6adf 78f627790d3a 1d38eddff911 25e4aacb63c5",
 "fusion_astrology_tarot:personal": "d018fe943539 834aada63070 114574e15723 b01d5662ab3e 656712d72276",
 "fusion_astrology_tarot:ask": "cf4f17e0b788 18bfbbc36d5b 0dfc9f1e0519 4fb36dd322c4 25e4aacb63c5",
 "fusion_all:legacy": "4b8ea05ecd6d 9048b204912f 85bb72144cde fbe86bf88d80 41723e0e4970",
 "fusion_all:personal": "17a8c586328e 82d4a5aff11d 5ad1badba16c 7763c8c09409 8d19aca0ff68",
 "fusion_all:ask": "c5192e8883b5 576bcd8fa58e 88601a22cef2 ef391a803568 41723e0e4970",
 "saju_salmon@timeUnknown": "92a20df9da71 e02037d6143e 2a992365ef76 3cbca35fe723 -",
 "saju_salmon@timeUnknown:ask": "6a4c6f9417fa 913377fd7131 3f7131ae0e14 446ce98d9b2d -",
 "ziwei_salmon@noPlace": "dba2f94a1f0f 7ed554dc39a5 dce461d7dfff 58713471d73f -",
 "ziwei_salmon@noPlace:ask": "af79f1701be0 a6c68014d56c 71c22914ce41 1cd4c4dcea29 -",
 "saju_mackerel@spirit": "c1d9894c5067 2d14419df51a cd0378aba330 c3b521dd1883 -"
};

test('new concise preparations preserve calculation and identity contracts across products',{timeout:600000},async()=>{
  const actual={};
  for(const p of m.products)for(const k of kindsFor(p))actual[`${p.id}:${k?.id||'legacy'}`]=row(await prepared(p.id,k?.id),topicManifests(p,k));
  for(const [key,extra] of Object.entries(variants)){
    const [productId]=key.split('@');
    actual[key]=row(await prepared(productId,extra.mode?undefined:'personal',extra),'-');
    if(!extra.mode)actual[key+':ask']=row(await prepared(productId,'ask',extra),'-');
  }
  if(process.env.YEONGNYANGI_INVARIANCE_PRINT==='1'){
    const changed=Object.fromEntries(Object.entries(actual).filter(([key,value])=>EXPECTED[key]!==value));
    console.log('INVARIANCE_SNAPSHOT_BEGIN'+JSON.stringify(changed,null,1)+'INVARIANCE_SNAPSHOT_END');
  }
  if(process.env.YEONGNYANGI_INVARIANCE_UPDATE==='1'){
    const sourcePath=fileURLToPath(import.meta.url),source=readFileSync(sourcePath,'utf8');
    const start=source.indexOf('const EXPECTED = {'),end=source.indexOf('\n};',start)+3;
    assert.ok(start>=0&&end>start,'EXPECTED snapshot block must exist');
    writeFileSync(sourcePath,source.slice(0,start)+`const EXPECTED = ${JSON.stringify(actual,null,1)};`+source.slice(end));
    return;
  }
  assert.deepEqual(deliveryFailures,[],'every validated mock chapter must pass the delivery contract');
  // Fail closed: a new product or kind without a pinned row is not silently accepted.
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(EXPECTED).sort());
  for(const key of Object.keys(EXPECTED))assert.equal(actual[key],EXPECTED[key],`${key}: id prepare requests validated manifests changed; refresh only for an intended change with YEONGNYANGI_INVARIANCE_PRINT=1`);
});
