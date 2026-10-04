// v7-only prose audit (design docs/design/yeongnyangi-v7-chapter-catalog.md §4, §7; handoff 2026-09-28 Phase 3).
//
// The three primary checks are the ones the v6 measurement found real on finished books: a chapter explaining a
// fact another chapter owns, a chapter restating a reference point it may only point at, and a chapter spending a
// scene subject or action a previous chapter already used. Per-sentence similarity is a backstop only — v6 passed
// every chapter-pair n-gram test (max 5-gram Jaccard .05) while repeating itself, so similarity can never be the
// primary signal.
//
// Pure and deterministic, and it never refuses a reading (principle 17). chapter.ts applies this editorial
// correction on the first usable draft without buying another generation, and logs the counts.
// Scope is block paragraphs plus the scene/action topic tags — the only prose that
// can be deleted without emptying a required field, so summary/persona/highlights/questionAnswers are left alone.
//
// The term tables are Korean. A non-ko reading is only covered by the language-agnostic checks (scene reuse and
// the similarity backstop); ko is the only locale the v7 catalog is authored for.
import type {ChapterBody} from './book-contracts';
import type {ChapterSpecV7} from './reading-v7';
import {PALACE_SLUGS,SHINSAL_SLUGS,TEN_GOD_SLUGS} from './reading-v7-ledger';
import {SENTENCE_BOUNDARY} from './reading-quality';
import {V7_ACTION_TAG,V7_SCENE_TAG,v7Carry,type V7Previous} from './reading-v7-prompt';

export const V7_FOREIGN_FACT='V7_FOREIGN_FACT';
export const V7_ANCHOR_REPEAT='V7_ANCHOR_REPEAT';
export const V7_SCENE_REUSE='V7_SCENE_REUSE';
export const V7_RESTATED_SENTENCE='V7_RESTATED_SENTENCE';
/** Severity order: the first code with a violation is the one the repair attempt is asked to fix. */
export const V7_QUALITY_CODES=[V7_FOREIGN_FACT,V7_ANCHOR_REPEAT,V7_SCENE_REUSE,V7_RESTATED_SENTENCE] as const;
export const isV7QualityCode=(code?:string)=>V7_QUALITY_CODES.includes((code||'') as typeof V7_QUALITY_CODES[number]);

/** The measurement's reworded-repeat metric: per-sentence char 3-gram Dice over sentences of 20+ characters. */
export const V7_RESTATE_DICE=.5;
export const V7_SENTENCE_MIN=20;
/** A one or two character tag is a real scene subject in Korean ('이직', '면접'), so only empty tags are skipped. */
export const V7_TAG_MIN=2;

export interface V7Term{term:string;ids:string[];anchor?:boolean}
/** Ledger sub-IDs the term names, as id suffixes: ownership is decided by the chapter's own owns/refs list. */
const fromSlugs=(table:Record<string,string>,label:string):V7Term[]=>
  Object.entries(table).map(([ko,slug])=>({term:ko,ids:[`.${label}.${slug}`]}));
const fromPlanets=(table:Record<string,string>,label:string):V7Term[]=>
  Object.entries(table).map(([ko,name])=>({term:ko,ids:[`.${label}.${name}`]}));
