import {DomainContext} from './shared/contracts';
import {ChapterSpec} from './book-contracts';
import {isStructuredReading,READING_V6_VERSION,READING_V7_VERSION} from './reading-policy';
import {selectV7Facts} from './reading-v7-ledger';
import {preventionFacts,hasPrevention} from './prevention';
import type {ChapterSpecV7} from './reading-v7';
import {enrichZiweiContext,ziweiPalaceRelationTable} from './ziwei/reading-facts';
import {buildLuckOverlap} from './saju/luck-overlap';
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
// 9A: each card's timeFrame comes from tarot/time-frame.ts at the selectChapterFacts boundary. Image fields are
// presentation-only, so the prompt copy drops them.
const TAROT_IMAGE_FIELDS=['imageKey','imageUrl','imageCandidates','proxyImageUrl','localImageUrl'];
function tarotPromptCards(value:unknown){
 if(!Array.isArray(value))return value;
 return value.map(card=>card&&typeof card==='object'?Object.fromEntries(Object.entries(card).filter(([key])=>!TAROT_IMAGE_FIELDS.includes(key))):card);
}
// 3A: the base selector carries each pillar's ten gods so a chapter never names a pillar's ten god from memory.
function tenGodsSummary(value:unknown){
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value as Record<string,any>).filter(([,p])=>p&&typeof p==='object').map(([key,p])=>[key,
  {label:p.label,pillar:p.pillar,stemTenGod:p.stemTenGod,branchMainTenGod:p.primaryHiddenTenGod,branchTenGods:p.branchTenGods}]));
}
// 4: the years a chapter reads. Question chapters carry the requested period (timeScope); 올해 장은 저장된 첫 연도,
// 내년 예고 장은 그다음 연도를 읽는다. Other chapters keep the old default (the first stored yearly row).
function scopeYears(chapter:ChapterSpec,first:unknown):number[]|undefined{
 if(chapter.timeScope?.years?.length)return chapter.timeScope.years;
 if(typeof first!=='number'||!Number.isInteger(first))return undefined;
 if(chapter.key==='life-next-year')return [first+1];
 return ['life-year','question-year'].includes(chapter.key||'')?[first]:undefined;
}
const dayOf=(start:any)=>[start?.year,start?.month,start?.day].every(Number.isInteger)?`${start.year}-${String(start.month).padStart(2,'0')}-${String(start.day).padStart(2,'0')}`:'';
// A solar-term month runs from its 절입 to the next row's 절입; the last stored row is taken to run about a month.
function monthsInScope<T extends {start?:any}>(rows:T[],chapter:ChapterSpec,first:unknown):T[]{
 const scope=chapter.timeScope;
 if(scope?.start&&scope.end)return rows.filter((r,i)=>{
  const from=dayOf(r.start);if(!from)return false;
  const until=dayOf(rows[i+1]?.start)||new Date(Date.parse(from)+32*864e5).toISOString().slice(0,10);
  return from<=scope.end&&until>scope.start;
 });
 const years=scopeYears(chapter,first);
 return years?rows.filter(r=>years.includes(r.start?.year)):rows;
}
function selectedFacts(context:DomainContext,chapter:ChapterSpec) {
 const premium=Boolean(chapter.questionPolicy)||['tuna','assorted','omakase'].includes(chapter.tier||'');
 const selectors=chapter.factSelectors?.[context.domain]||[];
 const allowed=new Map<string,{whole:boolean;paths:string[];palaces:string[]}>();
 for(const selector of selectors){const match=selector.match(/^([^.[\]]+)(?:\[([^\]]+)\]|\.(.+))?$/);if(!match)continue;const [,label,names,path]=match;const entry=allowed.get(label)||{whole:false,paths:[],palaces:[]};if(names)entry.palaces.push(...names.split(','));else if(path)entry.paths.push(path);else entry.whole=true;allowed.set(label,entry);}
 // 과거 경험 보정은 대운·세운을 읽는 장에만 따라붙는다. 설문이 없으면 fact가 없으므로 장 구성(manifest)은 그대로다.
 const luckChapter=['majorLuck','yearlyLuck','luckOverlap'].some(label=>allowed.has(label));
 return context.facts.flatMap(f=>{
  const selection=f.label==='experienceCalibration'&&context.domain==='saju'&&premium&&luckChapter?{whole:true,paths:[],palaces:[]}:allowed.get(f.label);if(!selection||chapter.factIds&&!chapter.factIds.includes(f.id))return [];
  if(!premium&&/usefulGod|jong|majorLuck|luckOverlap|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/.test(f.label))return [];
  let value=f.value;
  // 4·13A: a chapter scoped to a requested period drops rows that describe another time — the 기준일 하루 근거
  // (today*) when 기준일 is outside the period, and a stored 유년 of a year the period does not cover.
  if(chapter.timeScope){
   const day=context.calculatedAt?.slice(0,10);
   if(/^today/.test(f.label)&&day&&(day<chapter.timeScope.start||day>chapter.timeScope.end))return [];
  }
  // The stored 유년 is the base year's; a chapter that reads another year (내년 예고, a later requested period) drops it.
  if(context.domain==='ziwei'&&f.label==='yearlyLuck'&&typeof (value as {year?:unknown})?.year==='number'){
   const year=(value as {year:number}).year,years=chapter.timeScope?.years||(chapter.questionPolicy?undefined:scopeYears(chapter,year));
   if(years&&!years.includes(year))return [];
  }
  if(!selection.whole){
   // 14A: 신궁 is forced in only where the reader's own nature or money is the subject.
   if(selection.palaces.length&&Array.isArray(value))value=value.filter(p=>selection.palaces.includes(p.name)||['self','wealth'].includes(chapter.theme)&&p.name===context.facts.find(x=>x.label==='bodyPalace')?.value);
   else if(f.label==='tenGodsByPillar'&&selection.paths.includes('summary'))value=tenGodsSummary(value);
   else if(selection.paths.length&&value&&typeof value==='object')value=Object.fromEntries(selection.paths.filter(path=>Object.hasOwn(value as object,path)).map(path=>[path,(value as Record<string,unknown>)[path]]));
  }
  if(f.label==='vimshottariDasha'&&value&&typeof value==='object'&&'periods' in value){
   const data=value as {periods:Record<string,unknown>[]};
   // The birth-balance period can contain a raw birth date; future chapters need only upcoming periods.
   const asOf=context.calculatedAt.slice(0,10);
   value={...data,periods:data.periods.filter(p=>typeof p.startDate==='string'&&p.startDate>asOf).slice(0,2)};
  }
  if(!chapter.questionPolicy&&f.label==='majorLuck'&&context.domain==='saju'&&value&&typeof value==='object'){
   const data=value as {currentCycle?:{index:number};cycles?:{index:number}[];direction?:string;ageRule?:string;daeunNumber?:number;transition?:unknown};
   // Dated charts (saju/major-luck.ts) keep the naming rule, 대운수 and this year's 교운 with every projection.
   const head={direction:data.direction,...(data.ageRule?{ageRule:data.ageRule,daeunNumber:data.daeunNumber,...(data.transition?{transition:data.transition}:{})}:{})};
   const next=chapter.key==='next'||chapter.version===READING_V6_VERSION&&chapter.key==='preparation';
   // 4: 10년 주기 장은 지금의 10년과 다음 10년을 함께 읽는다.
   const compare=chapter.version===READING_V6_VERSION&&['alternatives','limits'].includes(chapter.key||'')||chapter.key==='life-decade';
   value=chapter.counsel?.cycleIndexes?{...head,cycles:data.cycles?.filter(c=>chapter.counsel!.cycleIndexes!.includes(c.index))}:next||compare?{...head,...(compare?{currentCycle:data.currentCycle}:{}),cycles:data.currentCycle?data.cycles?.filter(c=>c.index>data.currentCycle!.index).slice(0,1):[],limitation:data.currentCycle?undefined:'현재 주기를 확인할 수 없어 다음 전환을 특정하지 않는다.'}:{...head,currentCycle:data.currentCycle};
  }
  if(!chapter.questionPolicy&&context.domain==='saju'&&['yearlyLuck','monthlyLuck','luckOverlap'].includes(f.label)){
   const yearly=context.facts.find(x=>x.label==='yearlyLuck')?.value,first=Array.isArray(yearly)?yearly[0]?.year:undefined;
   const years=scopeYears(chapter,first);
   const pickYears=(rows:any[])=>years?rows.filter(r=>years.includes(r.year)):rows.slice(0,1);
   if(f.label==='yearlyLuck'&&Array.isArray(value))value=pickYears(value);
   if(f.label==='monthlyLuck'&&Array.isArray(value))value=monthsInScope(value,chapter,first);
   if(f.label==='luckOverlap'&&value&&typeof value==='object'){
    const v=value as {rule:string;years:any[];months:any[]};
    const months=monthsInScope(v.months.map(m=>({...m,start:{year:m.year,month:m.month,day:1}})),chapter,first).map(({start:_start,...m})=>m);
    value={rule:v.rule,years:pickYears(v.years),months};
   }
  }
  if(!chapter.questionPolicy&&context.domain==='ziwei'&&f.label==='yearlyTimeline'&&Array.isArray(value)){
   const years=scopeYears(chapter,(context.facts.find(x=>x.label==='yearlyLuck')?.value as {year?:number}|undefined)?.year);
   if(years)value=value.filter(r=>years.includes(r.year));
  }
  if(context.domain==='tarot'&&f.label==='cards')value=tarotPromptCards(value);
  if(f.label==='shinsal')value={signals:relationshipSignals(value),limitation:'매력·교류의 단서이며 실제 외도 여부나 확률이 아니다. 자료 없음은 낮은 위험을 뜻하지 않는다.'};
  // 2A: a palace subset still carries the full 12-palace 대궁·삼합 table so a relation is never guessed.
  if(f.label==='palaces'&&Array.isArray(value))value={palaces:value,distinctPlacements:ziweiTraitEvidence(value,context.facts.find(x=>x.label==='bodyPalace')?.value),
   ...(Array.isArray(f.value)&&value.length<f.value.length?{relationTable:ziweiPalaceRelationTable(f.value),relationRule:'relationTable은 12궁 전체의 대궁(facing)·삼합(trines) 이름표다. 여기 없는 궁과의 관계도 이 표로만 말한다.'}:{}),rule:'명궁·신궁 역할이 같아도 동일 궁·별 배치는 독립 증거로 중복 계산하지 않는다.'};
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
// 1A: 세운·월운×대운 relations are derived from the stored rows on each call, so stored snapshots need no migration.
function withLuckOverlap(context:DomainContext):DomainContext{
 if(context.domain!=='saju'||context.facts.some(f=>f.label==='luckOverlap'))return context;
 const value=buildLuckOverlap(context.facts);
 return value?{...context,facts:[...context.facts,{id:'saju.luckOverlap',label:'luckOverlap',value} as DomainContext['facts'][number]]}:context;
}
export function selectChapterFacts(context:DomainContext,chapter:ChapterSpec,topic='general'){
 // 자미 궁 강약·관계·판단 문장은 저장 context 가 아니라 여기서 붙인다 — v6·v7·주의점·옛 주제 경로가 모두 이 입구를 지난다.
 context=enrichTarotTimeFrames(enrichZiweiContext(context));
 const prevention=preventionFacts(context,chapter);
 if(hasPrevention(chapter)&&chapter.key==='prevention')return prevention;
 // v7 replaces selectors with the fact ledger: a chapter sees exactly the IDs it owns plus the ones it may reference.
 // The ledger is rebuilt from the same stored context every time, so prepare and generation resolve identical IDs.
 if(chapter.version===READING_V7_VERSION)return [...selectV7Facts(context,chapter as ChapterSpecV7),...prevention];
 if(isStructuredReading(chapter.version))return [...selectedFacts(withLuckOverlap(context),chapter),...prevention];
 const pattern=filters[topic];
 let facts=pattern?context.facts.filter(f=>pattern.test(f.label)||/pillars|dayMaster|lagna|ascendant|spread/i.test(f.label)):context.facts;
 if(!facts.length)facts=context.facts;
 if(chapter.factIds)facts=facts.filter(f=>chapter.factIds!.includes(f.id));
 return facts;
}
