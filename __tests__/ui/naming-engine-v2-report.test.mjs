import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`
 export * from './worker/naming-engine/service';
 export * from './worker/naming-engine/facts';
 export * from './worker/naming-engine/checker';
 export * from './worker/naming-engine/report';
 export * from './worker/naming-engine/engine';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const loaded=new Module(path.resolve('naming-engine-v2-report-tests.cjs'));
loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const E=loaded.exports;
// naming-engine.test.mjs 와 같은 고정 사주(용신 금·토, 기신 화·목·수) — 사주 엔진 변화와 분리한다.
const needs={useful:['metal','earth'],caution:['fire','wood','water'],support:[],
  natalCounts:{wood:2,fire:3,earth:2,metal:0,water:1},timeUnknown:false,jongConditional:false,basis:'fixture'};
const view=E.engineView(E.runNamingEngine({surname:{hangul:'김',hanja:['金']},gender:'M',nameLength:2},{tier:'paid',saju:needs}));
const lines={yearPillar:'경오',monthPillar:'신사',dayPillar:'갑진',hourPillar:'신미',dayMaster:'갑(목(木))',monthCommand:'사',
  fiveElementBalance:'목(木) 2 / 화(火) 3 / 토(土) 2 / 금(金) 0 / 수(水) 1',strengthAnalysis:'신약 후보 / 억부 점수 41'};
const prefs={genderLabel:'남성',schoolPreset:'kr-modern',memo:'부르기 쉬운 이름'};
const ctx={view,locale:'ko'};
const TITLES=['작명가의 총평','사주 풀이와 용신 검증','이 아이의 작명 원칙','이름 후보 상세','세 이름을 나란히 놓고','최종 추천','피해야 할 이름','이름을 올리기 전에'];
const first=view.candidates[0];
const name1=E.fullName(view,first);

test('결정론 서술·계산값 문단·8장은 대조기를 그대로 통과한다',()=>{
  assert.equal(view.candidates.length,12);
  const narration=E.deterministicNarration(view);
  assert.equal(narration.names.length,6);assert.equal(narration.letters.length,3);
  for(const c of view.candidates){
    assert.deepEqual(E.findViolations(E.factParagraph(view,c),ctx,[c]),[],E.factParagraph(view,c));
    assert.match(E.factParagraph(view,c),new RegExp(`원격 ${c.grids.won}\\(`));
  }
  for(const entry of narration.names){
    const c=view.candidates[entry.rank-1];
    for(const field of ['meaning','sajuSupport','soundFeel']) assert.deepEqual(E.findViolations(entry[field],ctx,[c]),[],entry[field]);
  }
  for(let id=1;id<=8;id++){
    const body=E.engineChapterBody(id,view,lines,narration);
    assert.ok(body.length>100,`${id}장`);
    const result=E.correctText(body,ctx);
    assert.deepEqual(result.violations,[],`${id}장 ${JSON.stringify(result.violations)}`);
    assert.equal(result.text,body);
  }
  const prompt=E.buildNamingV2Prompt(view,lines,prefs);
  assert.ok(prompt.includes(name1)&&prompt.includes('표에 있는 것만 쓰세요'));
});

test('대조기: 틀린 획·격·수, 표 밖 한자, 금지 표현을 잡고 문단을 교정한다',()=>{
  const wrong=(kind,text)=>assert.ok(E.findViolations(text,ctx).some((v)=>v.kind===kind),`${kind}: ${text}`);
  wrong('strokes',`${name1}의 ${first.chars[0].ch}은 99획입니다.`);
  wrong('grid',`${name1}은 원격 ${first.grids.won+1}(길)입니다.`);
  wrong('su',`${name1}의 정격은 길한 79수입니다.`);
  wrong('cjk',`${name1} 대신 金龍虎도 좋습니다.`);
  wrong('forbidden','이 이름이면 반드시 크게 성공합니다.');
  wrong('forbidden','이 이름은 요절을 막아 줍니다.');
  wrong('forbidden','재물운이 확실히 보장됩니다.');
  wrong('forbidden','다른 후보는 불길한 이름입니다.');
  assert.deepEqual(E.findViolations(`${name1}은 원격 ${first.grids.won}(길), 81수리 기준입니다.`,ctx),[]);
  assert.deepEqual(E.findViolations('金 8획 年柱 甲午',{view,locale:'ja'}).filter((v)=>v.kind==='cjk'),[]);
  const text=[`${name1}은 원격 ${first.grids.won+1}로 길합니다.`,`${name1}은 또 99획이라고도 합니다.`,'모든 후보는 77수입니다.','부르기 편한 이름입니다.','작명(作名)은 정성입니다.'].join('\n\n');
  const fixed=E.correctText(text,ctx);
  assert.equal(fixed.replaced,1);assert.equal(fixed.dropped,2);assert.equal(fixed.stripped,1);
  assert.deepEqual(fixed.text.split('\n\n'),[E.factParagraph(view,first),'부르기 편한 이름입니다.','작명은 정성입니다.']);
  assert.deepEqual(E.correctText(fixed.text,ctx).violations,[]);
});

const uniqueBody=(id,extra='')=>[extra,...Array.from({length:12},(_,k)=>`${id}장 ${k+1}번째 문단에서는 ${first.hangul} 이름을 부를 때의 느낌과 생활 속 쓰임을 ${id*100+k}번 관점으로 차분하게 풀어 드립니다.`)].filter(Boolean).join('\n\n');
const reply=(value)=>({ok:true,provider:'gemini',model:'gemini-2.5-flash',text:JSON.stringify(value)});
async function drive(respond,{maxRequests=30}={}){
  const snapshot={engine:view,sajuSnapshot:lines,generatedPrompt:E.buildNamingV2Prompt(view,lines,prefs),evidenceHash:'h1',locale:'ko',delivery:E.initialDeliveryV2(view)};
  const log=[];let saved=null;let result;
  for(let request=0;request<maxRequests;request++){
    let calls=0;
    const deps={partsPerRequest:1,chapterTitles:TITLES,call:async(prompt,part,tokens)=>{
      calls++;
      assert.equal(tokens,9500);
      assert.ok((saved.attempts[part]||0)>=1,`${part} 시도 예약이 호출보다 먼저 저장된다`);
      log.push({part,prompt,attempt:saved.attempts[part]});
      return respond(part,saved.attempts[part],prompt);
    }};
    result=await E.generateNamingWaveV2(snapshot,async(state)=>{saved=state;},deps);
    assert.ok(calls<=1,'요청당 LLM 1회');
    snapshot.delivery=result.state;
    if(E.namingReportCompleteV2(result.state)||result.limited)break;
  }
  return {state:result.state,limited:result.limited,log};
}

test('웨이브: 서술 1회 + 8장, 위반 장은 교정본을 들고 한 번 더 쓰고 완성된다',async()=>{
  const {state,limited,log}=await drive((part,attempt)=>{
    if(part==='narration') return reply({evidenceHash:'h1',
      names:view.candidates.slice(0,6).map((c)=>({rank:c.rank,meaning:`${E.fullName(view,c)}의 뜻은 맑고 단정한 바람을 담아 아이가 곧게 자라기를 비는 마음입니다.`,
        sajuSupport:c.rank===2?`${E.fullName(view,c)}은 원격 ${c.grids.won+3}이라 좋습니다. 이 문장은 틀린 값을 담았습니다.`:'용신 오행을 담은 글자가 부족한 기운을 채워 주어 균형을 돕는 이름입니다.',
        soundFeel:'부를 때 소리가 부드럽게 이어지고 끝소리가 단정하게 맺혀 듣기 편안한 흐름입니다.'})),
      letters:[{rank:1,letter:'이 이름을 건네며 아이가 스스로의 빛을 따라 걷기를 바랍니다. 가족이 여러 번 불러 보며 마음에 드는지 살펴 주세요.'}]});
    if(part==='3'&&attempt===1) return reply({title:'작명 원칙',evidenceHash:'h1',body:uniqueBody(3,`${name1}은 원격 ${first.grids.won+1}로 길합니다.`)});
    return reply({title:TITLES[Number(part)-1],evidenceHash:'h1',body:uniqueBody(part)});
  });
  assert.equal(limited,false);assert.ok(E.namingReportCompleteV2(state));
  assert.deepEqual(log.map((l)=>l.part),['narration','1','2','3','3','4','5','6','7','8']);
  assert.ok(!log[3].prompt.includes('[이전 초안 교정]')&&log[4].prompt.includes('[이전 초안 교정]'));
  assert.equal(state.narration.source,'llm-corrected');
  assert.equal(state.narration.names[1].sajuSupport,E.sajuSupportText(view,view.candidates[1]));
  assert.equal(state.narration.letters[1].letter,E.letterText(view,view.candidates[1]));
  assert.equal(state.chapters[3].source,'llm');assert.equal(state.drafts[3],undefined);
  assert.equal(state.candidates.cards.length,12);assert.equal(state.candidates.finalPick.name,first.hangul);
  assert.equal(state.candidates.cards[0].meaning,state.narration.names[0].meaning);
  assert.ok(E.namingChaptersTextV2(state.chapters).startsWith('## 1. 작명가의 총평\n'));
});

test('웨이브: 서술 실패는 결정론으로 넘어가고, 못 쓴 장은 교정 초안·결정론 장으로 채운다',async()=>{
  const {state,limited}=await drive((part,attempt)=>{
    if(part==='narration') return {ok:true,provider:'gemini',text:'not json'};
    if(part==='2') throw new Error('timeout');
    if(part==='5') return reply({title:'비교',evidenceHash:'h1',body:uniqueBody(5,`${name1}은 원격 ${first.grids.won+1}로 길합니다.`)});
    if(part==='7') return reply({title:'피할 이름',evidenceHash:'other',body:uniqueBody(7)});
    return reply({title:TITLES[Number(part)-1],evidenceHash:'h1',body:uniqueBody(part)});
  });
  assert.equal(limited,false);assert.ok(E.namingReportCompleteV2(state));
  assert.equal(state.narration.source,'engine');assert.equal(state.invalidAttempts.narration,2);
  assert.equal(state.chapters[2].source,'engine');assert.equal(state.chapters[7].source,'engine');
  assert.equal(state.chapters[5].source,'llm-corrected');
  assert.ok(state.chapters[5].body.includes(E.factParagraph(view,first)));
  assert.equal(state.chapters[1].source,'llm');
  assert.equal(E.confirmedEmptyNamingFailureV2(state),false);
});

test('웨이브: LLM 장이 하나도 없으면 limited, 전부 무효 응답이면 환불 경로(confirmedEmpty)',async()=>{
  const invalid=await drive((part)=>part==='narration'?reply({evidenceHash:'h1',names:[],letters:[]}):{ok:true,provider:'gemini',text:'{}'});
  assert.equal(invalid.limited,true);assert.equal(Object.keys(invalid.state.chapters).length,0);
  assert.equal(E.confirmedEmptyNamingFailureV2(invalid.state),true);
  const down=await drive(()=>{throw new Error('provider down');});
  assert.equal(down.limited,true);assert.equal(E.confirmedEmptyNamingFailureV2(down.state),false);
  assert.equal(down.state.narration.source,'engine');
  const mocked=await drive((part)=>({ok:true,provider:'mock',text:JSON.stringify({title:'x',evidenceHash:'h1',body:uniqueBody(part)})}));
  assert.equal(mocked.limited,true,'mock 응답은 유료 결과로 받지 않는다');
});

test('서비스: 라우트 입력 → 엔진 입력, 정본 스냅샷으로 유료 12·무료 5와 화면용 사주 근거',()=>{
  const route={familyName:'김',surnameHanja:'金',gender:'F',year:1990,month:5,day:15,birthTime:'14:30',birthTimeUnknown:false,calendarType:'lunar',isLeapMonth:true,nameLength:2,avoidChars:['龍']};
  const input=E.engineInputFromRoute(route);
  assert.deepEqual(input.birth,{date:'1990-05-15',time:'14:30',calendarType:'lunar_leap'});
  assert.deepEqual(input.surname,{hangul:'김',hanja:['金']});assert.equal(input.gender,'F');
  assert.equal(E.engineInputFromRoute({...route,birthTimeUnknown:true}).birth.time,null);
  assert.equal(E.engineInputFromRoute({...route,gender:'OTHER',calendarType:'solar'}).gender,'N');
  const paid=E.prepareNamingV2({...route,calendarType:'solar',isLeapMonth:false});
  const free=E.namingBasisV2({...route,calendarType:'solar',isLeapMonth:false});
  assert.equal(paid.view.candidates.length,12);assert.equal(free.view.candidates.length,5);
  assert.equal(paid.view.inputHash,free.view.inputHash,'무료 → 유료 같은 해시');
  assert.equal(paid.view.engineVersion,E.ENGINE_VERSION);
  assert.ok(['wood','fire','earth','metal','water'].includes(paid.displayEvidence.pillars.d.gE));
  assert.ok(paid.view.candidates.every((c)=>!c.hanja.includes('龍')));
  assert.equal(Object.values(paid.displayEvidence.natal.counts).reduce((a,b)=>a+b,0),8);
  assert.deepEqual(paid.view.saju.counts,paid.displayEvidence.natal.counts,'화면 요약용 원국 개수');assert.deepEqual(paid.view.saju.pillars,paid.displayEvidence.pillars);
  assert.ok(paid.view.candidates.every((c)=>c.chars.every((ch)=>Number.isInteger(ch.radical)&&ch.radical>=1&&ch.radical<=214)),'부수 번호 1~214');
});
