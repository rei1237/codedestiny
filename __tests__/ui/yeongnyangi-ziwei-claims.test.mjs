import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {correctZiweiClaims} from './worker/yeongnyangi/fortune/ziwei/claims';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {correctZiweiClaims}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const body=paragraphs=>({summary:'요약',analysis:[],blocks:[{id:'one',title:'자미',paragraphs,sources:[]}]});
const run=paragraphs=>correctZiweiClaims(body(paragraphs));

test('MA/MO/Y2 2B: a year\'s 유년사화 follows that year\'s stem; a wrong 삼합·대궁 swaps the word or drops the sentence',()=>{
 // 2026 丙: 록천동·권천기·과문창·기염정. 2027 丁: 록태음·권천동·과천기·기거문. 명0 형제1 부부2 자녀3 재백4 질액5 천이6 노복7 관록8 전택9 복덕10 부모11.
 const r=run(['2026년 너의 재백궁에 유년사화 화기가 문창에 붙어.','2027년 유년 사화에서 천동(天同)이 명궁에 화기(化忌)로 변해.','2026년은 유년 화기(문창)가 들어와.',
  '여기에 천이궁 거문(함)에 화기가 걸려 대궁에 위치한 복덕궁의 태양을 함께 봐.','하지만 자녀궁의 삼합에는 너의 재백궁(財帛宮)과 관록궁(官祿宮)이 연결되어 있어. 그래서 조심해.',
  '하지만 자녀궁의 삼합에 명궁과 재백궁이 포함되어 있어, 재물에 대한 가치관이 흔들려. 준비해.']);
 assert.deepEqual(r.body.blocks[0].paragraphs,['2026년 너의 재백궁에 유년사화 화과가 문창에 붙어.','2027년 유년 사화에서 천동(天同)이 명궁에 화권(化權)으로 변해.','2026년은 유년 화과(문창)가 들어와.',
  '여기에 천이궁 거문(함)에 화기가 걸려 삼합에 위치한 복덕궁의 태양을 함께 봐.','그래서 조심해.','준비해.']);
 assert.deepEqual([r.replaced,r.dropped],[4,2]);
 // Correct claims, natal (no 유년) or yearless 사화, a star with no 사화 that year, a flow-year or partner palace and a claim with no base palace stay.
 const kept=['2027년 유년 사화에서 천이궁의 거문(巨門)이 화기(化忌)로 변해.','2026년 운의 흐름에서 재백궁 문창 화기가 보여.','유년 사화에서 염정이 화권이야.','2027년 유년 사화에서 염정이 화권을 받아.',
  '재백궁(신궁)에 천량(묘)이 강하게 자리 잡고 삼합으로 명궁과 관록궁을 비추고, 본궁 문창(함)의 화기와 삼합궁 관록궁의 영성(묘)이 있어.','부부궁 삼합을 천이궁에서 보고 대궁 관록궁도 봐.',
  '유년 자녀궁과 삼합을 이루는 관록궁이야.','상대의 자녀궁 삼합에 재백궁이 있어.','대한(大限) 자녀궁의 삼합에 명궁이 있어.','대궁(마주보는 궁) 부부궁의 타라가 비춰.',
  '하지만 대궁(마주보는 궁) 부부궁의 타라(함)와 삼합 명궁의 경양(묘) 같은 살성들의 영향이 있어.'];
 assert.deepEqual(run(kept).body.blocks[0].paragraphs,kept);
 // MA: once the block says the 유년 enters 자녀궁, that palace is the flow 명궁 and its 삼합 are the flow 재백·관록.
 const flow=['자미두수 유년(1년 운)으로 2027년을 보면, 유년이 자녀궁(子女宮)으로 들어오고 염정이 있어.','하지만 자녀궁의 삼합에는 너의 재백궁(財帛宮)과 관록궁(官祿宮)이 연결되어 있어.'];
 assert.deepEqual(run(flow).body.blocks[0].paragraphs,flow);
 const en=body(['2026년 유년 화기가 문창에 붙어.']);
 assert.equal(correctZiweiClaims(en,'en').body,en);
});
