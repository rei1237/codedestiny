import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const built=await build({
 stdin:{contents:"export * from './worker/yeongnyangi/fortune/tarot/master-reading';",resolveDir:process.cwd(),loader:'ts'},
 bundle:true,format:'esm',platform:'node',write:false,
});
const subject=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const context={domain:'tarot',engineVersion:'fixture',calculatedAt:'',limitations:[],facts:[{id:'tarot.cards',label:'cards',value:[
 {cardId:'M00',nameKo:'바보',positionKey:'cause',orientation:'upright'},
 {cardId:'W11',nameKo:'완드 페이지',positionKey:'process',orientation:'reversed'},
 {cardId:'C11',nameKo:'컵 페이지',positionKey:'outcome',orientation:'upright'},
]}]};
const chapter={id:'salmon-0',title:'현재 질문의 핵심',ordinal:0,theme:'identity'};
const body=(summary)=>({summary,analysis:['분석'],example:'사례',advice:'행동',highlights:['핵심'],sources:['tarot.cards'],persona:'한마디',topics:['주제']});
const v2Context=structuredClone(context);
v2Context.facts.push({id:'tarot.tarotConsultation',label:'tarotConsultation',value:{version:'yeongnyangi-tarot-consultation-v2',kind:'choice',spreadId:'three_card_cause_process_outcome',questionType:'general',rules:'저장된 카드만 읽는다.',limits:'확정하지 않는다.',cards:[
 {cardId:'M00',name:'바보',orientation:'upright',positionKey:'cause',positionLabel:'원인'},
 {cardId:'W11',name:'완드 페이지',orientation:'reversed',positionKey:'process',positionLabel:'과정'},
 {cardId:'C11',name:'컵 페이지',orientation:'upright',positionKey:'outcome',positionLabel:'결과'},
]}});

test('master contract preserves the saved spread and derives only deterministic signals',()=>{
 const contract=subject.buildTarotMasterContract(context,'이 선택을 어떻게 볼까?',chapter);
 assert.deepEqual(contract.savedCardsOnly.map(card=>[card.cardId,card.position,card.orientation]),[
  ['M00','cause','upright'],['W11','process','reversed'],['C11','outcome','upright'],
 ]);
 assert.deepEqual(contract.spreadAnalysis.majorArcana,{count:1,total:3});
 assert.deepEqual(contract.spreadAnalysis.repeatedNumbers,[{rank:11,count:2}]);
 assert.deepEqual(contract.spreadAnalysis.courtCards,['W11','C11']);
 assert.equal(contract.spreadAnalysis.elementBalance['fire/action'],1);
 assert.equal(contract.spreadAnalysis.gazeFlow.length,3);
 assert.equal(contract.crisisSafety,undefined);
});

test('validator rejects an undrawn card and an orientation swap',()=>{
 assert.doesNotThrow(()=>subject.validateTarotChapter(body('바보 정방향과 완드 페이지 역방향을 연결합니다.'),context));
 assert.throws(()=>subject.validateTarotChapter(body('바보 역방향을 읽습니다.'),context),error=>error.code==='TAROT_ORIENTATION_MISMATCH');
 assert.throws(()=>subject.validateTarotChapter(body('악마 카드 정방향을 읽습니다.'),context),error=>error.code==='TAROT_UNDRAWN_CARD');
});

test('v2 prompt and validator use only the frozen card, direction and position contract',()=>{
 const contract=subject.buildTarotMasterContract(v2Context,'이 선택을 이어갈까요?',chapter);
 assert.equal(contract.methodVersion,'yeongnyangi-tarot-consultation-v2');
 assert.deepEqual(contract.savedCardsOnly.map(card=>card.cardId),['M00','W11','C11']);
 assert.doesNotThrow(()=>subject.validateTarotChapter(body('원인 자리의 바보 카드 정방향과 과정 자리의 완드 페이지 카드 역방향을 읽습니다.'),v2Context));
 assert.throws(()=>subject.validateTarotChapter(body('원인 자리의 완드 페이지 카드 역방향을 읽습니다.'),v2Context),error=>error.code==='TAROT_POSITION_MISMATCH');
});

test('crisis questions receive a deterministic localized safety-first notice',()=>{
 const question='죽고 싶다는 생각이 들어요';
 assert.equal(subject.isCrisisQuestion(question),true);
 const contract=subject.buildTarotMasterContract(context,question,chapter);
 assert.match(contract.crisisSafety,/안전 확보/);
 const attached=subject.attachTarotSafetyNotice(body('카드 해석'),question,'ko',0);
 assert.match(attached.summary,/안전이 먼저/);
 assert.equal(subject.attachTarotSafetyNotice(body('카드 해석'),question,'ko',1).summary,'카드 해석');
});
