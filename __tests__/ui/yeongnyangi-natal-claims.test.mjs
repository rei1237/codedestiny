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

test('MA 1B: a 戌未 형 the engine never computed becomes 미술파 unless 丑 is in the chart or the current luck',()=>{
 // MA: 辛未 년주, 丙戌 대운, 丁未 세운 — no 丑, so the engine reads the pair as 미술파.
 const ma={pillars:{year:'辛未',month:'丙申',day:'辛酉',hour:'戊子'},dayMaster:'辛',majorLuck:{currentCycle:{pillar:'丙戌'}},yearlyLuck:[{pillar:'丙午',majorLuckPillar:'丙戌'},{pillar:'丁未',majorLuckPillar:'丙戌'}]};
 const r=run(['대운 丙戌과 세운 丁未가 戌未 형을 이뤄.','년주 未와는 戌未(술미) 형이라는 관계를 만들어.','지지에서는 未戌刑(미술형)이 보여.','戌과 未 사이에 술미형(戌未刑)이 발생해.','세운의 戌未(술미) 형살(刑殺)은 변동이야.'],ma);
 assert.deepEqual(r.body.blocks[0].paragraphs,['대운 丙戌과 세운 丁未가 戌未 파를 이뤄.','년주 未와는 戌未(술미) 파라는 관계를 만들어.','지지에서는 未戌破(미술파)가 보여.','戌과 未 사이에 술미파(戌未破)가 발생해.','세운의 戌未(술미) 파(破)는 변동이야.']);
 assert.equal(r.replaced,5);
 // 丑 in the natal chart (facts: 丁丑 년주) or the current luck completes 축술미형; general and partner sentences stay too.
 const separated=run(['대운과 세운에서 未-戌(미술) 형의 작용이 있어.','未 · 戌(미술) 형은 변동이야.'],ma);
 assert.deepEqual(separated.body.blocks[0].paragraphs,['대운과 세운에서 未-戌(미술) 파의 작용이 있어.','未 · 戌(미술) 파는 변동이야.']);
 const kept=['대운 戌과 세운 未가 戌未 형을 이뤄.'];
 assert.equal(run(kept).body.blocks[0].paragraphs[0],kept[0]);
 assert.equal(run(kept,{...ma,majorLuck:{currentCycle:{pillar:'己丑'}}}).body.blocks[0].paragraphs[0],kept[0]);
 for(const text of ['丑戌未 삼형은 세 글자가 모두 있어야 해.','상대의 戌未 형은 따로 봐.','미술 형태의 취미가 좋아.'])assert.equal(run([text],ma).body.blocks[0].paragraphs[0],text);
});

test('MA/MO 3B: a ten god written right after a named pillar is corrected to that pillar\'s computed ten gods',()=>{
 const tenGodsByPillar={year:{stemTenGod:'비견',branchTenGods:['편인','편관','편재'],primaryHiddenTenGod:'편인'},month:{stemTenGod:'겁재',branchTenGods:['정재','정관','정인'],primaryHiddenTenGod:'정재'},
  day:{stemTenGod:'일간',branchTenGods:['비견'],primaryHiddenTenGod:'비견'}};
 const f={pillars:{year:'辛未',month:'庚寅',day:'辛酉',hour:'壬辰'},dayMaster:'辛',tenGodsByPillar};
 const r=run(['년지에 편인과 편관이, 월지에 겁재와 정인이 함께 있어.','사주 월지에 편인(偏印)의 기운이 있어.','월지 寅(인목) 속에 편인(偏印)과 편관(偏官)이 숨어 있어.','네 월주 비견이 버팀목이야.','일지에 상관이 앉아 있어.'],f);
 assert.deepEqual(r.body.blocks[0].paragraphs,['년지에 편인과 편관이, 월지에 정재와 정인이 함께 있어.','사주 월지에 정재(正財)의 기운이 있어.','월지 寅(인목) 속에 정재(正財)와 정관(正官)이 숨어 있어.','네 월주 겁재가 버팀목이야.','일지에 비견이 앉아 있어.']);
 assert.equal(r.replaced,5);
 // Correct claims, a list with no free computed ten god left, partners and other words after the pillar stay.
 const kept=['월지 寅(인목)은 정재, 정관, 정인을 품어.','월주에는 庚寅(경인) 겁재와 정재가 있어.','월주에 있는 겁재(庚金)는 경쟁심이야.','상대의 월지에 편인이 있어.','월지와 일지 사이에 편관이 끼어.','월지 寅(인목)과 시지 辰(진토)에 편인, 편재가 있어.','년지와 월지에 편재(偏財)를 둬.'];
 assert.deepEqual(run(kept,f).body.blocks[0].paragraphs,kept);
 assert.equal(run(['월지에 편인, 편관, 편재, 상관이 있어.'],f).body.blocks[0].paragraphs[0],'월지에 정재, 정관, 정인이 있어.');
});

test('chapter prose correction applies the stored saju facts on both delivery paths',()=>{
 const input={locale:'ko',chapter:{ordinal:0},analysis:{question:'',contexts:{saju:{facts:[{label:'pillars',value:facts.pillars},{label:'dayMaster',value:'癸'},{label:'strengthHeuristic',value:{isStrong:false}}]}}}};
 const out=correctChapterProse(body(['네 일주는 庚申이야. 오늘은 쉬어.']),input);
 assert.equal(out.blocks[0].paragraphs[0],'네 일주는 癸未야. 오늘은 쉬어.');
});

