import {PREVENTION_VERSION,PREVENTION_TITLE,PREVENTION_RULES,buildSajuPrevention,preventionPillarDetails,canonicalPreventionPillar} from '../../lib/fortune-prevention.js';
import {buildLuckNatalInteractions} from '../../lib/life-book-ai-saju.js';
import type {ChapterSpec,MasterAnalysis,ReadingSectionSpec} from './book-contracts';
import type {DomainContext,DomainId,PackageId,Evidence} from './shared/contracts';
import {READING_V6_VERSION} from './reading-policy';
import {tokensRequiredForChars} from '../../lib/llm-budget.js';

export {PREVENTION_VERSION,PREVENTION_RULES};
export const preventionEligible=(tier:PackageId)=>['flounder','tuna','assorted','omakase'].includes(tier);
export const hasPrevention=(chapter:Pick<ChapterSpec,'preventionVersion'>)=>chapter.preventionVersion===PREVENTION_VERSION;
export const allowsPreventionBalance=(chapter:ChapterSpec)=>hasPrevention(chapter)&&chapter.key==='prevention'&&chapter.tier==='flounder'&&chapter.systems?.includes('saju')===true;
// Exactly the new caution packet may expose the limited balance interpretation at flounder.
export const preventionTierRule='용신·기신은 제공된 사주 주의점 근거의 조건부 판단만 설명한다. 희신·대운·종격·마하다샤·안타르다샤·삼방사정은 다루지 않는다.';
const LABEL='preventionEvidence';
const inputs:Record<DomainId,string[]>={
 saju:['pillars','pillarDetails','tenGodsByPillar','fiveElements','seasonalBalance','natalInteractions','partnerChart','relationshipComparison'],
 ziwei:['lifePalace','bodyPalace','palaces','fourTransformations','relationshipBasis','relationshipComparison','relationshipTiming'],
 vedic:['lagna','moon','planets','houses','relationshipBasis','relationshipComparison','relationshipTiming'],
 astrology:['planets','aspects','houseCusps','relationshipBasis','relationshipComparison','relationshipTiming'],
 sukuyo:['personA','personB','relation','forwardDistance','reverseDistance','distanceLabel'],
 tarot:['spreadId','cards','reading'],
};
const domainAdvice:Record<DomainId,string>={
 saju:'실제 성립한 형충파해와 천간 십성, 조건부 균형 판단을 연결한다. 오행 수량만으로 좋고 나쁨을 판정하지 않는다.',
 ziwei:'제공된 궁·주성·보조성 및 허용된 사화가 나타내는 강점과 부담을 함께 읽는다. 부부궁만으로 상대의 행동이나 결혼을 확정하지 않는다.',
 vedic:'제공된 라그나·달·관계 하우스·행성 및 허용된 다샤를 구분한다. 실제 계산에 없는 요가·분할차트·시기를 만들지 않는다.',
 astrology:'제공된 행성과 긴장각·조화각, 실제 시나스트리 근거를 구분한다. 긴장각은 자극과 마찰의 양면으로 읽고 조화각도 관계의 성공 보장으로 쓰지 않는다. 출생 차트를 트랜짓으로 바꾸지 않는다.',
 sukuyo:'실제 두 사람의 관계와 거리만 궁합 근거로 쓴다. 한 사람의 본명숙은 성향의 참고이며 안괴 등 특정 상대와의 관계를 만들어내지 않는다.',
 tarot:'저장된 카드의 이름·방향·위치·질문을 그대로 사용한다. 카드의 그림자와 선택지를 설명하되 새 카드나 상대의 실제 속마음을 만들지 않는다.',
};
function scoped(value:unknown,premium:boolean):unknown {
 if(Array.isArray(value))return value.map(v=>scoped(v,premium));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>! /prompt|summaryForPrompt/i.test(key)&&(premium||! /useful|unfavorable|yongshin|kijishin|heeShin|jong|majorLuck|decade|dasha|divisional|d9|yogas|fourTransformations|natalTransformations|transformations|sanFangSiZheng/i.test(key))).map(([key,v])=>[key,scoped(v,premium)]));
}
export function withPreventionTiming(context:DomainContext):DomainContext {
 if(context.domain!=='saju')return context;
 const pillars=context.facts.find(f=>f.label==='pillars')?.value as Record<string,string>;
 const details=preventionPillarDetails(pillars);
 return {...context,facts:context.facts.map(f=>{
   if(!['yearlyLuck','monthlyLuck'].includes(f.label)||!Array.isArray(f.value))return f;
   return {...f,value:f.value.map(row=>({...row,natalInteractions:buildLuckNatalInteractions(canonicalPreventionPillar(row.pillar),details,{includeGroups:true})}))};
 })};
}
export function buildPreventionFact(context:DomainContext,tier:PackageId):Evidence {
 const premium=tier!=='flounder';
 const values=Object.fromEntries(context.facts.map(f=>[f.label,f.value])) as Record<string,any>;
 const labels=[...inputs[context.domain],...(premium?['majorLuck','yearlyLuck','yearlyTimeline','monthlyLuck','vimshottariDasha']:['yearlyLuck','yearlyTimeline','monthlyLuck'])];
 const anchors=context.facts.filter(f=>labels.includes(f.label)).map(f=>({...f,value:scoped(f.value,premium)}));
 const periodRows=(values.yearlyLuck||[]);
 const periods=[...(Array.isArray(periodRows)?periodRows:[]).slice(0,premium?10:2).map((r:any)=>({kind:'year',year:r.year,pillar:r.pillar})),
   ...(values.monthlyLuck||[]).slice(0,12).map((r:any)=>({kind:'month',year:r.start?.year,month:r.start?.month,pillar:r.pillar})),
   ...(premium&&values.majorLuck?.currentCycle?[{...values.majorLuck.currentCycle,kind:'major'}]:[])];
 const saju=context.domain==='saju'?buildSajuPrevention({pillars:values.pillars,strength:values.strengthHeuristic,jong:values.jong,shinsal:values.shinsal,periods}):undefined;
 // Partner evidence contains no independently calculated balance: do not borrow the owner's useful elements.
 const partner=context.domain==='saju'&&values.partnerChart?.pillars?buildSajuPrevention({pillars:values.partnerChart.pillars,subject:'partner'}):undefined;
 return {id:`${context.domain}.${LABEL}`,label:LABEL,value:{version:PREVENTION_VERSION,system:context.domain,
   anchors,...(saju?{saju}:{}),...(partner?{partner}:{}),interpretation:domainAdvice[context.domain],limitations:context.limitations,
   rule:'anchors의 ID는 원본 추적용이다. 결과 sources에는 현재 전달된 바깥 fact ID를 사용한다. 주의점이 약하면 제한을 설명하고 개수를 채우지 않는다.'}};
}

