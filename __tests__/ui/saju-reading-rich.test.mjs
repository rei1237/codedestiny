import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { calcPower, analyzeJohu } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';

// The page globals the display layer reads: engine tables from the static shell, copied as-is.
const engine=readFileSync('js/saju-engine.js','utf8');
const tables=engine.slice(engine.indexOf('var GAN={'),engine.indexOf('/* ─── 십성 DB ─── */'));
const tenGod=engine.slice(engine.indexOf('function getTenGod(dayGan,target){'),engine.indexOf('function parseTimeZoneOffsetName'));
const context=vm.createContext({});
vm.runInContext(tables+tenGod+readFileSync('js/core/saju/reading-rich.js','utf8'),context);
const rich=context.SajuReadingRich;

const stems=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], branches=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
let seed=7;const next=n=>(seed=(seed*1103515245+12345)%2147483648)%n;
const pillar=()=>({g:stems[next(10)],j:branches[next(12)]});
const charts=Array.from({length:60},()=>({y:pillar(),m:pillar(),d:pillar(),h:pillar()}));
const factsOf=(p,extra={})=>({p,johu:analyzeJohu(p),power:calcPower(p),jong:null,unknown:false,...extra});

test('display breakdowns add up to the extracted worker runtime for many charts',()=>{
  for(const p of charts){
    const power=calcPower(p),johu=analyzeJohu(p);
    assert.equal(rich.powerParts(p).total,power.score,JSON.stringify(p));
    assert.ok(rich.johuMatches(rich.johuParts(p),johu),JSON.stringify(p));
    const html=rich.strength(factsOf(p),'pig');
    assert.match(html,/글자별 억부 점수/);
    assert.match(rich.climate(factsOf(p),'pig'),/글자별 온도·습도 기여<\/caption>/);
  }
});

test('a breakdown that disagrees with the engine is hidden, the gauge stays',()=>{
  const p=charts[0];
  const power={...calcPower(p),score:calcPower(p).score+1};
  const strong=rich.strength(factsOf(p,{power}),'pig');
  assert.doesNotMatch(strong,/글자별 억부 점수|득령·득지·득세<\/caption>/);
  assert.match(strong,/saju-gauge--power/);
  const johu={...analyzeJohu(p),dryCnt:analyzeJohu(p).dryCnt+1};
  const climate=rich.climate(factsOf(p,{johu}),'pig');
  assert.doesNotMatch(climate,/글자별 온도·습도 기여<\/caption>/);
  assert.match(climate,/saju-gauge--temp/);
});

test('both personas draw the same numbers in different words, with the old key items kept',()=>{
  const facts=factsOf(charts[3]);
  const pos=html=>html.match(/--pos:[\d.]+%/g);
  for(const section of ['climate','strength']){
    const yeon=rich[section](facts,'pig'),neo=rich[section](facts,'neo');
    assert.deepEqual(pos(yeon),pos(neo));
    assert.notEqual(yeon.replace(/<[^>]+>/g,''),neo.replace(/<[^>]+>/g,''));
    assert.match(yeon,/data-reading-mode="pig"/);assert.match(neo,/data-reading-mode="neo"/);
    assert.doesNotMatch(yeon+neo,/냥|돼지/);
  }
  const climate=rich.climate(facts,'pig');
  for(const item of ['한난조습이란 무엇인가요?','조후 밸런스 처방','개선법','조후 용신과 억부 용신'])assert.ok(climate.includes(item),item);
  const strength=rich.strength(facts,'pig');
  for(const item of ['용신','희신','기신','왜 신','대운 방향 한눈에','득령','억부(抑扶)란 무엇인가요?'])assert.ok(strength.includes(item),item);
});

test('a jong chart is read by its dominant force, and engine strings are escaped',()=>{
  const p=charts[5];
  const jong={isJong:true,name:'종재격',dominant:'earth',pct:72,isGaJong:true,verifiedText:'<img src=x onerror=alert(1)>'};
  const html=rich.strength(factsOf(p,{jong}),'pig');
  assert.match(html,/종격\(從格\)이란/);assert.match(html,/종재격\(從財格\)/);assert.match(html,/가종격/);
  assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});

