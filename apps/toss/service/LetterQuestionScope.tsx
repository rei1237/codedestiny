import {chatFishForDomain} from '../../../lib/fortune/chat-products.js';
import {FOLLOWUP_LIMITS,QUESTION_POLICY_VERSION,questionDecision,questionNeedsDecisionDetails,questionScopes,questionTopics,recommendQuestion,type QuestionDecision,type QuestionFish} from '../../../worker/yeongnyangi/fortune/ask/question-policy';
import {packages} from '../../../worker/yeongnyangi/payments/catalog';
import type {ChatDomain} from '../../../app/fortune-chat/consultation-api';
import TarotSpreadPlanner,{emptyTarotPlan,restoreTarotPlan} from '../../../app/yeongnyangi/_components/tarot/TarotSpreadPlanner';

export const emptyScope:QuestionDecision={version:QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false};
export const letterScopeLabel=(fish:QuestionFish)=>packages[fish].name+' 질문 편지 · '+questionScopes[fish];
export const initialLetterScope={fish:'' as QuestionFish|'',decision:emptyScope,partnerId:'',tarotPlan:emptyTarotPlan};
type Scope=typeof initialLetterScope;
export function restoreLetterScope(domain:ChatDomain,raw:unknown):Scope{
 if(!raw||typeof raw!=='object')return initialLetterScope;
 const value=raw as Partial<Scope>;
 if(!value.fish||!chatFishForDomain(domain).includes(value.fish))return initialLetterScope;
 try{return {fish:value.fish,decision:questionDecision(value.decision),partnerId:typeof value.partnerId==='string'?value.partnerId.slice(0,160):'',tarotPlan:restoreTarotPlan(value.tarotPlan)};}catch{return initialLetterScope;}
}
export default function LetterQuestionScope({domain,question,onQuestion,value,onChange,locked=false,partners}:{domain:ChatDomain;question:string;onQuestion:(s:string)=>void;value:Scope;onChange:(s:Scope)=>void;locked?:boolean;partners:{id:string;name:string}[]}){
 const {fish,decision}=value;
 const update=(patch:Partial<QuestionDecision>)=>onChange({...value,decision:{...decision,...patch,confirmed:false}});
 const edit=(key:'situation'|'options'|'period'|'constraints',label:string)=><label>{label}<textarea aria-label={label} maxLength={600} rows={2} value={decision[key]} onChange={e=>update({[key]:e.target.value})}/></label>;
 const scope=recommendQuestion(domain,decision,question);
 return <fieldset className="daily-field"><legend>편지의 상담 범위</legend>
  <label>상담 상품<select aria-label="상담 상품" disabled={locked} value={fish} onChange={e=>onChange({...value,fish:e.target.value as Scope['fish'],decision:{...decision,confirmed:false}})}>
   <option value="">기본 상담 편지</option>{chatFishForDomain(domain).map((id:string)=><option key={id} value={id}>{packages[id as QuestionFish].name} 질문 편지</option>)}
  </select></label>
  {fish&&<><p>{questionScopes[fish]} · 후속 질문 {FOLLOWUP_LIMITS[fish]}회</p>
   <label>질문의 주제<select value={decision.category} onChange={e=>update({category:e.target.value as QuestionDecision['category']})}>{questionTopics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
   <label>판단 대상<select value={decision.target} onChange={e=>update({target:e.target.value as QuestionDecision['target']})}><option value="self">나의 선택</option><option value="pair">두 사람의 관계</option></select></label>
   <label>살펴볼 흐름<select value={decision.horizon} onChange={e=>update({horizon:e.target.value as QuestionDecision['horizon']})}><option value="current">현재의 고민</option><option value="transition">장기 시기 전환</option></select></label>
   {edit('situation','현재 상황')}
   {questionNeedsDecisionDetails(decision)&&<>{edit('options','선택지 또는 준비 목표')}{edit('constraints','중요한 조건과 제약')}</>}
   {edit('period','살펴볼 기간')}
   {decision.target==='pair'&&<><label>두 사람의 관계<select value={decision.relationshipType||''} onChange={e=>update({relationshipType:e.target.value as QuestionDecision['relationshipType']})}><option value="">선택해 주세요</option><option value="romantic_adults">성인 연인·배우자</option><option value="family">가족</option><option value="other">그 밖의 관계</option></select></label>
    {domain!=='tarot'&&<label>상대 프로필<select value={value.partnerId} onChange={e=>onChange({...value,partnerId:e.target.value})}><option value="">선택해 주세요</option>{partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}</>}
   {domain==='tarot'&&<TarotSpreadPlanner question={question} onQuestion={onQuestion} plan={value.tarotPlan} onPlan={tarotPlan=>onChange({...value,tarotPlan})} tier={fish} purposeMode onTier={()=>{}}/>}
   {scope.missing.map(text=><p key={text}>{text}</p>)}{scope.unsupported&&<p>{scope.unsupported}</p>}
   <label><input type="checkbox" disabled={Boolean(scope.missing.length||scope.unsupported)} checked={decision.confirmed} onChange={e=>onChange({...value,decision:{...decision,confirmed:e.target.checked}})}/>질문과 상담 범위를 확인했어요</label>
  </>}
 </fieldset>;
}
