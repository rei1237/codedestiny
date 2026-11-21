import type {AskCategory} from './contracts';
import type {Theme} from '../book-contracts';
import type {DomainId} from '../shared/contracts';
import {buildInnateTemperamentPromptLines} from '../../../lib/innate-temperament-prompt.js';

// Editorial guidance only: eligibility, scope and pricing remain in question-policy.
export const questionEditorial:Record<AskCategory,{theme:Theme;answer:string;focus:string}>={
 self:{theme:'self',answer:'내 마음과 선택을 이해하는 실마리',focus:'망설임·부탁 거절·자책 중 실제로 질문한 고민을 다룬다. 성격 설명에서 멈추지 말고 그 상황에서 할 말이나 작은 선택을 제시한다.'},
 love:{theme:'love',answer:'연락과 마음 표현, 지금의 선택',focus:'연락 빈도·표현·관계의 속도 중 질문한 지점에 답한다. 상대의 실제 속마음은 단정하지 않고, 확인된 행동과 질문자의 선택을 구분한다.'},
 reunion:{theme:'love',answer:'다시 연락하기 전 살펴볼 관계의 흐름',focus:'헤어진 상황과 마지막 대화가 제공됐으면 반영한다. 먼저 연락할지 기다릴지의 조건, 연락한다면 부담을 줄이는 표현, 상대의 거절과 경계를 존중하는 기준을 설명한다.'},
 marriage:{theme:'love',answer:'결혼을 생각할 때 확인할 기대와 현실',focus:'결혼 시기·확신·생활 준비 중 질문한 고민을 우선한다. 돈·가사·가족과의 거리 중 관련된 쟁점을 구체화하고, 제공되지 않은 상대 명식을 만들어 비교하지 않는다.'},
 compatibility:{theme:'relations',answer:'두 사람이 잘 맞는 점과 조율할 차이',focus:'두 사람의 표현 속도·갈등 반응·생활·돈·책임 중 질문한 항목을 같은 기준으로 비교한다. 각자의 장점과 부담, 실제로 합의할 문장을 제시한다.'},
 career:{theme:'career',answer:'나에게 맞는 일과 취업 준비의 방향',focus:'적성·취업·현재 업무 중 질문의 판단 대상을 구분한다. 강점이 발휘되는 업무 조건과 소진되는 조건을 비교하고 지원 또는 준비의 우선순위를 설명한다.'},
 job_change:{theme:'career',answer:'남을지 옮길지, 이직의 판단 기준',focus:'현재 직장과 이직 선택지의 업무·보상·성장·생활 제약을 주어진 범위에서 비교한다. 퇴사를 확정적으로 권하지 않고, 준비할 조건과 판단이 달라지는 신호를 구분한다.'},
 business:{theme:'wealth',answer:'사업을 유지하거나 넓히기 전의 선택',focus:'시작·유지·확장 중 질문한 단계를 구분한다. 수익을 보장하지 않고 현금 흐름·고정비·고객 반응 등 실제로 확인할 조건과 실행 순서를 설명한다.'},
 money:{theme:'wealth',answer:'돈이 모이지 않는 흐름과 바꿀 선택',focus:'수입·지출·저축·투자 중 질문한 대상을 다룬다. 재물 기질과 반복 습관을 연결하되 자산·부채를 지어내지 않고, 손실 가능성과 현실 점검을 함께 설명한다.'},
 study:{theme:'career',answer:'시험과 공부, 준비의 우선순위',focus:'시험 종류·목표일·준비 단계가 주어졌다면 반영한다. 집중 방식·실수·복습·시간 배분을 구체화하고 합격 확률이나 결과를 만들어 내지 않는다.'},
 health:{theme:'self',answer:'지친 일상에서 회복할 리듬',focus:'피로·무리·생활 리듬에 관한 질문을 다룬다. 질병이나 치료를 예측하지 않고 쉬는 시간과 부담을 조절할 현실적인 선택을 설명한다.'},
 relationships:{theme:'relations',answer:'사람 사이에서 지킬 거리와 표현',focus:'질문한 관계와 갈등 장면을 우선한다. 단절을 쉽게 권하지 않고 부탁·거절·대화의 구체적인 표현과 경계를 설명한다.'},
 family:{theme:'relations',answer:'가족을 아끼면서 내 몫을 지키는 방법',focus:'가족의 기대와 자신의 부담 사이에서 질문한 갈등에 답한다. 가족 구성과 과거를 지어내지 않고 역할 분담·돈·연락 중 관련된 합의와 말하기 예시를 제시한다.'},
 move:{theme:'timing',answer:'이사와 이동, 지금 바꿔도 될 조건',focus:'이사·해외 이동의 목적·후보·시기를 주어진 범위에서 비교한다. 일·주거비·생활 기반과 계산 가능한 시기 흐름을 구분한다.'},
 timing:{theme:'timing',answer:'지금과 다음 시기, 달라지는 과제',focus:'사용자가 지정한 기간 또는 시기 전환만 다룬다. 현재와 다음의 근거·과제·준비를 비교하고 계산되지 않은 월별·날짜별 사건은 만들지 않는다.'},
 other:{theme:'self',answer:'이번 고민에서 먼저 풀어볼 선택',focus:'질문에 담긴 독립 고민을 구분하고 우선순위를 먼저 밝히며 고민마다 중복 없이 직접 답한다. 질문하지 않은 연애·재물·직업 총론으로 확장하지 않고 주어진 사실과 선택지를 연결한다.'},
};

