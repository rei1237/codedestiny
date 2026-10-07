import type {PackageId} from './shared/contracts';
import type {ChapterSpec} from './book-contracts';
import type {Product} from '../payments/catalog';
import {v6ReadingPolicies,READING_V5_VERSION} from './reading-policy';
import {readingManifest} from './reading-manifest';
import {CONCISE_READING_VERSION,conciseOutputTokens} from './concise-reading';

export const CONSULTATION_BUDGET_VERSION='consultation-total-20261008';
export const CONSULTATION_FOLLOWUPS={mackerel:0,salmon:1,flounder:2,tuna:4,assorted:5,omakase:7} as const;
/** Historical full-reading targets cover the first reading plus all optional followups. */
export function consultationBudget(tier:PackageId){
 const total=v6ReadingPolicies[tier].target;
 const followups=CONSULTATION_FOLLOWUPS[tier];
 const followup=total.map(chars=>followups?Math.floor(chars*.2/followups):0) as [number,number];
 const initial=total.map((chars,i)=>chars-followup[i]*followups) as [number,number];
 return {version:CONSULTATION_BUDGET_VERSION,total:[...total] as [number,number],initial,followup,followups};
}

/** Reuse the full, distinct 18/28-chapter fusion outlines only when preparing a new purchase. */
export function fusionConsultationManifest(product:Product,topic='general'):ChapterSpec[]{
 const rows=readingManifest(product,topic,'personal',READING_V5_VERSION);
 return allocateConsultationBudget(rows,product.fishId);
}

export function allocateConsultationBudget(rows:ChapterSpec[],tier:PackageId):ChapterSpec[]{
 const budget=consultationBudget(tier);
 const sums=[0,1].map(i=>rows.reduce((sum,row)=>sum+row.targetChars![i],0));
 return rows.map(row=>{
  const targetChars=row.targetChars!.map((n,i)=>Math.floor(n/sums[i]*budget.initial[i])) as [number,number];
  const sections=row.sections?.map(section=>({...section,minimumChars:0,targetChars:section.targetChars.map((n,i)=>Math.floor(n/row.targetChars![i]*targetChars[i])) as [number,number]}));
  return {...row,minimumChars:0,targetChars,sections,outputBudgetVersion:CONCISE_READING_VERSION,outputTokens:Math.max(8192,conciseOutputTokens({targetChars,sections}))};
 });
}
