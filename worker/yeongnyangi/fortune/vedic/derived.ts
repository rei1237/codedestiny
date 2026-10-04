/**
 * 베다(조티샤) 파생 근거 — 품위 정밀화(물라트리코나), 고전 요가의 성립 조건, 건강(1·6·8·12하우스 주인).
 *
 * 🔴 엔진 출력(worker/lib/vedic-ai-chart.js)은 바꾸지 않는다. 영냥이 저장 context 에서만 다듬고 더한다.
 * 🔴 결정적이다. 요가는 성립 조건을 함께 싣고, 힘이 약해지는 조건이 있으면 부분 성립(partial),
 *    상쇄 조건이 있으면 상쇄(cancelled)로 적는다. 조건이 없으면 싣지 않는다.
 * 🔴 요가는 기존 yogas 사실에 덧붙여 단계 필터(PREMIUM_LABEL·PREMIUM_KEY)로 참치에만 남는다.
 * 🔴 건강은 의학 판단이 아니다. 질병명 없이 생활 리듬·컨디션 관리의 조건으로만 쓰고 고지문을 싣는다. 수명은 다루지 않는다.
 */
import {GRAHA_KO,SIGN_LORDS,SIGNS} from '../../../lib/vedic-derived-calculations.js';

export const VEDIC_DERIVED_VERSION='vedic-derived-20261004-v1';
export const VEDIC_HEALTH_DISCLAIMER='베다 차트의 1·6·8·12하우스와 그 주인으로 생활 리듬과 컨디션 흐름을 살핀 운세 콘텐츠입니다. 의학적 진단이나 치료를 대체하지 않으며, 실제 건강 문제가 있거나 지속적인 통증·불편감이 있다면 반드시 전문 의료진과 상담하세요.';
/** 파생 요가 이름 → 원장 slug. 엔진 요가의 slug 는 reading-v7-ledger.ts YOGA_SLUGS 가 가진다. */
export const VEDIC_YOGA_SLUGS:Record<string,string>={
 'Ruchaka Yoga':'ruchaka','Bhadra Yoga':'bhadra','Hamsa Yoga':'hamsa','Malavya Yoga':'malavya','Sasa Yoga':'sasa',
 'Budhaditya Yoga':'budhaditya','Kemadruma Yoga':'kemadruma','Harsha Yoga':'harsha','Sarala Yoga':'sarala','Vimala Yoga':'vimala',
 'Neecha Bhanga Raja Yoga':'neechaBhanga','Raja Yoga':'raja',
};

type O=Record<string,any>;
const KENDRA=[1,4,7,10],DUSTHANA=[6,8,12];
const STARS=['Mars','Mercury','Jupiter','Venus','Saturn'];
const EXALTATION:Record<string,string>={Sun:'Aries',Moon:'Taurus',Mars:'Capricorn',Mercury:'Virgo',Jupiter:'Cancer',Venus:'Pisces',Saturn:'Libra'};
// BPHS 물라트리코나: [별자리, 시작 도수 이상, 끝 도수 미만]. 달·수성은 고양과 같은 별자리라 도수로 가른다.
const MOOLATRIKONA:Record<string,[string,number,number]>={Sun:['Leo',0,20],Moon:['Taurus',3,30],Mars:['Aries',0,12],Mercury:['Virgo',15,20],Jupiter:['Sagittarius',0,10],Venus:['Libra',0,15],Saturn:['Aquarius',0,20]};
const DIGNITY_KO:Record<string,string>={exalted:'높은 품위(고양)',moolatrikona:'물라트리코나 품위','own sign':'자기 별자리','friendly sign':'우호 별자리',neutral:'중립 별자리','enemy sign':'적대 별자리',debilitated:'낮은 품위(데빌리테이션)'};
const strong=(d:string)=>d==='exalted'||d==='moolatrikona'||d==='own sign';

