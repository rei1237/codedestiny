import {everydayConcerns} from './question-concerns';
import {QUESTION_POLICY_VERSION,questionCandidate,recommendQuestion,type QuestionDecision} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {getProduct} from '@/worker/yeongnyangi/payments/catalog';
import {consultationKinds, consultationManifest, supportsKind} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import type {TopicId} from '@/worker/yeongnyangi/fortune/topics';

export const QUESTION_VERSION='question-journey-v3';
export type QuestionGuide={id:string;group:string;question:string;next:string;productId:string;kind:string;topic:TopicId};
// Question-to-paid-consultation mapping. Product/kind pairs are validated below.
// 2026-10-02 질문 우선: 꿀꿀 홈 질문 타일과 같은 8카테고리 순서. 기존 id 는 링크·계측 이력 때문에 바꾸지 않는다.
export const questionGuides:QuestionGuide[]=[
 {id:'mind',group:'사랑',question:'그 사람의 말과 행동, 왜 다를까?',next:'말과 행동 사이에서 내가 놓친 신호는 무엇일까?',productId:'tarot_mackerel',kind:'feelings',topic:'love'},
 {id:'reconnect',group:'재회',question:'그 사람은 다시 연락해올까?',next:'다가갈지 기다릴지, 내 선택의 기준을 더 살펴볼까?',productId:'tarot_mackerel',kind:'love',topic:'love'},
 {id:'partner',group:'결혼',question:'오래 함께할 사람은 어떤 사람일까?',next:'나는 사랑할 때 무엇을 기대하고, 어떤 선택을 반복할까?',productId:'saju_mackerel',kind:'love',topic:'love'},
 {id:'money',group:'돈',question:'왜 돈이 들어와도 늘 불안할까?',next:'내 기질에서는 쌓고 지키는 습관이 어떻게 드러날까?',productId:'saju_mackerel',kind:'money',topic:'money'},
 {id:'career',group:'일',question:'지금 이직하면 후회할까?',next:'내 강점이 살아나는 업무 환경과 반복되는 부담은 무엇일까?',productId:'saju_mackerel',kind:'work',topic:'work'},
 {id:'ahead',group:'미래',question:'앞으로 내 힘을 어디에 실으면 좋을까?',next:'타고난 기질과 재능에서 먼저 할 일과 멈출 일을 순서대로 정해 볼까?',productId:'saju_mackerel',kind:'ask',topic:'self'},
 {id:'choice',group:'나 자신',question:'계속할까, 여기서 그만둘까?',next:'카드의 상징으로 내 바람과 망설임을 더 살펴볼까?',productId:'tarot_mackerel',kind:'choice',topic:'self'},
 {id:'distance',group:'인간관계',question:'좋아하는데 왜 자꾸 엇갈릴까?',next:'두 사람의 기질과 관계의 거리를 함께 읽어볼까?',productId:'sukuyo_mackerel',kind:'compatibility',topic:'relationship'},
];
const guide=(id:string)=>questionGuides.find(q=>q.id===id)!;
export const concernGuides=[...questionGuides,...everydayConcerns];
export const concernGroups=[...new Set(everydayConcerns.map(q=>q.group))];
const legacyGroups:Record<string,string>={mind:'연애·재회',ahead:'변화·새출발',reconnect:'연애·재회',money:'돈·생활',partner:'결혼·동행',career:'직장·이직',distance:'친구·인간관계',choice:'마음·자존감'};
export function filterConcerns(search:string,group='전체'){
 const query=search.trim().normalize('NFKC').toLocaleLowerCase('ko-KR');
 return concernGuides.filter(q=>(group==='전체'||(legacyGroups[q.id]||q.group)===group)&&`${q.question} ${q.group} ${legacyGroups[q.id]||''}`.normalize('NFKC').toLocaleLowerCase('ko-KR').includes(query));
}
export const anythingConsultationHref='/yeongnyangi/fortune/';
// Same editorial question, but the follow-up stays within the source system.
export const contextualQuestionGuides:QuestionGuide[]=[
 {...guide('money'),id:'money-ziwei',productId:'ziwei_mackerel',kind:'money'},
 {...guide('career'),id:'career-astrology',productId:'astrology_mackerel',kind:'work'},
 {...guide('career'),id:'career-vedic',productId:'vedic_mackerel',kind:'ask'},
];
export function getQuestionGuide(id:unknown){return [...concernGuides,...contextualQuestionGuides].find(q=>q.id===id);}
export function questionOffer(q:QuestionGuide){
 const product=getProduct(q.productId);
 const kind=consultationKinds[product.domain].find(k=>k.id===q.kind);
 if(!kind||!supportsKind(product,kind))throw new Error(`Unsupported question product: ${q.id}`);
 return {product,kind,chapters:consultationManifest(product,kind,q.topic)};
}
export function questionScopeEntry(q:QuestionGuide){
 const domain=getProduct(q.productId).domain;
 const category:QuestionDecision['category']=q.kind==='compatibility'?'compatibility':questionCandidate(q.question)||(q.topic==='work'?'career':q.topic==='money'?'money':q.topic==='love'?'love':q.topic==='relationship'?'family':q.topic==='luck'?'timing':'self');
 const decision:QuestionDecision={version:QUESTION_POLICY_VERSION,category,target:category==='compatibility'?'pair':'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false};
 const plan=recommendQuestion(domain,decision,q.question);
 return {domain,decision,plan,product:getProduct(domain+'_'+plan.fish)};
}
export function questionCheckoutHref(q:QuestionGuide){return '/yeongnyangi/fortune/?'+new URLSearchParams({flow:'question',domain:questionScopeEntry(q).domain,questionId:q.id});}
export function questionGuideHref(id:string){return '/?'+new URLSearchParams({question:id})+'#questions';}
// Only explicit context is mapped; unrelated features retain a free exploration path.
export const freeQuestionMap:Record<string,string>={saju:'money',basic:'money',ziwei:'money-ziwei',sukuyo:'distance',tarot:'choice',astrology:'career-astrology',vedic:'career-vedic',psych:'choice'};