const sections:Pick<ReadingSectionSpec,'id'|'title'|'role'|'instruction'>[]=[
 {id:'evidence',title:'우선 살펴볼 근거',role:'interpretation',instruction:'질문에 맞는 근거가 뚜렷한 주의점을 최대 3개 선정하고 실제 근거와 대상을 밝힌다. 근거가 적으면 한계를 설명한다. 여러 체계는 따로 밝히며 단순 중복을 독립 증거로 세지 않는다.'},
 {id:'conditions',title:'기회와 부담이 갈리는 조건',role:'interpretation',instruction:'선정한 주의점마다 활력·기회로 쓰일 조건과 갈등·부담으로 커질 조건을 비교한다. 근거가 있는 기간만 연결한다. 끌림과 안정성은 다르다.'},
 {id:'signals',title:'생활에서 알아차릴 신호',role:'interpretation',instruction:'선정한 주의점마다 사용자가 실제 생활에서 확인할 신호를 구체적으로 제시하되 이미 겪었다고 단정하지 않는다.'},
 {id:'action',title:'피할 행동과 대신 할 선택',role:'action',instruction:'선정한 주의점마다 피할 행동과 대신 할 행동을 짝지어 제시한다. 단순히 조심하라고 끝내지 않는다. 관계 속도·합의·책임 범위 등 해당 질문의 행동으로 풀어쓴다.'},
 {id:'limits',title:'나를 돕는 조건과 해석의 여지',role:'interpretation',instruction:'실제 근거에 있는 완충 요인과 판단의 불확실성을 밝힌다. 도움이 되는 구조도 사건 회피를 보장하지 않는다.'},
];
// Only prepare() invokes this: saved chapter IDs, counts and contexts are never migrated.
export function withPreventionReading(manifest:ChapterSpec[],analysis:MasterAnalysis,tier:PackageId):ChapterSpec[] {
 if(!preventionEligible(tier)||manifest.some(c=>c.key==='prevention'))return manifest;
 for(const context of Object.values(analysis.contexts)){
   context.facts=[...context.facts.filter(f=>f.label!==LABEL),buildPreventionFact(context,tier)];
 }
 const systems=Object.keys(analysis.contexts) as DomainId[];
 const target:[number,number]=systems.length>1?[2600,3300]:[1800,2400];
 const chapter:ChapterSpec={id:`${tier}-prevention-v1`,key:'prevention',version:READING_V6_VERSION,preventionVersion:PREVENTION_VERSION,
   tier,title:PREVENTION_TITLE,part:'실천과 점검',theme:'action',ordinal:manifest.length,systems,
   factSelectors:Object.fromEntries(systems.map(d=>[d,[LABEL]])),focus:PREVENTION_RULES,
   periodScope:'주의점의 근거에 기록된 대상과 기간만 사용한다. 기간이 없으면 성향과 실천 기준만 설명한다.',
   minimumChars:Math.floor(target[0]*.7),targetChars:target,outputTokens:tokensRequiredForChars(target[1]+600),
   sections:sections.map(s=>({...s,minimumChars:Math.floor(target[0]*.7/sections.length),targetChars:target.map(n=>Math.ceil(n/sections.length)) as [number,number]}))};
 return [...manifest.map(c=>({...c,preventionVersion:PREVENTION_VERSION})),chapter];
}

// Fields stay frozen in analysis. v7 facts still use their original ledger; this additional packet is
// selected explicitly, so no historical owns/refs assignment changes or unknown facts reach the model.
export function preventionFacts(context:DomainContext,chapter:ChapterSpec):Evidence[] {
 if(!hasPrevention(chapter)||chapter.key!=='prevention')return [];
 const fact=context.facts.find(f=>f.label===LABEL);
 return fact?[fact]:[];
}
