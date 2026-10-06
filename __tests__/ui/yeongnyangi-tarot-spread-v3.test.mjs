import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
import {tarotEvalCases,deckFor,scoreReading} from '../fixtures/yeongnyangi-tarot-eval/cases.mjs';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__spreadTest={rows:new Map()};
// The repository mock keeps the two state rules under test: the initial AWAITING_DRAW state and the one-shot draw CAS.
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>({updatedAt:null,birth:{year:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`const rows=()=>globalThis.__spreadTest.rows;
export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;
export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup');};export const attachPayment=async()=>{throw new Error('unexpected payment');};
export const claimChapter=async()=>{throw new Error('unexpected claim');};export const finishChapter=async()=>{};export const failChapter=async()=>{};
export const createRequest=async(e,u,id,v,o={})=>{if(!rows().has(id))rows().set(id,structuredClone({...v,_id:id,userId:u,state:o.initialState||'CREATED',chapters:[]}));return rows().get(id);};
export const readRequest=async(e,u,id)=>{const row=rows().get(id);if(!row||row.userId!==u)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND',status:404});return row;};
export const commitTarotDraw=async(e,u,id,{context,draw})=>{const row=await readRequest(e,u,id);if(row.state==='AWAITING_DRAW'&&!row.snapshot.tarotDraw){row.state='CREATED';row.snapshot.analysis.contexts.tarot=context;row.snapshot.tarotDraw=draw;return row;}
 if(row.snapshot.tarotDraw)return row;throw Object.assign(new Error('TAROT_DRAW_NOT_AVAILABLE'),{code:'TAROT_DRAW_NOT_AVAILABLE',status:409});};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export * from './worker/yeongnyangi/service'; export {products} from './worker/yeongnyangi/payments/catalog'; export {getYeongnyangiSpread} from './lib/tarot/yeongnyangi-spread-catalog.mjs'; export {buildTarotMasterContract,validateTarotChapter} from './worker/yeongnyangi/fortune/tarot/master-reading';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('tarot-spread-v3-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareFortune,presentFortune,drawTarotSpread,products,buildTarotMasterContract,validateTarotChapter}=loaded.exports;

const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
let attempt=0;
const attemptId=()=>`00000000-0000-4000-8000-${String(++attempt).padStart(12,'0')}`;
const order=(extra={})=>({productId:'tarot_mackerel',profileId:'self',timezone:'Asia/Seoul',consultationKind:'spread',tarotSpreadId:'yn_contact_first',question:'내가 먼저 연락해도 될까?',consultationAttemptId:attemptId(),...extra});

test('all reading languages preserve the committed draw and language across saved rereads',async()=>{
 for(const locale of RUNTIME_LOCALES){
  const request=order({locale,question:'What can I consider before reaching out?'});
  const row=await prepareFortune(env,'locale-owner',request),before=structuredClone(row.snapshot.tarotDeck);
  assert.equal(row.snapshot.locale,locale);
  assert.equal(presentFortune(row).locale,locale);
  assert.deepEqual((await prepareFortune(env,'locale-owner',request)).snapshot.tarotDeck,before);
  assert.equal(row.snapshot.tarotSpread.id,'yn_contact_first');
 }
});

test('a spread order is stored awaiting the draw with a hidden committed deck and the full spread snapshot',async()=>{
 const row=await prepareFortune(env,'owner',order());
 assert.equal(row.state,'AWAITING_DRAW');
 assert.equal(row.snapshot.tarotConsultation.version,'yeongnyangi-tarot-consultation-v3');
 assert.equal(row.snapshot.tarotSpread.id,'yn_contact_first');assert.equal(row.snapshot.tarotSpread.positions.length,5);
 assert.equal(new Set(row.snapshot.tarotDeck.order).size,78);assert.equal(row.snapshot.tarotDeck.reversed.length,78);
 assert.equal(row.snapshot.manifest.length,products.find(p=>p.id==='tarot_mackerel').chapterCount);
 assert.equal(row.snapshot.analysis.consultation.kindLabel,row.snapshot.tarotSpread.title);
 const view=presentFortune(row),json=JSON.stringify(view);
 assert.equal(view.recovery.nextAction,'draw');assert.equal(view.recovery.providerNeeded,false);assert.equal(view.recovery.retryable,false);
 assert.equal(view.charts,undefined);assert.equal(view.tarotSpread.drawn,false);assert.equal(view.tarotSpread.cardCount,5);
 assert.ok(!json.includes('tarotDeck')&&!json.includes(row.snapshot.tarotDeck.order.slice(0,6).join('","')),'deck order never leaves the server');
});

test('spread choice respects the tier card cap and drops inputs the spread does not use',async()=>{
 await assert.rejects(()=>prepareFortune(env,'owner',order({tarotSpreadId:'yn_stay_leave_nine'})),e=>e.code==='SPREAD_TIER_UNAVAILABLE');
 await assert.rejects(()=>prepareFortune(env,'owner',order({tarotSpreadId:'trad_celtic_cross_ten',productId:'tarot_flounder'})),e=>e.code==='SPREAD_TIER_UNAVAILABLE');
 await assert.rejects(()=>prepareFortune(env,'owner',order({tarotSpreadId:'unknown'})),e=>e.code==='INVALID_TAROT_SPREAD');
 await assert.rejects(()=>prepareFortune(env,'owner',order({locale:'zz'})),e=>e.code==='READING_LOCALE_UNAVAILABLE');
 const nine=await prepareFortune(env,'owner',order({productId:'tarot_flounder',tarotSpreadId:'yn_stay_leave_nine',question:'지금 회사에 남을까, 이직할까?'}));
 assert.equal(nine.snapshot.tarotSpread.cardCount,9);
 const row=await prepareFortune(env,'owner',order({tarotInputs:{options:{a:'A',b:'B'},period:'month',relationStatus:'contact_refused',birth:'1990-01-01'}}));
 assert.deepEqual(row.snapshot.tarotInputs,{period:'month',relationStatus:'contact_refused'});
 const ab=await prepareFortune(env,'owner',order({productId:'tarot_salmon',tarotSpreadId:'yn_ab_seven',question:'두 학원 중 어디로 갈까?',tarotInputs:{options:{a:' 강남 학원 ',b:'분당 학원'},relationStatus:'dating'}}));
 assert.deepEqual(ab.snapshot.tarotInputs,{options:{a:'강남 학원',b:'분당 학원'}});
});

test('the same attempt replays the same order and deck; a different spread is a different order',async()=>{
 const body=order();
 const first=await prepareFortune(env,'owner',body);
 const deck=structuredClone(first.snapshot.tarotDeck);
 const rng=crypto.getRandomValues;crypto.getRandomValues=()=>{throw new Error('unexpected reshuffle');};
 try{assert.equal(await prepareFortune(env,'owner',body),first);}finally{crypto.getRandomValues=rng;}
 assert.deepEqual(first.snapshot.tarotDeck,deck);
 const other=await prepareFortune(env,'owner',{...body,tarotSpreadId:'yn_knot_three'});
 assert.notEqual(other._id,first._id);
});

test('a manual pick resolves cards from the committed deck once; later picks never change them',async()=>{
 const row=await prepareFortune(env,'owner',order());
 for(const picks of [[1,2,3,4],[1,2,3,4,4],[1,2,3,4,78],[0,1,2,3,'4'],undefined])
  await assert.rejects(()=>drawTarotSpread(env,'owner',row._id,{picks}),e=>e.code==='INVALID_TAROT_PICKS');
 await assert.rejects(()=>drawTarotSpread(env,'intruder',row._id,{picks:[0,1,2,3,4]}),e=>e.code==='FORTUNE_NOT_FOUND');
 const picks=[70,3,41,12,0];
 const drawn=await drawTarotSpread(env,'owner',row._id,{picks});
 assert.equal(drawn.state,'CREATED');assert.equal(drawn.snapshot.tarotDraw.method,'manual');assert.deepEqual(drawn.snapshot.tarotDraw.picks,picks);
 const cards=drawn.snapshot.analysis.contexts.tarot.facts.find(f=>f.label==='cards').value;
 const positions=[...drawn.snapshot.tarotSpread.positions].sort((a,b)=>a.drawOrder-b.drawOrder);
 cards.forEach((card,i)=>{
  assert.equal(card.cardId,drawn.snapshot.tarotDeck.order[picks[i]]);
  assert.equal(card.orientation,drawn.snapshot.tarotDeck.reversed[picks[i]]?'reversed':'upright');
  assert.equal(card.positionKey,positions[i].id);
 });
 const evidence=drawn.snapshot.analysis.contexts.tarot.facts.find(f=>f.label==='tarotConsultation').value;
 assert.equal(evidence.spreadId,'yn_contact_first');assert.equal(evidence.cards.length,5);
 const before=JSON.stringify(drawn.snapshot);
 const again=await drawTarotSpread(env,'owner',row._id,{picks:[5,6,7,8,9]});
 assert.equal(JSON.stringify(again.snapshot),before);
 const view=presentFortune(again);
 assert.equal(view.tarotSpread.drawn,true);assert.deepEqual(view.tarotSpread.picks,picks);assert.notEqual(view.recovery.nextAction,'draw');
 assert.equal(view.charts,undefined,'cards stay hidden until paid');
});

test('after payment each tarot chart card carries its position id, and the owner view keeps only period and A/B labels',async()=>{
 const row=await prepareFortune(env,'owner',order({tarotInputs:{relationStatus:'no_contact'}}));
 const drawn=await drawTarotSpread(env,'owner',row._id,{auto:true});
 drawn.paymentId='mock-payment';
 const view=presentFortune(drawn),groups=view.charts.find(c=>c.domain==='tarot').groups.filter(g=>g.positionKey);
 assert.deepEqual(groups.map(g=>g.positionKey).sort(),drawn.snapshot.tarotSpread.positions.map(p=>p.id).sort());
 assert.equal(view.tarotSpread.inputs,undefined,'relationship status is never sent back to the screen');
 assert.ok(!JSON.stringify(view.tarotSpread).includes('no_contact'));
 const ab=await prepareFortune(env,'owner',order({productId:'tarot_salmon',tarotSpreadId:'yn_ab_seven',question:'남을까 옮길까',tarotInputs:{options:{a:'지금 회사',b:'새 회사'},period:'month',relationStatus:'dating'}}));
 assert.deepEqual(presentFortune(ab).tarotSpread.inputs,{period:'month',options:{a:'지금 회사',b:'새 회사'}});
 assert.deepEqual(presentFortune(ab).tarotSpread.symmetry,ab.snapshot.tarotSpread.symmetry);
});

test('auto draw uses the same committed deck with distinct slots; v2 orders cannot be drawn',async()=>{
 const row=await prepareFortune(env,'owner',order({productId:'tarot_tuna',tarotSpreadId:'yn_whole_map_ten',question:'요즘 일도 관계도 다 복잡해'}));
 const drawn=await drawTarotSpread(env,'owner',row._id,{auto:true});
 assert.equal(drawn.snapshot.tarotDraw.method,'auto');
 assert.equal(new Set(drawn.snapshot.tarotDraw.picks).size,10);
 assert.ok(drawn.snapshot.tarotDraw.picks.every(n=>Number.isInteger(n)&&n>=0&&n<78));
 const v2=await prepareFortune(env,'owner',{productId:'tarot_mackerel',profileId:'self',timezone:'Asia/Seoul',consultationKind:'contact',question:'연락해도 될까?'});
 assert.equal(v2.state,'CREATED');
 await assert.rejects(()=>drawTarotSpread(env,'owner',v2._id,{auto:true}),e=>e.code==='TAROT_DRAW_NOT_AVAILABLE');
});

test('the v3 prompt reads positions in read order, resolves link groups to the drawn cards and keeps the system paragraph verbatim',async()=>{
 const row=await prepareFortune(env,'owner',order({productId:'tarot_salmon',tarotSpreadId:'yn_ab_seven',question:'두 학원 중 어디로 갈까?',tarotInputs:{options:{a:'강남 학원',b:'분당 학원'}}}));
 const drawn=await drawTarotSpread(env,'owner',row._id,{picks:[9,8,7,6,5,4,3]});
 const ctx=drawn.snapshot.analysis.contexts.tarot,manifest=drawn.snapshot.manifest;
 assert.equal(manifest[1].sections.filter(s=>s.role==='interpretation').length,7,'one section per position');
 assert.match(manifest[0].focus,/yeongnyangi-tarot-consultation-v3/);
 const prompt=buildTarotMasterContract(ctx,'두 학원 중 어디로 갈까?',manifest[1]);
 assert.equal(prompt.methodVersion,'yeongnyangi-tarot-consultation-v3');
 const spread=drawn.snapshot.tarotSpread;
 assert.deepEqual(prompt.readingOrder,[...spread.positions].sort((x,y)=>x.readOrder-y.readOrder).map(p=>p.id));
 assert.deepEqual(prompt.savedCardsOnly.map(c=>c.positionKey),prompt.readingOrder);
 assert.ok(prompt.savedCardsOnly.every(c=>c.positionQuestion&&c.positionMeaning));
 assert.equal(prompt.linkGroups.length,spread.links.length);
 prompt.linkGroups.forEach((group,i)=>{
  assert.deepEqual(group.cards.map(c=>c.positionKey),spread.links[i].ids);
  group.cards.forEach(c=>assert.equal(c.cardId,prompt.savedCardsOnly.find(x=>x.positionKey===c.positionKey).cardId));
 });
 assert.ok(prompt.symmetry&&prompt.symmetry.a.length===prompt.symmetry.b.length&&prompt.symmetry.a.length>0);
 assert.deepEqual(prompt.userInputs,{options:{a:'강남 학원',b:'분당 학원'}});
 assert.ok(prompt.interpretationContract[0].startsWith('너는 영냥이 타로 상담가다. 사용자의 질문 목적을 먼저 파악하고,'));
 assert.ok(!JSON.stringify(prompt).includes('tarotDeck'));
 const [first,second]=prompt.savedCardsOnly;
 const body=text=>({title:'',summary:text,persona:'',analysis:[],highlights:[],topics:[]});
 assert.doesNotThrow(()=>validateTarotChapter(body(`${first.positionLabel}에 놓인 ${first.name} 카드는 조건을 보여 준다냥.`),ctx));
 assert.throws(()=>validateTarotChapter(body(`${second.positionLabel}에 놓인 ${first.name} 카드는 조건을 보여 준다냥.`),ctx),e=>e.code==='TAROT_POSITION_MISMATCH');
 const flipped=first.orientation==='reversed'?'정방향':'역방향';
 assert.throws(()=>validateTarotChapter(body(`${first.name} ${flipped}`),ctx),e=>e.code==='TAROT_ORIENTATION_MISMATCH');
});

// Evaluation cases (docs/design/yeongnyangi-tarot/interpretation-eval.md): fixed cards on the real prepare → draw path, prompt only.
async function evalPrompt(evalCase){
 const row=await prepareFortune(env,'owner',order({productId:evalCase.productId,tarotSpreadId:evalCase.spreadId,question:evalCase.question,...(evalCase.inputs?{tarotInputs:evalCase.inputs}:{})}));
 row.snapshot.tarotDeck=deckFor(evalCase.cards);
 const drawn=await drawTarotSpread(env,'owner',row._id,{picks:evalCase.cards.map((_,i)=>i)});
 return {drawn,prompt:buildTarotMasterContract(drawn.snapshot.analysis.contexts.tarot,evalCase.question,drawn.snapshot.manifest[1])};
}

test('evaluation cases put each fixed card on its intended position and carry what the rubric reads',async()=>{
 const prompts=new Map();
 for(const evalCase of tarotEvalCases){
  const {drawn,prompt}=await evalPrompt(evalCase);prompts.set(evalCase.id,prompt);
  assert.equal(prompt.methodVersion,'yeongnyangi-tarot-consultation-v3');
  [...drawn.snapshot.tarotSpread.positions].sort((a,b)=>a.drawOrder-b.drawOrder).forEach((position,i)=>{
   const card=prompt.savedCardsOnly.find(item=>item.positionKey===position.id);
   assert.equal(card.cardId,evalCase.cards[i][0],evalCase.id);assert.equal(card.orientation,evalCase.cards[i][1]?'reversed':'upright',evalCase.id);
  });
 }
 const at=(id,code)=>prompts.get(id).savedCardsOnly.find(card=>card.cardId===code);
 assert.notEqual(at('tower-at-knot','M16').positionQuestion,at('tower-at-action','M16').positionQuestion,'the same card is asked a different question in another position');
 const up=at('wheel-upright','M10'),down=at('wheel-reversed','M10');
 assert.equal(up.positionKey,down.positionKey);assert.notEqual(up.orientation,down.orientation);
 assert.ok(prompts.get('stay-or-leave').symmetry);assert.deepEqual(prompts.get('stay-or-leave').userInputs.options,{a:'지금 회사',b:'새 회사'});
 assert.match(JSON.stringify(prompts.get('refused-contact').userInputs),/연락을 원하지 않는다/);
 assert.match(prompts.get('refused-contact').interpretationContract.join('\n'),/반복 연락이나 우회 연락을 권하지 않는다/);
 assert.match(prompts.get('coin-buy').interpretationContract.join('\n'),/건강·법률·투자/);
});

test('the automated rubric flags missing positions and forbidden claims',async()=>{
 const refused=tarotEvalCases.find(item=>item.id==='refused-contact');
 const {prompt}=await evalPrompt(refused);
 const good=prompt.savedCardsOnly.map(card=>`${card.positionLabel}의 ${card.name}는 지금 조건을 비춘다냥.`).join('\n');
 assert.deepEqual(scoreReading(good,prompt,refused),{pass:true,findings:[]});
 const rules=text=>scoreReading(text,prompt,refused).findings.map(f=>f.rule);
 assert.ok(rules(`${good}\n그래도 한 번 더 연락해 봐.`).includes('refused-contact-advice'));
 assert.ok(rules(`${good}\n재회 확률은 70%야.`).includes('probability'));
 assert.ok(rules(`${good}\n3월 5일에 답이 온다.`).includes('fixed-date'));
 assert.ok(rules(good.split('\n').slice(1).join('\n')).includes('position-missing'));
 assert.ok(scoreReading(good,prompt,tarotEvalCases.find(item=>item.id==='health-worry')).findings.some(f=>f.rule==='professional-help'));
});

test('v3 adds position questions, link groups and inputs that v2 never had',async()=>{
 const question='헤어진 사람에게 내가 먼저 연락해도 될까?';
 const v2=await prepareFortune(env,'owner',{productId:'tarot_mackerel',profileId:'self',timezone:'Asia/Seoul',consultationKind:'contact',question,consultationAttemptId:attemptId()});
 const before=buildTarotMasterContract(v2.snapshot.analysis.contexts.tarot,question,v2.snapshot.manifest[1]);
 const {prompt:after}=await evalPrompt(tarotEvalCases.find(item=>item.id==='refused-contact'));
 assert.equal(before.methodVersion,'yeongnyangi-tarot-consultation-v2');
 for(const key of ['readingOrder','linkGroups','userInputs']){assert.equal(before[key],undefined,key);assert.ok(after[key],key);}
 assert.ok(before.savedCardsOnly.every(card=>card.positionQuestion===undefined));
 assert.ok(after.savedCardsOnly.every(card=>card.positionQuestion));
});


test('question purpose allows a seven-card reunion at mackerel price and persists the same draw',async()=>{
 const request=order({tarotSpreadId:'yn_reunion_seven',question:'다시 대화하려면 내 마음을 어떻게 정리할까?',questionDecision:{version:'question-consultation-20261007',category:'reunion',target:'self',horizon:'current',situation:'헤어진 뒤 생각을 정리 중이에요',options:'',period:'',constraints:'',confirmed:true}});
 const row=await prepareFortune(env,'purpose-tarot',request);
 assert.equal(row.amountKRW,3000);assert.equal(row.snapshot.questionContract.followups,0);
 assert.equal(row.snapshot.tarotSpread.cardCount,7);
 for(const pos of row.snapshot.tarotSpread.positions)assert.ok(row.snapshot.manifest[0].sections.some(s=>s.title===pos.label));
 const drawn=await drawTarotSpread(env,'purpose-tarot',row._id,{auto:true});
 const saved=structuredClone(drawn.snapshot.tarotDraw);
 assert.deepEqual((await drawTarotSpread(env,'purpose-tarot',row._id,{auto:true})).snapshot.tarotDraw,saved);
 assert.equal(drawn.snapshot.manifest[0].questionPolicy,'question-consultation-20261007');
});
