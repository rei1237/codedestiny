"use client";
import {useEffect,useRef,useState} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,checkoutPath,type FortuneRecord} from '../_lib/api';
import ReadingBook from './ReadingBook';
import ReadingIdentity from './ReadingIdentity';
import SpiritResult from './SpiritResult';
import styles from '../yeongnyangi.module.css';
import {trackFortuneDelivery,trackFortuneView} from '@/lib/analytics';
import ReadingLoading from './ReadingLoading';
import ResultSharing from './ResultSharing';
export default function Result(){
 const [row,setRow]=useState<FortuneRecord|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),mounted=useRef(true);
 useEffect(()=>{if(row){trackFortuneDelivery(row);trackFortuneView(row,new URLSearchParams(window.location.search).get('source')||'direct');}},[row]);
 async function generate(id:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/generate`,{});
    if(mounted.current)setRow(fortune);
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else if(mounted.current)setError(e instanceof Error?e.message:'상담을 이어가지 못했어요.');}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{
  mounted.current=true;
  const id=new URLSearchParams(window.location.search).get('id')||'';
  if(!/^[a-f0-9]{64}$/.test(id)){setError('상담을 찾지 못했어요. 내 상담 기록에서 다시 선택해 주세요.');return;}
  (async()=>{
   try{
    let {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}`);
    if(!fortune.paid){
     try{fortune=(await fortuneApi<{fortune:FortuneRecord}>(`requests/${id}/activate`,{})).fortune;}
     catch(e){if(!(e instanceof FortuneApiError&&e.status===402))throw e;}
    }
    if(mounted.current){
     setRow(fortune);
    }
   }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else if(mounted.current)setError(e instanceof Error?e.message:'상담을 찾지 못했어요.');}
  })();
  return ()=>{mounted.current=false;};
 },[]);
 useEffect(()=>{
  if(!row?.paid || ['COMPLETED','REFUNDED'].includes(row.state) || ['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode || ''))return;
  let cancelled=false;
  const timer=setTimeout(async()=>{
   try{
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);
    if(!cancelled){setRow(fortune);setError('');}
   }catch(e){if(!cancelled){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else {setError('진행 상태를 확인하지 못했어요. 연결되면 다시 확인할게요.');setRow({...row});}}}
  },5000);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[row]);
 if(row?.consultation?.spirit||row?.consultation?.questionSky)return <section className={styles.reader}>
  <SpiritResult row={row}/>
  {row.state==='REFUNDED'?<p>환불된 상담이에요. 결제 내역에서 처리 상태를 확인해 주세요.</p>:!row.paid?<><p>결제 확인이 필요해요. 이미 결제했다면 먼저 상태를 다시 확인해 주세요.</p><button onClick={()=>window.location.reload()}>결제 상태 다시 확인하기</button><a href={checkoutPath(row)}>결제 내용 확인하기</a></>:row.state!=='COMPLETED'&&<>
    {row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?<><p role="alert">자동 복구가 멈췄어요. 저장된 내용은 유지돼요.</p><button disabled={busy} onClick={()=>void generate(row.id)}>기존 상담 복구하기</button></>:row.errorCode==='GENERATION_REVIEW_REQUIRED'||row.errorCode==='PAYMENT_NOT_ACTIVE'?<p role="alert">상담 확인이 필요해요. 다시 결제하지 말고 주문번호와 함께 문의해 주세요.</p>:<p>서버에서 남은 이야기만 자동으로 이어가요. 창을 닫아도 내 상담 기록에서 확인할 수 있어요.</p>}
  </>}
  {error&&<p role="alert">{error} 결제한 상담은 다시 결제하지 마세요.</p>}<p className={styles.orderId}>상담 주문번호: {row.id}</p>
 </section>;
 return <section className={styles.reader}>
  <p className={styles.eyebrow}>영냥이의 상담 두루마리</p><h1>{row?`${row.product.name} · ${row.product.fishName}`:'상담 결과'}</h1>
  {row&&<ReadingIdentity product={row.product}/>}
  {!row&&!error&&<ReadingLoading/>}
  {row&&<>
   {row.paid&&!['COMPLETED','REFUNDED'].includes(row.state)&&!['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'')&&<ReadingLoading product={row.product} stage={row.chapters.length===row.manifest.length?'verifying':'generating'} saved={row.chapters.length} total={row.manifest.length}/>}
   <section className={styles.questionContext} aria-label="이번 상담의 주제와 질문">
    <h2>{row.consultation?.topicLabel || '이번 상담'}</h2>
    {row.consultation?.question?<p style={{whiteSpace:'pre-wrap'}}>{row.consultation.question}</p>:<p>입력한 질문 없이 선택한 주제의 흐름을 살펴보는 상담이에요.</p>}
    {row.consultation?.asOf&&<p>상담 기준: {row.consultation.asOf} · {row.consultation.timezone || 'Asia/Seoul'}</p>}
    {row.consultation?.period&&<p>분석 범위: {row.consultation.period.label}. 시기 근거가 없는 부분은 실천·점검 기간으로 안내해요.</p>}
   </section>
   <div id="reading-progress" className={styles.progress}><img src="/assets/yeongnyangi/hero.webp" width={120} height={120} alt="상담을 준비하는 영냥이"/>
    <div><p>{row.state==='COMPLETED'?'네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.':`${row.chapters.length} / ${row.manifest.length}개 챕터 저장됨`}</p>
     <progress value={row.chapters.length+(row.state==='COMPLETED'?1:0)} max={row.manifest.length+1} aria-label="챕터 저장과 최종 확인 진행률"/>
     {row.paid&&row.state!=='REFUNDED'&&row.state!=='COMPLETED'&&(row.errorCode==='GENERATION_REVIEW_REQUIRED'?<p role="alert">상담을 완료하지 못해 확인이 필요해요. 다시 결제하지 말고 상담 기록의 주문번호와 함께 문의해 주세요.</p>:row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?<><p role="alert">자동 복구가 멈췄어요. 저장된 내용은 유지되며 추가 결제 없이 다시 시도할 수 있어요.</p><button disabled={busy} onClick={()=>void generate(row.id)}>{busy?'복구 요청 중':'기존 상담 복구하기'}</button></>:<p role="status">{row.chapters.length===row.manifest.length?'저장된 상담을 최종 확인하고 있어요.':'남은 상담은 서버에서 자동으로 이어지고 있어요. 창을 닫아도 내 상담 기록에서 다시 확인할 수 있어요.'}</p>)}
     {row.state==='REFUNDED'&&<p>환불된 상담이에요. 결제 내역에서 처리 상태를 확인해 주세요.</p>}
     {!row.paid&&row.state!=='REFUNDED'&&<><p>아직 확인된 결제가 없어요. 결제를 마쳤다면 먼저 결제 상태를 다시 확인해 주세요.</p><button onClick={()=>window.location.reload()}>결제 상태 다시 확인하기</button><a className={styles.button} href={checkoutPath(row)}>결제 내용 확인하기</a></>}
    </div>
   </div>
   {row.state==='COMPLETED'&&<ResultSharing key={row.id} row={row}/>}
   <ReadingBook row={row}/>
  </>}
  {error&&<p role="alert">{error} 결제가 확인된 상담은 다시 결제하지 마세요.</p>}
  {row&&<p className={styles.orderId}>상담 주문번호: {row.id}</p>}
  <a href="/yeongnyangi/library/">내 상담 기록으로</a>
 </section>;
}