const valid=(v:unknown):O[]=>Array.isArray(v)?v.filter(p=>p&&typeof p==='object'):[];
const ko=(name:string)=>(GRAHA_KO as Record<string,string>)[name]||name;
const final=(word:string)=>{const c=word.trim().slice(-1).charCodeAt(0)-0xAC00;return c>=0&&c<11172?c%28:0;};
const iga=(w:string)=>`${w}${final(w)?'이':'가'}`;
const signIdx=(p:O|undefined)=>Number.isInteger(p?.signIndex)?p!.signIndex as number:SIGNS.indexOf(p?.sign);
/** 같은 별자리를 0 으로 센 b 의 a 기준 칸(1~12). */
const fromSign=(a:number,b:number)=>((b-a+12)%12)+1;

/** 엔진 품위에 물라트리코나를 더한다. 달(황소 3도~)·수성(처녀 15~20도 물라트리코나, 20도~ 자기 별자리)은 도수로 고친다. */
export function refinedVedicDignity(p:O):string{
 const name=String(p?.name??p?.nameEn??''),sign=String(p?.sign??p?.rashi??''),deg=Number(p?.degree??p?.degreeInRashi);
 const mt=MOOLATRIKONA[name];
 if(mt&&sign===mt[0]&&deg>=mt[1]&&deg<mt[2])return 'moolatrikona';
 if(name==='Mercury'&&sign==='Virgo'&&deg>=20)return 'own sign';
 return typeof p?.dignity==='string'?p.dignity:'';
}
/** planets·grahas 행의 dignity 를 정밀화한다. 다른 필드는 그대로 둔다. */
export const refineVedicRows=(rows:unknown)=>Array.isArray(rows)?rows.map(r=>r&&typeof r==='object'?{...r,dignity:refinedVedicDignity(r)}:r):rows;

const houseOf=(houses:O[],n:number)=>houses.find(h=>Number(h.house)===n);
const lordOf=(houses:O[],planets:O[],n:number)=>planets.find(p=>p.name===houseOf(houses,n)?.lord);
const kendraFrom=(base:number,p:O|undefined)=>!!p&&base>=0&&KENDRA.includes(fromSign(base,signIdx(p)));

const MAHAPURUSHA:Record<string,[string,string,string]>={
 Mars:['Ruchaka Yoga','루차카 요가','추진력과 결단이 사회적 자리에서 드러나는 구조'],
 Mercury:['Bhadra Yoga','바드라 요가','말과 분석, 실무 감각이 자리를 만드는 구조'],
 Jupiter:['Hamsa Yoga','함사 요가','판단의 품격과 신뢰가 사람을 모으는 구조'],
 Venus:['Malavya Yoga','말라비아 요가','감각과 조화, 관계의 매력이 기회를 여는 구조'],
 Saturn:['Sasa Yoga','사사 요가','버티는 힘과 체계가 오래 가는 자리를 만드는 구조'],
};
const VIPARITA:Record<number,[string,string,string]>={
 6:['Harsha Yoga','하르샤 요가','경쟁과 무리를 견디는 힘이 커서 어려움을 이겨 내며 자리를 잡는 구조'],
 8:['Sarala Yoga','사랄라 요가','위기와 변화 앞에서 오래 버티며 끝내 정리해 내는 구조'],
 12:['Vimala Yoga','비말라 요가','쓸 곳과 놓아줄 곳을 가려 소모를 실속으로 바꾸는 구조'],
};

/**
 * 엔진이 보지 않는 고전 요가. 라그나가 없으면(출생 시각 없음) 하우스가 필요한 요가는 건너뛰고
 * 별자리만으로 판정되는 요가(부다디트야·케마드루마, 달 기준 니차 방가)만 본다.
 */
