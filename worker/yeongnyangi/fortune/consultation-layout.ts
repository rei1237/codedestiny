import type {Theme} from './book-contracts';
import type {DomainId} from './shared/contracts';

// D7 chapter roles shared by single-system question consultations (question-policy.ts) and fusion-book-v2
// (reading-manifest.ts). Data only: budgets live in consultation-budget.ts, gating in reading-policy.ts.
export type LayoutTopic='work'|'money'|'love'|'relationship'|'luck'|'healing'|'self';
export type LayoutSection={id:string;title:string;instruction:string};
export type LayoutStep={key:string;title:string;theme:Theme;timing?:boolean;sections:LayoutSection[]};
const s=(id:string,title:string,instruction:string):LayoutSection=>({id,title,instruction});
const NO_TIMING='이 체계에 계산된 시기 근거가 없으면 시기를 예측하지 않고, 판단을 바꿀 생활 신호와 점검 기준으로 대신한다.';
const scenario=(subject:string):LayoutStep=>({key:'scenario',title:'시나리오별 대응',theme:'action',sections:[
 s('scenario-smooth','흐름이 순조로울 때',`${subject}이 기대대로 풀리는 가정 장면을 하나 제시하고 그때 놓치기 쉬운 점과 다음 선택을 설명한다. 가정임을 밝힌다.`),
 s('scenario-blocked','흐름이 막힐 때',`${subject}이 막히는 가정 장면을 하나 제시하고 손실을 줄이는 대응과 다시 시도할 조건을 설명한다. 앞 장의 사례를 재사용하지 않는다.`)]});
const nextCycle:LayoutStep={key:'next-cycle',title:'다음 주기의 방향',theme:'timing',timing:true,sections:[
 s('next-direction','다음 주기에 달라지는 것','저장된 다음 시기 근거가 있으면 지금과 무엇이 달라지는지 비교한다. '+NO_TIMING),
 s('next-checkpoint','다시 점검할 시점과 신호','언제 무엇을 기준으로 이번 판단을 다시 볼지 구체적인 신호로 제시한다.')]};
