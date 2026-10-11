import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {
  TAROT_SHARED_RULES, TAROT_SHARED_RULE_PARAGRAPH, TAROT_EVIDENCE_LIMIT, TAROT_SAFETY_NOTICE,
  isTarotCrisisQuestion, findTarotProseViolation, canonicalTarotNamesKo,
} from '../../lib/tarot/paid-reading-contract.mjs';

const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:"export {tarotSpreadRules} from './worker/yeongnyangi/fortune/tarot/spread-v3'; export {tarotSafetyNotice,validateTarotChapter} from './worker/yeongnyangi/fortune/tarot/master-reading';",
  resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const loaded=new Module(path.resolve('paid-tarot-contract-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const yn=loaded.exports;
const sha=text=>createHash('sha256').update(text).digest('hex');

test('the shared rule paragraph is the persona-independent tail of the 영냥이 v3 rules, byte for byte',()=>{
  assert.equal(TAROT_SHARED_RULES.length,12);
  assert.ok(!/영냥이/.test(TAROT_SHARED_RULE_PARAGRAPH),'no persona in the shared paragraph');
  assert.ok(yn.tarotSpreadRules.startsWith('너는 영냥이 타로 상담가다.'));
  assert.ok(yn.tarotSpreadRules.endsWith(' '+TAROT_SHARED_RULE_PARAGRAPH));
  // Pinned before the extraction: stored v3 orders and their request hashes read this exact string.
  assert.equal(sha(yn.tarotSpreadRules),'99ec124a52dbedeb31cc93ff31ee4635708c4db807c0a12bd89041181910e21b');
  assert.equal(TAROT_EVIDENCE_LIMIT,'카드는 실제 상대의 마음이나 미래 사건을 확인하는 자료가 아니다.');
});

test('crisis text is shared and unchanged',()=>{
  assert.equal(isTarotCrisisQuestion('요즘 죽고 싶어'),true);
  assert.equal(isTarotCrisisQuestion('재회할 수 있을까'),false);
  assert.equal(yn.tarotSafetyNotice('자살','ko'),TAROT_SAFETY_NOTICE.ko);
  assert.equal(sha(['ko','en','ja'].map(l=>yn.tarotSafetyNotice('자살',l)).join('|')),'ca3b2b469ddf3340d7dfa9e2f4a7267cde1281a395a5e827c273f8e9478b4381');
});

test('the shared prose check names an undrawn card, a flipped orientation and a wrong position',()=>{
  const drawn=[{name:'바보',orientation:'upright'},{name:'소드 나인',orientation:'reversed'}];
  const positions=new Map([['핵심 가치','소드 나인'],['현재','바보']]);
  assert.equal(findTarotProseViolation('바보 카드 정방향과 소드 나인 역방향',{drawn,positions}),null);
  assert.equal(findTarotProseViolation('탑 카드가 보여요',{drawn}),'TAROT_UNDRAWN_CARD');
  assert.equal(findTarotProseViolation('소드 나인 정방향이라',{drawn}),'TAROT_ORIENTATION_MISMATCH');
  assert.equal(findTarotProseViolation('핵심 가치 자리의 바보 카드',{drawn,positions}),'TAROT_POSITION_MISMATCH');
  // 영냥이 keeps its own error type around the same codes.
  const context={facts:[{id:'tarot.cards',label:'cards',value:[{cardId:'M00',orientation:'upright'}]}]};
  assert.throws(()=>yn.validateTarotChapter({title:'',summary:'탑 카드',persona:'',analysis:[],highlights:[],topics:[]},context),e=>e.code==='TAROT_UNDRAWN_CARD');
});

test('a card dealt in both orientations is checked for presence only',()=>{
  const drawn=[{name:'바보',orientation:'either'}];
  assert.equal(findTarotProseViolation('바보 정방향',{drawn}),null);
  assert.equal(findTarotProseViolation('바보 카드 역방향',{drawn}),null);
  assert.equal(findTarotProseViolation('탑 카드',{drawn}),'TAROT_UNDRAWN_CARD');
});

test('card names in deck labels, quotes, brackets and English glosses become the stored name and orientation',()=>{
  const cases=[
    ["'완드 투'(정방향)",'완드 투 정방향'],['<소드 나인 (역방향)>','소드 나인 역방향'],["'은둔자'(역방향)",'은둔자 역방향'],
    ["'매달린 사람' (정방향)",'매달린 사람 정방향'],['「컵 세븐 역방향」','컵 세븐 역방향'],
    ['컵 세븐 역방향(Seven of Cups, Reversed)','컵 세븐 역방향'],['매달린 사람(The Hanged Man) 카드','매달린 사람 카드'],
    ['완드 투(Two of Wands)','완드 투'],['컵 에이스(Ace of Cups, Reversed)가','컵 에이스 역방향이'],['은둔자(역방향)는','은둔자 역방향은'],
    ['광대 카드','바보 카드'],["'광대'",'바보'],['소드 9 역방향','소드 나인 역방향'],['펜타클 10이','펜타클 텐이'],
    ['컵의 기사가','컵 나이트가'],['펜타클 여왕 카드','펜타클 퀸 카드'],['완드 왕은','완드 킹은'],['소드 페이지','소드 페이지'],
  ];
  for(const [raw,want] of cases)assert.equal(canonicalTarotNamesKo(raw),want,raw);
  // Ordinary words that start like a card name stay as written.
  for(const text of ['소드 투자를 줄여','컵 포기','컵 왕관','컵 2잔',"'잔류의 자원'으로",'광대뼈','수레바퀴 자국'])assert.equal(canonicalTarotNamesKo(text),text);
});

test('the shared prose check reads deck labels, brackets and bare minor names',()=>{
  const drawn=[{name:'소드 나인',orientation:'upright'},{name:'바보',orientation:'reversed'}];
  assert.equal(findTarotProseViolation('소드 9 역방향이 보여',{drawn}),'TAROT_ORIENTATION_MISMATCH');
  assert.equal(findTarotProseViolation('<소드 나인 (역방향)>',{drawn}),'TAROT_ORIENTATION_MISMATCH');
  assert.equal(findTarotProseViolation("'광대'(정방향)",{drawn}),'TAROT_ORIENTATION_MISMATCH');
  assert.equal(findTarotProseViolation('컵 에이스가 기회를 말해',{drawn}),'TAROT_UNDRAWN_CARD');
  assert.equal(findTarotProseViolation('소드 나인이 걱정을, 광대 역방향이 망설임을 비춰',{drawn}),null);
  assert.equal(findTarotProseViolation('소드 투자를 줄여',{drawn}),null);
});
