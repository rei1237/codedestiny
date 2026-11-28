'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,type FortunePage,type FortuneSummary} from '../_lib/api';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {subscribeAuth} from '@/app/_lib/auth-store';
import {SUPPORT_CONTACT_PATH} from '@/worker/yeongnyangi/support-knowledge';
import {OrderLookup} from './OrderRecovery';
import styles from './support-desk.module.css';

// S9 고객센터. 1층(결제했는데 결과가 없어요)은 LLM 없이 기존 GET requests 만 쓴다. 2층(영냥이에게 물어보기)은 POST support.
// 사람 문의로 넘길 때는 주문 ref(sha256 앞 12자)와 상품 키만 붙인다. 이름·생년월일·질문 원문은 링크에 싣지 않는다.
const QUESTION_MAX=300; // 서버 SUPPORT_QUESTION_MAX 와 같다. 넘는 입력은 서버가 400 으로 거절한다.
type Stuck={id:string;ref:string;name:string;feature:string;date:string;recovering:boolean};
type Answer={source:'faq'|'llm'|'fallback';text:string};

async function orderRef(id:string){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));
 return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,12);
}
export function supportContactHref(ref?:string,feature?:string){
 const query=new URLSearchParams();if(ref)query.set('ref',ref);if(feature)query.set('feature',feature);
 const text=query.toString();return text?`${SUPPORT_CONTACT_PATH}?${text}`:SUPPORT_CONTACT_PATH;
}
const isStuck=(row:FortuneSummary)=>row.paid&&row.state!=='COMPLETED'&&row.state!=='REFUNDED';

