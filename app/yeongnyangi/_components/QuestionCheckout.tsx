'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {questionCandidate,questionTopics,questionNeedsDecisionDetails,recommendQuestion,type QuestionDecision} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {systemNames} from '@/worker/yeongnyangi/payments/catalog';
import type {IntakeValue} from '../_lib/intake-chat';
import QuestionFishPicker from './QuestionFishPicker';
import styles from './question-checkout.module.css';

export type PreparationStep={id:string;prompt:string;answer:string;content:ReactNode;valid:boolean;pending?:boolean};
type Props={value:IntakeValue;open:boolean;busy:boolean;onChange:(value:IntakeValue)=>void;onOpen:()=>void;preparation:PreparationStep[];checkout:(children:ReactNode)=>ReactNode};
export default function QuestionCheckout({value,open,busy,onChange,onOpen,preparation,checkout}:Props){
 const heading=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(open){heading.current?.focus();heading.current?.scrollIntoView({block:'start'});}},[open]);
 const update=(patch:Partial<QuestionDecision>)=>onChange({...value,decision:{...value.decision,...patch}});
 if(!open)return <form className={styles.entry} onSubmit={event=>{event.preventDefault();if(!value.question.trim())return;onOpen();}}>
  <img src="/assets/yeongnyangi/original/hero-480.webp" width={120} height={120} alt=""/>
  <h1>지금, 어떤 마음이 궁금하세요?</h1><p>고민을 들려주세요. 다음 화면에서 상담과 이용권을 함께 확인해요.</p>
  <label htmlFor="yn-question">상담 질문</label><textarea id="yn-question" maxLength={1000} rows={4} value={value.question} onChange={event=>onChange({...value,question:event.target.value})} placeholder="지금 겪고 있는 상황과 가장 알고 싶은 것을 편하게 적어주세요."/>
  <button disabled={busy||!value.question.trim()} type="submit">상담과 결제 확인하기</button>
 </form>;
 const candidate=questionCandidate(value.question),details=questionNeedsDecisionDetails(value.decision);
 return <div ref={heading} tabIndex={-1} className={styles.content}>{checkout(<>
  <details className={styles.section}><summary>질문 수정하기</summary><label>상담 질문<textarea rows={4} maxLength={1000} value={value.question} onChange={event=>onChange({...value,question:event.target.value})}/></label></details>
  <details className={styles.section}><summary>상담 방식·깊이 변경하기</summary><label>상담 방식<select value={value.domain} onChange={event=>onChange({...value,domain:event.target.value as IntakeValue['domain']})}>{Object.entries(systemNames).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <QuestionFishPicker domain={value.domain} selected={value.fish||recommendQuestion(value.domain,value.decision,value.question).fish} recommended={recommendQuestion(value.domain,value.decision,value.question).fish} onSelect={fish=>onChange({...value,fish})}/>
  </details>
  <details className={styles.section}><summary>질문의 주제와 범위 확인</summary>
   {candidate&&candidate!==value.decision.category&&<button type="button" onClick={()=>update({category:candidate})}>질문에 맞는 주제 적용하기</button>}
   <label>주제<select value={value.decision.category} onChange={event=>update({category:event.target.value as QuestionDecision['category']})}>{questionTopics.map(topic=><option key={topic.id} value={topic.id}>{topic.label}</option>)}</select></label>
   <label>상담 대상<select value={value.decision.target} onChange={event=>update({target:event.target.value as QuestionDecision['target']})}><option value="self">나의 생각·행동·선택</option><option value="pair">두 사람의 궁합과 관계</option></select></label>
   <label>살펴볼 흐름<select value={value.decision.horizon} onChange={event=>update({horizon:event.target.value as QuestionDecision['horizon']})}><option value="current">현재의 고민</option><option value="transition">현재와 다음 장기 시기</option></select></label>
  </details>
  {value.decision.target==='pair'&&<label>두 사람의 관계<select value={value.decision.relationshipType||''} onChange={event=>update({relationshipType:event.target.value as QuestionDecision['relationshipType']})}><option value="">선택해 주세요</option><option value="romantic_adults">성인 연인·배우자</option><option value="family">가족</option><option value="other">그 밖의 관계</option></select></label>}
  {(details||value.decision.horizon==='transition')&&<section className={styles.section}><h2>정확한 판단에 필요한 정보</h2>
   {details&&<><label>비교할 선택지 또는 준비 목표<input maxLength={600} value={value.decision.options} onChange={event=>update({options:event.target.value})}/></label><label>꼭 지켜야 할 조건<input maxLength={600} placeholder="제약이 없다면 ‘없음’으로 적어 주세요." value={value.decision.constraints} onChange={event=>update({constraints:event.target.value})}/></label></>}
   <label>살펴볼 기간<input maxLength={600} value={value.decision.period} placeholder="예: 올해 안, 현재와 다음 대운" onChange={event=>update({period:event.target.value})}/></label>
  </section>}
  <details className={styles.section}><summary>더 정확한 상담을 위해 · 선택</summary><label>질문에 없는 상황 보충<textarea rows={3} maxLength={600} value={value.decision.situation} onChange={event=>update({situation:event.target.value})}/></label>{!details&&value.decision.horizon!=='transition'&&<label>살펴볼 기간<input maxLength={600} value={value.decision.period} onChange={event=>update({period:event.target.value})}/></label>}</details>
  {preparation.map(item=><details key={item.id} open={!item.valid||item.pending} className={styles.section}><summary>{{profile:'상담 프로필',language:'결과 언어','birth-time':'태어난 시간','birth-place':'출생 지역',partner:'상대 프로필',tarot:'타로 배열','past-years':'지난 경험 확인'}[item.id]||item.prompt}{item.valid?' · '+item.answer:''}</summary>{item.content}</details>)}
 </>)}</div>;
}
