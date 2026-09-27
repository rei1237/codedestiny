import {v7ChapterPolicy} from './reading-policy';

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
