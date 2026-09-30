import {getProduct} from '@/worker/yeongnyangi/payments/catalog';
import {consultationKinds, consultationManifest, supportsKind} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import type {TopicId} from '@/worker/yeongnyangi/fortune/topics';

export const QUESTION_VERSION='question-journey-v2';
export type QuestionGuide={id:string;group:string;question:string;next:string;productId:string;kind:string;topic:TopicId};
// Question-to-paid-consultation mapping. Product/kind pairs are validated below.
export const questionGuides:QuestionGuide[]=[
 {id:'reconnect',group:'연애·재회',question:'그 사람은 다시 연락해올까?',next:'다가갈지 기다릴지, 내 선택의 기준을 더 살펴볼까?',productId:'tarot_mackerel',kind:'love',topic:'love'},
 {id:'money',group:'돈·일',question:'왜 돈이 들어와도 늘 불안할까?',next:'내 기질에서는 쌓고 지키는 습관이 어떻게 드러날까?',productId:'saju_mackerel',kind:'money',topic:'money'},
 {id:'partner',group:'결혼·인연',question:'오래 함께할 사람은 어떤 사람일까?',next:'나는 사랑할 때 무엇을 기대하고, 어떤 선택을 반복할까?',productId:'saju_mackerel',kind:'love',topic:'love'},
 {id:'career',group:'선택의 갈림길',question:'지금 이직하면 후회할까?',next:'내 강점이 살아나는 업무 환경과 반복되는 부담은 무엇일까?',productId:'saju_mackerel',kind:'work',topic:'work'},
 {id:'distance',group:'관계의 거리',question:'좋아하는데 왜 자꾸 엇갈릴까?',next:'두 사람의 기질과 관계의 거리를 함께 읽어볼까?',productId:'sukuyo_mackerel',kind:'compatibility',topic:'relationship'},
 {id:'choice',group:'망설이는 마음',question:'계속할까, 여기서 그만둘까?',next:'카드의 상징으로 내 바람과 망설임을 더 살펴볼까?',productId:'tarot_mackerel',kind:'choice',topic:'self'},
];
// Same editorial question, but the follow-up stays within the source system.
export const contextualQuestionGuides:QuestionGuide[]=[
 {...questionGuides[1],id:'money-ziwei',productId:'ziwei_mackerel',kind:'money'},
 {...questionGuides[3],id:'career-astrology',productId:'astrology_mackerel',kind:'work'},
 {...questionGuides[3],id:'career-vedic',productId:'vedic_mackerel',kind:'ask'},
];
export function getQuestionGuide(id:unknown){return [...questionGuides,...contextualQuestionGuides].find(q=>q.id===id);}
export function questionOffer(q:QuestionGuide){
 const product=getProduct(q.productId);
 const kind=consultationKinds[product.domain].find(k=>k.id===q.kind);
 if(!kind||!supportsKind(product,kind))throw new Error(`Unsupported question product: ${q.id}`);
 return {product,kind,chapters:consultationManifest(product,kind,q.topic)};
}
export function questionCheckoutHref(q:QuestionGuide){return '/yeongnyangi/fortune/?'+new URLSearchParams({product:q.productId,consultationKind:q.kind,topic:q.topic,questionId:q.id});}
export function questionGuideHref(id:string){return '/?'+new URLSearchParams({question:id})+'#questions';}
// Only explicit context is mapped; unrelated features retain a free exploration path.
export const freeQuestionMap:Record<string,string>={saju:'money',basic:'money',ziwei:'money-ziwei',sukuyo:'distance',tarot:'choice',astrology:'career-astrology',vedic:'career-vedic',psych:'choice'};
