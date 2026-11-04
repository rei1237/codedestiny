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
// Inborn-disposition overview (2026-10-29): readerCounsel opens with the 타고난 성향 총론 before tying it to the topic, so all
// 199 rows move requests; the fusion answer chapter gains the cross-system 'nature' section, so the 12 fusion rows also move
// prepare and validated. ids and manifests stay.
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
// 2026-11-04 temperament and expert guidance: all 199 requests and 12 fusion preparations change; IDs, validated output and catalog manifests stay fixed.
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
// 2026-11-02 temperament: 49 saju-bearing rows gain the shared conditional reading lens (compact at the provider boundary).
// Across all 199 rows, ids, prepares, validated mock results and catalog manifests remain fixed.
const EXPECTED = {
 "saju_mackerel:legacy": "fd39a242f217 33dada465fdd c45114d65aac 1bfa36a7a76f 42f2c5c373fe",
 "saju_mackerel:personal": "4f84ab794b8e 974cc6230282 5b470018dfd2 16b2a44ce5be 8c9adb9e6d01",
 "saju_mackerel:compatibility": "c5273f667ffe e0aec5695671 5836ea0eb579 55e83e57f700 163444337fa9",
 "saju_mackerel:love": "d34fab4265f7 7ce6b8b412f5 b94c7fe0ea2d 98759f2fadc5 3e239ee154a7",
 "saju_mackerel:work": "d75dd71bca28 2c79dd455cf7 d7c6354aae8e 581ab0f96374 1dfa9237efd8",
 "saju_mackerel:money": "2269ee04a912 033cc0216993 79da7ae53fe3 5666783b6eb2 054738d4280d",
 "saju_mackerel:health": "2b05860b89ac 99924973be06 ee9b90cc9e51 967f5197a983 6f349850e339",
 "saju_mackerel:marriage": "39fd7f2df685 8b25b527076d 9f6bdf406163 bc843a992f3d d0f64253c7e4",
 "saju_mackerel:movement": "284b12f18706 5ad7c333fe50 56b3c698ccec 80d30827a033 2629d158d3bf",
 "saju_mackerel:ask": "1284fddae164 47c7c0aee20a 7441a1db0681 2d6a7faae292 b9cb87c20d32",
 "saju_salmon:legacy": "fd5928a61d80 0a6c43d24e35 7749922658e8 b65bb3226098 5a931b290957",
 "saju_salmon:personal": "2347af783703 de9e12741549 b820dc577217 bef8e5fd5411 459c1c844aea",
 "saju_salmon:compatibility": "e909a7446fd5 212367fd10ee 1340953e230e cfecae67051c 5ee9aa8dd2ae",
 "saju_salmon:love": "e3424258023b a6e39e2a0041 a78629496d27 478c31dcfa30 8fe7b01b938d",
 "saju_salmon:work": "8e52b9053f30 b95cc41084fe fa436393ba8c fee54eeddbe0 fa41008e9044",
 "saju_salmon:money": "bfe5d5beb3d0 aba94a525056 119e8d5aa7c8 3ae937379548 6ae138fbccb6",
 "saju_salmon:health": "bc05b7ec9e83 d1438bb1bebf 58e1b42aa99c 34a732fe9eb4 c2825221fee0",
 "saju_salmon:marriage": "f1d233245f5d e29ded682a23 67271a21a26b 16b2ab41b30a f9ab1067c762",
 "saju_salmon:movement": "6b1a6e08b5d6 cf12089368d1 a89995844fa4 c45512ab2658 7dfcbf891f12",
 "saju_salmon:ask": "db54101c4140 0c93759be711 42a638617f8d 24a6fff0ee15 459c1c844aea",
 "saju_flounder:legacy": "cd594316b680 e5d9e9bb7670 63d61484b0eb 0e581c4b7ebb d0a1fba4b309",
 "saju_flounder:personal": "9f0e382671a5 338b168940d1 ebd8e3f25dcf 7202471c0fa2 9092b43d5b23",
 "saju_flounder:compatibility": "5c560c0623a5 89fe2f7b4b81 34f3262d5f78 eb044b2a5703 3e8926b65705",
 "saju_flounder:love": "29d04360d300 45e8b5f0dbc2 441b1454fac5 f829576a3b46 703f985f1df5",
 "saju_flounder:work": "f6f915afdd31 dd74ed7d88c3 1a5ed0254d9a ba3aecfe9321 686fbc52450a",
 "saju_flounder:money": "efa2358bc9c1 4f803cfeb476 b595ab411852 d19a9678745d 6c151b1de8ff",
 "saju_flounder:health": "d3bc2885c8e9 3459f714e506 b3a47dccb908 8abba083cbe9 1944e876aec8",
 "saju_flounder:marriage": "f79ac33fc0f7 353b35bbc83c 57068de4f8e3 0fe21aaae3ab c9a479d092d3",
 "saju_flounder:movement": "c76187faf3b5 3e89966e90cf 8c97114031d9 a94f7fe5e878 caadd5f9127a",
 "saju_flounder:ask": "979fe6673869 dc68861cba43 c32ec6b64c0c c8b9db36e8b0 9092b43d5b23",
 "saju_tuna:legacy": "356b024ce814 b6b78b974e5e fb119439118e 8c4ab04cadea a19a748c8350",
 "saju_tuna:personal": "7d578af159f3 b631949b121a b7edc743f5a6 605d84b614cc 004fdfa8ed6a",
 "saju_tuna:compatibility": "f8642c297702 e0d1fa265caf 455733805e96 550fd61ed012 6e327a0ca069",
 "saju_tuna:timing": "18921fa9dc3a 0758cc8dd74e 6f45f0642cb3 bfb0793d5f7f 410bef112275",
 "saju_tuna:love": "f0eaae6bc658 0d3ca1dd4a45 609d0de96bfa 5d5648c69990 135beac68a67",
 "saju_tuna:work": "c7d4fe25ba4b fb1128901100 c16c7a70ebb1 01bf24cba927 f96ef8e37722",
 "saju_tuna:money": "e83acdf4d7a6 7bf9e53ac3f9 c91a2b5df0e5 1154a444601e d0bff6c53db5",
 "saju_tuna:health": "9acfae2ce6a0 34b39f59d806 00d29be8a16e 58addf6000cb 0ff921b2a8bb",
 "saju_tuna:marriage": "17fde381a0ce be857323ec1c 78b88da185d7 a9fcd9a9f51a 0ec0359f02ad",
 "saju_tuna:movement": "dc1bca68fda8 cfd73df4e5c3 d11a4f69668b c2c416baef62 128d0b22895e",
 "saju_tuna:ask": "470fd152414b 349480262b38 0ce74729f634 f0eb36bd2df8 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "1459055e9f64 b1c31767a5a7 ada78fa11211 d8a434aa452d 2371774a80c3",
 "ziwei_mackerel:personal": "d2095f4cb8b4 7cd4a9c71c52 adb7153608df 53ee302f4422 4d36af752c53",
 "ziwei_mackerel:money": "f3b4a92fe48d 6ea097558582 148932b68631 d44271a0176c 49682968473e",
 "ziwei_mackerel:business": "ca853fd769f0 ae262c5dbcbb 32fcf66337bd 7060854ef9b6 8760a0a3cb97",
 "ziwei_mackerel:love": "c9ce1e295c83 f46e366b1d08 01d18f716335 7f70dcd84384 5263a982930a",
 "ziwei_mackerel:marriage": "1a2bb5b21527 e033fc2ca0dd a35d15011f53 b985d0d2986c 34fd69b9fa1a",
 "ziwei_mackerel:health": "8ad18d0dcf33 1b560c450dcc 75e246cc94ae 57d921266171 5c5632463fed",
 "ziwei_mackerel:compatibility": "ac7b49fadf4c 09a712932622 22d5666e9e7a d8030486c36a 18e9ddeda17d",
 "ziwei_mackerel:ask": "f8d37ce6399f ebfce9aab6a2 1547eb0bbede 205d35a63f27 11a73d36d268",
 "ziwei_salmon:legacy": "7d013818f9c9 b7b7b0a50d6d b548bed8771e 0923075ed97e 3fbe37463d18",
 "ziwei_salmon:personal": "0b7feeb06fb7 657c71a52367 da781f7e6900 58713471d73f e53afa1fd005",
 "ziwei_salmon:money": "30b700a6ac79 b680811a9538 7a884d1bd103 9d0611b725aa 5b9032100edd",
 "ziwei_salmon:business": "5250d6ec35b4 908a8427b9ea d6c032ffca65 b219f5302e25 6369360a3c1a",
 "ziwei_salmon:love": "fae165e9fbf8 63a5279a45e7 50880aac04ff 531378441765 04b6c4bb9963",
 "ziwei_salmon:marriage": "7dbfd2788397 fd1db03bed93 2ffd554fd06d 10583ed0b276 87adae473ea9",
 "ziwei_salmon:health": "1d97b26ab68a 7b0284bd5341 deff134c8fcb ad5aa8135f99 68bd7a6f8c8f",
 "ziwei_salmon:compatibility": "086a87368774 36a9149744f2 826b003921f7 d55240acdca6 b2dde48c94ff",
 "ziwei_salmon:ask": "c9b054b767d3 4aedf6a19528 1f8681a458db 1cd4c4dcea29 e53afa1fd005",
 "ziwei_flounder:legacy": "ab675d5516d3 87cd4db6b080 ba4b48bef959 b2c7b3afe72b 9201b10cbef5",
 "ziwei_flounder:personal": "3a0c055aa7b6 fa6b46caab8a 5a4d0e775452 d4b7c2bf8692 379f9e9c59c7",
 "ziwei_flounder:money": "9202a42931c6 8a915895f929 a25f6857e7dd 470d53599ed7 93ce966131ef",
 "ziwei_flounder:business": "a5e04ffa0d65 a09502c16c04 e8b1b1a3ba8e fcca332dd55e f57c13332209",
 "ziwei_flounder:love": "a1675d7b4907 0d12f24fdad4 3e848d56cb43 ccc2875965b7 3641d17b484b",
 "ziwei_flounder:marriage": "d060e53f6e04 ff7b949b62aa 1fc281b53e0a a901d000daeb 7617a833fc9e",
 "ziwei_flounder:health": "4c29ae27273e 73684c558db4 9294ad33909e 0688fb3c21c3 583e184502b9",
 "ziwei_flounder:compatibility": "77969eb2278b ad5f2b995e9a 75a6c9a1e1ce 07144354163a 63bf3208b946",
 "ziwei_flounder:ask": "f0f7c15b137f c7e063ad99d5 5ff2fe396c3f c457c5b7f2b6 379f9e9c59c7",
 "ziwei_tuna:legacy": "cd3c28740b2d bdf4140549e4 663152ee4b27 2483fb87f9c3 8d87087ff586",
 "ziwei_tuna:personal": "410661889360 26bb92ffc83e fdf7903e25ec a01d494fcb5c 4f4beb638beb",
 "ziwei_tuna:money": "062748ca9df5 ca8fa8893086 dc42f9a60c63 1afff2b9f109 f3746b2a9fe7",
 "ziwei_tuna:business": "cf33dd97f67e ed0794c0cd97 471fcb5cb76a 6219fb91cfc5 ce52fe2adca8",
 "ziwei_tuna:love": "eb5564a368a4 8171c75930ce e02cbed3d7da 70df6635a0b5 300807ac1eec",
 "ziwei_tuna:marriage": "873accb48a98 e6884ec6606a d6afd76888fd edb8a0670249 93391b2a2e3b",
 "ziwei_tuna:health": "262fb7a38515 cb866ba75540 5f42a9e55317 449553b250d8 65bbc46fd5db",
 "ziwei_tuna:compatibility": "0c2f3fd7ba7b 3feff663cc24 83695c2fa79f f8c5cb661fd7 3edd1557eb29",
 "ziwei_tuna:ask": "7af1ae953142 1b4cc348f40b 3862432b5879 04ede67128a0 4f4beb638beb",
 "sukuyo_mackerel:legacy": "6c5845b75e5b 9b5a2bfba895 4d7f881e33fa a449f043448f 09cac5e57c93",
 "sukuyo_mackerel:personal": "0a61226dc8a5 93d554d2caa5 4d4be62f9e07 5d81d8861aed 60c2f71db056",
 "sukuyo_mackerel:compatibility": "27fde6510612 7de06655b23a 107007fb2a4d 7c8fbb017035 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "176e9d1a3191 2f405a8f7e1c 887b57ea6e95 5f41f101797d 51c64f67c10e",
 "sukuyo_mackerel:ask": "d565cc5384bc 05db7a42bac7 4dc01da51ba5 a7911e46235a c1b4a3466991",
 "sukuyo_salmon:legacy": "dfc1d45ea886 80d3984bf91c 7c1fa385e86c b72cfebdfe27 40764a5a48f1",
 "sukuyo_salmon:personal": "73b73a3092b7 d8435938924f 11524d2de261 9a39b75ba869 c7963d52d5c2",
 "sukuyo_salmon:compatibility": "fd7613441af7 cecc2233caa0 d703c940f908 511fc07919d3 cc372c1aa463",
 "sukuyo_salmon:relationship": "9eee3bb75b8f b7402d954217 fc8163cdb87e 675515733d62 4a2ab417052e",
 "sukuyo_salmon:ask": "8e0b9daaeaa1 2682d426b1c9 bb4403f3e1cd 777030280c73 c7963d52d5c2",
 "sukuyo_flounder:legacy": "595d72ff068a 97a55833f8d6 4ba8fb8aa1c4 a3a3c5ae25be 41630a4b9f1f",
 "sukuyo_flounder:personal": "655b049304ca 87682147c6de 8a12293b2140 5134f933585f 337c369df170",
 "sukuyo_flounder:compatibility": "44588e43f1f1 73c334811698 acf3865faba9 52fb8c9bfc45 3b18417c9ffd",
 "sukuyo_flounder:relationship": "676744ac1f10 924432e09712 37e3c696b611 39655e32eb1b b69fd6f8148e",
 "sukuyo_flounder:ask": "19f0bec0141d b218375bdb26 732de8b65fd8 8950a5fb9410 337c369df170",
 "sukuyo_tuna:legacy": "fc3bb70ae112 67b8bc65a106 838c40721264 90218cf2bfde bbdcc5db3d05",
 "sukuyo_tuna:personal": "d2255f58d54a 9b370e23fc4a e3a14bae903f 70349d12137a 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "ad30c87bfdee b491b36b1de0 da64bed0f800 a47a1db94aa4 cf557e59d9fd",
 "sukuyo_tuna:relationship": "ccc767726a42 e8a8b7b1824a 82d330dfc9b0 80d8843d3e6e 6371bf908ad4",
 "sukuyo_tuna:ask": "7398acfb95e0 b92129febe14 5cb673cd94c6 e5cbd184afba 933a3eee4cc4",
 "vedic_mackerel:legacy": "4f5570c36030 0b0945d2713a 48d12eddaacb 0096ff6a2f05 0ab96e7ba746",
 "vedic_mackerel:personal": "bec4847a30a2 5e3c0ea8fa81 e27801f457bd b4ca340d4b5d 3b771e8d6049",
 "vedic_mackerel:compatibility": "dc5216fc7bd2 12b2be97f931 015e98dd4baf c60e004270a8 93639036c9de",
 "vedic_mackerel:health": "94b88d66350b 6caa1af756c7 98b3b7507f2e a794e235952c 1d731a0d27b6",
 "vedic_mackerel:ask": "1846bbbdb8c2 1d4a2f569a7c 583a26df36e5 f0c0f46def80 0f802baef856",
 "vedic_salmon:legacy": "2d6c28795849 3893f90a7f1f 746d4e5b52f9 a84871023771 d832b44c39d3",
 "vedic_salmon:personal": "cdc09a11655b f623c66c6a04 753ebef69eda 6ac5773867ba 5474c6f3d686",
 "vedic_salmon:compatibility": "49409b7c415c eed5b6d70ee1 7c0bb5aab578 67213258e2bb fa9d3f4db03e",
 "vedic_salmon:health": "620d8750f1ca 282a45c499fe f599c759a1cc e75680000a4b f88b928d0896",
 "vedic_salmon:ask": "0c9d6f33aa88 6ecd30df4e6c 116a73745e0d c7eeedac1d4a 5474c6f3d686",
 "vedic_flounder:legacy": "f14c7768895c 72458368c9f5 ed2835a1f842 4caa5f878224 f4c3879ba491",
 "vedic_flounder:personal": "e3fed513a49f 63dc10a784ce ade021c274cc 31af598f92b5 fc7c88f2f9c7",
 "vedic_flounder:compatibility": "6f1d50ac270b 6d9c18753602 1d5eb269b78b 68a0696b2005 42739f81cb7b",
 "vedic_flounder:health": "f9cdcb383dab 59f745e40e21 e739572539ac 0ab77e276e4b 966635149b77",
 "vedic_flounder:ask": "3b135e4874c7 8cdb9111f200 093cd0086164 fa3757e16cf0 fc7c88f2f9c7",
 "vedic_tuna:legacy": "0eb28fa5e6ea 54bb8b0b53b6 cbb041dabcb4 4ff2f14f79e8 9a50bce25627",
 "vedic_tuna:personal": "4327a12db79b 189e337efc8f da1654023b5a 4eeee8d91d64 621ad1cb46ba",
 "vedic_tuna:compatibility": "58273a8ae81d 4ac1e7325f2e ec562b84928b d205043cd2a7 81b70a1080b0",
 "vedic_tuna:timing": "188577efe11d 7037c447b4e9 4251c4f7bea7 057a78489289 d48d8fcb6c1c",
 "vedic_tuna:health": "498eae4d0156 705b8976787f 470fc9084e86 5074bb2df060 2c61521bdda7",
 "vedic_tuna:ask": "421d2289a789 96d0bc42a715 93b06e7acfea 841aaf39ded3 621ad1cb46ba",
 "astrology_mackerel:legacy": "e51a5e01dda9 ce88af2baa39 a3e19fe5f660 35ad5816864e a01f7e3b5491",
 "astrology_mackerel:personal": "12c3ca714edd 80e06d9de89a 9d3fee05321b 13ba36c1e3e4 97192bfd920b",
 "astrology_mackerel:compatibility": "d5c22439eb6d 0bdef4698d78 ed0bc29a8807 d1a94dd80f87 947276fd4fb0",
 "astrology_mackerel:work": "0872288a7d22 641a06250ec1 be053987f706 baa45aa47698 e4a4f0f408bf",
 "astrology_mackerel:health": "9f029fc17d67 6104c50cf391 cd7cbe443bf0 a193b0b8f149 d385b09c4704",
 "astrology_mackerel:ask": "d164520000d8 c3cc933deed6 65dbcfda1c77 612e843cb82e 91f01265e663",
 "astrology_salmon:legacy": "e47724847d5f 83b9782dae2a ed8e4cbc2bb5 e2d178efdaee 86295650d714",
 "astrology_salmon:personal": "a53da79791d8 39832177d0ce 119d57009d0d 86ca63e01edc 72ca7e92b68c",
 "astrology_salmon:compatibility": "9610fb124bdd 1b069ef40067 15eadc15cc9b fa60dc20a202 44ac79cc8a00",
 "astrology_salmon:work": "c846929a87c2 ce6876ffdf9f f284fb5f1681 cd8d5297ecdb fff231879a7a",
 "astrology_salmon:health": "6d9fdcce4bb6 c7b5391556f1 770a8f6aa017 0a10ab0d29f0 20e4a60a5d0a",
 "astrology_salmon:ask": "d4ba6b0c31a9 dc2ac1b9d009 9a44b27ebebd a668f895a00f 72ca7e92b68c",
 "astrology_flounder:legacy": "4c5380affba1 917d9da387c9 30e6bc367451 0f7e6ba31905 30093a83fd6a",
 "astrology_flounder:personal": "295f04802e40 74988ac39759 0b5334d07c5b e6d340adcb14 6c9e8804cea9",
 "astrology_flounder:compatibility": "d6c95cd79932 2e2b30467ab0 ce34f2f748a2 b65345602c55 ec7069c5b342",
 "astrology_flounder:work": "1afce6174374 cc7a22aff69f 3da534490d75 2c4120f140b5 39c8e4a84a00",
 "astrology_flounder:health": "ddeba6059018 e279e48517f0 e3587a8d3df0 153b7219e502 4d71440d56a5",
 "astrology_flounder:ask": "8822a83e9faa 364719ed453e ccc26f5dceae 602dd4e175c9 6c9e8804cea9",
 "astrology_tuna:legacy": "02b06023eff5 d666e15b4109 d7d747c181b2 a7c402d39a0b 448e1eeab4e4",
 "astrology_tuna:personal": "12b4149e79e3 52c67e43e31d 0ff72bfce265 f7f85730e598 24cb225a6499",
 "astrology_tuna:compatibility": "90243a278a20 82d7ee76fc13 c03cbea2623e c5ab256d00aa 5a7751a54441",
 "astrology_tuna:work": "8d0e5d1bd6b0 73955e02cc0f 16c6a0a5d3c4 f5192dd36591 22515b7f0512",
 "astrology_tuna:health": "8d1af0567569 42eb1811a400 a028267f4f4b e15fcff350cb d1a3aa0ef9a0",
 "astrology_tuna:ask": "8777a917b06b 19615546dd33 96491536a475 413eb8287adf 24cb225a6499",
 "tarot_mackerel:legacy": "9de5bfe75911 43bed14b8a25 31a5cdf2c274 ba44c1332ca9 6aa275b457cb",
 "tarot_mackerel:choice": "df81395f0d5c 9982f8415792 667ed8be0564 c6d110f4cf29 3040b60d8f9a",
 "tarot_mackerel:love": "b8eebcfdce1a da4b99e5dd0b 9447149dd807 9af4e3199486 ec43dbbb0b03",
 "tarot_mackerel:feelings": "886649f25a1c 57d7275a43f2 0d077bad357f d2f92c4c53e8 bc0e5ae95bf7",
 "tarot_mackerel:contact": "1fdf6236fd8c fd409f70e6cf 4259d8bea2de 4ee3c2c06bec 21a5bd9065e1",
 "tarot_mackerel:reunion": "d15de15e33f0 ecbcf165937c 8b97417804a7 9fa9d19a0d4f df15382a96e6",
 "tarot_mackerel:compatibility": "0f27c577a06b 902e3a7d15ab 6ff58be70190 4bd28c918692 4d861b98fe65",
 "tarot_mackerel:career": "74328e6b6f1f 33c4b490ffe3 53a20bef4754 3c33bc383612 13497923b755",
 "tarot_mackerel:money": "7fbb7fa0a780 0c0986700e53 d7fe0f79c0ee 63c03e027386 224b9c813d4f",
 "tarot_mackerel:healing": "59388b8fe1cb e76a23eac056 5b760608488b a1427bceda16 1eb77aa56722",
 "tarot_salmon:legacy": "5b9fa1218b45 6587657197e9 61a7c2a77384 aec1c40187eb c3a12d10a0fe",
 "tarot_salmon:choice": "74009905e2bb 7ea400c60cd0 78d887bead65 fa865bbf3830 0847bd77ffd7",
 "tarot_salmon:love": "19af7baadf99 f60c7b1e7e3f 3cf131bde685 53d9676ffe2b 827911f6ce9f",
 "tarot_salmon:feelings": "7c4c66a0df29 f51e41101f27 0880f46cd697 e90a68ddb485 70b9d4e56209",
 "tarot_salmon:contact": "eecaf88ed0e2 150b565fccc5 0d58fefd0b90 f30bbe742031 4941803d57e7",
 "tarot_salmon:reunion": "d9656d5c6a9d cdf46c95a87c 98ebf1d1240a 1e56ad50dc19 44d11dd84fc6",
 "tarot_salmon:compatibility": "a348c79d986d bd81587a486a 6cbd703f200d 31826a4c452a d804ba957030",
 "tarot_salmon:career": "56de65b82a10 6f555a881869 1126770b5639 c031bfaddddf f46beb4fa9d6",
 "tarot_salmon:money": "602cf255383d eebb1c96182c 3fcaa51fb415 b30ed18c75cd 21e2fafe34b6",
 "tarot_salmon:healing": "824f983271ee 461dd6b37469 ca44b76f38c7 2abf20d8aee1 430442c7d301",
 "tarot_flounder:legacy": "8fc047fa8c8b fe0de46604ee dfcc8d9be148 2e87e4b83f0b 200019185775",
 "tarot_flounder:choice": "414a23595a33 87f80189be5e bd675e544724 59f4247b9708 157bdc132835",
 "tarot_flounder:love": "20b90516caa6 9f45d70acdf0 1f4d4d71ba83 ec4ad01413ba cbc2d0bac5dd",
 "tarot_flounder:feelings": "99611f16b9ac 4e25ac82c2d9 4a1bb840278c 15c7f7083c70 155ee41a74e9",
 "tarot_flounder:contact": "be2ded516b7f f17a888a0305 981880029307 97d22f088430 a58662eaa3b3",
 "tarot_flounder:reunion": "b696569a31ca 7df06fb3d267 f309ec7af385 2b3b593d7efa 965f27fad840",
 "tarot_flounder:compatibility": "2d8dc0aff93c d1dcaa80fd2f 1afe89b84027 cf82ce7040ba 0bf12194b51a",
 "tarot_flounder:career": "2f6517d1b974 89d60ed342a0 c28fe1898993 847667becfd2 d2acb7269ee1",
 "tarot_flounder:money": "f6fe1be79301 66272e009bd6 e7dcd9589fa4 63027624c785 21275b3046ea",
 "tarot_flounder:healing": "7530bccddee5 e28f67e490f4 af1c88a9db0d c31935325177 0f7fa52555e7",
 "tarot_tuna:legacy": "d752a896960b 68392d82bb4e 76101d8c2e68 c8da201e064b cdfa81f3a8a1",
 "tarot_tuna:choice": "b10b6fda1154 e1a399bbbf15 c0b846628485 49fec8428427 e4dde4d5d80d",
 "tarot_tuna:love": "080da1df3506 8a54f3037e5d 21e578cc2fdd 577edc40f2f0 f40bb48c0c1e",
 "tarot_tuna:feelings": "777177460814 4a5d8787e7b2 0f5cc59a0586 4d589714a023 b25624fbfb68",
 "tarot_tuna:contact": "aaaf3c2a30d4 d1875808e548 e960fb969273 63455c1efba3 570e72f29211",
 "tarot_tuna:reunion": "e301692fc335 892866523665 affc94c8b016 2902a3112cb7 fc87f92e1b6c",
 "tarot_tuna:compatibility": "db2a0da1dbd3 3b09209f5404 7e0554bf1e3d c4f89c83aa30 40fdc1754827",
 "tarot_tuna:career": "9f2b96b69e7e b6665dedbda6 8be2e11fbded b6ce71632f30 8b7cba3384f8",
 "tarot_tuna:money": "8c537b6a25d0 23a4035cdfa0 db59d694c472 f4fe4398c3e2 3f92ccf43eb9",
 "tarot_tuna:healing": "95237eaf1eb6 0e111963c7af 836176111e47 7968e7e88f17 65e3551e850c",
 "fusion_saju_ziwei:legacy": "d8a3a1b9dc9e 4f04ce87402d fc7a80d7a329 3c4cb4e7b803 8d73543657a4",
 "fusion_saju_ziwei:personal": "0c259c5813bd 48cdade15a2c 948d2c4b92bd bd185706f3db bfa4f82013fa",
 "fusion_saju_ziwei:ask": "f3f3931e2b47 85d90a262523 7812d271e57f 285341aec03e 8d73543657a4",
 "fusion_sukuyo_vedic:legacy": "b9668808c61a 4cb9f626628b 329e46d46f22 6d5c673bad8e f5e2367a6a10",
 "fusion_sukuyo_vedic:personal": "7c34cff54083 b1d0588df81b fc7151c0baed d64cfee1a3f9 defabda6a501",
 "fusion_sukuyo_vedic:ask": "ea9582fba459 8f92434e5028 3755fe893042 4d0eee709ca5 f5e2367a6a10",
 "fusion_astrology_tarot:legacy": "7eb0f10d7751 0384c7a684f9 8212217b5273 7dc488c2583d 25e4aacb63c5",
 "fusion_astrology_tarot:personal": "e3271cce5dca a1e97d850e4e c63901eefb35 3b85226ce41d 656712d72276",
 "fusion_astrology_tarot:ask": "9c36a035236e 594326d12ca8 ed1e3123c751 1de30db47b3e 25e4aacb63c5",
 "fusion_all:legacy": "dce6cef7628a 4a5654c9be69 48287e66daed e0dd40a9c940 41723e0e4970",
 "fusion_all:personal": "6c1cec6e4f99 9f3b6f25bdd2 bdd5cbb33fc9 db7cb82c5e83 8d19aca0ff68",
 "fusion_all:ask": "19a87fc0d85a 556461134b32 dd4c85a0ca17 2869a6f0e862 41723e0e4970",
 "saju_salmon@timeUnknown": "17320ec62b87 efa23f6960e8 b78e82669274 3cbca35fe723 -",
 "saju_salmon@timeUnknown:ask": "a8825288a49a ef5028ef529b 627222f3016e 446ce98d9b2d -",
 "ziwei_salmon@noPlace": "b677ba32df09 b4e1e85a6ca0 da781f7e6900 58713471d73f -",
 "ziwei_salmon@noPlace:ask": "6539e4e533ea 427f29c70c0d 1f8681a458db 1cd4c4dcea29 -",
 "saju_mackerel@spirit": "7957bcfcf071 b6866a0a7f20 dcb27fd81115 c3b521dd1883 -"
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
