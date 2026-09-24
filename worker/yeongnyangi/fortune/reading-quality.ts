import type { ChapterBody, ChapterSpec } from './book-contracts';
import { FortuneError } from './shared/contracts';
import { hasReadingSections, isStructuredReading } from './reading-policy';

const normalize=(s:string)=>s.normalize('NFC').replace(/\s+/g,' ').trim();
export const SECTION_PARAGRAPH_LIMIT=500;
const codePoints=(s:string)=>Array.from(s).length;
// Sentence end: a non-digit, non-space character, then . ! ? 。 (plus closing quotes/brackets) and whitespace; or a line break.
// List numbers ("1. "), dotted dates ("2026. 10.") and decimals are never cut.
const SENTENCE_BOUNDARY=/(?<=(?:[^\s\d][.!?。]["'”’)\]」』]*\s+|\n\s*))(?=\S)/u;
// v5/v6 section targets can exceed the per-paragraph cap. Cut only at sentence ends into balanced
// parts; a paragraph with no sentence end, or a single sentence over the cap, stays whole and fails validation.
export function splitSectionParagraph(paragraph:string):string[]{
 if(codePoints(paragraph)<=SECTION_PARAGRAPH_LIMIT)return [paragraph];
 const units=paragraph.split(SENTENCE_BOUNDARY);
 if(units.length<2)return [paragraph];
 const total=codePoints(paragraph),parts=Math.ceil(total/SECTION_PARAGRAPH_LIMIT),goal=total/parts,out:string[]=[];
 let current='',done=0;
 for(const unit of units){
  const cs=codePoints(current),us=codePoints(unit);
  const overflow=cs+us>SECTION_PARAGRAPH_LIMIT;
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
function nearDuplicate(a:string,b:string,cache:Map<string,Set<string>>){
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
export function validateReadingQuality(body:ChapterBody,chapter:ChapterSpec,previous:Partial<ChapterBody>[]){
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
   if(count<section.minimumChars)throw new FortuneError('CHAPTER_SECTION_TOO_SHORT');
  }
 }
 const passages=bodyPassages(body).map(normalize);
 if(new Set(passages).size!==passages.length)throw new FortuneError('DUPLICATE_CHAPTER');
 const previousPassages=previous.flatMap(p=>[...(p.blocks?.flatMap(b=>b.paragraphs)||p.analysis||[]),p.advice||'',p.example||'']).map(normalize).filter(Boolean);
 if(passages.some(p=>previousPassages.includes(p)))throw new FortuneError('DUPLICATE_CHAPTER');
 const gramCache=new Map<string,Set<string>>();
 if(passages.some((p,i)=>passages.slice(0,i).some(q=>nearDuplicate(p,q,gramCache))||previousPassages.some(q=>nearDuplicate(p,q,gramCache))))throw new FortuneError('DUPLICATE_CHAPTER');
 const sentences=passages.flatMap(p=>p.split(/(?<=[.!?。])\s+/)).filter(s=>s.length>35);
 if(sentences.length-new Set(sentences).size>1)throw new FortuneError('DUPLICATE_CHAPTER');
 const content=[...passages,body.summary,body.persona,...body.highlights,
  ...(body.questionAnswers || []).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].join('\n');
 if(/(?:외도|바람기|바람끼).{0,12}\d+\s*%|(?:반드시|무조건|100%).{0,15}(?:재회|결혼|성공)|(?:암|질병|장기 이상)을?\s*(?:진단|확정)|(?:오행|명식).{0,20}(?:치료할 수|치료됩니다)/.test(content))throw new FortuneError('UNSUPPORTED_READING_CLAIM');
 if(!['tuna','assorted','omakase'].includes(chapter.tier||'')&&/(?:용신|희신|대운|마하다샤|안타르다샤|삼방사정)/.test(content))throw new FortuneError('TIER_SCOPE_VIOLATION');
 if(bodyCharacterCount(body)<(chapter.minimumChars||0))throw new FortuneError('CHAPTER_TOO_SHORT');
 if(!v5&&chapter.requiredSections?.some(title=>!body.blocks!.some(b=>b.title===title)))throw new FortuneError('CHAPTER_DEPTH_INCOMPLETE');
}
