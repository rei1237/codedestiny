import {buildLuckJudgement,buildNatalJudgementFacts,SAJU_LUCK_JUDGEMENT_VERSION} from '../../../lib/saju-luck-judgement.js';
import type {DomainContext} from '../shared/contracts';

// S15-6: the shared saju judgement (worker/lib/saju-luck-judgement.js) for a 영냥이 chapter. It is derived at the
// fact boundary from the stored pillars and the luck rows the chapter already selected, so a chapter judges only the
// 대운·세운·월운 it reads and stored contexts need no migration. It replaces "용신 오행이 오면 좋은 해" reading:
// each period carries a verdict built from 합거·합화·충·형·입묘 and the 대운 backdrop.
type Fact=DomainContext['facts'][number];
type Row=Record<string,any>;
const NATAL_LABELS=['usefulGod','seasonalBalance','strengthHeuristic','jong'];
const LUCK_LABELS=['majorLuck','yearlyLuck','monthlyLuck','luckOverlap'];
const STEMS='甲乙丙丁戊己庚辛壬癸',BRANCHES='子丑寅卯辰巳午未申酉戌亥';
const MAX_CYCLES=3;
const yearPillar=(year:number)=>STEMS[((year-4)%10+10)%10]+BRANCHES[((year-4)%12+12)%12];
const rows=(v:unknown):Row[]=>Array.isArray(v)?v:v&&typeof v==='object'?[v as Row]:[];
// The 丑 month starts at 소한, before 입춘, so it still belongs to the previous saju year.
const sajuYearOf=(row:Row)=>Number(row.start?.year)-(String(row.pillar||'')[1]==='丑'?1:0);
const brief=({label,verdict,headline}:Row)=>({label,verdict,headline});
const present=<T,>(row:T|null):row is T=>row!==null;

function cycleFor(cycles:Row[],year:number){
 return cycles.find(c=>Number(c.startYear)<=year&&year<=Number(c.endYear))?.pillar||null;
}

/**
 * The chapter's luckJudgement fact, or null. Natal judgement rides with a chapter that reads 용신·조후·강약 or any luck
 * period. Below the premium tiers the 용신 element stays out like usefulGod: a period keeps only its verdict, because the
 * headline and reasons name the element.
 */
export function sajuLuckJudgementFact(context:DomainContext,selected:Fact[],premium:boolean):Fact|null{
 if(context.domain!=='saju'||selected.some(f=>f.label==='luckJudgement'))return null;
 const pillars=context.facts.find(f=>f.label==='pillars')?.value as Row|undefined;
 if(!pillars?.day)return null;
 const labels=new Set(selected.map(f=>f.label));
 const readsLuck=LUCK_LABELS.some(l=>labels.has(l));
 if(!readsLuck&&!NATAL_LABELS.some(l=>labels.has(l)))return null;
 const timeUnknown=!pillars.hour;
 const built=buildNatalJudgementFacts(pillars,{timeUnknown});
 if(!built)return null;
 const natal:Row={...built};
 delete natal.version;
 if(!premium)delete natal.yongsin;
 const value:Row={version:SAJU_LUCK_JUDGEMENT_VERSION,natal};
 if(readsLuck){
  const all=context.facts;
  const cycles=rows((all.find(f=>f.label==='majorLuck')?.value as Row|undefined)?.cycles);
  const yearly=rows(all.find(f=>f.label==='yearlyLuck')?.value);
  const daeunOf=(year:number)=>yearly.find(r=>r.year===year)?.majorLuckPillar||cycleFor(cycles,year);
  const pick=(label:string)=>selected.filter(f=>f.label===label).flatMap(f=>rows(f.value));
  const chosen=new Map<number,Row>();
  for(const v of pick('majorLuck'))for(const c of [v.currentCycle,v.cycle,...rows(v.cycles)])if(c?.pillar&&!chosen.has(c.index))chosen.set(c.index,c);
  const daeun=[...chosen.values()].slice(0,MAX_CYCLES).map(c=>buildLuckJudgement(pillars,{daeun:c.pillar,timeUnknown,
   label:`대운 ${c.startYear}~${c.endYear}${c.isCurrent||c.index===(all.find(f=>f.label==='majorLuck')?.value as Row|undefined)?.currentCycle?.index?' (지금)':''}`})).filter(present);
  const years=[...new Set([...pick('yearlyLuck'),...rows(pick('luckOverlap').flatMap(o=>rows(o.years)))].map(r=>Number(r.year)).filter(Number.isInteger))]
   .map(year=>buildLuckJudgement(pillars,{seun:yearly.find(r=>r.year===year)?.pillar||yearPillar(year),daeun:daeunOf(year),label:`${year}년`,timeUnknown})).filter(present);
  const months=pick('monthlyLuck').filter(r=>r.pillar&&Number.isInteger(r.start?.year)).map(r=>{
   const y=sajuYearOf(r);
   const row=buildLuckJudgement(pillars,{wolun:r.pillar,seun:yearly.find(x=>x.year===y)?.pillar||yearPillar(y),daeun:daeunOf(y),
    label:`${r.start.year}-${String(r.start.month).padStart(2,'0')} 절입(${r.pillar})`,timeUnknown});
   return row&&brief(row);
  }).filter(present);
  const tier=(list:Row[])=>premium?list:list.map(({label,verdict})=>({label,verdict}));
  if(daeun.length)value.daeun=tier(daeun);
  if(years.length)value.years=tier(years);
  if(months.length)value.months=tier(months);
 }
 return {id:'saju.luckJudgement',label:'luckJudgement',value} as Fact;
}
