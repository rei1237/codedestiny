"use client";
import {useState} from 'react';
import {QUESTION_POLICY_VERSION,FOLLOWUP_LIMITS,questionTopics,questionCandidate,recommendQuestion,type QuestionDecision} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {products,systemNames} from '@/worker/yeongnyangi/payments/catalog';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import styles from '../yeongnyangi.module.css';

export default function QuestionScope({initialDomain,initialQuestion,initialDecision,onContinue,onLegacy}:{initialDomain:DomainId;initialQuestion:string;initialDecision?:QuestionDecision;onContinue:(domain:DomainId,question:string,decision:QuestionDecision)=>void;onLegacy:()=>void}){
 const [domain,setDomain]=useState(initialDomain),[question,setQuestion]=useState(initialQuestion);
 const [decision,setDecision]=useState<QuestionDecision>(initialDecision||{version:QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'',options:'',period:'',constraints:'',confirmed:false});
 const update=(patch:Partial<QuestionDecision>)=>setDecision({...decision,...patch,confirmed:false});
 const candidate=questionCandidate(question);
 const plan=recommendQuestion(domain,decision,question),product=products.find(p=>p.domain===domain&&p.fishId===plan.fish&&p.readingKind==='single')!;
 const blocked=!question.trim()||plan.missing.length>0||Boolean(plan.unsupported);
 return <section className={styles.consultation}>
  <header className={styles.consultationHeader}><div><h1>지금의 고민부터 들려주세요</h1><p>질문의 주제와 필요한 근거에 맞춰 상담을 안내해요. 모든 생선에서 답과 근거, 생활 속 예시, 실천할 행동을 충분히 전해요.</p></div></header>
  <form className={styles.form} onSubmit={event=>{event.preventDefault();if(!blocked)onContinue(domain,question,{...decision,confirmed:true});}}>
   <label>궁금한 질문<textarea rows={3} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="지금 결정하거나 이해하고 싶은 한 가지를 적어 주세요." required/></label>
   {candidate&&candidate!==decision.category&&<button type="button" onClick={()=>update({category:candidate})}>{questionTopics.find(t=>t.id===candidate)?.label} 주제로 살펴보기</button>}
   <label>질문의 주제<select value={decision.category} onChange={e=>update({category:e.target.value as QuestionDecision['category'],...(e.target.value==='compatibility'?{target:'pair' as const}:{})})}>{questionTopics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
   {questionTopics.find(t=>t.id===decision.category)?.example&&<button type="button" onClick={()=>setQuestion(questionTopics.find(t=>t.id===decision.category)!.example)}>이 주제의 질문 예시 사용하기</button>}
   <label>무엇을 살펴볼까요?<select value={decision.target} onChange={e=>update({target:e.target.value as QuestionDecision['target']})}><option value="self">내 생각·행동·선택</option><option value="pair">두 사람의 궁합·관계 구조</option></select></label>
   <label>어떤 흐름을 볼까요?<select value={decision.horizon} onChange={e=>update({horizon:e.target.value as QuestionDecision['horizon']})}><option value="current">지금의 질문과 선택 조건</option><option value="transition">현재와 다음 장기 시기의 전환</option></select></label>
   <button type="button" onClick={()=>update({situation:question})}>질문에 적은 상황 그대로 사용하기</button><label>현재 상황<textarea rows={2} maxLength={600} value={decision.situation} onChange={e=>update({situation:e.target.value})} placeholder="질문에 없는 상황만 보충해 주세요. 답의 조건을 정하는 데 필요해요."/></label>
   {decision.target==='pair'&&<label>두 사람의 관계<select value={decision.relationshipType||''} onChange={e=>update({relationshipType:e.target.value as QuestionDecision['relationshipType']})}><option value="">관계 선택</option><option value="romantic_adults">성인 연인·배우자</option><option value="family">가족</option><option value="other">그 밖의 관계</option></select></label>}
   {plan.fish==='salmon'&&<><label>선택지 또는 준비 목표<input maxLength={600} value={decision.options} onChange={e=>update({options:e.target.value})} placeholder="시험 종류, 고려하는 직장 등 판단할 대상을 알려 주세요."/></label><label>중요한 조건과 제약<input maxLength={600} value={decision.constraints} onChange={e=>update({constraints:e.target.value})} placeholder="시간·생활 조건 등. 없다면 ‘없음’. 정확한 자산 금액은 필요 없어요."/></label></>}
   <label>살펴볼 기간{!['salmon','tuna'].includes(plan.fish)&&' (선택)'}<input maxLength={600} value={decision.period} onChange={e=>update({period:e.target.value})} placeholder="시험일, 목표 시기, 현재와 다음 대운 등"/></label>
   <label>상담에 사용할 체계<select value={domain} onChange={e=>setDomain(e.target.value as DomainId)}>{Object.entries(systemNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <p>여러 문장으로 설명한 같은 고민은 하나로 살펴봐요. 서로 독립적인 질문이 섞였다면 먼저 다룰 결정을 골라 주세요.</p>
   <div className={styles.checkoutSection} aria-live="polite">
    <h2>{product.fishName} 상담 · {product.priceKRW.toLocaleString('ko-KR')}원</h2><p>{plan.reason}</p>
    <p>기본 상담 + 추가 질문 {FOLLOWUP_LIMITS[plan.fish]}회. 추가 질문은 이 상담을 이해하고 현실에 적용하는 범위예요.</p>
    <p>확인 대화·서비스 오류 정정·지원 문의는 횟수를 쓰지 않아요. 상담을 마쳐도 저장된 결과는 다시 볼 수 있어요.</p>
    <p>출생 차트만으로 사건의 날짜를 예측하지 않아요. {domain==='tarot'?'타로는 카드의 상징과 자리로 선택을 살피며 출생정보는 필요 없어요.':'다음 화면에서 해당 체계에 필요한 프로필을 확인해요.'}</p>
    {plan.unsupported&&<p role="alert">{plan.unsupported}</p>}
    {plan.missing.length>0&&<ul>{plan.missing.map(text=><li key={text}>{text}</li>)}</ul>}
    <button className={styles.checkoutButton} type="submit" disabled={blocked}>범위·가격 확인하고 계속하기</button>
   </div>
  </form>
  <button type="button" onClick={onLegacy}>기존 성향 해석·상담 메뉴 보기</button>
 </section>;
}
