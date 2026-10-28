import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';
import {canonicalTarotNamesKo,findTarotProseViolation,tarotCardMentions} from '../../../../lib/tarot/paid-reading-contract.mjs';
import type {ChapterBody,ChapterSpec} from '../book-contracts';
import type {DomainContext} from '../shared/contracts';
import {FortuneError} from '../shared/contracts';
import {PERIOD_WORD,TIMING_CLAIM,TIMING_DENIAL} from '../consultation';
import {savedTarotConsultation} from './consultation-prompt';
import {savedTarotCards} from './master-reading';

// Korean 영냥이 tarot chapters are written one call at a time. Four things a chapter could get wrong are fixed here
// deterministically, on the strict path and the lenient fallback alike (correctChapterProse runs on both):
// card names in another deck's form, elder endings, a later chapter reversing the first answer, and a card-only
// chapter asserting when something will happen. What a correction cannot fix is named by validateTarotDiscipline.

export interface TarotDisciplineInput{
 locale?:string;
 chapter:ChapterSpec;
 analysis:{question?:string;contexts:Record<string,DomainContext|undefined>;consultation?:{questionDecision?:unknown}};
 previous:Partial<ChapterBody>[];
 persona?:string;
 voiceStyle?:'banmal'|'honorific';
}
type Answer=NonNullable<ChapterBody['questionAnswers']>[number];

const tarotOf=(input:TarotDisciplineInput)=>(input.locale||'ko')==='ko'?input.analysis.contexts.tarot:undefined;
const honorific=(input:TarotDisciplineInput)=>input.voiceStyle==='honorific';

/** Applies fn to every prose field the reader sees; a field that is absent stays absent. */
function mapProse(body:ChapterBody,fn:(text:string,field:string)=>string):ChapterBody{
 const one=(value:unknown,field:string)=>typeof value==='string'?fn(value,field):value;
 const out:any={...body};
 for(const key of ['title','summary','example','advice','persona'] as const)if(typeof body[key]==='string')out[key]=fn(body[key] as string,key);
 for(const key of ['analysis','highlights'] as const)if(Array.isArray(body[key]))out[key]=body[key].map(value=>one(value,key));
 if(Array.isArray(body.blocks))out.blocks=body.blocks.map(block=>({...block,title:one(block.title,'block.title'),
  paragraphs:Array.isArray(block.paragraphs)?block.paragraphs.map(value=>one(value,'paragraph')):block.paragraphs}));
 if(Array.isArray(body.questionAnswers))out.questionAnswers=body.questionAnswers.map(answer=>{
  const row:any={...answer};
  for(const key of ['answer','reason','timing','action','review'])if(typeof row[key]==='string')row[key]=fn(row[key],`answer.${key}`);
  return row;
 });
 return out;
}
function proseOf(body:ChapterBody){
 const texts:string[]=[];
 mapProse(body,text=>{texts.push(text);return text;});
 return texts;
}
const SENTENCE_BREAK=/(?<=[.!?。？！])(\s+)/u;
const sentencesOf=(text:string)=>text.split(SENTENCE_BREAK).filter((_,i)=>i%2===0).map(s=>s.trim()).filter(Boolean);
/** Drops the sentences drop() names. A field that would be left empty is returned whole with residual set. */
function filterSentences(text:string,drop:(sentence:string)=>boolean){
 const parts=text.split(SENTENCE_BREAK);
 let out='',dropped=0,kept=0;
 for(let i=0;i<parts.length;i+=2){
  const sentence=parts[i];
  if(!sentence.trim()){continue;}
  if(drop(sentence.trim())){dropped++;continue;}
  out+=(kept?(parts[i-1]||' '):'')+sentence.trim();kept++;
 }
 if(!dropped)return {text,dropped:0,residual:false};
 if(!kept)return {text,dropped:0,residual:true};
 return {text:out,dropped,residual:false};
}

// ── Card names ───────────────────────────────────────────────────────────
function drawnCards(context:DomainContext){
 return savedTarotCards(context).map(card=>{
  const code=String(card.cardId||card.code||'').toUpperCase();
  const model=TAROT_CARDS.find(item=>item.code===code);
  return {name:model?.nameKo||card.nameKo||card.nameKr||card.name||'',orientation:card.orientation==='reversed'?'reversed':'upright'};
 }).filter(card=>card.name);
}
const CARD_DROP=new Set(['TAROT_UNDRAWN_CARD','TAROT_ORIENTATION_MISMATCH']);

