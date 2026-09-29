import {getProduct} from '@/worker/yeongnyangi/payments/catalog';
import {consultationKinds, consultationManifest, supportsKind} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import type {TopicId} from '@/worker/yeongnyangi/fortune/topics';

export const QUESTION_VERSION='question-journey-v1';
export type QuestionGuide={id:string;group:string;question:string;answer:string;basis:string;strength:string;caution:string;action:string;next:string;productId:string;kind:string;topic:TopicId;freeHref:string;freeLabel:string};
// Editorial guidance, never a computed personal reading. Product/kind pairs are validated below.
export const questionGuides:QuestionGuide[]=[
 {id:'reconnect',group:'연애·재회',question:'그 사람은 다시 연락해올까?',answer:'연락을 기다릴수록 작은 신호에도 마음이 흔들릴 수 있어요. 먼저 확인할 것은 상대의 속마음보다, 다시 연락이 왔을 때 내가 원하는 관계예요.',basis:'연락 여부와 관계를 다시 시작할 준비는 다른 문제예요. 마지막 대화에서 확인한 사실과 내가 기대하는 해석을 나눠 적어 보세요.',strength:'기다리는 마음은 관계를 소중히 여기는 힘이 될 수 있어요.',caution:'침묵이나 SNS 반응 하나를 재회의 증거로 읽으면 내 생활이 기다림에 묶일 수 있어요.',action:'다시 대화하고 싶은 이유 한 가지와, 반복하고 싶지 않은 관계의 모습 한 가지를 적어 보세요.',next:'다가갈지 기다릴지, 내 선택의 기준을 더 살펴볼까?',productId:'tarot_mackerel',kind:'love',topic:'love',freeHref:'/tarot/',freeLabel:'타로의 상징과 읽는 법 알아보기'},
 {id:'money',group:'돈·일',question:'왜 돈이 들어와도 늘 불안할까?',answer:'수입이 생기는 것과 마음이 안정되는 것은 꼭 함께 오지 않아요. 돈을 쌓는 방식, 쓰는 이유, 지켜야 할 생활의 기준을 나눠 보면 불안의 모양이 조금 선명해져요.',basis:'수입의 크기만으로 소비와 선택 습관을 설명할 수는 없어요. 반복되는 지출과 일을 대하는 태도를 함께 돌아보는 일반적인 점검 가이드예요.',strength:'미리 대비하려는 마음은 생활의 기준을 세우는 힘이 될 수 있어요.',caution:'불안하다는 이유만으로 새로운 수익 기회나 지출을 서둘러 결정하지 않아도 돼요.',action:'지난달 지출에서 만족한 것과 후회한 것을 하나씩 고르고, 그때의 선택 이유를 적어 보세요.',next:'내 기질에서는 쌓고 지키는 습관이 어떻게 드러날까?',productId:'saju_mackerel',kind:'money',topic:'money',freeHref:'/saju/',freeLabel:'무료 사주로 나의 기질 살펴보기'},
 {id:'partner',group:'결혼·인연',question:'오래 함께할 사람은 어떤 사람일까?',answer:'오래 함께하기 좋은 사람은 취향이 같은 사람만을 뜻하지 않아요. 갈등을 풀어가는 방식과 일상의 책임을 나누는 태도가 내게 편안한지 살펴보세요.',basis:'미래 배우자의 신원이나 외모를 예측하는 해설이 아니에요. 내가 친밀함을 느끼는 조건을 정리하는 관계 가이드예요.',strength:'원하는 관계를 구체적으로 말할수록 만남에서 확인할 기준이 생겨요.',caution:'이상형 목록이 실제 대화와 행동을 대신할 수는 없어요.',action:'함께할 때 꼭 지키고 싶은 일상 한 가지와, 서로 달라도 괜찮은 점 한 가지를 정해 보세요.',next:'나는 사랑할 때 무엇을 기대하고, 어떤 선택을 반복할까?',productId:'saju_mackerel',kind:'love',topic:'love',freeHref:'/saju/compatibility/',freeLabel:'궁합을 읽는 기준 먼저 알아보기'},
 {id:'career',group:'선택의 갈림길',question:'지금 이직하면 후회할까?',answer:'떠나고 싶은 이유와 새 자리에서 얻고 싶은 것은 다를 수 있어요. 지금의 피로를 줄이는 선택인지, 원하는 일을 향한 선택인지 먼저 나눠 보세요.',basis:'이직의 정답이나 합격을 예언하지 않아요. 현재 자리와 다음 자리의 조건을 같은 기준으로 비교하기 위한 가이드예요.',strength:'불편함을 알아차렸다는 것은 나에게 맞는 환경을 찾는 출발점이에요.',caution:'잠깐의 소진을 적성의 문제로 단정하거나, 새 직장의 장점만 비교하지 않도록 해요.',action:'업무·협업·생활 리듬 중 바꾸고 싶은 조건을 하나 고르고, 새 자리에서 확인할 질문으로 바꿔 보세요.',next:'내 강점이 살아나는 업무 환경과 반복되는 부담은 무엇일까?',productId:'saju_mackerel',kind:'work',topic:'work',freeHref:'/saju/',freeLabel:'무료 사주로 일하는 기질 살펴보기'},
 {id:'distance',group:'관계의 거리',question:'좋아하는데 왜 자꾸 엇갈릴까?',answer:'애정이 있어도 표현의 속도는 다를 수 있어요. 한쪽의 확인 요청이 다른 쪽에는 압박으로, 혼자 정리하는 시간이 무관심으로 보이기도 해요.',basis:'어느 한쪽의 마음을 판정하는 말이 아니에요. 연락·약속·갈등 상황에서 실제로 반복되는 반응을 관찰해 보세요.',strength:'다름을 알아차리면 사랑을 증명하는 방식도 함께 조율할 수 있어요.',caution:'관계 유형으로 상대의 무례함을 정당화하거나 내 불편함을 지울 필요는 없어요.',action:'최근 엇갈린 대화 하나를 골라, 상대의 의도를 추측하는 말 대신 내가 원했던 행동을 적어 보세요.',next:'두 사람의 기질과 관계의 거리를 함께 읽어볼까?',productId:'sukuyo_mackerel',kind:'compatibility',topic:'relationship',freeHref:'/sukuyo/',freeLabel:'숙요의 관계 유형 먼저 알아보기'},
 {id:'choice',group:'망설이는 마음',question:'계속할까, 여기서 그만둘까?',answer:'아까워서 계속하는 마음과 앞으로도 원하는 마음을 구분해 보세요. 지금 멈추면 잃는 것만큼, 계속할 때 내어주어야 하는 시간도 선택의 일부예요.',basis:'카드를 뽑거나 개인 운세를 계산한 결과가 아니에요. 선택지를 정리하는 공개 해설이에요.',strength:'망설임은 중요한 것을 놓치지 않으려는 신호일 수 있어요.',caution:'결정을 미루는 동안에도 시간과 에너지가 쓰인다는 점을 함께 살펴보세요.',action:'두 선택 각각에서 지킬 것과 감수할 것을 한 줄씩 적고, 먼저 확인할 수 있는 작은 행동을 정해 보세요.',next:'카드의 상징으로 내 바람과 망설임을 더 살펴볼까?',productId:'tarot_mackerel',kind:'choice',topic:'self',freeHref:'/tarot/prompt-maker/',freeLabel:'무료 타로 질문 정리하기'},
];
// Same editorial question, but the follow-up stays within the source system.
export const contextualQuestionGuides:QuestionGuide[]=[
 {...questionGuides[1],id:'money-ziwei',productId:'ziwei_mackerel',kind:'money',freeHref:'/ziwei/',freeLabel:'자미두수의 삶의 영역 알아보기'},
 {...questionGuides[3],id:'career-astrology',productId:'astrology_mackerel',kind:'work',freeHref:'/astrology/',freeLabel:'출생 차트의 재능과 일 알아보기'},
 {...questionGuides[3],id:'career-vedic',productId:'vedic_mackerel',kind:'ask',freeHref:'/vedic/',freeLabel:'베다점의 기질 해석 알아보기'},
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
