import type {DomainContext} from '../fortune/shared/contracts';

// 13A: a local pre-send estimate, no provider call. llm-client still runs Gemini countTokens and fails closed at
// 50,000; this keeps a chapter request at or under 40,000 by dropping the facts a chapter can lose first.
// Calibrated on the 2026-10-09 MA/MO recorded calls (0.371~0.375 tokens per request char); 0.38 keeps a margin.
export const CHAPTER_INPUT_TOKEN_TARGET=40000;
export const TOKENS_PER_CHAR=.38;
// 기준일 하루 근거 → 연도별 자미 표 → 하우스 표 → 각 → 월운 순서로 뺀다. 한 체계의 마지막 fact 는 남긴다.
export const FACT_LADDER=[/^today/,/^yearlyTimeline$/,/^houseCusps$/,/^houses$/,/^aspects$/,/^monthlyLuck$/];
// 2026-11-18: 사주 대운 해석(saju/cycle-evidence.ts)은 주기마다 수천 자다. 사다리 뒤에도 넘으면 fact 를 빼지 않고
// 해석만 줄인다: 현재가 아닌 주기의 interpretation → 남은 interpretation 의 세운(annual) 행. 이름·기간은 남는다.
const CYCLE_FACTS=/^(majorLuck|questionTiming)$/;
type Cycle={isCurrent?:boolean;interpretation?:{annual?:unknown}&Record<string,unknown>}&Record<string,unknown>;
const CYCLE_RUNGS:{name:string;cycle:(c:Cycle,current:boolean)=>Cycle}[]=[
 {name:'pastAndFutureCycleInterpretation',cycle:(c,current)=>{if(current||!c.interpretation)return c;const {interpretation:_omit,...rest}=c;return rest;}},
 {name:'cycleAnnual',cycle:c=>{if(!c.interpretation?.annual)return c;const {annual:_omit,...interpretation}=c.interpretation;return {...c,interpretation};}},
];

type Sized={system:string;domainRules:string;calculatedData:unknown;outputSchema:unknown;userQuestion?:string};
export const estimateRequestTokens=(request:Sized)=>Math.ceil((request.system.length+request.domainRules.length
 +JSON.stringify(request.calculatedData).length+JSON.stringify(request.outputSchema).length+(request.userQuestion||'').length)*TOKENS_PER_CHAR);

function compactCycles(value:unknown,rung:typeof CYCLE_RUNGS[number]):unknown{
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const data=value as Record<string,unknown>,out:Record<string,unknown>={...data};
 for(const key of ['cycles','periods'])if(Array.isArray(data[key]))out[key]=(data[key] as Cycle[]).map(c=>c&&typeof c==='object'?rung.cycle(c,c.isCurrent===true):c);
 if(data.currentCycle&&typeof data.currentCycle==='object')out.currentCycle=rung.cycle(data.currentCycle as Cycle,true);
 return JSON.stringify(out)===JSON.stringify(data)?value:out;
}

export function fitChapterFacts<T extends Sized>(facts:DomainContext,build:(facts:DomainContext)=>T,limit=CHAPTER_INPUT_TOKEN_TARGET):{request:T;dropped:string[];estimatedTokens:number}{
 let current=facts,request=build(current);
 const dropped:string[]=[];
 const systemOf=(id:string)=>id.split('.')[0];
 for(const rung of FACT_LADDER){
  if(estimateRequestTokens(request)<=limit)break;
  const before=current.facts.length;
  for(const fact of current.facts.filter(f=>rung.test(f.label))){
   if(current.facts.filter(f=>systemOf(f.id)===systemOf(fact.id)).length<=1)continue;
   current={...current,facts:current.facts.filter(f=>f!==fact)};
   dropped.push(fact.id);
  }
  if(current.facts.length!==before)request=build(current);
 }
 for(const rung of CYCLE_RUNGS){
  if(estimateRequestTokens(request)<=limit)break;
  let changed=false;
  const next=current.facts.map(f=>{
   if(!CYCLE_FACTS.test(f.label))return f;
   const value=compactCycles(f.value,rung);
   if(value===f.value)return f;
   changed=true;dropped.push(`${f.id}#${rung.name}`);
   return {...f,value} as typeof f;
  });
  if(changed){current={...current,facts:next};request=build(current);}
 }
 const estimatedTokens=estimateRequestTokens(request);
 // The provider's countTokens still decides at 50,000; this only records a request the ladder could not fit.
 if(estimatedTokens>limit)console.warn('yeongnyangi_chapter_input_over_target',JSON.stringify({estimatedTokens,limit,dropped}));
 return {request,dropped,estimatedTokens};
}