// ── Elder endings ────────────────────────────────────────────────────────
// 영냥이 speaks 반말 or 해요체 (prompts/persona/yeongnyangi.ts). An elder's ending (~란다, ~렴) is another voice.
const ELDER:[string,string,string][]=[
 ['것이란다','거야','거예요'],['거란다','거야','거예요'],['이란다','이야','이에요'],['있단다','있어','있어요'],['없단다','없어','없어요'],
 ['한단다','해','해요'],['하단다','해','해요'],['된단다','돼','돼요'],['준단다','줘','줘요'],['보려무나','봐','보세요'],['하려무나','해','하세요'],
 ['보렴','봐','보세요'],['하렴','해','하세요'],['주렴','줘','주세요'],['두렴','둬','두세요'],['오렴','와','오세요'],['가렴','가','가세요'],
 ['하거라','해','하세요'],['보거라','봐','보세요'],['가거라','가','가세요'],
];
const ELDER_RE=new RegExp(`(${ELDER.map(row=>row[0]).sort((a,b)=>b.length-a.length).join('|')})(?=[\\s.!?,…~"'”’)]|$)`,'gu');
const correctElder=(text:string,polite:boolean)=>text.replace(ELDER_RE,ending=>{const row=ELDER.find(r=>r[0]===ending)!;return polite?row[2]:row[1];});

