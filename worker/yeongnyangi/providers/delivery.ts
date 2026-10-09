import type {ChapterBody} from '../fortune/book-contracts';
import type {ChapterRequest} from './chapter';
import {correctChapterProse,pruneV7Overlap,repeatedSummary,validateChapter} from './chapter';
import {FortuneError} from '../fortune/shared/contracts';
import {salvageTruncatedJsonObject} from '../../../lib/llm-text.js';
import {readingLocale,validateReadingLanguage} from '../fortune/reading-locale';
import {alignRelativeYears} from '../fortune/consultation';
import {selectChapterFacts} from '../fortune/chapter-facts';
import {attachTarotSafetyNotice} from '../fortune/tarot/master-reading';
import {hasOutOfTierTerm,nearDuplicate,splitSectionParagraph} from '../fortune/reading-quality';
import {sanitizeQuestionSkyBody} from '../fortune/question-sky-reading';
import {blockAnchorNames,sanitizeBlockAnchors} from '../fortune/block-anchors';
import {hasReadingSections} from '../fortune/reading-policy';
import {CHAPTER_DELIVERY_VERSION,chapterDeliveryFailure} from '../chapter-delivery-contract.js';

// The strict validator remains a diagnostic contract. Delivery accepts the
// provider's useful text after local editing; it never invents missing insights.
const unsafe = /(?:외도|바람기|바람끼).{0,12}\d+\s*%|(?:반드시|무조건|100%).{0,15}(?:재회|결혼|성공)|(?:암|질병|장기 이상)을?\s*(?:진단|확정)|(?:오행|명식).{0,20}(?:치료할 수|치료됩니다)|(?:guaranteed|100%|definitely).{0,35}(?:reunion|marriage|success)|(?:必ず|絶対|100%).{0,15}(?:復縁|結婚|成功)|(?:diagnos\w*|確定|診断).{0,20}(?:cancer|disease|癌|病気)|(?:(?:질병|질환)(?:이|가|에)?\s*(?:생깁니다|생긴다|생길 것입니다|생길 겁니다|발생합니다|있습니다)|병에\s*걸(?:립니다|린다|릴 것입니다|릴 겁니다|리게 됩니다)|발병(?:합니다|한다|할 것입니다|할 겁니다))(?![가-힣])|(?:you will|you'll)\s+(?:develop|get|suffer from|be diagnosed with)\s+(?:an?\s+)?(?:\w+\s+)?(?:disease|illness|cancer)|(?:病気|疾患|がん)に(?:なります|かかります)/iu;
const prose=(value:unknown)=>typeof value==='string'&&!/<\/?[a-z][^>]*>/i.test(value)?value.trim():'';
const list=(value:unknown)=>Array.isArray(value)?value.map(prose).filter(Boolean):[];
export function deliverChapter(raw:unknown,input:ChapterRequest):ChapterBody {
  const contracted=input.deliveryContract===CHAPTER_DELIVERY_VERSION;
  let candidate:any=raw;
  if(typeof candidate==='string')try{candidate=JSON.parse(candidate);}catch{
    if(contracted)throw new FortuneError('INVALID_CHAPTER');
  }
  if(contracted && (!candidate || candidate.chapterId!==input.chapter.id))throw new FortuneError('CHAPTER_INCOMPLETE');
  // Gemini cannot enforce an empty-string enum. These fields are unused in
  // sectioned books; normalize the new response before duplicate/shape checks.
  if(candidate && Array.isArray(candidate.blocks) && candidate.blocks.length && hasReadingSections(input.chapter.version))
    candidate={...candidate,analysis:[],example:'',advice:''};
  // Completion is a server decision, not the model's prediction before it writes
  // the body. Validate every section even when a legacy response says false or
  // omits the marker; persisted chapters still require the server-owned true.
  if(contracted){
    const code=chapterDeliveryFailure(candidate,input.chapter,false);
    if(code)throw new FortuneError(code);
  }
  const body=deliverChapterBody(candidate,input);
  if(!contracted)return body;
  const delivered={...body,chapterId:input.chapter.id,complete:true,deliveryVersion:CHAPTER_DELIVERY_VERSION};
  const code=chapterDeliveryFailure(delivered,input.chapter);
  if(code)throw new FortuneError(code);
  return delivered;
}

function deliverChapterBody(raw:unknown,input:ChapterRequest):ChapterBody {
  try { return validateChapter(raw,input); } catch(error) {
    if(!(error instanceof FortuneError))throw error;
    // Which strict rule sent this chapter to local editing; the text itself is never logged.
    console.warn('[yeongnyangi-delivery-fallback]',JSON.stringify({chapter:input.chapter.ordinal,code:error.code,detail:error.detail}));
  }
  let value:any=raw;
  if(typeof value==='string'){
    try{value=JSON.parse(value);}catch{value=salvageTruncatedJsonObject(value);}
  }
  if(!value||typeof value!=='object'||Array.isArray(value))throw new FortuneError('INVALID_CHAPTER');
  const distinct=input.previous.flatMap(p=>[...(p.blocks?.flatMap(b=>b.paragraphs)||p.analysis||[])]);
  const seen=new Set(distinct.map(p=>p.replace(/\s/gu,'')));
  const gramCache=new Map<string,Set<string>>();
  const edit=(text:unknown)=>{
    const clean=prose(text);
    // Remove only complete offending sentences (unsafe claims, words above the chapter's tier); retain the rest.
    return clean.split(/(?<=[.!?。？！])\s+/u).filter(s=>!unsafe.test(s)&&!hasOutOfTierTerm(s,input.chapter,input.locale||'ko')).join(' ').trim();
  };
  // Remove the same near-copies rejected by the strict validator locally; do
  // not buy a new generation just to reword an already useful explanation.
  const paragraphs=(items:unknown)=>list(items).map(edit).filter(p=>{
    const key=p.replace(/\s/gu,'');
    if(!key||seen.has(key)||distinct.some(previous=>nearDuplicate(p,previous,gramCache)))return false;
    seen.add(key);distinct.push(p);return true;
  }).flatMap(p=>splitSectionParagraph(p));
  const allowed=new Set(Object.values(input.analysis.contexts).flatMap(c=>selectChapterFacts(c,input.chapter,input.analysis.topicId).map(f=>f.id)));
  if(input.ask)for(const item of [...input.ask.evidence.facts,...input.ask.evidence.timing])allowed.add(item.source.factId);
  const sources=(items:unknown)=>[...new Set(list(items).filter(id=>allowed.has(id)))];
  const blocks:NonNullable<ChapterBody['blocks']>=(Array.isArray(value.blocks)?value.blocks:[]).filter((b:any)=>b&&typeof b==='object').map((b:any)=>({
    ...(typeof b.id==='string'?{id:b.id}:{}),title:prose(b.title)||input.chapter.title,paragraphs:paragraphs(b.paragraphs),sources:sources(b.sources),
    ...Object.fromEntries((['palaces','pillars','astroPoints','vedicPoints','mansions'] as const).filter(k=>Array.isArray(b[k])).map(k=>[k,b[k]])),
  })).filter((b:any)=>b.paragraphs.length);
  const analysis=paragraphs(value.analysis);
  const answers:NonNullable<ChapterBody['questionAnswers']>=(Array.isArray(value.questionAnswers)?value.questionAnswers:[]).filter((a:any)=>a&&typeof a==='object').map((a:any)=>({
    questionId:prose(a.questionId),answer:edit(a.answer),reason:edit(a.reason),timing:edit(a.timing),action:edit(a.action),
  }));
  const actual=[...blocks.flatMap(b=>b.paragraphs),...analysis,edit(value.example),edit(value.advice),...answers.map(a=>a.answer)].filter(Boolean);
  if(actual.join('').replace(/\s/gu,'').length<120)throw new FortuneError('INVALID_CHAPTER');
  const expected=input.analysis.consultation?.questions.filter(q=>q.chapterId===input.chapter.id)||[];
  // A question must still have a substantive provider-authored answer. Citation
  // completeness and the optional timing/reason subdivisions do not buy retries.
  if(expected.some(q=>!answers.some(a=>a.questionId===q.id&&a.answer.length>=20)))throw new FortuneError('QUESTION_ANSWER_INCOMPLETE');
  // A summary that restates an earlier chapter's is replaced by this chapter's
  // own opening sentences; a regeneration is bought only when none is new.
  const fresh=(text:string)=>Boolean(text)&&!input.previous.some(p=>repeatedSummary(text,String(p.summary||'')));
  const opening=(paragraph:string)=>paragraph.split(/(?<=[.!?。])\s+/u).slice(0,2).join(' ');
  const summary=[edit(value.summary),actual[0],...actual.map(opening)].find(fresh);
  if(!summary)throw new FortuneError('CHAPTER_SUMMARY_REPEATED');
  let body:ChapterBody=sanitizeQuestionSkyBody({summary,analysis,example:edit(value.example),advice:edit(value.advice),
    persona:edit(value.persona),highlights:list(value.highlights).map(edit).filter(Boolean),topics:list(value.topics),blocks,
    sources:[...new Set([...sources(value.sources),...blocks.flatMap(b=>b.sources||[])])],questionAnswers:answers,
    ...(prose(value.title)?{title:prose(value.title)}:{}),
    ...(Array.isArray(value.followUpSuggestions)?{followUpSuggestions:list(value.followUpSuggestions)}:{}),
    ...(value.visualSlots&&typeof value.visualSlots==='object'&&!Array.isArray(value.visualSlots)?{visualSlots:value.visualSlots}:{}),
  },input.chapter);
  body=pruneV7Overlap(correctChapterProse(body,input),input,'fallback');
  if(input.analysis.consultation)body=alignRelativeYears(body,input.analysis.consultation.asOf,input.locale).body;
  validateReadingLanguage(body,readingLocale(input.locale));
  return sanitizeBlockAnchors(attachTarotSafetyNotice(body,input.analysis.question,readingLocale(input.locale),input.chapter.ordinal),blockAnchorNames(input.analysis,input.chapter.systems));
}