type FocusContext={category:AskCategory;target:'self'|'pair';domain:DomainId;question:string};

export function focusedQuestionAnswer({category,target,domain,question}:FocusContext){
 const text=question.replace(/\s+/g,' ').trim();
 const income=category==='money'&&/(?:수입|소득|연봉|월급|급여).{0,17}(?:더\s*(?:벌|늘|받)|늘리|늘릴|높이|높일|올리|올릴|인상)|돈.{0,8}(?:(?:더|잘|많이)\s*){0,2}벌|더\s*(?:(?:잘|많이)\s*)?벌|수입원|부업/.test(text);
 if(income)return {
  title:'수입을 늘릴 수 있는 현실적인 선택',
  direct:'지출 관리가 아니라 수입을 늘리는 방법부터 답한다. 입력과 실제 근거가 뒷받침하는 경우에만 본업에서 보상·역할 조정, 이직에 따른 보상 비교, 부업·사업 수요 확인 중 관련 경로를 좁힌다. 직업·현재 급여·시장 보수를 추정하거나 수익·투자 성과를 보장하지 않는다.',
  action:'다음 행동은 보상 기준 확인, 채용 공고의 보상 범위 비교, 작은 유료 수요 확인처럼 비용이 낮고 되돌릴 수 있는 검증 하나를 고른다. 이미 직업이나 제약을 입력했다면 그 조건을 반영한다.',
 };
 if(target==='pair'&&['compatibility','marriage'].includes(category)&&/결혼|함께\s*살|같이\s*살|동거|가정을/.test(text))return {
  title:'두 사람이 결혼을 생각할 때 맞는 점과 조율할 조건',
  symbolicPair:domain==='tarot',
  direct:domain==='tarot'
    ? '질문에 대한 조건부 답부터 제시한다. 저장된 카드의 상징은 질문자의 고민과 대화에 대한 참고일 뿐, 두 사람의 출생 궁합·상대의 속마음·결혼 여부를 확인하지 못한다고 분명히 밝힌다.'
    : '조건부 답부터 제시한다. 동일 기준에서 두 사람의 저장된 관계 근거와 실제로 제공한 상황을 비교해 맞는 점 하나와 부딪힐 조건 하나를 구분한다. 상대의 자료가 없거나 이 체계의 범위를 벗어나는 부분은 비교할 수 없다고 밝히며 결혼 여부나 숨은 속마음을 단정하지 않는다.',
  action:'돈·가사·갈등 후 회복·양가와의 거리 중 질문과 입력에 가장 관련 깊은 한 가지를 정해, 결혼 전에 함께 확인하거나 합의할 구체적 질문을 제시한다. 결혼 또는 이별을 결정해 주지 않는다.',
 };
 if(category==='reunion'||category==='love'&&/재회|(?:다시|먼저)\s*연락|헤어진/.test(text))return {
  title:'다시 연락하기 전 확인할 신호와 선택',
  direct:'상대가 반드시 연락한다거나 연락할 날짜·확률·속마음을 지어내지 않는다. 질문자가 실제로 확인한 마지막 행동과 대화, 계산·카드로 해석할 수 있는 범위를 분리한다. 먼저 연락할 때와 기다릴 때의 조건을 제시한다.',
  action:'연락을 원치 않는다는 표현, 차단, 반복된 무응답이 확인되면 접촉을 권하지 않는다. 그런 사실이 없고 사용자가 연락을 고려한다면 부담 없는 한 문장과 답이 없을 때 멈추는 기준을 제시한다.',
 };
 if(category==='career'||category==='job_change')return {
  direct:'취업·현재 역할·다른 직장 중 실제 질문의 대상을 먼저 답한다. 본인의 강점과 소진 조건을 저장된 근거로 설명하고, 업무 내용·보상·성장·생활 제약은 입력으로 확인된 항목만 비교한다. 합격·이직 성공이나 근거 없는 날짜를 예측하지 않는다.',
  action:'지원 공고 비교, 역할 조건 질문, 작은 직무 실험 등 퇴사나 계약 전에 해 볼 수 있는 검증 하나와 판단이 바뀌는 조건을 제시한다.',
 };
 return undefined;
}

