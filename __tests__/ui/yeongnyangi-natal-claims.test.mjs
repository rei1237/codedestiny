import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {correctNatalClaims} from './worker/yeongnyangi/fortune/saju/natal-claims'; export {correctChapterProse} from './worker/yeongnyangi/providers/chapter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {correctNatalClaims,correctChapterProse}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
// 1997-02-10 12:00 여성 (engine output): 丁丑 壬寅 癸未 戊午, 일간 癸, 신약.
const facts={pillars:{year:'丁丑',month:'壬寅',day:'癸未',hour:'戊午'},dayMaster:'癸',strength:{isStrong:false}};
const body=paragraphs=>({summary:'요약',analysis:[],blocks:[{id:'one',title:'기질',paragraphs,sources:[]}]});
const run=(paragraphs,f=facts)=>correctNatalClaims(body(paragraphs),f);

test('wrong pillars about the reader are rewritten to the stored chart in the same script',()=>{
 const r=run(['네 일주는 庚申이야. 손님의 월주 갑자가 바탕이에요. 너의 년주는 정축(丁丑)이야.']);
 assert.equal(r.body.blocks[0].paragraphs[0],'네 일주는 癸未야. 손님의 월주 임인이 바탕이에요. 너의 년주는 정축(丁丑)이야.');
 assert.equal(r.replaced,2);
});

test('a wrong day master is corrected with its element, before or after 일간',()=>{
 const r=run(['너는 庚金 일간이야. 네 일간은 갑목이라 곧게 뻗어.']);
 assert.equal(r.body.blocks[0].paragraphs[0],'너는 癸水 일간이야. 네 일간은 계수라 곧게 뻗어.');
});

test('an unknown birth hour drops only the sentence that asserts a 시주',()=>{
 const r=run(['네 시주는 갑자야. 그래서 말년이 단단해. 나머지 흐름은 차분해.'],{...facts,pillars:{...facts.pillars,hour:null}});
 assert.equal(r.body.blocks[0].paragraphs[0],'그래서 말년이 단단해. 나머지 흐름은 차분해.');
 assert.equal(r.dropped,1);
});

test('an assertive strength claim that contradicts the engine is dropped; hedged and partner sentences stay',()=>{
 const kept=['신강이라면 밀어붙이겠지만 너는 아니야.','상대는 신강한 사주야.','신강·신약은 균형의 문제야.'];
 const r=run(['너는 신강한 사주야. 그래서 쉬어 가는 날이 필요해.',...kept]);
 assert.equal(r.body.blocks[0].paragraphs[0],'그래서 쉬어 가는 날이 필요해.');
 assert.deepEqual(r.body.blocks[0].paragraphs.slice(1),kept);
 assert.equal(run(['너는 신약한 편이야. 쉬어 가.']).dropped,0);
});

test('a birth season that contradicts the month branch is dropped; the true season, explanations and partners stay',()=>{
 // Golden 2026-10-04 salmon health chapter (month 甲寅 = 봄): the warm chart was written as a summer birth.
 const spring={...facts,pillars:{...facts.pillars,month:'甲寅'}};
 const kept=['너는 이른 봄에 태어나 기운이 솟아.','달력으로는 늦겨울에 태어났지만 사주로는 봄이야.','여름에 태어난 사람은 더위를 잘 타.','상대는 가을에 태어났어.','한여름에 태어난 것처럼 뜨거워.'];
 const r=run(['월령을 볼 때, 불 기운이 강한 여름철에 태어나 따뜻하고 건조한 기운이 강조되거든. 너는 겨울 태생이야. 그래서 몸이 쉽게 달아올라.',...kept],spring);
 assert.equal(r.body.blocks[0].paragraphs[0],'그래서 몸이 쉽게 달아올라.');
 assert.deepEqual(r.body.blocks[0].paragraphs.slice(1),kept);
 assert.equal(r.dropped,2);
 assert.equal(run(['너는 여름철에 태어났어.'],{...facts,pillars:{...facts.pillars,month:null}}).dropped,0);
});

test('correct claims, general explanations and other locales are untouched',()=>{
 const text=['네 일주는 癸未야. 갑목 일간인 사람은 곧게 뻗는 편이야. 너는 癸水 일간이야.'];
 assert.equal(run(text).body.blocks[0].paragraphs[0],text[0]);
 const en=body(['네 일주는 庚申이야.']);
 assert.equal(correctNatalClaims(en,facts,'en').body,en);
 const whole=run(['네 시주는 갑자야.'],{...facts,pillars:{...facts.pillars,hour:null}});
 assert.equal(whole.body.blocks[0].paragraphs[0],'네 시주는 갑자야.'); // never blank a field to pass
});

test('chapter prose correction applies the stored saju facts on both delivery paths',()=>{
 const input={locale:'ko',chapter:{ordinal:0},analysis:{question:'',contexts:{saju:{facts:[{label:'pillars',value:facts.pillars},{label:'dayMaster',value:'癸'},{label:'strengthHeuristic',value:{isStrong:false}}]}}}};
 const out=correctChapterProse(body(['네 일주는 庚申이야. 오늘은 쉬어.']),input);
 assert.equal(out.blocks[0].paragraphs[0],'네 일주는 癸未야. 오늘은 쉬어.');
});
