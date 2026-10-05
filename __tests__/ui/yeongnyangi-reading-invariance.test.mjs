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
// Health safety (2026-10-04): the health chapter of each system carries domainRules.healthContract (HEALTH_RULES), so the
// 28 saju·ziwei·vedic·astrology v7 rows change requests only; IDs, prepare, validated and manifests stay fixed.
// id prepare requests validated manifests — sha256(canonical JSON) prefixes, fixed 2026-09-28T03:00Z / Asia/Seoul.
const EXPECTED = {
 "saju_mackerel:legacy": "ae5cc494c1a5 3c8eeb465352 376333857e28 523f22b7e9d2 42f2c5c373fe",
 "saju_mackerel:personal": "b2667444a02d d356c6e6981d 491fdb26378e 576a177dd119 8c9adb9e6d01",
 "saju_mackerel:compatibility": "3bd795f61d60 4aa204f1132c 3a80e1605bb2 d850d63e7b8d 163444337fa9",
 "saju_mackerel:love": "b4ad47d1e5f4 81bca3891d7e 1ca624feb144 bd61958026a4 3e239ee154a7",
 "saju_mackerel:work": "02dca2811e9c e7a3bf6ab438 f2b5eb123ecb 5dfc73127678 1dfa9237efd8",
 "saju_mackerel:money": "a42529c1b816 75c5e3c6501b b03b02eae569 c4202c21b93e 054738d4280d",
 "saju_mackerel:ask": "9c26b8b2a079 8db4e749508c 3eeb0bda19a1 c518b7fcbe38 b9cb87c20d32",
 "saju_salmon:legacy": "1827e250ffad 51aa040c8093 08254337bbd3 6e55eca0cd90 5a931b290957",
 "saju_salmon:personal": "aaa2f2466c2d 7e6285bb5cbc bf16c38b32b1 ee73364e5e65 459c1c844aea",
 "saju_salmon:compatibility": "510f4ec4dc03 960af23c218c 4460b6158176 896fd690c8f2 5ee9aa8dd2ae",
 "saju_salmon:love": "8301dea619ac 14d92f12a1e6 bc05cd9cad6e a0acd49a317c 8fe7b01b938d",
 "saju_salmon:work": "0b9bc7246e10 6011aa31eb6d c79156973cf8 dc13148a2077 fa41008e9044",
 "saju_salmon:money": "a97a6b006b82 71860f500aab dde7f7b7710c e85058adb05e 6ae138fbccb6",
 "saju_salmon:ask": "712289f13eff 5b6244a0f623 ce058e78bfdc d1ffd9baa627 459c1c844aea",
 "saju_flounder:legacy": "e7fd18ef41d2 b44d14eaca1a 4d12decf52c1 f0eb4c1c53a6 d0a1fba4b309",
 "saju_flounder:personal": "d4d3497238df b33d10fb9ef4 88de205379bb a056d8c0af1d 9092b43d5b23",
 "saju_flounder:compatibility": "914e89f1f311 23b9fe1f127a 10a7082a1546 506896de9240 3e8926b65705",
 "saju_flounder:love": "7bea1c0e9166 b2ea94a12489 920912958ed2 f97f4074da08 703f985f1df5",
 "saju_flounder:work": "3756fd39736c 7418bd55dd9d 74c4966496b4 6b4e32d9f821 686fbc52450a",
 "saju_flounder:money": "63e074eaca06 e009670790a5 0fa388d43f8b 5af2ce216b02 6c151b1de8ff",
 "saju_flounder:ask": "26a584be7260 3fd73be56332 1b3ac92efd1b ea126435b7b9 9092b43d5b23",
 "saju_tuna:legacy": "92a2bb3bbad4 99785cf82a2e 5ae2bb74774b ef60db5db116 a19a748c8350",
 "saju_tuna:personal": "f53142373285 d820720bd512 bdaa97341787 525d3bdc1115 004fdfa8ed6a",
 "saju_tuna:compatibility": "13333a8ff94a d9bd923b0b38 0649286246c1 a38016580b21 6e327a0ca069",
 "saju_tuna:timing": "da474cd9efc8 f10ff5123699 d085deb2874b 77f281344d05 410bef112275",
 "saju_tuna:love": "7f5c14c4a93c 8eb423df33dc 9d1dfd826cee 0757839598d6 135beac68a67",
 "saju_tuna:work": "4fe5dee74a25 a6a324304b04 b7b34fee0a62 1103bf8ee618 f96ef8e37722",
 "saju_tuna:money": "ad1cdabdddfb 530a6d1aa4b7 92bbb6e382d2 eddea4a1731b d0bff6c53db5",
 "saju_tuna:ask": "25882f27a8ad ee67cf022a38 db7c0c856889 53de150652b7 004fdfa8ed6a",
 "ziwei_mackerel:legacy": "5fabbd918059 f27add728b85 029e2e870bc1 a724a0893fc4 2371774a80c3",
 "ziwei_mackerel:personal": "9a3cac445520 ed6a11d1b36e a3655ff3a9a1 912682461437 4d36af752c53",
 "ziwei_mackerel:money": "91501024742b d4a9989433ff 5f085b214098 057bccc22952 49682968473e",
 "ziwei_mackerel:ask": "9644b21da8b1 5b02ec819de1 004944acc64c 5b7e32196b3a 11a73d36d268",
 "ziwei_salmon:legacy": "004a9bc617f7 b568a8775535 139c93d110c8 24a1eb454199 3fbe37463d18",
 "ziwei_salmon:personal": "4d7c09d08cd9 71da94010c0e c551ff4b3f19 dfaf78dcaa09 e53afa1fd005",
 "ziwei_salmon:money": "e6b9c121154e 814c78100f12 a579d96705a8 55c1ca0b38ee 5b9032100edd",
 "ziwei_salmon:ask": "8b2ce4e055cf c7943df5cca4 9a027b0b26da cecb90defc5e e53afa1fd005",
 "ziwei_flounder:legacy": "c865a5d3279a 61de41d427c1 8d17b55a2858 5d55ae525ab7 9201b10cbef5",
 "ziwei_flounder:personal": "2f725d03446d 0a61554442dd ae4c1cef17b8 fa9e4c4c4cd6 379f9e9c59c7",
 "ziwei_flounder:money": "b48ece3f89b3 c6c9f1985640 58d7a2558515 e3577ffba1ec 93ce966131ef",
 "ziwei_flounder:ask": "98df1c47b388 180122af4dc9 5c04df34c06a e121d001222b 379f9e9c59c7",
 "ziwei_tuna:legacy": "b858b442f1aa 04eaa717bc12 9daee3302a40 c2da084256c1 8d87087ff586",
 "ziwei_tuna:personal": "58e16af6d215 e2e9c7eb6c13 524d03eab7f3 7f2cce5d925d 4f4beb638beb",
 "ziwei_tuna:money": "bc29306a5188 d492f38ea0cc 58c55381e751 6bca0d46f96f f3746b2a9fe7",
 "ziwei_tuna:ask": "bfea70216390 9f75497426ad f7c1fd3d0767 921ae83c354a 4f4beb638beb",
 "sukuyo_mackerel:legacy": "95b2de20ef05 7469b0820345 1c90eaedf87e 0fcf0d66b984 09cac5e57c93",
 "sukuyo_mackerel:personal": "26a16f1758ef f4c1aab8942c f4e7f752a4a6 49345666bd18 60c2f71db056",
 "sukuyo_mackerel:compatibility": "257ed1da8f81 a4e6aea1f4eb 8da55bde25e1 2f84d874b2bd 7dd8a795e33d",
 "sukuyo_mackerel:relationship": "6f762e1098c4 3a31ac001012 97216091ecbe 981eb9605406 51c64f67c10e",
 "sukuyo_mackerel:ask": "0a147a59cd90 213bbf7f7296 0e9abb2fd67e d2b0d069839c c1b4a3466991",
 "sukuyo_salmon:legacy": "f277f70cae1b b15714f62447 092c55835d22 c3ae5e8f2735 40764a5a48f1",
 "sukuyo_salmon:personal": "85fe55f03421 5d6bca81e4cd a106570ad4ca 9814fc14064a c7963d52d5c2",
 "sukuyo_salmon:compatibility": "257ed8a5c9f2 7538f2f4fcd5 9d6abf152b21 9df9c3f1434c cc372c1aa463",
 "sukuyo_salmon:relationship": "9241cbfb4ea3 c1744dd78249 379b4eda856e 98068a649363 4a2ab417052e",
 "sukuyo_salmon:ask": "84bc7cfd6a5a 3cc874e3050d c2ee1db8ef15 ab1985ef4e08 c7963d52d5c2",
 "sukuyo_flounder:legacy": "9251942a6e5b 25b2ff270b60 8d046ea2368e 5ccb039d632a 41630a4b9f1f",
 "sukuyo_flounder:personal": "e5afa5db73de 7c14e51e3d45 a2728cb8aca7 eeae4d38448b 337c369df170",
 "sukuyo_flounder:compatibility": "d202f365007c b3b22d34e51f 693532d33ef1 2304eee6e9a6 3b18417c9ffd",
 "sukuyo_flounder:relationship": "f79d83f3de0d 46befc7ce979 f4a7f55c524a 6d1a77ac89dc b69fd6f8148e",
 "sukuyo_flounder:ask": "044d56fd33b5 121aab7411c8 6efa4d48b254 7c11adb2741e 337c369df170",
 "sukuyo_tuna:legacy": "c65e51831124 f0fd424f02fd 3747113f182a ef0aef6230ad bbdcc5db3d05",
 "sukuyo_tuna:personal": "c757cf272d58 6ee96f30babf 33344b9e83e0 844483faf4c1 933a3eee4cc4",
 "sukuyo_tuna:compatibility": "d198dcd7f7bc ca438ab1fdb4 1955c6ce02dc 7be4b42fb211 cf557e59d9fd",
 "sukuyo_tuna:relationship": "89a74222c52c a1350fe9ed70 2847d52e2968 08e96b3c39dc 6371bf908ad4",
 "sukuyo_tuna:ask": "419e9178d936 40414d3efcc7 937051132483 560109187680 933a3eee4cc4",
 "vedic_mackerel:legacy": "f9e81ccaccf7 53f856021038 53f51f203ba0 157f8ec92c43 0ab96e7ba746",
 "vedic_mackerel:personal": "c1044aa71bbb 387408e6550c b58eefee7551 d56983683d0a 3b771e8d6049",
 "vedic_mackerel:ask": "6f0f2860a890 fc1afdfdac14 a459c6e8a24f 9f608f719a53 0f802baef856",
 "vedic_salmon:legacy": "7b24b25baac1 e3ee217d914f 3383e44f4ee0 a3733622132c d832b44c39d3",
 "vedic_salmon:personal": "93075dc8dd8c 641a5aeb7990 4ead54d003f8 dc655f5a6711 5474c6f3d686",
 "vedic_salmon:ask": "2c54f11e0332 bd1cd5551b1a 06a8612e56b0 a2ca79d5ec77 5474c6f3d686",
 "vedic_flounder:legacy": "58f437775488 ff34edd3be8a 2e8639aff415 a5b37804b873 f4c3879ba491",
 "vedic_flounder:personal": "1bea27fd0a42 d8be6d357f55 3d887b9a054d f18b7fa49924 fc7c88f2f9c7",
 "vedic_flounder:ask": "9c6ae0887d7c 1b26fa259835 608ada726c7b acc64bcffe55 fc7c88f2f9c7",
 "vedic_tuna:legacy": "c9806f4c5a6a aff945bdaf92 ddc61292af50 6f49931d037d 9a50bce25627",
 "vedic_tuna:personal": "c8f7f59a9d2d 1fc8cc1179c6 eb065cde699c bac5fbae7e04 621ad1cb46ba",
 "vedic_tuna:timing": "d02298186e6a eee2b8bd04a4 685b1c8e2910 e27b3c1646a7 d48d8fcb6c1c",
 "vedic_tuna:ask": "46d8fa598cdb be9fb71e745a e65a337e5ef5 358159b4a8a8 621ad1cb46ba",
 "astrology_mackerel:legacy": "5077b4bc9fd2 5890f564f961 3b50159039d6 0ab26bf80752 a01f7e3b5491",
 "astrology_mackerel:personal": "da21df533265 801875ed178f 827a8f0af09f 21f42be82895 97192bfd920b",
 "astrology_mackerel:work": "7c1bc1d44c2f 8a6e3f620dad 8ce54a7c60be 8f712fbe7c2a e4a4f0f408bf",
 "astrology_mackerel:ask": "900ede042e06 3ed73f46b517 9ff92299a982 df6b6ff71777 91f01265e663",
 "astrology_salmon:legacy": "90ac2da6122b 8d1d5e8dbafb 6d5d5105282a d8dcf8655d16 86295650d714",
 "astrology_salmon:personal": "812f33b35158 5802fb244db5 73063202fe45 edc0e569b3e5 72ca7e92b68c",
 "astrology_salmon:work": "49966bd035f4 9efd8fba23c8 9a874582ef9b bbf1b074853a fff231879a7a",
 "astrology_salmon:ask": "00e9e6479e07 f236b7d4b4af 0bedd18bf701 71418c9eabef 72ca7e92b68c",
 "astrology_flounder:legacy": "0ca022fb3a43 df984c40dbbe dd24ad735a52 4543b7aa3ff3 30093a83fd6a",
 "astrology_flounder:personal": "7d5579795307 916a68d82b6d f6f057ae4a44 0070521b42d3 6c9e8804cea9",
 "astrology_flounder:work": "dc3dc75cc877 76d9d479cbb3 98271abcc8a9 fc1a121401e3 39c8e4a84a00",
 "astrology_flounder:ask": "169ded6cbfd1 39d5cfffbb26 2ca37aea2524 e4f5952623cc 6c9e8804cea9",
 "astrology_tuna:legacy": "f0c491f8e88b 9c82e0bde3bb 2636e778e274 1792225f3938 448e1eeab4e4",
 "astrology_tuna:personal": "6d0f23c80574 322cee4f10fa 093be9baea6f c288b9e85360 24cb225a6499",
 "astrology_tuna:work": "02147a3c4154 8db0b16aa22f a6d03752ec02 7e19641312b0 22515b7f0512",
 "astrology_tuna:ask": "6db416ff0fcc cdebd4fb6ac5 ce1d87402ca2 2813db9d7031 24cb225a6499",
 "tarot_mackerel:legacy": "d1afa0265bd4 269658391dc0 0ecc482caac0 744acfb0228d 6aa275b457cb",
 "tarot_mackerel:choice": "10545d446ede ac50b5a691f6 e7fe2474302a 69ed41cb7f31 3040b60d8f9a",
 "tarot_mackerel:love": "380078f7ec94 90665f8bf95c 755a5ef7f104 94dcac1bb98c ec43dbbb0b03",
 "tarot_salmon:legacy": "31b1a10a0225 d7ca09909905 578ae030d636 e07dff5f971b c3a12d10a0fe",
 "tarot_salmon:choice": "faf6eb59bc3e f8381855d207 4f0f892cbd7d 46778f85fe31 0847bd77ffd7",
 "tarot_salmon:love": "55c74e8341b2 10c37e5c1fd9 aa02285381a0 92bb7cdeb91c 827911f6ce9f",
 "tarot_flounder:legacy": "c7f84f733b2b eedc7a86a7bf 00bb3aef2d48 7ef6af5f5ccb 200019185775",
 "tarot_flounder:choice": "e161b4f77236 c36553c5542a 393b8afe3c69 5477b2d1cb4a 157bdc132835",
 "tarot_flounder:love": "f8032e222632 8ec980927355 cddbdcafb10a 400e98cb574c cbc2d0bac5dd",
 "tarot_tuna:legacy": "a58a68a5e0bd c09d77d7d0c2 7d6abb35600c 1f1a9da039cc cdfa81f3a8a1",
 "tarot_tuna:choice": "650274013c37 27f5e42bee77 90db1e1ecc85 2b59965a8514 e4dde4d5d80d",
 "tarot_tuna:love": "5c9208630c2a 6454f0c69da4 e7c9bafb6b60 8ad984c34e5e f40bb48c0c1e",
 "fusion_saju_ziwei:legacy": "1796d5d546a2 3a1cd6bc97df 3c81f029eca0 e2ce9773a784 0d9429c32910",
 "fusion_saju_ziwei:personal": "96beaeb21ff9 60d7cea2d411 95de3733970c a47c9edb48cc bcdf0bda0fc4",
 "fusion_saju_ziwei:ask": "209a23766fc0 707e679fcb4c 9a31468485f3 3da8e4cc8efd 0d9429c32910",
 "fusion_sukuyo_vedic:legacy": "38c03e018de8 f0b1fe5ba47d 8315fdb93cdd dee56456ba5c 5fb39dad10a6",
 "fusion_sukuyo_vedic:personal": "5c3e585cdc4b 5725a3636b45 6795431e95b9 6d95d605a8a5 70b570d09783",
 "fusion_sukuyo_vedic:ask": "76fb6e48bb4c 7e102626331e 0e5c08443b7b b8c3fa27dfb2 5fb39dad10a6",
 "fusion_astrology_tarot:legacy": "5e4002d124d7 6cc497366e1a 81616f439673 deaca8cbfcc9 032738bbd603",
 "fusion_astrology_tarot:personal": "0b76a86de62e e698e7cdc2fc 9ccf77a10b71 a00536217799 0c5f90b748c0",
 "fusion_astrology_tarot:ask": "5e0b0c3bf7c0 32c5b05f44d0 69aa4bab396c 869558d03bd5 032738bbd603",
 "fusion_all:legacy": "68d5bdb10f9e 295fb272d8cb cc76f3eb1821 190a0088f6f3 6e8d23af93ea",
 "fusion_all:personal": "3e92700ed1bb de965e0fbaa9 468ebd6b8072 78c18f7b6ec3 d3753452ec82",
 "fusion_all:ask": "9412cb6c60bb 1d0f01b3d5ee 7e94e4b3e463 631de32565b5 6e8d23af93ea",
 "saju_salmon@timeUnknown": "8a00c3ac064e be07970d5a7d a03c11e7adc1 83e96cbac642 -",
 "saju_salmon@timeUnknown:ask": "70901bdf5dd4 24675fedf316 9d7a2d6c3452 86a2e75add4b -",
 "ziwei_salmon@noPlace": "2a5d815f1433 4d5434ed9f1f c551ff4b3f19 dfaf78dcaa09 -",
 "ziwei_salmon@noPlace:ask": "419582eef47f af263861b873 9a027b0b26da cecb90defc5e -",
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
