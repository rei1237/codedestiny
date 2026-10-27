import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// 2026-10-14: actionable counsel updates only request prompt hashes; IDs, prepared facts, validated output and manifests stay fixed.
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
// Repetition and accuracy (2026-10-23): new non-v7 manifests carry repeatPolicy 'sentence-v1' (sentence-level restatement
// pruning, previousOpenings in the carry) and question layouts gain the 'question-core' 적성·연애·건강 chapter in place of one
// padding row; 대운 cycles are dated by the 교운일 with 만 나이·대운수 and saju fiveElements count the visible characters only
// (countBasis 'surface'). 185 rows move prepare and requests, the 4 saju salmon personal/ask rows (v7) move requests only, and
// the 10 non-saju salmon personal/ask rows stay; ids, validated and manifests stay.
// natal-core (2026-10-26): analyzeJohu gains hanNan·joSeup·complete·needLevel·supplements (한난·조습 분리, 자료 부족은 판단 보류),
// so the 42 saju-bearing rows move their request hash only; ids, prepares, validations and manifests stay.
// P4 (2026-10-26): 종격·강약은 원국으로만 판정한다. jong fact의 confirmationRequired와 설문 기반·조건부 limitation이 빠져
// 14 rows(사주 궁합 4, saju_tuna 4, fusion_saju_ziwei 3, fusion_all 3)가 requests만 바뀐다; ids, prepares, validations and manifests stay.
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

