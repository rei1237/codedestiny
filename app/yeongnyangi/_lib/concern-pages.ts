import {QUESTION_POLICY_VERSION,FOLLOWUP_LIMITS,questionScopes,recommendQuestion,type QuestionDecision,type QuestionFish} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {consultationBudget,a4Label} from '@/worker/yeongnyangi/fortune/consultation-budget';
import {getProduct} from '@/worker/yeongnyangi/payments/catalog';

// Concern-first product pages linked from the ggulggul home. Question mode decides the fish; these pages only explain it.
export const CONCERN_DOMAIN='saju';
export const tierNames:Record<QuestionFish,string>={mackerel:'일상 질문 상담',salmon:'중요한 선택 상담',flounder:'두 사람의 관계 상담',tuna:'장기 흐름 상담'};
export const concernPages={
 'work-money':{
  category:'career',transition:false,title:'일·돈 고민 상담',
  hook:'남을까, 옮길까. 돈은 왜 늘 빠듯할까.',
  lead:'이직·취업·사업·돈 관리처럼 조건을 따져야 하는 선택을 사주의 근거로 정리해요.',
  who:'지금 자리와 새 기회를 비교하고 싶거나, 돈이 모이고 새는 습관을 바꾸고 싶은 분',
  inputs:'생년월일과 태어난 시간, 질문 한 가지, 고려하는 선택지와 살펴볼 기간',
  sampleKey:'yeongnyangi-saju-salmon',
  sample:['남는 이유가 안정감인지, 맡은 일을 두고 가는 미안함인지 먼저 나눠 봐.','결정 전에 적어 볼 한 줄 — “새 역할과 생활 시간은 내 조건에 맞는가?”'],
  limit:'합격·수익·이직 성공을 확정하는 답이나 투자 종목 추천은 하지 않아요.',
 },
 timing:{
  category:'timing',transition:true,title:'시기·선택 상담',
  hook:'지금 움직여도 될까, 흐름은 언제 바뀔까.',
  lead:'지금 시기의 고민과 다음 장기 흐름을 대운·세운의 근거로 나눠 살펴봐요.',
  who:'계속할지 멈출지 망설이거나, 지금의 흐름이 언제 어떻게 바뀌는지 알고 싶은 분',
  inputs:'생년월일과 태어난 시간, 질문 한 가지, 살펴볼 기간(올해, 현재와 다음 대운 등)',
  sampleKey:'yeongnyangi-saju-tuna',
  sample:['다음 시기를 기다리는 동안, 바꾸고 싶은 일을 작은 규모로 먼저 해 보자.'],
  limit:'대운·세운은 미래 사건의 확정 날짜나 성공 확률이 아니에요. 계산 가능한 시기 근거 안에서 해석해요.',
 },
} as const satisfies Record<string,{category:QuestionDecision['category'];transition:boolean;title:string;hook:string;lead:string;who:string;inputs:string;sampleKey:string;sample:readonly string[];limit:string}>;
export type ConcernId=keyof typeof concernPages;
export const concernIds=Object.keys(concernPages) as ConcernId[];
export const isConcernId=(value:string):value is ConcernId=>Object.prototype.hasOwnProperty.call(concernPages,value);
export const concernStartHref=(id:ConcernId)=>'/yeongnyangi/fortune/?'+new URLSearchParams({category:concernPages[id].category});

export type ConcernTier={fish:QuestionFish;name:string;scope:string;price:number;length:string;followups:number};
/** Same rule as the question form (recommendQuestion), so the highlighted tier matches what checkout will enforce. */
export function concernRecommended(id:ConcernId):QuestionFish[]{
 const {category,transition}=concernPages[id];
 const decision=(horizon:QuestionDecision['horizon']):QuestionDecision=>({version:QUESTION_POLICY_VERSION,category,target:'self',horizon,situation:'',options:'',period:'',constraints:'',confirmed:false});
 const fish=[recommendQuestion(CONCERN_DOMAIN,decision('current')).fish];
 if(transition)fish.push(recommendQuestion(CONCERN_DOMAIN,decision('transition')).fish);
 return fish;
}
export function concernTiers():ConcernTier[]{
 return (Object.keys(FOLLOWUP_LIMITS) as QuestionFish[]).map(fish=>({fish,name:tierNames[fish],scope:questionScopes[fish],price:getProduct(`${CONCERN_DOMAIN}_${fish}`).priceKRW,length:a4Label(consultationBudget(fish).initial),followups:FOLLOWUP_LIMITS[fish]}));
}
