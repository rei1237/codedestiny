"use client";
import {useRef,useState} from 'react';
import {fortuneApi,type FortuneRecord} from '../_lib/api';
import styles from './question-conversation.module.css';

export function QuestionConversationEntry({row}:{row:FortuneRecord}){
 const c=row.conversation;
 if(!c?.ready||c.closed||c.remaining<=0)return null;
 return <aside className={styles.entry} aria-label="포함된 추가 질문">
  <div><strong>영냥이에게 더 물어보세요</strong><p>포함된 추가 질문 {c.limit}회 중 <b>{c.remaining}회 남았어요</b></p></div>
  <a href="#question-conversation-input" onClick={()=>document.getElementById('question-conversation-input')?.focus()}>추가 질문 이어가기</a>
 </aside>;
}

export default function QuestionConversation({row,onRow}:{row:FortuneRecord;onRow:(row:FortuneRecord)=>void}){
 const [question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const intent=useRef<{id:string;question:string}|null>(null),lock=useRef(false);
 const c=row.conversation;
 if(!c?.ready)return null;
 async function send(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   const pending=c?.pending;
   if(pending&&pending.retryAt>Date.now()){
    const latest=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);
    onRow(latest.fortune);return;
   }
   if(!intent.current)intent.current=pending?{id:pending.id,question:pending.question}:{id:crypto.randomUUID(),question:question.trim()};
   const data=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}/conversation`,intent.current!,{timeoutMs:75000});
   onRow(data.fortune);intent.current=null;setQuestion('');
  }catch(e){
   setError(e instanceof Error?e.message:'답변을 확인하지 못했어요. 같은 질문으로 다시 확인해 주세요.');
   try{const latest=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);onRow(latest.fortune);if(!latest.fortune.conversation?.pending)intent.current=null;}catch{/* Keep the same id when storage is temporarily unavailable. */}
  }
  finally{lock.current=false;setBusy(false);}
 }
 return <section id="question-conversation" className={styles.conversation} aria-labelledby="question-conversation-title">
  <header className={styles.heading}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={72} height={72} alt="영냥이"/><div><h2 id="question-conversation-title">{c.closed?'상담 기록':'이 상담에 이어 질문하기'}</h2>
  <p>{c.closed?'상담을 마쳤어요. 기존 결과와 대화는 계속 다시 볼 수 있어요.':`포함된 추가 질문 ${c.limit}회 중 ${c.remaining}회 남았어요.`}</p></div></header>
  {c.limit>0&&<ol className={styles.steps} aria-label="추가 질문 사용 현황">{Array.from({length:c.limit},(_,i)=><li key={i} data-done={i<c.used} aria-current={!c.closed&&i===c.used?'step':undefined}>{i+1}번째 질문 · {i<c.used?'답변 완료':i===c.used&&!c.closed?'지금 질문하기':'남은 질문'}</li>)}</ol>}
  {c.exchanges.map(e=><article key={e.id} className={styles.exchange}><div className={styles.question}><span>나의 질문</span><h3>{e.question}</h3></div><div className={styles.answer}><div className={styles.speaker}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={40} height={40} alt=""/><strong>영냥이의 답변</strong></div>{e.text.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>{e.kind!=='answer'&&<small>추가 질문 횟수에서 제외했어요.</small>}{e.kind==='new_consultation'&&<p><a href="/yeongnyangi/fortune/?flow=question">새 상담 범위 확인하기</a></p>}</article>)}
  {!c.closed&&<div className={styles.composer}>
   <h3>{c.used+1}번째 추가 질문을 들려주세요</h3>
   <p>이번 상담에서 궁금한 점을 모두 짚어보세요. 답변을 받은 뒤에도 남은 질문을 계속 이어갈 수 있어요.</p>
   <div className={styles.suggestions} aria-label="추가 질문 시작 문장">{['방금 설명한 흐름에서 제가 먼저 바꿔볼 행동은 무엇인가요?','말해준 선택 기준을 제 상황에 적용하는 예를 더 들어줄 수 있나요?','이번 상담에서 특히 주의하라고 한 부분을 조금 더 설명해 주세요.'].filter(text=>!c.exchanges.some(e=>e.question===text)).map(text=><button key={text} type="button" disabled={busy||Boolean(c.pending)||Boolean(intent.current)} onClick={()=>{setQuestion(text);document.getElementById('question-conversation-input')?.focus();}}>{text}</button>)}</div>
   <label htmlFor="question-conversation-input">영냥이에게 이어서 묻기<textarea id="question-conversation-input" rows={3} maxLength={1200} value={c.pending?.question||question} disabled={busy||Boolean(c.pending)||Boolean(intent.current)} onChange={e=>setQuestion(e.target.value)} placeholder="결과에서 궁금했던 부분과 지금 상황을 함께 적어주세요."/></label>
   <p>의미 확인과 정보 보충은 같은 질문으로 이어가요. 대상·주제·기간·계산이 달라지면 선택지를 먼저 안내해요.</p>
   <div className={styles.actions}><button type="button" disabled={busy||(!c.pending&&question.trim().length<2)} onClick={()=>void send()}>{busy?'답변을 정리하고 있어요':c.pending?'같은 질문 다시 확인하기':'질문 보내기'}</button>
   </div>
  </div>}
  {busy&&<p className={styles.waiting} role="status">영냥이가 기존 상담을 살펴보며 답변을 정리하고 있어요.</p>}
  {error&&<p role="alert">{error}</p>}
  <p className={styles.support}>잘못된 답변의 정정·결제·이용권·결과 열람 문제는 남은 횟수와 관계없이 <a href="/contact/">지원 문의</a>로 알려 주세요.</p>
 </section>;
}
