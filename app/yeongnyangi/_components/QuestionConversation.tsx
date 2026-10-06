"use client";
import {useRef,useState} from 'react';
import {fortuneApi,type FortuneRecord} from '../_lib/api';
import styles from '../yeongnyangi.module.css';

export default function QuestionConversation({row,onRow}:{row:FortuneRecord;onRow:(row:FortuneRecord)=>void}){
 const [question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const intent=useRef<{id:string;question:string}|null>(null),lock=useRef(false);
 const c=row.conversation;
 if(!c?.ready)return null;
 async function send(close=false){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   const pending=c?.pending;
   if(!close&&pending&&pending.retryAt>Date.now()){
    const latest=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);
    onRow(latest.fortune);return;
   }
   if(!close&&!intent.current)intent.current=pending?{id:pending.id,question:pending.question}:{id:crypto.randomUUID(),question:question.trim()};
   const data=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}/conversation`,close?{action:'close'}:intent.current!,{timeoutMs:75000});
   onRow(data.fortune);intent.current=null;setQuestion('');
  }catch(e){
   setError(e instanceof Error?e.message:'답변을 확인하지 못했어요. 같은 질문으로 다시 확인해 주세요.');
   try{const latest=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);onRow(latest.fortune);if(!latest.fortune.conversation?.pending)intent.current=null;}catch{/* Keep the same id when storage is temporarily unavailable. */}
  }
  finally{lock.current=false;setBusy(false);}
 }
 return <section className={styles.questionSection} aria-labelledby="question-conversation-title">
  <h2 id="question-conversation-title">{c.closed?'상담 기록':'이 상담에 이어 질문하기'}</h2>
  <p>{c.closed?'상담을 마쳤어요. 기존 결과와 대화는 계속 다시 볼 수 있어요.':`추가 질문 ${c.remaining}회 남음`}</p>
  {c.exchanges.map(e=><article key={e.id}><h3>{e.question}</h3><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{e.text}</p>{e.kind!=='answer'&&<small>추가 질문 횟수에서 제외했어요.</small>}{e.kind==='new_consultation'&&<p><a href="/yeongnyangi/fortune/?flow=question">새 상담 범위 확인하기</a></p>}</article>)}
  {!c.closed&&<><label>이어지는 질문<textarea rows={3} maxLength={1200} value={c.pending?.question||question} disabled={busy||Boolean(c.pending)||Boolean(intent.current)} onChange={e=>setQuestion(e.target.value)} placeholder="말해준 내용을 내 상황에 어떻게 적용하면 좋을까요?"/></label>
   <p>의미 확인과 정보 보충은 같은 질문으로 이어가요. 대상·주제·기간·계산이 달라지면 선택지를 먼저 안내해요.</p>
   <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}><button type="button" disabled={busy||(!c.pending&&question.trim().length<2)} onClick={()=>void send()}>{busy?'답변을 정리하고 있어요':c.pending?'같은 질문 다시 확인하기':'질문 보내기'}</button>
   <button type="button" style={{background:'transparent',color:'inherit'}} disabled={busy} onClick={()=>void send(true)}>상담 마치기</button></div>
  </>}
  {error&&<p role="alert">{error}</p>}
  <p>잘못된 답변의 정정·결제·이용권·결과 열람 문제는 남은 횟수와 관계없이 <a href="/contact/">지원 문의</a>로 알려 주세요.</p>
 </section>;
}
