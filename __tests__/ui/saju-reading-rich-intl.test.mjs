import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { calcPower, analyzeJohu } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';

// Same page globals as saju-reading-rich.test.mjs; the intl layer is loaded after the Korean one it builds on.
const engine=readFileSync('js/saju-engine.js','utf8');
const tables=engine.slice(engine.indexOf('var GAN={'),engine.indexOf('/* ─── 십성 DB ─── */'));
const tenGod=engine.slice(engine.indexOf('function getTenGod(dayGan,target){'),engine.indexOf('function parseTimeZoneOffsetName'));
const context=vm.createContext({});
vm.runInContext(tables+tenGod+readFileSync('js/core/saju/reading-rich.js','utf8')+readFileSync('js/core/saju/reading-rich-intl.js','utf8'),context);
const rich=context.SajuReadingRich, intl=context.SajuReadingRichIntl;

const LOCALES=['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'];
const stems=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], branches=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
let seed=11;const next=n=>(seed=(seed*1103515245+12345)%2147483648)%n;
const pillar=()=>({g:stems[next(10)],j:branches[next(12)]});
const charts=Array.from({length:40},()=>({y:pillar(),m:pillar(),d:pillar(),h:pillar()}));
const factsOf=(p,extra={})=>({p,johu:analyzeJohu(p),power:calcPower(p),jong:null,unknown:false,...extra});
// Any Hangul left on the page, minus the one attribute that carries the Korean ten-god key the modal looks up.
const hangul=html=>(html.replace(/ data-saju-god="[^"]*"/g,'').match(/[가-힣]+/g)||[]);

const flow=[{kind:'period',g:'甲',j:'午',score:72,summary:'🌟 식상 대운',age:31,end:40,relations:[{type:'지충(地支)',src:'午',partner:'子',isChung:true},{type:'간합(天干)',src:'甲',partner:'己',isChung:false,transformed:true}]},{kind:'year',g:'乙',j:'巳',score:35,summary:'⚠️[충의 부담] 🙂 평운',year:2026,relations:[]}];
const dayRow={gz:{g:'丙',j:'子'},gGod:'식신',jGod:'정관',gEl:'fire',jEl:'water',batteryPercent:30,grade:'조심 🛡️',luckyEl:'wood',
  lt:{color:'초록',action:'동쪽 방향 외출'},lb:{color:'초록·민트',material:'리넨',item:'그린 스카프'},adviceItems:[{type:'warn',title:'충(沖) — 子午',body:'<b>속도 조절</b>'}]};

function everything(api,facts,mode){
  const out={
    ilju:api.ilju(facts,mode), ten:api.tenOverview(facts,mode), cards:api.tenCards(facts,mode),
    climate:api.climate(facts,mode), strength:api.strength(facts,mode), flow:api.flow(facts,mode),
    day:api.daily(dayRow,0,facts,mode), month:api.daily(dayRow,1,facts,mode)};
  for(const g of Object.keys(facts.ten||{}))out['god-'+g]=api.godDetail(g,facts,mode);
  return out;
}

test('every locale draws all six sections with no Hangul, in both voices, for many charts',()=>{
  for(const lang of LOCALES){
    const api=intl.forLang(lang);
    for(const p of charts.slice(0,25)){
      const ten={};[p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(ch=>{const g=context.getTenGod(p.d.g,ch);ten[g]=(ten[g]||0)+1;});
      for(const mode of ['pig','neo']){
        const out=everything(api,factsOf(p,{ten,flow}),mode);
        for(const [name,html] of Object.entries(out)){
          assert.ok(html.length>200,lang+' '+name+' is empty');
          assert.deepEqual(hangul(html),[],lang+' '+mode+' '+name+' '+JSON.stringify(p));
          assert.match(html,new RegExp('data-reading-mode="'+mode+'"|saju-ten-button'),name);
        }
      }
    }
  }
});

test('the intl layer reuses the Korean numbers: gauges and counts match, only the words differ',()=>{
  const pos=html=>html.match(/--pos:[\d.]+%/g);
  for(const p of charts.slice(0,10)){
    const facts=factsOf(p,{flow});
    for(const s of ['climate','strength','flow'])assert.deepEqual(pos(intl.forLang('en')[s](facts,'pig')),pos(rich[s](facts,'pig')),s);
    assert.deepEqual(pos(intl.forLang('en').tenOverview(facts,'pig')),pos(rich.tenOverview(facts,'pig')));
    assert.deepEqual(pos(intl.forLang('en').daily(dayRow,0,facts,'pig')),pos(rich.daily(dayRow,0,facts,'pig')));
  }
});

test('intl: a card exists for every ten god in the chart and its modal reads the same key',()=>{
  for(const p of charts.slice(0,15)){
    const ten={};[p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(ch=>{const g=context.getTenGod(p.d.g,ch);ten[g]=(ten[g]||0)+1;});
    const facts=factsOf(p,{ten}),api=intl.forLang('en');
    const keys=html=>(html.match(/data-saju-god="([^"]+)"/g)||[]).map(s=>s.slice(15,-1)).sort();
    assert.deepEqual(keys(api.tenCards(facts,'pig')),keys(rich.tenCards(facts,'pig')));
    assert.deepEqual(keys(api.tenCards(facts,'pig')),Object.keys(ten).sort());
  }
  assert.equal(intl.forLang('en').godDetail('없는십성',factsOf(charts[0]),'pig'),'');
});

test('intl: unknown birth time marks the hour rows and keeps the warning; a jong chart and a disagreeing breakdown behave like ko',()=>{
  const p=charts[8],warn='Birth time unknown: noon stand-in.',api=intl.forLang('en');
  const unknown=factsOf(p,{unknown:true,warning:warn});
  assert.match(api.climate(unknown,'pig'),/Hour stem \(noon assumed\)/);
  assert.match(api.strength(unknown,'pig'),/Hour stem \(noon assumed\)/);
  assert.ok(api.strength(unknown,'pig').includes(warn));
  assert.match(api.ilju(unknown,'pig'),/Unknown/);
  assert.doesNotMatch(api.climate(factsOf(p),'pig'),/noon assumed/);
  const jong=api.strength(factsOf(charts[5],{jong:{isJong:true,name:'종재격',dominant:'earth',pct:72,isGaJong:true,verifiedText:'<img src=x onerror=alert(1)>'}}),'pig');
  assert.match(jong,/Following structure/);assert.doesNotMatch(jong,/<img/);assert.deepEqual(hangul(jong),[]);
  const bad=api.strength(factsOf(p,{power:{...calcPower(p),score:calcPower(p).score+1}}),'pig');
  assert.doesNotMatch(bad,/Strength points per character/);assert.match(bad,/saju-gauge--power/);
  assert.equal(api.ilju({p:{}},'pig'),'');assert.equal(api.flow(factsOf(p,{flow:[]}),'pig'),'');
});

test('intl: the two voices read differently and an unlisted locale falls back to the English table',()=>{
  const facts=factsOf(charts[3],{flow}),api=intl.forLang('en');
  for(const s of ['climate','strength','ilju','tenOverview'])assert.notEqual(api[s](facts,'pig').replace(/<[^>]+>/g,''),api[s](facts,'neo').replace(/<[^>]+>/g,''),s);
  assert.equal(intl.forLang('vi').climate(facts,'pig'),intl.forLang('en').climate(facts,'pig'));
  assert.doesNotMatch(api.flow(facts,'pig')+api.daily(dayRow,0,facts,'pig'),/연이|네오/);
});

test('the static shell loads rich → intl → personas in that order, and personas picks the layer per locale',()=>{
  const html=readFileSync('index.html','utf8'),at=name=>html.indexOf('/js/core/saju/'+name+'.js');
  assert.ok(at('reading-rich')>0&&at('reading-rich')<at('reading-rich-intl')&&at('reading-rich-intl')<at('reading-personas'));
  assert.match(readFileSync('js/core/saju/reading-personas.js','utf8'),/SajuReadingRichIntl\.forLang\(lang\)/);
});

test('the intl layer cannot call an LLM, payment, or recalculate a chart',()=>{
  const source=readFileSync('js/core/saju/reading-rich-intl.js','utf8');
  assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|calculate|calcPower|analyzeJohu|evalDaewun|renderDailyMonthlyFortune)\s*\(/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(source,/#[0-9a-f]{3,8}\b/i,'colours come from tokens in CSS');
});