// ── The settled answer ───────────────────────────────────────────────────
const STAY_RE=/잔류|남(?:기|는|을|아)|머무|현\s*직장|지금\s*회사|현재\s*회사/u;
const STAY_TERMS=['남는','남아','남기','남을','남으','머무르','머무는','머물','현 직장','지금 회사','현재 회사','잔류'];
const LEAVE_RE=/이직|옮|떠나|퇴사|새\s*(?:회사|직장)/u;
const LEAVE_TERMS=['이직','옮기','옮겨','옮길','떠나','퇴사','새 회사','새 직장'];
const CONDITIONAL=/만약|만일|경우|(?:다|라)면|하면|더라도|든지|거나/u;
const HEDGE=/단정|확정|장담|말하기\s*어렵|(?:낫|유리|맞|좋)[가-힣\s]{0,8}(?:않|없|아니)|아니라/u;
const ASPECT=/면에서|측면|점에서|만\s*보면|만으로는|기준으로|에\s*있어서/u;
const POSITIVE=/더\s*(?:유리|낫|나아|나은|잘\s*맞|맞|좋|긍정|적합|안정|어울)|(?:권|추천)(?:해|하|할|한)/u;
const THAN=/보다(?:는|도)?|에\s*비해|[와과]\s*비교해/u;
type Side={label:string;patterns:RegExp[]};
const escapeRe=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const termPattern=(term:string)=>/^[A-Za-z]$/.test(term)?new RegExp(`(?<![A-Za-z])${term}(?![A-Za-z])`,'gu'):new RegExp(escapeRe(term).replace(/ /g,'\\s*'),'gu');
function commonPrefix(labels:string[]){
 let prefix=labels[0]||'';
 for(const label of labels)while(prefix&&!label.startsWith(prefix))prefix=prefix.slice(0,-1);
 return prefix.replace(/(?:\s|의|에서|시)+$/u,'');
}
/** The two sides of a compare spread: the option the reader typed, or what the side's position labels share. */
export function compareSides(context:DomainContext):[Side,Side]|undefined{
 const evidence=savedTarotConsultation(context) as any;
 if(evidence?.spread?.purpose!=='compare'||!evidence.symmetry)return undefined;
 const cards:any[]=Array.isArray(evidence.cards)?evidence.cards:[];
 const prefixes=(['a','b'] as const).map(key=>commonPrefix((evidence.symmetry[key]||[]).map((id:string)=>cards.find(card=>card.positionKey===id)?.positionLabel).filter(Boolean)));
 const options=(['a','b'] as const).map(key=>typeof evidence.inputs?.options?.[key]==='string'?evidence.inputs.options[key].trim():'');
 const terms=prefixes.map((prefix,i)=>[options[i],prefix].filter(Boolean));
 for(const [re,words] of [[STAY_RE,STAY_TERMS],[LEAVE_RE,LEAVE_TERMS]] as const){
  const hit=terms.map(list=>list.some(term=>re.test(term)));
  if(hit[0]!==hit[1])terms[hit[0]?0:1].push(...words);
 }
 if(terms.some(list=>!list.length))return undefined;
 const sides=terms.map((list,i)=>({label:options[i]||prefixes[i],patterns:[...new Set(list)].map(termPattern)}));
 return [sides[0],sides[1]];
}
/** Which side a sentence says is better, or undefined when it conditions, hedges, limits to an aspect or does not rank. */
function lean(sentence:string,sides:[Side,Side]):number|undefined{
 if(CONDITIONAL.test(sentence)||HEDGE.test(sentence)||ASPECT.test(sentence))return undefined;
 const positive=POSITIVE.exec(sentence);
 if(!positive)return undefined;
 const hits=sides.flatMap((side,index)=>side.patterns.flatMap(pattern=>[...sentence.matchAll(pattern)].map(m=>({side:index,start:m.index!,end:m.index!+m[0].length}))))
  .sort((x,y)=>x.start-y.start);
 if(!hits.length)return undefined;
 const than=THAN.exec(sentence);
 if(than){
  // "A보다 B가 더 낫다": the side right before 보다 is the one ranked lower.
  const before=hits.filter(hit=>hit.end<=than.index&&than.index-hit.end<=15).pop();
  if(before){
   const after=hits.find(hit=>hit.start>=than.index+than[0].length&&hit.side!==before.side);
   if(after)return after.side;
   const earlier=hits.filter(hit=>hit.end<=before.start&&hit.side!==before.side).pop();
   if(earlier)return earlier.side;
  }
 }
 const nearest=hits.filter(hit=>hit.end<=positive.index).pop();
 return nearest?.side;
}
/** The side the first answering chapter settled, when every ranking sentence of its answers agrees. */
function settledVerdict(input:TarotDisciplineInput,context:DomainContext){
 const sides=compareSides(context);
 if(!sides)return undefined;
 const first=input.previous.find(p=>(p.questionAnswers||[]).some(a=>typeof a?.answer==='string'&&a.answer.trim()));
 if(!first)return undefined;
 const leans=new Set((first.questionAnswers||[]).flatMap(a=>sentencesOf(String(a?.answer||''))).map(s=>lean(s,sides)).filter(side=>side!==undefined));
 if(leans.size!==1)return undefined;
 const side=[...leans][0] as number;
 return {side,sides,label:sides[side].label};
}
const ownsAnswers=(body:ChapterBody)=>(body.questionAnswers||[]).some(a=>typeof a?.answer==='string'&&a.answer.trim());

// ── Timing ───────────────────────────────────────────────────────────────
const PREDICTION=/가능성이\s*(?:크|높)|찾아올|일어날|이루어질|열릴|풀릴|올\s*거|생길\s*거/u;
const TAROT_TIMING_DENIAL=/확정하지\s*않|보장하지\s*않|단정하지\s*않|정해\s*주지\s*않|알려\s*주지\s*않|말해\s*주지\s*않/u;
const TIMING_LIMIT=['타로는 시기를 정해 주지 않아. 이 카드들은 질문한 기간에 무엇을 살필지를 보여 줄 뿐이야.','타로는 시기를 정해 주지 않아요. 이 카드들은 질문한 기간에 무엇을 살필지를 보여 줄 뿐이에요.'];
/** Cards only, no requested period: a sentence may name a period but cannot say it is favourable or that something happens then. */
function cardOnlyTiming(input:TarotDisciplineInput,context:DomainContext){
 const keys=Object.entries(input.analysis.contexts).filter(([,value])=>value).map(([key])=>key);
 if(!keys.length||keys.some(key=>key!=='tarot'))return false;
 const evidence=savedTarotConsultation(context) as any;
 // New question readings never acquire event timing from the requested period. Historical readings retain their contract.
 if(input.chapter.questionPolicy&&input.analysis.consultation?.questionDecision)return true;
 return evidence?.spread?.purpose!=='period'&&!evidence?.inputs?.period;
}
const claimsTiming=(sentence:string)=>PERIOD_WORD.test(sentence)&&(TIMING_CLAIM.test(sentence)||PREDICTION.test(sentence))&&!TIMING_DENIAL.test(sentence)&&!TAROT_TIMING_DENIAL.test(sentence);

