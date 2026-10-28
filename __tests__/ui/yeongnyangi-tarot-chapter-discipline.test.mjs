import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {deckFor} from '../fixtures/yeongnyangi-tarot-eval/cases.mjs';
// 영냥이 tarot chapters: card names, elder endings, the settled answer, card listings and card-only timing.
// Mock only: chapters are built by hand and checked by the deterministic corrections that both delivery paths run.
const built=await build({stdin:{contents:[
 "export {correctChapterProse} from './worker/yeongnyangi/providers/chapter';",
 "export {tarotSpreadContext,tarotSpreadManifest} from './worker/yeongnyangi/fortune/tarot/spread-v3';",
 "export {tarotCardListing,tarotChapterDiscipline,validateTarotDiscipline} from './worker/yeongnyangi/fortune/tarot/chapter-discipline';",
 "export {products} from './worker/yeongnyangi/payments/catalog';",
 "export {getYeongnyangiSpread} from './lib/tarot/yeongnyangi-spread-catalog.mjs';",
].join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const yn=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

// The 2026-10-09 T sample draw (yn_stay_leave_nine), fixed by position.
const T_CARDS={core_value:['M12',false],stay_resource:['C06',false],stay_constraint:['C07',true],stay_action:['M03',false],stay_flow:['P09',false],
 leave_resource:['W02',false],leave_constraint:['S07',false],leave_action:['C11',false],leave_flow:['M09',true]};
const QUESTION='내년 상반기에 스타트업으로 이직하는 게 나을까, 지금 회사에 남는 게 나을까?';
const spread=yn.getYeongnyangiSpread('yn_stay_leave_nine');
const drawOrder=[...spread.positions].sort((a,b)=>a.drawOrder-b.drawOrder).map(p=>T_CARDS[p.id]);
const ctx=yn.tarotSpreadContext(spread,deckFor(drawOrder),drawOrder.map((_,i)=>i),{});
const manifest=yn.tarotSpreadManifest(yn.products.find(p=>p.id==='tarot_salmon'),spread);
const [answerChapter,positionsChapter,linksChapter]=manifest;
const T_ANSWER={questionId:'Q1',answer:'내년 상반기에 스타트업으로 이직하는 것보다는, 지금 회사에 남아 사내 이동을 노리며 안정 속에서 스스로 성취를 만들어가는 쪽이 너의 핵심 가치와 현실적인 제약에 더 잘 맞을 수 있어.',
 reason:'현재 회사에 남는 길은 익숙한 자원을 쓸 수 있어.',timing:'',action:'사내 이동에 필요한 역량을 먼저 적어 봐.'};
const answered={summary:'남는 쪽이 더 잘 맞아.',example:'',topics:[],questionAnswers:[T_ANSWER]};
const input=(chapter,extra={})=>({locale:'ko',chapter,analysis:{question:QUESTION,topicId:'general',contexts:{tarot:ctx}},previous:[],...extra});
const body=(paragraphs,extra={})=>({summary:'이 장의 요약이야.',analysis:[],highlights:[],topics:[],example:'',advice:'',persona:'',
 blocks:[{id:'evidence',title:'이 해석의 근거',paragraphs,sources:['tarot.cards']}],...extra});
const paragraphs=out=>out.blocks[0].paragraphs;

test('card names are written as the stored name and orientation, and sentences naming undrawn or flipped cards are dropped',()=>{
 const out=yn.correctChapterProse(body([
  "'컵 식스' 카드와 컵 세븐(역방향)은 익숙함과 환상을 함께 보여 줘. 매달린 사람(The Hanged Man) 카드는 멈춤이야.",
  '죽음 카드가 끝을 말해. 컵 식스 카드는 익숙함이야. 컵 세븐 정방향은 환상이야. 소드 9가 걱정을 키워.',
 ]),input(linksChapter));
 assert.deepEqual(paragraphs(out),['컵 식스 카드와 컵 세븐 역방향은 익숙함과 환상을 함께 보여 줘. 매달린 사람 카드는 멈춤이야.','컵 식스 카드는 익숙함이야.']);
});

test('elder endings become 영냥이 반말, or 해요체 for an honorific order; a chat persona keeps its own voice',()=>{
 const text=['천천히 살펴보렴. 답은 이미 네 안에 있는 거란다. 지금은 쉬어 가도 된단다.'];
 assert.deepEqual(paragraphs(yn.correctChapterProse(body(text),input(linksChapter))),['천천히 살펴봐. 답은 이미 네 안에 있는 거야. 지금은 쉬어 가도 돼.']);
 assert.deepEqual(paragraphs(yn.correctChapterProse(body(text),input(linksChapter,{voiceStyle:'honorific'}))),['천천히 살펴보세요. 답은 이미 네 안에 있는 거예요. 지금은 쉬어 가도 돼요.']);
 assert.deepEqual(paragraphs(yn.correctChapterProse(body(text),input(linksChapter,{persona:'yeoni'}))),text);
});

test('a later chapter cannot reverse the first chapter answer; conditions and per-aspect comparisons stay',()=>{
 const kept=['지금 회사에 남아 사내 이동을 노리는 쪽이 수입 공백 걱정 없이 더 유리해 보여.','만약 이직을 결정한다면 준비 기간을 길게 잡아.','성장 면에서는 이직 쪽이 더 유리해.'];
 const reversed='결국 이직하는 쪽이 지금 회사에 남는 것보다 더 나아 보여.';
 const later=input(linksChapter,{previous:[answered]});
 assert.deepEqual(paragraphs(yn.correctChapterProse(body([[kept[0],reversed,kept[1]].join(' '),kept[2]]),later)),[`${kept[0]} ${kept[1]}`,kept[2]]);
 // The chapter that gives the answer is not edited against itself.
 const own=body([reversed,kept[1]],{questionAnswers:[T_ANSWER]});
 assert.deepEqual(paragraphs(yn.correctChapterProse(own,later)),[reversed,kept[1]]);
 // A reversal that is the whole field cannot be dropped; the strict check names it.
 const whole=body(['컵 식스 카드는 익숙함이야.'],{summary:reversed});
 assert.equal(yn.correctChapterProse(whole,later).summary,reversed);
 assert.throws(()=>yn.validateTarotDiscipline(whole,later),e=>e.code==='TAROT_VERDICT_REVERSED');
 assert.doesNotThrow(()=>yn.validateTarotDiscipline(body(kept),later));
 // The prompt carries the settled side.
 assert.equal(yn.tarotChapterDiscipline(later).answerVerdict.side,'잔류');
 assert.equal(yn.tarotChapterDiscipline(input(linksChapter)).answerVerdict,undefined);
});

test('only the position chapter lists every card; another chapter that names most of them is flagged',()=>{
 const roll=["잔류의 자원으로 컵 식스 카드가 나왔어. 잔류의 제약에는 컵 세븐 역방향이 나왔어. 잔류 시 행동은 여황제 카드야. 잔류의 흐름은 펜타클 나인이야.",
  '이직의 자원은 완드 투, 이직의 제약은 소드 세븐, 이직 시 행동은 컵 페이지, 이직의 흐름은 은둔자 역방향이야.'];
 assert.deepEqual(yn.tarotCardListing(body(roll),ctx,answerChapter),{block:'evidence',count:8,limit:7});
 assert.equal(yn.tarotCardListing(body(roll),ctx,positionsChapter),undefined);
 assert.equal(yn.tarotCardListing(body(roll.slice(0,1)),ctx,answerChapter),undefined);
 assert.match(yn.tarotChapterDiscipline(input(answerChapter)).cardListing,/다시 나열하지 않는다/);
 assert.match(yn.tarotChapterDiscipline(input(positionsChapter)).cardListing,/자리마다/);
});

test('a card-only chapter cannot assert when something will happen; the requested period may still be named',()=>{
 const timing='타로 카드는 특정 시점의 운세를 확정하지 않아. 다만 2026년 4분기부터 2027년 상반기까지의 기간 동안 너의 마음가짐과 행동 방향에 따라 위의 흐름이 나타날 가능성이 크다는 의미로 받아들이면 좋겠어.';
 const ch=body(['2027년 상반기가 이직하기 좋은 시기야. 내년 상반기 이직을 고민하는 너에게 이 카드는 준비를 먼저 말해.'],{questionAnswers:[{...T_ANSWER,timing}]});
 const out=yn.correctChapterProse(ch,input(answerChapter));
 assert.deepEqual(paragraphs(out),['내년 상반기 이직을 고민하는 너에게 이 카드는 준비를 먼저 말해.']);
 assert.equal(out.questionAnswers[0].timing,'타로 카드는 특정 시점의 운세를 확정하지 않아.');
 // A timing answer that is only a period claim is replaced with the card limit in the order's voice.
 const only=body(['컵 식스 카드는 익숙함이야.'],{questionAnswers:[{...T_ANSWER,timing:'내년 상반기에 좋은 기회가 찾아올 가능성이 커.'}]});
 assert.match(yn.correctChapterProse(only,input(answerChapter)).questionAnswers[0].timing,/^타로는 시기를 정해 주지 않아\./);
 assert.match(yn.correctChapterProse(only,input(answerChapter,{voiceStyle:'honorific'})).questionAnswers[0].timing,/않아요\./);
 const residual=body(['컵 식스 카드는 익숙함이야.'],{summary:'내년 상반기가 이직하기 좋은 시기야.'});
 assert.throws(()=>yn.validateTarotDiscipline(residual,input(answerChapter)),e=>e.code==='TAROT_UNGROUNDED_TIMING');
 assert.match(yn.tarotChapterDiscipline(input(answerChapter)).timingLimit,/시기/);
});

test('the prompt names the elder endings and the card name form',()=>{
 const rules=yn.tarotChapterDiscipline(input(linksChapter));
 for(const ending of ['란다','렴','거라'])assert.ok(rules.voice.includes(ending),ending);
 assert.match(rules.cardNames,/광대/);
 assert.equal(yn.tarotChapterDiscipline(input(linksChapter,{persona:'yeoni'})).voice,undefined);
 assert.equal(yn.tarotChapterDiscipline(input(linksChapter,{locale:'en'})),undefined);
});

test('a whole answer field with a predicted period becomes a usable limit, even on a period spread',()=>{
 const ch=body(['컵 식스 카드는 익숙한 관계를 다시 점검하라고 말해.'],{summary:'내년 상반기에 좋은 기회가 찾아올 가능성이 커.',questionAnswers:[{...T_ANSWER,answer:'2027년 상반기에는 새로운 기회가 찾아올 가능성이 커.'}]});
 const questionInput=input({...answerChapter,questionPolicy:'question-consultation-20261007'},{analysis:{question:QUESTION,contexts:{tarot:ctx},consultation:{questionDecision:{}}}});
 const out=yn.correctChapterProse(ch,questionInput);
 assert.match(out.summary,/타로는 시기를 정해 주지 않아/);
 assert.match(out.questionAnswers[0].answer,/질문한 기간에 무엇을 살필지/);
 assert.match(yn.correctChapterProse(ch,{...questionInput,persona:'yeoni'}).summary,/않아요/);
 assert.doesNotThrow(()=>yn.validateTarotDiscipline(out,questionInput));
 const periodContext={...ctx,facts:ctx.facts.map(f=>f.label==='tarotConsultation'?{...f,value:{...f.value,inputs:{...f.value.inputs,period:'next_year'}}}:f)};
 const periodInput={...questionInput,analysis:{...questionInput.analysis,contexts:{tarot:periodContext}}};
 assert.match(yn.correctChapterProse(ch,periodInput).summary,/시기를 정해 주지 않아/);
});
