import {GEMINI_PRO_MODEL,GEMINI_PROSE_MODEL,PRO_TASK_POLICY,isGeminiProModel,selectGeminiModel} from '../../../lib/gemini-model-policy.js';
// Tuna quality contract: computed-value citations, question links and one self-review rewrite.
// Only orders whose snapshot carries TUNA_QUALITY_POLICY get it; orders created before it keep flash and the old flow.
export const TUNA_QUALITY_POLICY='tuna-quality-20261012';
export const TUNA_DEFAULT_MODEL=GEMINI_PROSE_MODEL;
export const TUNA_REASONING_MODEL=GEMINI_PRO_MODEL;
/** Followup explanation uses Flash; no extra reasoning budget is reserved. */
export const TUNA_FOLLOWUP_THINKING_BUDGET=0;
export const TUNA_FOLLOWUP_TIMEOUT_MS=90000;
/** At most a third of a 24-chapter book is rewritten, which keeps the estimate under 20% of the price (reading-v7-cost.ts). */
export const TUNA_REVIEW_MAX_REWRITES=8;
export const TUNA_MIN_CITED_VALUES=2;

/** The roadmap chapter reads month rows through the same day next year. */
export const tunaRoadmapEnd=(asOf:string)=>`${Number(asOf.slice(0,4))+1}${asOf.slice(4,10)}`;
export const tunaQualityApplies=(snapshot:any)=>snapshot?.tunaQualityPolicy===TUNA_QUALITY_POLICY;
// Durable server receipts, not a client model preference, select recovery on the next existing attempt.
// A Pro refusal (404, 429, 5xx), a Pro timeout or an attempt that already fell back moves synthesis to Flash.
const proRefused=(entry:any)=>entry.code==='FORTUNE_PROVIDER_TIMEOUT'||entry.code==='FORTUNE_PROVIDER_FAILED'&&[404,429].includes(entry.receipt.status)||entry.code==='FORTUNE_PROVIDER_FAILED'&&entry.receipt.status>=500;
export const tunaProUnavailable=(row:any)=>row?.state!=='REFUNDED'&&Array.isArray(row?.recoveryAudit)&&row.recoveryAudit.some((entry:any)=>
 entry.receipt?.provider==='gemini'&&(Boolean(entry.receipt.modelFallback)||isGeminiProModel(entry.receipt.model)&&proRefused(entry)));
// A self-review rewrite on Pro needs this much of the lease to be worth starting.
export const TUNA_PRO_MIN_CALL_MS=PRO_TASK_POLICY['tuna-synthesis'].minCallMs;
export const tunaReasoningTask=(snapshot:any,chapter:any,proUnavailable=false)=>!proUnavailable&&tunaQualityApplies(snapshot)&&chapter?.layoutRole==='synthesis'&&chapter?.key!=='action'?'tuna-synthesis' as const:undefined;
export function tunaChapterModel(env:Record<string,unknown>|undefined,snapshot:any,chapter?:any,proUnavailable=false):string|undefined{
  if(!tunaQualityApplies(snapshot))return undefined;
  if(proUnavailable)return GEMINI_PROSE_MODEL;
  const configured=String(env?.YEONGNYANGI_TUNA_GEMINI_MODEL||'').trim();
  return selectGeminiModel(/^gemini-[a-z0-9.-]+$/.test(configured)?configured:TUNA_DEFAULT_MODEL,tunaReasoningTask(snapshot,chapter));
}

export const TUNA_PROMPT_CONTRACT={
  citations:'이 장의 본문에 CALCULATED_DATA의 실제 계산값(명식 글자·별·궁·수·행성·하우스·각 이름 등)을 서로 다른 것으로 2개 이상 글자 그대로 인용하고, 각 값을 왜 그렇게 읽었는지 이유를 바로 이어 쓴다. 근거 없이 누구에게나 맞는 일반론 문장은 쓰지 않는다.',
  questionLink:'이 장의 첫 문단에서 사용자가 남긴 질문과 고민을 직접 언급하고, 이 장의 내용이 그 질문에 어떻게 이어지는지 밝힌다. 질문과 다른 영역을 다루는 장도 질문과의 연결점을 한 문장 이상 쓴다.',
};
const ISSUE_RULES:Record<string,string>={
  TUNA_FEW_CITATIONS:'본문에 CALCULATED_DATA의 실제 계산값을 서로 다른 것으로 2개 이상 글자 그대로 인용하고 왜 그렇게 읽었는지 쓴다.',
  TUNA_NO_QUESTION_LINK:'첫 문단에서 사용자의 질문과 고민을 직접 언급하고 이 장의 내용과 연결한다.',
  TUNA_DUPLICATE_SENTENCE:'이 장 안이나 앞 장에서 이미 쓴 문장을 되풀이하지 않고 새 근거와 판단으로 바꾼다.',
  TUNA_GENERIC_SENTENCE:'누구에게나 맞는 일반론 문장을 지우고 이 사람의 계산값에서 나온 구체적인 판단으로 바꾼다.',
};
export function tunaReviewInstruction(issues:string[]):string{
  return '생성한 초안을 자기 검토했더니 아래 문제가 있었다. 같은 장의 모든 소제목과 분량을 유지하면서 문제를 고쳐 다시 쓴다. '+issues.map(code=>ISSUE_RULES[code]).filter(Boolean).join(' ');
}

