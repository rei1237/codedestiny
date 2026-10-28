import {v7ChapterPolicy} from './reading-policy';
import {TUNA_FOLLOWUP_THINKING_BUDGET,TUNA_REVIEW_MAX_REWRITES} from './tuna-quality';

// Estimated cost guard (design §5). Phase 4 golden runs replace these with measured values.
export const V7_COST={
  tokensPerChar:1.5,
  preambleChars:800,
  thinkingTokens:1024,
  baseInputTokens:15000,
  carryTokensPerChapter:150,
  carryCapTokens:3000,
  askAnalysis:{input:4000,output:1024},
  answerCharsPerQuestion:480,
  maxQuestions:8,
  krwPerUsd:1400,
  retryFactor:1.25,
  maxCostRatio:.1,
  // Conservative all-Pro upper bound for the mixed-model book; the ceiling remains unchanged.
  tunaMaxCostRatio:.2,
  // New 2026-10-19 contracts expand total prose by 25%; keep the old guard for stored contracts.
  tunaExpandedMaxCostRatio:.2*1.25,
  followup:{input:20000,output:4096},
} as const;
export type Tariff={inputUsdPerMillion:number;outputUsdPerMillion:number};

// questions=0 is an interpretation book; any positive count adds the ask analysis call and answer output.
export function v7BookCostKRW(chapters:number,tariff:Tariff,questions=0){
  const c=V7_COST;
  const output=(v7ChapterPolicy.target[1]+c.preambleChars)*c.tokensPerChar+c.thinkingTokens;
  let input=0;
  for(let i=0;i<chapters;i++)input+=c.baseInputTokens+Math.min(c.carryTokensPerChapter*i,c.carryCapTokens);
  let out=output*chapters;
  if(questions>0){
    input+=c.askAnalysis.input;
    out+=c.askAnalysis.output+Math.min(questions,c.maxQuestions)*c.answerCharsPerQuestion*c.tokensPerChar;
  }
  return (input*tariff.inputUsdPerMillion+out*tariff.outputUsdPerMillion)/1e6*c.krwPerUsd;
}
export const v7CostRatio=(chapters:number,priceKRW:number,tariff:Tariff,questions=0)=>v7BookCostKRW(chapters,tariff,questions)*V7_COST.retryFactor/priceKRW;

/** Tuna question book on the chapter model: every chapter with retries, the self-review rewrites at full context,
 * the question analysis and every followup answer with its thinking budget. */
export function tunaBookCostRatio(targets:number[],priceKRW:number,tariff:Tariff,followups:number){
  const c=V7_COST;
  const chapter=(chars:number,i:number)=>(c.baseInputTokens+Math.min(c.carryTokensPerChapter*i,c.carryCapTokens))*tariff.inputUsdPerMillion
    +((chars+c.preambleChars)*c.tokensPerChar+c.thinkingTokens)*tariff.outputUsdPerMillion;
  let usd=targets.reduce((sum,chars,i)=>sum+chapter(chars,i),0)*c.retryFactor;
  usd+=TUNA_REVIEW_MAX_REWRITES*chapter(Math.max(...targets),targets.length);
  usd+=c.askAnalysis.input*tariff.inputUsdPerMillion+c.askAnalysis.output*tariff.outputUsdPerMillion;
  usd+=followups*(c.followup.input*tariff.inputUsdPerMillion+(c.followup.output+TUNA_FOLLOWUP_THINKING_BUDGET)*tariff.outputUsdPerMillion);
  return usd/1e6*c.krwPerUsd/priceKRW;
}
