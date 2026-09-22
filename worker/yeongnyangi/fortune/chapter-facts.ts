import {DomainContext} from './shared/contracts';
import {ChapterSpec} from './book-contracts';
import {isStructuredReading} from './reading-policy';

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
function selectedFacts(context:DomainContext,chapter:ChapterSpec) {
 const premium=['tuna','assorted','omakase'].includes(chapter.tier||'');
 const selectors=chapter.factSelectors?.[context.domain]||[];
 const allowed=new Map<string,{whole:boolean;paths:string[];palaces:string[]}>();
 for(const selector of selectors){const match=selector.match(/^([^.[\]]+)(?:\[([^\]]+)\]|\.(.+))?$/);if(!match)continue;const [,label,names,path]=match;const entry=allowed.get(label)||{whole:false,paths:[],palaces:[]};if(names)entry.palaces.push(...names.split(','));else if(path)entry.paths.push(path);else entry.whole=true;allowed.set(label,entry);}
 return context.facts.flatMap(f=>{
  const selection=allowed.get(f.label);if(!selection||chapter.factIds&&!chapter.factIds.includes(f.id))return [];
  if(!premium&&/usefulGod|jong|majorLuck|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/.test(f.label))return [];
  let value=f.value;
  if(!selection.whole){
   if(selection.palaces.length&&Array.isArray(value))value=value.filter(p=>selection.palaces.includes(p.name)||p.name===context.facts.find(x=>x.label==='bodyPalace')?.value);
   else if(selection.paths.length&&value&&typeof value==='object')value=Object.fromEntries(selection.paths.filter(path=>Object.hasOwn(value as object,path)).map(path=>[path,(value as Record<string,unknown>)[path]]));
  }
  if(f.label==='vimshottariDasha'&&value&&typeof value==='object'&&'periods' in value){
   const data=value as {periods:Record<string,unknown>[]};
   // The birth-balance period can contain a raw birth date; future chapters need only upcoming periods.
   const asOf=context.calculatedAt.slice(0,10);
   value={...data,periods:data.periods.filter(p=>typeof p.startDate==='string'&&p.startDate>asOf).slice(0,2)};
  }
  if(f.label==='majorLuck'&&context.domain==='saju'&&value&&typeof value==='object'){
   const data=value as {currentCycle?:{index:number};cycles?:{index:number}[];direction?:string};
   value=chapter.key==='next'?{direction:data.direction,cycles:data.currentCycle?data.cycles?.filter(c=>c.index>data.currentCycle!.index).slice(0,1):[],limitation:data.currentCycle?undefined:'현재 주기를 확인할 수 없어 다음 전환을 특정하지 않는다.'}:{direction:data.direction,currentCycle:data.currentCycle};
  }
  if(f.label==='yearlyLuck'&&context.domain==='saju'&&Array.isArray(value))value=value.slice(0,1);
  if(f.label==='shinsal')value={signals:relationshipSignals(value),limitation:'매력·교류의 단서이며 실제 외도 여부나 확률이 아니다. 자료 없음은 낮은 위험을 뜻하지 않는다.'};
  if(f.label==='palaces'&&Array.isArray(value))value={palaces:value,distinctPlacements:ziweiTraitEvidence(value,context.facts.find(x=>x.label==='bodyPalace')?.value),rule:'명궁·신궁 역할이 같아도 동일 궁·별 배치는 독립 증거로 중복 계산하지 않는다.'};
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
 if(isStructuredReading(chapter.version))return selectedFacts(context,chapter);
 const pattern=filters[topic];
 let facts=pattern?context.facts.filter(f=>pattern.test(f.label)||/pillars|dayMaster|lagna|ascendant|spread/i.test(f.label)):context.facts;
 if(!facts.length)facts=context.facts;
 if(chapter.factIds)facts=facts.filter(f=>chapter.factIds!.includes(f.id));
 return facts;
}
