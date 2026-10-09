/**
 * 자미두수 궁별 상담 사실 — 엔진 명반의 궁 하나하나에 강약·대궁·삼합·협궁·판단 문장을 붙인다.
 *
 * 여기 있는 이유: 엔진 궁 객체의 `brightness` 는 출처 없는 옛 표를 접은 값(왕→묘·약→리·한→평)이라
 * 원전과 126칸 중 49칸만 맞았고, LLM 은 그 값만 받고 "어떻게 읽어라"는 근거가 없었다.
 *
 * 🔴 엔진 출력(worker/lib/ziwei-ai-chart.js)은 바꾸지 않는다. worker/routes/ziwei-ai.js 가 명반 JSON 을
 *    여러 번 보내고 verify:ziwei-worker-chart-facts 가 크기를 묶는다(lib/ziwei-derived-facts.js 머리말).
 *    그래서 영냥이 사실 경계(무료 프롬프트·장 사실 선택(v6·v7·주의점)·ask 패킷)에서 붙인다. 저장 context 는 그대로다.
 * 🔴 멱등이다. 이미 붙은 궁(strengths 배열이 있는 궁)은 그대로 둔다 — 저장된 옛 context 와 새 context 가
 *    같은 함수를 지나도 결과가 같다. 궁 목록이 잘린 부분집합이면 없는 이웃 궁에 기대는 판단은 만들지 않는다.
 * 🔴 강약은 lib/ziwei-star-strength.js 정본에서만 온다(14주성 + 문창·문곡·경양·타라·화성·영성).
 *    그 밖의 별은 strengths 에 넣지 않는다 — 강약을 만들지 않는다.
 * 🔴 키 이름은 단계 필터(reading-v7-ledger PREMIUM_KEY · ask/packet professional·excluded ·
 *    chapter-facts cleanEvidence)에 걸리지 않게 짓는다. 걸리면 저가 단계에서 조용히 사라진다.
 * 🔴 readingNotes 에는 규칙 id·출처를 넣지 않는다. 추적은 traceZiweiPalaceNotes 로 같은 입력에서 다시 계산한다.
 */
import {starStrength,isZiweiMainStar} from '../../../../lib/ziwei-star-strength.js';
import {FOUR_TRANSFORMATIONS,TRANSFORMATION_LABELS} from '../../../lib/ziwei-ai-chart.js';
import {ZIWEI_READING_RULES_VERSION} from './reading-rules';

export const ZIWEI_PALACE_FACTS_VERSION=`ziwei-palace-facts-v1+${ZIWEI_READING_RULES_VERSION}`;

type O=Record<string,any>;
export interface ZiweiStrengthFact{star:string;grade:string}
export interface ZiweiPalaceNote{ruleId:string;text:string}

const MALEFIC=['경양','타라','화성','영성','지공','지겁'];
// 원전 「入庙不加吉」의 吉 — 보좌 길성. 녹존은 「禄元」으로 따로 본다.
const LUCKY=['녹존','좌보','우필','문창','문곡','천괴','천월'];
const GOOD_HUA=['화록','화권','화과'];
const FLANK_PAIRS:readonly [string,string,string][]=[
 ['좌보','우필','돕는 협(夾)'],['문창','문곡','돕는 협(夾)'],['천괴','천월','돕는 협(夾)'],['태양','태음','돕는 협(夾)'],
 ['경양','타라','조이는 협(夾) — 압박 조건으로만 읽는다'],['지공','지겁','조이는 협(夾) — 압박 조건으로만 읽는다'],
];

const names=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
const starsOf=(p:O|undefined)=>p?[...names(p.mainStars),...names(p.assistantStars),...names(p.maleficStars)]:[];
const huaOf=(p:O|undefined)=>names(p?.transformations).map(t=>{const [kind,star]=t.split(':');return {kind,star};}).filter(h=>h.kind&&h.star);
const validBranch=(b:unknown):b is number=>Number.isInteger(b)&&(b as number)>=0&&(b as number)<12;
const isEnriched=(p:unknown)=>!!p&&typeof p==='object'&&Array.isArray((p as O).strengths);

interface Rated{star:string;grade:string;rank:number}
function rated(p:O):Rated[]{
 if(!validBranch(p.branchIndex))return [];
 return starsOf(p).flatMap(star=>{const s=starStrength(star,p.branchIndex);return s.status==='rated'&&s.rawKo&&typeof s.rank==='number'?[{star,grade:s.rawKo,rank:s.rank}]:[];});
}
const tag=(s:Rated)=>`${s.star}(${s.grade})`;
const labelStars=(p:O)=>{const r=new Map(rated(p).map(s=>[s.star,s]));return starsOf(p).map(s=>r.has(s)?tag(r.get(s)!):s);};
function relation(p:O|undefined){
 if(!p)return undefined;
 const hua=names(p.transformations);
 return {palace:p.name,stars:labelStars(p),...(hua.length?{transformations:hua}:{})};
}