export function buildVedicYogas(planets:unknown,houses:unknown):O[]{
 const ps=valid(planets).map((p):O=>({...p,dignity:refinedVedicDignity(p)})),hs=valid(houses);
 const by=(n:string)=>ps.find(p=>p.name===n);
 const sun=by('Sun'),moon=by('Moon'),moonSign=signIdx(moon);
 const lagna=hs.length?SIGNS.indexOf(houseOf(hs,1)?.sign):-1;
 const yogas:O[]=[];
 // 1. 판차 마하푸루샤: 다섯 행성이 자기 별자리·고양·물라트리코나로 켄드라(1·4·7·10하우스)에 있다.
 if(lagna>=0)for(const name of STARS){
  const p=by(name);
  if(!p||!KENDRA.includes(Number(p.house))||!strong(p.dignity))continue;
  const [en,nameKo,meaning]=MAHAPURUSHA[name];
  const conditions=[`${iga(ko(name))} ${p.house}하우스(켄드라)에 있다`,`${iga(ko(name))} ${DIGNITY_KO[p.dignity]}에 있다`];
  if(p.combust)conditions.push(`${iga(ko(name))} 태양에 가까워 연소 — 힘이 약해져 부분 성립`);
  yogas.push({name:en,nameKo,planets:[name],meaning,status:p.combust?'partial':'full',conditions});
 }
 // 2. 부다디트야: 태양과 수성이 같은 별자리. 수성이 연소 범위면 부분 성립.
 const mercury=by('Mercury');
 if(sun&&mercury&&signIdx(sun)>=0&&signIdx(sun)===signIdx(mercury)){
  yogas.push({name:'Budhaditya Yoga',nameKo:'부다디트야 요가',planets:['Sun','Mercury'],
   meaning:'판단과 말이 또렷해 배움·기획·설명하는 일에서 이름이 나기 쉬운 구조',status:mercury.combust?'partial':'full',
   conditions:[`태양과 수성이 같은 별자리(${sun.signKo||sun.sign})에 있다`,mercury.combust?'수성이 태양에 너무 가까워 연소 — 부분 성립':'수성이 연소 범위 밖이다']});
 }
 // 3. 케마드루마: 달의 앞뒤 별자리(2·12번째)에 다섯 행성이 하나도 없다. 달과 같은 별자리·달의 켄드라에 행성이 있거나
 //    목성이 달을 보면 상쇄된다.
 if(moon&&moonSign>=0){
  const at=(offset:number)=>ps.filter(p=>STARS.includes(p.name)&&signIdx(p)===(moonSign+offset)%12);
  if(!at(1).length&&!at(11).length){
   const kendra=ps.filter(p=>STARS.includes(p.name)&&KENDRA.includes(fromSign(moonSign,signIdx(p))));
   const jupiter=by('Jupiter'),jupiterSees=!!jupiter&&[5,7,9].includes(fromSign(signIdx(jupiter),moonSign));
   const conditions=['달의 앞뒤 별자리에 화성·수성·목성·금성·토성이 하나도 없다'];
   if(kendra.length)conditions.push(`달의 켄드라(같은 별자리 포함)에 ${kendra.map(p=>ko(p.name)).join('·')} — 상쇄된다`);
   if(jupiterSees)conditions.push('목성이 달을 바라봐 상쇄된다');
   const cancelled=kendra.length>0||jupiterSees;
   yogas.push({name:'Kemadruma Yoga',nameKo:'케마드루마 요가',planets:['Moon'],
    meaning:'마음을 받쳐 줄 주변 기운이 비어 혼자 버티는 시기가 생기기 쉬운 구조 — 그런 때일수록 도움을 청하는 습관이 관리 포인트다',
    status:cancelled?'cancelled':'full',conditions});
  }
 }
 // 4. 비파리타 라자: 6·8·12하우스 주인이 6·8·12하우스에 있다. 그 주인이 1하우스도 다스리면 부분 성립.
 if(lagna>=0)for(const n of DUSTHANA){
  const lord=lordOf(hs,ps,n);
  if(!lord||!DUSTHANA.includes(Number(lord.house)))continue;
  const [en,nameKo,meaning]=VIPARITA[n];
  const alsoLagna=houseOf(hs,1)?.lord===lord.name;
  const conditions=[`${n}하우스 주인 ${iga(ko(lord.name))} ${lord.house}하우스에 있다`];
  if(alsoLagna)conditions.push(`${ko(lord.name)}은 1하우스 주인이기도 해 자기 기운도 함께 눌려 부분 성립`);
  yogas.push({name:en,nameKo,planets:[lord.name],meaning,status:alsoLagna?'partial':'full',conditions});
 }
 // 5. 니차 방가 라자: 낮은 품위의 행성에 대해, 그 별자리의 주인이나 그 별자리에서 고양되는 행성이 라그나나 달의 켄드라에 있다.
 const cancels:O[]=[];
 for(const p of ps.filter(p=>p.dignity==='debilitated'&&EXALTATION[p.name])){
  const sign=signIdx(p),dispositor=by(SIGN_LORDS[sign]);
  const exaltLord=by(Object.keys(EXALTATION).find(n=>EXALTATION[n]===SIGNS[sign])||'');
  const reasons:string[]=[];
  const where=p.signKo||SIGNS[sign];
  for(const [helper,role] of [[dispositor,`${where}의 주인`],[exaltLord,`${where}에서 고양되는 행성`]] as [O|undefined,string][]){
   if(!helper||helper.name===p.name)continue;
   const fromLagna=lagna>=0&&KENDRA.includes(Number(helper.house)),fromMoon=kendraFrom(moonSign,helper)&&helper.name!=='Moon';
   if(fromLagna||fromMoon)reasons.push(`${role} ${iga(ko(helper.name))} ${fromLagna?'라그나':'달'}의 켄드라에 있다`);
  }
  if(reasons.length)cancels.push({planet:p.name,where,reasons});
 }
 if(cancels.length)yogas.push({name:'Neecha Bhanga Raja Yoga',nameKo:'니차 방가 라자 요가',planets:cancels.map(c=>c.planet),
  meaning:'약한 자리의 행성이 다른 행성의 도움으로 일어서는 구조 — 처음의 서툶이 나중의 강점이 되기 쉽다',status:'full',
  conditions:cancels.flatMap(c=>[`${iga(ko(c.planet))} 낮은 품위(${c.where})에 있다`,...c.reasons])});
 // 6. 라자: 켄드라 주인과 트리코나 주인이 같은 하우스에 있거나 별자리를 맞바꾼다. 한 행성이 켄드라·트리코나를 함께 다스리면 요가카라카.
 //    6·8·12하우스에서 맺히거나 연소된 행성이 끼면 부분 성립.
 if(lagna>=0){
  const kendraLords=[1,4,7,10].map(n=>({n,lord:houseOf(hs,n)?.lord as string})).filter(x=>x.lord);
  const trikonaLords=[1,5,9].map(n=>({n,lord:houseOf(hs,n)?.lord as string})).filter(x=>x.lord);
  const combos:O[]=[],seen=new Set<string>();
  for(const k of kendraLords)for(const t of trikonaLords){
   if(k.lord===t.lord){
    if(k.n===1||t.n===1)continue;
    const p=by(k.lord);if(!p)continue;
    // 요가카라카는 켄드라·트리코나에 낮은 품위 없이 앉을 때만 라자 요가로 센다(그렇지 않으면 차트 절반이 성립한다).
    const key=`karaka:${p.name}`;if(seen.has(key)||![1,4,5,7,9,10].includes(Number(p.house))||p.dignity==='debilitated')continue;seen.add(key);
    const weak=!!p.combust;
    combos.push({kind:'yogakaraka',planets:[p.name],houses:[k.n,t.n],weak,text:`${iga(ko(p.name))} ${k.n}하우스와 ${t.n}하우스를 함께 다스리는 요가카라카로 ${p.house}하우스에 있다${weak?' — 연소되어 부분 성립':''}`});
    continue;
   }
   const a=by(k.lord),b=by(t.lord);if(!a||!b)continue;
   const key=[a.name,b.name].sort().join('+');if(seen.has(key))continue;
   const together=a.house===b.house&&Number.isInteger(a.house);
   const exchange=SIGN_LORDS[signIdx(a)]===b.name&&SIGN_LORDS[signIdx(b)]===a.name;
   if(!together&&!exchange)continue;
   seen.add(key);
   const weak=(together&&DUSTHANA.includes(Number(a.house)))||!!a.combust||!!b.combust;
   const how=together?`${a.house}하우스에 함께 있다`:'서로의 별자리를 맞바꾼다';
   combos.push({kind:together?'conjunction':'exchange',planets:[a.name,b.name],houses:[k.n,t.n],weak,
    text:`${k.n}하우스 주인 ${ko(a.name)}과 ${t.n}하우스 주인 ${iga(ko(b.name))} ${how}${weak?' — 약해지는 조건이 있어 부분 성립':''}`});
  }
  if(combos.length)yogas.push({name:'Raja Yoga',nameKo:'라자 요가',planets:[...new Set(combos.flatMap(c=>c.planets))],
   meaning:'방향(켄드라)과 복(트리코나)을 다스리는 행성이 이어져 역할과 인정이 따라오기 쉬운 구조',
   status:combos.some(c=>!c.weak)?'full':'partial',
   combinations:combos.map(({text:_t,...c})=>c),conditions:combos.map(c=>c.text)});
 }
 return yogas;
}