/** Seven question steps per topic. The tier decides how far down the list a consultation reaches. */
export const questionOutlines:Record<LayoutTopic,LayoutStep[]>={
 work:[
  {key:'position',title:'현재 위치와 적성',theme:'career',sections:[s('fit','지금 자리에서 살아나는 역량','근거에서 읽히는 일하는 방식이 현재 자리에서 어떻게 쓰이는지 설명한다.'),s('gap','맞지 않아 지치는 지점','역량과 역할이 어긋날 때 생기는 소모를 구체적인 업무 장면으로 설명한다.')]},
  {key:'move-stay',title:'이동과 유지의 비교',theme:'career',sections:[s('stay','머무를 때 얻는 것과 잃는 것','입력된 선택지 기준으로 유지의 이점과 비용을 비교한다. 없는 선택지는 만들지 않는다.'),s('move','옮길 때 얻는 것과 치를 비용','이동·변화의 이점과 비용을 같은 기준으로 비교하고 결론이 바뀌는 조건을 밝힌다.')]},
  {key:'window',title:'움직이기 좋은 시기',theme:'timing',timing:true,sections:[s('window-open','움직이기 좋은 때와 그 근거','저장된 시기 근거로 준비·이동에 유리한 구간을 설명한다. '+NO_TIMING),s('window-hold','기다리는 편이 나은 때','서두르면 부담이 커지는 구간과 그때 대신 할 준비를 설명한다.')]},
  {key:'people',title:'조직과 사람이라는 변수',theme:'relations',sections:[s('allies','도움이 되는 사람과 환경','근거에서 읽히는 협력 방식과 힘이 나는 조직 환경을 설명한다.'),s('friction','부딪히기 쉬운 관계와 조율','갈등이 생기기 쉬운 사람·구조와 조율하는 말과 행동을 제시한다.')]},
  {key:'prepare',title:'협상과 준비',theme:'action',sections:[s('leverage','내세울 강점과 조건','협상·면접·제안에서 내세울 강점과 요구할 조건을 정리한다.'),s('groundwork','미리 갖출 준비','결정 전에 확인하고 준비할 것을 순서대로 제시한다.')]},
  scenario('일의 선택'),nextCycle],
 money:[
  {key:'structure',title:'재물의 구조',theme:'wealth',sections:[s('earning','돈이 들어오는 방식','근거에서 읽히는 수입의 방식과 강점을 설명한다.'),s('keeping','돈이 머무는 방식','모으고 지키는 습관의 강점과 약점을 설명한다.')]},
  {key:'flow',title:'수입원과 새는 곳',theme:'wealth',sections:[s('sources','키울 수 있는 수입원','현재 상황에서 확장 가능한 수입원을 조건과 함께 설명한다.'),s('leaks','돈이 새는 곳','지출·손실이 반복되는 패턴과 막는 방법을 구체적으로 제시한다.')]},
  {key:'venture',title:'투자와 사업의 조건',theme:'wealth',sections:[s('venture-fit','맞는 방식과 맞지 않는 방식','근거에서 읽히는 위험 감수 성향으로 맞는 투자·사업 방식을 구분한다. 특정 상품을 권하지 않는다.'),s('venture-terms','들어가기 전 확인할 조건','자금·기간·손실 한도 등 결정 전에 확인할 조건을 제시한다.')]},
  {key:'timing',title:'재물의 시기',theme:'timing',timing:true,sections:[s('money-window','늘리기 좋은 때','저장된 시기 근거로 확장에 유리한 구간을 설명한다. '+NO_TIMING),s('money-guard','지키는 편이 나은 때','지출과 확장을 줄일 구간과 그 이유를 설명한다.')]},
  {key:'risk',title:'리스크의 한도',theme:'action',sections:[s('risk-limit','감당할 수 있는 손실의 선','손실 한도와 멈춤 기준을 생활 예산의 말로 제시한다.'),s('risk-signal','위험을 알리는 신호','결정을 멈추거나 줄여야 할 현실 신호를 구체적으로 제시한다.')]},
  scenario('재물의 선택'),nextCycle],
 love:[
  {key:'pattern',title:'연애의 패턴',theme:'love',sections:[s('attraction','끌리고 다가가는 방식','근거에서 읽히는 끌림과 표현의 방식을 설명한다.'),s('repeat','반복되는 관계의 흐름','관계에서 되풀이되기 쉬운 흐름을 상황·반응·결과로 설명한다. 실제 경험은 입력된 경우에만 단정한다.')]},
  {key:'partner',title:'잘 맞는 상대의 유형',theme:'love',sections:[s('match','편안함을 주는 상대','근거에서 읽히는 잘 맞는 상대의 태도와 생활 방식을 설명한다. 실제 상대의 속마음은 단정하지 않는다.'),s('mismatch','어긋나기 쉬운 상대','부담이 커지는 상대 유형과 알아차릴 신호를 설명한다.')]},
  {key:'timing',title:'만남과 재회의 시기',theme:'timing',timing:true,sections:[s('love-window','인연이 움직이는 때','저장된 시기 근거로 관계가 움직이기 쉬운 구간을 설명한다. '+NO_TIMING),s('love-wait','서두르지 않을 때','속도를 늦추는 편이 나은 구간과 그동안 할 일을 설명한다.')]},
  {key:'obstacle',title:'관계의 장애물',theme:'love',sections:[s('inner-block','내 안의 걸림돌','불안·기대·속도 차이 등 관계를 막는 내 쪽 요인을 비난 없이 설명한다.'),s('outer-block','상황이 만드는 걸림돌','거리·시간·주변 사람 등 현실 조건이 만드는 장애와 조율 방법을 설명한다.')]},
  {key:'strategy',title:'대화와 행동의 전략',theme:'action',sections:[s('words','건넬 수 있는 말','관계 단계에 맞는 표현 예시와 피할 표현을 제시한다.'),s('pace','속도와 경계','다가가는 속도와 지킬 경계를 구체적인 행동으로 제시한다.')]},
  scenario('관계의 선택'),nextCycle],
 relationship:[
  {key:'structure',title:'두 사람의 구조',theme:'relations',sections:[s('each','각자의 성향','두 사람 각각의 근거에서 읽히는 성향을 같은 기준으로 설명한다. 입력되지 않은 상대 정보는 만들지 않는다.'),s('between','둘 사이의 기본 리듬','두 성향이 만났을 때의 기본 흐름을 설명한다.')]},
  {key:'pull-clash',title:'끌림과 충돌',theme:'relations',sections:[s('pull','서로 끌리는 지점','서로를 보완하고 끌리게 하는 구조를 설명한다.'),s('clash','부딪히는 지점','충돌이 시작되는 조건과 반복되는 대화의 패턴을 설명한다.')]},
  {key:'roles',title:'역할과 책임의 분담',theme:'relations',sections:[s('roles-fit','자연스럽게 맡는 역할','각자가 편하게 맡는 역할과 기대를 설명한다.'),s('roles-agree','합의가 필요한 부분','돈·생활·책임에서 미리 정할 기준을 제시한다.')]},
  {key:'crisis',title:'관계가 흔들리는 시기',theme:'timing',timing:true,sections:[s('crisis-window','긴장이 커지는 때','저장된 시기 근거로 갈등이 커지기 쉬운 구간을 설명한다. '+NO_TIMING),s('crisis-guard','그때 지킬 원칙','긴장 구간에서 피할 행동과 대신 할 행동을 짝지어 제시한다.')]},
  {key:'repair',title:'회복의 조건',theme:'relations',sections:[s('repair-way','다시 가까워지는 방법','갈등 뒤 회복을 돕는 말과 행동을 제시한다.'),s('repair-limit','회복이 어려운 신호','관계를 다시 생각해야 할 신호와 존중할 경계를 설명한다.')]},
  scenario('관계의 선택'),nextCycle],
 luck:[
  {key:'current',title:'지금 지나는 주기',theme:'timing',timing:true,sections:[s('current-theme','현재 주기의 과제','저장된 현재 시기 근거와 원국의 연결로 지금의 과제를 설명한다. '+NO_TIMING),s('current-use','이 주기를 쓰는 방법','현재 주기에 힘을 실을 일과 줄일 일을 구분한다.')]},
  {key:'turning',title:'전환점',theme:'timing',timing:true,sections:[s('turning-when','흐름이 바뀌는 지점','저장된 근거에 있는 전환 구간을 설명한다. '+NO_TIMING),s('turning-ready','전환 전에 준비할 것','전환을 앞두고 정리하고 준비할 것을 제시한다.')]},
  {key:'rhythm',title:'몸과 마음의 리듬',theme:'self',sections:[s('energy','힘이 나는 리듬','근거에서 읽히는 활동과 휴식의 리듬을 설명한다. 질병을 판단하지 않는다.'),s('drain','소진되는 리듬','지치기 쉬운 생활 패턴과 알아차릴 신호를 설명한다.')]},
  {key:'avoid',title:'무리하지 않을 시기',theme:'timing',timing:true,sections:[s('avoid-window','속도를 줄일 때','저장된 근거로 무리를 줄일 구간을 설명한다. '+NO_TIMING),s('avoid-instead','그때 대신 할 일','멈추는 동안 할 수 있는 준비와 회복을 제시한다.')]},
  {key:'routine',title:'회복의 루틴',theme:'action',sections:[s('routine-daily','매일의 작은 루틴','일상에서 지킬 수 있는 회복 습관을 구체적으로 제시한다.'),s('routine-check','점검의 기준','루틴이 효과가 있는지 확인할 기준을 제시한다.')]},
  scenario('흐름의 선택'),nextCycle],
 healing:[],
 self:[
  {key:'mind-pattern',title:'반복되는 마음의 패턴',theme:'self',sections:[s('trigger','마음이 움직이는 계기','근거에서 읽히는 반응의 계기를 생활 장면으로 설명한다.'),s('loop','되풀이되는 반응','상황·반응·결과의 순서로 반복 패턴을 설명한다. 실제 경험은 입력된 경우에만 단정한다.')]},
  {key:'with-others',title:'관계 속의 나',theme:'relations',sections:[s('give','관계에서 내어 주는 것','관계에서 드러나는 강점과 배려의 방식을 설명한다.'),s('hold','지켜야 할 내 몫','부탁·기대 속에서 지킬 경계와 표현을 제시한다.')]},
  {key:'criteria',title:'선택의 기준',theme:'self',sections:[s('values','나에게 맞는 기준','근거에서 읽히는 가치와 판단 기준을 설명한다.'),s('doubt','망설임이 길어질 때','결정을 미루게 하는 요인과 기준을 세우는 방법을 제시한다.')]},
  {key:'timing',title:'시기와 흐름',theme:'timing',timing:true,sections:[s('self-window','변화를 시도하기 좋은 때','저장된 시기 근거로 새로운 시도에 맞는 구간을 설명한다. '+NO_TIMING),s('self-rest','쉬어 가는 편이 나은 때','무리하지 않을 구간과 그 이유를 설명한다.')]},
  {key:'experiment',title:'작은 변화의 실험',theme:'action',sections:[s('try','이번 주에 해 볼 실험','작고 구체적인 행동 실험 하나와 실행 문장을 제시한다.'),s('review','실험을 돌아보는 질문','실험 뒤 확인할 질문과 다음 단계를 제시한다.')]},
  scenario('나의 선택'),nextCycle],
};
questionOutlines.healing=questionOutlines.luck;