// orderLookup: 내 상담 화면은 이미 OrderLookup 을 그리므로 false 로 넘긴다(같은 입력 id 가 두 번 생기지 않게).
export default function SupportDesk({orderLookup=true}:{orderLookup?:boolean}={}){
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 const [stuck,setStuck]=useState<Stuck[]|null>(null),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState('');
 const [question,setQuestion]=useState(''),[asking,setAsking]=useState(false),[answer,setAnswer]=useState<Answer|null>(null),[askError,setAskError]=useState('');
 const [copied,setCopied]=useState('');
 const loaded=useRef(false);
 useEffect(()=>{
  const sync=()=>{const next=Boolean(readDestinyProfileAccountId());setSignedIn(next);if(!next){setStuck(null);loaded.current=false;}};
  sync();const unsubscribe=subscribeAuth(sync);window.addEventListener('cd:auth-changed',sync);
  return()=>{unsubscribe();window.removeEventListener('cd:auth-changed',sync);};
 },[]);
 async function loadStuck(){
  if(loaded.current||loading||!signedIn)return;
  loaded.current=true;setLoading(true);setLoadError('');
  try{
   const page=await fortuneApi<FortunePage>('requests');
   const rows=await Promise.all(page.fortunes.filter(isStuck).map(async row=>({id:row.id,ref:await orderRef(row.id),name:row.kindLabel||row.product?.name||'영냥이 상담',
    feature:row.product?.cdFeatureKey||'',date:new Date(row.createdAt).toLocaleDateString('ko'),recovering:Boolean(row.recovering)})));
   setStuck(rows);
  }catch(reason){
   loaded.current=false;
   if(reason instanceof FortuneApiError&&reason.status===401){setSignedIn(false);return;}
   setLoadError(reason instanceof FortuneApiError?reason.message:'상담 기록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.');
  }finally{setLoading(false);}
 }
 async function ask(event:FormEvent){
  event.preventDefault();
  const text=question.replace(/\s+/g,' ').trim();
  if(text.length<2){setAskError('궁금한 점을 두 글자 이상 적어 주세요.');return;}
  setAsking(true);setAskError('');setAnswer(null);
  try{
   const reply=await fortuneApi<{source:Answer['source'];answer:string}>('support',{question:text},{timeoutMs:30000});
   setAnswer({source:reply.source,text:reply.answer});
  }catch(reason){
   if(reason instanceof FortuneApiError&&reason.status===401){setSignedIn(false);setAskError('로그인하면 영냥이에게 물어볼 수 있어요.');return;}
   setAskError(reason instanceof FortuneApiError&&reason.status===429?'오늘 물어볼 수 있는 횟수를 다 썼어요. 위의 자주 묻는 질문을 보거나 문의하기로 알려 주세요.':reason instanceof FortuneApiError&&reason.status===400?reason.message:'지금은 답을 가져오지 못했어요. 잠시 후 다시 물어봐 주세요.');
  }finally{setAsking(false);}
 }
 async function copy(ref:string){try{await navigator.clipboard.writeText(ref);setCopied(ref);}catch{setCopied('');}}

 return <section className={styles.desk} aria-labelledby="yn-support-title" lang="ko">
  <h2 id="yn-support-title" className={styles.title}>영냥이 고객센터</h2>
  <p className={styles.lead}>결제한 상담이 안 보이거나 궁금한 점이 있으면 여기서 먼저 확인해요.</p>
  <details className={styles.card} onToggle={event=>{if(event.currentTarget.open)void loadStuck();}}>
   <summary>결제했는데 결과가 없어요</summary>
   <div className={styles.body}>
    {signedIn===false?<>
     <p>결제한 계정으로 로그인하면 아직 다 만들어지지 않은 상담을 바로 찾아 드려요.</p>
     <button type="button" className={styles.primary} onClick={loginForCurrentPage}>로그인하고 확인하기</button>
     {orderLookup?<><p className={styles.note}>결제 완료 화면에 있는 주문번호(64자리)가 있으면 아래에서 바로 열 수 있어요.</p>
     <OrderLookup locale="ko"/></>:<p className={styles.note}>결제 완료 화면에 있는 주문번호(64자리)가 있으면 아래 '주문번호로 상담 다시 열기'에서 바로 열 수 있어요.</p>}
    </>:loading||signedIn===null?<p role="status">결제한 상담을 확인하고 있어요.</p>
    :loadError?<div role="alert"><p>{loadError}</p><button type="button" className={styles.secondary} onClick={()=>void loadStuck()}>다시 확인하기</button></div>
    :stuck&&stuck.length===0?<p>결제했지만 결과가 멈춘 상담은 없어요. 결제 직후라면 1~2분 뒤에 내 상담에서 다시 확인해 주세요.</p>
    :stuck?<ul className={styles.list}>{stuck.map(row=><li key={row.id}>
     <p className={styles.rowTitle}>{row.name}<span>{row.date} · {row.recovering?'다시 만드는 중':'결과 화면에서 이어서 확인'}</span></p>
     <a className={styles.primary} href={`${resultPath(row.id,'ko')}&source=support`}>결과 화면 열기</a>
     <p className={styles.note}>결과 화면에서 다시 시도해도 안 되면 이 번호를 적어 문의해 주세요.</p>
     <p className={styles.ref}><span>문의 번호</span><code>{row.ref}</code><button type="button" onClick={()=>void copy(row.ref)}>{copied===row.ref?'복사했어요':'복사'}</button></p>
     <a className={styles.secondary} href={supportContactHref(row.ref,row.feature)}>이 번호로 문의하기</a>
    </li>)}</ul>:null}
    <p className={styles.note}>그래도 해결되지 않으면 <a href={SUPPORT_CONTACT_PATH}>문의하기</a>로 알려 주세요.</p>
   </div>
  </details>
  <details className={styles.card}>
   <summary>영냥이에게 물어보기</summary>
   <div className={styles.body}>
    {signedIn===false?<>
     <p>로그인하면 내 상담 상태를 살펴보고 답해 드려요.</p>
     <button type="button" className={styles.primary} onClick={loginForCurrentPage}>로그인하고 물어보기</button>
    </>:<form onSubmit={event=>void ask(event)}>
     <label htmlFor="yn-support-question">궁금한 점</label>
     <textarea id="yn-support-question" value={question} maxLength={QUESTION_MAX} rows={3} onChange={event=>{setQuestion(event.target.value);setAskError('');}} placeholder="예: 결제한 상담이 어디 있는지 모르겠어요"/>
     <p className={styles.count} aria-live="polite">{question.length}/{QUESTION_MAX}자</p>
     <button type="submit" className={styles.primary} disabled={asking}>{asking?'영냥이가 확인하고 있어요':'물어보기'}</button>
    </form>}
    {askError&&<p role="alert" className={styles.error}>{askError}</p>}
    {answer&&<div className={styles.answer} role="status"><p>{answer.text}</p>{answer.source==='fallback'&&<a className={styles.secondary} href={SUPPORT_CONTACT_PATH}>문의하기</a>}</div>}
    <p className={styles.note}>영냥이 답은 안내용이에요. 환불·결제 취소는 문의하기로 접수해 주세요.</p>
   </div>
  </details>
 </section>;
}
