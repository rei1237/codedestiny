import type { ChapterBody, ChapterSpec } from './book-contracts';
import { FortuneError } from './shared/contracts';
import { READING_V5_VERSION, isStructuredReading } from './reading-policy';

const normalize=(s:string)=>s.normalize('NFC').replace(/\s+/g,' ').trim();
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
export function validateReadingQuality(body:ChapterBody,chapter:ChapterSpec,previous:Partial<ChapterBody>[]){
 if(!isStructuredReading(chapter.version))return;
 const v5=chapter.version===READING_V5_VERSION;
 if(!Array.isArray(body.blocks)||body.blocks.length<2||body.blocks.length>(v5?20:8)||body.blocks.some(b=>!b||typeof b.title!=='string'||!b.title.trim()||!Array.isArray(b.paragraphs)||!b.paragraphs.length||b.paragraphs.some(p=>typeof p!=='string'||!p.trim()||Array.from(p).length>(v5?500:5000)||/<\/?[a-z][^>]*>/i.test(p))))throw new FortuneError('INVALID_CHAPTER_BLOCKS');
 if(v5){
  if(!chapter.sections?.length || body.analysis.length || body.example || body.advice)throw new FortuneError('INVALID_CHAPTER_BLOCKS');
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
