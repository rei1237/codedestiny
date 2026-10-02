// v7 chapter prompt and output schema (design docs/design/yeongnyangi-v7-chapter-catalog.md §2, §6-5).
// Pure and deterministic: it turns one resolved v7 chapter plus the previous chapters' bodies into the
// pieces chapter.ts needs (promptVersion, depth, v7-only domainRules keys, schema overrides, token budget).
// Nothing calls it yet — the §6-6 wiring adds the `chapter.version===READING_V7_VERSION` branches, so v6
// payloads stay byte-identical while READING_V7_ENABLED is false.
//
// Fact selection is NOT done here. chapter-facts.ts routes v7 to selectV7Facts (owns ∪ refs) and chapter.ts
// then runs the usual explanationFacts filter; this module takes that final list so the schema enum and
// CALCULATED_DATA can never disagree.
import type {ChapterBody} from './book-contracts';
import type {Evidence} from './shared/contracts';
import type {ChapterSpecV7} from './reading-v7';
import {charsAllowedByTokens,tokensRequiredForChars} from '../../lib/llm-budget.js';

export const V7_PROMPT_VERSION='chapter-v7';
/** Carry budget from the cost model (§5 input term: 15,000 + min(150 × i, 3,000)). */
export const V7_CARRY_TOKENS=3000;
export const V7_CARRY_CHARS=charsAllowedByTokens(V7_CARRY_TOKENS);
/** One conclusion line per insight unit; v6 cut previous summaries at 150 and those were whole paragraphs. */
export const V7_HIGHLIGHT_CHARS=120;
export const V7_SCENE_TAG='scene:';
export const V7_ACTION_TAG='action:';

/** v7TimingSummaries adds this line to timingRef:'summary' chapters. */
export type V7PromptChapter=ChapterSpecV7&{timingSummary?:string};
export type V7Previous=Pick<ChapterBody,'highlights'|'topics'>&Partial<ChapterBody>;
export type V7Carry={previousHighlights:string[];previousTopics:string[];usedScenes:string[];usedActions:string[]};

const oneLine=(value:unknown)=>String(value??'').replace(/\s+/g,' ').trim();

const BLOCK_CONTRACT='sectionContract의 id를 순서와 개수 그대로 하나씩 blocks로 만든다. 블록 하나가 인사이트 하나다. 한 블록 안에서 현상→근거→조건·시기→행동을 끝내고 블록을 더 쪼개거나 합치지 않는다. title은 구매 언어로 된 자연스러운 소제목이다. paragraphs는 각각 500자 이하, 보통 150~350자로 쓰고 소절 목표가 500자를 넘으면 문장 단위로 끊어 여러 문단으로 나눈다. 본문은 blocks에만 쓰고 analysis는 빈 배열, example과 advice는 빈 문자열이다. 장면은 id가 scene인 소절에만, 선택 비교는 id가 decision인 소절에만 쓴다. 그 소절이 없으면 장면도 선택도 쓰지 않는다.';
const CITATION_CONTRACT='각 block의 sources에 그 블록에서 실제로 쓴 근거 ID를 1개 이상 넣고, 최상위 sources에는 모든 blocks[].sources의 합집합을 빠짐없이 넣는다. sources는 CALCULATED_DATA.facts의 id를 글자 그대로 쓰고 label을 쓰거나 새 ID를 만들지 않는다. 제공된 근거는 블록 전체에서 한 번 이상 인용한다.';
const OWNERSHIP_RULE='owns의 사실만 이 장에서 새로 해설한다. references의 사실은 다른 장이 소유하므로 이번 해석을 잇는 한 문장으로만 가리키고 다시 설명하거나 근거로 펼치지 않는다.';
const WRITING_CONTRACT='previousHighlights는 재사용 금지 목록이다. 앞 장의 결론을 단어만 바꾸어 다시 쓰지 않는다. 장면은 가상의 예시이며 실제 경험의 증거가 아니다. 실제 직업이나 동료가 있다고 단정하지 않는다. summary는 이번 장만의 결론으로 쓴다.';
const TIMING_SCOPE:Record<ChapterSpecV7['timingRef'],string>={
  owner:'이 장이 이 시기 사실을 소유한다. 제공된 기간만 해설하고 다른 시기 장이 소유한 기간을 다시 설명하지 않는다.',
  summary:'timingSummary는 시기 장이 소유한 흐름의 한 줄 요약이다. 조건을 말할 때 한 문장으로만 가리키고 연·월·주기를 새로 해석하거나 사건 시점을 만들지 않는다.',
  none:'이 장은 시기를 다루지 않는다. 연·월·주기를 해석하지 않는다.',
};