const GENERIC=/누구에게나|모든 사람은|사람마다 다르|일반적으로 말해|긍정적인 마음가짐|노력하면 반드시|운명은 스스로 만드는/u;
const STOP=new Set(['true','false','null','없음','있음','정보','미상','unknown']);
const normalize=(text:string)=>text.normalize('NFC').replace(/\s+/gu,' ').trim();
const sentencesOf=(text:string)=>text.split(/(?<=[.!?。])\s+/u).map(normalize).filter(sentence=>Array.from(sentence).length>=25);
function bodyText(body:any):string{
  const paragraphs=Array.isArray(body?.blocks)?body.blocks.flatMap((b:any)=>Array.isArray(b?.paragraphs)?b.paragraphs:[]):Array.isArray(body?.analysis)?body.analysis:[];
  return [body?.summary,...paragraphs,body?.example,body?.advice].filter(text=>typeof text==='string').join('\n');
}
/** Short string values (names such as 갑자·재백궁·Mars) are what a reader can see cited; long descriptions are not. */
function citableValues(analysis:any,systems?:string[]):Set<string>{
  const values=new Set<string>();
  const visit=(value:unknown,depth:number)=>{
    if(depth>4)return;
    if(typeof value==='string'){
      const text=normalize(value);
      if(Array.from(text).length>=2&&Array.from(text).length<=12&&/[가-힣一-龥A-Za-z]/u.test(text)&&!STOP.has(text.toLowerCase()))values.add(text);
      return;
    }
    if(Array.isArray(value)){for(const item of value.slice(0,60))visit(item,depth+1);return;}
    if(value&&typeof value==='object')for(const item of Object.values(value).slice(0,60))visit(item,depth+1);
  };
  for(const context of Object.values(analysis?.contexts||{}) as any[]){
    if(systems?.length&&!systems.includes(context?.domain))continue;
    for(const fact of context?.facts||[])visit(fact?.value,0);
  }
  return values;
}
function questionStems(question:string):string[]{
  return [...new Set(normalize(question).split(/[^가-힣A-Za-z0-9]+/u).filter(word=>Array.from(word).length>=2).map(word=>/[가-힣]/u.test(word)?word.slice(0,2):word.toLowerCase()))].slice(0,12);
}

/** Local, deterministic self-review. It never blocks delivery; a non-empty result only asks for one rewrite. */
export function auditTunaChapter(body:any,input:{chapter:any;analysis:any;previous?:any[]}):string[]{
  const text=bodyText(body);
  const issues:string[]=[];
  const cited=[...citableValues(input.analysis,input.chapter?.systems)].filter(value=>text.includes(value));
  if(cited.length<TUNA_MIN_CITED_VALUES)issues.push('TUNA_FEW_CITATIONS');
  const question=String(input.analysis?.consultation?.question||input.analysis?.question||'');
  const stems=questionStems(question);
  const lower=text.toLowerCase();
  if(question.trim()&&!/질문|고민/u.test(text)&&!stems.some(stem=>lower.includes(stem)))issues.push('TUNA_NO_QUESTION_LINK');
  const own=sentencesOf(text);
  const earlier=new Set((input.previous||[]).flatMap(chapter=>sentencesOf(bodyText(chapter))));
  if(new Set(own).size<own.length||own.some(sentence=>earlier.has(sentence)))issues.push('TUNA_DUPLICATE_SENTENCE');
  if(own.some(sentence=>GENERIC.test(sentence)))issues.push('TUNA_GENERIC_SENTENCE');
  return issues;
}
export const tunaRewritesUsed=(chapters:any[]|undefined)=>(chapters||[]).filter(chapter=>chapter?.selfReview==='rewritten').length;
