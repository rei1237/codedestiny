import {buildLuckNatalInteractions} from '../../../lib/life-book-ai-saju.js';

// 1A: the stored yearly/monthly rows only relate each luck pillar to the natal chart (life-book-ai-saju.js
// buildLuckNatalInteractions), so a 세운×대운 relation was left for the model to guess. This joins the 대운 that
// covers each row as one more pillar: pairs are luck×대운 only, and a group (형·삼합·방합) counts only when it needs
// both the luck row and the 대운, judged on 대운 + 세운/월운 + 원국 branches together.
type Row=Record<string,any>;
type Hit={type:string;label:string;pillars:string[];pillarLabels?:string[];values?:string[];branches?:string[]};
export const LUCK_OVERLAP_RULE='대운과 세운·월운이 만나는 관계만 계산했다. 세 지지가 모여야 하는 형·삼합·방합은 대운·세운(월운)·원국 지지를 합쳐 셋이 모두 있을 때만 성립한다. 관계가 비어 있으면 계산된 겹침 관계가 없다는 뜻이다. 운과 원국의 관계는 각 행의 natalInteractions에 따로 있다.';

function cycleFor(cycles:Row[],year:number,date?:string){
 // A month that starts after this year's 교운일 belongs to the new 대운 (saju/major-luck.ts dates); older rows have years only.
 return date&&cycles.some(c=>c.startDate)?cycles.find(c=>(c.startDate||'')<=date&&date<=c.endDate&&c.pillar):cycles.find(c=>Number(c.startYear)<=year&&year<=Number(c.endYear)&&c.pillar);
}
function relations(pillar:string,luckLabel:string,cycle:Row,pillarDetails:Row){
 const details={...pillarDetails,major:{label:'대운',pillar:cycle.pillar,heavenlyStem:cycle.heavenlyStem,earthlyBranch:cycle.earthlyBranch}};
 const all=buildLuckNatalInteractions(pillar,details,{includeGroups:true}) as Record<string,Hit[]>;
 return Object.values(all).flat().filter(hit=>hit.pillars.includes('major')).map(hit=>({type:hit.type,label:hit.label,
  between:[...new Set((hit.pillarLabels||[]).map(x=>x==='운'?luckLabel:x))],...(hit.values?{values:hit.values}:{}),...(hit.branches?{branches:hit.branches}:{})}));
}

/** Derived per request from stored facts; returns undefined when the chart has no 대운 or luck rows (birth time unknown). */
export function buildLuckOverlap(facts:{label:string;value:unknown}[]){
 const value=(label:string)=>facts.find(f=>f.label===label)?.value as any;
 const cycles:Row[]=Array.isArray(value('majorLuck')?.cycles)?value('majorLuck').cycles:[];
 const pillarDetails=value('pillarDetails');
 if(!cycles.length||!pillarDetails||typeof pillarDetails!=='object')return undefined;
 const years=(Array.isArray(value('yearlyLuck'))?value('yearlyLuck') as Row[]:[]).flatMap(r=>{
  const cycle=Number.isInteger(r.year)&&r.pillar?cycleFor(cycles,r.year):undefined;
  return cycle?[{year:r.year,pillar:r.pillar,majorLuckPillar:cycle.pillar,relations:relations(r.pillar,'세운',cycle,pillarDetails)}]:[];
 });
 const months=(Array.isArray(value('monthlyLuck'))?value('monthlyLuck') as Row[]:[]).flatMap(r=>{
  const year=Number(r.start?.year),date=Number.isInteger(year)?`${year}-${String(r.start.month).padStart(2,'0')}-${String(r.start.day).padStart(2,'0')}`:undefined;
  const cycle=Number.isInteger(year)&&r.pillar?cycleFor(cycles,year,date):undefined;
  return cycle?[{year,month:r.start.month,pillar:r.pillar,majorLuckPillar:cycle.pillar,relations:relations(r.pillar,'월운',cycle,pillarDetails)}]:[];
 });
 return years.length||months.length?{rule:LUCK_OVERLAP_RULE,years,months}:undefined;
}