test('an element count about the reader is the visible-character count; hidden stems, bundles, partners and weighted counts stay',()=>{
 // 丁丑 壬寅 癸未 戊午 counted by visible characters: 목 1 · 화 2 · 토 3 · 금 0 · 수 2.
 const counted={...facts,fiveElements:{countBasis:'surface',counts:{wood:1,fire:2,earth:3,metal:0,water:2}}};
 const kept=['지장간까지 보면 목이 세 개야.','목과 화가 두 개씩 있어.','상대 사주는 토가 네 개야.'];
 const r=run(['네 사주에는 목 기운이 두 개라 시작이 빨라. 눈에 보이는 글자 중 토(土)가 4개로 가장 많아. 금이 한 개 있어 정리를 잘해. 수가 두 개야.',...kept],counted);
 assert.equal(r.body.blocks[0].paragraphs[0],'네 사주에는 목 기운이 한 개라 시작이 빨라. 눈에 보이는 글자 중 토(土)가 3개로 가장 많아. 수가 두 개야.');
 assert.deepEqual(r.body.blocks[0].paragraphs.slice(1),kept);
 assert.deepEqual([r.replaced,r.dropped],[2,1]);
 assert.equal(run(['네 사주에는 목 기운이 두 개야.'],{...facts,fiveElements:{counts:{wood:3}}}).replaced,0);
});

test('a counting-age 대운 span becomes the labeled cycle\'s 만 나이; old orders, mismatches and 만 나이 stay',()=>{
 // The engine counts 대운 age by calendar year (startAge 32 = 만 31세 at the 교운일, major-luck.ts).
 const cycle=(pillar,index)=>({index,pillar,startAge:22+index*10,endAge:31+index*10,startAgeMan:21+index*10,ageRange:`만 ${21+index*10}~${30+index*10}세`,label:`${pillar} 대운 · 무렵부터`});
 const dated={...facts,majorLuck:{cycles:[{index:0,startAge:1,endAge:11},cycle('庚午',1),cycle('辛未',2)]}};
 const r=run(['너는 32세부터 41세까지 庚午 대운을 지나.','32세 경오 대운이 시작돼.','42세에 들어오는 辛未 대운은 정리의 시기야.'],dated);
 assert.deepEqual(r.body.blocks[0].paragraphs,['너는 만 31~40세 庚午 대운을 지나.','만 31~40세 경오 대운이 시작돼.','만 41세에 들어오는 辛未 대운은 정리의 시기야.']);
 assert.equal(r.replaced,3);
 const text=['너는 32세부터 41세까지 庚午 대운을 지나.'];
 assert.equal(run(text,{...facts,majorLuck:{cycles:dated.majorLuck.cycles.map(({label,...c})=>c)}}).body.blocks[0].paragraphs[0],text[0]);
 const kept=['너는 32세부터 41세까지 辛未 대운을 지나.','만 31세에 庚午 대운이 시작돼.','庚午 대운과 辛未 대운은 32세와 42세에 와.','상대는 32세부터 庚午 대운이야.','32세 세운과 庚午 대운이 겹쳐.'];
 assert.deepEqual(run(kept,dated).body.blocks[0].paragraphs,kept);
});

test('a 격국 other than the engine\'s becomes the template sentence once; candidates, matching negations and partners stay',()=>{
 // 1975-01-22 14:00 (甲寅 丁丑 戊辰 己未): 丑 정기 己는 戊의 겁재라 월겁격(일반격). 가색격은 기각 후보다.
 const gk={...facts,gyeokguk:{finalGyeokguk:'월겁격',finalType:'일반격'}};
 // 상품 목차의 주제 이름(reading-v7 'useful')을 따라 쓴 문장도 판정이 아니라 둔다.
 const kept=['가색격 후보도 따져 봤지만 월겁격으로 봐.','너는 종격이 아니야.','상대는 가색격이야.','네 격국은 월겁격이야.','나를 살리는 기운(용신·종격 판정)','종격 여부가 바꾸는 해석을 같이 볼게.'];
 const r=run(['너는 가색격이야. 토가 단단해. 稼穡格이니 흐름을 따라가.',...kept],gk);
 assert.equal(r.body.blocks[0].paragraphs[0],'격국은 월겁격(일반격)으로 봐. 토가 단단해.');
 assert.deepEqual(r.body.blocks[0].paragraphs.slice(1),kept);
 assert.deepEqual([r.replaced,r.dropped],[1,1]);
 assert.equal(run(['손님은 월겁격이 아니에요. 쉬어 가요.'],gk).body.blocks[0].paragraphs[0],'격국은 월겁격(일반격)으로 봐요. 쉬어 가요.');
 assert.equal(run(['토가 단단해. 너는 가색격이야.'],gk).body.blocks[0].paragraphs[0],'토가 단단해. 격국은 월겁격(일반격)으로 봐.');
 // 정격·특수격 위계와 가종 비하는 fact와 상관없이 지운다.
 assert.equal(run(['특수격은 일반격보다 귀한 사주야. 가종격은 가짜라서 성격이 불안정해. 쉬어 가.'],gk).body.blocks[0].paragraphs[0],'쉬어 가.');
 // 출생시간 미상처럼 격국 fact가 없으면 격국 주장을 모두 지운다(fail-closed).
 assert.equal(run(['너는 월겁격이야. 쉬어 가.']).body.blocks[0].paragraphs[0],'쉬어 가.');
});