test('unknown birth time marks the hour rows and keeps the warning',()=>{
  const facts=factsOf(charts[8],{unknown:true,warning:'출생시간 미상: 정오를 대입한 참고 계산입니다.'});
  for(const section of ['climate','strength']){
    const html=rich[section](facts,'pig');
    assert.match(html,/출생시간 미상/);
    assert.match(html,/시간 \(정오 대입\)/);
  }
  assert.doesNotMatch(rich.climate(factsOf(charts[8]),'pig'),/정오 대입|출생시간 미상/);
});

test('the rich layer cannot call an LLM, payment, or recalculate a chart',()=>{
  const source=readFileSync('js/core/saju/reading-rich.js','utf8');
  assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|calculate|calcPower|analyzeJohu|evalDaewun|renderDailyMonthlyFortune)\s*\(/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(source,/#[0-9a-f]{3,8}\b/i,'colours come from tokens in CSS');
});

test('ten gods: the distribution agrees with the card counts, and the modal reads each god in both voices',()=>{
  for(const p of charts.slice(0,20)){
    const ten={};
    [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(ch=>{const g=context.getTenGod(p.d.g,ch);ten[g]=(ten[g]||0)+1;});
    const map=rich.godMap(p,context);
    assert.deepEqual({...map.surface},ten);
    const hiddenTotal=Object.values(map.hidden).reduce((a,b)=>a+b,0);
    assert.equal(hiddenTotal,[p.y.j,p.m.j,p.d.j,p.h.j].reduce((s,j)=>s+context.CD_JANGGAN[j].length,0));
    const facts=factsOf(p,{ten});
    const cards=html=>(html.match(/data-saju-god="([^"]+)"/g)||[]).map(s=>s.slice(15,-1));
    assert.deepEqual(cards(rich.tenCards(facts,'pig')).sort(),Object.keys(ten).sort());
    assert.notEqual(rich.tenCards(facts,'pig'),rich.tenCards(facts,'neo'));
    const overview=rich.tenOverview(facts,'pig');
    assert.match(overview,/십성 분포<\/caption>/);assert.match(overview,/십성\(十星\) 읽는 법/);
    for(const g of Object.keys(ten)){
      const yeon=rich.godDetail(g,facts,'pig'),neo=rich.godDetail(g,facts,'neo');
      assert.match(yeon,/연이의 조언/);assert.match(yeon,/일과 적성/);assert.match(yeon,/당신 원국에서의 자리/);
      assert.match(neo,/네오의 진단/);assert.match(neo,/행동 기준/);
      assert.equal((yeon.match(/<section/g)||[]).length,(neo.match(/<section/g)||[]).length);
      assert.doesNotMatch(yeon+neo,/냥|돼지/);
    }
  }
  assert.equal(rich.godDetail('없는십성',factsOf(charts[0]),'pig'),'');
});

test('ten gods with an unknown birth time mark the hour positions',()=>{
  const p={y:{g:'甲',j:'子'},m:{g:'丙',j:'寅'},d:{g:'甲',j:'午'},h:{g:'甲',j:'戌'}};
  const facts=factsOf(p,{unknown:true,warning:'출생시간 미상'});
  assert.match(rich.tenCards(facts,'pig'),/시간 \(정오 대입\)/);
  assert.match(rich.godDetail('비견',facts,'pig'),/시간 \(정오 대입\)/);
  assert.match(rich.tenOverview(facts,'pig'),/정오를 대입/);
});

test('ilju: the four-pillar table reads hidden stems and twelve stages from the engine tables',()=>{
  for(const p of charts.slice(0,20)){
    const facts=factsOf(p),yeon=rich.ilju(facts,'pig'),neo=rich.ilju(facts,'neo');
    assert.match(yeon,/원국 네 기둥<\/caption>/);
    for(const key of ['y','m','d','h']){
      const j=p[key].j,hidden=context.CD_JANGGAN[j];
      assert.ok(yeon.includes(hidden[hidden.length-1]+'(정기)'),key+j);
      assert.ok(yeon.includes('<td data-label="12운성" role="cell">'+context.cdTwelveStage(p.d.g,j)+'</td>'),key+j);
    }
    for(const b of context.cdGongMangBranches(p.d.g,p.d.j))assert.ok(yeon.includes(b));
    assert.match(yeon,/연이의 한마디/);assert.match(neo,/네오의 한 줄 정리/);
    assert.equal((yeon.match(/<section/g)||[]).length,(neo.match(/<section/g)||[]).length);
    assert.notEqual(yeon.replace(/<[^>]+>/g,''),neo.replace(/<[^>]+>/g,''));
    assert.doesNotMatch(yeon+neo,/냥|돼지/);
  }
});

test('ilju: an unknown birth time blanks the hour pillar and keeps the warning',()=>{
  const p={y:{g:'甲',j:'子'},m:{g:'丙',j:'寅'},d:{g:'庚',j:'午'},h:{g:'癸',j:'未'}};
  const html=rich.ilju(factsOf(p,{unknown:true,warning:'출생시간 미상'}),'pig');
  const hourRow=html.match(/<tr role="row"><th scope="row" role="rowheader">시주 \(미상\)<\/th>.*?<\/tr>/)[0];
  assert.doesNotMatch(hourRow,/癸|未/);
  assert.match(html,/출생시간 미상/);
  assert.equal(rich.ilju({p:{}},'pig'),'');
});

test('flow: the current cycle and year cards show the engine score, ten gods and relations in both voices',()=>{
  const p=charts[2],dg=p.d.g;
  context.GAEUN_DB={wood:{good:{love:'L',wealth:'W',relationship:'R',career:'C'},bad:{love:'l',wealth:'w',relationship:'r',career:'c'}}};
  const flow=[{kind:'period',g:'甲',j:'午',score:72,summary:'🌟 식상 대운',age:31,end:40,relations:[{type:'지충(地支)',src:'午',partner:'子',isChung:true}]},{kind:'year',g:'乙',j:'巳',score:35,summary:'⚠️[충의 부담] 🙂 평운',year:2026,relations:[]}];
  const facts=factsOf(p,{flow});
  const yeon=rich.flow(facts,'pig'),neo=rich.flow(facts,'neo');
  assert.match(yeon,/--pos:72%/);assert.match(yeon,/--pos:35%/);
  assert.deepEqual(yeon.match(/--pos:[\d.]+%/g),neo.match(/--pos:[\d.]+%/g));
  assert.ok(yeon.includes('<td data-label="십성" role="cell">'+context.getTenGod(dg,'甲')+'</td>'));
  assert.ok(yeon.includes('<td data-label="12운성" role="cell">'+context.cdTwelveStage(dg,'午')+'</td>'));
  assert.match(yeon,/31~40세/);assert.match(yeon,/2026년/);assert.match(yeon,/지충\(地支\)/);
  assert.match(yeon,/<b>대인관계<\/b><span>r<\/span>/);assert.match(yeon,/여기까지는 무료/);
  assert.doesNotMatch(yeon+neo,/🌟|⚠️|🙂|냥|돼지/);
  assert.match(neo,/평가 근거: 충의 부담 · 평운\./);assert.match(neo,/평가 근거: 식상\./);assert.doesNotMatch(yeon+neo,/\[충의|엔진/);
  assert.notEqual(yeon.replace(/<[^>]+>/g,''),neo.replace(/<[^>]+>/g,''));
  assert.equal(rich.flow(factsOf(p,{flow:[]}),'pig'),'');
  delete context.GAEUN_DB;
});

test('flow: the neo voice reads NEO_GAEUN_DB, and every neo sentence there ends politely',()=>{
  const p=charts[2],row={kind:'year',g:'乙',j:'巳',score:70,summary:'',year:2026,relations:[]};
  const tile=(db,mode)=>{
    Object.assign(context,db);
    try{return rich.flow(factsOf(p,{flow:[row]}),mode)}finally{for(const k of Object.keys(db))delete context[k]}
  };
  const both={GAEUN_DB:{wood:{good:{love:'기본'}}},NEO_GAEUN_DB:{wood:{good:{love:'네오'}}}};
  assert.match(tile(both,'neo'),/<b>연애운<\/b><span>네오<\/span>/);
  assert.match(tile(both,'pig'),/<b>연애운<\/b><span>기본<\/span>/);
  assert.match(tile({GAEUN_DB:both.GAEUN_DB},'neo'),/<span>기본<\/span>/);
  const start=engine.indexOf('var NEO_GAEUN_DB='),end=engine.indexOf('\n};\n',start);
  const neoDb=vm.runInNewContext('('+engine.slice(start+'var NEO_GAEUN_DB='.length,end+2)+')');
  const sentences=Object.values(neoDb).flatMap(e=>Object.values(e).flatMap(g=>Object.values(g))).flatMap(t=>t.match(/[^.]+\./g));
  assert.equal(sentences.length,120);
  for(const s of sentences)assert.match(s,/(니다|세요|마세요)\.$/,s);
});

test('flow: the tone paragraph follows the score band and appears once when both rows share it',()=>{
  const p=charts[2],row=(kind,score)=>({kind,g:'甲',j:'午',score,summary:'',age:31,end:40,year:2026,relations:[]});
  const zero=rich.flow(factsOf(p,{flow:[row('period',0)]}),'pig');
  assert.match(zero,/조율이 많이 필요한 흐름/);assert.doesNotMatch(zero,/조금 필요|순한 쪽으로 읽혀요/);
  const full=rich.flow(factsOf(p,{flow:[row('period',100)]}),'pig');
  assert.match(full,/아주 순한 흐름/);assert.match(full,/순한 쪽으로 읽혀요/);assert.doesNotMatch(full,/조율이 필요한 쪽/);
  assert.match(rich.flow(factsOf(p,{flow:[row('period',50)]}),'pig'),/보통의 흐름으로 읽혀요/);
  for(const mode of ['pig','neo']){
    const both=rich.flow(factsOf(p,{flow:[row('period',10),row('year',30)]}),mode);
    assert.equal(both.split(mode==='neo'?'평가상 조율 구간입니다':'조율이 필요한 쪽으로 읽혀요').length-1,1,mode);
  }
});

test('daily: the energy gauge, ten-god advice and lucky booster come from the engine result in both voices',()=>{
  const p=charts[4];
  const row={gz:{g:'丙',j:'子'},gGod:'식신',jGod:'정관',gEl:'fire',jEl:'water',batteryPercent:30,grade:'조심 🛡️',luckyEl:'wood',
    lt:{color:'초록',action:'동쪽 방향 외출, 나무·식물과 가까이'},lb:{color:'초록·민트',material:'리넨·코튼',item:'그린 스카프'},
    adviceItems:[{type:'warn',title:'💢 충(沖) — 子午',body:'<b>속도 조절</b>'}]};
  const yeon=rich.daily(row,0,factsOf(p),'pig'),neo=rich.daily(row,1,factsOf(p),'neo');
  assert.match(yeon,/data-reading-mode="pig"/);assert.match(neo,/data-reading-mode="neo"/);
  assert.match(yeon,/--pos:30%/);assert.match(yeon,/에너지 게이지 30% · 조심/);
  assert.match(yeon,/<b>식신<\/b>/);assert.match(yeon,/<b>정관<\/b>/);
  assert.match(yeon,/그린 스카프/);assert.match(yeon,/리넨·코튼/);assert.match(neo,/이달의 월운/);
  assert.match(yeon,/&lt;b&gt;속도 조절/);
  assert.doesNotMatch(yeon+neo,/🛡️|💢|냥|돼지|금지|해라/);
  assert.equal((yeon.match(/<section/g)||[]).length,(neo.match(/<section/g)||[]).length);
  assert.equal(rich.daily({gz:{g:'丙',j:'子'}},0,factsOf(p),'pig'),'');
});

test('climate base follows the month branch (12 steps) and the worker policy copy agrees',async()=>{
  const {analyzeJohu:policyJohu}=await import('../../worker/lib/saju-yongshin-policy.js');
  const p={y:{g:'辛',j:'未'},m:{g:'庚',j:'寅'},d:{g:'辛',j:'酉'},h:{g:'壬',j:'辰'}};
  const j=analyzeJohu(p);
  assert.equal(j.score,-4);assert.equal(j.type,'cool');
  const EL={甲:'wood',乙:'wood',丙:'fire',丁:'fire',戊:'earth',己:'earth',庚:'metal',辛:'metal',壬:'water',癸:'water',
    寅:'wood',卯:'wood',巳:'fire',午:'fire',辰:'earth',戌:'earth',丑:'earth',未:'earth',申:'metal',酉:'metal',亥:'water',子:'water'};
  const toPolicy=c=>({stemElement:EL[c.g],branch:c.j,branchElement:EL[c.j]});
  for(const b of branches){
    const q={...p,m:{g:'庚',j:b}};
    const w=policyJohu({year:toPolicy(q.y),month:toPolicy(q.m),day:toPolicy(q.d),hour:toPolicy(q.h)});
    assert.equal(w.score,analyzeJohu(q).score,b);
  }
});
