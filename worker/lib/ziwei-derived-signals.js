/**
 * 자미두수 파생 근거 — 사업운(재백·자녀·전택·관록 궁과 궁간 비화)과 건강(질액궁·대궁 부모궁·복덕궁).
 *
 * 사업운은 재백궁(현금 흐름)만 보지 않는다. 자녀궁은 동업·투자·확장(지점·아랫사람)의 자리이자 전택궁의 대궁이라
 * 재백궁과 자녀궁을 함께 보고, 궁간 비화(飛化)로 번 돈이 확장과 자산 가운데 어디로 이어지는지 읽는다.
 *
 * 영냥이(worker/yeongnyangi/fortune/ziwei/derived.ts 재수출)와 다른 자미 상품이 함께 쓰는 공용 모듈이다.
 * jest·plain node verify 가 TS 없이 import 하므로 JS(ESM)로 둔다(선례: saju-derived-signals.js).
 * 🔴 엔진 출력(worker/lib/ziwei-ai-chart.js)은 바꾸지 않는다(reading-facts.ts 머리말과 같은 이유). 소비처가 context·프롬프트에 붙일 뿐이다.
 * 🔴 결정적이다. 비화는 엔진이 궁에 매긴 궁간과 같은 사화 표(FOUR_TRANSFORMATIONS)로만 계산한다.
 * 🔴 판정 문장은 실제로 성립한 연결에서만 나온다. 연결이 없으면 없다고 적고 판정하지 않는다.
 * 🔴 궁간 비화는 원국 사실이라 모든 등급에 싣는다. 대한·유년 사화와 섞지 않으며, 키에 majorLuck·fourTransformations 를
 *    쓰지 않아 단계 필터(PREMIUM_KEY·ask professional/excluded·chapter-facts cleanEvidence)에 걸리지 않는다.
 * 🔴 건강은 의학 판단이 아니다. 질병명 없이 생활 리듬·컨디션 관리의 조건으로만 쓰고 고지문을 함께 싣는다.
 */
import {FOUR_TRANSFORMATIONS,TRANSFORMATION_LABELS} from './ziwei-ai-chart.js';

export const ZIWEI_DERIVED_VERSION='ziwei-derived-20261004-v1';
export const ZIWEI_HEALTH_DISCLAIMER='자미두수 명반의 질액궁·복덕궁으로 생활 리듬과 컨디션 흐름을 살핀 운세 콘텐츠입니다. 의학적 진단이나 치료를 대체하지 않으며, 실제 건강 문제가 있거나 지속적인 통증·불편감이 있다면 반드시 전문 의료진과 상담하세요.';
const TIME_LIMITATION='출생 시각을 몰라 정오 기준으로 세운 명반이라 궁 배치와 비화가 달라질 수 있다.';

/** @typedef {{from:string,kind:string,star:string,to:string|null}} ZiweiFlight */