interface Around{facing?:O;trines:(O|undefined)[];prev?:O;next?:O}
function around(p:O,byBranch:Map<number,O>):Around{
 if(!validBranch(p.branchIndex))return {trines:[]};
 const at=(d:number)=>byBranch.get((p.branchIndex+d)%12);
 return {facing:at(6),trines:[at(4),at(8)],prev:at(11),next:at(1)};
}

function flankPairs(a:Around){
 if(!a.prev||!a.next)return [];
 const l=starsOf(a.prev),r=starsOf(a.next);
 return FLANK_PAIRS.filter(([x,y])=>l.includes(x)&&r.includes(y)||l.includes(y)&&r.includes(x));
}

/** 한 궁의 판단 문장. 규칙 id 는 추적용으로만 함께 돌려준다. */
function palaceNotes(p:O,a:Around):ZiweiPalaceNote[]{
 const notes:ZiweiPalaceNote[]=[],push=(ruleId:string,text:string)=>notes.push({ruleId,text});
 const strengths=rated(p),mains=strengths.filter(s=>isZiweiMainStar(s.star));
 const self=starsOf(p),hua=huaOf(p);
 const complete=!!a.facing&&a.trines.every(Boolean);
 const selfMalefic=self.filter(s=>MALEFIC.includes(s)),selfJi=hua.filter(h=>h.kind==='화기');
 const goodHua=hua.filter(h=>GOOD_HUA.includes(h.kind)),lucky=self.filter(s=>LUCKY.includes(s));
 const aroundMalefic=[[`대궁 ${a.facing?.name}`,a.facing],...a.trines.map(t=>[`삼합 ${t?.name}`,t])].flatMap(([where,q])=>{const m=starsOf(q as O|undefined).filter(s=>MALEFIC.includes(s));return m.length?[`${where}의 ${m.join('·')}`]:[];});
 for(const m of mains){
  if(m.rank<=2&&complete){
   const pressure=[...(selfMalefic.length?[`본궁의 ${selfMalefic.join('·')}`]:[]),...aroundMalefic,...selfJi.map(h=>`본궁 화기(${h.star})`)];
   if(pressure.length)push('zw.strength.malefic',`${tag(m)}: 힘이 강한 자리. 비추는 살성·화기 — ${pressure.join(', ')}. 강한 힘이 마찰·압박과 함께 드러나기 쉽다.`);
   else if(!goodHua.length&&!lucky.length)push('zw.strength.plain',`${tag(m)}: 성질이 또렷한 자리지만 같은 궁에 길한 사화·보좌가 없다. 강약만으로 길하다고 보지 않는다.`);
  } else if(m.rank>=6){
   const supports=[...(self.includes('녹존')?['녹존']:[]),...goodHua.map(h=>`${h.kind}(${h.star})`)];
   const pressures=[...selfMalefic,...selfJi.map(h=>`화기(${h.star})`)];
   if(supports.length)push('zw.xian.support',`${tag(m)}: 힘이 약한 자리. 보완 — ${supports.join('·')}${pressures.length?`, 부담 — ${pressures.join('·')}`:''}. 보완할 조건이 있어 약함을 실패로 보지 않는다.`);
   else if(pressures.length)push('zw.xian.pressure',`${tag(m)}: 힘이 약한 자리. 부담 — ${pressures.join('·')}. 이 영역의 부담이 커지기 쉬운 조건이라 완충 행동과 관찰 신호를 함께 본다.`);
  }
  if((m.star==='태양'||m.star==='태음')&&m.rank>=6)push('zw.sunmoon',`${tag(m)}: 해·달이 빛을 잃은 자리(반배). 성질이 드러나는 데 시간과 보완 조건이 더 필요하다.`);
 }
 for(const h of hua){
  const s=strengths.find(x=>x.star===h.star);if(!s)continue;
  if(s.rank<=2&&GOOD_HUA.includes(h.kind))push('zw.sihua.strength',`${h.kind} — ${tag(s)}: 강한 별에 붙은 길한 사화라 그 힘이 잘 쓰이기 쉽다.`);
  else if(s.rank>=6&&h.kind==='화기')push('zw.sihua.strength',`화기 — ${tag(s)}: 약한 별에 붙은 화기라 부담이 더 드러나기 쉽다.`);
 }
 for(const s of strengths.filter(x=>MALEFIC.includes(x.star))){
  if(s.rank<=2)push('zw.malefic.grade',`${tag(s)}: 살성이 제자리를 얻음. 긴장이 결단·추진력처럼 쓸 수 있는 형태로 드러나기 쉽다(길성은 아님).`);
  else if(s.rank>=6)push('zw.malefic.grade',`${tag(s)}: 살성이 자리를 잃음. 긴장이 거칠게 드러나기 쉽다.`);
 }
 if(mains.length>=2&&new Set(mains.map(m=>m.grade)).size>1)push('zw.multi',`주성 둘 — ${mains.map(tag).join(' · ')}: 강약이 달라 각각 따로 읽는다.`);
 if(!names(p.mainStars).length&&complete){
  const ref=rated(a.facing!).filter(s=>isZiweiMainStar(s.star));
  const trineGood=a.trines.flatMap(t=>[...starsOf(t).filter(s=>LUCKY.includes(s)),...huaOf(t).filter(h=>GOOD_HUA.includes(h.kind)).map(h=>`${h.kind}(${h.star})`)].map(x=>`${t!.name} ${x}`));
  push('zw.empty',`주성 없음 — ${ref.length?`대궁 ${a.facing!.name}의 ${ref.map(tag).join('·')}를 참고로만 빌려 본다(본궁 별 아님, 강약은 원래 자리 그대로)`:`대궁 ${a.facing!.name}에도 주성이 없다`}.${trineGood.length?` 삼합의 길성·길한 사화 — ${trineGood.join(', ')}.`:''} 비어 있다는 이유로 불운으로 보지 않는다.`);
 }
 for(const [x,y,kind] of flankPairs(a))push('zw.flank',`양옆 궁 ${a.prev!.name}·${a.next!.name} — ${x}·${y}: ${kind}.`);
 return notes;
}