const SPOUSE_GODS=['정재','편재','정관','편관'];
const BUSINESS_NAMED=['재백궁','자녀궁','전택궁','관록궁','복덕궁','부부궁','천이궁'];
const HEALTH_NAMED=['질액궁','부모궁','복덕궁'];
// 태양 and 달 are excluded from the planet tables: both are ordinary Korean words. Astrology keeps 태양 as a
// reference point (design §4) because the sun sign is its anchor; vedic nodes keep their transliterated names.
const KO_PLANETS:Record<string,string>={화성:'Mars',수성:'Mercury',목성:'Jupiter',금성:'Venus',토성:'Saturn'};
const KO_OUTER:Record<string,string>={천왕성:'Uranus',해왕성:'Neptune',명왕성:'Pluto'};
const KO_TRANSFORMS:Record<string,string>={화록:'huaLu',화권:'huaQuan',화과:'huaKe',화기:'huaJi'};
/** Reference points from the design §4 table plus the ledger's own distinctive vocabulary. */
export const V7_TERMS:Record<string,V7Term[]>={
  saju:[
    {term:'일간',ids:['.dayMaster'],anchor:true},
    {term:'일주',ids:['.pillars'],anchor:true},
    {term:'신강',ids:['.strengthHeuristic'],anchor:true},
    {term:'신약',ids:['.strengthHeuristic'],anchor:true},
    {term:'오행',ids:['.fiveElements','.elementProfile.balance','.elementProfile.traits'],anchor:true},
    // The anchor owns the ten-god cluster profile, so it may name single ten gods; 역마 also belongs to the movement facts.
    // Spouse stars and 도화·홍염 also belong to the romance timing facts (an id ending in '.' matches as a prefix).
    ...fromSlugs(TEN_GOD_SLUGS,'tenGods').map(t=>({...t,ids:[...t.ids,'.tenGodProfile',...(SPOUSE_GODS.includes(t.term)?['.romanceTiming.']:[])]})),
    ...fromSlugs(SHINSAL_SLUGS,'shinsal').map(t=>t.term==='역마살'?{...t,ids:[...t.ids,'.movementSignals.natal']}
      :t.term==='도화살'||t.term==='홍염살'?{...t,ids:[...t.ids,'.romanceTiming.']}:t),
  ],
  ziwei:[
    {term:'명궁',ids:['.palaces.myeong','.lifePalace'],anchor:true},
    {term:'신궁',ids:['.bodyPalace'],anchor:true},
    // 사업운·건강 근거 문장이 부르는 궁과 사화는 그 근거를 가진 장에서도 이름을 쓸 수 있다(ziwei/derived.ts).
    ...fromSlugs(PALACE_SLUGS,'palaces').map(t=>({...t,ids:[...t.ids,...(BUSINESS_NAMED.includes(t.term)?['.businessBasis']:[]),...(HEALTH_NAMED.includes(t.term)?['.healthBasis']:[])]})),
    ...fromPlanets(KO_TRANSFORMS,'fourTransformations').map(t=>({...t,ids:[...t.ids,'.businessBasis','.healthBasis']})),
  ],
  vedic:[
    {term:'라그나',ids:['.lagna'],anchor:true},
    {term:'나크샤트라',ids:['.lagna','.moon'],anchor:true},
    // 요가의 성립 조건과 건강 근거(vedic/derived.ts)는 행성을 부르므로 그 사실을 가진 장도 행성 이름을 쓸 수 있다.
    ...fromPlanets(KO_PLANETS,'planets').map(t=>({...t,ids:[...t.ids,'.yogas.','.healthBasis']})),
    {term:'라후',ids:['.planets.Rahu','.healthBasis']},
    {term:'케투',ids:['.planets.Ketu','.healthBasis']},
  ],
  astrology:[
    {term:'상승점',ids:['.ascendant'],anchor:true},
    {term:'태양',ids:['.planets.Sun'],anchor:true},
    {term:'중천점',ids:['.midheaven']},
    // 하우스 주인·섹트·건강 근거(astrology/derived.ts)는 전통 행성을 부르므로 그 사실을 가진 장도 행성 이름을 쓸 수 있다.
    ...fromPlanets(KO_PLANETS,'planets').map(t=>({...t,ids:[...t.ids,'.houseRulers.','.chartSect','.healthBasis']})),
    ...fromPlanets(KO_OUTER,'planets'),
  ],
  sukuyo:[{term:'본명숙',ids:['.personA'],anchor:true}],
  tarot:[{term:'스프레드',ids:['.spreadId'],anchor:true}],
};
/** House numbers are a pattern, not a word list. Vedic and astrology store them under different labels. */
const HOUSE_LABEL:Record<string,string>={vedic:'houses',astrology:'houseCusps'};
// 하우스 번호를 근거 문장에 쓰는 파생 사실: 요가는 켄드라·트리코나·두스타나 전부, 베다 건강은 1·6·8·12하우스,
// 점성술 하우스 주인은 주인이 앉은 어느 하우스든, 점성술 건강은 1·6·8·12하우스.
const HEALTH_HOUSES=[1,6,8,12];
const HOUSE_EXTRA:Record<string,(house:number)=>string[]>={
  vedic:house=>['.yogas.',...(HEALTH_HOUSES.includes(house)?['.healthBasis']:[])],
  astrology:house=>['.houseRulers.',...(HEALTH_HOUSES.includes(house)?['.healthBasis']:[])],
};
const HOUSE_TERM=/(\d{1,2})\s*번?\s*하우스/gu;

const NORM=(s:string)=>s.normalize('NFC').replace(/\s+/g,' ').trim();
const GRAM_SOURCE=(s:string)=>s.normalize('NFC').replace(/[^\p{L}\p{N}]/gu,'');
function gramsOf(text:string,cache:Map<string,Set<string>>):Set<string>{
  const found=cache.get(text);
  if(found)return found;
  const clean=GRAM_SOURCE(text);
  const result=new Set(Array.from({length:Math.max(0,clean.length-2)},(_,i)=>clean.slice(i,i+3)));
  cache.set(text,result);
  return result;
}
const dice=(left:Set<string>,right:Set<string>)=>{
  if(!left.size||!right.size)return 0;
  let shared=0;for(const gram of left)if(right.has(gram))shared++;
  return 2*shared/(left.size+right.size);
};

