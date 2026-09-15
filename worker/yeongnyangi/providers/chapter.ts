import {READING_VERSION,PROMPT_VERSION,readingPolicies} from '../fortune/reading-policy';
import {validateReadingQuality} from '../fortune/reading-quality';
import {selectChapterFacts} from '../fortune/chapter-facts';
import {
  ChapterBody,
  ChapterSpec,
  MasterAnalysis,
} from "../fortune/book-contracts";
import {
  FortuneError,
  LLMProvider,
  DomainContext,
} from "../fortune/shared/contracts";
import { explanationFacts } from "../fortune/shared/privacy";
import { persona } from "../prompts/persona/yeongnyangi";
import { fortuneMaster } from "../prompts/system/fortune-master";
import { domainRules } from "../prompts/domain/rules";
import { taskRules } from "../prompts/task/rules";
export interface ChapterRequest {
  chapter: ChapterSpec;
  analysis: MasterAnalysis;
  previous: (Pick<ChapterBody, "summary" | "example" | "topics"> & Partial<ChapterBody>)[];
  repair?: { code: string };
}
export interface FortuneChapterProvider {
  receipt?: { provider: string; model: string };
  generateChapter(input: ChapterRequest): Promise<unknown>;
}
export function repeatedPassage(a:string,b:string) {
  const grams=(text:string)=>{const clean=text.replace(/[^\p{L}\p{N}]/gu,'');return new Set(Array.from({length:Math.max(0,clean.length-2)},(_,i)=>clean.slice(i,i+3)));};
  const left=grams(a),right=grams(b);
  if(left.size<35||right.size<35)return a===b;
  let shared=0;for(const part of left)if(right.has(part))shared++;
  return 2*shared/(left.size+right.size)>.68;
}
export function validateChapter(
  value: unknown,
  input: ChapterRequest,
): ChapterBody {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new FortuneError("INVALID_CHAPTER");
    }
  }
  const v = value as ChapterBody;
  const text = (s: unknown) =>
    typeof s === "string" &&
    s.trim().length > 0 &&
    s.length <= 5000 &&
    !/<\/?[a-z][^>]*>/i.test(s);
  if (
    !v ||
    !text(v.summary) ||
    !text(v.example) ||
    !text(v.advice) ||
    !text(v.persona) ||
    !Array.isArray(v.analysis) ||
    (input.chapter.version !== READING_VERSION && v.analysis.length < 1) ||
    v.analysis.length > 8 ||
    !v.analysis.every(text) ||
    !Array.isArray(v.highlights) ||
    !v.highlights.every(text) ||
    !Array.isArray(v.topics) ||
    !v.topics.every(text)
  )
    throw new FortuneError("INVALID_CHAPTER");
  const allowed = new Set(
    Object.values(input.analysis.contexts).filter(c=>!input.chapter.systems||input.chapter.systems.includes(c.domain)).flatMap((c) =>
      selectChapterFacts(c,input.chapter,input.analysis.topicId).map((f) => f.id),
    ),
  );
  if (
    !Array.isArray(v.sources) ||
    !v.sources.length ||
    v.sources.some((s) => !allowed.has(s))
  )
    throw new FortuneError("INVALID_EVIDENCE");
  if (
    input.previous.some(
      (p) => p.summary === v.summary || p.example === v.example,
    )
  )
    throw new FortuneError("DUPLICATE_CHAPTER");
  validateReadingQuality(v,input.chapter,input.previous);
  return v;
}
const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "analysis",
    "example",
    "advice",
    "highlights",
    "sources",
    "persona",
    "topics",
  ],
  properties: Object.fromEntries(
    [
      "summary",
      "analysis",
      "example",
      "advice",
      "highlights",
      "sources",
      "persona",
      "topics",
    ].map((k) => [
      k,
      ["analysis", "highlights", "sources", "topics"].includes(k)
        ? { type: "array", items: { type: "string" } }
        : { type: "string" },
    ]),
  ),
};
export class StructuredChapterProvider implements FortuneChapterProvider {
  receipt?: { provider: string; model: string };
  constructor(private provider: LLMProvider) {}
  async generateChapter(input: ChapterRequest) {
    const named = Object.entries({
      saju: "사주가 말하는",
      ziwei: "자미두수가 말하는",
      sukuyo: "숙요가 말하는",
      vedic: "베다점이 말하는",
    }).find(([, title]) => input.chapter.title.startsWith(title))?.[0];
    const timeTheme =
      input.chapter.theme === "timing" ||
      /시기|전환|흐름|년/.test(input.chapter.title);
    const contexts = Object.values(input.analysis.contexts)
      .filter((c) => input.chapter.systems?input.chapter.systems.includes(c.domain):!named || c.domain === named)
      .map((c) => ({
        ...c,
        facts: selectChapterFacts(c,input.chapter,input.analysis.topicId).filter(
          (f) =>
            timeTheme ||
            input.chapter.theme === "cross" ||
            input.chapter.theme === "action" ||
            !/Luck|Timeline|dasha|transit/i.test(f.label),
        ),
      }));
    const combined: DomainContext = {
      domain: contexts[0].domain,
      engineVersion: contexts.map((c) => c.engineVersion).join("|"),
      calculatedAt: "",
      facts: contexts.flatMap((c) => c.facts),
      limitations: contexts.flatMap((c) => c.limitations),
    };
    // Keep original numeric/symbolic facts, omit duplicated prose and unrelated
    // lifetime triggers from chapters that are not about timing.
    combined.facts=combined.facts.map(f=>{
      if(f.label!=='advancedFactors'||!f.value||typeof f.value!=='object')return f;
      const value=f.value as Record<string,unknown>;
      const rows=Array.isArray(value.earthStorageOpenings)?value.earthStorageOpenings:[];
      return {...f,value:{...value,promptConfig:undefined,earthStorageOpenings:rows.filter(r=>timeTheme||['cross','action'].includes(input.chapter.theme)||r.timingType==='natal').map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['summaryForPrompt','sourceBranchKorean','triggerBranchKorean'].includes(k))))}};
    });
    const tier = input.chapter.tier || input.chapter.id.split("-")[0];
    const depth = (
      {
        mackerel: "핵심 근거 1~2개와 구체적 조언. 분석 문단 2개.",
        salmon: "반복 패턴의 원인과 상황별 차이까지. 분석 문단 3개.",
        flounder:
          "생애 맥락과 실행 전략, 제공된 기간과 같은 체계 안의 다른 신호까지. 분석 문단 3~4개.",
        tuna: "이 챕터 고유 논점을 깊게. 체계별 근거, 다른 가능성, 생활 사례, 실행 기준. 이전 챕터와 같은 예시를 쓰지 않는다. 분석 문단 4~6개.",
      } as Record<string, string>
    )[tier] || "전문 교차분석. 공통 근거와 상충을 구분하고 실행 기준까지 4~6개 문단으로 설명한다.";
    const facts = explanationFacts(combined) as DomainContext;
    if (JSON.stringify(facts).length > 180000)
      throw new FortuneError("CHAPTER_CONTEXT_TOO_LARGE", 503);
    const response = await this.provider.generate({
      system: `${fortuneMaster}\n${persona}`,
      domainRules: JSON.stringify({
        depth: input.chapter.requiredSections?.join(' → ') || depth,
        lengthContract: input.chapter.version===READING_VERSION?{minimum:input.chapter.minimumChars,target:input.chapter.targetChars,unit:'공백 포함 실제 해설 본문. 제목·목차·요약·배지·출처·반복 안내 제외. 분량을 반복으로 채우지 않는다.'}:undefined,
        correction: input.repair,
        excludedSubjects: input.chapter.excludes,
        paidScope: input.chapter.version===READING_VERSION&&!['tuna','assorted','omakase'].includes(tier)?'용신·희신·대운·마하다샤·안타르다샤·삼방사정 전문 해석 금지. 명식의 일반 해석만 한다.':undefined,
        evidenceLimit: '자료 부족은 낮은 위험이나 좋은 운이 아니다. 없는 시기와 사실은 만들지 않는다. 질병·장기 이상·음식의 치료 효능을 명식으로 판단하지 않는다.',
        blockContract: input.chapter.version===READING_VERSION?'blocks는 requiredSections의 모든 제목을 그대로 사용하고 문단당 500자 이하의 짧은 해설 문단을 담는다. analysis는 빈 배열. example과 advice는 blocks를 반복하지 않는 사례와 실행이다.':undefined,
        narrativeTask: input.chapter.version!==READING_VERSION&&tier==='mackerel'?[
          '첫인상만 다룬다. 말이나 일을 시작하기 전에 무엇을 관찰하는 사람인지 한 가지 장면으로 보여준다. 책임 분배 조언은 하지 않는다.',
          '내면의 선택 기준만 다룬다. 두 선택지 사이에서 마음이 움직이는 기준과 그 반대 가능성을 설명한다. 첫인상과 책임 분배를 재설명하지 않는다.',
          '강점이 유용해지는 조건만 다룬다. 막연한 칭찬 대신 어떤 방식으로 강점을 써볼지 보여준다. 앞선 성격 소개를 반복하지 않는다.',
          '부담의 조기 신호만 다룬다. 알아차릴 징후와 멈추는 기준에 집중한다. 다른 장의 성공 사례를 재사용하지 않는다.',
          '오늘 해볼 작은 실험만 다룬다. 앞의 해설을 재탕하지 말고 시작 행동, 실행 문장 하나, 하루 뒤 확인 질문을 준다.',
        ][input.chapter.ordinal]:`이번 장의 고유 질문 '${input.chapter.focus||input.chapter.title}'에만 답한다.`,
        exampleScene: input.chapter.version!==READING_VERSION&&tier==='mackerel'?[
          '대화를 시작하기 전 상대의 말투를 듣는 짧은 순간',
          '할 일 목록에서 두 항목의 순서를 고르는 순간',
          '복잡한 생각을 메모 한 장으로 정리하는 순간',
          '예상치 못한 부탁을 받고 바로 대답하지 않는 순간',
          '하루를 마치며 내일 하지 않을 일을 한 줄 적는 순간',
        ][input.chapter.ordinal]:undefined,
        writingContract:'previousConclusions와 previousExamples는 재사용 금지 목록이다. 기존 문장을 단어만 바꾸어 쓰지 않는다. exampleScene은 가상의 예시 소재이지 실제 경험의 증거가 아니다. 질문과 맞지 않으면 다른 장면을 고른다. 실제 직업이나 동료가 있다고 단정하지 않는다. summary는 이번 장만의 결론으로 쓴다.',
        topic:input.analysis.topicId,
        periodScope:input.chapter.periodScope,
        independence:"같은 천문 관측을 공유하는 숙요·베다·점성술은 독립된 세 증거가 아니다. 타로는 질문 당시 상징이며 천문 사실의 교차검증 수에 포함하지 않는다. 근거 일치도는 적중 확률이 아니다.",
        domain: contexts.map((c) => domainRules[c.domain]),
        task: taskRules[input.chapter.theme],
        chapter: input.chapter,
        previousTopics: input.previous.flatMap((p) => p.topics),
        previousConclusions: input.previous.map((p) => p.summary.slice(0, 150)),
        previousExamples: input.previous.map((p) => p.example.slice(0, 100)),
        themes: input.chapter.version===READING_VERSION ? undefined : input.analysis.themes,
      }),
      calculatedData: facts,
      userQuestion: input.analysis.question||"",
      outputSchema: {...schema,required:input.chapter.version===READING_VERSION?[...schema.required,"blocks"]:schema.required,properties:{...schema.properties,...(input.chapter.version===READING_VERSION?{blocks:{type:"array",minItems:2,maxItems:8,items:{type:"object",additionalProperties:false,required:["title","paragraphs"],properties:{title:{type:"string"},paragraphs:{type:"array",minItems:1,items:{type:"string"}}}}}}:{}),sources:{
        type:'array',minItems:1,
        description:'해석에 실제 사용한 FortuneFact.id만 그대로 선택한다. 괄호, 설명, 번역을 덧붙이지 않는다.',
        items:{type:'string',enum:facts.facts.map(f=>f.id)},
      }}},
      sectionTitles: [input.chapter.title],
      promptVersion: input.chapter.version===READING_VERSION?PROMPT_VERSION:input.chapter.systems?"chapter-v3":"chapter-v2",
      // Books keep their purchase-time manifest; a later cap increase must still reach retries of those chapters.
      maxOutputTokens:input.chapter.version===READING_VERSION&&input.chapter.tier?Math.max(input.chapter.outputTokens??0,readingPolicies[input.chapter.tier].outputTokens):input.chapter.outputTokens,
    });
    this.receipt = { provider: response.provider, model: response.model };
    let candidate:any=response.result;
    if(typeof candidate==='string'){try{candidate=JSON.parse(candidate);}catch{/* The existing result validator handles malformed JSON. */}}
    if(candidate&&typeof candidate.example==='string'&&input.previous.some(p=>repeatedPassage(candidate.example,p.example)))throw new FortuneError('DUPLICATE_CHAPTER');
    return response.result;
  }
}
