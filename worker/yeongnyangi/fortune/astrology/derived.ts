// Astrology derived facts for Yeongnyangi (deterministic, no LLM). The shared engine (swiss-ephemeris.js) return value
// stays untouched; these are added to the Yeongnyangi context only. Traditional seven-planet rulership: essential dignity
// (domicile·exaltation·detriment·fall), sect (day·night), the 1·6·7·10 house rulers and where they sit, element·mode
// balance, and a health basis from the 1·6 rulers with Mars·Moon·Saturn. Uranus·Neptune·Pluto never rule a house here.
export const ASTROLOGY_DERIVED_VERSION='astrology-derived-20261004-v1';
export const ASTROLOGY_HEALTH_DISCLAIMER='서양 점성술 출생 차트의 1·6하우스 주인과 화성·달·토성의 상태로 생활 리듬과 컨디션 흐름을 살핀 운세 콘텐츠입니다. 의학적 진단이나 치료를 대체하지 않으며, 실제 건강 문제가 있거나 지속적인 통증·불편감이 있다면 반드시 전문 의료진과 상담하세요.';

type O=Record<string,any>;
export type AstroDignity='domicile'|'exaltation'|'detriment'|'fall'|'peregrine';
const SIGN_KO=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];
const RULER=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const EXALTATION:Record<string,number>={Sun:0,Moon:1,Mercury:5,Venus:11,Mars:9,Jupiter:3,Saturn:6};
const TRADITIONAL=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const KO:Record<string,string>={Sun:'태양',Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성',Pluto:'명왕성'};
const DIGNITY_KO:Record<AstroDignity,string>={domicile:'자기 별자리(룰러십)',exaltation:'고양(엑절테이션)',detriment:'손상(디트리먼트)',fall:'추락(폴)',peregrine:'중립(페레그린)'};
const strong=(d:unknown)=>d==='domicile'||d==='exaltation';
const weak=(d:unknown)=>d==='detriment'||d==='fall';
const final=(word:string)=>{const c=word.trim().slice(-1).charCodeAt(0)-0xAC00;return c>=0&&c<11172?c%28:0;};
const iga=(w:string)=>`${w}${final(w)?'이':'가'}`;
const signOfLongitude=(lon:unknown)=>{const n=Number(lon);return Number.isFinite(n)?Math.floor((((n%360)+360)%360)/30):-1;};
const validSign=(s:unknown):s is number=>Number.isInteger(s)&&(s as number)>=0&&(s as number)<12;
const houseOf=(p:O|undefined)=>Number.isInteger(p?.house)?p!.house as number:null;
const planetMap=(planets:unknown):O=>planets&&typeof planets==='object'&&!Array.isArray(planets)?planets as O:{};

/** Traditional essential dignity; outer planets have none. Mercury in Virgo reads as domicile (it is also exalted there). */
export function essentialDignity(name:string,sign:unknown):AstroDignity|null{
  if(!TRADITIONAL.includes(name)||!validSign(sign))return null;
  if(RULER[sign]===name)return 'domicile';
  if(EXALTATION[name]===sign)return 'exaltation';
  if(RULER[(sign+6)%12]===name)return 'detriment';
  if(EXALTATION[name]===(sign+6)%12)return 'fall';
  return 'peregrine';
}

export function refineAstrologyPlanets(planets:unknown):unknown{
  if(!planets||typeof planets!=='object'||Array.isArray(planets))return planets;
  return Object.fromEntries(Object.entries(planets as O).map(([name,p])=>{
    const dignity=p&&typeof p==='object'?essentialDignity(name,p.sign):null;
    return [name,dignity?{...p,dignity}:p];
  }));
}

/** Day chart when the Sun is above the horizon (houses 7–12). Names only planets, never a house number. */
export function buildAstrologySect(planets:unknown):O{
  const ps=planetMap(planets),h=houseOf(ps.Sun);
  if(h==null)return {chart:null,lines:[],limitation:'출생 시각을 몰라 태양이 지평선 위인지 알 수 없어 섹트를 판정하지 않았다.'};
  const day=h>=7;
  const [light,benefic,malefic,contrary]=day?['Sun','Jupiter','Saturn','Mars']:['Moon','Venus','Mars','Saturn'];
  const lines=[
    `${day?'주간':'야간'} 차트 — 태양이 지평선 ${day?'위':'아래'}에 있다`,
    `섹트의 빛은 ${KO[light]}, 섹트의 길성 ${iga(KO[benefic])} 더 편하게 돕고 섹트의 흉성 ${KO[malefic]}은 다루기 쉬운 책임으로 드러난다`,
    `섹트 밖 흉성 ${KO[contrary]}의 긴장이 가장 거칠게 드러나기 쉽다`,
  ];
  const cd=ps[contrary]?.dignity,bd=ps[benefic]?.dignity;
  if(strong(cd))lines.push(`다만 ${iga(KO[contrary])} ${DIGNITY_KO[cd as AstroDignity]} 상태라 거칠어도 쓸모 있는 힘으로 바꾸기 쉽다`);
  else if(weak(cd))lines.push(`${iga(KO[contrary])} ${DIGNITY_KO[cd as AstroDignity]} 상태라 그 긴장을 의식해서 나눠 쓰는 편이 좋다`);
  if(weak(bd))lines.push(`섹트의 길성 ${iga(KO[benefic])} ${DIGNITY_KO[bd as AstroDignity]} 상태라 도움이 늦게 오거나 조건이 붙는다`);
  return {chart:day?'day':'night',light,beneficOfSect:benefic,maleficOfSect:malefic,contraryMalefic:contrary,lines};
}

const RULER_MEANING:Record<number,string>={
  1:'나를 이끄는 힘(차트 룰러)이 그 자리의 일로 향한다',
  6:'일상 루틴과 컨디션이 그 자리의 리듬을 따른다',
  7:'파트너와 맺는 관계가 그 자리의 일에서 만나기 쉽다',
  10:'일과 사회적 자리가 그 자리의 일과 이어진다',
};
export const ASTROLOGY_RULED_HOUSES=[1,6,7,10];

export function buildAstrologyHouseRulers(planets:unknown,houseCusps:unknown):O[]{
  if(!Array.isArray(houseCusps)||houseCusps.length!==12)return [];
  const ps=planetMap(planets);
  return ASTROLOGY_RULED_HOUSES.flatMap(house=>{
    const sign=signOfLongitude(houseCusps[house-1]);
    if(!validSign(sign))return [];
    const ruler=RULER[sign],p=ps[ruler]||{},placed=houseOf(p);
    const dignity=(p.dignity as AstroDignity|undefined)||essentialDignity(ruler,p.sign)||'peregrine';
    const where=[placed!=null?`${placed}하우스`:'',p.signKo||''].filter(Boolean).join(' ');
    const extra=[placed===house?'자기 하우스에 있어 그 영역을 직접 챙긴다':'',p.retrograde?'역행이라 안에서 다시 점검하며 쓰는 힘':''].filter(Boolean);
    const note=`${house}하우스(${SIGN_KO[sign]}) 주인 ${iga(KO[ruler])} ${where?`${where}에 `:''}${DIGNITY_KO[dignity]} 상태로 있다 — ${RULER_MEANING[house]}${extra.map(x=>` · ${x}`).join('')}`;
    return [{house,cuspSign:SIGN_KO[sign],ruler,placedHouse:placed,placedSign:p.signKo||null,dignity,retrograde:!!p.retrograde,note}];
  });
}

const ELEMENTS=['불','흙','공기','물'],MODES=['활동','고정','변통'];
const ELEMENT_TRAIT:Record<string,[string,string]>={
  불:['먼저 움직이고 열정으로 밀어붙이는 기질','시작의 불씨를 사람이나 환경에서 빌려 오는 편'],
  흙:['현실 감각과 꾸준함, 손에 잡히는 결과를 중시하는 기질','계획을 생활 습관으로 옮기는 데 품이 드는 편'],
  공기:['생각과 말, 사람 사이의 연결로 움직이는 기질','생각을 말로 정리해 거리를 두는 데 시간이 걸리는 편'],
  물:['감정과 분위기를 깊게 받아들이는 기질','감정을 드러내 나누는 일이 낯선 편'],
};
const MODE_TRAIT:Record<string,[string,string]>={
  활동:['일을 먼저 시작하고 방향을 트는 힘','먼저 시작하기보다 주어진 흐름을 이어받는 편'],
  고정:['한번 정하면 끝까지 지키는 힘','오래 붙잡고 버티는 일에는 따로 장치가 필요한 편'],
  변통:['상황에 맞춰 바꾸고 잇는 힘','계획이 바뀔 때 전환 비용이 큰 편'],
};
/** Seven traditional planets plus the ascendant. Names no planet so the owning chapter is not pushed onto others' facts. */
export function buildAstrologyElementBalance(planets:unknown,ascendant:unknown):O{
  const ps=planetMap(planets);
  const signs=[...TRADITIONAL.map(n=>ps[n]?.sign),(ascendant as O|undefined)?.sign].filter(validSign);
  const count=(names:string[],of:(s:number)=>string)=>{const c:Record<string,number>=Object.fromEntries(names.map(n=>[n,0]));for(const s of signs)c[of(s)]++;return c;};
  const elements=count(ELEMENTS,s=>ELEMENTS[s%4]),modes=count(MODES,s=>MODES[s%3]);
  const rank=(c:Record<string,number>,threshold:number)=>{const max=Math.max(...Object.values(c));return {dominant:max>=threshold?Object.keys(c).filter(k=>c[k]===max):[],lacking:Object.keys(c).filter(k=>c[k]===0)};};
  const e=rank(elements,Math.ceil(signs.length*3/8)),mo=rank(modes,Math.ceil(signs.length/2));
  const traits=[
    ...e.dominant.map(k=>`${k} 우세(${elements[k]}) — ${ELEMENT_TRAIT[k][0]}`),
    ...e.lacking.map(k=>`${k} 없음 — ${ELEMENT_TRAIT[k][1]}`),
    ...mo.dominant.map(k=>`${k} 우세(${modes[k]}) — ${MODE_TRAIT[k][0]}`),
    ...mo.lacking.map(k=>`${k} 없음 — ${MODE_TRAIT[k][1]}`),
  ];
  return {basis:`개인 행성 일곱과 상승점, ${signs.length}개 기준`,elements,modes,dominantElements:e.dominant,lackingElements:e.lacking,dominantModes:mo.dominant,lackingModes:mo.lacking,
    traits:traits.length?traits:['원소와 모드가 고르게 퍼져 한쪽 기질로 치우치지 않는다']};
}

const PULL:Record<number,string>={6:'일과 잡무',8:'오래 쌓이는 긴장',12:'잠과 쉼의 부족'};
const TENSION:Record<string,string>={
  'Mars-Saturn':'밀어붙임과 브레이크가 부딪히는 긴장 — 무리했다가 한꺼번에 지치지 않게 강도를 나눠 쓰는 것이 관리 포인트',
  'Moon-Saturn':'감정을 눌러 두는 긴장 — 피로가 조용히 쌓이니 쉬는 시간을 일정에 먼저 넣는 것이 관리 포인트',
  'Mars-Moon':'감정이 곧바로 몸의 열로 번지는 긴장 — 화가 오를 때 몸을 먼저 식히는 습관이 관리 포인트',
  'Saturn-Sun':'활력에 제동이 걸리는 긴장 — 회복 기간을 넉넉하게 잡는 것이 관리 포인트',
  'Mars-Sun':'활력이 과열되기 쉬운 긴장 — 쉬지 않고 몰아붙이지 않는 것이 관리 포인트',
};
const ASPECT_KO:Record<string,string>={square:'스퀘어',opposition:'오포지션'};
const TENSION_ORB=6;

/** Health from the 1·6 rulers, Mars (energy), Moon (sleep·emotional rhythm) and Saturn (recovery pace); no disease words. */
export function buildAstrologyHealthBasis(planets:unknown,houseCusps:unknown,aspects:unknown):O{
  const ps=planetMap(planets),links:string[]=[];
  const rulers=buildAstrologyHouseRulers(ps,houseCusps).filter(r=>r.house===1||r.house===6);
  const r1=rulers.find(r=>r.house===1),r6=rulers.find(r=>r.house===6);
  const d=(x:unknown)=>DIGNITY_KO[x as AstroDignity];
  if(r1){
    const who=`1하우스 주인 ${iga(KO[r1.ruler])}`;
    if(strong(r1.dignity))links.push(`${who} ${d(r1.dignity)} 상태 — 기본 체력과 회복력이 받쳐 주는 편`);
    if(weak(r1.dignity))links.push(`${who} ${d(r1.dignity)} 상태 — 컨디션이 환경을 많이 타니 생활 리듬을 일정하게 지키는 것이 회복의 열쇠`);
    if(PULL[r1.placedHouse])links.push(`${who} ${r1.placedHouse}하우스에 있다 — 몸의 에너지가 ${PULL[r1.placedHouse]} 쪽으로 새기 쉬운 배치`);
  }
  if(r6){
    const who=`6하우스 주인 ${iga(KO[r6.ruler])}`;
    if(r6.placedHouse===1)links.push(`${who} 1하우스에 있다 — 일상의 무리가 곧바로 몸의 컨디션으로 드러나는 연결`);
    if(strong(r6.dignity))links.push(`${who} ${d(r6.dignity)} 상태 — 루틴을 세우면 잘 지켜지는 편`);
    if(weak(r6.dignity))links.push(`${who} ${d(r6.dignity)} 상태 — 루틴이 쉽게 흐트러지니 작은 습관부터 고정하는 편이 낫다`);
  }
  const mars=ps.Mars,moon=ps.Moon,saturn=ps.Saturn;
  if(strong(mars?.dignity))links.push(`화성이 ${d(mars.dignity)} 상태 — 에너지를 쓰는 힘이 좋으니 과열만 조절하면 된다`);
  if(weak(mars?.dignity))links.push(`화성이 ${d(mars.dignity)} 상태 — 에너지가 들쭉날쭉하니 강도보다 꾸준함이 관리 포인트`);
  for(const [p,text] of [[mars,'열이 오르고 페이스가 급해지는 경향 — 페이스 조절이 관리 포인트'],[saturn,'몸이 굳고 회복이 느린 경향 — 스트레칭과 넉넉한 회복 시간이 관리 포인트']] as const){
    const h=houseOf(p);if(h===1||h===6)links.push(`${h}하우스에 ${p===mars?'화성':'토성'} — ${text}`);
    if(h===12)links.push(`12하우스에 ${p===mars?'화성':'토성'} — 잠과 쉼이 소모되기 쉬운 배치`);
  }
  if(weak(moon?.dignity))links.push(`달이 ${d(moon.dignity)} 상태 — 감정의 피로가 수면과 식사 리듬으로 번지기 쉽다`);
  {const h=houseOf(moon);if(h===6||h===12)links.push(`${h}하우스에 달 — 잠과 쉼이 흔들리기 쉬워 수면 리듬이 관리 포인트`);}
  const tensions=(Array.isArray(aspects)?aspects:[]).flatMap((a:O)=>{
    const key=[a?.p1,a?.p2].sort().join('-');
    return ASPECT_KO[a?.type]&&TENSION[key]&&Number(a.orb)<=TENSION_ORB?[{key,a}]:[];
  });
  for(const {key,a} of tensions){const [x,y]=key.split('-');links.push(`${KO[x]}·${KO[y]} ${ASPECT_KO[a.type]}(오브 ${a.orb}°) — ${TENSION[key]}`);}
  if(!links.length)links.push('두드러진 연결이 없다 — 1·6하우스 주인과 화성·달·토성이 모두 평이한 상태라 기본 생활 리듬이 그대로 컨디션을 만든다');
  const state=(name:string)=>{const p=ps[name];return p?{sign:p.signKo||null,house:houseOf(p),dignity:p.dignity||essentialDignity(name,p.sign)}:null;};
  return {
    version:ASTROLOGY_DERIVED_VERSION,
    lords:rulers.map(r=>({house:r.house,ruler:r.ruler,placedHouse:r.placedHouse,dignity:r.dignity})),
    mars:state('Mars'),moon:state('Moon'),saturn:state('Saturn'),
    links,
    rule:'1하우스 주인=기본 체력, 6하우스 주인=일상 루틴, 화성=에너지 쓰는 법, 달=수면·감정 리듬, 토성=회복 속도. 생활 리듬과 관리 포인트로만 읽고 질병·진단을 말하지 않는다.',
    ...(rulers.length?{}:{limitation:'출생 시각을 몰라 하우스 주인을 계산하지 않았다 — 행성 상태만 본다.'}),
    disclaimer:ASTROLOGY_HEALTH_DISCLAIMER,
  };
}