const MALEFIC=['경양','타라','화성','영성','지공','지겁'];
/** @param {unknown} v @returns {string[]} */
const names=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
/** @param {any} p @returns {string[]} */
const starsOf=p=>p?[...names(p.mainStars),...names(p.assistantStars),...names(p.maleficStars)]:[];
/** @param {unknown} palaces @returns {any[]} */
const valid=palaces=>Array.isArray(palaces)?palaces.filter(p=>p&&typeof p==='object'&&typeof p.name==='string'):[];
/** @param {string} name @param {any[]} palaces @returns {string|undefined} */
const facingOf=(name,palaces)=>{const p=palaces.find(q=>q.name===name);return Number.isInteger(p?.branchIndex)?palaces.find(q=>q.branchIndex===(p.branchIndex+6)%12)?.name:undefined;};
/** @param {any} p */
const huaOf=p=>names(p?.transformations).map(t=>{const [kind,star]=t.split(':');return {kind,star};}).filter(h=>h.kind&&h.star);
// 조사는 괄호 앞 낱말의 받침으로 고른다(궁 이름은 모두 받침이 있고, 화과·화기만 받침이 없다).
/** @param {string} word */
const final=word=>{const c=word.replace(/\(.*$/,'').trim().slice(-1).charCodeAt(0)-0xAC00;return c>=0&&c<11172?c%28:0;};
/** @param {string} w */
const iga=w=>`${w}${final(w)?'이':'가'}`;

/** 궁마다 궁간이 날려 보내는 사화 넷과 그 별이 앉은 궁. to 가 자기 자신이면 자화(自化)다.
 * @param {unknown} palaces @returns {ZiweiFlight[]} */
export function ziweiPalaceFlights(palaces){
 const list=valid(palaces);
 const table=/** @type {Record<string,Record<string,string>>} */(FOUR_TRANSFORMATIONS),labels=/** @type {Record<string,string>} */(TRANSFORMATION_LABELS);
 return list.flatMap(p=>Object.entries(table[p.stem]||{}).filter(([,star])=>star)
  .map(([key,star])=>({from:/** @type {string} */(p.name),kind:labels[key]||key,star,to:/** @type {string|undefined} */(list.find(q=>starsOf(q).includes(star))?.name)??null})));
}

/** @param {any} p @param {string} role */
const summary=(p,role)=>p?{palace:p.name,role,stars:starsOf(p),...(huaOf(p).length?{natalHua:names(p.transformations)}:{})}:undefined;

/** @type {Record<string,string>} */
const BUSINESS_ROLE={재백궁:'현금 흐름',자녀궁:'동업·투자·확장(지점·아랫사람)',전택궁:'사업장과 자산',관록궁:'사업의 형태와 일'};
const BUSINESS=Object.keys(BUSINESS_ROLE);
// 화록 비화의 뜻. 열쇠는 '보내는 궁>받는 궁'.
/** @type {Record<string,string>} */
const LU_LINK={
 '재백궁>자녀궁':'번 돈을 동업·투자·확장에 돌리면 불어나기 쉬운 연결',
 '재백궁>전택궁':'번 돈이 사업장과 자산으로 쌓이기 쉬운 연결',
 '재백궁>관록궁':'돈을 다시 일에 넣어 사업을 키우는 연결',
 '재백궁>명궁':'돈이 본인 손에 모이는 연결이라 직접 관리할 때 잘 쌓인다',
 '자녀궁>재백궁':'동업·투자·확장이 현금으로 돌아오는 연결',
 '자녀궁>전택궁':'확장한 사업이 자산으로 쌓이는 연결',
 '자녀궁>관록궁':'동업과 확장이 사업의 형태를 키우는 연결',
 '자녀궁>명궁':'동업자·아랫사람에게서 본인에게 이익이 돌아오는 연결',
 '관록궁>재백궁':'일의 형태가 바로 돈을 만드는 연결',
 '관록궁>전택궁':'일의 성과가 사업장과 자산으로 남는 연결',
 '관록궁>자녀궁':'본업이 동업·확장으로 뻗어 가는 연결',
 '관록궁>명궁':'일의 성과가 본인의 이름으로 돌아오는 연결',
 '전택궁>재백궁':'자산과 사업장이 현금 흐름을 받쳐 주는 연결',
 '전택궁>자녀궁':'자산을 바탕으로 확장하기 쉬운 연결',
 '전택궁>관록궁':'사업장 기반이 일을 받쳐 주는 연결',
 '전택궁>명궁':'자산이 본인에게 모이는 연결',
};
// 화기는 들어간 궁을 묶고 그 대궁을 충한다. 열쇠는 받는 궁.
/** @type {Record<string,string>} */
const JI_INTO={
 재백궁:'돈 문제가 마음의 여유까지 깎기 쉬운 조건이라 현금 흐름에 완충을 둔다',
 자녀궁:'동업·투자·확장이 쌓아 둔 자산을 깎기 쉬운 조건이라 확장 자금과 기반 자산을 나눠 둔다',
 전택궁:'사업장·자산 문제가 확장과 동업의 발목을 잡기 쉬운 조건이라 자산 정리를 먼저 한다',
 관록궁:'일의 압박이 가까운 관계까지 번지기 쉬운 조건이라 사업의 범위를 좁혀 시작한다',
 명궁:'사업의 부담을 혼자 짊어지기 쉬운 조건이라 역할을 나눌 사람을 먼저 찾는다',
};
/** @type {Record<string,string>} */
const HUA_POWER={화록:'풀리고 들어오는 힘',화권:'쥐고 키우는 힘',화과:'이름과 신용을 얻는 힘',화기:'집착하거나 막히기 쉬운 부담'};

/** 재백궁과 자녀궁을 함께 보는 사업운 근거. 전택궁(자녀궁의 대궁)과 관록궁(사업의 형태)까지 비화로 잇는다.
 * @param {unknown} palaces @param {boolean} [birthTimeUnknown] */
export function buildZiweiBusinessBasis(palaces,birthTimeUnknown=false){
 const list=valid(palaces),byName=new Map(list.map(p=>[/** @type {string} */(p.name),p]));
 const flights=ziweiPalaceFlights(list).filter(f=>BUSINESS.includes(f.from));
 /** @type {string[]} */
 const links=[];
 for(const name of BUSINESS)for(const h of huaOf(byName.get(name)))
  links.push(`${name}에 생년 ${h.kind}(${h.star}) — ${BUSINESS_ROLE[name]}에서 ${HUA_POWER[h.kind]||h.kind}이 타고난 자리다.`);
 for(const f of flights){
  if(!f.to)continue;
  if(f.to===f.from){
   if(f.kind==='화록')links.push(`${f.from}의 화록(${f.star})이 제자리에서 흩어진다(자화록) — ${iga(BUSINESS_ROLE[f.from])} 들어와도 머물지 않고 나가기 쉬워 새는 곳을 먼저 막는다.`);
   if(f.kind==='화기')links.push(`${f.from}의 화기(${f.star})가 제자리에서 흩어진다(자화기) — ${BUSINESS_ROLE[f.from]}을 스스로 놓치거나 손을 떼기 쉬워 점검 주기를 정해 둔다.`);
   continue;
  }
  if(f.kind==='화록'&&LU_LINK[`${f.from}>${f.to}`])links.push(`${f.from}의 화록(${f.star})이 ${f.to}으로 들어간다 — ${LU_LINK[`${f.from}>${f.to}`]}.`);
  if(f.kind==='화기'&&JI_INTO[f.to]){
   const facing=facingOf(f.to,list);
   links.push(`${f.from}의 화기(${f.star})가 ${f.to}에 들어${facing?` 대궁 ${facing}을 충한다`:''} — ${JI_INTO[f.to]}.`);
  }
 }
 for(const [i,a] of BUSINESS.entries())for(const b of BUSINESS.slice(i+1)){
  /** @param {string} x @param {string} y */
  const lu=(x,y)=>flights.some(f=>f.kind==='화록'&&f.from===x&&f.to===y);
  if(lu(a,b)&&lu(b,a))links.push(`${a}과 ${b}이 화록을 주고받는다 — ${BUSINESS_ROLE[a]}과 ${BUSINESS_ROLE[b]}이 서로 밀어 주는 구조다.`);
 }
 return {version:ZIWEI_DERIVED_VERSION,
  palaces:BUSINESS.map(n=>summary(byName.get(n),BUSINESS_ROLE[n])).filter(Boolean),
  flights,
  links:links.length?links:['재백·자녀·전택·관록궁 사이에 생년사화나 궁간 화록·화기 연결이 없다 — 사업운은 각 궁의 별과 강약으로만 읽는다.'],
  rule:'재백궁=현금 흐름, 자녀궁=동업·투자·확장(전택궁의 대궁), 전택궁=사업장과 자산, 관록궁=사업의 형태. 궁간 화록은 힘이 이어지는 곳, 화기는 들어간 궁과 그 대궁(충)의 부담으로 읽고, 연결이 없으면 판정하지 않는다.',
  ...(birthTimeUnknown?{limitation:TIME_LIMITATION}:{})};
}

/** @type {Record<string,string>} */
const HEALTH_ROLE={질액궁:'몸의 약한 고리와 무리가 쌓이는 곳',부모궁:'질액궁의 대궁 — 타고난 체질의 바탕',복덕궁:'마음의 여유와 정신적 회복'};
// 화기를 보낸 궁이 가리키는 생활 영역. 그 영역의 부담이 몸의 리듬으로 번지는 조건을 말한다.
/** @type {Record<string,string>} */
const STRAIN={명궁:'스스로 짊어진 일',형제궁:'가까운 사람과의 일',부부궁:'가까운 관계',자녀궁:'돌봄과 책임',재백궁:'돈 문제',천이궁:'바깥 활동과 이동',노복궁:'사람 관계',관록궁:'일',전택궁:'집안일',복덕궁:'마음의 피로',부모궁:'윗사람과의 일',질액궁:'몸의 무리'};

/** 질액궁을 중심으로 대궁 부모궁과 복덕궁(정신적 회복)을 함께 보는 건강 근거. 질병을 단정하지 않는다.
 * @param {unknown} palaces @param {boolean} [birthTimeUnknown] */
export function buildZiweiHealthBasis(palaces,birthTimeUnknown=false){
 const list=valid(palaces),byName=new Map(list.map(p=>[/** @type {string} */(p.name),p]));
 const flights=ziweiPalaceFlights(list);
 /** @type {string[]} */
 const links=[];
 const body=byName.get('질액궁'),mind=byName.get('복덕궁');
 const bodyMalefic=starsOf(body).filter(s=>MALEFIC.includes(s));
 if(bodyMalefic.length)links.push(`질액궁에 ${bodyMalefic.join('·')} — 무리가 쌓이면 긴장과 피로로 드러나기 쉬운 자리라 쉬는 시간을 먼저 정해 둔다.`);
 for(const h of huaOf(body))links.push(h.kind==='화기'
  ?`질액궁에 생년 화기(${h.star}) — 컨디션 관리가 오래 이어지는 과제가 되기 쉬운 자리라 생활 리듬을 일정하게 지킨다.`
  :`질액궁에 생년 ${h.kind}(${h.star}) — 회복의 바탕이 되는 힘이 있는 자리라 좋은 습관이 오래 간다.`);
 for(const f of flights.filter(f=>f.kind==='화기'&&(f.to==='질액궁'||f.to==='부모궁'))){
  if(f.from===f.to){if(f.to==='질액궁')links.push(`질액궁의 화기(${f.star})가 제자리에서 흩어진다(자화기) — 몸의 신호를 스스로 넘기기 쉬워 정기적으로 점검하는 습관이 도움이 된다.`);continue;}
  const facing=facingOf(/** @type {string} */(f.to),list);
  // 보낸 궁은 이름 대신 생활 영역으로 적는다 — 건강 장이 다른 장 소유의 궁 이름을 부르지 않게 한다.
  links.push(`${STRAIN[f.from]||'다른 생활 영역'}의 부담이 화기(${f.star})로 ${f.to}에 들어${facing?` 대궁 ${facing}을 충한다`:'온다'} — 그 부담이 몸의 리듬으로 번지기 쉬운 조건이다.`);
 }
 const mindLoad=[...starsOf(mind).filter(s=>MALEFIC.includes(s)),...huaOf(mind).filter(h=>h.kind==='화기').map(h=>`생년 화기(${h.star})`)];
 if(mindLoad.length)links.push(`복덕궁에 ${mindLoad.join('·')} — 마음의 피로가 잠과 컨디션으로 이어지기 쉬워 마음을 쉬게 하는 습관이 몸 관리의 일부다.`);
 return {version:ZIWEI_DERIVED_VERSION,
  palaces:Object.keys(HEALTH_ROLE).map(n=>summary(byName.get(n),HEALTH_ROLE[n])).filter(Boolean),
  links:links.length?links:['질액궁·복덕궁에 살성이나 화기 연결이 없다 — 건강운은 질액궁 별의 성질과 생활 습관으로만 읽는다.'],
  rule:'질액궁=몸의 약한 고리, 대궁 부모궁=체질의 바탕, 복덕궁=정신적 회복. 살성·화기는 무리가 쌓이는 조건으로만 읽고 질병을 단정하지 않는다.',
  disclaimer:ZIWEI_HEALTH_DISCLAIMER,
  ...(birthTimeUnknown?{limitation:TIME_LIMITATION}:{})};
}
