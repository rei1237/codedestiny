import {EXPANDED_CHAPTERS,expandConsultationManifest} from './consultation-expansion';
import {FUSION_BOOK_VERSION,FUSION_BOOK_BUDGET_VERSION,FUSION_BOOK_TARGETS,fusionBookManifest,isFusionBookLayout} from './fusion-book';
import type {PackageId} from './shared/contracts';
import type {ChapterSpec} from './book-contracts';
import type {Product} from '../payments/catalog';
import {v6ReadingPolicies} from './reading-policy';
import {fusionManifestV2} from './reading-manifest';
import {CONCISE_READING_VERSION,conciseOutputTokens} from './concise-reading';

export const CONSULTATION_BUDGET_VERSION='consultation-expanded-20261019';
export const LEGACY_CONSULTATION_BUDGET_VERSION='consultation-total-20261008';
export const CONSULTATION_FOLLOWUPS={mackerel:0,salmon:1,flounder:2,tuna:6,assorted:5,omakase:7} as const;
// D7: length comes from the chapter count. One call writes about 1,600~2,400 chars, so per-chapter targets stay there.
export const CONSULTATION_CHAPTERS={mackerel:6,salmon:11,flounder:15,tuna:24,assorted:28,omakase:36} as const;
export const CONSULTATION_CHAPTER_TARGETS:Record<PackageId,readonly [number,number]>={
 mackerel:[1500,1750],salmon:[2000,2600],flounder:[2100,2600],tuna:[2100,2700],assorted:[2100,2700],omakase:[2100,2700],
};
export const CONSULTATION_FOLLOWUP_TARGETS={single:[2000,2600],fusion:[2400,3000]} as const;
/** A delivered chapter shorter than this gets one length repair; delivery itself only stops at half of it (D8). */
export const LAYOUT_MINIMUM_RATIO=.55;
/** 11: fusion chapters (MA·MO) ask for ~80% of their target low, so the one length repair (reading-quality chapterFloor, 70%)
 * starts where a chapter is really short. The delivery floor stays half of minimumChars (chapter-delivery-contract.js). */
export const FUSION_LAYOUT_MINIMUM_RATIO=.8;
/** D9: screens show length as A4 pages (10pt body, default margins). Contracts and checks keep counting chars. */
export const A4_CHARS_PER_PAGE=1800;
export const A4_PAGE_NOTE='A4 1장은 약 1,800자 기준';
export const a4Pages=([low,high]:readonly [number,number]):[number,number]=>[Math.max(1,Math.floor(low/A4_CHARS_PER_PAGE)),Math.max(1,Math.ceil(high/A4_CHARS_PER_PAGE))];
export const a4Label=(chars:readonly [number,number])=>{const [low,high]=a4Pages(chars);return low===high?`A4 약 ${low}장`:`A4 약 ${low}~${high}장`;};

/** initial = chapters × per-chapter target; every followup answer has its own fixed target. */
export function consultationBudget(tier:PackageId,version=FUSION_BOOK_BUDGET_VERSION){
 const followups=CONSULTATION_FOLLOWUPS[tier];
 const premium=[FUSION_BOOK_BUDGET_VERSION,'fusion-book-budget-20261014'].includes(version)&&(tier==='assorted'||tier==='omakase');
 const expanded=version===CONSULTATION_BUDGET_VERSION||version===FUSION_BOOK_BUDGET_VERSION;
 let initial=(premium?[...FUSION_BOOK_TARGETS[tier as keyof typeof FUSION_BOOK_TARGETS]]:CONSULTATION_CHAPTER_TARGETS[tier].map(chars=>chars*CONSULTATION_CHAPTERS[tier]*(expanded?1.25:1))) as [number,number];
 if(premium&&!expanded)initial=initial.map(chars=>chars/1.25) as [number,number];
 const followup=(followups?[...CONSULTATION_FOLLOWUP_TARGETS[['assorted','omakase'].includes(tier)?'fusion':'single']]:[0,0]) as [number,number];
 if(expanded)initial=initial.map((chars,i)=>chars+followup[i]*followups*.25) as [number,number];
 const total=initial.map((chars,i)=>chars+followup[i]*followups) as [number,number];
 return {version:expanded?(premium?FUSION_BOOK_BUDGET_VERSION:CONSULTATION_BUDGET_VERSION):version,total,initial,followup,followups};
}
/** Snapshots before 2026-10-10 split the historical full-reading target: 20% to followups, the rest to the first reading. */
export function legacyConsultationBudget(tier:PackageId){
 const total=v6ReadingPolicies[tier].target;
 const followups=CONSULTATION_FOLLOWUPS[tier];
 const followup=total.map(chars=>followups?Math.floor(chars*.2/followups):0) as [number,number];
 const initial=total.map((chars,i)=>chars-followup[i]*followups) as [number,number];
 return {version:LEGACY_CONSULTATION_BUDGET_VERSION,total:[...total] as [number,number],initial,followup,followups};
}
/** Per-chapter targets from role weights, low ends rounded up and high ends down, so the sums stay within chapters × per-chapter target. Short closing rows are allowed. */
export function layoutTargets(weights:number[],tier:PackageId):[number,number][]{
 const per=CONSULTATION_CHAPTER_TARGETS[tier];
 const sum=weights.reduce((a,b)=>a+b,0);
 return weights.map(w=>per.map((chars,i)=>(i?Math.floor:Math.ceil)(chars*w*weights.length/sum)) as [number,number]);
}
export const layoutMinimum=(target:readonly [number,number],ratio=LAYOUT_MINIMUM_RATIO)=>Math.ceil(target[0]*ratio);

