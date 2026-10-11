import {DomainContext} from './shared/contracts';
import {ChapterSpec} from './book-contracts';
import {isStructuredReading,READING_V6_VERSION,READING_V7_VERSION} from './reading-policy';
import {selectV7Facts} from './reading-v7-ledger';
import {preventionFacts,hasPrevention} from './prevention';
import type {ChapterSpecV7} from './reading-v7';
import {enrichZiweiContext,ZIWEI_PALACE_RELATIONS} from './ziwei/reading-facts';
import {enrichSajuLuckOverlap} from './saju/luck-overlap';
import {enrichTarotTimeFrames} from './tarot/time-frame';

export function relationshipSignals(value:unknown) {
 const data=value as {byName?:Record<string,{present?:boolean;hits?:unknown[];state?:string}>};
 return ['도화살','홍염살'].map(name=>({name,present:data?.byName?.[name]?.present===true,hits:data?.byName?.[name]?.hits||[],state:data?.byName?.[name]?.state||'자료 없음'}));
}
export function ziweiTraitEvidence(palaces:unknown,bodyPalace:unknown) {
 if(!Array.isArray(palaces))return [];
 const unique=new Map(palaces.map(p=>[p.name,p]));
 return [...unique.values()].map(p=>({palace:p.name,roles:[p.name==='명궁'?'명궁':null,p.name===bodyPalace?'신궁':null].filter(Boolean),stars:[...new Set([...(p.mainStars||[]),...(p.assistantStars||[]),...(p.maleficStars||[])])]}));
}
function cleanEvidence(value:unknown,premium:boolean):unknown {
 if(Array.isArray(value))return value.map(v=>cleanEvidence(v,premium));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>! /prompt|summaryForPrompt/i.test(key) && (premium||! /useful|unfavorable|yongshin|heeShin|jong|majorLuck|dasha|divisional|yogas|fourTransformations|sanFangSiZheng/i.test(key))).map(([key,v])=>[key,cleanEvidence(v,premium)]));
}
function pillarTenGodSummary(value:unknown){
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value as Record<string,{label?:string;pillar?:string;stemTenGod?:string;primaryHiddenTenGod?:string}>).map(([key,p])=>[key,{label:p?.label,pillar:p?.pillar,stemTenGod:p?.stemTenGod,primaryHiddenTenGod:p?.primaryHiddenTenGod}]));
}
// 신궁 궁은 자기 성향·재물 장(manifest groups self·money 와 그 별칭, 융합 인생 장 life-nature·life-money)에서만 따로 붙인다. 다른 장은 고른 궁만 본다.
const BODY_PALACE_CHAPTERS=/^(self|inner|money|spending|expansion|life-nature|life-money)$/;
// 올해·내년 장은 계산 시점 해에서 이만큼 떨어진 해의 연·월 행만 본다. 세 시기 장이 같은 올해 근거를 되풀이하지 않게 한다.
const SCOPE_YEAR:Record<string,number>={'life-year':0,'life-next-year':1};
function selectedFacts(context:DomainContext,chapter:ChapterSpec) {
 const premium=Boolean(chapter.questionPolicy)||['tuna','assorted','omakase'].includes(chapter.tier||'');
 const selectors=chapter.factSelectors?.[context.domain]||[];
 const allowed=new Map<string,{whole:boolean;paths:string[];palaces:string[]}>();
 for(const selector of selectors){const match=selector.match(/^([^.[\]]+)(?:\[([^\]]+)\]|\.(.+))?$/);if(!match)continue;const [,label,names,path]=match;const entry=allowed.get(label)||{whole:false,paths:[],palaces:[]};if(names)entry.palaces.push(...names.split(','));else if(path)entry.paths.push(path);else entry.whole=true;allowed.set(label,entry);}
 return context.facts.flatMap(f=>{
  const selection=allowed.get(f.label);if(!selection||chapter.factIds&&!chapter.factIds.includes(f.id))return [];
  if(!premium&&/usefulGod|jong|majorLuck|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/.test(f.label))return [];
  let value=f.value;
  // base 는 기둥별 십성의 요약만 본다. 기둥 이름 뒤 십성을 지어내지 않게 하고, 전체 표는 그것을 고른 장만 받는다(3A).
  if(!selection.whole&&f.label==='tenGodsByPillar'&&selection.paths.includes('summary'))value=pillarTenGodSummary(value);
  else if(!selection.whole){
   if(selection.palaces.length&&Array.isArray(value))value=value.filter(p=>selection.palaces.includes(p.name)||BODY_PALACE_CHAPTERS.test(chapter.key||'')&&p.name===context.facts.find(x=>x.label==='bodyPalace')?.value);
   else if(selection.paths.length&&value&&typeof value==='object')value=Object.fromEntries(selection.paths.filter(path=>Object.hasOwn(value as object,path)).map(path=>[path,(value as Record<string,unknown>)[path]]));
  }
  if(f.label==='vimshottariDasha'&&value&&typeof value==='object'&&'periods' in value){
   const data=value as {periods:Record<string,unknown>[]};
   // The birth-balance period can contain a raw birth date; future chapters need only upcoming periods.
   const asOf=context.calculatedAt.slice(0,10);
   value={...data,periods:data.periods.filter(p=>typeof p.startDate==='string'&&p.startDate>asOf).slice(0,2)};
  }
  if(!chapter.questionPolicy&&f.label==='majorLuck'&&context.domain==='saju'&&value&&typeof value==='object'){
   const data=value as {currentCycle?:{index:number};cycles?:{index:number}[];direction?:string};
   const next=chapter.key==='next'||chapter.version===READING_V6_VERSION&&chapter.key==='preparation';
   const compare=chapter.version===READING_V6_VERSION&&['alternatives','limits'].includes(chapter.key||'')||chapter.key==='life-decade';
   value=chapter.counsel?.cycleIndexes?{direction:data.direction,cycles:data.cycles?.filter(c=>chapter.counsel!.cycleIndexes!.includes(c.index))}:next||compare?{direction:data.direction,...(compare?{currentCycle:data.currentCycle}:{}),cycles:data.currentCycle?data.cycles?.filter(c=>c.index>data.currentCycle!.index).slice(0,1):[],limitation:data.currentCycle?undefined:'현재 주기를 확인할 수 없어 다음 전환을 특정하지 않는다.'}:{direction:data.direction,currentCycle:data.currentCycle};
  }
  const scope=SCOPE_YEAR[chapter.key||''];
  if(scope!==undefined&&/^(yearlyLuck|monthlyLuck|yearlyTimeline)$/.test(f.label)){
   const year=Number(context.calculatedAt.slice(0,4))+scope,yearOf=(r:any)=>r?.year??r?.start?.year;
   value=Array.isArray(value)?value.filter(r=>yearOf(r)===year):yearOf(value)===year?value:null;
  }
  else if(!chapter.questionPolicy&&f.label==='yearlyLuck'&&context.domain==='saju'&&Array.isArray(value))value=value.slice(0,1);
  if(f.label==='shinsal')value={signals:relationshipSignals(value),limitation:'매력·교류의 단서이며 실제 외도 여부나 확률이 아니다. 자료 없음은 낮은 위험을 뜻하지 않는다.'};
  if(f.label==='palaces'&&Array.isArray(value))value={palaces:value,distinctPlacements:ziweiTraitEvidence(value,context.facts.find(x=>x.label==='bodyPalace')?.value),palaceRelations:ZIWEI_PALACE_RELATIONS,rule:'명궁·신궁 역할이 같아도 동일 궁·별 배치는 독립 증거로 중복 계산하지 않는다.'};
  value=cleanEvidence(value,premium);
  if(value==null||Array.isArray(value)&&!value.length||typeof value==='object'&&!Object.keys(value as object).length)return [];
  return [{...f,value}];
 });
}
const filters:Record<string,RegExp>={
 love:/tenGod|palaces|planet|nakshatra|person|relation|shinsal|love|cards|reading/i,
 relationship:/palaces|planet|person|relation|distance|shinsal|cards|reading/i,
 money:/tenGod|palaces|planet|wealth|strength|advanced|cards|reading/i,
 work:/tenGod|palaces|planet|yoga|strength|career|cards|reading/i,
 luck:/Luck|Timeline|dasha|transit|timing|year|decade|cards|reading/i,
};
export function selectChapterFacts(context:DomainContext,chapter:ChapterSpec,topic='general'){
 // 자미 궁 강약·관계·판단 문장과 사주 운 겹침(1A)·타로 자리의 시간(9A)은 저장 context 가 아니라 여기서 붙인다 — v6·v7·주의점·옛 주제 경로가 모두 이 입구를 지난다.
 context=enrichTarotTimeFrames(enrichSajuLuckOverlap(enrichZiweiContext(context)));
 const prevention=preventionFacts(context,chapter);
 if(hasPrevention(chapter)&&chapter.key==='prevention')return prevention;
 // v7 replaces selectors with the fact ledger: a chapter sees exactly the IDs it owns plus the ones it may reference.
 // The ledger is rebuilt from the same stored context every time, so prepare and generation resolve identical IDs.
 if(chapter.version===READING_V7_VERSION)return [...selectV7Facts(context,chapter as ChapterSpecV7),...prevention];
 if(isStructuredReading(chapter.version))return [...selectedFacts(context,chapter),...prevention];
 const pattern=filters[topic];
 let facts=pattern?context.facts.filter(f=>pattern.test(f.label)||/pillars|dayMaster|lagna|ascendant|spread/i.test(f.label)):context.facts;
 if(!facts.length)facts=context.facts;
 if(chapter.factIds)facts=facts.filter(f=>chapter.factIds!.includes(f.id));
 return facts;
}