function enrichOne(p:O,byBranch:Map<number,O>):O{
 if(!p||typeof p!=='object'||isEnriched(p))return p;
 const {brightness:_legacyFoldedBrightness,...rest}=p;
 const a=around(p,byBranch),notes=palaceNotes(p,a);
 const strengths:ZiweiStrengthFact[]=rated(p).map(({star,grade})=>({star,grade}));
 const facing=relation(a.facing),trines=a.trines.map(relation).filter(Boolean);
 const flanks=flankPairs(a).map(([x,y,kind])=>({pair:`${x}·${y}`,kind}));
 const borrowed=!names(p.mainStars).length&&a.facing?rated(a.facing).filter(s=>isZiweiMainStar(s.star)):[];
 return {...rest,strengths,
  ...(facing?{facing}:{}),...(trines.length?{trines}:{}),...(flanks.length?{flanks}:{}),
  ...(borrowed.length?{oppositeReference:{palace:a.facing!.name,stars:borrowed.map(tag),use:'본궁 별이 아니라 참고로만 빌려 봄'}}:{}),
  ...(notes.length?{readingNotes:notes.map(n=>n.text)}:{})};
}

const branchMap=(palaces:O[])=>new Map(palaces.filter(p=>p&&validBranch(p.branchIndex)).map(p=>[p.branchIndex as number,p]));

/**
 * 궁 목록 전체에 강약·관계·판단 문장을 붙인다. 배열이 아니면 그대로 돌려준다.
 * 부분집합(관계 상담의 8궁 등)을 넣으면 없는 궁에 기대는 판단은 빠진다 — 자르기 전에 부르는 것이 원칙이다.
 */
export function enrichZiweiPalaces<T>(palaces:T):T{
 if(!Array.isArray(palaces))return palaces;
 if(palaces.every(isEnriched))return palaces;
 const byBranch=branchMap(palaces as O[]);
 return palaces.map(p=>enrichOne(p,byBranch)) as T;
}

const palaceLike=(v:unknown):v is O=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Array.isArray((v as O).mainStars)&&validBranch((v as O).branchIndex);

/**
 * 자미 context 의 모든 사실에서 궁 모양 객체(주성 배열 + 지지 번호)를 찾아 강약을 붙인 새 context 를 돌려준다.
 * 저장된 context 는 바꾸지 않는다 — 궁합 계산(master-love-codex-compat starsOf)이 옛 brightness 를 읽는다.
 * 관계 상담은 궁 복사본이 relationshipBasis·relationshipComparison·partnerChart 에 흩어져 있어
 * 전체 명반(palaces · partnerChart.palaces)에서 같은 원본 궁을 찾아 이웃까지 본 결과로 바꾼다.
 * 원본을 못 찾은 궁 모양 객체(궁합 요약의 부부궁 별 묶음 등)는 그 객체만으로 강약을 붙인다.
 */
