import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {
  TAROT_SHARED_RULES, TAROT_SHARED_RULE_PARAGRAPH, TAROT_EVIDENCE_LIMIT, TAROT_SAFETY_NOTICE,
  isTarotCrisisQuestion, findTarotProseViolation,
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