const ROLE:Record<number,string>={1:'기본 체력과 회복력',6:'일상의 무리와 회복 습관',8:'오래 쌓이는 피로와 회복 속도',12:'잠과 쉼, 소모'};
const PULL:Record<number,string>={6:'일·경쟁·잡무',8:'오래 쌓이는 긴장',12:'소모와 늦은 생활'};
const MALEFIC=['Sun','Mars','Saturn','Rahu','Ketu'];
const TEMPER:Record<string,string>={Sun:'몸을 달구는 과열',Mars:'열이 오르고 페이스가 급해지는 경향',Saturn:'몸이 굳고 회복이 느린 경향',Rahu:'생활 리듬이 불규칙해지는 경향',Ketu:'몸의 신호에 예민했다 무심했다 하는 기복'};

/** 1·6·8·12하우스 주인의 자리·품위·연소, 그 하우스의 흉성, 달의 밝기로 생활 리듬과 컨디션 관리의 조건을 적는다. */
export function buildVedicHealthBasis(planets:unknown,houses:unknown):O{
 const ps=valid(planets).map((p):O=>({...p,dignity:refinedVedicDignity(p)})),hs=valid(houses);
 const by=(n:string)=>ps.find(p=>p.name===n);
 const links:string[]=[];
 const lords=hs.length?[1,6,8,12].map(n=>{
  const lord=lordOf(hs,ps,n);
  return {house:n,role:ROLE[n],lord:houseOf(hs,n)?.lord??null,placedHouse:lord?.house??null,sign:lord?.sign??null,
   dignity:lord?.dignity??'',combust:!!lord?.combust,retrograde:!!lord?.retrograde};
 }):[];
 for(const row of lords){
  const name=ko(String(row.lord||'')),at=Number(row.placedHouse);
  if(!row.lord||!at)continue;
  if(row.house===1){
   if(strong(row.dignity))links.push(`1하우스 주인 ${iga(name)} ${DIGNITY_KO[row.dignity]}에 있다 — 기본 체력과 회복력이 받쳐 주는 조건이다.`);
   if(row.dignity==='debilitated')links.push(`1하우스 주인 ${iga(name)} ${DIGNITY_KO.debilitated}에 있다 — 컨디션이 한번 무너지면 회복에 시간이 걸리기 쉬워 생활 리듬을 먼저 지킨다.`);
   if(DUSTHANA.includes(at))links.push(`1하우스 주인 ${iga(name)} ${at}하우스에 있다 — ${PULL[at]} 쪽으로 기운이 끌려가기 쉬운 조건이다.`);
   if(row.combust)links.push(`1하우스 주인 ${iga(name)} 태양에 가려 연소된다 — 무리를 늦게 알아차리기 쉬우니 피로 신호를 미리 정해 둔다.`);
   continue;
  }
  if(at===1)links.push(`${row.house}하우스 주인 ${iga(name)} 1하우스에 있다 — ${{6:'일상의 무리가 곧바로 몸의 컨디션으로 드러나는',8:'피로가 오래 쌓였다가 한꺼번에 드러나기 쉬운',12:'잠과 쉼이 모자라면 바로 기운이 빠지는'}[row.house as 6|8|12]} 조건이다.`);
  else if(DUSTHANA.includes(at))links.push(`${row.house}하우스 주인 ${iga(name)} ${at}하우스에 있다 — ${{6:'무리와 경쟁을 견디는 힘(하르샤 조건)이 있어 회복 습관만 지키면 버티는 힘이 크다',8:'긴장을 오래 끌지 않고 정리하는 힘(사랄라 조건)이 있다',12:'소모를 줄이고 쉼을 실속 있게 쓰는 힘(비말라 조건)이 있다'}[row.house as 6|8|12]}.`);
 }
 const occupants=hs.length?[1,6,8,12].map(n=>({house:n,planets:ps.filter(p=>Number(p.house)===n).map(p=>p.name as string)})).filter(o=>o.planets.length):[];
 for(const {house,planets:names} of occupants){
  const malefics=names.filter(n=>MALEFIC.includes(n));
  if(house===6&&malefics.length)links.push(`6하우스의 ${malefics.map(ko).join('·')} — 일상의 무리를 이겨 내는 힘(우파차야)이다.`);
  if(house===1)for(const n of malefics)links.push(`1하우스에 ${ko(n)} — ${TEMPER[n]}이 있어 페이스 조절이 관리 포인트다.`);
  if(house===1&&names.includes('Jupiter'))links.push('1하우스에 목성 — 회복력을 받쳐 주는 조건이다.');
  if(house===8&&malefics.length)links.push(`8하우스에 ${malefics.map(ko).join('·')} — 긴장이 몸에 오래 남는 조건이라 푸는 시간을 따로 둔다.`);
  if(house===12&&malefics.length)links.push(`12하우스에 ${malefics.map(ko).join('·')} — 잠과 쉼이 소모되기 쉬운 조건이다.`);
 }
 const sun=by('Sun'),moon=by('Moon');
 let moonRow:O|null=null;
 if(moon){
  const elongation=Number.isFinite(Number(moon.longitude))&&Number.isFinite(Number(sun?.longitude))?((Number(moon.longitude)-Number(sun!.longitude))%360+360)%360:null;
  const phase=elongation==null?null:elongation<180?'waxing':'waning';
  const dark=elongation!=null&&Math.min(elongation,360-elongation)<72;
  moonRow={sign:moon.sign??null,house:moon.house??null,dignity:moon.dignity,phase,dark};
  const weakSpot=moon.dignity==='debilitated'?DIGNITY_KO.debilitated:DUSTHANA.includes(Number(moon.house))?`${moon.house}하우스`:'';
  if(weakSpot)links.push(`달이 ${weakSpot}에 있다 — 감정의 피로가 몸으로 번지기 쉬워 수면 리듬이 관리 포인트다.`);
  if(dark)links.push('달이 태양에 가까운 어두운 달이다 — 마음의 기운이 쉽게 가라앉아 쉼의 리듬을 일정하게 둔다.');
  else if(strong(moon.dignity)&&elongation!=null)links.push(`달이 ${DIGNITY_KO[moon.dignity]}에 있는 밝은 달이다 — 마음의 회복력이 몸을 받쳐 주는 조건이다.`);
 }
 if(!links.length)links.push(hs.length?'1·6·8·12하우스 주인과 그 자리에 두드러진 연결이 없다 — 건강은 6하우스의 기본 결로만 읽는다.':'두드러진 연결이 없다 — 건강은 달의 기본 결로만 읽는다.');
 return {
  version:VEDIC_DERIVED_VERSION,lords,occupants,moon:moonRow,links,
  rule:'1·6·8·12하우스 주인의 자리·품위·연소와 그 하우스에 든 행성, 달의 밝기로 생활 리듬과 컨디션 관리의 조건만 읽는다. 진단하지 않는다.',
  ...(hs.length?{}:{limitation:'출생 시각을 몰라 라그나와 하우스 주인을 정할 수 없다 — 건강은 달의 상태로만 읽는다.'}),
  disclaimer:VEDIC_HEALTH_DISCLAIMER,
 };
}