export type V7AuditChapter=Pick<ChapterSpecV7,'owns'|'refs'|'scene'|'decision'>;
export interface V7AuditInput{
  body:ChapterBody;
  chapter:V7AuditChapter;
  previous:readonly V7Previous[];
  /** Chapter 0 of an ask reading answers the question across the whole chart, so ownership is not its rule. */
  askFirstChapter?:boolean;
}
export interface V7Violation{code:string;block:number;paragraph:number;sentence:number;term:string}
export interface V7Audit{
  violations:V7Violation[];
  /** Indices of topics[] whose scene:/action: tag repeats a previous chapter's. */
  topics:number[];
  code?:string;
  detail?:string;
}
interface Unit{block:number;paragraph:number;index:number;plain:string}

/** Sentence units in document order. SENTENCE_BOUNDARY is zero-width, so the parts rejoin to the paragraph. */
export const v7SentenceParts=(paragraph:string)=>paragraph.split(SENTENCE_BOUNDARY);
function sentenceUnits(body:ChapterBody):Unit[]{
  const units:Unit[]=[];
  (body.blocks||[]).forEach((block,b)=>(block?.paragraphs||[]).forEach((paragraph,p)=>{
    if(typeof paragraph!=='string')return;
    v7SentenceParts(paragraph).forEach((part,i)=>units.push({block:b,paragraph:p,index:i,plain:NORM(part)}));
  }));
  return units;
}
const previousSentences=(previous:readonly V7Previous[])=>previous
  .flatMap(chapter=>chapter.blocks?.flatMap(block=>block?.paragraphs||[])||chapter.analysis||[])
  .filter((paragraph):paragraph is string=>typeof paragraph==='string')
  .flatMap(paragraph=>v7SentenceParts(paragraph).map(NORM))
  .filter(sentence=>sentence.length>=V7_SENTENCE_MIN);

/** owns wins over refs: a chapter that owns the fact explains it as often as the insight needs. */
function allowance(chapter:V7AuditChapter,ids:readonly string[],anchor:boolean){
  const has=(list:readonly string[])=>list.some(id=>ids.some(suffix=>suffix.endsWith('.')?id.includes(suffix):id.endsWith(suffix)));
  if(has(chapter.owns))return Infinity;
  return anchor||has(chapter.refs)?1:0;
}

/**
 * The audit. One violation per sentence at most, taken in severity order, so a prune is idempotent and the
 * repair instruction names the rule that actually broke.
 */