// 2026-10-27 오마카세 신규 가격: 세 fusion_all 행은 주문 ID와 준비 스냅샷만 바뀌며 본문·목차 해시는 유지한다.
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
// 2026-10-26 natal-core P6: saju chapter prompts carry the fixed 격국 line and rules, so the 50 saju-containing rows change request hashes only.
const EXPECTED = {
 "saju_mackerel:legacy": "17d4b4370666 7de4b5036093 629c743de9f5 1bfa36a7a76f 42f2c5c373fe",
 "saju_mackerel:personal": "0264bf313263 37895f7c0904 3a7cb9fe3816 16b2a44ce5be 8c9adb9e6d01",
 "saju_mackerel:compatibility": "74956a1ec8e6 5257f1d73abf e8647b5ebde3 55e83e57f700 163444337fa9",
 "saju_mackerel:love": "5f00fa3f2a1e cc4cf11e8e15 e653dcdf7f9d 98759f2fadc5 3e239ee154a7",
 "saju_mackerel:work": "f5085ad62db4 9651d6f94dd2 4a065fbaa2bf 581ab0f96374 1dfa9237efd8",
 "saju_mackerel:money": "806c27287df6 01763ea250f8 45fcb3ac8716 5666783b6eb2 054738d4280d",
 "saju_mackerel:health": "4aea95dfb327 436b06e6e2aa 4d8de3413bd7 967f5197a983 6f349850e339",
 "saju_mackerel:marriage": "83dbe19f17af c4ae77507c3c c7b2dd06c4bb bc843a992f3d d0f64253c7e4",
 "saju_mackerel:movement": "1054443973c0 a0195b484386 8d4468c197d8 80d30827a033 2629d158d3bf",
 "saju_mackerel:ask": "7b67eab278bf 569bffcdc074 f4afb28495b2 2d6a7faae292 b9cb87c20d32",
 "saju_salmon:legacy": "df9cca2a2048 9c461609bff1 061c953b6976 b65bb3226098 5a931b290957",
 "saju_salmon:personal": "29a0f40357b5 48d7cf79f7a5 8d1cfa1e4a8d bef8e5fd5411 459c1c844aea",
 "saju_salmon:compatibility": "acec09214c7f 4fec7e611289 9074f6e43147 cfecae67051c 5ee9aa8dd2ae",
 "saju_salmon:love": "c07f53b1b095 ae6d62f5dd15 26431e5998e8 478c31dcfa30 8fe7b01b938d",
 "saju_salmon:work": "6e66479225b8 78e15c228a7b e3faeb400b8a fee54eeddbe0 fa41008e9044",
 "saju_salmon:money": "e5fd2aa1932b 4147f5346c9e a741b2170a6d 3ae937379548 6ae138fbccb6",
 "saju_salmon:health": "bde7d7b20f20 04522bfe8bad 56a755bdc312 34a732fe9eb4 c2825221fee0",
 "saju_salmon:marriage": "61c1c8975683 5a704e52fda1 427f3d004b28 16b2ab41b30a f9ab1067c762",
 "saju_salmon:movement": "a8362587312c b05ebe1b8007 9bdf7fae1d90 c45512ab2658 7dfcbf891f12",
 "saju_salmon:ask": "4a76bfbf2d51 643d989053fb 0e4d6ed3ac39 24a6fff0ee15 459c1c844aea",
 "saju_flounder:legacy": "2f03e9541f66 3592364aa558 86b4ff5d7e93 0e581c4b7ebb d0a1fba4b309",
 "saju_flounder:personal": "27847cb7453f 2a25cd269657 96c7f5c1333f 7202471c0fa2 9092b43d5b23",
 "saju_flounder:compatibility": "d23151e45632 9c96e1749e0b 06e655687c3b eb044b2a5703 3e8926b65705",
 "saju_flounder:love": "2d8501ac26fc c5e48436dfd6 0a6b1b6d5db4 f829576a3b46 703f985f1df5",
 "saju_flounder:work": "00a830fc552b f3cf1626adcb f96a6f65c6be ba3aecfe9321 686fbc52450a",
 "saju_flounder:money": "b9cf42af5cac 0701d9010979 64058488aec4 d19a9678745d 6c151b1de8ff",
 "saju_flounder:health": "3819175f0fff 95ad93808aa1 f1efad40f69d 8abba083cbe9 1944e876aec8",
 "saju_flounder:marriage": "295b713484dc 97d873c4d1e9 3c7bee3e726b 0fe21aaae3ab c9a479d092d3",
 "saju_flounder:movement": "f4862e9b8c23 95f9093f7ced 1c7536f49892 a94f7fe5e878 caadd5f9127a",
 "saju_flounder:ask": "87bc8fe3f10d 40ef9120f835 5cccce184e93 c8b9db36e8b0 9092b43d5b23",
 "saju_tuna:legacy": "356b024ce814 b6b78b974e5e 0b45674f3dc9 8c4ab04cadea a19a748c8350",
 "saju_tuna:personal": "7d578af159f3 b631949b121a 08bae053ad08 605d84b614cc 004fdfa8ed6a",
 "saju_tuna:compatibility": "f8642c297702 e0d1fa265caf 91bcacf7745b 550fd61ed012 6e327a0ca069",
 "saju_tuna:timing": "18921fa9dc3a 0758cc8dd74e 3bc07f61f456 bfb0793d5f7f 410bef112275",
 "saju_tuna:love": "f0eaae6bc658 0d3ca1dd4a45 cf709cb51119 5d5648c69990 135beac68a67",
 "saju_tuna:work": "c7d4fe25ba4b fb1128901100 91d5dac55d88 01bf24cba927 f96ef8e37722",
 "saju_tuna:money": "e83acdf4d7a6 7bf9e53ac3f9 a3cc6ac2f261 1154a444601e d0bff6c53db5",
 "saju_tuna:health": "9acfae2ce6a0 34b39f59d806 50994100226f 58addf6000cb 0ff921b2a8bb",
 "saju_tuna:marriage": "17fde381a0ce be857323ec1c 6bf66182a5dd a9fcd9a9f51a 0ec0359f02ad",
 "saju_tuna:movement": "dc1bca68fda8 cfd73df4e5c3 ee4dd7b07cda c2c416baef62 128d0b22895e",
 "saju_tuna:ask": "470fd152414b 349480262b38 6e838610dd1b f0eb36bd2df8 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "3421c7f7caca bd16497b6bd5 96e6126ab2aa d8a434aa452d 2371774a80c3",
 "ziwei_mackerel:personal": "7d29c1ed4c4c abd915b6c9ba 71d09c7ff95e 53ee302f4422 4d36af752c53",
 "ziwei_mackerel:money": "9f434cfdd67b 381168bf4278 7ae532fb248f d44271a0176c 49682968473e",
 "ziwei_mackerel:business": "34c0a816b97f 8e3ff5315b0c 328b9bb92140 7060854ef9b6 8760a0a3cb97",
 "ziwei_mackerel:love": "7242682dd7d2 d879a5cd32c1 4346c1cd16dd 7f70dcd84384 5263a982930a",
 "ziwei_mackerel:marriage": "fe5c435d3404 02b2b4140594 d4c5807bb6f0 b985d0d2986c 34fd69b9fa1a",
 "ziwei_mackerel:health": "39ea5619644f b4428d0e84ea 70c885289fcb 57d921266171 5c5632463fed",
 "ziwei_mackerel:compatibility": "efb69088990d 574d9e9251a3 3364e373de32 d8030486c36a 18e9ddeda17d",
 "ziwei_mackerel:ask": "bf707be7935c d08c0f6707ae 6e44c3f71d24 205d35a63f27 11a73d36d268",
 "ziwei_salmon:legacy": "e39e3795ddec c09bbbc7b77f 9527bda0a090 0923075ed97e 3fbe37463d18",
 "ziwei_salmon:personal": "db41263d081f 496710bddbd8 d06a45a69518 58713471d73f e53afa1fd005",
 "ziwei_salmon:money": "3727e62dc338 6f927f85803f b89a45407f85 9d0611b725aa 5b9032100edd",
 "ziwei_salmon:business": "128b8bee3ddf ed29d9cdee3c 62ca6922a649 b219f5302e25 6369360a3c1a",
 "ziwei_salmon:love": "93fd1963f55d f74d0d3ce89e 06dcd378b6bd 531378441765 04b6c4bb9963",
 "ziwei_salmon:marriage": "0b6301e7a62a 8dc6f94d0c02 f67fea9e0231 10583ed0b276 87adae473ea9",
 "ziwei_salmon:health": "ad5a720a47fd 178a90b32168 0f44f92d7920 ad5aa8135f99 68bd7a6f8c8f",
 "ziwei_salmon:compatibility": "6ea32f14ae60 c1b23e94c5b8 fb19028e1980 d55240acdca6 b2dde48c94ff",
 "ziwei_salmon:ask": "c89541ac34df 6d4aaab5781d adda32f1cb8d 1cd4c4dcea29 e53afa1fd005",
 "ziwei_flounder:legacy": "012f25e16f38 bc46857e3451 7855fd551440 b2c7b3afe72b 9201b10cbef5",
 "ziwei_flounder:personal": "102b4e9ae7f3 f998c6296320 9175efeb574b d4b7c2bf8692 379f9e9c59c7",
 "ziwei_flounder:money": "4ceb2c62e792 f11a7bc5ab89 86d14f4e4eff 470d53599ed7 93ce966131ef",
 "ziwei_flounder:business": "7d35a09bfbd0 fe266c001124 7d2af878bfd2 fcca332dd55e f57c13332209",
 "ziwei_flounder:love": "0c45753b2686 ba8e48c8ddb4 c8c52413fa83 ccc2875965b7 3641d17b484b",
 "ziwei_flounder:marriage": "b6e02fd1749a d27e464662b3 eaf0f6f652a8 a901d000daeb 7617a833fc9e",
 "ziwei_flounder:health": "775e9c1581c0 baedd658791d 83b39d220bf2 0688fb3c21c3 583e184502b9",
 "ziwei_flounder:compatibility": "5336dfd3e6e2 e540e565e917 f5f49582f1fb 07144354163a 63bf3208b946",
 "ziwei_flounder:ask": "a50a6db1b065 1cdedeafdbcd 62cf1db12b6a c457c5b7f2b6 379f9e9c59c7",
 "ziwei_tuna:legacy": "cd3c28740b2d bdf4140549e4 1dd9e760a75e 2483fb87f9c3 8d87087ff586",
 "ziwei_tuna:personal": "410661889360 26bb92ffc83e 96fb4ff51906 a01d494fcb5c 4f4beb638beb",
 "ziwei_tuna:money": "062748ca9df5 ca8fa8893086 983f23878d70 1afff2b9f109 f3746b2a9fe7",
 "ziwei_tuna:business": "cf33dd97f67e ed0794c0cd97 5e6b45fb6628 6219fb91cfc5 ce52fe2adca8",
 "ziwei_tuna:love": "eb5564a368a4 8171c75930ce cc7c89b6eadd 70df6635a0b5 300807ac1eec",
 "ziwei_tuna:marriage": "873accb48a98 e6884ec6606a 91371adc8264 edb8a0670249 93391b2a2e3b",
 "ziwei_tuna:health": "262fb7a38515 cb866ba75540 a9538798966c 449553b250d8 65bbc46fd5db",
 "ziwei_tuna:compatibility": "0c2f3fd7ba7b 3feff663cc24 693644b7234a f8c5cb661fd7 3edd1557eb29",
 "ziwei_tuna:ask": "7af1ae953142 1b4cc348f40b b6a6ed192ecd 04ede67128a0 4f4beb638beb",
 "sukuyo_mackerel:legacy": "8a7d6dfb497f 4f622c7cec4f e355e40f8960 a449f043448f 09cac5e57c93",
 "sukuyo_mackerel:personal": "674e65f1d244 de8a216d8446 08d6c840ba7d 5d81d8861aed 60c2f71db056",
 "sukuyo_mackerel:compatibility": "37a149f9ba90 2322265d51cd fb41d81ea3c3 7c8fbb017035 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "72785fd6ad77 fb12860b733d 25afc5b07201 5f41f101797d 51c64f67c10e",
 "sukuyo_mackerel:ask": "6df86302ac1b e4d51a2ef4e5 ba62aee0d8cd a7911e46235a c1b4a3466991",
 "sukuyo_salmon:legacy": "05cec69159dc 496e0d076e4f 6e9bfb13c2a0 b72cfebdfe27 40764a5a48f1",
 "sukuyo_salmon:personal": "e42361f90997 2df5118ea086 8b02eba50c47 9a39b75ba869 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "1f0a676491f6 01d0db839197 71bbfee51ca1 511fc07919d3 cc372c1aa463",
 "sukuyo_salmon:relationship": "74133dba9085 04d406f19d45 340e381ef838 675515733d62 4a2ab417052e",
 "sukuyo_salmon:ask": "68365e58c63c 5e4cf78a6185 cab098bcd814 777030280c73 c7963d52d5c2",
 "sukuyo_flounder:legacy": "091b2f61c49d 75fc1e267ee3 0ae0d103d313 a3a3c5ae25be 41630a4b9f1f",
 "sukuyo_flounder:personal": "1a83a81b3eb0 f953d8bca57a 53d2f2f11585 5134f933585f 337c369df170",
 "sukuyo_flounder:compatibility": "26ab2a0c3f1b 43bf568c8969 c799913e3861 52fb8c9bfc45 3b18417c9ffd",
 "sukuyo_flounder:relationship": "59452a618926 76c2b0ac8537 ba95c756185e 39655e32eb1b b69fd6f8148e",
 "sukuyo_flounder:ask": "f591aaf79c2f cbfcb4c4c395 5f0e706767a0 8950a5fb9410 337c369df170",
 "sukuyo_tuna:legacy": "fc3bb70ae112 67b8bc65a106 ef2963b5019c 90218cf2bfde bbdcc5db3d05",
 "sukuyo_tuna:personal": "d2255f58d54a 9b370e23fc4a 2ad2a45e00a3 70349d12137a 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "ad30c87bfdee b491b36b1de0 1d29c93988c4 a47a1db94aa4 cf557e59d9fd",
 "sukuyo_tuna:relationship": "ccc767726a42 e8a8b7b1824a eae076d9ef95 80d8843d3e6e 6371bf908ad4",
 "sukuyo_tuna:ask": "7398acfb95e0 b92129febe14 b12507901071 e5cbd184afba 933a3eee4cc4",
 "vedic_mackerel:legacy": "edd7510e71ce 56b7f674d147 7ceffeb54146 0096ff6a2f05 0ab96e7ba746",
 "vedic_mackerel:personal": "df0353e2206d 2d04939eff3b 435c07c8120e b4ca340d4b5d 3b771e8d6049",
 "vedic_mackerel:compatibility": "7e379bb43a59 a06bb1e0aba4 45a2940374ef c60e004270a8 93639036c9de",
 "vedic_mackerel:health": "c63bcff07c33 441cbc5e86b2 d088f88fb7b3 a794e235952c 1d731a0d27b6",
 "vedic_mackerel:ask": "e3b00156e5cb fb2253c3178e 8471784c1f26 f0c0f46def80 0f802baef856",
 "vedic_salmon:legacy": "a5791c5bc7b9 5a7e2ed33631 2229bfe0c36f a84871023771 d832b44c39d3",
 "vedic_salmon:personal": "59d84b1e9046 2b4efa160de7 121079252caf 6ac5773867ba 5474c6f3d686",
 "vedic_salmon:compatibility": "91156f859b6e 4ecf8384bf14 26629c632fc5 67213258e2bb fa9d3f4db03e",
 "vedic_salmon:health": "43feb4672b6b 4a85a87d392a da17eee1322a e75680000a4b f88b928d0896",
 "vedic_salmon:ask": "2f641694ec7e 948a9b16b74b 0ef230ed8a8f c7eeedac1d4a 5474c6f3d686",
 "vedic_flounder:legacy": "6a0bea633287 8a44b673cfb0 1f0794021826 4caa5f878224 f4c3879ba491",
 "vedic_flounder:personal": "abaf3b9494d7 a38fb21f41f1 052c5aa31ec7 31af598f92b5 fc7c88f2f9c7",
 "vedic_flounder:compatibility": "8328560d474c 183a3c46aed1 5f0cd7cb6394 68a0696b2005 42739f81cb7b",
 "vedic_flounder:health": "ee32023ada94 d127ed3c7457 e1ae2199992f 0ab77e276e4b 966635149b77",
 "vedic_flounder:ask": "954cf2dfaf7c 62ca92a5accf c6a33c8038e6 fa3757e16cf0 fc7c88f2f9c7",
 "vedic_tuna:legacy": "0eb28fa5e6ea 54bb8b0b53b6 7bf5529b9edd 4ff2f14f79e8 9a50bce25627",
 "vedic_tuna:personal": "4327a12db79b 189e337efc8f 30a753f989ba 4eeee8d91d64 621ad1cb46ba",
 "vedic_tuna:compatibility": "58273a8ae81d 4ac1e7325f2e 589a807ae759 d205043cd2a7 81b70a1080b0",
 "vedic_tuna:timing": "188577efe11d 7037c447b4e9 5216657eca25 057a78489289 d48d8fcb6c1c",
 "vedic_tuna:health": "498eae4d0156 705b8976787f c6b58880a8e8 5074bb2df060 2c61521bdda7",
 "vedic_tuna:ask": "421d2289a789 96d0bc42a715 80ee9162471a 841aaf39ded3 621ad1cb46ba",
 "astrology_mackerel:legacy": "9177825a2e05 006cba8df39e 86aacebbf870 35ad5816864e a01f7e3b5491",
 "astrology_mackerel:personal": "e2ff38e2b92c dbf67ec0c8fc 34f4ef577bcf 13ba36c1e3e4 97192bfd920b",
 "astrology_mackerel:compatibility": "2109561ab4ac c2797f7f4ed3 685be9cbb24d d1a94dd80f87 947276fd4fb0",
 "astrology_mackerel:work": "8cae3762a770 6c512d511c4a 6eb916b20319 baa45aa47698 e4a4f0f408bf",
 "astrology_mackerel:health": "cfaad4b5e540 402c2353161d 0c76d93e200b a193b0b8f149 d385b09c4704",
 "astrology_mackerel:ask": "aac2659ea7fc ae195c57ea8b 022cb9ecd7d9 612e843cb82e 91f01265e663",
 "astrology_salmon:legacy": "ec31dbab4bbd e45abc444188 2fc703fee0e3 e2d178efdaee 86295650d714",
 "astrology_salmon:personal": "1ede2df85a5c 5119d6866012 672ff6578d46 86ca63e01edc 72ca7e92b68c",
 "astrology_salmon:compatibility": "62dcb9e24ee6 2de9c38034ae d80a35b95240 fa60dc20a202 44ac79cc8a00",
 "astrology_salmon:work": "330794b6c951 be4a4cc788a9 f5195b49b168 cd8d5297ecdb fff231879a7a",
 "astrology_salmon:health": "056f276f07d8 0e7a1723ad68 27a0d9397c05 0a10ab0d29f0 20e4a60a5d0a",
 "astrology_salmon:ask": "56eeafea8a41 5372879df5e2 c30af4d65816 a668f895a00f 72ca7e92b68c",
 "astrology_flounder:legacy": "a2efc96291f6 0126f92be685 ce596699b060 0f7e6ba31905 30093a83fd6a",
 "astrology_flounder:personal": "4ac0fb69d4e7 7fac78045863 40a8f888f53e e6d340adcb14 6c9e8804cea9",
 "astrology_flounder:compatibility": "d783f722df13 ab0b8220efdf 9f601072ef9c b65345602c55 ec7069c5b342",
 "astrology_flounder:work": "44be169bcf65 043b51ae1243 63edf554b755 2c4120f140b5 39c8e4a84a00",
 "astrology_flounder:health": "585805418e52 94e502fc2139 c54f83a1e8b1 153b7219e502 4d71440d56a5",
 "astrology_flounder:ask": "df51574722ab 2bba1527fb51 377f4ea69808 602dd4e175c9 6c9e8804cea9",
 "astrology_tuna:legacy": "02b06023eff5 d666e15b4109 5c019ad3e1aa a7c402d39a0b 448e1eeab4e4",
 "astrology_tuna:personal": "12b4149e79e3 52c67e43e31d ac1f309c0aaa f7f85730e598 24cb225a6499",
 "astrology_tuna:compatibility": "90243a278a20 82d7ee76fc13 2990a8d2b39e c5ab256d00aa 5a7751a54441",
 "astrology_tuna:work": "8d0e5d1bd6b0 73955e02cc0f 002b00afe642 f5192dd36591 22515b7f0512",
 "astrology_tuna:health": "8d1af0567569 42eb1811a400 cb6e502d141c e15fcff350cb d1a3aa0ef9a0",
 "astrology_tuna:ask": "8777a917b06b 19615546dd33 9ad03b0f53dc 413eb8287adf 24cb225a6499",
 "tarot_mackerel:legacy": "e07534bd2c43 85f6094f7228 917a51e38f35 ba44c1332ca9 6aa275b457cb",
 "tarot_mackerel:choice": "32cf1feaf169 0298355184d0 73c42f675782 c6d110f4cf29 3040b60d8f9a",
 "tarot_mackerel:love": "f6cb8c08a851 61a9f3bbb5dc 2e040f3e7ca7 9af4e3199486 ec43dbbb0b03",
 "tarot_mackerel:feelings": "f7faf97b3f11 9ea650faf220 95ed32ce7cec d2f92c4c53e8 bc0e5ae95bf7",
 "tarot_mackerel:contact": "c1a9a02a8670 bf9d8127d260 7c1ecb1268e7 4ee3c2c06bec 21a5bd9065e1",
 "tarot_mackerel:reunion": "098ac34d9684 22a17449e6b6 c38cbf63569a 9fa9d19a0d4f df15382a96e6",
 "tarot_mackerel:compatibility": "0a6ba8c85801 bc6ddc7c6180 2809eab284da 4bd28c918692 4d861b98fe65",
 "tarot_mackerel:career": "af65902d8a4f f40e8ab032e6 e31addf046ac 3c33bc383612 13497923b755",
 "tarot_mackerel:money": "dea26bbf63cc 34937d61fcc6 11cc1be52d81 63c03e027386 224b9c813d4f",
 "tarot_mackerel:healing": "b169b0720668 6a858e947bd3 ffc53e7db9cb a1427bceda16 1eb77aa56722",
 "tarot_salmon:legacy": "01458e75a5d5 137f3a3b76f9 7d95abe3d1bc aec1c40187eb c3a12d10a0fe",
 "tarot_salmon:choice": "a23537b13c03 f84cb0b8ee82 b3e4e8c75b77 fa865bbf3830 0847bd77ffd7",
 "tarot_salmon:love": "e1f871ad3495 248cb52b3173 4371d357eead 53d9676ffe2b 827911f6ce9f",
 "tarot_salmon:feelings": "6d3a61366458 9d33b1e7e69f 3bf27b82e73b e90a68ddb485 70b9d4e56209",
 "tarot_salmon:contact": "f8d7f5c17298 6b6726e5b0a8 6472cbe198f2 f30bbe742031 4941803d57e7",
 "tarot_salmon:reunion": "b6700ebc9841 1d5b89d05551 ae67ceb40904 1e56ad50dc19 44d11dd84fc6",
 "tarot_salmon:compatibility": "be05b40e2435 79048806a38d 376791cf1dce 31826a4c452a d804ba957030",
 "tarot_salmon:career": "ca3fb149d799 08a010ee6afd 67391c5b44a0 c031bfaddddf f46beb4fa9d6",
 "tarot_salmon:money": "4dceb5d5f55c f44e1c3061f1 31c2c6754aef b30ed18c75cd 21e2fafe34b6",
 "tarot_salmon:healing": "55e8003eb670 522cca8b11c7 7bdfdfb5bdc8 2abf20d8aee1 430442c7d301",
 "tarot_flounder:legacy": "5bb33ea9da2c e0010bdcb4e6 412277ff2a5e 2e87e4b83f0b 200019185775",
 "tarot_flounder:choice": "e99e140779dc 4f2bfafd9d03 844eb290ddbb 59f4247b9708 157bdc132835",
 "tarot_flounder:love": "4d17426f5fe6 82261e35927c 9a6f9bf7999b ec4ad01413ba cbc2d0bac5dd",
 "tarot_flounder:feelings": "66fc99f9e3ee 674631a00e22 95f65869d285 15c7f7083c70 155ee41a74e9",
 "tarot_flounder:contact": "1312e1e517ec c804356b3206 4b89f3887e26 97d22f088430 a58662eaa3b3",
 "tarot_flounder:reunion": "fe59c2e78693 8c4e85b69b27 f4b5d648f4a8 2b3b593d7efa 965f27fad840",
 "tarot_flounder:compatibility": "6bc29b34260f 28029f51a7b1 b776f6d86192 cf82ce7040ba 0bf12194b51a",
 "tarot_flounder:career": "4a11d79dd748 abd931d07249 53e9bcf88e97 847667becfd2 d2acb7269ee1",
 "tarot_flounder:money": "0512f632f9fd 3192bcc736ef 3a27f41d1537 63027624c785 21275b3046ea",
 "tarot_flounder:healing": "6eff81a01e07 823c19bba13b 788955007be7 c31935325177 0f7fa52555e7",
 "tarot_tuna:legacy": "d752a896960b 68392d82bb4e 0425f8b3df96 c8da201e064b cdfa81f3a8a1",
 "tarot_tuna:choice": "b10b6fda1154 e1a399bbbf15 e96c1f307c40 49fec8428427 e4dde4d5d80d",
 "tarot_tuna:love": "080da1df3506 8a54f3037e5d decb423eea1d 577edc40f2f0 f40bb48c0c1e",
 "tarot_tuna:feelings": "777177460814 4a5d8787e7b2 5139164a9a79 4d589714a023 b25624fbfb68",
 "tarot_tuna:contact": "aaaf3c2a30d4 d1875808e548 ae836d23e05c 63455c1efba3 570e72f29211",
 "tarot_tuna:reunion": "e301692fc335 892866523665 cd2be76449da 2902a3112cb7 fc87f92e1b6c",
 "tarot_tuna:compatibility": "db2a0da1dbd3 3b09209f5404 95c4347712e2 c4f89c83aa30 40fdc1754827",
 "tarot_tuna:career": "9f2b96b69e7e b6665dedbda6 9043ad2de09a b6ce71632f30 8b7cba3384f8",
 "tarot_tuna:money": "8c537b6a25d0 23a4035cdfa0 c9597218e05d f4fe4398c3e2 3f92ccf43eb9",
 "tarot_tuna:healing": "95237eaf1eb6 0e111963c7af 5dc352450924 7968e7e88f17 65e3551e850c",
 "fusion_saju_ziwei:legacy": "d8a3a1b9dc9e 4c6dd9681d07 7636a5c1b093 b0f9853d9f22 8d73543657a4",
 "fusion_saju_ziwei:personal": "0c259c5813bd 4a5a9e10974f 98c289c05dd3 77546103b910 bfa4f82013fa",
 "fusion_saju_ziwei:ask": "f3f3931e2b47 f5a808b3e28e a321fa451358 5894cba6b168 8d73543657a4",
 "fusion_sukuyo_vedic:legacy": "b9668808c61a 5a8a0df56c49 585a88843607 e7c47aad2ef2 f5e2367a6a10",
 "fusion_sukuyo_vedic:personal": "7c34cff54083 da6c6ba2b1ae 1c5876a4f418 d08449a67b48 defabda6a501",
 "fusion_sukuyo_vedic:ask": "ea9582fba459 76394148a511 4c8746b79cc7 a1b0a7fc3995 f5e2367a6a10",
 "fusion_astrology_tarot:legacy": "7eb0f10d7751 229efe472136 9b64779cb052 5d916b47d261 25e4aacb63c5",
 "fusion_astrology_tarot:personal": "e3271cce5dca 72ed630afc72 c47e3611e644 c714e34cd496 656712d72276",
 "fusion_astrology_tarot:ask": "9c36a035236e 76caf99461c8 5fe124bcebcb c760fd0c9e5a 25e4aacb63c5",
 "fusion_all:legacy": "4885d2065df4 99d74aae14f8 941033bb88ce ce8d70b5d60a 41723e0e4970",
 "fusion_all:personal": "24fbba0fdff4 c66dd54f5ebe 1eca35a4a267 5e5aff1f7826 8d19aca0ff68",
 "fusion_all:ask": "5ebc98c52418 bc4989d8c8bd 7aa5a2b99a0c b4da13c94948 41723e0e4970",
 "saju_salmon@timeUnknown": "92a20df9da71 e02037d6143e 8d352a1da6f9 3cbca35fe723 -",
 "saju_salmon@timeUnknown:ask": "6a4c6f9417fa 913377fd7131 18a1bd39ad8d 446ce98d9b2d -",
 "ziwei_salmon@noPlace": "dba2f94a1f0f 7ed554dc39a5 d06a45a69518 58713471d73f -",
 "ziwei_salmon@noPlace:ask": "af79f1701be0 a6c68014d56c adda32f1cb8d 1cd4c4dcea29 -",
 "saju_mackerel@spirit": "c1d9894c5067 1dbd31386d91 e4154c6c1760 c3b521dd1883 -"
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
