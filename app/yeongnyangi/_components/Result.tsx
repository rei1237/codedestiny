"use client";
import {useEffect,useRef,useState} from 'react';
import {PawPrint,RefreshCw} from 'lucide-react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,checkoutPath,type FortuneRecord} from '../_lib/api';
import ReadingBook from './ReadingBook';
import ReadingIdentity from './ReadingIdentity';
import SpiritResult from './SpiritResult';
import styles from '../yeongnyangi.module.css';
import {trackFortuneDelivery,trackFortuneView} from '@/lib/analytics';
import ReadingLoading from './ReadingLoading';
import ResultSharing from './ResultSharing';
import FishReceipt from './FishReceipt';
function RecoveryNotice({message,busy,onRetry}:{message:string;busy:boolean;onRetry:()=>void}){
 return <div className={styles.recoveryNotice}>
  <img src="/assets/yeongnyangi/original/signup.webp" width={116} height={116} alt="두루마리를 다시 챙기는 영냥이"/>
  <div><h2>잠깐, 영냥이가 다시 챙겨올게.</h2><p role="alert">{message}</p><p className={styles.recoveryHint}>결제한 상담은 그대로 이어갈 수 있어. 다시 결제하지 않아도 돼.</p>
   <button className={styles.retryButton} disabled={busy} onClick={onRetry}><RefreshCw size={18} aria-hidden="true"/>{busy?'두루마리 챙기는 중':'다시 불러오기'}<PawPrint size={18} aria-hidden="true"/></button>
  </div>
 </div>;
}
// 결제 확정(웹훅·PG 복귀)보다 먼저 열린 결과 화면이 새로고침 없이 넘어가도록 /activate 를 5초 간격으로 다시 확인하는 상한(약 3분).
const PAY_CHECK_LIMIT=36;
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
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else if(mounted.current)setError(e instanceof Error?e.message:'상담을 이어가지 못했어요.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{
  mounted.current=true;
  const id=new URLSearchParams(window.location.search).get('id')||'';
  if(!/^[a-f0-9]{64}$/.test(id)){setError('상담을 찾지 못했어요. 내 상담 기록에서 다시 선택해 주세요.');return;}
  requestId.current=id;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  async function load(attempt=0){
   try{
    let {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}`);fortune=sameRequest(fortune,id);
    if(!fortune.paid && fortune.state!=='REFUNDED'){
     try{fortune=sameRequest((await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/activate`,{})).fortune,id);}
     catch(e){if(!(e instanceof FortuneApiError&&e.status===402))throw e;}
    }
    if(!cancelled){setRow(fortune);setError('');}
   }catch(e){
    if(cancelled)return;
    if(e instanceof FortuneApiError&&e.status===401){loginForCurrentPage();return;}
    setError(e instanceof Error?e.message:'상담을 불러오지 못했어요. 다시 시도해 주세요.');
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
   }catch(e){if(!cancelled){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else {setError('진행 상태를 확인하지 못했어요. 연결되면 다시 확인할게요.');setRow({...row});}}}
  },5000);
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
  },5000);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[row,payWatching]);
 if(row?.consultation?.spirit||row?.consultation?.questionSky)return <section className={styles.reader}>
  {row.paid&&row.state!=='REFUNDED'&&<FishReceipt product={row.product}/>}
  <SpiritResult row={row}/>
  {row.state==='COMPLETED'&&<ResultSharing key={row.id} row={row}/>}
  {row.state==='REFUNDED'?<p>환불된 상담이에요. 결제 내역에서 처리 상태를 확인해 주세요.</p>:!row.paid?<><p>결제 확인이 필요해요. 이미 결제했다면 먼저 상태를 다시 확인해 주세요.</p>{payWatching&&<p role="status">결제가 확인되면 이 화면이 자동으로 바뀌어요.</p>}<button onClick={()=>window.location.reload()}>결제 상태 다시 확인하기</button><a href={checkoutPath(row)}>결제 내용 확인하기</a></>:row.state!=='COMPLETED'&&<>
    {row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?<><p role="alert">자동 복구가 멈췄어요. 저장된 내용은 유지돼요.</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>기존 상담 복구하기</button></>:row.errorCode==='GENERATION_REVIEW_REQUIRED'||row.errorCode==='PAYMENT_NOT_ACTIVE'?<p role="alert">상담 확인이 필요해요. 다시 결제하지 말고 주문번호와 함께 문의해 주세요.</p>:<p>서버에서 남은 이야기만 자동으로 이어가요. 창을 닫아도 내 상담 기록에서 확인할 수 있어요.</p>}
  </>}
  {error&&<><p role="alert">{error} 결제한 상담은 다시 결제하지 마세요.</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>상담 상태 다시 확인하기</button></>}<p className={styles.orderId}>상담 주문번호: {row.id}</p>
 </section>;
 return <section className={styles.reader}>
  <p className={styles.readerGreeting}><PawPrint size={19} aria-hidden="true"/> 영냥이가 차곡차곡 담은 이야기</p><h1>{row?`${row.product.name} · ${row.product.fishName}`:'상담 결과'}</h1>
  {row&&<ReadingIdentity product={row.product}/>}
  {row?.paid&&row.state!=='REFUNDED'&&<FishReceipt product={row.product}/>}
  {!row&&!error&&<ReadingLoading/>}
  {row&&<>
   {row.paid&&!['COMPLETED','REFUNDED'].includes(row.state)&&!['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'')&&<ReadingLoading product={row.product} stage={row.chapters.length===row.manifest.length?'verifying':'generating'} saved={row.chapters.length} total={row.manifest.length}/>}
   <section className={styles.questionContext} aria-label="이번 상담의 주제와 질문">
    <h2>{row.consultation?.kindLabel || row.consultation?.topicLabel || '이번 상담'}</h2>
    {row.consultation?.question?<p style={{whiteSpace:'pre-wrap'}}>{row.consultation.question}</p>:<p>선택한 상담의 계산 근거와 흐름을 살펴보는 기록이에요.</p>}
    {row.consultation?.asOf&&<p>상담 기준: {row.consultation.asOf} · {row.consultation.timezone || 'Asia/Seoul'}</p>}
    {row.consultation?.period&&<p>분석 범위: {row.consultation.period.label}. 시기 근거가 없는 부분은 실천·점검 기간으로 안내해요.</p>}
   </section>
   <div id="reading-progress" className={styles.progress}><img src="/assets/yeongnyangi/hero.webp" width={120} height={120} alt="상담을 준비하는 영냥이"/>
    <div><p>{row.state==='COMPLETED'?'네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.':`${row.chapters.length} / ${row.manifest.length}개 챕터 저장됨`}</p>
     <progress value={row.chapters.length+(row.state==='COMPLETED'?1:0)} max={row.manifest.length+1} aria-label="챕터 저장과 최종 확인 진행률"/>
     {row.paid&&row.state!=='REFUNDED'&&row.state!=='COMPLETED'&&(row.errorCode==='GENERATION_REVIEW_REQUIRED'?<p role="alert">상담을 완료하지 못해 확인이 필요해요. 다시 결제하지 말고 상담 기록의 주문번호와 함께 문의해 주세요.</p>:row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?<><p role="alert">자동 복구가 멈췄어요. 저장된 내용은 유지되며 추가 결제 없이 다시 시도할 수 있어요.</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{busy?'복구 요청 중':'기존 상담 복구하기'}</button></>:<p role="status">{row.chapters.length===row.manifest.length?'저장된 상담을 최종 확인하고 있어요.':'남은 상담은 서버에서 자동으로 이어지고 있어요. 창을 닫아도 내 상담 기록에서 다시 확인할 수 있어요.'}</p>)}
     {row.state==='REFUNDED'&&<p>환불된 상담이에요. 결제 내역에서 처리 상태를 확인해 주세요.</p>}
     {!row.paid&&row.state!=='REFUNDED'&&<><p>아직 확인된 결제가 없어요. 결제를 마쳤다면 먼저 결제 상태를 다시 확인해 주세요.</p>{payWatching&&<p role="status">결제가 확인되면 이 화면이 자동으로 바뀌어요.</p>}<button onClick={()=>window.location.reload()}>결제 상태 다시 확인하기</button><a className={styles.button} href={checkoutPath(row)}>결제 내용 확인하기</a></>}
    </div>
   </div>
   {row.state==='COMPLETED'&&<ResultSharing key={row.id} row={row}/>}
   <ReadingBook row={row}/>
  </>}
  {error&&!row&&requestId.current?<RecoveryNotice message={error} busy={busy} onRetry={()=>{setError('');setReload(n=>n+1);}}/>:error&&<p role="alert">{error} 결제가 확인된 상담은 다시 결제하지 마세요.</p>}
  {row?.paid&&!['COMPLETED','REFUNDED'].includes(row.state)&&!['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'')&&<button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{busy?'복구 요청 중':'상담 이어가기'}</button>}
  {row&&<p className={styles.orderId}>상담 주문번호: {row.id}</p>}
  <a href="/yeongnyangi/library/">내 상담 기록으로</a>
 </section>;
}
