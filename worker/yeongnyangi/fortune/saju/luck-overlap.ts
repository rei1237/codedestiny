import {buildNatalInteractions} from '../../../lib/life-book-ai-saju.js';

// 1A: the engine relates one luck pillar to the natal chart only (buildLuckNatalInteractions), so 세운×대운 and
// 월운×대운 relations, and a 형·삼합·방합 that needs the 대운, the 세운 (or 월운) and the natal branches together,
// were never calculated and the model guessed them (戌未 형 without 丑). The engine is shared, so the overlap is added
// at the chapter fact boundary (selectChapterFacts), like the ziwei palace facts. Stored contexts stay as they are.
// The key carries 'majorLuck', so tiers that do not see 대운 lose it in the same tier filters as majorLuck.
type O=Record<string,any>;
const KINDS=['stemCombinations','stemClashes','branchCombinations','branchClashes','branchHarms','branchBreaks','branchPunishments','threeHarmony','directionalGroups'];
const entry=(label:string,pillar:string)=>({label,pillar,heavenlyStem:pillar[0],earthlyBranch:pillar[1]});

/** Relations that hold only with both the 대운 and this luck pillar: pairs between the two, and groups that need both. */
function overlap(major:string,key:string,label:string,pillar:string,natal:O){
 const all=buildNatalInteractions({...natal,major:entry('대운',major),[key]:entry(label,pillar)}) as Record<string,O[]>;
 const relations=KINDS.flatMap(kind=>(all[kind]||[]).filter(x=>x.pillars.includes('major')&&x.pillars.includes(key))
  .map(({type,label,element,pillarLabels,values,branches})=>({type,label,...(element?{element}:{}),pillarLabels,...(values?{values}:{branches})})));
 return {majorLuckPillar:major,relations};
}

export function enrichSajuLuckOverlap<T extends {domain:string;facts:{label:string;value:unknown}[]}>(context:T):T{
 if(context?.domain!=='saju'||!Array.isArray(context.facts))return context;
 const get=(label:string)=>context.facts.find(f=>f.label===label)?.value as O|undefined;
 const natal=get('pillarDetails'),cycles=get('majorLuck')?.cycles;
 if(!natal||typeof natal!=='object'||!Array.isArray(cycles))return context;
 const majorIn=(year:unknown)=>String(cycles.find((c:O)=>Number(year)>=c.startYear&&Number(year)<=c.endYear)?.pillar||'');
 const rows=(value:unknown,key:string,label:string,yearOf:(r:O)=>unknown)=>Array.isArray(value)?value.map(r=>{
  if(!r||typeof r!=='object'||'majorLuckOverlap' in r||typeof r.pillar!=='string'||r.pillar.length!==2)return r;
  const major=majorIn(yearOf(r));
  return major.length===2?{...r,majorLuckOverlap:overlap(major,key,label,r.pillar,natal)}:r;
 }):value;
 return {...context,facts:context.facts.map(f=>
  f.label==='yearlyLuck'?{...f,value:rows(f.value,'yearly','세운',r=>r.year)}:
  f.label==='monthlyLuck'?{...f,value:rows(f.value,'monthly','월운',r=>r.start?.year)}:f)};
}
