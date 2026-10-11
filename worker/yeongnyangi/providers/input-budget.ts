import type {DomainContext} from '../fortune/shared/contracts';

// 13A: a local pre-send estimate, no provider call. llm-client still runs Gemini countTokens and fails closed at
// 50,000; this keeps a chapter request at or under 40,000 by dropping the facts a chapter can lose first.
// Calibrated on the 2026-10-09 MA/MO recorded calls (0.371~0.375 tokens per request char); 0.38 keeps a margin.
export const CHAPTER_INPUT_TOKEN_TARGET=40000;
export const TOKENS_PER_CHAR=.38;
// 기준일 하루 근거 → 연도별 자미 표 → 하우스 표 → 각 → 월운 순서로 뺀다. 한 체계의 마지막 fact 는 남긴다.
export const FACT_LADDER=[/^today/,/^yearlyTimeline$/,/^houseCusps$/,/^houses$/,/^aspects$/,/^monthlyLuck$/];

type Sized={system:string;domainRules:string;calculatedData:unknown;outputSchema:unknown;userQuestion?:string};
export const estimateRequestTokens=(request:Sized)=>Math.ceil((request.system.length+request.domainRules.length
 +JSON.stringify(request.calculatedData).length+JSON.stringify(request.outputSchema).length+(request.userQuestion||'').length)*TOKENS_PER_CHAR);

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
 return {request,dropped,estimatedTokens:estimateRequestTokens(request)};
}
