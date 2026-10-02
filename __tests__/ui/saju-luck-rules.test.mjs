import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { evaluateDaewun, evaluateSajuQuantumElement } from '../../worker/lib/saju-quantum-myeongri.js';
import { sajuHapAssessment, sajuSamhapState } from '../../lib/saju/luck-rules.js';

// Execute production declarations, not a copied implementation or source-text assertion.
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=fs.readFileSync(new URL('../../js/saju-engine.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('saju-engine.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declarations=new Map();
for(const node of ast.statements){
  if(ts.isFunctionDeclaration(node)&&node.name)declarations.set(node.name.text,node.getText(ast));
  if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations){
    if(ts.isIdentifier(d.name))declarations.set(d.name.text,'var '+d.getText(ast)+';');
  }
}
const names=['GAN','JI','CD_JANGGAN','CD_SAMHAP','EL_K','KE','SHENG','whoControls','parentOf',
  'sajuHapAssessment','sajuSamhapState','getQuantumElType','__evalDaewunMemo',
  '__evalDaewunContextVersion','resetEvalDaewunMemo','evalDaewun','_DW_GANHE','_DW_JIHE','_dwElType','_getDwHapResults'];
for(const name of names)assert.ok(declarations.has(name),'Production declaration missing: '+name);
const shell=vm.createContext({window:{},_sajuEngineText:(key)=>key});
vm.runInContext(names.map((name)=>declarations.get(name)).join('\n'),shell,{filename:'actual-saju-luck-functions.js'});
const plain=(value)=>JSON.parse(JSON.stringify(value));
const elements=['wood','fire','earth','metal','water'];
const stems=[...'甲乙丙丁戊己庚辛壬癸'];
const branches=[...'子丑寅卯辰巳午未申酉戌亥'];
const cycles=Array.from({length:60},(_,i)=>[stems[i%10],branches[i%12]]);
// These are rule-coverage fixtures, not claims that these pillars describe a real birth.
const charts=[
  {y:{g:'甲',j:'申'},m:{g:'丙',j:'子'},d:{g:'辛',j:'辰'},h:{g:'丁',j:'酉'}},
  {y:{g:'乙',j:'寅'},m:{g:'壬',j:'午'},d:{g:'庚',j:'戌'},h:{g:'癸',j:'未'}},
  {y:{g:'己',j:'丑'},m:{g:'戊',j:'辰'},d:{g:'乙',j:'卯'},h:{g:'丙',j:'巳'}},
  {y:{g:'癸',j:'巳'},m:{g:'丁',j:'酉'},d:{g:'壬',j:'丑'},h:{g:'壬',j:'丑'}},
];
const powerFor=(strong)=>({isStrong:strong,yongshin:strong?['fire','earth']:['wood','water'],kijishin:strong?['wood']:['metal']});
const neutralPower={isStrong:false,yongshin:[],kijishin:[]};
function setContext(context){
  shell.G_PILLARS=plain(context.pillars);
  shell.G_POWER=context.power==null?null:plain(context.power);
  shell.G_JONG=context.jong==null?null:plain(context.jong);
  shell.G_JOHU=context.johu==null?null:plain(context.johu);
  shell.window.__cdSajuTimeUnknown=!!context.birthTimeUnknown;
  shell.resetEvalDaewunMemo();
}
function comparable(result){
  return {score:result.score,className:result.className??result.cls,tagClassName:result.tagClassName??result.tagCls,
    hasChungBonus:result.hasChungBonus,hasChungPenalty:result.hasChungPenalty,
    hasJiheBonus:result.hasJiheBonus,hasSamhapBonus:result.hasSamhapBonus,jongStrength:result.jongStrength||null};
}
function* contexts(){
  for(const [chartIndex,pillars] of charts.entries())for(const strong of [false,true]){
    for(const type of ['cold','hot','neutral'])for(const kind of ['ordinary','jong','jong-wealth'])for(const birthTimeUnknown of [false,true]){
      const dayEl=shell.GAN[pillars.d.g].e;
      const dominant=kind==='jong-wealth'?shell.KE[dayEl]:dayEl;
      const jong=kind==='ordinary'?{isJong:false}:{isJong:true,name:kind==='jong-wealth'?'종재격':'종왕격',
        dominant,parEl:shell.parentOf(dominant),dayEl};
      yield {id:[chartIndex,strong?'strong':'weak',type,kind,birthTimeUnknown?'unknown-hour':'known-hour'].join('/'),
        pillars,power:powerFor(strong),jong,johu:{type},birthTimeUnknown};
    }
  }
}

test('60간지 × 신강·신약 × 조후 × 일반·종격·종재격 × 시주 유무의 점수와 플래그가 서버와 같다',()=>{
  let count=0;
  const flags=new Set();
  for(const context of contexts()){
    setContext(context);
    for(const [g,j] of cycles){
      const actual=comparable(shell.evalDaewun(g,j));
      const expected=comparable(evaluateDaewun(g,j,context));
      assert.deepEqual(actual,expected,context.id+' '+g+j);
      for(const flag of ['hasChungBonus','hasChungPenalty','hasJiheBonus','hasSamhapBonus'])if(actual[flag])flags.add(flag);
      count++;
    }
  }
  assert.equal(count,8640);
  assert.deepEqual([...flags].sort(),['hasChungBonus','hasChungPenalty','hasJiheBonus','hasSamhapBonus'].sort(),
    'The matrix must exercise each positive relation flag, not merely the neutral path');
});

test('명시적 조후 판정이 있는 퀀텀 오행의 희기 분류가 서버와 같다',()=>{
  const mismatches=[];
  for(const context of contexts())for(const element of elements){
    const actual=shell.getQuantumElType(element,context.pillars,context.jong,context.power,context.johu);
    const expected=evaluateSajuQuantumElement(element,context);
    if(actual!==expected)mismatches.push({id:context.id,element,actual,expected});
  }
  assert.equal(mismatches.length,0,JSON.stringify(mismatches.slice(0,8),null,2));
});

test('조후값이 없으면 월지를 사용하고 명시적 neutral은 계절값을 덮어쓴다',()=>{
  for(const pillars of charts)for(const johu of [null,{type:'neutral'}]){
    const context={pillars,power:neutralPower,jong:{isJong:false},johu};
    setContext(context);
    for(const [g,j] of cycles)assert.deepEqual(comparable(shell.evalDaewun(g,j)),comparable(evaluateDaewun(g,j,context)),
      pillars.m.j+' / '+JSON.stringify(johu)+' / '+g+j);
    for(const element of elements)assert.equal(shell.getQuantumElType(element,pillars,context.jong,neutralPower,johu),
      evaluateSajuQuantumElement(element,context),pillars.m.j+' / '+JSON.stringify(johu)+' / '+element);
  }
});

test('합 후보는 월령·투간·통근과 쟁합·충 조건을 통과한 경우에만 합화한다',()=>{
  const cases=[
    {name:'조건 충족 천간합',args:['earth','stem','甲','己',['甲','己','戊'],['辰','申','子'],'辰'],transformed:true},
    {name:'월령 부족',args:['earth','stem','甲','己',['甲','己','戊'],['卯','申','子'],'卯'],transformed:false,condition:'월령의 지지 부족'},
    {name:'화신 미투간',args:['earth','stem','甲','己',['甲','乙','丙'],['辰','申','子'],'辰'],transformed:false,condition:'화신의 투간 미확인'},
    {name:'화신 미통근',args:['earth','stem','甲','己',['甲','己','戊'],['子','卯'],'辰'],transformed:false,condition:'화신의 통근 미확인'},
    {name:'쟁합',args:['earth','stem','甲','己',['甲','己','戊','甲'],['辰','申','子'],'辰'],transformed:false,condition:'쟁합 가능성'},
    {name:'천간충 동반',args:['earth','stem','甲','己',['甲','己','戊','庚'],['辰','申','子'],'辰'],transformed:false,condition:'충이 함께 작용'},
    {name:'조건 충족 육합',args:['fire','branch','午','未',['丙','甲','辛'],['午','未','巳'],'巳'],transformed:true},
    {name:'지지충 동반',args:['fire','branch','午','未',['丙','甲','辛'],['午','未','巳','子'],'巳'],transformed:false,condition:'충이 함께 작용'},
  ];
  for(const fixture of cases){
    const actual=plain(shell.sajuHapAssessment(...fixture.args));
    assert.deepEqual(actual,sajuHapAssessment(...fixture.args),fixture.name+' shared helper parity');
    assert.equal(actual.transformed,fixture.transformed,fixture.name);
    if(fixture.condition)assert.ok(actual.conditions.includes(fixture.condition),fixture.name);
  }
});

test('삼합은 서로 다른 세 글자, 반합은 왕지를 포함한 두 글자로 판정한다',()=>{
  for(const members of [['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']]){
    const [birth,king,tomb]=members;
    const fixtures=[
      [tomb,[birth,king],'full'],[birth,[king,tomb],'full'],[king,[birth,tomb],'full'],
      [tomb,[birth,birth],'none'],[birth,[tomb,tomb],'none'], // 생지+고지는 왕지가 없는 가합: 반합과 구분
      [tomb,[king,king],'half'],[birth,[king],'half'],[king,[birth],'half'],
      [birth,[birth,birth],'none'],[tomb,[tomb,tomb],'none'],['?',members,'none'],
    ];
    for(const [incoming,original,expected] of fixtures){
      assert.equal(shell.sajuSamhapState(members,incoming,original),expected,members.join('')+' / '+incoming+' / '+original);
      assert.equal(sajuSamhapState(members,incoming,original),expected);
    }
  }
});

test('대운 점수의 삼합은 이전 판정대로 원국 지지 개수(중복 포함)로 센다',()=>{
  const cases=[
    {original:['申','申','申'],score:72,flag:true},
    {original:['子','子','子'],score:72,flag:true},
    {original:['申','子','申'],score:72,flag:true},
    {original:['申','卯','午'],score:60,flag:true},
  ];
  for(const fixture of cases){
    const pillars={y:{g:'甲',j:fixture.original[0]},m:{g:'戊',j:fixture.original[1]},d:{g:'乙',j:fixture.original[2]},h:{g:'',j:''}};
    const context={pillars,power:{yongshin:['water'],kijishin:[]},jong:{isJong:false},johu:{type:'neutral'}};
    setContext(context);
    for(const result of [shell.evalDaewun('戊','辰'),evaluateDaewun('戊','辰',context)]){
      assert.equal(result.score,fixture.score,fixture.original.join(''));
      assert.equal(result.hasSamhapBonus,fixture.flag);
    }
  }
});

test('공통 관계는 실제 천간합·육합·충만 반환하며 중복 관계를 합화로 오인하지 않는다',()=>{
  const stemHaps=['甲己','乙庚','丙辛','丁壬','戊癸'];
  const branchHaps=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
  const stemClashes=['甲庚','乙辛','丙壬','丁癸'];
  const branchClashes=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  const isPair=(pairs,a,b)=>pairs.includes(a+b)||pairs.includes(b+a);
  for(const pillars of charts)for(const birthTimeUnknown of [false,true]){
    setContext({pillars,power:powerFor(false),jong:{isJong:false},johu:{type:'neutral'},birthTimeUnknown});
    const original=['y','m','d',...(!birthTimeUnknown?['h']:[])].map((key)=>pillars[key]);
    for(const [g,j] of cycles){
      const actual=plain(shell._getDwHapResults(g,j));
      const expected=[];
      for(const p of original){
        if(isPair(stemHaps,g,p.g))expected.push('간합(天干):'+g+p.g);
        if(isPair(stemClashes,g,p.g))expected.push('간충(天干):'+g+p.g);
        if(isPair(branchHaps,j,p.j))expected.push('지합(地支):'+j+p.j);
        if(isPair(branchClashes,j,p.j))expected.push('지충(地支):'+j+p.j);
      }
      assert.deepEqual(actual.map((r)=>r.type+':'+r.src+r.partner).sort(),[...new Set(expected)].sort(),g+j);
      for(const row of actual){
        assert.equal(row.ruleVersion,'saju-luck-v2');
        assert.ok(Array.isArray(row.conditions));
        assert.equal('isSinDing' in row,false);
        assert.equal('isSpecialChung' in row,false);
        if(!row.transformed){assert.equal(row.newType,row.orgType);assert.equal(row.changed,false);}
        if(row.isChung){assert.equal(row.transformed,false);assert.equal(row.hapEl,null);}
      }
    }
  }
});

test('공통 관계에서 합 후보와 실제 합화 및 대운·세운의 참조 관계를 구분한다',()=>{
  const context={pillars:charts[2],power:{yongshin:['earth'],kijishin:['wood']},jong:{isJong:false},johu:{type:'neutral'}};
  setContext(context);
  const find=()=>plain(shell._getDwHapResults('甲','申')).find((row)=>row.type==='간합(天干)');
  const transformed=find();
  assert.equal(transformed.hapEl,'earth');
  assert.equal(transformed.transformed,true);
  assert.equal(transformed.orgType,'bad');
  assert.equal(transformed.newType,'good');
  assert.equal(transformed.changed,true);
  setContext({...context,pillars:{...charts[2],m:{g:'戊',j:'卯'}}});
  const candidate=find();
  assert.equal(candidate.hapEl,'earth');
  assert.equal(candidate.transformed,false);
  assert.equal(candidate.orgType,candidate.newType);
  const reference=plain(shell._getDwHapResults('甲','申',charts[2])).find((row)=>row.type==='간합(天干)');
  assert.equal(reference.transformed,false);
  assert.ok(reference.conditions.some((text)=>text.includes('원국 전체')));
});

test('시주 미상은 시주의 합충·가중치를 제외하고 알려진 3주와 동일한 결과를 낸다',()=>{
  const pillars={y:{g:'甲',j:'寅'},m:{g:'己',j:'卯'},d:{g:'乙',j:'辰'},h:{g:'癸',j:'子'}};
  const context={pillars,power:{yongshin:['fire'],kijishin:['water']},jong:{isJong:false},johu:{type:'neutral'}};
  setContext(context);
  const known=comparable(shell.evalDaewun('丁','午'));
  const knownRows=plain(shell._getDwHapResults('丁','午'));
  assert.ok(knownRows.some((r)=>r.src==='丁'&&r.partner==='癸'&&r.isChung));
  assert.ok(knownRows.some((r)=>r.src==='午'&&r.partner==='子'&&r.isChung));
  setContext({...context,birthTimeUnknown:true});
  const unknown=comparable(shell.evalDaewun('丁','午'));
  const unknownRows=plain(shell._getDwHapResults('丁','午'));
  assert.equal(unknownRows.length,0);
  assert.notEqual(known.score,unknown.score,'Removing the hour must affect this clash fixture');
  assert.deepEqual(unknown,comparable(evaluateDaewun('丁','午',{...context,birthTimeUnknown:true})));
  setContext({...context,pillars:{...pillars,h:{g:'',j:''}}});
  assert.deepEqual(comparable(shell.evalDaewun('丁','午')),unknown);
  assert.deepEqual(plain(shell._getDwHapResults('丁','午')),unknownRows);
});

test('辛 일간의 丁 대운은 이전 판정대로 감점하고 庚 일간은 감점하지 않는다',()=>{
  for(const isStrong of [false,true])for(const type of ['cold','hot','neutral']){
    const outputs=[];
    for(const day of ['辛','庚']){
      const pillars={y:{g:'乙',j:'辰'},m:{g:'己',j:'辰'},d:{g:day,j:'辰'},h:{g:'戊',j:'辰'}};
      const context={pillars,power:{...neutralPower,isStrong},jong:{isJong:false},johu:{type}};
      setContext(context);
      const actual=comparable(shell.evalDaewun('丁','丑'));
      assert.deepEqual(actual,comparable(evaluateDaewun('丁','丑',context)));
      assert.equal(actual.hasChungPenalty,day==='辛');
      assert.equal(plain(shell._getDwHapResults('丁','丑')).some((r)=>r.src==='丁'),false);
      outputs.push(actual);
    }
    assert.ok(outputs[0].score<outputs[1].score,String(isStrong)+' / '+type);
    if(type==='neutral'){assert.equal(outputs[1].score,50);assert.equal(outputs[0].score,0);}
  }
});

test('생성된 서버 공통 합·삼합 규칙은 브라우저 원천과 드리프트가 없다',()=>{
  const result=spawnSync(process.execPath,['scripts/sync-saju-luck-rules.mjs','--check'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/PASS shared saju luck rules match shell/);
});