/** Chapter 0 of an ask reading keeps the question path; every other v7 chapter is chapter-v7. */
export const v7PromptVersion=(askFirstChapter=false)=>askFirstChapter?'ask-chapter-v1':V7_PROMPT_VERSION;
/** v6 reads the title with a regex; v7 asks the ledger instead — only the owner chapter sees timing facts. */
export const v7TimeTheme=(chapter:Pick<V7PromptChapter,'timingRef'>)=>chapter.timingRef==='owner';
/** v7 has no requiredSections and no fixed paragraph count, so depth is the insight list itself. */
export const v7Depth=(chapter:Pick<V7PromptChapter,'mustCover'>)=>chapter.mustCover.join(' → ');

/**
 * Previous-chapter carry, rebuilt from the existing required fields (highlights[], topics[]) so no schema,
 * renderer or DB change is needed. Scene/action tags are the dedup keys v6 lost when previousExamples went
 * empty, so they are kept whole; conclusions fill whatever the budget leaves, newest chapter first.
 */
export function v7Carry(previous:readonly V7Previous[],budgetChars=V7_CARRY_CHARS):V7Carry{
  const add=(list:string[],value:string)=>{if(value&&!list.includes(value))list.push(value);};
  const usedScenes:string[]=[],usedActions:string[]=[],previousTopics:string[]=[];
  for(const chapter of previous)for(const raw of chapter.topics||[]){
    const topic=oneLine(raw);
    if(topic.startsWith(V7_SCENE_TAG))add(usedScenes,topic.slice(V7_SCENE_TAG.length).trim());
    else if(topic.startsWith(V7_ACTION_TAG))add(usedActions,topic.slice(V7_ACTION_TAG.length).trim());
    else add(previousTopics,topic);
  }
  const previousHighlights:string[]=[];
  let left=Math.max(0,budgetChars-[...usedScenes,...usedActions,...previousTopics].reduce((n,s)=>n+s.length,0));
  for(const chapter of [...previous].reverse())for(const raw of chapter.highlights||[]){
    const line=oneLine(raw).slice(0,V7_HIGHLIGHT_CHARS);
    if(!line||previousHighlights.includes(line))continue;
    if(line.length>left)return {previousHighlights,previousTopics,usedScenes,usedActions};
    previousHighlights.push(line);left-=line.length;
  }
  return {previousHighlights,previousTopics,usedScenes,usedActions};
}

/**
 * Output budget. withV7Sections already sets outputTokens for the chapter target; assigned questions add
 * their own room on top (same per-answer chars as v5/v6: 480, or 700 for a period ask) so a long chapter never loses its ending
 * to the question block (principle 17: a missing result is the worst outcome).
 */
export const v7OutputTokens=(chapter:Pick<V7PromptChapter,'outputTokens'|'targetChars'>,questionCount=0,answerChars=480)=>
  Math.max(chapter.outputTokens||0,tokensRequiredForChars((chapter.targetChars?.[1]||0)+600+questionCount*answerChars));

/**
 * Schema overrides merged into the shared chapter schema. One block per section, id and sources required.
 * highlights/topics carry no minItems on purpose: a short list is corrected downstream (principle 17),
 * while a schema floor would turn it into a refused generation.
 */