export function auditV7Chapter(input:V7AuditInput):V7Audit{
  const {chapter}=input;
  const domain=(chapter.owns[0]||chapter.refs[0]||'').split('.')[0];
  const units=sentenceUnits(input.body);
  const violations:V7Violation[]=[];
  const flagged=new Set<string>();
  const at=(unit:Unit)=>`${unit.block}/${unit.paragraph}/${unit.index}`;
  const flag=(unit:Unit,code:string,term:string)=>{
    if(flagged.has(at(unit)))return;
    flagged.add(at(unit));
    violations.push({code,block:unit.block,paragraph:unit.paragraph,sentence:unit.index,term});
  };

  // 1-2. Fact ownership and reference points. The ask chapter is exempt: its evidence is the widened ask packet.
  if(!input.askFirstChapter&&domain){
    const spent=new Map<string,number>();
    const check=(unit:Unit,term:string,ids:string[],anchor:boolean)=>{
      const limit=allowance(chapter,ids,anchor);
      if(limit===Infinity)return;
      const used=spent.get(term)||0;
      spent.set(term,used+1);
      if(used<limit)return;
      flag(unit,limit?V7_ANCHOR_REPEAT:V7_FOREIGN_FACT,term);
    };
    const terms=V7_TERMS[domain]||[];
    const houseLabel=HOUSE_LABEL[domain];
    for(const unit of units){
      for(const entry of terms)if(unit.plain.includes(entry.term))check(unit,entry.term,entry.ids,Boolean(entry.anchor));
      if(!houseLabel)continue;
      for(const match of unit.plain.matchAll(HOUSE_TERM)){
        const house=Number(match[1]);
        if(house>=1&&house<=12)check(unit,`${house}하우스`,[`.${houseLabel}.${house}`,...(HOUSE_EXTRA[domain]?.(house)||[])],false);
      }
    }
  }

  // 3. Scene subjects and actions a previous chapter already spent. The tag is checked against the chapter's own
  // declaration and against the block that carries it, never against the whole chapter: a subject named once in
  // an interpretation is not a reused scene.
  const {usedScenes,usedActions}=v7Carry(input.previous);
  const tagged=(list:string[])=>list.map(NORM).filter(value=>value.length>=V7_TAG_MIN);
  const scenes=tagged(usedScenes),actions=tagged(usedActions);
  const topics:number[]=[];
  (input.body.topics||[]).forEach((raw,index)=>{
    const topic=NORM(String(raw??''));
    const scene=topic.startsWith(V7_SCENE_TAG)&&scenes.includes(NORM(topic.slice(V7_SCENE_TAG.length)));
    const action=topic.startsWith(V7_ACTION_TAG)&&actions.includes(NORM(topic.slice(V7_ACTION_TAG.length)));
    if(scene||action)topics.push(index);
  });
  const blockId=(index:number)=>input.body.blocks?.[index]?.id;
  for(const unit of units){
    const list=blockId(unit.block)==='scene'?scenes:blockId(unit.block)==='decision'?actions:[];
    const hit=list.find(value=>unit.plain.includes(value));
    if(hit)flag(unit,V7_SCENE_REUSE,hit);
  }

  // 4. Exact repeats within this draft are editable too; retain the first occurrence.
  const seen=new Set<string>();
  for(const unit of units){
    if(unit.plain.length<=35)continue;
    if(seen.has(unit.plain))flag(unit,V7_RESTATED_SENTENCE,'current');
    else seen.add(unit.plain);
  }

  // Backstop: a previous chapter's sentence written again in other words.
  const earlier=previousSentences(input.previous);
  if(earlier.length){
    const cache=new Map<string,Set<string>>();
    const earlierGrams=earlier.map(sentence=>gramsOf(sentence,cache));
    for(const unit of units){
      if(unit.plain.length<V7_SENTENCE_MIN||flagged.has(at(unit)))continue;
      const grams=gramsOf(unit.plain,cache);
      if(earlierGrams.some(other=>dice(grams,other)>=V7_RESTATE_DICE))flag(unit,V7_RESTATED_SENTENCE,'previous');
    }
  }

  const code=V7_QUALITY_CODES.find(candidate=>violations.some(violation=>violation.code===candidate))
    ||(topics.length?V7_SCENE_REUSE:undefined);
  const worst=violations.filter(violation=>violation.code===code);
  const terms=[...new Set(worst.map(violation=>violation.term))].slice(0,3);
  const detail=code?`${code}:${terms.join(',')||'topic'}:${worst.length||topics.length}`:undefined;
  return {violations,topics,code,detail};
}

/**
 * Deterministic repair. Flagged sentences are deleted; a paragraph left empty is dropped and a block left with no
 * paragraph keeps its original first paragraph, because the block count must still match sections.length. Losing
 * the whole chapter to a repeat would be the worst outcome (principle 17), so a duplicate that survives is logged
 * rather than thrown.
 */
export function pruneV7Chapter(body:ChapterBody,audit:V7Audit):{body:ChapterBody;removed:number;chars:number;restored:number}{
  const drop=new Map<string,Set<number>>();
  for(const violation of audit.violations){
    const key=`${violation.block}/${violation.paragraph}`;
    if(!drop.has(key))drop.set(key,new Set());
    drop.get(key)!.add(violation.sentence);
  }
  let removed=0,chars=0,restored=0;
  const blocks=(body.blocks||[]).map((block,b)=>{
    if(!block||!Array.isArray(block.paragraphs))return block;
    const paragraphs=block.paragraphs.flatMap((paragraph,p)=>{
      const cut=drop.get(`${b}/${p}`);
      if(!cut||typeof paragraph!=='string')return [paragraph];
      const parts=v7SentenceParts(paragraph);
      const kept=parts.filter((part,i)=>{
        if(!cut.has(i))return true;
        removed++;chars+=Array.from(NORM(part)).length;
        return false;
      }).join('').trim();
      return kept?[kept]:[];
    });
    if(paragraphs.length||!block.paragraphs.length)return {...block,paragraphs};
    restored++;
    return {...block,paragraphs:[block.paragraphs[0]]};
  });
  const topics=(body.topics||[]).filter((_,index)=>!audit.topics.includes(index));
  return {body:{...body,...(body.blocks?{blocks}:{}),topics},removed,chars,restored};
}
