import {FortuneError,type DomainId} from '../shared/contracts';
import {canonicalAskCategory} from './categories';
import type {AskCategory} from './contracts';
import type {ChapterSpec} from '../book-contracts';
import {READING_V6_VERSION} from '../reading-policy';
import {CONCISE_READING_VERSION} from '../concise-reading';

/** Only new question consultations use this immutable contract. Historical menus retain their snapshots. */
export const QUESTION_POLICY_VERSION='question-consultation-20261007';
export const FOLLOWUP_LIMITS={mackerel:0,salmon:1,flounder:2,tuna:4} as const;
export type QuestionFish=keyof typeof FOLLOWUP_LIMITS;
export type QuestionDecision={
 version:typeof QUESTION_POLICY_VERSION; category:AskCategory; target:'self'|'pair';
 horizon:'current'|'transition'; situation:string; options:string; period:string; constraints:string;
 relationshipType?:'romantic_adults'|'family'|'other'; confirmed:boolean;
};
export const questionTopics=[
 {id:'self',label:'성향·자기이해·일상',example:'업무 부탁을 거절할 때 어떻게 말하면 좋을까?'},
 {id:'love',label:'연애·속마음·연락',example:'연락할 때 내 마음을 어떻게 표현하면 좋을까?'},
 {id:'reunion',label:'재회',example:'헤어진 뒤 다시 대화하려면 무엇을 먼저 정리할까?'},
 {id:'compatibility',label:'두 사람의 궁합',example:'함께 살 때 생활 방식과 돈 관리에서 무엇을 조율할까?'},
 {id:'marriage',label:'결혼',example:'결혼을 생각하며 내 기대와 준비를 어떻게 정리할까?'},
 {id:'family',label:'가족·대인관계',example:'가족에게 내 경계를 어떻게 이야기할까?'},
 {id:'study',label:'공부·시험',example:'이번 시험을 앞두고 어떤 준비가 필요할까?'},
 {id:'career',label:'취업·적성·직업',example:'내 강점을 어떤 업무에서 살릴 수 있을까?'},
 {id:'job_change',label:'이직',example:'올해 이직을 준비해도 괜찮을까?'},
 {id:'money',label:'재물',example:'수입과 지출 중 무엇을 먼저 정리할까?'},
 {id:'business',label:'사업',example:'사업을 확장하기 전에 어떤 조건을 확인할까?'},
 {id:'move',label:'이사·해외 이동',example:'이사를 준비하며 어떤 조건을 우선할까?'},
 {id:'timing',label:'현재 시기·장기 흐름',example:'현재와 다음 시기에 일의 방향을 어떻게 준비할까?'},
 {id:'health',label:'생활 리듬·회복 습관',example:'무리하는 패턴을 줄이려면 어떤 습관이 필요할까?'},
 {id:'other',label:'복합·분류가 어려운 질문',example:''},
] as const;
export const questionScopes:Record<QuestionFish,string>={
 mackerel:'일상과 개인의 관계 고민에 대한 하나의 질문',
 salmon:'시험·진로·재물·이동 등 중요한 선택의 조건과 준비',
 flounder:'두 사람의 성향·표현·갈등·생활·돈·책임의 비교',
 tuna:'현재와 다음 장기 시기의 과제와 전환 준비',
};
export function questionTopic(category:AskCategory){
 if(['career','job_change','study'].includes(category))return 'work';
 if(['money','business'].includes(category))return 'money';
 if(['love','reunion','marriage'].includes(category))return 'love';
 if(['compatibility','family','relationships'].includes(category))return 'relationship';
 if(category==='timing')return 'luck';
 if(category==='health')return 'healing';
 return 'self';
}
export function questionDecision(value:any):QuestionDecision{
 if(value?.version!==QUESTION_POLICY_VERSION||!['self','pair'].includes(value.target)||!['current','transition'].includes(value.horizon))throw new FortuneError('QUESTION_SCOPE_REQUIRED');
 const category=canonicalAskCategory(value.category);
 if(category!==value.category)throw new FortuneError('QUESTION_SCOPE_REQUIRED');
 const field=(key:string)=>typeof value[key]==='string'?value[key].trim().slice(0,600):'';
 return {version:QUESTION_POLICY_VERSION,category,target:value.target,horizon:value.horizon,
  situation:field('situation'),options:field('options'),period:field('period'),constraints:field('constraints'),
  ...(['romantic_adults','family','other'].includes(value.relationshipType)?{relationshipType:value.relationshipType}:{}),confirmed:value.confirmed===true};
}
/** Hints require a subject and a decision/action, never length, emotion or a lone keyword. The user confirms. */
export function questionCandidate(question:string):AskCategory|undefined{
 const text=question.replace(/\s+/g,' ');
 // A completed event describing another person is context, not the user's career decision.
 if(/(?:이직한|취업한|시험을 마친|시험을 끝낸)\s*(?:친구|상대|가족|사람)/.test(text)&&/연락|대화|말|표현/.test(text))return undefined;
 const deciding=/할까|해도|준비|고민|선택|옮기|옮길|바꾸|바꿀|앞두|가능|어떨|좋을|될까|되나요|알고|유리|시작/;
 if(!deciding.test(text))return undefined;
 if(/이직|직장.{0,10}(?:옮|바꾸)|회사.{0,10}(?:옮|바꾸)/.test(text))return 'job_change';
 if(/시험|합격|수능|고시/.test(text))return 'study';
 if(/취업|직업|적성/.test(text))return 'career';
 if(/사업|창업/.test(text))return 'business';
 if(/투자|수입|지출|재물/.test(text))return 'money';
 if(/이사|해외.{0,8}(?:이동|이주|정착)/.test(text))return 'move';
 return undefined;
}
export function recommendQuestion(domain:DomainId,d:QuestionDecision,question=''):{fish:QuestionFish;reason:string;missing:string[];unsupported?:string}{
 const fish:QuestionFish=d.horizon==='transition'?'tuna':d.target==='pair'?'flounder':
  ['study','career','job_change','money','business','move'].includes(d.category)?'salmon':'mackerel';
 const missing:string[]=[];
 const candidate=questionCandidate(question);
 if(candidate&&candidate!==d.category&&d.target==='self'&&d.horizon==='current')missing.push('질문에 중요한 선택이 포함되어 있어요. 제안된 주제를 확인하거나 먼저 다룰 질문을 분명하게 적어 주세요.');
 if(d.category==='compatibility'&&d.target!=='pair')missing.push('두 사람을 비교하는 질문이라면 판단 대상을 궁합과 관계 구조로 선택해 주세요.');
 if(d.category==='other')missing.push('독립적인 고민이 여러 개라면 먼저 다룰 하나의 결정과 주제를 골라 주세요.');
 if(!d.situation)missing.push('현재 상황을 알려 주세요. 같은 주제라도 준비 단계에 따라 행동이 달라져요.');
 if((fish==='salmon'||fish==='tuna')&&!d.period)missing.push('목표 시기나 살펴볼 기간을 알려 주세요. 계산 근거의 기간과 대조해요.');
 if(fish==='salmon'&&!d.options)missing.push('선택지 또는 준비 목표를 알려 주세요. 비교할 대상이 필요해요.');
 if(fish==='salmon'&&!d.constraints)missing.push('중요한 조건이나 제약을 알려 주세요. 없다면 ‘없음’으로 적어 주세요.');
 if(fish==='flounder'&&!d.relationshipType)missing.push('두 사람의 관계 유형을 골라 주세요.');
 const unsupported=d.target==='pair'&&d.horizon==='transition'?'궁합과 장기 흐름은 먼저 다룰 하나를 선택해 주세요. 두 범위를 자동으로 묶어 결제하지 않아요.':
  fish==='tuna'&&!['saju','ziwei','vedic'].includes(domain)?'장기 시기 전환은 현재 사주 대운·자미두수 대한·베다 다샤에서 제공해요. 다른 체계는 계산 지원이 필요해요.':undefined;
 return {fish,reason:questionScopes[fish],missing,...(unsupported?{unsupported}:{})};
}
export function assertQuestionOrder(product:{domain:DomainId;fishId:string;readingKind:string},d:QuestionDecision,question=''){
 const plan=recommendQuestion(product.domain,d,question);
 if(product.readingKind!=='single'||plan.unsupported)throw new FortuneError('QUESTION_SCOPE_UNSUPPORTED');
 if(!d.confirmed||plan.missing.length)throw new FortuneError('QUESTION_SCOPE_REQUIRED');
 if(plan.fish!==product.fishId)throw new FortuneError('QUESTION_PRODUCT_MISMATCH');
 return plan;
}
export function questionManifest(domain:DomainId,fish:QuestionFish,d:QuestionDecision,spread?:{positions:{id:string;label:string;question:string;role:string;readOrder:number}[]}):ChapterSpec[]{
 const selectors:Record<DomainId,string[]>={
  saju:['pillars','dayMaster','fiveElements','tenGodsByPillar','seasonalBalance','natalInteractions','strengthHeuristic','usefulGod','jong',...(d.target==='pair'?['partnerChart','relationshipComparison','compatibility']:[]),...(d.horizon==='transition'?['questionTiming','advancedFactors']:['yearlyLuck','monthlyLuck'])],
  ziwei:['lifePalace','bodyPalace','palaces','fourTransformations','sanFangSiZheng','businessBasis','healthBasis',...(d.target==='pair'?['relationshipBasis','relationshipComparison','relationshipTiming','partnerChart']:[]),...(d.horizon==='transition'?['questionTiming']:['yearlyLuck'])],
  vedic:['lagna','moon','moonNakshatra','planets','houses','grahas','bhavas','yogas',...(d.horizon==='transition'?['questionTiming']:['vimshottariDasha']),...(d.target==='pair'?['relationshipBasis','relationshipComparison','relationshipTiming','partnerChart','ashtakuta']:[])],
  astrology:['planets','ascendant','houseCusps','houseRulers','aspects','chartSect',...(d.target==='pair'?['relationshipBasis','relationshipComparison','partnerChart','synastry']:[])],
  sukuyo:['personA','personB','relation','forwardDistance','reverseDistance','distanceLabel'],
  tarot:['spreadId','cards','reading','tarotConsultation'],
 };
 const sections=[
  {id:'meaning',title:'질문에 대한 답',role:'interpretation' as const,instruction:'질문에 먼저 직접 답하고 관련 성향 또는 상황 패턴·강점·주의 조건을 설명한다.'},
  {id:'evidence',title:'그렇게 읽는 이유',role:'interpretation' as const,instruction:'실제 계산 근거와 쉬운 뜻을 연결한다. 상충 신호와 기간의 한계를 구분한다.'},
  {id:'example-1',title:'생활 속에서 살펴보기',role:'example' as const,instruction:'입력으로 확인된 사실과 가상 생활 장면을 구분한다.'},
  {id:'action',title:'선택과 다음 행동',role:'action' as const,instruction:'선택의 이점·부담·판단이 바뀌는 조건과 먼저 할 행동을 설명한다.'},
 ];
 if(domain==='tarot'&&spread?.positions.length){
  sections.splice(1,1,...[...spread.positions].sort((a,b)=>a.readOrder-b.readOrder).map((p,i)=>({id:i===0?'evidence':'position-'+p.id,title:p.label,role:'interpretation' as const,instruction:`${p.id}: ${p.question} ${p.role} 이 자리에 저장된 카드·정역방향·상징을 질문과 연결하고 카드 사이의 흐름을 설명한다.`})));
 }
 if(d.target==='pair')sections[0].instruction+=' 두 사람 각각의 성향, 잘 맞는 점과 어긋나는 점, 표현·갈등·생활·돈·책임의 합의를 다룬다.';
 if(d.relationshipType==='romantic_adults')sections.push({id:'intimacy',title:'가까워지는 속도와 편안함',role:'interpretation',instruction:'속궁합은 성인 두 사람의 편안함·속도·대화·경계로 설명한다. 조후의 한난조습은 기존 종격·억부·조후 우선순위 안에서 보완과 충돌을 함께 읽고 성적 특성·만족도를 지어내지 않는다.'});
 return [{id:'question-answer',key:'question',ordinal:0,title:'이 질문을 함께 살펴보기',part:'질문 상담',theme:'self',
  version:READING_V6_VERSION,questionPolicy:QUESTION_POLICY_VERSION,tier:fish,systems:[domain],
  factSelectors:{[domain]:selectors[domain]},focus:questionScopes[fish],excludes:[],
  periodScope:'저장된 실제 시기 근거의 해상도만 사용한다. 출생 배치·원국·카드는 사건 예측 근거와 구분한다.',
  minimumChars:0,targetChars:[1600,3000],outputBudgetVersion:CONCISE_READING_VERSION,outputTokens:8192,
  sections:sections.map(s=>({...s,minimumChars:0,targetChars:[250,600] as [number,number]})),
 }];
}