export const foundationGuide:Record<DomainId,{title:string;instruction:string}>={
 saju:{title:'내 사주의 바탕 · 기질과 오행의 균형',instruction:'일간을 나의 기본 기질로, 오행의 많고 적음을 힘을 쓰는 방식으로, 십성을 표현·책임·관계·돈을 다루는 패턴으로 풀어쓴다. 강점과 과하거나 위축될 때의 부담을 함께 설명한다. 실제 원국 근거를 사용하고 과한 기운도 부족할 때와 비슷한 어려움으로 드러날 수 있음을 해당 근거가 있을 때 설명한다. 생시 미상의 시주는 만들지 않는다.'},
 ziwei:{title:'내 자미두수의 바탕 · 명궁과 별의 성향',instruction:'명궁·신궁과 실제 별의 배치에서 성향과 행동의 바탕을 읽는다. 별 이름에는 쉬운 뜻을 붙이고 생년·대한·유년의 근거를 혼동하지 않는다.'},
 sukuyo:{title:'내 본명숙의 바탕 · 마음과 관계의 리듬',instruction:'본명숙의 고유 성향과 관계에서 드러나는 강점·부담을 설명한다. 두 사람의 입력이 있는 경우에만 방향별 관계를 비교하고 관계 이름만으로 길흉을 단정하지 않는다.'},
 vedic:{title:'내 베다 차트의 바탕 · 라그나와 달의 성향',instruction:'실제 라그나·달·나크샤트라를 쉬운 말로 설명하고 하우스와 주인 행성의 근거를 연결한다. 서양 점성술의 기준이나 사주의 용어를 섞지 않는다.'},
 astrology:{title:'내 출생 차트의 바탕 · 성향과 마음의 반응',instruction:'태양·달·상승점과 실제 행성의 각에서 읽히는 성향을 설명한다. 출생시간이 불명확한 상승점·하우스를 확정하지 않고 출생 배치로 사건 날짜를 예측하지 않는다.'},
 tarot:{title:'카드에 비친 지금의 마음과 태도',instruction:'저장된 카드의 이름·정역방향·상징에서 지금의 태도와 상황을 읽는다. 타고난 성격이나 상대의 실제 속마음을 단정하지 않는다.'},
};

const natureAnchors:Record<Exclude<DomainId,'tarot'>,string>={saju:'일간·월지·오행 분포와 십성',ziwei:'명궁·신궁의 주성',sukuyo:'본명숙',vedic:'라그나·달·나크샤트라',astrology:'태양·달·상승점(ASC)'};
/** nature section: the disposition overview opens the reading. Tarot has no birth disposition and keeps its guide. */
export function natureOverview(domain:DomainId){
 if(domain==='tarot')return foundationGuide.tarot.instruction;
 return foundationGuide[domain].instruction+` 이 소절은 타고난 성향 총론이다. ${natureAnchors[domain]}을 중심 근거로 이 사람의 타고난 기질과 성향을 먼저 전반적으로 짚어, 상담자가 나를 정확히 봤다고 느끼도록 신뢰가 서게 시작한다. 핵심 기질 두세 가지, 감정과 관계에서의 반응, 일과 결정을 내리는 습관, 에너지를 채우는 방식을 계산 사실의 쉬운 뜻 → 생활에서 드러나는 장면 순서로 구체적으로 쓴다. 강점과 부담은 핵심만 짧게 짚고 자세한 활용과 조정은 뒤 장에 맡긴다. 재물·연애·직업·시기 운세로 성향 총론을 대신하지 않는다.\n${buildInnateTemperamentPromptLines(domain).join('\n')}`;
}