/** Areas outside the question. `topics` lists the question topics the area would merely repeat. */
export const bonusAreas:{id:string;title:string;theme:Theme;topics:LayoutTopic[];instruction:string}[]=[
 {id:'money',title:'재물',theme:'wealth',topics:['money'],instruction:'수입·지출·자원 관리의 근거를 설명한다.'},
 {id:'work',title:'일과 적성',theme:'career',topics:['work'],instruction:'일하는 방식과 역할의 근거를 설명한다.'},
 {id:'health',title:'건강 리듬과 회복',theme:'self',topics:['healing','luck'],instruction:'활동과 휴식의 리듬, 소진 신호를 설명한다. 질병을 판단하지 않는다.'},
 {id:'growth',title:'마음과 성장',theme:'self',topics:['self'],instruction:'배움·성장·마음의 여유의 근거를 설명한다.'},
 {id:'love',title:'연애와 인연',theme:'love',topics:['love','relationship'],instruction:'끌림과 관계 방식의 근거를 설명한다.'},
 {id:'people',title:'가족과 사람 사이',theme:'relations',topics:['relationship','love'],instruction:'가족·동료·친구와의 협력과 경계의 근거를 설명한다.'},
];
export const BONUS_TITLE='질문 밖에서 보이는 흐름';

/** Timing units per system; astrology only with computed transits, tarot only with extra spread positions. */
export const timingUnits:Record<DomainId,string>={
 saju:'대운·세운·월운',ziwei:'대한·유년',vedic:'마하다샤·안타르다샤',astrology:'계산된 트랜짓·프로그레션 근거(있을 때만)',sukuyo:'계산된 시기 근거(있을 때만)',tarot:'스프레드에 저장된 자리(사건 날짜가 아니다)',
};
/** Tuna: the twelve life-wide chapters. Fusion uses the same rows as cross-system comparisons. */
export const lifeRows:LayoutStep[]=[
 {key:'life-nature',title:'성향이 삶 전체에 미치는 영향',theme:'self',sections:[s('life-nature-arc','삶의 큰 줄기','기본 장의 기질 설명을 반복하지 않는다. 그 성향이 일·관계·돈·건강에 걸쳐 만드는 공통된 흐름을 설명한다.'),s('life-nature-turn','성향을 쓰는 방향','같은 성향을 강점으로 쓰는 장면과 부담이 되는 장면을 비교한다.')]},
 {key:'life-money',title:'재물',theme:'wealth',sections:[s('life-money-way','돈을 버는 방식과 모으는 방식','재물 근거로 수입과 축적의 방식을 설명한다.'),s('life-money-care','재물에서 조심할 점','손실이 반복되기 쉬운 패턴과 기준을 제시한다.')]},
 {key:'life-work',title:'직업과 적성',theme:'career',sections:[s('life-work-fit','잘 맞는 일과 역할','근거에서 읽히는 적성과 역할을 설명한다.'),s('life-work-grow','오래 성장하는 방법','일에서 오래 성장하기 위한 환경과 습관을 제시한다.')]},
 {key:'life-love',title:'연애와 결혼',theme:'love',sections:[s('life-love-way','사랑의 방식','근거에서 읽히는 끌림과 친밀감의 방식을 설명한다.'),s('life-love-long','오래 함께하기 위한 조건','장기적인 관계와 결혼 생활에서 합의할 기준을 제시한다.')]},
 {key:'life-people',title:'가족과 대인 관계',theme:'relations',sections:[s('life-people-bond','가족과의 관계','가족 안에서의 역할과 기대를 설명한다.'),s('life-people-circle','사람 사이의 협력과 경계','동료·친구와의 협력 방식과 지킬 경계를 설명한다.')]},
 {key:'life-health',title:'건강 리듬',theme:'self',sections:[s('life-health-rhythm','에너지의 리듬','활동과 휴식의 리듬을 설명한다. 질병을 판단하지 않는다.'),s('life-health-care','소진을 막는 습관','소진 신호와 회복 습관을 구체적으로 제시한다.')]},
 {key:'life-decade',title:'10년 주기의 흐름',theme:'timing',timing:true,sections:[s('life-decade-now','지금의 10년','저장된 장기 시기 근거로 현재 주기의 과제를 설명한다. '+NO_TIMING),s('life-decade-next','다음 10년의 준비','다음 장기 주기와 전환 준비를 설명한다. 지원되지 않는 시기는 만들지 않는다.')]},
 {key:'life-year',title:'올해의 월별 흐름',theme:'timing',timing:true,sections:[s('life-year-months','올해의 구간별 흐름','저장된 올해·월별 근거가 있는 구간만 순서대로 설명한다. 근거 없는 달은 만들지 않는다. '+NO_TIMING),s('life-year-focus','올해 힘을 실을 일','올해의 흐름에서 우선할 일과 줄일 일을 제시한다.')]},
 {key:'life-next-year',title:'내년 예고',theme:'timing',timing:true,sections:[s('life-next-year-flow','내년의 흐름','저장된 내년 근거가 있을 때만 올해와 달라지는 점을 설명한다. '+NO_TIMING),s('life-next-year-ready','올해 안에 준비할 것','내년을 위해 올해 남은 기간에 준비할 것을 제시한다.')]},
 {key:'life-strength',title:'강점을 활용하는 법',theme:'action',sections:[s('life-strength-use','삶에서 강점을 쓰는 자리','강점이 가장 잘 쓰이는 영역과 장면을 설명한다.'),s('life-strength-plan','강점을 키우는 계획','강점을 키우는 구체적인 연습을 제시한다.')]},
 {key:'life-caution',title:'주의할 시기',theme:'timing',timing:true,sections:[s('life-caution-when','조심할 구간','저장된 근거로 부담이 커지기 쉬운 구간과 영역을 설명한다. '+NO_TIMING),s('life-caution-how','그때의 대처','피할 행동과 대신 할 행동을 짝지어 제시한다.')]},
 {key:'life-remedy',title:'운을 여는 실행',theme:'action',sections:[s('life-remedy-habit','운을 돕는 생활 습관','근거에서 부족하거나 과한 부분을 보완하는 생활 습관을 제시한다. 치료 효능을 주장하지 않는다.'),s('life-remedy-start','오늘 시작할 한 가지','바로 시작할 행동 하나와 확인 질문을 제시한다.')]},
];
/** Current-flow guidance added to every foundation chapter (D7: basics always include the current period). */
export const currentFlowGuide:Record<DomainId,string>={
 saju:'저장된 현재 대운과 올해 세운이 원국과 만나는 방식을 쉬운 말로 설명한다. 대운이 바뀌는 해가 근거에 있으면 함께 밝힌다.',
 ziwei:'저장된 현재 대한과 올해 유년이 명궁·사화와 만나는 방식을 설명한다. 생년·대한·유년의 사화를 혼동하지 않는다.',
 vedic:'저장된 현재 마하다샤와 안타르다샤가 라그나·달과 어떻게 연결되는지 설명한다. 사주의 대운 용어를 쓰지 않는다.',
 astrology:'계산된 트랜짓·프로그레션 근거가 있을 때만 현재 흐름을 설명한다. 없으면 출생 배치로 시기를 예측하지 않고, 지금 고민에 성향이 드러나는 방식을 설명한다.',
 sukuyo:'계산된 시기 근거가 있을 때만 현재 흐름을 설명한다. 없으면 지금 관계에서 리듬이 드러나는 방식을 설명한다.',
 tarot:'카드에 비친 지금의 마음과 태도가 질문의 흐름에 어떻게 이어지는지 설명한다. 사건 날짜를 만들지 않는다.',
};
/** Calculated timing selectors that foundation, bonus and life chapters read. */
export const timingSelectors:Partial<Record<DomainId,string[]>>={
 saju:['majorLuck','yearlyLuck','monthlyLuck'],ziwei:['majorLuck','yearlyTimeline'],vedic:['vimshottariDasha'],
};
