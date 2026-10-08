import {QUESTION_POLICY_VERSION,questionTopics,recommendQuestion,type QuestionDecision} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {systemNames} from '@/worker/yeongnyangi/payments/catalog';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';

export const emptyIntakeDecision=():QuestionDecision=>({version:QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false});
export type IntakeValue={domain:DomainId;question:string;decision:QuestionDecision};
export type IntakeStep='question'|'category'|'target'|'horizon'|'situation'|'relationshipType'|'options'|'constraints'|'period'|'domain'|'scope';
export function intakeSteps(value:IntakeValue):IntakeStep[]{
 const fish=recommendQuestion(value.domain,value.decision,value.question).fish;
 return ['question','category','target','horizon','situation',...(value.decision.target==='pair'?['relationshipType' as const]:[]),...(fish==='salmon'?['options' as const,'constraints' as const]:[]),'period','domain','scope'];
}
export function intakeAnswer(step:IntakeStep,value:IntakeValue):string{
 const d=value.decision;
 switch(step){
  case 'question':return value.question;
  case 'category':return questionTopics.find(t=>t.id===d.category)?.label||'';
  case 'target':return d.target==='pair'?'두 사람의 궁합과 관계 구조':'내 생각과 행동, 선택';
  case 'horizon':return d.horizon==='transition'?'현재와 다음 장기 시기의 전환':'지금의 고민과 선택';
  case 'domain':return systemNames[value.domain];
  case 'relationshipType':return d.relationshipType?{romantic_adults:'성인 연인·배우자',family:'가족',other:'그 밖의 관계'}[d.relationshipType]:'';
  case 'scope':return recommendQuestion(value.domain,d,value.question).reason;
  default:return d[step];
 }
}
export function intakeStepValid(step:IntakeStep,value:IntakeValue):boolean{
 const plan=recommendQuestion(value.domain,value.decision,value.question);
 if(step==='scope')return Boolean(value.question.trim())&&!plan.unsupported&&!plan.missing.length;
 if(step==='period'&&!['salmon','tuna'].includes(plan.fish))return true;
 return Boolean(intakeAnswer(step,value).trim());
}
/** A restored cursor never skips missing inputs or a preparation invalidated by edits. */
export function intakeCursor(value:IntakeValue,confirmed:boolean,requested:string,preparation:{id:string;valid:boolean;pending?:boolean}[]):{steps:string[];index:number}{
 const scope=intakeSteps(value),steps=confirmed?[...scope,...preparation.map(p=>p.id),'review']:scope;
 let index=steps.indexOf(requested);
 if(index<0)index=confirmed?scope.length:0;
 for(let i=0;i<index;i++){
  const id=steps[i];
  const prep=preparation.find(p=>p.id===id);
  if(scope.includes(id as IntakeStep)?!intakeStepValid(id as IntakeStep,value):prep?.valid===false&&!prep.pending){index=i;break;}
 }
 return {steps,index};
}
export const intakePrompts:Record<IntakeStep,[string,string]>={
 question:['지금 어떤 고민이 있어? 편하게 들려줘.','지금 어떤 고민이 있으세요? 편하게 들려주세요.'],
 category:['어떤 주제로 살펴보면 좋을까?','어떤 주제로 살펴보면 좋을까요?'],
 target:['네 선택이 궁금해, 아니면 두 사람을 함께 비교해 볼까?','손님의 선택이 궁금하신가요, 두 사람을 함께 비교해 볼까요?'],
 horizon:['지금의 고민을 볼까, 긴 시기의 전환을 볼까?','지금의 고민을 볼까요, 긴 시기의 전환을 볼까요?'],
 situation:['지금 어떤 상황인지 조금만 더 알려줘. 앞에서 말한 내용으로도 괜찮아.','지금 어떤 상황인지 조금만 더 알려주세요. 앞에서 말씀하신 내용으로도 괜찮아요.'],
 relationshipType:['두 사람은 어떤 관계야?','두 사람은 어떤 관계인가요?'],
 options:['고민 중인 선택지나 준비하는 목표가 있어?','고민 중인 선택지나 준비하는 목표가 있으세요?'],
 constraints:['선택할 때 꼭 지켜야 할 조건이 있어? 없다면 없다고 말해줘.','선택할 때 꼭 지켜야 할 조건이 있으세요? 없다면 없다고 말씀해 주세요.'],
 period:['언제의 흐름을 살펴볼까?','언제의 흐름을 살펴볼까요?'],
 domain:['어떤 방식으로 살펴볼까? 익숙한 방식으로 골라줘.','어떤 방식으로 살펴볼까요? 익숙한 방식으로 골라주세요.'],
 scope:['이 범위로 살펴볼게. 준비를 계속하기 전에 확인해 줘.','이 범위로 살펴볼게요. 준비를 계속하기 전에 확인해 주세요.'],
};
