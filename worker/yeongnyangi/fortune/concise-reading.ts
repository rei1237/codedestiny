import type {ChapterSpec} from './book-contracts';
import {tokensRequiredForChars} from '../../lib/llm-budget.js';

// Only new purchase preparation applies this profile. Saved manifests remain
// authoritative, including their original character goals and provider floor.
export const CONCISE_READING_VERSION='concise-reading-20260930';
export const CONCISE_READING_RATIO=.88;
export const CONCISE_MIN_OUTPUT_TOKENS=4096;
export const isConciseReading=(chapter:Pick<ChapterSpec,'outputBudgetVersion'>)=>chapter.outputBudgetVersion===CONCISE_READING_VERSION;
const scaled=(chars:number)=>Math.max(1,Math.round(chars*CONCISE_READING_RATIO));
export function conciseOutputTokens(chapter:Pick<ChapterSpec,'targetChars'|'sections'>,questions=0,answerChars=480):number {
  const upper=Math.max(chapter.targetChars?.[1]||0,chapter.sections?.reduce((sum,section)=>sum+section.targetChars[1],0)||0);
  return Math.max(CONCISE_MIN_OUTPUT_TOKENS,tokensRequiredForChars(upper+600+questions*answerChars));
}

export function conciseReadingManifest<T extends ChapterSpec>(manifest:readonly T[]):T[]{
  return manifest.map(chapter=>{
    if(isConciseReading(chapter)||!chapter.targetChars?.every(n=>Number.isFinite(n)&&n>0))return chapter;
    const targetChars=chapter.targetChars.map(scaled) as [number,number];
    const sections=chapter.sections?.map(section=>{
      const target=section.targetChars.map(scaled) as [number,number];
      return {...section,targetChars:target,minimumChars:Math.min(scaled(section.minimumChars),target[0])};
    });
    // Some historical symbolic outlines assign section totals above the chapter
    // heading's target. Budget the larger total so their last action is not cut.
    return {...chapter,outputBudgetVersion:CONCISE_READING_VERSION,targetChars,
      minimumChars:Math.min(scaled(chapter.minimumChars||chapter.targetChars[0]),targetChars[0]),
      ...(sections?{sections}:{}),outputTokens:conciseOutputTokens({targetChars,sections})};
  });
}
