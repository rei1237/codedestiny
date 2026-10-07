import {consultationBudget} from '../consultation-budget';
import {questionFoundationEvidence} from '../reading-v6';
import {FortuneError,type DomainId} from '../shared/contracts';
import {canonicalAskCategory} from './categories';
import type {AskCategory} from './contracts';
import type {ChapterSpec} from '../book-contracts';
import {READING_V6_VERSION} from '../reading-policy';
import {conciseOutputTokens,CONCISE_READING_VERSION} from '../concise-reading';

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
export function questionManifest(domain:DomainId,fish:QuestionFish,d:QuestionDecision,spread?:{positions:{id:string;label:string;question:string;role:string;readOrder:number}[]},question='',expanded=true):ChapterSpec[]{
 if(!expanded)return legacyQuestionManifest(domain,fish,d,spread);
 const selectors:Record<DomainId,string[]>={
  saju:['pillars','dayMaster','fiveElements','tenGodsByPillar','seasonalBalance','natalInteractions','strengthHeuristic','usefulGod','jong',...(d.target==='pair'?['partnerChart','relationshipComparison','compatibility']:[]),...(d.horizon==='transition'?['questionTiming','advancedFactors']:['yearlyLuck','monthlyLuck'])],
  ziwei:['lifePalace','bodyPalace','palaces','fourTransformations','sanFangSiZheng','businessBasis','healthBasis',...(d.target==='pair'?['relationshipBasis','relationshipComparison','relationshipTiming','partnerChart']:[]),...(d.horizon==='transition'?['questionTiming']:['yearlyLuck'])],
  vedic:['lagna','moon','moonNakshatra','planets','houses','grahas','bhavas','yogas',...(d.horizon==='transition'?['questionTiming']:['vimshottariDasha']),...(d.target==='pair'?['relationshipBasis','relationshipComparison','relationshipTiming','partnerChart','ashtakuta']:[])],
  astrology:['planets','ascendant','houseCusps','houseRulers','aspects','chartSect',...(d.target==='pair'?['relationshipBasis','relationshipComparison','partnerChart','synastry']:[])],
  sukuyo:['personA','personB','relation','forwardDistance','reverseDistance','distanceLabel'],
  tarot:['spreadId','cards','reading','tarotConsultation'],
 };
 const subject=questionTopics.find(topic=>topic.id===d.category)?.label||'질문';
 const title=question.trim().replace(/\s+/g,' ').slice(0,120)||[d.period,subject].filter(Boolean).join(' · ');
 const sections=[
  {id:'meaning',title:`${subject} · 핵심 흐름`,role:'interpretation' as const,instruction:'질문에 먼저 직접 답하고 관련 성향 또는 상황 패턴·강점·주의 조건을 설명한다.'},
  {id:'evidence',title:'그렇게 읽는 이유',role:'interpretation' as const,instruction:'실제 계산 근거와 쉬운 뜻을 연결한다. 상충 신호와 기간의 한계를 구분한다.'},
  {id:'example-1',title:d.period?`${d.period} · 살펴볼 기회와 주의점`:'살펴볼 기회와 주의점',role:'example' as const,instruction:'입력으로 확인된 사실과 가상 생활 장면을 구분한다.'},
  {id:'action',title:'선택과 다음 행동',role:'action' as const,instruction:'선택의 이점·부담·판단이 바뀌는 조건과 먼저 할 행동을 설명한다.'},
 ];
 if(domain==='tarot'&&spread?.positions.length){
  sections.splice(1,1,...[...spread.positions].sort((a,b)=>a.readOrder-b.readOrder).map((p,i)=>({id:i===0?'evidence':'position-'+p.id,title:p.label,role:'interpretation' as const,instruction:`${p.id}: ${p.question} ${p.role} 저장된 카드 이름과 정역방향을 먼저 밝힌다. 그림의 핵심 상징과 일반적인 의미를 쉬운 말로 설명한 뒤, 이 자리에서 그 의미가 어떻게 달라지는지 해석한다. 사용자의 질문·기간·현재 상황에 적용하고 강점과 주의점, 구체적인 행동을 연결한다. 다른 자리에 나온 카드와의 연결을 설명하되 같은 설명을 반복하지 않는다. 카드 이름과 짧은 결론만 나열하지 않는다.`})));
 }
 if(domain==='tarot'&&spread?.positions.length)sections.splice(sections.length-1,0,{id:'card-synthesis',title:'카드들이 함께 들려주는 흐름',role:'interpretation',instruction:'저장된 카드 사이의 공통 상징·대조·이어지는 흐름을 최소 두 쌍 이상 연결한다. 질문에 대한 종합 답과 흐름이 달라지는 조건을 설명한다. 질문의 기간을 존중하고 월별·날짜별 사건을 만들어 내지 않는다.'});
 if(d.target==='pair')sections[0].instruction+=' 두 사람 각각의 성향, 잘 맞는 점과 어긋나는 점, 표현·갈등·생활·돈·책임의 합의를 다룬다.';
 if(d.relationshipType==='romantic_adults')sections.push({id:'intimacy',title:'가까워지는 속도와 편안함',role:'interpretation',instruction:'속궁합은 성인 두 사람의 편안함·속도·대화·경계로 설명한다. 조후의 한난조습은 기존 종격·억부·조후 우선순위 안에서 보완과 충돌을 함께 읽고 성적 특성·만족도를 지어내지 않는다.'});
 const tarot=domain==='tarot'&&Boolean(spread?.positions.length);
 const section=(id:string,heading:string,instruction:string)=>({id,title:heading,role:'interpretation' as const,instruction});
 const opening=sections.filter(s=>s.id==='meaning');
 const actions=sections.filter(s=>['example-1','action','intimacy','card-synthesis'].includes(s.id));
 const groups:{title:string;sections:typeof sections}[]=[];
 const foundation=questionFoundationEvidence(domain);
 groups.push(
  {title:tarot?'질문에 드러나는 나의 태도':'타고난 성향과 마음의 바탕',sections:[section('nature',tarot?'지금의 태도와 마음':'나를 움직이는 기질','기존 체계의 실제 근거로 질문과 관련된 성향과 마음의 작동 방식을 설명한다. 타로는 타고난 성격을 단정하지 않고 저장된 카드와 질문에서 드러나는 현재 태도로 제한한다.'),section('empathy','이 고민이 마음에 남는 이유','성향과 현재 고민의 연결을 구체적으로 설명하고 사용자가 느꼈을 법한 어려움은 가능성으로 공감한다. 입력되지 않은 과거 경험을 실제 사실처럼 만들지 않는다.')]},
  {title:'나의 강점과 부담이 되는 순간',sections:[section('strength','살려 쓸 수 있는 강점','실제 근거에서 읽히는 장점을 생활 속 활용 방식과 함께 설명한다.'),section('shadow','강점의 그림자와 조정할 점','같은 성향이 과하거나 위축될 때 생길 부담과 약점을 비난 없이 설명하고 조정 방법을 제시한다.')]},
  {title:'반복되는 문제와 변화의 실마리',sections:[section('repetition','되풀이되는 선택의 패턴','근거와 질문을 바탕으로 반복될 수 있는 문제를 상황·반응·결과의 순서로 설명한다. 실제 반복 경험은 사용자가 제공한 경우에만 단정한다.'),section('change','다르게 해 볼 작은 선택','패턴을 만드는 욕구에 공감하고 사용자가 바꿀 수 있는 반응과 경계를 구체적으로 제시한다.')]},
 );
 groups.push({title: title+' · 핵심 답변',sections:opening});
 if(tarot){
  const cards=sections.filter(s=>s.id==='evidence'||s.id.startsWith('position-'));
  for(let i=0;i<cards.length;i+=3)groups.push({title:cards.slice(i,i+3).map(s=>s.title).join(' · '),sections:cards.slice(i,i+3)});
 }else{
  groups.push({title:subject+' · 근거와 반복 패턴',sections:[sections[1],section('pattern','강점과 반복되는 패턴','질문에 관련된 성향과 강점을 실제 계산 근거로 설명한다. 강점이 과해질 때의 부담과 반복되는 선택 습관을 구분한다.')]});
  if(fish!=='mackerel')groups.push({title:(d.period||'현재')+' · 기회와 주의 조건',sections:[section('opportunity','활용할 기회','질문과 기간에 해당하는 실제 근거를 설명하고 기회를 활용하기 위한 조건을 제시한다. 근거 없는 월별 예측이나 날짜는 만들지 않는다.'),section('caution','부담과 조정할 부분','상충하는 신호와 제약을 짚고 무엇을 조정하면 달라질 수 있는지 설명한다.')]});
  if(fish==='flounder'||fish==='tuna')groups.push(
   {title:subject+' · 관점과 조건의 비교',sections:[section('compare','서로 다른 관점','입력된 두 사람 또는 선택지의 차이를 같은 기준으로 비교한다. 없는 상대나 선택지는 만들지 않는다.'),section('conditions','판단이 달라지는 조건','확인된 상황과 가정한 상황을 나누고 결론이 바뀌는 조건을 설명한다.')]},
   {title:subject+' · 현실에 적용하기',sections:[section('scenario','상황별 적용','질문에 맞는 서로 다른 생활 장면을 가정으로 제시하고 대응의 차이를 설명한다.'),section('boundary','해석의 한계와 확인할 사실','계산 근거로 알 수 있는 것과 현실에서 직접 확인할 정보를 구분한다.')]});
  if(fish==='tuna')groups.push(
   {title:'현재 시기의 과제와 전환 준비',sections:[section('current-cycle','현재 시기의 과제','저장된 현재 시기 근거와 원국의 연결을 설명하고 준비 과제를 구체화한다.')]},
   {title:'다음 시기의 변화와 선택 기준',sections:[section('next-cycle','다음 시기의 조건','지원되는 다음 시기 근거를 비교하고 변화 조건과 점검 기준을 제시한다. 미지원 시기는 생성하지 않는다.')]});
 }
 groups.push({title:subject+' · 종합 해석과 실행 계획',sections:actions});
 const total=consultationBudget(fish).initial;
 const weight=(group:typeof groups[number])=>tarot?Math.max(1,group.sections.length):1;
 const weights=groups.reduce((sum,group)=>sum+weight(group),0);
 return groups.map((group,ordinal)=>{
  const ratio=weight(group)/weights;
  const targetChars:[number,number]=[Math.ceil(total[0]*ratio),Math.ceil(total[1]*ratio)];
  if(!group.sections.some(s=>s.id==='evidence'))group.sections.push(section('evidence','이 해석의 근거','이 장의 해석을 뒷받침하는 실제 근거와 쉬운 뜻을 연결하고 상충 신호와 한계를 설명한다.'));
  const plannedSections=group.sections.map(s=>({...s,minimumChars:0,targetChars:targetChars.map(n=>Math.ceil(n/group.sections.length)) as [number,number]}));
  return {id:ordinal===0?'question-answer':'question-detail-'+ordinal,key:'question-'+ordinal,ordinal,title:group.title,part:title,theme:'self',
   version:READING_V6_VERSION,questionPolicy:QUESTION_POLICY_VERSION,tier:fish,systems:[domain],
   factSelectors:{[domain]:ordinal<3?[...new Set([...foundation,...selectors[domain]])]:selectors[domain]},focus:group.title+' 이 장의 고유한 역할에 집중하고 앞선 장의 결론과 사례를 반복하지 않는다.',excludes:[],
   periodScope:'저장된 실제 시기 근거의 해상도만 사용한다. 출생 배치·원국·카드는 사건 예측 근거와 구분한다.',
   minimumChars:0,targetChars,outputBudgetVersion:CONCISE_READING_VERSION,outputTokens:Math.max(8192,conciseOutputTokens({targetChars,sections:plannedSections})),sections:plannedSections,
  };
 });
}

function legacyQuestionManifest(domain:DomainId,fish:QuestionFish,d:QuestionDecision,spread?:{positions:{id:string;label:string;question:string;role:string;readOrder:number}[]}):ChapterSpec[]{
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
