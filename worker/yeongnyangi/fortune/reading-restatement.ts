import type {ChapterBody,ChapterSpec} from './book-contracts';
import {READING_V7_VERSION} from './reading-policy';
import {bodyCharacterCount,chapterFloor,sectionFloor} from './reading-quality';
import {NORM,dice,gramsOf,v7SentenceParts} from './reading-v7-quality';

/** Stamped on non-v7 chapters prepared from 2026-10-23. Stored manifests without it keep their delivered behavior. */
export const REPEAT_POLICY='sentence-v1';
// 3-gram Dice per sentence, from the 2026-10-09/10 samples (chapter.ts repeatedSummary): an independent sentence
// peaks at .70 against another chapter and a copied sentence scores .80~1.00. The previous-chapter line sits just
// above the independent peak; inside one chapter only the copied range is dropped.
export const RESTATE_DICE_PREVIOUS=.72;
export const RESTATE_DICE_CURRENT=.8;
/** Same length as validateReadingQuality's repeated-sentence check. A shorter sentence shares too much of its
 * grammar with independent sentences for 3-gram Dice, so only longer ones are compared at all. */
const SENTENCE_MIN=35;

export const withRepeatPolicy=(rows:ChapterSpec[]):ChapterSpec[]=>rows.map(row=>row.version===READING_V7_VERSION?row:{...row,repeatPolicy:REPEAT_POLICY});

type Reason='exact'|'near'|'previous';
interface Unit{block:number;paragraph:number;index:number;plain:string;chars:number;reason?:Reason}
export interface Restatement{body:ChapterBody;exact:number;near:number;previous:number;chars:number;kept:number}

/**
 * Deterministic repeat removal for v5/v6 sectioned chapters (principle 17: corrected, never regenerated).
 * exactOnly runs before validateReadingQuality, so a copied sentence is dropped instead of failing the chapter;
 * the full pass also drops in-chapter near copies and sentences restating an earlier chapter. summary,
 * questionAnswers and block sources are never edited, a block keeps at least one sentence, and nothing is dropped
 * once the chapter or a section would fall under its floor (kept counts those).
 */
export function pruneRestatements(body:ChapterBody,previous:readonly Partial<ChapterBody>[],chapter:Pick<ChapterSpec,'minimumChars'|'targetChars'|'sections'>,{exactOnly=false}:{exactOnly?:boolean}={}):Restatement{
  const none={body,exact:0,near:0,previous:0,chars:0,kept:0};
  if(!body||!Array.isArray(body.blocks))return none;
  const units:Unit[]=[];
  body.blocks.forEach((block,b)=>(Array.isArray(block?.paragraphs)?block.paragraphs:[]).forEach((paragraph,p)=>{
    if(typeof paragraph!=='string')return;
    v7SentenceParts(paragraph).forEach((part,index)=>{const plain=NORM(part);units.push({block:b,paragraph:p,index,plain,chars:Array.from(plain).length});});
  }));
  const earlier=previous.flatMap(p=>p.blocks?.flatMap(b=>b?.paragraphs||[])||p.analysis||[])
    .filter((paragraph):paragraph is string=>typeof paragraph==='string')
    .flatMap(paragraph=>v7SentenceParts(paragraph).map(NORM)).filter(s=>s.length>SENTENCE_MIN);
  const earlierExact=new Set(earlier);
  const cache=new Map<string,Set<string>>();
  const earlierGrams=exactOnly?[]:earlier.map(s=>gramsOf(s,cache));
  const seen=new Set<string>(),kept:Set<string>[]=[];
  for(const unit of units){
    if(unit.plain.length<=SENTENCE_MIN)continue;
    if(seen.has(unit.plain)||earlierExact.has(unit.plain)){unit.reason='exact';continue;}
    seen.add(unit.plain);
    if(exactOnly)continue;
    const grams=gramsOf(unit.plain,cache);
    if(kept.some(other=>dice(grams,other)>=RESTATE_DICE_CURRENT))unit.reason='near';
    else if(earlierGrams.some(other=>dice(grams,other)>=RESTATE_DICE_PREVIOUS))unit.reason='previous';
    else kept.push(grams);
  }
  // Exact copies go first, then near copies, then restatements, while the chapter and each section stay above floor.
  const blockChars=body.blocks.map((_,b)=>units.filter(u=>u.block===b).reduce((sum,u)=>sum+u.chars,0));
  const blockUnits=body.blocks.map((_,b)=>units.filter(u=>u.block===b).length);
  let total=bodyCharacterCount(body);const floor=chapterFloor(chapter);
  const counts={exact:0,near:0,previous:0};let chars=0,held=0;
  const drop=new Set<Unit>();
  for(const reason of ['exact','near','previous'] as Reason[])for(const unit of units){
    if(unit.reason!==reason)continue;
    const section=sectionFloor(chapter.sections?.[unit.block]?.minimumChars||0);
    if(total-unit.chars<floor||blockChars[unit.block]-unit.chars<section||blockUnits[unit.block]<=1){held++;continue;}
    drop.add(unit);total-=unit.chars;blockChars[unit.block]-=unit.chars;blockUnits[unit.block]--;counts[reason]++;chars+=unit.chars;
  }
  if(!drop.size)return {...none,kept:held};
  const cut=new Map<string,Set<number>>();
  for(const unit of drop){const key=`${unit.block}/${unit.paragraph}`;if(!cut.has(key))cut.set(key,new Set());cut.get(key)!.add(unit.index);}
  const blocks=body.blocks.map((block,b)=>!block||!Array.isArray(block.paragraphs)?block:{...block,paragraphs:block.paragraphs.flatMap((paragraph,p)=>{
    const indexes=cut.get(`${b}/${p}`);
    if(!indexes||typeof paragraph!=='string')return [paragraph];
    const rest=v7SentenceParts(paragraph).filter((_,i)=>!indexes.has(i)).join('').trim();
    return rest?[rest]:[];
  })});
  return {body:{...body,blocks},...counts,chars,kept:held};
}
