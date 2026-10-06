import type { ChapterBody, ChapterSpec } from './book-contracts';
import { FortuneError } from './shared/contracts';
import { hasReadingSections, isStructuredReading, READING_V7_VERSION } from './reading-policy';
import {allowsPreventionBalance,hasPrevention} from './prevention';
import {hasUnsupportedPreventionClaim} from '../../lib/fortune-prevention.js';
import {hasUnsupportedLocalizedClaim} from './localized-claims';
import {readingLocale} from './reading-locale';

const normalize=(s:string)=>s.normalize('NFC').replace(/\s+/g,' ').trim();
export const SECTION_PARAGRAPH_LIMIT=500;
// Principle 17: the prompt still asks for minimumChars and the target range; only the rejection line is
// looser. A single section's share already sits at ~81% of its target, so failing the whole chapter for one
// short section wasted two of every three paid calls (incident 2026-09-26). Only a section under 70% of its
// share is a real gap, and a chapter is rejected only under 70% of its target low (v6 minimums sat at 73~81%,
// v4 at 85% — a chapter the model had already written was thrown away for a few hundred characters).
export const SECTION_FLOOR_RATIO=.7;
export const sectionFloor=(minimumChars:number)=>Math.ceil((minimumChars||0)*SECTION_FLOOR_RATIO);
export const CHAPTER_FLOOR_RATIO=.7;
// Length alone never keeps a chapter from the buyer (2026-09-27). A short draft gets one length repair,
// and that repaired draft is judged on shape, evidence, duplicates and claims only — never rejected for length again.
export const LENGTH_FAILURES=['CHAPTER_TOO_SHORT','CHAPTER_SECTION_TOO_SHORT'];
export const chapterFloor=(chapter:Pick<ChapterSpec,'minimumChars'|'targetChars'>)=>{
 const minimum=chapter.minimumChars||0;
 return Math.ceil(Math.min(minimum,CHAPTER_FLOOR_RATIO*(chapter.targetChars?.[0]||minimum)));
};
const codePoints=(s:string)=>Array.from(s).length;
// Sentence end: a non-digit, non-space character, then . ! ? 。 (plus closing quotes/brackets) and whitespace; or a line break.
// List numbers ("1. "), dotted dates ("2026. 10.") and decimals are never cut.
// Exported for the v7 audit (reading-v7-quality.ts): a zero-width split, so the parts always rejoin to the source.
export const SENTENCE_BOUNDARY=/(?<=(?:[^\s\d][.!?。]["'”’)\]」』]*\s+|\n\s*))(?=\S)/u;
// Last resort for one unit over the cap (no sentence end, or a single very long sentence): cut after the
// last clause mark in the back half of the cap, else after the last space, else at the cap itself.
// A missing sentence end must never fail a chapter; only whitespace at the cut is dropped.
function wrapLongUnit(unit:string,limit:number):string[]{
 const out:string[]=[];let rest=unit;
 while(codePoints(rest)>limit){
  const head=Array.from(rest).slice(0,limit).join('');
  const last=(re:RegExp,from:number)=>{let cut=-1;for(const m of head.matchAll(re))if(m.index!>=from)cut=m.index!+m[0].length;return cut;};
  let cut=last(/[,，、;:]\s+/gu,head.length/2);
  if(cut<=0||cut>=head.length)cut=last(/\s+/gu,1);
  if(cut<=0||cut>=head.length)cut=head.length;
  out.push(rest.slice(0,cut));rest=rest.slice(cut);
 }
 if(rest)out.push(rest);
 return out;
}
// v5/v6 section targets can exceed the per-paragraph cap. Cut at sentence ends into balanced parts;
// a unit that is still over the cap is wrapped by wrapLongUnit, so every part fits the cap.
export function splitSectionParagraph(paragraph:string,limit=SECTION_PARAGRAPH_LIMIT):string[]{
 if(codePoints(paragraph)<=limit)return [paragraph];
 const units=paragraph.split(SENTENCE_BOUNDARY).flatMap(unit=>wrapLongUnit(unit,limit));
 if(units.length<2)return [paragraph];
 const total=codePoints(paragraph),parts=Math.ceil(total/limit),goal=total/parts,out:string[]=[];
 let current='',done=0;
 for(const unit of units){
  const cs=codePoints(current),us=codePoints(unit);
  const overflow=cs+us>limit;
  const balanced=out.length<parts-1&&done+cs+us/2>=goal*(out.length+1);
  if(current&&(overflow||balanced)){out.push(current);done+=cs;current=unit;}else current+=unit;
 }
 if(current)out.push(current);
 return out.map(c=>c.trim()).filter(Boolean);
}
// Paragraph text is kept verbatim apart from trimming; blank paragraphs are dropped. Shape errors are left to validateReadingQuality.
export function normalizeSectionParagraphs(body:ChapterBody):ChapterBody{
 if(!body||!Array.isArray(body.blocks))return body;
 return {...body,blocks:body.blocks.map(b=>!b||!Array.isArray(b.paragraphs)?b:
  {...b,paragraphs:b.paragraphs.flatMap(p=>typeof p!=='string'?[p]:!p.trim()?[]:splitSectionParagraph(p.trim()))})};
}
export function nearDuplicate(a:string,b:string,cache:Map<string,Set<string>>){
 if(a.length<120||b.length<120)return false;
 const grams=(s:string)=>{const found=cache.get(s);if(found)return found;const clean=s.replace(/[^\p{L}\p{N}]/gu,'');const result=new Set(Array.from({length:Math.max(0,clean.length-2)},(_,i)=>clean.slice(i,i+3)));cache.set(s,result);return result;};
 const left=grams(a),right=grams(b);let shared=0;for(const g of left)if(right.has(g))shared++;
 return 2*shared/(left.size+right.size)>.94;
}
export function bodyPassages(body:ChapterBody):string[]{
 return [...(body.blocks?body.blocks.flatMap(b=>b.paragraphs):body.analysis),body.example,body.advice].filter(s=>typeof s==='string'&&s.trim().length>0);
}
export function bodyCharacterCount(body:ChapterBody):number {
 // Headings, summaries, persona, highlights and citations are never credited.
 return [...new Set(bodyPassages(body).map(normalize))].reduce((n,s)=>n+Array.from(s).length,0);
}
// Names the first failing block-shape condition by manifest section ID (or block index), never by model text.
function blockShapeIssue(body:ChapterBody,chapter:ChapterSpec,v5:boolean):string{
 const blocks=body.blocks;
 if(!Array.isArray(blocks))return 'blocks_missing';
 if(blocks.length<2||blocks.length>(v5?20:8))return 'block_count';
 for(let i=0;i<blocks.length;i++){
  const b=blocks[i],id=chapter.sections?.[i]?.id||`#${i}`;
  if(!b||typeof b.title!=='string'||!b.title.trim())return `block_title:${id}`;
  if(!Array.isArray(b.paragraphs)||!b.paragraphs.length)return `paragraphs_empty:${id}`;
  for(const p of b.paragraphs){
   if(typeof p!=='string'||!p.trim())return `paragraph_blank:${id}`;
   if(Array.from(p).length>(v5?SECTION_PARAGRAPH_LIMIT:5000))return `paragraph_too_long:${id}`;
   if(/<\/?[a-z][^>]*>/i.test(p))return `paragraph_html:${id}`;
  }
 }
 return 'unknown';
}
// Words reserved for premium tiers (tuna·assorted·omakase). The flounder prevention chapter may name 용신.
// Shared by validateReadingQuality and the lenient delivery path, which drops the sentence instead.
export function hasOutOfTierTerm(text:string,chapter:ChapterSpec,locale='ko'):boolean{
 if(chapter.questionPolicy||!isStructuredReading(chapter.version)||['tuna','assorted','omakase'].includes(chapter.tier||''))return false;
 const scoped=allowsPreventionBalance(chapter)?text.replace(/용신|用神|\byongshin\b/gi,''):text;
 return /(?:용신|희신|대운|마하다샤|안타르다샤)/.test(scoped)||
  (locale!=='ko'&&/\b(?:yongshin|heeshin|daewoon|mahadasha|antardasha)\b|用神|喜神|大運|マハーダシャー|アンタルダシャー/i.test(scoped));
}

export function validateReadingQuality(body:ChapterBody,chapter:ChapterSpec,previous:Partial<ChapterBody>[],locale='ko',{lengthRepair=false,requiredSectionIds}:{lengthRepair?:boolean;requiredSectionIds?:string[]}={}){
 if(!isStructuredReading(chapter.version))return;
 const v5=hasReadingSections(chapter.version);
 if(!Array.isArray(body.blocks)||body.blocks.length<2||body.blocks.length>(v5?20:8)||body.blocks.some(b=>!b||typeof b.title!=='string'||!b.title.trim()||!Array.isArray(b.paragraphs)||!b.paragraphs.length||b.paragraphs.some(p=>typeof p!=='string'||!p.trim()||Array.from(p).length>(v5?SECTION_PARAGRAPH_LIMIT:5000)||/<\/?[a-z][^>]*>/i.test(p))))throw new FortuneError('INVALID_CHAPTER_BLOCKS',400,blockShapeIssue(body,chapter,v5));
 if(v5){
  if(!chapter.sections?.length || body.analysis.length || body.example || body.advice)throw new FortuneError('INVALID_CHAPTER_BLOCKS',400,!chapter.sections?.length?'sections_missing':body.analysis.length?'analysis_not_empty':body.example?'example_not_empty':'advice_not_empty');
  const blocks=body.blocks!;
  if(blocks.length!==chapter.sections.length || new Set(blocks.map(b=>b.id)).size!==blocks.length || blocks.some((b,i)=>b.id!==chapter.sections![i].id))throw new FortuneError('CHAPTER_DEPTH_INCOMPLETE');
  for(const section of chapter.sections){
   const block=blocks.find(b=>b.id===section.id);
   if(!block)throw new FortuneError('CHAPTER_DEPTH_INCOMPLETE');
   if(!Array.isArray(block.sources) || !block.sources.length || block.sources.some(id=>!body.sources.includes(id)))throw new FortuneError('INVALID_EVIDENCE');
   const count=[...new Set(block.paragraphs.map(normalize))].reduce((sum,p)=>sum+Array.from(p).length,0);
   const floor=sectionFloor(section.minimumChars);
   if(!lengthRepair&&count<floor)throw new FortuneError('CHAPTER_SECTION_TOO_SHORT',400,`section:${section.id}:${count}/${floor}`);
  }
 }
 const passages=bodyPassages(body).map(normalize);
 if(new Set(passages).size!==passages.length)throw new FortuneError('DUPLICATE_CHAPTER');
 const previousPassages=previous.flatMap(p=>[...(p.blocks?.flatMap(b=>b.paragraphs)||p.analysis||[]),p.advice||'',p.example||'']).map(normalize).filter(Boolean);
 if(passages.some(p=>previousPassages.includes(p)))throw new FortuneError('DUPLICATE_CHAPTER');
 const gramCache=new Map<string,Set<string>>();
 if(passages.some((p,i)=>passages.slice(0,i).some(q=>nearDuplicate(p,q,gramCache))||previousPassages.some(q=>nearDuplicate(p,q,gramCache))))throw new FortuneError('DUPLICATE_CHAPTER');
 const sentences=passages.flatMap(p=>p.split(/(?<=[.!?。])\s+/)).filter(s=>s.length>35);
 // v7 edits repeated sentences after the original draft passes the hard checks below.
 // Whole/near-copied paragraphs above still fail; v6 keeps its existing sentence rejection.
 if(chapter.version!==READING_V7_VERSION&&sentences.length-new Set(sentences).size>1)throw new FortuneError('DUPLICATE_CHAPTER');
 const content=[body.title,...(body.blocks||[]).map(b=>b.title),...passages,body.summary,body.persona,...body.highlights,
  ...(body.questionAnswers || []).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].join('\n');
 if(hasPrevention(chapter)&&hasUnsupportedPreventionClaim(content))throw new FortuneError('UNSUPPORTED_READING_CLAIM');
 validateReadingClaims(content,locale);
 if(hasOutOfTierTerm(content,chapter,locale))throw new FortuneError('TIER_SCOPE_VIOLATION');
 const chapterCount=bodyCharacterCount(body),floor=chapterFloor(chapter);
 if(!lengthRepair&&chapterCount<floor)throw new FortuneError('CHAPTER_TOO_SHORT',400,`chapter:${chapterCount}/${floor}`);
 if(!v5&&(requiredSectionIds?body.blocks?.length!==requiredSectionIds.length||requiredSectionIds.some((id,i)=>body.blocks?.[i]?.id!==id):chapter.requiredSections?.some(title=>!body.blocks!.some(b=>b.title===title))))throw new FortuneError('CHAPTER_DEPTH_INCOMPLETE');
}

/** Shared factual-claim guard for basic chapters and stored-evidence followups. */
export function validateReadingClaims(content:string,locale?:string){
 if(hasUnsupportedLocalizedClaim(content,readingLocale(locale)))throw new FortuneError('UNSUPPORTED_READING_CLAIM');
 if(/(?:외도|바람기|바람끼).{0,12}\d+\s*%|(?:반드시|무조건|100%).{0,15}(?:재회|결혼|성공)|(?:암|질병|장기 이상)을?\s*(?:진단|확정)|(?:오행|명식).{0,20}(?:치료할 수|치료됩니다)|(?:(?:질병|질환)(?:이|가|에)?\s*(?:생깁니다|생긴다|생길 것입니다|생길 겁니다|발생합니다|있습니다)|병에\s*걸(?:립니다|린다|릴 것입니다|릴 겁니다|리게 됩니다)|발병(?:합니다|한다|할 것입니다|할 겁니다))(?![가-힣])/.test(content))throw new FortuneError('UNSUPPORTED_READING_CLAIM');
}
