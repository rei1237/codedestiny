import {QUESTION_POLICY_VERSION,recommendQuestion,type QuestionDecision,type QuestionFish} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';

export const emptyIntakeDecision=():QuestionDecision=>({version:QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false});
// domainFixed: ?domain=·?product= 로 체계를 정하고 들어온 상담은 체계 단계를 건너뛴다(2026-10-17).
export type IntakeValue={domain:DomainId;question:string;decision:QuestionDecision;fish?:QuestionFish;domainFixed?:boolean};
export const intakeFish=(value:IntakeValue)=>value.fish||recommendQuestion(value.domain,value.decision,value.question).fish;