// ── Card listing ─────────────────────────────────────────────────────────
/**
 * A chapter other than the position chapter that names most of the drawn cards in one block repeats the position
 * chapter. Returns the first such block, or undefined. A position chapter (its sections are the position labels) owns
 * its cards. Logged, not thrown: the prose is not wrong, only repetitive, and no correction can remove it safely.
 */
export function tarotCardListing(body:ChapterBody,context:DomainContext,chapter:ChapterSpec){
 const evidence=savedTarotConsultation(context) as any;
 const cards:any[]=Array.isArray(evidence?.cards)?evidence.cards:savedTarotCards(context).map(card=>({name:card.nameKo||card.name,positionLabel:''}));
 const n=cards.length;
 if(n<6)return undefined;
 const limit=Math.max(6,Math.ceil(n*0.75));
 const titles=new Set((chapter.sections||[]).map(section=>section.title));
 const free=new Set(cards.filter(card=>!titles.has(card.positionLabel)).map(card=>card.name));
 const units=[...(body.blocks||[]).map(block=>({block:block.id||block.title,text:[block.title,...(block.paragraphs||[])].join('\n')})),
  {block:'body',text:[body.summary,body.example,body.advice,body.persona,...(body.analysis||[]),...(body.highlights||[]),
   ...(body.questionAnswers||[]).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].filter(Boolean).join('\n')}];
 for(const unit of units){
  const count=[...tarotCardMentions(unit.text)].filter(name=>free.has(name)).length;
  if(count>limit)return {block:unit.block,count,limit};
 }
 return undefined;
}

// ── Exports ──────────────────────────────────────────────────────────────
export const TAROT_VERDICT_RULE='첫 장에서 답한 질문의 결론(fixedConclusions)을 뒤집지 않는다. 다른 쪽이 더 낫다고 쓰지 않고, 다른 쪽의 장점은 "~면에서는", "만약 ~라면"처럼 측면이나 조건으로만 쓴다.';
export const TAROT_TIMING_RULE='타로 카드는 시기를 정해 주지 않는다. 질문에 나온 기간은 그대로 부를 수 있지만 특정 연도·반기·분기·월이 유리하거나 불리하다고, 그때 일이 일어날 가능성이 크다고 쓰지 않는다. questionAnswers의 timing에는 그 기간에 카드가 살피라고 하는 점만 쓴다.';
export const TAROT_POSITION_RULE='각 자리에는 savedCardsOnly에서 그 자리(positionKey·positionLabel)에 저장된 카드만 배정한다. 다른 자리의 카드를 이 자리의 카드로 쓰지 않는다.';