export function v7OutputSchema(chapter:Pick<V7PromptChapter,'sections'>,sourceIds:readonly string[]){
  const ids=(chapter.sections||[]).map(section=>section.id);
  return {
    blocks:{type:'array',minItems:ids.length,maxItems:ids.length,items:{
      type:'object',additionalProperties:false,required:['id','title','paragraphs','sources'],
      properties:{
        id:{type:'string',enum:ids},
        title:{type:'string'},
        paragraphs:{type:'array',minItems:1,items:{type:'string'}},
        sources:{type:'array',minItems:1,items:{type:'string',enum:[...sourceIds]}},
      },
    }},
  };
}

export interface V7PromptInput{
  chapter:V7PromptChapter;
  /** chapter.ts's explanationFacts result — the same list CALCULATED_DATA carries. */
  facts:readonly Evidence[];
  previous:readonly V7Previous[];
  askFirstChapter?:boolean;
  questionCount?:number;
  answerChars?:number;
  carryChars?:number;
}
export interface V7PromptParts{
  promptVersion:string;
  timeTheme:boolean;
  depth:string;
  sourceIds:string[];
  carry:V7Carry;
  domainRules:Record<string,unknown>;
  outputSchema:ReturnType<typeof v7OutputSchema>;
  maxOutputTokens:number;
}

/**
 * The v7-only half of a chapter request. §6-6 spreads `domainRules` over the shared keys and `outputSchema`
 * over the shared properties; everything a v6 chapter sends stays where it is.
 */
export function buildV7ChapterPrompt(input:V7PromptInput):V7PromptParts{
  const {chapter}=input;
  const sourceIds=[...new Set(input.facts.map(fact=>fact.id))];
  const carry=v7Carry(input.previous,input.carryChars);
  const summary=chapter.timingRef==='summary'?oneLine(chapter.timingSummary):'';
  return {
    promptVersion:v7PromptVersion(input.askFirstChapter),
    timeTheme:v7TimeTheme(chapter),
    depth:v7Depth(chapter),
    sourceIds,
    carry,
    domainRules:{
      depth:v7Depth(chapter),
      insightUnits:chapter.minInsightUnits,
      blockContract:BLOCK_CONTRACT,
      citationContract:CITATION_CONTRACT,
      factOwnership:{owns:chapter.owns,references:chapter.refs,rule:OWNERSHIP_RULE},
      excludedSubjects:chapter.mustNotCover,
      timingScope:TIMING_SCOPE[chapter.timingRef],
      timingSummary:summary||undefined,
      highlightContract:`highlights에는 인사이트 단위마다 결론 한 줄을 넣는다(${chapter.minInsightUnits}개). previousHighlights에 있는 결론을 다시 쓰지 않는다.`,
      topicContract:`topics에는 이 장에서 다룬 주제 태그를 넣는다.${chapter.scene?` 장면 소재는 '${V7_SCENE_TAG}<소재>' 태그로 하나 넣고 usedScenes에 있는 소재는 고르지 않는다.`:''}${chapter.decision?` 제시한 행동은 '${V7_ACTION_TAG}<행동>' 태그로 하나 넣고 usedActions에 있는 행동은 고르지 않는다.`:''}`,
      writingContract:WRITING_CONTRACT,
      previousHighlights:carry.previousHighlights,
      previousTopics:carry.previousTopics,
      usedScenes:carry.usedScenes,
      usedActions:carry.usedActions,
      // v6 carries whole previous summaries and examples; v7 replaces both so the carry stays inside its budget.
      previousConclusions:undefined,
      previousExamples:undefined,
    },
    outputSchema:v7OutputSchema(chapter,sourceIds),
    maxOutputTokens:v7OutputTokens(chapter,input.questionCount||0,input.answerChars),
  };
}
