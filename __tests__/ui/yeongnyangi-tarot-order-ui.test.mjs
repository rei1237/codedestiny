import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {getYeongnyangiSpread} from '../../lib/tarot/yeongnyangi-spread-catalog.mjs';

// v3 Korean tarot order: question → spread → optional inputs → pick before checkout. Mock only; no API is called.
const require=createRequire(import.meta.url),Module=require('node:module');
const read=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');
async function load(entry){
 const bundle=await build({stdin:{contents:`export * from '${entry}';export {default} from '${entry}';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime','react-dom']});
 const loaded=new Module(path.resolve(`${path.basename(entry)}-tests.cjs`));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
 return loaded.exports;
}
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const planner=await load('./app/yeongnyangi/_components/tarot/TarotSpreadPlanner');
const layout=await load('./app/yeongnyangi/_components/tarot/TarotSpreadLayout');
const pick=await load('./app/yeongnyangi/_components/tarot/TarotCardPick');
const reveal=await load('./app/yeongnyangi/_components/tarot/TarotSpreadReveal');
const plan=(over={})=>({...planner.emptyTarotPlan,...over});

test('the planned spread follows the recommendation inside the tier unless the buyer picked one',()=>{
 const question='지금 회사에 남을까, 이직할까?';
 assert.equal(planner.plannedSpread(plan(),question,'tuna').id,'yn_stay_leave_nine');
 assert.equal(planner.plannedSpread(plan(),question,'salmon').id,'yn_ab_seven','the recommendation never upsells past the selected tier');
 assert.equal(planner.plannedSpread(plan(),'','mackerel').id,'yn_knot_three','no question yet keeps a safe default');
 assert.equal(planner.plannedSpread(plan({spreadId:'trad_celtic_cross_ten',manual:true}),question,'mackerel').id,'trad_celtic_cross_ten');
 assert.equal(planner.plannedSpread(plan({spreadId:'nope',manual:true}),question,'tuna').id,'yn_knot_three');
 const twice=[0,1].map(()=>planner.plannedSpread(plan({presetId:'contact_first'}),'내가 먼저 연락해도 괜찮을까?','tuna').id);
 assert.equal(twice[0],twice[1]);
});

test('only inputs the spread uses are sent, and a stored draft is sanitised',()=>{
 const ab=getYeongnyangiSpread('yn_ab_seven'),knot=getYeongnyangiSpread('yn_knot_three'),contact=getYeongnyangiSpread('yn_contact_first');
 const full=plan({options:{a:' 지금 회사 ',b:'새 회사'},period:'month',relationStatus:'no_contact'});
 assert.deepEqual(planner.plannedInputs(full,ab),{options:{a:'지금 회사',b:'새 회사'}});
 assert.deepEqual(planner.plannedInputs(full,knot),{});
 assert.deepEqual(planner.plannedInputs(full,contact),{relationStatus:'no_contact'});
 assert.deepEqual(planner.plannedInputs(plan({options:{a:'A만',b:' '}}),ab),{},'one empty option sends neither');
 assert.deepEqual(planner.restoreTarotPlan({presetId:'job_change',spreadId:'yn_ab_seven',manual:true,options:{a:'x'.repeat(90),b:3},period:'year',relationStatus:'married',extra:'birthDate'}),
  {presetId:'job_change',spreadId:'yn_ab_seven',manual:true,options:{a:'x'.repeat(40),b:''},period:'',relationStatus:'married'});
 assert.deepEqual(planner.restoreTarotPlan({presetId:'evil',spreadId:'__proto__',manual:true,period:'toString'}),planner.emptyTarotPlan);
 assert.deepEqual(planner.restoreTarotPlan(null),planner.emptyTarotPlan);
});

test('the order form shows presets, a reason, direct choice and only the inputs this spread needs',()=>{
 const render=(props)=>renderToStaticMarkup(React.createElement(planner.default,{question:'',onQuestion(){},plan:planner.emptyTarotPlan,onPlan(){},tier:'tuna',onTier(){},...props}));
 const empty=render({});
 assert.equal((empty.match(/aria-pressed="false"/g)||[]).length>=9,true);
 assert.match(empty,/스프레드 직접 선택/);assert.match(empty,/영냥이 배열/);assert.match(empty,/전통 배열/);
 assert.doesNotMatch(empty,/생년월일을 (입력|알려)|상대(의|방) (이름|연락처)을 (입력|알려)/);
 const compare=render({question:'지금 회사에 남을까, 이직할까?',plan:plan({spreadId:'yn_ab_seven',manual:true})});
 assert.match(compare,/선택지 A/);assert.doesNotMatch(compare,/지금 관계/);
 const love=render({question:'내가 먼저 연락해도 괜찮을까?',plan:plan({presetId:'contact_first'})});
 assert.match(love,/지금 관계/);assert.match(love,/말하지 않을래요/);assert.doesNotMatch(love,/선택지 A/);
 const month=render({question:'앞으로 한 달, 어디에 힘을 써야 할까?',plan:plan({presetId:'month'})});
 assert.doesNotMatch(month,/살펴볼 기간/,'a period already in the question is not asked again');
});

test('the spread map rotates only a reversed card picture and numbers slots by the chosen order',()=>{
 const spread=getYeongnyangiSpread('trad_celtic_cross_ten');
 const ids=spread.positions.map(p=>p.id);
 const html=renderToStaticMarkup(React.createElement(layout.default,{spread,size:'full',cards:{[ids[0]]:{cardCode:'M00',reversed:true,open:true},[ids[1]]:{open:false}}}));
 assert.equal((html.match(/data-reversed="true"/g)||[]).length,1);
 assert.equal((html.match(/data-cross="true"/g)||[]).length,1);
 assert.match(html,/역방향/);assert.match(html,/tarot\/v1\/M00-/,'an open card shows its face');
 const draw=renderToStaticMarkup(React.createElement(layout.default,{spread,numbering:'draw',list:false}));
 assert.doesNotMatch(draw,/<ol/);
});

test('the pick screen offers 78 face-down cards and never renders a card face before the draw',()=>{
 const base=getYeongnyangiSpread('yn_knot_three');
 const spread={...base,positions:base.positions.map(({id,label,question,drawOrder,readOrder})=>({id,label,question,drawOrder,readOrder})),source:base.source.kind,deckSize:78,drawn:false};
 const row={id:'a'.repeat(64),state:'AWAITING_DRAW',paid:false,product:{}};
 const html=renderToStaticMarkup(React.createElement(pick.default,{row,spread,siteLocale:'ko',onRow(){}}));
 assert.equal((html.match(/번째 엎어 둔 카드/g)||[]).length,78);
 assert.match(html,/영냥이에게 맡기기/);assert.match(html,/이 카드로 정하고 결제하기/);
 assert.doesNotMatch(html,/tarot\/v1\/[A-Z]\d/,'no face image path before the draw');
});

test('consultation and result route a v3 order through the pick before checkout',()=>{
 const form=read('app/yeongnyangi/_components/Consultation.tsx');
 const result=read('app/yeongnyangi/_components/Result.tsx');
 const pickSource=read('app/yeongnyangi/_components/tarot/TarotCardPick.tsx');
 const css=read('app/yeongnyangi/_components/tarot/tarot-spread.module.css');
 assert.match(form,/tarotSpreadId:tarotSpread\.id,tarotInputs:plannedInputs\(tarotPlan,tarotSpread\)/);
 assert.match(form,/data\.fortune\.state==='AWAITING_DRAW'\?resultPath/);
 assert.match(form,/disabled=\{!!tarotSpread&&!tierAllowsSpread\(item\.fishId,tarotSpread\)\}/);
 assert.match(result,/fortune\.state!=='AWAITING_DRAW'\)\{/,'no payment attach while the pick is pending');
 assert.match(result,/row\.state==='AWAITING_DRAW' \|\| !payWatching/);
 assert.match(result,/row\.state==='AWAITING_DRAW'&&row\.tarotSpread\?<TarotCardPick/);
 assert.match(pickSource,/requests\/\$\{row\.id\}\/tarot-draw/);
 assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b|rgba?\(/,'colours come only from --yn-* tokens');
 assert.doesNotMatch(css,/\bdark:/);
});

test('the finished reading shows the stored spread with every card open, the period and the A/B labels',()=>{
 const base=getYeongnyangiSpread('yn_ab_seven');
 const spread={...base,source:base.source.kind,deckSize:78,drawn:true,inputs:{period:'month',options:{a:'지금 회사',b:'새 회사'}}};
 const codes=['M00','M01','C02','P03','S04','W05','M10'];
 const chart={domain:'tarot',title:'',source:'',limitations:[],groups:[{label:'요약',items:[]},...base.positions.map((p,i)=>({label:p.label,items:[],positionKey:p.id,cardCode:codes[i],reversed:i===2}))]};
 const cards=reveal.spreadCards(spread,chart);
 assert.equal(Object.keys(cards).length,7);assert.deepEqual(cards[base.positions[2].id],{cardCode:'C02',reversed:true});
 assert.equal(reveal.spreadCards(spread,{...chart,groups:chart.groups.slice(0,4)}),undefined,'a missing position never draws a partial map');
 assert.equal(reveal.spreadCards(spread,undefined),undefined);
 const html=renderToStaticMarkup(React.createElement(reveal.TarotSpreadResult,{spread,cards}));
 assert.match(html,/이번 상담의 카드 배열/);assert.match(html,/지금 회사/);assert.match(html,/한 달/);
 assert.equal((html.match(/tarot\/v1\/[A-Z]\d+-/g)||[]).length>=7,true);
 assert.equal((html.match(/data-reversed="true"/g)||[]).length,1);
 assert.doesNotMatch(renderToStaticMarkup(React.createElement(reveal.TarotSpreadResult,{spread:{...spread,inputs:undefined},cards})),/지금 회사|살펴본 기간/);
});

test('after payment a v3 order reveals on its own layout, the map follows the core answer, and share/report never read the inputs',()=>{
 const result=read('app/yeongnyangi/_components/Result.tsx'),book=read('app/yeongnyangi/_components/ReadingBook.tsx');
 const reveal=result.match(/row\.tarotSpread&&spreadReveal\?<TarotSpreadReveal\b([^<>]*?)\/>/);
 assert.ok(reveal,'saved v3 spreads use their own reveal');
 assert.match(reveal[1],/requestId=\{row\.id\}/);
 assert.match(reveal[1],/locale=\{row\.locale\}/,'reveal uses the saved purchase language');
 assert.match(result,/:<TarotDrawRitual requestId=\{row\.id\} chart=\{tarotChart\}/,'v2 keeps its ritual');
 assert.match(book,/index===0&&row\.tarotSpread&&spreadMap&&<TarotSpreadResult/);
 for(const file of ['app/yeongnyangi/_lib/summary-report.ts','app/yeongnyangi/_lib/result-share.ts','worker/yeongnyangi/report-share.js'])
  assert.doesNotMatch(read(file),/tarotSpread|tarotInputs|relationStatus/,file);
});
