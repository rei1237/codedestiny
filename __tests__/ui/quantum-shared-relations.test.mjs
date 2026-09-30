import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../../js/saju-engine-tarot-sukuyo-quantum.js',import.meta.url),'utf8');
const quantumSource=source.slice(source.indexOf('function renderQuantumStrategy(p, natal, bazi){'));
const fortuneSource=source.slice(source.indexOf('function analyzeFortuneGZ(gz, p, label){'),source.indexOf('function isNeoSajuModeActive()'));
const GAN=Object.fromEntries([...'甲乙丙丁戊己庚辛壬癸'].map((g,i)=>[g,{e:['wood','fire','earth','metal','water'][Math.floor(i/2)],n:g,y:i%2?'-':'+'}]));
const JI=Object.fromEntries([...'子丑寅卯辰巳午未申酉戌亥'].map((j,i)=>[j,{e:['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'][i]}]));
const P={y:{g:'甲',j:'子'},m:{g:'己',j:'丑'},d:{g:'辛',j:'卯'},h:{g:'壬',j:'酉'}};
const clone=(value)=>JSON.parse(JSON.stringify(value));

function render({rows=[],timeUnknown=false,canonicalTimeUnknown=false,mismatch=false,now='2026-02-03T15:05:00Z'}={}){
  const nodes={quantumSection:{innerHTML:''},quantumCard:{style:{}}};
  const calls=[],calendarCalls=[];
  class KstDate extends Date {
    static now(){return Date.parse(now);}
    getFullYear(){throw new Error('Local year must not select the Korean luck cycle');}
    getMonth(){throw new Error('Local month must not select the Korean luck cycle');}
    getDate(){throw new Error('Local date must not select the Korean luck cycle');}
  }
  const p=clone(P);
  const context={
    console,Date:KstDate,GAN,JI,EL_K:{wood:'목',fire:'화',earth:'토',metal:'금',water:'수'},EL_E:{},
    SHENG:{wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'},
    G_PILLARS:mismatch?{...clone(P),y:{g:'乙',j:'子'}}:p,
    G_POWER:{yongshin:['fire'],kijishin:['water'],isStrong:true},G_JONG:null,G_JOHU:null,CURRENT_AGE:37,
    G_NATAL:{counts:{wood:2,fire:0,earth:2,metal:2,water:2}},
    window:{__cdSajuTimeUnknown:canonicalTimeUnknown,__cdBirthTimeUnknown:timeUnknown,G_DAEWUN:[{age:8,g:'甲',j:'子'},{age:28,g:'丙',j:'午'},{age:38,g:'丁',j:'未'}]},
    document:{getElementById:(id)=>nodes[id]},
    getQuantumElType:(el)=>el==='fire'?'good':el==='water'?'bad':'neutral',
    getTenGod:()=> '편관',_sajuQuantumText:(key)=>key,whoControls:()=> 'water',
    _getDwHapResults:(g,j)=>{calls.push([g,j]);return clone(rows);},
    _coreEightChar:(...args)=>{calendarCalls.push(args);return {getYearGan:()=> '乙',getYearZhi:()=> '巳',getMonthGan:()=> '己',getMonthZhi:()=> '丑'};},
    getMonthGanZhi:()=>({g:'庚',j:'寅'}),
  };
  vm.createContext(context);vm.runInContext(quantumSource,context);
  context.renderQuantumStrategy(p,context.G_NATAL,{getYun(){throw new Error('Must use G_DAEWUN');}});
  return {report:clone(context.window.G_QUANTUM),html:nodes.quantumSection.innerHTML,calls,calendarCalls};
}

test('퀀텀은 대운표와 동일한 현재 구간 및 공통 합충 결과를 표시한다',()=>{
  const rows=[{type:'간합(天干)',src:'丙',partner:'辛',hapEl:'water',orgEl:'fire',orgType:'good',newType:'good',changed:false,transformed:false,conditions:['월령 지지 미충족'],isChung:false}];
  const result=render({rows});
  assert.deepEqual(result.calls,[['丙','午'],['乙','巳']]);
  assert.deepEqual(result.report.dwResults,rows);
  assert.match(result.html,/합화 미확정/);
  assert.match(result.html,/월령 지지 미충족/);
  assert.equal(result.report.details.daewunTimeline.find((r)=>r.current).gan,'丙');
  assert.doesNotMatch(result.html,/제련발복|보석용해|화련진금|흉신파기|용신파손|치명적 흉운/);
});

test('합화 성립은 공통 판정이 transformed를 확정한 경우에만 표시한다',()=>{
  const row={type:'간합(天干)',src:'丙',partner:'辛',hapEl:'water',orgEl:'fire',orgType:'good',newType:'bad',changed:true,transformed:true,conditions:['합화 조건 충족']};
  const {html,report}=render({rows:[row]});
  assert.ok(html.includes('합화(合化) 조건 성립'));
  assert.equal(report.dwResults[0].newType,'bad');
  for(const word of ['간(肝)','심장','혈압','폐·','신장','방광','부동산','색상','남향','북향']) assert.ok(!report.actions.join(' ').includes(word),word);
});

test('충과 기신만으로 발복이나 손실을 확정하지 않는다',()=>{
  const row={type:'간충(天干)',src:'丙',partner:'壬',orgEl:'water',orgType:'bad',isChung:true,changed:false,transformed:false,conditions:[]};
  const {html,report}=render({rows:[row]});
  assert.equal(report.decision,'합충 조건 점검');
  assert.match(html,/발복이나 손실을 정하지 않고/);
  assert.doesNotMatch(report.facts.join(' '),/대발복|파괴되어|차버린|치명적|엎드려/);
});

for(const flag of ['timeUnknown','canonicalTimeUnknown'])test('시각 미상은 대운 구간을 확정하지 않고 시주를 표시하지 않는다: '+flag,()=>{
  const {report,html,calls}=render({[flag]:true});
  assert.deepEqual(report.details.daewunTimeline,[]);
  assert.equal(report.details.pillars.find((r)=>r.label==='sq_14919_prop_label').gan,'');
  assert.deepEqual(calls,[['乙','巳']]);
  assert.match(html,/시각 미상 · 대운 시점 미확정/);
});

test('다른 명식의 전역 결과는 현재 퀀텀에 섞지 않는다',()=>{
  const {report,html,calls}=render({mismatch:true});
  assert.deepEqual(calls,[]);
  assert.deepEqual(report.dwResults,[]);
  assert.match(html,/원국 계산 상태를 다시 확인/);
});

test('세운·현재 월운은 브라우저 지역이나 정오가 아닌 KST 현재 시각을 사용한다',()=>{
  const {calendarCalls,report}=render();
  assert.deepEqual(calendarCalls[0],[2026,2,4,0,5]);
  assert.equal(calendarCalls.filter((args)=>JSON.stringify(args)==='[2026,2,4,0,5]').length,3);
  assert.equal(report.details.monthlyFlow.find((row)=>row.month===2).gan,'己');
});

test('일월연운도 금일간 수화충 특례나 辛丁 흉운을 만들지 않는다',()=>{
  const context={GAN,JI,G_POWER:{yongshin:['fire'],kijishin:['water']},G_NATAL:{counts:{}},window:{G_JONG:null},getTenGod:()=> '편관',_sajuQuantumText:(key)=>key};
  vm.createContext(context);vm.runInContext(fortuneSource,context);
  const clash=context.analyzeFortuneGZ({g:'丙',j:'午'},clone(P),'일운');
  assert.notEqual(clash.batteryPercent,95);
  assert.match(clash.adviceItems.map((r)=>r.body).join(' '),/충/);
  const ding=context.analyzeFortuneGZ({g:'丁',j:'未'},clone(P),'일운');
  assert.doesNotMatch(JSON.stringify(ding),/보석|화련진금|제련발복|편관(丁).*위협|관재구설/);
});
