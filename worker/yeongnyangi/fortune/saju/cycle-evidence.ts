import {buildSajuAdvancedFactors} from '../../../lib/saju-ai-prompt.js';
import {explanationFacts} from '../shared/privacy';
import type {DomainContext} from '../shared/contracts';

export const SAJU_CYCLE_VERSION='saju-cycle-evidence-v1';
type Row=Record<string,any>;
const pick=(row:Row,keys:string[])=>Object.fromEntries(keys.filter(key=>row?.[key]!==undefined).map(key=>[key,row[key]]));
const luckRow=(row:Row,scope:string)=>({scope,stem:row.heavenlyStem||row.pillar?.[0],branch:row.earthlyBranch||row.pillar?.[1],
  age:row.startAge,year:row.year,label:scope==='daewoon'?`${row.startYear}–${row.endYear} ${row.pillar}`:`${row.year} ${row.pillar}`});

/** Fixed projection, no prompt prose/config or raw birth data in cycle evidence. */
export function projectAdvancedFactors(raw:Row):Row {
  return explanationFacts({
    hiddenStems:raw.hiddenStems,
    hiddenStemExposures:raw.hiddenStemExposures?.map((r:Row)=>pick(r,['hiddenStem','sourceBranches','exposedInNatalHeavenlyStem','exposedNatalPositions','exposedByLuckStem','exposedLuckPositions','interpretationLevel','favorable'])),
    doChung:pick(raw.doChung,['exists','repeatedBranch','repeatedCount','inducedOppositeBranch','strength','affectedAreas']),
    earthStorageOpenings:raw.earthStorageOpenings?.map((r:Row)=>pick(r,['sourceBranch','sourcePosition','triggerBranch','triggerPosition','relationType','openingStrength','openedHiddenStems','mainActivatedTenGods','affectedAreas','timingType','timingLabel','isFavorableOverall'])),
    gyeokguk:pick(raw.gyeokguk,['finalGyeokguk','finalType','judgmentReason','confident','monthBranch','monthHiddenStems','candidates','breakFactors','luckTiming']),
  }) as Row;
}

// Repeat only changes against the natal/decade baseline, not its entire hidden-stem table in every year.
function periodFactors(raw:Row,baseline:Row):Row {
  const changed=(rows:Row[]=[],before:Row[]=[])=>rows.filter(row=>!before.some(old=>JSON.stringify(old)===JSON.stringify(row)));
  return {
    hiddenStemExposures:changed(raw.hiddenStemExposures,baseline.hiddenStemExposures),
    doChung:JSON.stringify(raw.doChung)===JSON.stringify(baseline.doChung)?{exists:raw.doChung?.exists,unchangedFromBaseline:true}:raw.doChung,
    earthStorageOpenings:changed(raw.earthStorageOpenings,baseline.earthStorageOpenings),
    structureConditions:{breakFactors:changed(raw.gyeokguk?.breakFactors,baseline.gyeokguk?.breakFactors),luckTiming:raw.gyeokguk?.luckTiming},
  };
}

/** New purchase preparation only. Never combine mutually exclusive decades/years. */
export function withSajuCycleEvidence(context:DomainContext,asOf:string):DomainContext {
  if(context.domain!=='saju')return context;
  const values=Object.fromEntries(context.facts.map(f=>[f.label,f.value])) as Row;
  const major=values.majorLuck;
  if(!Array.isArray(major?.cycles)||!values.advancedFactors)return context;
  const pillars=Object.fromEntries(Object.entries(values.pillars||{}).map(([key,value])=>{
    const text=String(value||'');return [key,{g:text[0]||'',j:text[1]||''}];
  }));
  const source={pillars,power:values.strengthHeuristic,jong:values.jong,promptConfig:values.advancedFactors.promptConfig};
  const calculate=(rows:Row[])=>projectAdvancedFactors(buildSajuAdvancedFactors(source,undefined,{luckRows:rows}));
  const natal=calculate([]);
  const annual=Array.isArray(values.yearlyLuck)?values.yearlyLuck:[];
  const cycles=major.cycles.map((cycle:Row)=>{
    const advanced=calculate([luckRow(cycle,'daewoon')]);
    // Natal identity remains authoritative; period helpers may report pressure/activation, not a new natal chart.
    return {...cycle,interpretation:{version:SAJU_CYCLE_VERSION,asOf,
      ...periodFactors(advanced,natal),
      annual:annual.filter((y:Row)=>y.year>=cycle.startYear&&y.year<=cycle.endYear).map((y:Row)=>{
        const joint=calculate([luckRow(cycle,'daewoon'),luckRow(y,'sewoon')]);
        return {year:y.year,pillar:y.pillar,...periodFactors(joint,advanced)};
      })}};
  });
  const updated={...major,counselVersion:SAJU_CYCLE_VERSION,cycles,currentCycle:cycles.find((c:Row)=>c.index===major.currentCycle?.index)||null};
  return {...context,facts:context.facts.map(f=>f.label==='majorLuck'?{...f,value:updated}:f.label==='advancedFactors'?{...f,value:natal}:f)};
}