/** Deterministic fixes for a Korean tarot chapter. counts names what changed, for the delivery log. */
export function correctTarotChapter(body:ChapterBody,input:TarotDisciplineInput){
 const context=tarotOf(input);
 const counts={names:0,cards:0,voice:0,verdict:0,timing:0};
 if(!context)return {body,counts};
 const drawn=drawnCards(context);
 const polite=honorific(input)||Boolean(input.persona);
 const verdict=ownsAnswers(body)?undefined:settledVerdict(input,context);
 const timing=cardOnlyTiming(input,context);
 const out=mapProse(body,(text,field)=>{
  let value=canonicalTarotNamesKo(text);
  if(value!==text)counts.names++;
  if(!input.persona){const voiced=correctElder(value,polite);if(voiced!==value){counts.voice++;value=voiced;}}
  if(drawn.length){
   const cards=filterSentences(value,s=>CARD_DROP.has(findTarotProseViolation(s,{drawn})||''));
   counts.cards+=cards.dropped;value=cards.text;
  }
  if(verdict){
   const kept=filterSentences(value,s=>{const side=lean(s,verdict.sides);return side!==undefined&&side!==verdict.side;});
   counts.verdict+=kept.dropped;value=kept.text;
  }
  if(timing){
   const kept=filterSentences(value,claimsTiming);
   counts.timing+=kept.dropped;value=kept.text;
   if(kept.residual&&((field==='answer.timing'&&!input.persona)||(input.chapter.questionPolicy&&input.analysis.consultation?.questionDecision))){counts.timing++;value=TIMING_LIMIT[polite?1:0];}
  }
  return value;
 });
 return {body:out,counts};
}
/** What correctTarotChapter could not fix: a reversed verdict or a timing claim that is a whole field. */
export function validateTarotDiscipline(body:ChapterBody,input:TarotDisciplineInput){
 const context=tarotOf(input);
 if(!context)return;
 const sentences=proseOf(body).flatMap(sentencesOf).map(canonicalTarotNamesKo);
 const verdict=ownsAnswers(body)?undefined:settledVerdict(input,context);
 if(verdict&&sentences.some(s=>{const side=lean(s,verdict.sides);return side!==undefined&&side!==verdict.side;}))throw new FortuneError('TAROT_VERDICT_REVERSED');
 if(cardOnlyTiming(input,context)&&sentences.some(claimsTiming))throw new FortuneError('TAROT_UNGROUNDED_TIMING');
}
/** Prompt rules for a Korean tarot chapter, or undefined for another locale or a reading without cards. */
export function tarotChapterDiscipline(input:TarotDisciplineInput){
 const context=tarotOf(input);
 if(!context)return undefined;
 const evidence=savedTarotConsultation(context) as any;
 const drawn=drawnCards(context);
 const sample=drawn[0]?`${drawn[0].name} ${drawn[0].orientation==='reversed'?'역방향':'정방향'}`:'완드 투 정방향';
 const titles=new Set((input.chapter.sections||[]).map(section=>section.title));
 const owner=Array.isArray(evidence?.cards)&&evidence.cards.some((card:any)=>titles.has(card.positionLabel));
 const verdict=settledVerdict(input,context);
 return {
  ...(input.persona?{}:{voice:`영냥이는 ${honorific(input)?'해요체(~해요, ~예요)':'반말(~해, ~야, ~어)'}로만 말한다. 어른이 아이를 타이르는 어미(~란다, ~단다, ~렴, ~려무나, ~거라, ~느니라)를 쓰지 않는다.`}),
  cardNames:`카드 이름은 savedCardsOnly의 name 그대로 쓰고 방향은 이름 뒤에 정방향·역방향으로 붙인다(예: ${sample}). 따옴표·괄호·꺾쇠로 감싸거나 영어 이름을 병기하지 않는다. 광대·소드 9·컵의 기사·여왕·왕 같은 다른 덱의 표기로 바꾸지 않는다.`,
  cardListing:owner?'자리마다 그 자리에 저장된 카드를 이름과 방향으로 한 번 밝히고 자리의 질문에 맞춰 해석한다.':'이 장은 카드와 자리를 하나씩 다시 나열하지 않는다. 자리별 카드 소개는 자리 해석 장이 맡는다. 이 장의 논점에 필요한 카드만 골라 인용한다.',
  ...(input.chapter.questionPolicy&&input.analysis.consultation?.questionDecision?{questionCardScope:owner?'이 장의 소제목과 일치하는 자리만 맡고 다른 자리의 전체 카드 목록을 다시 설명하지 않는다.':'논점에 필요한 카드 1~3장만 인용하고 앞 장의 해석 대신 서로 다른 선택 조건과 행동을 설명한다.',...(owner?{assignedPositions:evidence.cards.filter((card:any)=>titles.has(card.positionLabel)).map((card:any)=>({positionKey:card.positionKey,positionLabel:card.positionLabel,name:card.name,orientation:card.orientation}))}:{})}:{}),
  ...(verdict?{answerVerdict:{side:verdict.label,rule:`첫 장의 답은 '${verdict.label}' 쪽이다. ${TAROT_VERDICT_RULE}`}}:{}),
  ...(cardOnlyTiming(input,context)?{timingLimit:TAROT_TIMING_RULE}:{}),
 };
}