/** New purchases: per-system foundation and expert chapters, the question outline, cross-system life chapters and synthesis. */
export function fusionConsultationManifest(product:Product,topic='general'):ChapterSpec[]{
 return allocateConsultationBudget(fusionManifestV2(product,topic),product.fishId);
}

export function fusionPremiumManifest(product:Product,topic='general'):ChapterSpec[]{
 return allocateConsultationBudget(fusionBookManifest(product,topic),product.fishId);
}

const ROLE_WEIGHTS:Record<string,number>={foundation:1.05,expert:1.05,application:1.05,answer:1.1,question:1,life:1,synthesis:.9};
export function allocateConsultationBudget(rows:ChapterSpec[],tier:PackageId):ChapterSpec[]{
 if(rows.some(row=>isFusionBookLayout(row.consultationLayout))){
  // The prevention chapter appended after preparation stands in for the life row '주의 시기'; synthesis stays last.
  const synthesis=rows.filter(row=>row.layoutRole==='synthesis');
  const ordered=[...rows.filter(row=>row.layoutRole!=='synthesis'),...synthesis].map((row,ordinal)=>({...row,ordinal,
   consultationLayout:rows[0].consultationLayout,layoutRole:row.layoutRole||(row.key==='prevention'?'life':'question')}));
  const weights=ordered.map(row=>ROLE_WEIGHTS[row.layoutRole]||1);
  const sum=weights.reduce((a,b)=>a+b,0);
  const premium=rows[0].consultationLayout===FUSION_BOOK_VERSION;
  const initial=consultationBudget(tier).initial;
  const targets=premium?weights.map(w=>initial.map((chars,i)=>(i?Math.floor:Math.ceil)(chars*w/sum)) as [number,number]):layoutTargets(weights,tier);
  const planned=ordered.map((row,i)=>scaled(row,targets[i],layoutMinimum(targets[i],FUSION_LAYOUT_MINIMUM_RATIO)));
  return premium?expandConsultationManifest(planned,tier,EXPANDED_CHAPTERS[tier]-(rows.some(row=>row.key==='prevention')?0:1),initial):planned;
 }
 const budget=legacyConsultationBudget(tier);
 const sums=[0,1].map(i=>rows.reduce((sum,row)=>sum+row.targetChars![i],0));
 return rows.map(row=>scaled(row,row.targetChars!.map((n,i)=>Math.floor(n/sums[i]*budget.initial[i])) as [number,number],0));
}
/** 4: in a fusion ask, the opening answer and the question chapters read the requested period's years and dates.
 * 'question-year' (질문과 이어진 올해) and the life/foundation/expert/synthesis chapters keep the stored calculation year. */
export const readsRequestedPeriod=(row:ChapterSpec)=>row.ordinal===0||['answer','question'].includes(row.layoutRole||'')&&row.key!=='question-year';
export function withRequestedPeriodScope(rows:ChapterSpec[],period:{kind:string;start?:string;end?:string;years?:{year:number}[]}|undefined):ChapterSpec[]{
 if(period?.kind!=='requested'||!period.start||!period.end||!period.years?.length||!rows.some(row=>isFusionBookLayout(row.consultationLayout)))return rows;
 const timeScope={years:period.years.map(y=>y.year),start:period.start,end:period.end};
 return rows.map(row=>readsRequestedPeriod(row)?{...row,timeScope}:row);
}
function scaled(row:ChapterSpec,targetChars:[number,number],minimumChars:number):ChapterSpec{
 const sections=row.sections?.map(section=>({...section,minimumChars:0,targetChars:section.targetChars.map((n,i)=>Math.floor(n/row.targetChars![i]*targetChars[i])) as [number,number]}));
 return {...row,minimumChars,targetChars,sections,outputBudgetVersion:CONCISE_READING_VERSION,outputTokens:Math.max(8192,conciseOutputTokens({targetChars,sections}))};
}
