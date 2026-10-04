import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`
 export * from './worker/naming-engine/engine';
 export * from './worker/naming-engine/candidates';
 export * from './worker/naming-engine/data';
 export * from './worker/naming-engine/score';
 export * from './worker/naming-engine/suri';
 export * from './worker/naming-engine/sound';
 export * from './worker/naming-engine/strokes';
 export * from './worker/naming-engine/saju-input';
 export * from './worker/naming-engine/types';
 export * from './worker/naming-engine/config/negative-meaning';
 export * from './worker/naming-engine/config/school-presets';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const loaded=new Module(path.resolve('naming-engine-tests.cjs'));
loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const E=loaded.exports;
const data=E.loadNamingData();
const preset=E.SCHOOL_PRESETS[E.DEFAULT_SCHOOL_PRESET];
// 1990-05-15 14:30 남 — 정본 스냅샷 값(용신 금·토, 기신 화·목·수)을 고정해 사주 엔진 변화와 분리한다.
const needs={useful:['metal','earth'],caution:['fire','wood','water'],support:[],
  natalCounts:{wood:2,fire:3,earth:2,metal:0,water:1},timeUnknown:false,jongConditional:false,basis:'fixture'};
const run=(input,tier='free',opts={})=>E.runNamingEngine({surname:{hangul:'김',hanja:['金']},gender:'M',nameLength:2,...input},{tier,saju:needs,...opts});
const strokesOf=(chars)=>chars.map((ch)=>data.poolByChar.get(ch).won);
const code=(fn)=>{try{fn();}catch(error){return error.code;}return 'no-error';};

// 공개 작명 해설(다음 카페·작명 사이트·블로그)의 원획 풀이 45건. Phase 3 잠정 기대값 — 자문 검수 뒤 교체한다(설계서 §11).
// 글자는 NFC 로 적는다(출처 24건은 CJK 호환 한자를 쓴다). grids = 원·형·이·정, strokes = 성+이름 원획, samjae = 천·인·지격.
// 엔진과 다른 12건은 넣지 않았다 — 출처끼리 갈리는 값이다(설계서 §7.1 골든 편차): nameclub 외자 4건(형·이격 정의가 다름),
// 泰 9·延 7·熙 13·貞 8·九 2 획, 金志訓 정격 산술 오류, 奫 15/16 병기, mbgg 복성 인격 = 성 합 + 名1.
const GOLDEN=[
  {s:'金',g:'秉俊',grids:[17,16,17,25],src:'alanguages'},
  {s:'鄭',g:'雄',grids:[12,31,19,31],src:'tarot'},
  {s:'南宮',g:'錫',grids:[16,35,19,35],src:'tarot'},
  {s:'池',g:'瑞涓',grids:[25,21,18,32],src:'nameclub-2519'},
  {s:'金',g:'董澕',grids:[31,23,24,39],src:'nameclub-2504'},
  {s:'鄭',g:'珉贊',grids:[29,29,38,48],src:'nameclub-2564'},
  {s:'丁',g:'荷娫',grids:[23,15,12,25],src:'nameclub-2611'},
  {s:'朱',g:'炫遇',grids:[25,15,22,31],src:'nameclub-2723'},
  {s:'權',g:'振國',grids:[22,33,33,44],src:'nameclub-2809'},
  {s:'朴',g:'芝娟',grids:[20,16,16,26],src:'nameclub-2860'},
  {s:'李',g:'禎姸',grids:[23,21,16,30],src:'nameclub-2773'},
  {s:'李',g:'昇祐',grids:[18,15,17,25],src:'nameclub-2682'},
  {s:'閔',g:'祉淏',grids:[21,21,24,33],src:'nameclub-3380'},
  {s:'文',g:'裕珍',grids:[23,17,14,27],src:'nameclub-3383'},
  {s:'崔',g:'瑞輝',grids:[29,25,26,40],src:'nameclub-2423'},
  {s:'權',g:'五美',grids:[14,27,31,36],src:'nameclub-3496'},
  {s:'尹',g:'石漢',grids:[20,9,19,24],src:'nameclub-3210'},
  {s:'李',g:'愫允',grids:[18,21,11,25],src:'nameclub-3059'},
  {s:'徐',g:'挺佑',grids:[18,21,17,28],src:'nameclub-3092'},
  {s:'崔',g:'震成',grids:[22,26,18,33],src:'nameclub-2959'},
  {s:'邊',g:'珉琯',grids:[23,32,35,45],src:'nameclub-3239'},
  {s:'成',g:'阿玹',grids:[23,20,17,30],src:'nameclub-2990'},
  {s:'都',g:'恩慶',grids:[25,26,31,41],src:'nameclub-2741'},
  {s:'李',g:'婁瑛',grids:[25,18,21,32],src:'nameclub-3120'},
  {s:'金',g:'揆潾',grids:[29,21,24,37],src:'nameclub-3317'},
  {s:'林',g:'池訓',grids:[17,15,18,25],src:'nameclub-2744'},
  {s:'劉',g:'元鎭',grids:[22,19,33,37],src:'nameclub-3096'},
  {s:'趙',g:'太寅',grids:[15,18,25,29],src:'nameclub-3153'},
  {s:'朴',g:'榮秀',grids:[21,20,13,27],src:'tarot'},
  {s:'乙支',g:'文德',grids:[19,9,20,24],src:'tarot'},
  {s:'黃',g:'棟顯',grids:[35,24,35,47],src:'goodnaming'},
  {s:'金',g:'一',grids:[1,9,8,9],src:'goodnaming'},
  {s:'南宮',g:'雪民',grids:[16,30,24,35],src:'goodnaming'},
  {s:'姜',g:'秀昌',grids:[15,16,17,24],samjae:[10,16,15],src:'mbgg'},
  {s:'張',g:'惠理',strokes:[11,12,12],samjae:[12,23,24],src:'mbgg'},
  {s:'金',g:'大中',strokes:[8,3,4],src:'sinbisaju'},
  {s:'金',g:'九',strokes:[8,9],src:'sinbisaju'},
  {s:'皇甫',g:'文德',strokes:[9,7,4,15],src:'sinbisaju'},
  {s:'金',g:'星水',strokes:[8,9,4],src:'sj3142'},
  {s:'李',g:'承禧',grids:[25,15,24,32],src:'bujukworld'},
  {s:'金',g:'慧連',grids:[29,23,22,37],samjae:[9,23,29],src:'bujukworld'},
  {s:'李',g:'晋旭',grids:[16,17,13,23],src:'s600724'},
  {s:'朴',g:'仁仙',strokes:[6,4,5],src:'hongjung'},
  {s:'金',g:'玧㲾',grids:[16,17,15,24],src:'brunch'},
  {s:'李',g:'在明',grids:[14,13,15,21],src:'newsin'},
];

test('4격 식: 단성 2자·외자·복성 원획 풀이가 공개 해설과 같다(잠정 골든)',()=>{
  assert.equal(GOLDEN.length,45);
  for(const g of GOLDEN){
    const label=`${g.s}${g.g} (${g.src})`;
    const sur=E.resolveSurname({hangul:'가'.repeat(g.s.length),hanja:Array.from(g.s)},'won',data).strokes;
    const given=strokesOf(Array.from(g.g));
    if(g.grids){const f=E.fourGrids(sur,given);assert.deepEqual([f.won,f.hyeong,f.i,f.jeong],g.grids,label);}
    if(g.strokes)assert.deepEqual([...sur,...given],g.strokes,label);
    if(g.samjae){const f=E.fiveGrids(sur,given);assert.deepEqual([f.heaven,f.human,f.earth],g.samjae,label);}
  }
  assert.deepEqual(E.fourGrids([5],[8]),{won:8,hyeong:13,i:5,jeong:13});
  assert.equal(E.reduce81(82),2);assert.equal(E.reduce81(81),81);
  assert.deepEqual([1,3,5,7,9,10].map(E.suriElement),['wood','fire','earth','metal','water','water']);
  assert.equal(data.suri.size,81);assert.equal(data.samjae.size,125);
});

test('소리오행: 실무설과 해례는 후음·순음만 맞바꾸고 된소리는 평음으로 읽는다',()=>{
  const read=(s,m)=>E.soundElement(s,m);
  assert.deepEqual(['아','하','마','바','파'].map((s)=>read(s,'modern')),['earth','earth','water','water','water']);
  assert.deepEqual(['아','하','마','바','파'].map((s)=>read(s,'hunminjeongeum')),['water','water','earth','earth','earth']);
  assert.deepEqual(['까','라','쌍','짱'].map((s)=>read(s,'modern')),['wood','fire','metal','metal']);
  assert.equal(read('A','modern'),null);
});

test('사주 래퍼: 용신·기신을 받고 생해 주는 오행만 파생하며 용신이 없으면 fail-closed',()=>{
  const snap=(yongshin,kijishin)=>({power:{yongshin,kijishin},natal:{elements:{wood:1,fire:2}},calculationMeta:{timeUnknown:true},jong:{isJong:true}});
  const a=E.sajuNeedsFromSnapshot(snap(['metal','earth'],['fire','wood','water','metal']));
  assert.deepEqual([a.useful,a.caution,a.support],[['metal','earth'],['fire','wood','water'],[]]);
  const b=E.sajuNeedsFromSnapshot(snap(['water'],['fire','earth']));
  assert.deepEqual(b.support,['metal']);
  assert.equal(b.natalCounts.metal,0);assert.equal(b.timeUnknown,true);assert.equal(b.jongConditional,true);
  assert.equal(code(()=>E.sajuNeedsFromSnapshot(snap([],['fire']))),'saju-unavailable');
  assert.equal(code(()=>E.sajuNeedsFromBirth({date:'2007-11-30',time:null,calendarType:'lunar'},'M')),'saju-unavailable');
});

test('뜻 거르기: 첫째 훈만 보고 반대 성별 호칭은 그 성별에서만 뺀다',()=>{
  assert.equal(E.hasNegativeMeaning('죽을 사, 주검 사'),true);
  assert.equal(E.hasNegativeMeaning('두 이, 의심할 이'),false);
  for(const ch of '到我味受帝之')assert.equal(E.awkwardForName(ch),true,ch);
  for(const ch of '致至連丞云')assert.equal(E.awkwardForName(ch),false,ch);
  assert.equal(E.mismatchesGender('아내 처','M'),true);
  assert.equal(E.mismatchesGender('아내 처','F'),false);
  assert.equal(E.mismatchesGender('아내 처','N'),false);
  const stageOf=(ch,gender)=>{const entry=data.poolByChar.get(ch);return E.unitStage(entry,entry.readings[0],'paid',gender);};
  assert.equal(stageOf('妻','M'),null);assert.notEqual(stageOf('妻','F'),null);
  assert.equal(stageOf('夫','F'),null);assert.notEqual(stageOf('夫','M'),null);
  assert.equal(stageOf('死','N'),null);
  // 疒부(병 이름)는 성별과 무관하게, 女부는 남자 이름에서만 뺀다(好·如 등 중립 글자 제외).
  const disease=data.pool.find((e)=>e.radical===E.DISEASE_RADICAL);
  assert.ok(disease);for(const g of ['M','F','N'])assert.equal(E.unitStage(disease,disease.readings[0],'paid',g),null,disease.ch);
  assert.equal(stageOf('娟','M'),null);assert.notEqual(stageOf('娟','F'),null);
  assert.notEqual(stageOf('好','M'),null);
  // 단위 시드는 접두 해시를 이어 계산한다 — FNV 상태 이어받기가 성립해야 결과 순서가 바뀌지 않는다.
  assert.equal(E.fnv1a('秉병',E.fnv1a('0123456789abcdef|')),E.fnv1a('0123456789abcdef|秉병'));
});

test('빠른 경로 총점은 scoreCandidate 재계산과 같다(단계·외자·돌림자·학파별)',()=>{
  const cases=[
    {nameLength:2,tier:'free',surname:['김',['金']],preset:'kr-modern'},
    {nameLength:2,tier:'paid',surname:['남궁',['南','宮']],preset:'kr-hunminjeongeum'},
    {nameLength:1,tier:'free',surname:['이',['李']],preset:'kr-pil'},
    {nameLength:2,tier:'paid',surname:['김',['金']],preset:'kr-modern',fixed:{position:1,ch:'俊'}},
    // 이름 목록 분기(추천 자연 이름·직접 고른 이름)도 같은 consider() 를 거친다.
    {nameLength:2,tier:'paid',surname:['김',['金']],preset:'kr-modern',names:{allowed:['민준','서윤','지안'],perSyllable:12,minNameUse:3}},
    {nameLength:1,tier:'free',surname:['이',['李']],preset:'kr-modern',names:{allowed:['윤'],perSyllable:Infinity,minNameUse:0}},
  ];
  let compared=0;
  for(const c of cases){
    const p=E.SCHOOL_PRESETS[c.preset];
    const surname=E.resolveSurname({hangul:c.surname[0],hanja:c.surname[1]},p.strokeMethod,data);
    const fixed=c.fixed?{position:c.fixed.position,entry:data.poolByChar.get(c.fixed.ch),hangul:null}:null;
    const ctx={surname,needs,preset:p,data,nameLength:c.nameLength,gender:'F',fixed,avoid:new Set(),tier:c.tier,inputHash:'00112233aabbccdd',names:c.names||null};
    const units=E.buildUnits(ctx);
    for(const stage of [0,3]){
      for(const hit of E.searchStage(ctx,units,stage,40)){
        const full=E.scoreCandidate(surname,hit.picks.map((u)=>({entry:u.entry,reading:u.reading})),needs,p,data);
        assert.ok(Math.abs(full.total-hit.total)<1e-9,`${c.preset} ${full.hanja.join('')} ${hit.total} vs ${full.total}`);
        assert.ok(hit.stage<=stage);
        if(c.names)assert.ok(c.names.allowed.includes(full.hangul),full.hangul);
        compared++;
      }
    }
  }
  assert.ok(compared>200,String(compared));
});

test('엔진 성질: 결정론·개수·점수 범위·하드 필터·정렬',()=>{
  const input={avoidChars:['秀','賢']};
  const free=run(input),again=run(input),paid=run(input,'paid');
  assert.deepEqual(free,again);
  assert.equal(free.inputHash,paid.inputHash);
  assert.equal(free.candidates.length,5);assert.equal(paid.candidates.length,12);
  assert.equal(free.engineVersion,E.ENGINE_VERSION);assert.equal(free.dataVersion,data.dataVersion);
  assert.ok(free.notices.includes('samjae.reference-only'));
  for(const result of [free,paid]){
    const seen=new Set();
    for(const c of result.candidates){
      assert.ok(!seen.has(c.hanja.join('')));seen.add(c.hanja.join(''));
      assert.ok(c.total>=0&&c.total<=100);
      for(const v of Object.values(c.scores))assert.ok(v>=0&&v<=1);
      assert.notEqual(c.suri.grades.jeong,'bad');
      assert.ok(c.hanja.every((ch)=>!input.avoidChars.includes(ch)));
      assert.equal(new Set(c.hanja).size,c.hanja.length);
      for(const ch of c.chars){
        assert.equal(E.hasNegativeMeaning(ch.hun),false,ch.ch);
        assert.equal(E.awkwardForName(ch.ch),false,ch.ch);
        assert.equal(E.mismatchesGender(ch.hun,'M'),false,ch.ch);
        if(result.tier==='free'&&!c.reasonKeys.includes('relaxed.stage-3'))assert.deepEqual(ch.disputes,[],ch.ch);
      }
    }
    if(result.relaxationStage===0){
      const totals=result.candidates.map((c)=>c.total);
      assert.deepEqual(totals,[...totals].sort((a,b)=>b-a));
    }
  }
  const one=run({nameLength:1,gender:'F'});
  assert.ok(one.candidates.every((c)=>c.hanja.length===1&&c.suri.i===8));
  const fixed=run({fixedChar:{position:1,ch:'俊'}},'paid');
  assert.ok(fixed.candidates.every((c)=>c.hanja[1]==='俊'));
  assert.equal(run({schoolPreset:'kr-hunminjeongeum'}).candidates[0].sound.mapping,'hunminjeongeum');
});

test('자연스러움: 이름 사용 빈도가 어감·실용 감점이 되고 드문 글자에 표지를 단다',()=>{
  const use=(ch,hangul)=>data.poolByChar.get(ch).readings.find((r)=>r.hangul===hangul).nameUse;
  assert.equal(use('賣','매'),0);assert.ok(use('俊','준')>100);
  const entry=data.poolByChar.get('俊');
  assert.ok(E.unitPenalty(entry,{nameUse:0})>E.unitPenalty(entry,{nameUse:5}));
  assert.equal(E.unitPenalty(entry,{nameUse:30}),E.unitPenalty(entry,{nameUse:3000}));
  assert.equal(E.namePositionPenalty(['지','민'],data.syllableUse),0);
  assert.ok(E.namePositionPenalty(['똥','깨'],data.syllableUse)>0);
  const paid=run({},'paid');
  // 사용 빈도가 없으면 상위 후보 대부분이 100점으로 묶여 tie 해시가 순위를 정했다(Phase 3 실측 69%).
  assert.ok(new Set(paid.candidates.map((c)=>c.total.toFixed(6))).size>paid.candidates.length/2);
  let flagged=0;
  for(const c of paid.candidates)c.chars.forEach((ch,k)=>{
    const rare=use(ch.ch,ch.hangul)<3;flagged+=rare?1:0;
    assert.equal(c.reasonKeys.includes(`practical.${k}.rare-in-names`),rare,ch.ch);
  });
  // 추천 자연 이름은 이름에 쓰인 한자만 쓰므로, 드문 글자 표지는 직접 고른 드문 이름에서 확인한다.
  assert.equal(flagged,0);
  const chosen=run({strategy:'choose',desiredNames:['솔휘']});
  for(const c of chosen.candidates)c.chars.forEach((ch,k)=>{
    const rare=use(ch.ch,ch.hangul)<3;flagged+=rare?1:0;
    assert.equal(c.reasonKeys.includes(`practical.${k}.rare-in-names`),rare,ch.ch);
  });
  assert.ok(flagged>0);
});

test('추천 방식: 성별마다 실제로 쓰이는 이름만 추천하고 해시는 Phase 6.5 이전과 같다',()=>{
  const male=E.naturalNames(data,'M',2),female=E.naturalNames(data,'F',2),neutral=E.naturalNames(data,'N',2);
  assert.ok(male.length>500&&female.length>300&&neutral.length>100,[male.length,female.length,neutral.length].join());
  assert.ok(male.includes('민준')&&!male.includes('서연')&&female.includes('서연')&&!female.includes('민준'));
  assert.ok(!female.includes('영자')&&!female.includes('순자'),'최근 출생자가 없는 옛 이름은 뺀다');
  assert.deepEqual(E.naturalNames(data,'M',2),male);
  for(const gender of ['M','F','N']){
    const r=run({gender},'paid');
    const allowed=E.naturalNames(data,gender,2);
    assert.equal(r.strategy,'recommend');assert.deepEqual(r.desiredNames,[]);
    assert.ok(r.candidates.every((c)=>allowed.includes(c.hangul)&&c.reasonKeys.includes('name.natural')),gender);
    assert.ok(!r.notices.includes('names.fallback'));
  }
  assert.equal(run({}).inputHash,run({strategy:'recommend'}).inputHash);
  // 기본 입력의 해시 고정값 — 추천 모드가 해시 키를 더하면 진행 중 회차가 끊긴다.
  assert.equal(run({}).inputHash,'26f30d8041189625');
  // 외자도 성별 자연 이름에서 고른다.
  const one=run({gender:'F',nameLength:1},'paid');
  assert.ok(one.candidates.every((c)=>E.naturalNames(data,'F',1).includes(c.hangul)));
});

test('선택 방식: 고른 이름마다 한자 조합을 찾고 몫을 나누며 모자라면 알린다',()=>{
  const picked=run({strategy:'choose',desiredNames:[' 서윤','하은','지안','서윤']},'paid');
  assert.equal(picked.strategy,'choose');assert.deepEqual(picked.desiredNames,['서윤','하은','지안']);
  for(const name of ['서윤','하은','지안'])assert.equal(picked.candidates.filter((c)=>c.hangul===name).length,4);
  // 순위는 총점 순이다(1위 = 최고점 — 서술의 "가장 높은 점수"와 맞는다).
  assert.ok(picked.candidates.every((c,i,a)=>!i||a[i-1].total>=c.total),picked.candidates.map((c)=>c.total).join());
  assert.ok(picked.candidates.every((c)=>c.reasonKeys.includes('name.chosen')));
  assert.equal(new Set(picked.candidates.map((c)=>c.hanja.join(''))).size,12);
  assert.notEqual(picked.inputHash,run({}).inputHash);
  assert.notEqual(picked.inputHash,run({strategy:'choose',desiredNames:['서윤','하은']},'paid').inputHash);
  // 한자를 못 찾는 이름은 몫을 앞 이름에 넘기고 고지한다. 외자도 그 이름의 길이로 찾는다.
  const partial=run({strategy:'choose',desiredNames:['똥깨','윤']},'paid');
  assert.ok(partial.notices.includes('desired.unavailable'));
  const yoon=partial.candidates.filter((c)=>c.hangul==='윤');
  assert.ok(partial.candidates.length===12&&yoon.length>=5&&partial.candidates.slice(0,yoon.length).every((c)=>c.hangul==='윤'));
  // 쓰인 한자 조합이 적은 이름은 드문 한자로 무료 개수까지만 채우고, 나머지는 추천 이름으로 채운다.
  const padded=run({strategy:'choose',desiredNames:['하람']},'paid');
  assert.ok(padded.notices.includes('desired.padded'));
  const own=padded.candidates.filter((c)=>c.hangul==='하람');
  assert.ok(own.length>=5&&own.length<12);
  assert.ok(padded.candidates.slice(own.length).every((c)=>c.reasonKeys.includes('name.natural')));
  // 외자만 고르면 보충 이름도 외자다(입력 nameLength 2 와 무관).
  const single=run({strategy:'choose',desiredNames:['윤']},'paid');
  assert.ok(single.notices.includes('desired.padded'));
  assert.ok(single.candidates.length===12&&single.candidates.every((c)=>c.hanja.length===1),single.candidates.map((c)=>c.hangul).join());
  // 돌림자는 그 자리 음절이 맞는 이름에만 쓴다.
  const dol=run({strategy:'choose',desiredNames:['민준','서연'],fixedChar:{position:1,ch:'俊'}},'paid');
  assert.ok(dol.candidates.filter((c)=>c.hangul==='민준').every((c)=>c.hanja[1]==='俊'));
  assert.ok(dol.candidates.filter((c)=>c.hangul==='서연').every((c)=>!c.hanja.includes('俊')));
  assert.equal(code(()=>run({strategy:'choose'})),'input-invalid');
  assert.equal(code(()=>run({strategy:'choose',desiredNames:[]})),'input-invalid');
  assert.equal(code(()=>run({strategy:'choose',desiredNames:['서윤아']})),'input-invalid');
  assert.equal(code(()=>run({strategy:'choose',desiredNames:['Seo']})),'input-invalid');
  assert.equal(code(()=>run({strategy:'choose',desiredNames:['가','나','다','라','마','바']})),'input-invalid');
  assert.equal(code(()=>run({strategy:'pick'})),'input-invalid');
});

test('완화: 엄격 단계로 못 채우면 부족분만 다음 단계에서 채우고 키·고지를 남긴다',()=>{
  // 분쟁 글자만 남긴 풀: 무료는 3단계에서만 허용되고, 유료는 엄격 단계에서 허용된다.
  const pool=data.pool.filter((e)=>e.disputes.length>0&&e.jawon&&e.readings.some((r)=>r.hun)).slice(0,400);
  const thin={...data,pool,poolByChar:new Map(pool.map((e)=>[e.ch,e]))};
  const free=run({},'free',{data:thin});
  assert.equal(free.relaxationStage,3);
  assert.ok(free.notices.includes('relaxed.stage-3'));
  assert.ok(free.candidates.length>0&&free.candidates.every((c)=>c.reasonKeys.includes('relaxed.stage-3')));
  const paid=run({},'paid',{data:thin});
  assert.ok(paid.relaxationStage<3);
  assert.ok(paid.candidates.every((c)=>!c.reasonKeys.includes('relaxed.stage-3')));
});

test('입력 정규화: CJK 호환 한자(IME 의 金 U+F90A·李 U+F9E1)는 통합 한자와 같은 입력이다',()=>{
  assert.deepEqual(run({surname:{hangul:'김',hanja:['金']},avoidChars:['李']}),run({avoidChars:['李']}));
  // 돌림자도 NFC 로 찾는다 — 못 찾으면 fixed-char-unknown 이 먼저 난다.
  assert.equal(code(()=>run({fixedChar:{position:0,ch:'李'},avoidChars:['李']})),'fixed-char-avoided');
});

test('입력 오류 코드',()=>{
  assert.equal(code(()=>run({mode:'hangul'})),'mode-unsupported');
  assert.equal(code(()=>run({mode:'x'})),'input-invalid');
  assert.equal(code(()=>run({schoolPreset:'jp'})),'preset-unknown');
  assert.equal(code(()=>run({gender:'X'})),'input-invalid');
  assert.equal(code(()=>run({nameLength:3})),'input-invalid');
  assert.equal(code(()=>run({avoidChars:['秀賢']})),'input-invalid');
  assert.equal(code(()=>run({avoidChars:Array.from('一二三四五六七八九十百千萬甲乙丙丁戊己庚辛')})),'avoid-too-many');
  assert.equal(code(()=>run({fixedChar:{position:1,ch:'俊'},nameLength:1})),'input-invalid');
  assert.equal(code(()=>run({fixedChar:{position:0,ch:'A'}})),'fixed-char-unknown');
  assert.equal(code(()=>run({fixedChar:{position:0,ch:'俊'},avoidChars:['俊']})),'fixed-char-avoided');
  assert.equal(code(()=>run({fixedChar:{position:0,ch:'俊',hangul:'가'}})),'fixed-char-reading');
  assert.equal(code(()=>run({surname:{hangul:'김',hanja:['金','李']}})),'surname-invalid');
  assert.equal(code(()=>run({surname:{hangul:'가',hanja:['A']}})),'surname-unknown');
});