const STEMS='갑을병정무기경신임계';
/** 유년(流年) 사화: 그해 천간으로 다시 계산하고, 그 별이 앉은 원국 궁을 붙인다(궁합 relationshipTiming.annual 과 같은 계산). */
export function ziweiAnnualTransformations(year:number,palaces:unknown){
 const stem=STEMS[(((year-4)%10)+10)%10];
 const table=(FOUR_TRANSFORMATIONS as Record<string,Record<string,string>>)[stem]||{};
 const list=Array.isArray(palaces)?(palaces as O[]):[];
 return {stem,transformations:Object.entries(table).map(([key,star])=>({transformation:(TRANSFORMATION_LABELS as Record<string,string>)[key]||key,star,palaceName:String(list.find(p=>starsOf(p).includes(star))?.name||'')}))};
}
// 엔진 yearlyLuck.transformations 는 그 궁에 붙은 생년사화 복사본이다(ziwei-ai-chart.js yearlyLuckFor).
// 유년사화로 읽히지 않게 빼고, 실제 유년 천간 사화를 새 이름(annualTransformations)으로 붙인다.
function annualYearly(entry:unknown,palaces:unknown):unknown{
 if(Array.isArray(entry))return entry.map(x=>annualYearly(x,palaces));
 if(!entry||typeof entry!=='object'||!Number.isInteger((entry as O).year))return entry;
 const {transformations:_natal,...rest}=entry as O;
 const annual=ziweiAnnualTransformations(rest.year,palaces);
 return {...rest,annualStem:annual.stem,annualTransformations:annual.transformations};
}
function withAnnualTransformations(label:string,value:unknown,palaces:unknown):unknown{
 if(label==='yearlyLuck'||label==='yearlyTimeline')return annualYearly(value,palaces);
 if(label==='partnerChart'&&value&&typeof value==='object'){
  const chart=value as O;
  return {...chart,...('yearlyLuck' in chart?{yearlyLuck:annualYearly(chart.yearlyLuck,chart.palaces)}:{}),...('yearlyTimeline' in chart?{yearlyTimeline:annualYearly(chart.yearlyTimeline,chart.palaces)}:{})};
 }
 return value;
}

export function enrichZiweiContext<T extends {domain:string;facts:{label:string;value:unknown}[]}>(context:T):T{
 if(context?.domain!=='ziwei'||!Array.isArray(context.facts))return context;
 const natal=context.facts.find(f=>f.label==='palaces')?.value;
 context={...context,facts:context.facts.map(f=>({...f,value:withAnnualTransformations(f.label,f.value,natal)}))};
 const known=new Map<string,O>();
 const fact=(label:string)=>context.facts.find(f=>f.label===label)?.value;
 for(const chart of [fact('palaces'),(fact('partnerChart') as O|undefined)?.palaces]){
  if(!Array.isArray(chart))continue;
  const enriched=enrichZiweiPalaces(chart);
  chart.forEach((p,i)=>{if(palaceLike(p)&&!isEnriched(p))known.set(JSON.stringify(p),enriched[i]);});
 }
 const walk=(v:unknown):unknown=>{
  // 단계 필터가 키를 덜어 낸 궁 목록(주의점 anchors 등)은 원본과 모양이 달라 못 찾는다.
  // 원본을 돌려주면 덜어 낸 키(대한 등)가 되살아나므로, 그 목록 안에서만 이웃을 본다.
  if(Array.isArray(v)&&v.length&&v.every(palaceLike)&&v.some(p=>!isEnriched(p)&&!known.has(JSON.stringify(p))))return enrichZiweiPalaces(v);
  if(Array.isArray(v))return v.map(walk);
  if(!v||typeof v!=='object'||isEnriched(v))return v;
  if(palaceLike(v))return known.get(JSON.stringify(v))??enrichOne(v,new Map());
  return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)]));
 };
 return {...context,facts:context.facts.map(f=>({...f,value:walk(f.value)}))};
}

/** 내부 추적: 궁마다 어떤 규칙이 어떤 문장을 만들었는지. LLM·사용자 화면에 보내지 않는다. */
export function traceZiweiPalaceNotes(palaces:unknown):{palace:string;notes:ZiweiPalaceNote[]}[]{
 if(!Array.isArray(palaces))return [];
 const byBranch=branchMap(palaces as O[]);
 return (palaces as O[]).filter(p=>p&&typeof p==='object').map(p=>({palace:String(p.name),notes:palaceNotes(p,around(p,byBranch))}));
}
