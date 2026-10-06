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
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
// 2026-10-05 approved price correction: price is part of the fingerprint, so IDs and preparations change.
// All provider requests, validated prose and manifests remain identical; mackerel rows are unchanged.
// Locale opening adds the formerly Korean-only standard kinds; all existing 123 rows stay identical.
// 2026-10-06 purpose-counsel-v1: 198 new ordinary identities/preparations/prompts change.
// Only saju tuna personal/timing/ask mock bodies change (cycle ownership/coverage).
// All 199 catalog manifests and the spirit contract remain identical. Stored purchases are not regenerated.
const EXPECTED={
 "saju_mackerel:legacy": "6e349b9090e2 aa440fd1fb24 d7b2d70d627a 523f22b7e9d2 42f2c5c373fe",
 "saju_mackerel:personal": "4f5d6510d8a8 0e8c03395de1 535b126e424a 576a177dd119 8c9adb9e6d01",
 "saju_mackerel:compatibility": "6d5316fb339a ea08a5ec26d8 822e185b8d53 d850d63e7b8d 163444337fa9",
 "saju_mackerel:love": "70c5b2fcb02f 1662a1d9f07a f7ec742fcc3c bd61958026a4 3e239ee154a7",
 "saju_mackerel:work": "544462ead054 58caaf78469d 0600a198bdbf 5dfc73127678 1dfa9237efd8",
 "saju_mackerel:money": "17a13e55902f d757a3a9e636 69ed45a99df0 c4202c21b93e 054738d4280d",
 "saju_mackerel:health": "926f57364e98 6132fbd88af5 999d9cdb98ea fac7adb5703e 6f349850e339",
 "saju_mackerel:marriage": "e4030cd9f2aa 0ffa4beb79df 97f8be5dab74 f2c52480352b d0f64253c7e4",
 "saju_mackerel:movement": "77330f5a3baa 21e2b33d6cc1 b2f8218fe76b 9657a05b473d 2629d158d3bf",
 "saju_mackerel:ask": "d5164b5c6528 cc3cc97e9243 87c00fbd75e0 c518b7fcbe38 b9cb87c20d32",
 "saju_salmon:legacy": "c4059953b1c4 7ee009e203c7 99758a137995 6e55eca0cd90 5a931b290957",
 "saju_salmon:personal": "4fad35d30e39 27698d603ca7 5e30633a3164 ee73364e5e65 459c1c844aea",
 "saju_salmon:compatibility": "2fbc83ced648 0ca2e8c516ad 5e2750ab44ab 896fd690c8f2 5ee9aa8dd2ae",
 "saju_salmon:love": "4bb9738214c2 f87b1d57d03a c279c74d43d2 a0acd49a317c 8fe7b01b938d",
 "saju_salmon:work": "147bc8320bfa 0dee25e268c6 5d7985b5bd35 dc13148a2077 fa41008e9044",
 "saju_salmon:money": "48307058160b 71ce8c1ee56b c6f914eabff2 e85058adb05e 6ae138fbccb6",
 "saju_salmon:health": "f6b385b92a0f 1f2ba9f64baf 8c140df8d5ab bf43fb46fee6 c2825221fee0",
 "saju_salmon:marriage": "0c15e4d1d0df 04d5e42be59f 9a721f64ad4e b9e780e4c410 f9ab1067c762",
 "saju_salmon:movement": "2fcdc70d66e3 9de3771b220b 29a5d8548060 6ce824c4f372 7dfcbf891f12",
 "saju_salmon:ask": "11530890db73 5f542454d7bf b24b19019adc d1ffd9baa627 459c1c844aea",
 "saju_flounder:legacy": "2f03e9541f66 7cbf63822ac2 f775730ea788 f0eb4c1c53a6 d0a1fba4b309",
 "saju_flounder:personal": "27847cb7453f de7a1fb75383 1e588124c42c a056d8c0af1d 9092b43d5b23",
 "saju_flounder:compatibility": "d23151e45632 f739c27b964b 9c30e151ec02 506896de9240 3e8926b65705",
 "saju_flounder:love": "2d8501ac26fc a62d87953b19 56e0346ac158 f97f4074da08 703f985f1df5",
 "saju_flounder:work": "00a830fc552b 3fb15c81541b bf283f6672bb 6b4e32d9f821 686fbc52450a",
 "saju_flounder:money": "b9cf42af5cac c37250879754 6bcfc663b365 5af2ce216b02 6c151b1de8ff",
 "saju_flounder:health": "3819175f0fff abb25408f884 d1e8fbd5d38e 6323b2b9610a 1944e876aec8",
 "saju_flounder:marriage": "295b713484dc c0ed08f652ea 8dde91980d36 c0d333b0c0ba c9a479d092d3",
 "saju_flounder:movement": "f4862e9b8c23 e78bf1d2b125 9c770279e5eb 4ac3f216cb99 caadd5f9127a",
 "saju_flounder:ask": "87bc8fe3f10d b9cf23771ab6 a40b2bc86f69 ea126435b7b9 9092b43d5b23",
 "saju_tuna:legacy": "356b024ce814 264e7f6feb97 778698030c46 ef60db5db116 a19a748c8350",
 "saju_tuna:personal": "7d578af159f3 a86c6a924821 5eefa93ef0ae fec2ed83d9b8 004fdfa8ed6a",
 "saju_tuna:compatibility": "f8642c297702 de2b864821a5 74d26a5b06d8 a38016580b21 6e327a0ca069",
 "saju_tuna:timing": "18921fa9dc3a ba7db858f79b f2c109d4be98 b2458e66db86 410bef112275",
 "saju_tuna:love": "f0eaae6bc658 e67fa8558511 3d6416744d31 0757839598d6 135beac68a67",
 "saju_tuna:work": "c7d4fe25ba4b 5a1cb4e8e5e8 69221b100691 1103bf8ee618 f96ef8e37722",
 "saju_tuna:money": "e83acdf4d7a6 cc342dd40223 447e78e2677d eddea4a1731b d0bff6c53db5",
 "saju_tuna:health": "9acfae2ce6a0 b88868a4ab07 6f459d35e4a5 9f18d362fe6f 0ff921b2a8bb",
 "saju_tuna:marriage": "17fde381a0ce 05de23f0a1ed 23b961b7225d 40a1f2c23ff0 0ec0359f02ad",
 "saju_tuna:movement": "dc1bca68fda8 202f967a58de c4376fde351a e0edd0f17e88 128d0b22895e",
 "saju_tuna:ask": "470fd152414b 37359df32421 527c1a09a171 4d2640148ef3 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "29742ed89149 3dbce7e75607 329d98f17faa a724a0893fc4 2371774a80c3",
 "ziwei_mackerel:personal": "6cc29878e8f4 90d67fc13a2d e10487b67fb9 912682461437 4d36af752c53",
 "ziwei_mackerel:money": "8945757509f6 ddfda75c60ca 9d15f4330bd0 057bccc22952 49682968473e",
 "ziwei_mackerel:business": "5315a99b5124 c9e82e8846b9 d38b8fd6e404 2c34c14652f2 8760a0a3cb97",
 "ziwei_mackerel:love": "b08deb8bb7a5 e6c0c90a2fb4 214efb07fff3 9bd456596324 5263a982930a",
 "ziwei_mackerel:marriage": "171a4840e196 b49d7b592422 f3bb246f4801 a587c731e081 34fd69b9fa1a",
 "ziwei_mackerel:health": "fd750a86b434 36325237f9e4 9555d6647078 c0943bc9e8d1 5c5632463fed",
 "ziwei_mackerel:compatibility": "475609ba3a21 1c789554df2a 68b9c51107c1 a4c0d66a02d1 18e9ddeda17d",
 "ziwei_mackerel:ask": "2ce3c28cea28 688603d3936d 9a9f33dd8e44 5b7e32196b3a 11a73d36d268",
 "ziwei_salmon:legacy": "4eba21beffe8 1c849a2fab1c 42227acd8adc 24a1eb454199 3fbe37463d18",
 "ziwei_salmon:personal": "182619b304b2 715058312f7e 27c112869e01 dfaf78dcaa09 e53afa1fd005",
 "ziwei_salmon:money": "5cf3ff225d95 ba3eddb5a3c3 7c1dd0a4cc60 55c1ca0b38ee 5b9032100edd",
 "ziwei_salmon:business": "b9e70f75c588 516494c72b50 efb6a4f0ba91 673f44e6166e 6369360a3c1a",
 "ziwei_salmon:love": "5c701f74b891 94d74c8815d5 8d09cc0be711 7d002438e8a9 04b6c4bb9963",
 "ziwei_salmon:marriage": "47622e938dcf 0eb013e392d8 26845f58ebc6 5f589b0a438c 87adae473ea9",
 "ziwei_salmon:health": "26f94b2db815 e20a774b4d94 3457588c5928 cf3ecf78fb3c 68bd7a6f8c8f",
 "ziwei_salmon:compatibility": "bd5a1739767f d86f3ec90892 632128b4768e 28190f173a4f b2dde48c94ff",
 "ziwei_salmon:ask": "e6f8681435ac ea774a2e33f7 2abd34601642 cecb90defc5e e53afa1fd005",
 "ziwei_flounder:legacy": "012f25e16f38 922534a8a7e3 e134d7a3c90a 5d55ae525ab7 9201b10cbef5",
 "ziwei_flounder:personal": "102b4e9ae7f3 924c860b4d1c 22e31986aefb fa9e4c4c4cd6 379f9e9c59c7",
 "ziwei_flounder:money": "4ceb2c62e792 7113cf49567f f8c2f0fbf88c e3577ffba1ec 93ce966131ef",
 "ziwei_flounder:business": "7d35a09bfbd0 8ef520b101f1 3267e76e494a 51a6e38aaa28 f57c13332209",
 "ziwei_flounder:love": "0c45753b2686 30007ecd7af6 6856274bb509 68da9e9d68c4 3641d17b484b",
 "ziwei_flounder:marriage": "b6e02fd1749a 9686371afe00 8e4460b82e6e 1624b37c30f9 7617a833fc9e",
 "ziwei_flounder:health": "775e9c1581c0 f3787cb777bf e8d1dd76c56e ab6e2589d58f 583e184502b9",
 "ziwei_flounder:compatibility": "5336dfd3e6e2 f4dd3da5f7b4 9cfce9215835 22fccee4ef3d 63bf3208b946",
 "ziwei_flounder:ask": "a50a6db1b065 1c84d0ad272e 9fdc2eadbfce e121d001222b 379f9e9c59c7",
 "ziwei_tuna:legacy": "cd3c28740b2d 6aa645251ee6 9e8c6f9b3486 c2da084256c1 8d87087ff586",
 "ziwei_tuna:personal": "410661889360 05bb64d29a6c 627efddb0a2b 7f2cce5d925d 4f4beb638beb",
 "ziwei_tuna:money": "062748ca9df5 12ae11303726 2d5c64198e0d 6bca0d46f96f f3746b2a9fe7",
 "ziwei_tuna:business": "cf33dd97f67e 7d575ab69f80 833d619725f3 b3cade28537a ce52fe2adca8",
 "ziwei_tuna:love": "eb5564a368a4 175e06ecade2 afc4cfd5f2fb bcecee72deb2 300807ac1eec",
 "ziwei_tuna:marriage": "873accb48a98 dd8d3160791e f177b1adca72 c3a16301a2d6 93391b2a2e3b",
 "ziwei_tuna:health": "262fb7a38515 b4722a10fc67 7252268010c0 84131b83c351 65bbc46fd5db",
 "ziwei_tuna:compatibility": "0c2f3fd7ba7b a12a6028185e 4d88f1956c07 75285547fc67 3edd1557eb29",
 "ziwei_tuna:ask": "7af1ae953142 6602a13e74cb efecf70fde5f 921ae83c354a 4f4beb638beb",
 "sukuyo_mackerel:legacy": "c98f91daf034 5f2ab5293cd9 36939146c860 0fcf0d66b984 09cac5e57c93",
 "sukuyo_mackerel:personal": "540fdaaed22b 0fddadc792d6 4c309f291515 49345666bd18 60c2f71db056",
 "sukuyo_mackerel:compatibility": "9c37f9df5ccd d3d0ad0358f1 151ba2bd0c6b 2f84d874b2bd 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "8daadcfae9b4 618c82768f3d 3a6687dd385f 981eb9605406 51c64f67c10e",
 "sukuyo_mackerel:ask": "3b5ab6faba21 a2eb80124426 aad90c0a53bf d2b0d069839c c1b4a3466991",
 "sukuyo_salmon:legacy": "a346632ae5b9 bf03e21a754c 80887e957063 c3ae5e8f2735 40764a5a48f1",
 "sukuyo_salmon:personal": "863336e61976 35bfc596aaa6 c4b1ec285889 9814fc14064a c7963d52d5c2",
 "sukuyo_salmon:compatibility": "0ccdf133cca1 52e824304355 abf33beade51 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "ef726da94c1d 53e5da12365c 315df6103083 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "3e67f0cb3aae 91b830560aa9 ee6e369d837b ab1985ef4e08 c7963d52d5c2",
 "sukuyo_flounder:legacy": "091b2f61c49d f7261ba33890 1e20d869dc7c 5ccb039d632a 41630a4b9f1f",
 "sukuyo_flounder:personal": "1a83a81b3eb0 82a8206876f0 6112fcf8c915 eeae4d38448b 337c369df170",
 "sukuyo_flounder:compatibility": "26ab2a0c3f1b 3c7cea883c36 8da14087a3e0 2304eee6e9a6 3b18417c9ffd",
 "sukuyo_flounder:relationship": "59452a618926 7d87d67f149d 554820d31286 6d1a77ac89dc b69fd6f8148e",
 "sukuyo_flounder:ask": "f591aaf79c2f 3777a1fa8f84 d0c4f01639ec 7c11adb2741e 337c369df170",
 "sukuyo_tuna:legacy": "fc3bb70ae112 cdc2a5c6f6cf 33caaad4e297 ef0aef6230ad bbdcc5db3d05",
 "sukuyo_tuna:personal": "d2255f58d54a 80c718d737b2 58cb5dd4e1cd 844483faf4c1 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "ad30c87bfdee f8810911ea22 43a93f8a2beb 7be4b42fb211 cf557e59d9fd",
 "sukuyo_tuna:relationship": "ccc767726a42 d6681e9884e5 c6b05abadb65 08e96b3c39dc 6371bf908ad4",
 "sukuyo_tuna:ask": "7398acfb95e0 18664b07174c 0a502352d5c5 560109187680 933a3eee4cc4",
 "vedic_mackerel:legacy": "601e9176b770 bdb2af9c3265 175656cedb11 157f8ec92c43 0ab96e7ba746",
 "vedic_mackerel:personal": "8ae8ab526eff 9684772267d7 0d7ca6798a2e d56983683d0a 3b771e8d6049",
 "vedic_mackerel:compatibility": "c242718fc82f 3e6fa60cbb02 af86aeba2ef8 0d889cfcfcdf 93639036c9de",
 "vedic_mackerel:health": "ce8ee9e924ed 5befc043403f dfd02b8b8140 14a8067a9bf1 1d731a0d27b6",
 "vedic_mackerel:ask": "43877c0fd80c fa8badee7d29 9f3483116412 9f608f719a53 0f802baef856",
 "vedic_salmon:legacy": "1cf8d0c0d653 fb385b5cedbd cfc4c29772c2 a3733622132c d832b44c39d3",
 "vedic_salmon:personal": "58d3b9b568dd 9f3ecc095da8 1762ca72856a dc655f5a6711 5474c6f3d686",
 "vedic_salmon:compatibility": "6b62cecab87f c22c019d01e2 27aeaa0bc42e ca7f4fb4370b fa9d3f4db03e",
 "vedic_salmon:health": "35eb1b62abca 1450d836cc8c 9224d5173444 687dfa6f0775 f88b928d0896",
 "vedic_salmon:ask": "4c1722747bbe 225ab874fad2 ce7c88b678ed a2ca79d5ec77 5474c6f3d686",
 "vedic_flounder:legacy": "6a0bea633287 c59867fd5cc2 0137c4021083 a5b37804b873 f4c3879ba491",
 "vedic_flounder:personal": "abaf3b9494d7 d6ca8e94cb18 97d5cceb485f f18b7fa49924 fc7c88f2f9c7",
 "vedic_flounder:compatibility": "8328560d474c e0cba0e082f1 2f7505246bd3 b61b771d31ee 42739f81cb7b",
 "vedic_flounder:health": "ee32023ada94 8a4397aa81e5 7d9f827fa055 ddb0f1d0d937 966635149b77",
 "vedic_flounder:ask": "954cf2dfaf7c b03e4d4e5791 8df02c52c0d1 acc64bcffe55 fc7c88f2f9c7",
 "vedic_tuna:legacy": "0eb28fa5e6ea 70bdba8726f4 3efa322c62f4 6f49931d037d 9a50bce25627",
 "vedic_tuna:personal": "4327a12db79b c52461e61e43 06bdac6d5a79 bac5fbae7e04 621ad1cb46ba",
 "vedic_tuna:compatibility": "58273a8ae81d 0b6e12a074ab 6ec96fb1ae27 3498f3a7137d 81b70a1080b0",
 "vedic_tuna:timing": "188577efe11d e17038b8c0d8 9366f4b0fefd e27b3c1646a7 d48d8fcb6c1c",
 "vedic_tuna:health": "498eae4d0156 b01e941beee4 1fa0ffa43102 5fa9e8392438 2c61521bdda7",
 "vedic_tuna:ask": "421d2289a789 69676660fb61 d9ddfffd9756 358159b4a8a8 621ad1cb46ba",
 "astrology_mackerel:legacy": "e9599ad3b02d b312fbbea97b 4d881f8548ae 0ab26bf80752 a01f7e3b5491",
 "astrology_mackerel:personal": "9712f50a0f82 bb1ba86e0da5 d0ed4b0ef837 21f42be82895 97192bfd920b",
 "astrology_mackerel:compatibility": "613543aa8e7b 38a4f8117e03 f6ef70256cee 1b1c0a248005 947276fd4fb0",
 "astrology_mackerel:work": "dab8f72df97a 18295eddf1ec 2b0ebbe25d46 8f712fbe7c2a e4a4f0f408bf",
 "astrology_mackerel:health": "8ddf7591e7e0 6bbbb46285c1 18b65294449e fddd283c9df7 d385b09c4704",
 "astrology_mackerel:ask": "631eeec5dfd0 fa12cdf604f2 e1a2fe04a040 df6b6ff71777 91f01265e663",
 "astrology_salmon:legacy": "8a76e447cc61 e25259181baa ecb8f034e9e3 d8dcf8655d16 86295650d714",
 "astrology_salmon:personal": "91da07d355b4 fe3e0be36318 2b0e5c8080a8 edc0e569b3e5 72ca7e92b68c",
 "astrology_salmon:compatibility": "2e454eacebbd 908f5317f6a6 a72a90cdcc93 6f1ec6dbebe7 44ac79cc8a00",
 "astrology_salmon:work": "0721e9876abf 3d841be4fa37 044ed4666d00 bbf1b074853a fff231879a7a",
 "astrology_salmon:health": "71732a16a04d 7a5236009204 cff4cb7db2a8 52ad843f2d5e 20e4a60a5d0a",
 "astrology_salmon:ask": "42311c91b1c6 fb322cc8c7f0 8e8a9a634bbc 71418c9eabef 72ca7e92b68c",
 "astrology_flounder:legacy": "a2efc96291f6 1430473d2427 76db05661f58 4543b7aa3ff3 30093a83fd6a",
 "astrology_flounder:personal": "4ac0fb69d4e7 3a8f4ce6439a 3a6c387ac56c 0070521b42d3 6c9e8804cea9",
 "astrology_flounder:compatibility": "d783f722df13 f52362ffb181 0ed7d5ca63b3 da91460a5a97 ec7069c5b342",
 "astrology_flounder:work": "44be169bcf65 11563e0e492c 74ebadc24347 fc1a121401e3 39c8e4a84a00",
 "astrology_flounder:health": "585805418e52 57eb67d62e44 7e547db99002 f1658f72203e 4d71440d56a5",
 "astrology_flounder:ask": "df51574722ab 0127c0096a5e efdd70416239 e4f5952623cc 6c9e8804cea9",
 "astrology_tuna:legacy": "02b06023eff5 0aefa332436a 9e1f73ee1923 1792225f3938 448e1eeab4e4",
 "astrology_tuna:personal": "12b4149e79e3 a5f8bb080e3b 169e11ca4b6a c288b9e85360 24cb225a6499",
 "astrology_tuna:compatibility": "90243a278a20 690bc6bdcbc7 16ebe1a4b8b7 6df7684cd3b2 5a7751a54441",
 "astrology_tuna:work": "8d0e5d1bd6b0 b1314c5e4eae 7172f44b507e 7e19641312b0 22515b7f0512",
 "astrology_tuna:health": "8d1af0567569 f23051b27f32 76bc8606c100 8f0fd6097c9f d1a3aa0ef9a0",
 "astrology_tuna:ask": "8777a917b06b 5363e0f5d684 f7c141cf66a6 2813db9d7031 24cb225a6499",
 "tarot_mackerel:legacy": "0e8ed6e4e08d f6340eccf496 7b550b8f5094 744acfb0228d 6aa275b457cb",
 "tarot_mackerel:choice": "e1271ef3af5d 3bc40c591add 768b57d25b96 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "3fc0a8526e33 59fe3551b087 00128bc8e221 94dcac1bb98c ec43dbbb0b03",
 "tarot_mackerel:feelings": "910b35fd6a9e 8c65eb50246a 40fe77fd27e8 c8035819c627 bc0e5ae95bf7",
 "tarot_mackerel:contact": "3ae7b73a21af 5f0ec5cd5ff4 6c18b6679f99 b73ede99a09e 21a5bd9065e1",
 "tarot_mackerel:reunion": "d3afa11c3a99 00379ad0fb72 b23b46fe202a 1cdf6063e6f8 df15382a96e6",
 "tarot_mackerel:compatibility": "c31c91d1e638 e8fb547881cd 385054ae6274 b7e374b91208 4d861b98fe65",
 "tarot_mackerel:career": "bc444721b1b0 b484aa2e0d3d ff6bf898e1fe 120b01959867 13497923b755",
 "tarot_mackerel:money": "e2516b99e12f ad9bf5458fb6 1aa3949cb8f0 2f319901654a 224b9c813d4f",
 "tarot_mackerel:healing": "a49657926574 02d7e26dc759 9d2c9ae66b21 0e49ddaf9181 1eb77aa56722",
 "tarot_salmon:legacy": "02a2113fb58f a336c02a80b4 825740000948 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "22ad81699315 2719f160331c b373ddd06c67 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "9ebc7bf82c5b bcdf1de2e43d 96afbc5e90b6 92bb7cdeb91c 827911f6ce9f",
 "tarot_salmon:feelings": "5d0dc9176e81 eaf21fbf27df 24a5358301be 55c3984cb7c8 70b9d4e56209",
 "tarot_salmon:contact": "da70e4c43cf3 d3fa110367f9 7ea43a0fe995 70ae70ce57e9 4941803d57e7",
 "tarot_salmon:reunion": "81f6005fc885 bb284fa2a88f d178a830a7ae 6700474ee14a 44d11dd84fc6",
 "tarot_salmon:compatibility": "c483afc19fa5 9b36da6f1060 a432a860cc54 ccc3ed60732f d804ba957030",
 "tarot_salmon:career": "daae35abc7d3 eb1c0f2dceb2 7726e7e92c8d c186041bad16 f46beb4fa9d6",
 "tarot_salmon:money": "808fdec17993 b694bfcbb545 139e080548dd ebfb16c6a1d3 21e2fafe34b6",
 "tarot_salmon:healing": "4f2eff4b855d 01cfb28dccc2 eadce1f3181d a89acc451f50 430442c7d301",
 "tarot_flounder:legacy": "5bb33ea9da2c 08984488001c ecc004670766 7ef6af5f5ccb 200019185775",
 "tarot_flounder:choice": "e99e140779dc 75e33a7fd754 bbd2f51e79ef 5477b2d1cb4a 157bdc132835",
 "tarot_flounder:love": "4d17426f5fe6 49aa83f88d3c a893c33559e7 400e98cb574c cbc2d0bac5dd",
 "tarot_flounder:feelings": "66fc99f9e3ee a23a6ce72bb8 39a3c49625f9 a2ba4e7ae3cc 155ee41a74e9",
 "tarot_flounder:contact": "1312e1e517ec e40b4f19193c 5566f6300a42 9ebbced4e2a7 a58662eaa3b3",
 "tarot_flounder:reunion": "fe59c2e78693 1bd62bccb8a1 cd87dd321d54 533df9030b47 965f27fad840",
 "tarot_flounder:compatibility": "6bc29b34260f fd6464b022c5 90d71876a946 3a360821991d 0bf12194b51a",
 "tarot_flounder:career": "4a11d79dd748 678440edf033 382538d8925e fabea7ddedca d2acb7269ee1",
 "tarot_flounder:money": "0512f632f9fd 2a9a852a3269 900703b7e42d 98884ae34fc2 21275b3046ea",
 "tarot_flounder:healing": "6eff81a01e07 741d1de57b38 eeb7092f2a82 ca2d31cddab9 0f7fa52555e7",
 "tarot_tuna:legacy": "d752a896960b d37b61687ef7 093b422fa038 1f1a9da039cc cdfa81f3a8a1",
 "tarot_tuna:choice": "b10b6fda1154 090043f0ce7a 205484d474bb 2b59965a8514 e4dde4d5d80d",
 "tarot_tuna:love": "080da1df3506 4f7d83b7527d 8a5c52520aef 8ad984c34e5e f40bb48c0c1e",
 "tarot_tuna:feelings": "777177460814 522ecb2b66ad abccc558ecf3 061f2908f5ec b25624fbfb68",
 "tarot_tuna:contact": "aaaf3c2a30d4 7d34028db4fd 180640ec9157 836ddce25a3e 570e72f29211",
 "tarot_tuna:reunion": "e301692fc335 453000d48465 5e914bef9f02 478cc3f21047 fc87f92e1b6c",
 "tarot_tuna:compatibility": "db2a0da1dbd3 2ff82e067530 f137004c3aab 45eff81cebb3 40fdc1754827",
 "tarot_tuna:career": "9f2b96b69e7e 0e977a00e084 5a7fbdfbaf70 026e5647dd1e 8b7cba3384f8",
 "tarot_tuna:money": "8c537b6a25d0 e234c9e3560b 1c00cbf66465 d806bfdd0071 3f92ccf43eb9",
 "tarot_tuna:healing": "95237eaf1eb6 2f50739fb71b 4d540f98accf f5b5513818ca 65e3551e850c",
 "fusion_saju_ziwei:legacy": "9f6f003b090d 501e67e1edeb c671c1304d69 e2ce9773a784 0d9429c32910",
 "fusion_saju_ziwei:personal": "73131ca70500 b087508b4d05 ed113dacbf83 a47c9edb48cc bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "fd0d6b6a9607 b8907c0fdcef f934a7cc9dad 3da8e4cc8efd 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "98b15a8980ee 584c2dc5e5cb 13fec2d390d9 dee56456ba5c 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "4fe2d8d494ca 32b2829bb8a2 6856ffbfa245 6d95d605a8a5 70b570d09783",
 "fusion_sukuyo_vedic:ask": "632500d5a09b b6b53eb15406 07f9beee748d b8c3fa27dfb2 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "919a03ded393 a1304765176a 962942c133d0 deaca8cbfcc9 032738bbd603",
 "fusion_astrology_tarot:personal": "9442cd3018ef 1cd58c1334f3 127fc4fb79ac a00536217799 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "bf4f53c1cec2 a575ae750d59 7a75e25fb9f6 869558d03bd5 032738bbd603",
 "fusion_all:legacy": "50286657f5bf 7236f0ffe5dc d39fd0e383b7 190a0088f6f3 6e8d23af93ea",
 "fusion_all:personal": "5745d9558201 23436276d44c 686419e64f4c 78c18f7b6ec3 d3753452ec82",
 "fusion_all:ask": "868bfb470c96 ea7be624c412 75d98ac46ea8 631de32565b5 6e8d23af93ea",
 "saju_salmon@timeUnknown": "5426a2557336 5f0150c77595 30381467e092 83e96cbac642 -",
 "saju_salmon@timeUnknown:ask": "1344071d85ab a8ca6ef6fa24 d8643c6f890b 86a2e75add4b -",
 "ziwei_salmon@noPlace": "0f299ae8dbbf 2a520008301b 27c112869e01 dfaf78dcaa09 -",
 "ziwei_salmon@noPlace:ask": "5dd073abf565 b54e3eab1296 2abd34601642 cecb90defc5e -",
 "saju_mackerel@spirit": "7030b70c907f ade0a9f1cdc2 776d19cdf40d c3b521dd1883 -"
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
