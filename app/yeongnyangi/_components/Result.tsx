"use client";
import {useEffect,useRef,useState} from 'react';
import {PawPrint,RefreshCw} from 'lucide-react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,checkoutPath,type FortuneRecord} from '../_lib/api';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import {readingLanguageNames} from '@/worker/yeongnyangi/fortune/reading-locale';
import ReadingBook from './ReadingBook';
import ReadingIdentity from './ReadingIdentity';
import SpiritResult from './SpiritResult';
import styles from '../yeongnyangi.module.css';
import {trackFortuneDelivery,trackFortuneView} from '@/lib/analytics';
import ReadingLoading from './ReadingLoading';
import ResultSharing from './ResultSharing';
import FishReceipt from './FishReceipt';
function RecoveryNotice({message,busy,onRetry,locale}:{message:string;busy:boolean;onRetry:()=>void;locale?:FortuneRecord['locale']}){
 const copy=resultStateCopy(locale);
 return <div className={styles.recoveryNotice}>
  <img src="/assets/yeongnyangi/original/signup.webp" width={116} height={116} alt={copy.retryAlt}/>
  <div><h2>{copy.retryTitle}</h2><p role="alert">{message}</p><p className={styles.recoveryHint}>{copy.retryHint}</p>
   <button className={styles.retryButton} disabled={busy} onClick={onRetry}><RefreshCw size={18} aria-hidden="true"/>{busy?copy.retryBusy:copy.retry}<PawPrint size={18} aria-hidden="true"/></button>
  </div>
 </div>;
}
const RESULT_POLL_MS=1500;
// 결제 확정(웹훅·PG 복귀)보다 먼저 열린 결과 화면이 새로고침 없이 넘어가도록 /activate 를 RESULT_POLL_MS 간격으로 다시 확인하는 상한(약 3분).
const PAY_CHECK_LIMIT=Math.ceil(180000/RESULT_POLL_MS);
function sameRequest(fortune:FortuneRecord,id:string){
 if(fortune.id!==id||(fortune.recovery?.requestId&&fortune.recovery.requestId!==id))throw new FortuneApiError('RECOVERY_ID_MISMATCH','원래 상담과 복구 응답이 일치하지 않아요. 다시 결제하지 말고 주문번호와 함께 문의해 주세요.',409,false);
 return fortune;
}
export default function Result(){
 const [row,setRow]=useState<FortuneRecord|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),mounted=useRef(true);
 const [reload,setReload]=useState(0);
 const requestId=useRef('');
 const payChecks=useRef(0),[payWatching,setPayWatching]=useState(true);
 useEffect(()=>{if(row){trackFortuneDelivery(row);trackFortuneView(row,new URLSearchParams(window.location.search).get('source')||'direct');}},[row]);
 async function generate(id:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/generate`,{});
    if(mounted.current)setRow(sameRequest(fortune,id));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else if(mounted.current)setError(row?.locale&&row.locale!=='ko'?resultStateCopy(row.locale).generateFailed:e instanceof Error?e.message:resultStateCopy().generateFailed);}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{
  mounted.current=true;
  const id=new URLSearchParams(window.location.search).get('id')||'';
  if(!/^[a-f0-9]{64}$/.test(id)){setError(resultStateCopy().notFound);return;}
  requestId.current=id;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  async function load(attempt=0){
   try{
    let {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}`);fortune=sameRequest(fortune,id);
    let notice='';
    if(!fortune.paid && fortune.state!=='REFUNDED'){
     // 이미 읽은 상담은 결제 연결(activate) 실패로 버리지 않는다. 일시 오류는 아래 결제 대기 폴링이 다시 시도하고,
     // 기다려도 바뀌지 않는 답(가격 변경 등)만 안내한다.
     try{fortune=sameRequest((await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/activate`,{})).fortune,id);}
     catch(e){
      if(e instanceof FortuneApiError&&(e.status===401||e.code==='RECOVERY_ID_MISMATCH'))throw e;
      if(e instanceof FortuneApiError&&e.status!==402&&!e.retryable&&e.code!=='PAYMENT_ATTACH_CONFLICT')notice=fortune.locale&&fortune.locale!=='ko'?resultStateCopy(fortune.locale).paymentRequired:e.message;
     }
    }
    if(!cancelled){setRow(fortune);setError(notice);}
   }catch(e){
    if(cancelled)return;
    if(e instanceof FortuneApiError&&e.status===401){loginForCurrentPage();return;}
    setError(e instanceof Error?e.message:resultStateCopy().loadFailed);
    if(attempt<3 && (!(e instanceof FortuneApiError)||e.retryable))timer=setTimeout(()=>void load(attempt+1),Math.max(2000*2**attempt,e instanceof FortuneApiError?e.retryAfterSeconds*1000:0));
   }
  }
  void load();
  return ()=>{cancelled=true;mounted.current=false;if(timer)clearTimeout(timer);};
 },[reload]);
 useEffect(()=>{
  if(!row?.paid || ['COMPLETED','REFUNDED'].includes(row.state) || ['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode || ''))return;
  let cancelled=false;
  const timer=setTimeout(async()=>{
   try{
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);
    if(!cancelled){setRow(sameRequest(fortune,row.id));setError('');}
   }catch(e){if(!cancelled){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else {setError(resultStateCopy(row.locale).pollFailed);setRow({...row});}}}
  },RESULT_POLL_MS);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[row]);
 useEffect(()=>{
  if(!row || row.paid || row.state==='REFUNDED' || !payWatching)return;
  if(payChecks.current>=PAY_CHECK_LIMIT){setPayWatching(false);return;}
  let cancelled=false;
  const timer=setTimeout(async()=>{
   payChecks.current+=1;
   try{
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}/activate`,{});
    if(!cancelled)setRow(sameRequest(fortune,row.id));
   }catch(e){
    if(cancelled)return;
    if(e instanceof FortuneApiError&&e.status===401){loginForCurrentPage();return;}
    // 402·일시 네트워크 오류는 아직 확정 전이라는 뜻이다. 단, Family 월 한도 초과는 기다려도 바뀌지 않는 확정 답이다.
    const waiting=!(e instanceof FortuneApiError)||((e.status===402&&e.code!=='MONTHLY_PASS_LIMIT_EXCEEDED')||e.retryable||e.code==='PAYMENT_ATTACH_CONFLICT');
    if(waiting)setRow({...row});else setPayWatching(false);
   }
  },RESULT_POLL_MS);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[row,payWatching]);
 // 결제 전에는 챕터가 하나도 없다 — "0 / N개 챕터 저장됨"·진행률·목차("준비 중")를 그리면 결제가 끝난 화면처럼 보인다.
 const copy=readingCopy(row?.locale);
 const stateCopy=resultStateCopy(row?.locale);
 const unpaid=!!row&&!row.paid&&row.state!=='REFUNDED';
 if(row?.consultation?.spirit||row?.consultation?.questionSky)return <section className={styles.reader}>
  {row.paid&&row.state!=='REFUNDED'&&<FishReceipt product={row.product}/>}
  <SpiritResult row={row}/>
  {row.state==='COMPLETED'&&<ResultSharing key={row.id} row={row}/>}
  {row.state==='REFUNDED'?<p>{stateCopy.refunded}</p>:!row.paid?<><p>{stateCopy.paymentRequired}</p>{payWatching&&<p role="status">{stateCopy.paymentWaiting}</p>}<button onClick={()=>window.location.reload()}>{stateCopy.checkPayment}</button><a href={checkoutPath(row)}>{copy.checkout}</a></>:row.state!=='COMPLETED'&&<>
    {row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?<><p role="alert">{copy.recoveryStopped}</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{copy.recovery}</button></>:row.errorCode==='GENERATION_REVIEW_REQUIRED'||row.errorCode==='PAYMENT_NOT_ACTIVE'?<p role="alert">{copy.support}</p>:<p>{stateCopy.serverResume}</p>}
  </>}
  {error&&<><p role="alert">{row.locale&&row.locale!=='ko'?stateCopy.loadFailed:error} {stateCopy.paidWarning}</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{stateCopy.retry}</button></>}<p className={styles.orderId}>{copy.order}: {row.id}</p>
 </section>;
 return <section className={styles.reader} lang={row?.locale||'ko'}>
  <p className={styles.readerGreeting}><PawPrint size={19} aria-hidden="true"/> {stateCopy.greeting}</p><h1>{row?`${row.product.name} · ${row.product.fishName}`:stateCopy.result}</h1>
  {row&&<ReadingIdentity product={row.product}/>}
  {row?.paid&&row.state!=='REFUNDED'&&<FishReceipt product={row.product}/>}
  {!row&&!error&&<ReadingLoading/>}
  {row&&<>
   {row.paid&&!['COMPLETED','REFUNDED'].includes(row.state)&&!['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'')&&<ReadingLoading product={row.product} stage={row.chapters.length===row.manifest.length?'verifying':'generating'} saved={row.chapters.length} total={row.manifest.length}/>}
   <section className={styles.questionContext} aria-label={stateCopy.questionSection}>
    <h2>{row.consultation?.kindLabel || row.consultation?.topicLabel || stateCopy.consultation}</h2>
    {row.consultation?.question?<p style={{whiteSpace:'pre-wrap'}}>{row.consultation.question}</p>:<p>{stateCopy.context}</p>}
    {row.consultation?.asOf&&<p>{stateCopy.asOf}: {row.consultation.asOf} · {row.consultation.timezone || 'Asia/Seoul'}</p>}
    {row.consultation?.period&&<p>{stateCopy.period}: {row.consultation.period.label}. {stateCopy.periodHint}</p>}
   </section>
   <div id="reading-progress" className={styles.progress}><img src="/assets/yeongnyangi/hero.webp" width={120} height={120} alt={stateCopy.greeting}/>
    <div>{!unpaid&&<p>{row.state==='COMPLETED'?copy.complete:stateCopy.saved(row.chapters.length,row.manifest.length)}</p>}
     {!unpaid&&<progress value={row.chapters.length+(row.state==='COMPLETED'?1:0)} max={row.manifest.length+1} aria-label={stateCopy.progress}/>}
     {row.paid&&row.state!=='REFUNDED'&&row.state!=='COMPLETED'&&(row.errorCode==='GENERATION_REVIEW_REQUIRED'?<p role="alert">{stateCopy.reviewRequired}</p>:row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?<><p role="alert">{stateCopy.recoveryStopped}</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{busy?stateCopy.recovering:copy.recovery}</button></>:<p role="status">{row.chapters.length===row.manifest.length?copy.reviewing:copy.generating}</p>)}
     {row.state==='REFUNDED'&&<p>{stateCopy.refunded}</p>}
     {!row.paid&&row.state!=='REFUNDED'&&<><p>{stateCopy.unpaid}</p>{payWatching&&<p role="status">{stateCopy.paymentWaiting}</p>}<button onClick={()=>window.location.reload()}>{stateCopy.checkPayment}</button><a className={styles.button} href={checkoutPath(row)}>{copy.checkout}</a></>}
    </div>
   </div>
   {row.state==='COMPLETED'&&<ResultSharing key={row.id} row={row}/>}
   {!unpaid&&<ReadingBook row={row}/>}
  </>}
  {error&&!row&&requestId.current?<RecoveryNotice message={error} busy={busy} onRetry={()=>{setError('');setReload(n=>n+1);}}/>:error&&<p role="alert">{row?.locale&&row.locale!=='ko'?stateCopy.loadFailed:error} {stateCopy.paidWarningKnown}</p>}
  {row?.paid&&!['COMPLETED','REFUNDED'].includes(row.state)&&!['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'')&&<button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{busy?copy.loading:copy.continue}</button>}
  {row&&<p>{copy.language}: {readingLanguageNames[row.locale || 'ko']}</p>}
  {row&&<p className={styles.orderId}>{copy.order}: {row.id}</p>}
  <a href={row?.locale?'/yeongnyangi/library/?lang='+row.locale:'/yeongnyangi/library/'}>{copy.library}</a>
 </section>;
}
