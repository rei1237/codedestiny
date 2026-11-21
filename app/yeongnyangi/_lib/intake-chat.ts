import {QUESTION_POLICY_VERSION,recommendQuestion,type QuestionDecision,type QuestionFish} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';

export const emptyIntakeDecision=():QuestionDecision=>({version:QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false});
// domainFixed: ?domain=·?product= 로 체계를 정하고 들어온 상담은 체계 단계를 건너뛴다(2026-10-17).
export type IntakeValue={domain:DomainId;question:string;decision:QuestionDecision;fish?:QuestionFish;domainFixed?:boolean};
// Advisory only: explicit, single-intent questions can opt in to a suggested scope.
export function typedScopeSuggestion(question:string):{category:'money'|'compatibility';target:'self'|'pair';label:string}|undefined{
 const text=question.normalize('NFKC').trim().replace(/\s+/g,' ').replace(/[?!.。]+$/,'');
 if(/^(?:(?:나는|내가|저는|제가) )?(?:어떻게 하면 )?돈(?:을)? (?:(?:더|많이|잘) ){0,2}벌(?: 수 있을까| 수 있을까요|면 좋을까|면 좋을까요|려면 어떻게 해야 할까)$/.test(text)||
  /^(?:(?:나는|내가|저는|제가) )?(?:어떻게 하면 )?수입을? (?:(?:더|많이) )?늘릴 수 있을까(?:요)?$/.test(text)){
  return {category:'money',target:'self',label:'수입을 늘리는 방향으로 보기'};
 }
 if(/^(?:(?:나는|내가|저는|제가) )?(?:(?:지금 만나는 사람|현재 연인|지금의 연인|지금 만나는 연인)(?:과|와) 결혼해도 (?:잘 )?맞을까|그 사람과 나는 결혼할 궁합일까)(?:요)?$/.test(text)){
  return {category:'compatibility',target:'pair',label:'두 사람의 결혼 궁합으로 보기'};
 }
 return undefined;
}
export const intakeFish=(value:IntakeValue)=>value.fish||recommendQuestion(value.domain,value.decision,value.question).fish;
