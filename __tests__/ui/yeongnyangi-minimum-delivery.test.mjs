import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['worker/yeongnyangi/providers/delivery.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {deliverChapter}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const input={chapter:{id:'self',title:'선택과 관계',part:'기질',theme:'self',ordinal:0,version:'destiny-reading-v7',sections:[{id:'one'},{id:'two'}]},analysis:{contexts:{},signals:[],themes:[]},previous:[]};
const paragraph1='마음이 앞설 때는 상대의 실제 반응보다 기대하는 모습에 집중하기 쉽습니다. 최근 대화에서 누가 먼저 연락했는지와 약속을 어떻게 지켰는지 구체적으로 살펴보면 관계의 속도를 조금 더 차분하게 판단할 수 있습니다.';
const paragraph2='이번 주에는 원하는 것을 한 문장으로 정리한 뒤 상대에게 선택할 시간을 남겨 보세요. 답을 재촉하기보다 자신의 생활을 유지하면서 대화의 간격과 반응이 달라지는지 기록하면 다음 선택에 도움이 됩니다.';
const body={summary:'관계의 속도를 함께 확인해 보세요.',blocks:[{id:'one',title:'관계의 패턴',paragraphs:[paragraph1,paragraph2],sources:['invalid-fact']}],sources:['invalid-fact']};
for(const [label,raw] of [['short and missing sections',body],['partial JSON',JSON.stringify(body).slice(0,-1)],['duplicate paragraph',{...body,blocks:[{...body.blocks[0],paragraphs:[paragraph1,paragraph1,paragraph2]}]}]])test(label,()=>{
 const result=deliverChapter(raw,input);
 assert.deepEqual(result.blocks[0].paragraphs,[paragraph1,paragraph2]);assert.deepEqual(result.sources,[]);
});
test('empty or entirely unsafe responses do not become a delivered consultation',()=>{
 for(const raw of [{},'{}',{blocks:[{paragraphs:['무조건 재회 성공합니다.']}]}])assert.throws(()=>deliverChapter(raw,input));
});
test('a question needs an actual answer, but optional subdivisions and citation IDs do not require regeneration',()=>{
 const askInput={...input,analysis:{...input.analysis,consultation:{questions:[{id:'q1',chapterId:'self'}],asOf:'2026-09-29'}}};
 assert.throws(()=>deliverChapter(body,askInput),e=>e.code==='QUESTION_ANSWER_INCOMPLETE');
 const result=deliverChapter({...body,questionAnswers:[{questionId:'q1',answer:paragraph2}]},askInput);
 assert.equal(result.questionAnswers[0].answer,paragraph2);assert.equal(result.questionAnswers[0].timing,'');
});

test('local recovery removes reworded copies while keeping the distinct answer and its evidence',()=>{
 const first=paragraph1+' 서두르기 전에 내가 확인한 사실과 기대한 장면을 따로 적어 두면 해석의 차이를 확인하기 쉽습니다.';
 const reworded=first.replace('차분하게','신중하게');
 const second=paragraph2+' 관찰한 반응이 예상과 다르면 같은 행동을 밀어붙이지 말고 상대와 확인할 대화의 시점부터 다시 조정해 보세요.';
 const raw={...body,blocks:[{id:'one',title:'관계의 패턴',paragraphs:[first,reworded,second],sources:['self-pattern']}],sources:['self-pattern']};
 const withEvidence={...input,analysis:{...input.analysis,contexts:{saju:{domain:'saju',facts:[{id:'self-pattern',label:'pillars',value:{}}],limitations:[]}}}};
 const result=deliverChapter(raw,withEvidence);
 assert.deepEqual(result.blocks[0].paragraphs,[first,second]);
 assert.deepEqual(result.blocks[0].sources,['self-pattern']);
 assert.deepEqual(result.sources,['self-pattern']);
 const reread=deliverChapter(raw,{...withEvidence,previous:[{...result,blocks:[{...result.blocks[0],paragraphs:[first]}]}]});
 assert.deepEqual(reread.blocks[0].paragraphs,[second]);
});

test('recovered long prose is split for reading without truncating its content',()=>{
 const long=Array.from({length:8},(_,i)=>`${i+1}번째로 확인할 것은 기대와 실제 반응의 차이입니다. 질문에 필요한 기록을 한 가지씩 살펴보고 아직 모르는 부분은 단정하지 않은 채 다음 행동의 기준으로 남겨 두세요.`).join(' ');
 assert.ok(Array.from(long).length>500);
 const result=deliverChapter({...body,blocks:[{id:'one',title:'확인할 신호',paragraphs:[long]}]},input);
 assert.ok(result.blocks[0].paragraphs.length>1);
 assert.ok(result.blocks[0].paragraphs.every(p=>Array.from(p).length<=500));
 assert.equal(result.blocks[0].paragraphs.join('').replace(/\s/gu,''),long.replace(/\s/gu,''));
});

const V7='destiny-book-v7'; // the fixture above uses a non-production version id
const capture=(method,run)=>{
 const original=console[method],lines=[];
 console[method]=(...args)=>lines.push(args);
 try{return {result:run(),lines};}finally{console[method]=original;}
};

test('the fallback is logged once with the strict rule that sent the chapter there',()=>{
 const {lines}=capture('warn',()=>deliverChapter(body,input));
 const fallback=lines.filter(args=>args[0]==='[yeongnyangi-delivery-fallback]');
 assert.equal(fallback.length,1);
 const entry=JSON.parse(fallback[0][1]);
 assert.equal(entry.chapter,0);assert.equal(typeof entry.code,'string');
 assert.ok(!fallback[0][1].includes(paragraph1.slice(0,20))); // codes only, never the text
});

test('the fallback drops sentences with words above the chapter tier, the strict path\'s TIER_SCOPE_VIOLATION',()=>{
 const scoped='너의 용신은 수 기운이라 물가에서 쉬는 시간이 좋습니다.';
 const raw={...body,blocks:[{...body.blocks[0],paragraphs:[paragraph1+' '+scoped,paragraph2]}]};
 const salmon=capture('warn',()=>deliverChapter(raw,{...input,chapter:{...input.chapter,version:V7,tier:'salmon'}})).result;
 assert.deepEqual(salmon.blocks[0].paragraphs,[paragraph1,paragraph2]);
 const tuna=capture('warn',()=>deliverChapter(raw,{...input,chapter:{...input.chapter,version:V7,tier:'tuna'}})).result;
 assert.ok(tuna.blocks[0].paragraphs[0].includes(scoped));
});

test('the fallback gets the same v7 repeat prune as the strict path, and the log measures what is left',()=>{
 const repeated='마음이 급할수록 상대의 속도와 내 기대를 따로 적어 두는 습관이 관계를 지켜 줍니다.';
 const raw={...body,blocks:[{...body.blocks[0],paragraphs:[paragraph1+' '+repeated,paragraph2+' '+repeated]}]};
 const v7={...input,chapter:{...input.chapter,version:V7,owns:[],refs:[]}};
 const {result,lines}=capture('log',()=>capture('warn',()=>deliverChapter(raw,v7)).result);
 assert.deepEqual(result.blocks[0].paragraphs,[paragraph1+' '+repeated,paragraph2]);
 const audit=lines.filter(args=>args[0]==='[yeongnyangi-v7-audit]').map(args=>JSON.parse(args[1]));
 assert.equal(audit.length,1);
 assert.equal(audit[0].path,'fallback');assert.equal(audit[0].sentences,1);assert.ok(audit[0].remaining>120);
});
