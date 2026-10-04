"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {PawPrint,RefreshCw} from 'lucide-react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,checkoutPath,type FortuneRecord} from '../_lib/api';
import {chromeCopy} from '../_lib/chrome-copy';
import {resolveCheckoutPolicyHrefs} from '@/app/checkout/checkout-copy';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import {readingLanguageNames} from '@/worker/yeongnyangi/fortune/reading-locale';
import {formatAskRange} from '@/worker/yeongnyangi/fortune/ask/period';
import ReadingBook from './ReadingBook';
import ReadingIdentity from './ReadingIdentity';
import SpiritResult from './SpiritResult';
import ReviewRewardBanner from '@/app/components/ReviewRewardBanner';
import {shouldInvitePaidReview} from '@/js/review-reward-copy.mjs';
import styles from '../yeongnyangi.module.css';
import {trackFortuneDelivery,trackFortuneView} from '@/lib/analytics';
import ReadingLoading from './ReadingLoading';
import ResultSharing from './ResultSharing';
import SummaryReportView from './SummaryReport';
import FishReceipt from './FishReceipt';
import {OrderReference} from './OrderRecovery';
import TarotDrawRitual,{tarotRitualCompleted} from './TarotDrawRitual';
import TarotCardPick from './tarot/TarotCardPick';
import TarotSpreadReveal,{spreadCards} from './tarot/TarotSpreadReveal';
import {useReadingLanguage} from '../_lib/use-reading-language';
import {localizedSystem,localizedTier,localizedKind} from '../_lib/consultation-locale-copy';
function RecoveryNotice({message,busy,onRetry,locale}:{message:string;busy:boolean;onRetry:()=>void;locale?:FortuneRecord['locale']}){
 const copy=resultStateCopy(locale);
 return <div className={styles.recoveryNotice}>
  <img src="/assets/yeongnyangi/original/signup.webp" width={116} height={116} alt={copy.retryAlt}/>
  <div><h2>{copy.retryTitle}</h2><p role="alert">{message}</p><p className={styles.recoveryHint}>{copy.retryHint}</p>
   <button className={styles.retryButton} disabled={busy} onClick={onRetry}><RefreshCw size={18} aria-hidden="true"/>{busy?copy.retryBusy:copy.retry}<PawPrint size={18} aria-hidden="true"/></button>
  </div>
 </div>;
}
function resultBridgeCopy(locale?:FortuneRecord['locale']){
 if(locale==='ko')return {
  title:'상담을 다 읽은 뒤, 이어갈 길',
  body:'영냥이가 펼친 이야기를 먼저 천천히 읽어보세요. 같은 질문을 더 구체적으로 묻고 싶을 때만, 실제 상담 구성 안에서 이어갈 수 있어요.',
  related:'관련 상담 1개 보기',
  garden:'연이의 정원으로 돌아가기',
 };
 if(locale==='ja')return {
  title:'読み終えたあとに進める道',
  body:'まずは今の鑑定をゆっくり読んでください。同じテーマをもう少し具体的に聞きたいときだけ、実際の鑑定メニューから続けられます。',
  related:'関連する鑑定を1件見る',
  garden:'ヨニの庭へ戻る',
 };
 return {
  title:'After you finish this reading',
  body:'Take your time with the result first. If you want to ask a more specific question on the same theme, you can continue through an actual Yeongnyangi reading option.',
  related:'View one related reading',
  garden:"Return to Yeoni's garden",
 };
}
function ResultBridge({row,locale}:{row:FortuneRecord;locale?:FortuneRecord['locale']}){
 const copy=resultBridgeCopy(locale);
 const domain=row.product.systems.length>1?'fusion':row.product.domain;
 const href=`/yeongnyangi/fortune/?domain=${encodeURIComponent(domain)}&lang=${encodeURIComponent(locale||'ko')}`;
 return <section className={styles.resultBridge} aria-labelledby="yn-result-bridge-title" data-cd-cross-sell="yeongnyangi_result_complete">
  <div>
   <h2 id="yn-result-bridge-title">{copy.title}</h2>
   <p>{copy.body}</p>
  </div>
  <nav aria-label={copy.title}>
   <a className={styles.button} href={href}>{copy.related}</a>
   <a href={`/ggulggul/?lang=${encodeURIComponent(locale||'ko')}`}>{copy.garden}</a>
  </nav>
 </section>;
}
const RESULT_POLL_MS=1500;
// 결제 확정(웹훅·PG 복귀)보다 먼저 열린 결과 화면이 새로고침 없이 넘어가도록 /activate 를 RESULT_POLL_MS 간격으로 다시 확인하는 상한(약 3분).
const PAY_CHECK_LIMIT=Math.ceil(180000/RESULT_POLL_MS);
// 멈춤·보류 주문은 서버(크론·운영자)가 이어서 완성한다. 창을 열어 둔 구매자도 새로고침 없이 넘어가도록 느리게 계속 확인한다.
const HELD_POLL_MS=30000;
function sameRequest(fortune:FortuneRecord,id:string){
 if(fortune.id!==id||(fortune.recovery?.requestId&&fortune.recovery.requestId!==id))throw new FortuneApiError('RECOVERY_ID_MISMATCH','원래 상담과 복구 응답이 일치하지 않아요. 다시 결제하지 말고 주문번호와 함께 문의해 주세요.',409,false);
 return fortune;
}
export default function Result(){
 const {siteLocale}=useReadingLanguage();
 const siteLanguage=useRef(siteLocale);siteLanguage.current=siteLocale;
 const [row,setRow]=useState<FortuneRecord|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),mounted=useRef(true);
 const [reload,setReload]=useState(0);
 const [ritualGate,setRitualGate]=useState<{id:string;done:boolean}|null>(null);
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
    // A v3 tarot order waiting for the buyer's card pick is not payable yet, so there is no payment to attach.
    if(!fortune.paid && fortune.state!=='REFUNDED' && fortune.state!=='AWAITING_DRAW'){
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
    setError(siteLanguage.current==='ko'&&e instanceof Error?e.message:resultStateCopy(siteLanguage.current).loadFailed);
    if(attempt<3 && (!(e instanceof FortuneApiError)||e.retryable))timer=setTimeout(()=>void load(attempt+1),Math.max(2000*2**attempt,e instanceof FortuneApiError?e.retryAfterSeconds*1000:0));
   }
  }
  void load();
  return ()=>{cancelled=true;mounted.current=false;if(timer)clearTimeout(timer);};
 },[reload]);
 useEffect(()=>{
  if(!row?.paid || ['COMPLETED','REFUNDED','AWAITING_FOLLOWUP'].includes(row.state) || row.errorCode==='PAYMENT_NOT_ACTIVE')return;
  const held=['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode || '');
  let cancelled=false;
  const timer=setTimeout(async()=>{
   try{
    const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}`);
    if(!cancelled){setRow(sameRequest(fortune,row.id));setError('');}
   }catch(e){if(!cancelled){if(e instanceof FortuneApiError&&e.status===401)loginForCurrentPage();else {setError(resultStateCopy(row.locale).pollFailed);setRow({...row});}}}
  },held?HELD_POLL_MS:RESULT_POLL_MS);
  return ()=>{cancelled=true;clearTimeout(timer);};
 },[row]);
 useEffect(()=>{
  if(!row || row.paid || row.state==='REFUNDED' || row.state==='AWAITING_DRAW' || !payWatching)return;
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
 const tarotChart=row?.charts?.find(chart=>chart.domain==='tarot');
 const ritualEligible=!!row?.paid&&row.state!=='REFUNDED'&&!!tarotChart;
 const spreadReveal=row?.tarotSpread?spreadCards(row.tarotSpread,tarotChart):undefined;
 const ritualRequestId=row?.id;
 useEffect(()=>{
  if(!ritualEligible||!ritualRequestId)return;
  setRitualGate({id:ritualRequestId,done:tarotRitualCompleted(ritualRequestId)});
 },[ritualEligible,ritualRequestId]);
 const finishRitual=useCallback(()=>{if(ritualRequestId)setRitualGate({id:ritualRequestId,done:true});},[ritualRequestId]);
 // 결제 전에는 챕터가 하나도 없다 — "0 / N개 챕터 저장됨"·진행률·목차("준비 중")를 그리면 결제가 끝난 화면처럼 보인다.
 const locale=row?.locale||siteLocale;
 const copy=readingCopy(locale);
 const stateCopy=resultStateCopy(locale);
 const consultationLabel=row&&locale==='ko'?(row.consultation?.kindLabel||row.consultation?.topicLabel||stateCopy.consultation):row?.consultation?.consultationKind?localizedKind(row.consultation.consultationKind,locale):stateCopy.consultation;
 const periodLabel=row?.consultation?.period?(locale==='ko'?row.consultation.period.label+(row.consultation.period.ranges?.length?` (${row.consultation.period.ranges.map(formatAskRange).join(', ')})`:''):row.consultation.period.years?.map(value=>value.year).join('–')||[row.consultation.period.start,row.consultation.period.end].filter(Boolean).join('–')||stateCopy.periodHint):'';
 const needsSupport=!!row?.paid&&row.state!=='COMPLETED'&&row.state!=='REFUNDED'&&!row.recovery?.canRetryNow&&['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'');
 const supportLink=needsSupport?<p><a href={resolveCheckoutPolicyHrefs(row?.locale||'ko').support}>{locale==='ko'?'주문번호로 상담 문의하기':chromeCopy(locale).contact}</a></p>:null;
  const askReading=!!row?.consultation?.questions?.length;
 const unpaid=!!row&&!row.paid&&row.state!=='REFUNDED';
 if(row?.consultation?.spirit||row?.consultation?.questionSky)return <section className={styles.reader}>
  {row.paid&&row.state!=='REFUNDED'&&<FishReceipt product={row.product}/>}
  <SpiritResult row={row} onRow={setRow}/>
  {row.state==='COMPLETED'&&<>{shouldInvitePaidReview(row)&&<ReviewRewardBanner afterResult brand="yeongnyangi" locale={row.locale||'ko'}/>}<ResultBridge row={row} locale={row.locale}/><ResultSharing key={row.id} row={row}/></>}
  {row.state==='REFUNDED'?<p>{stateCopy.refunded}</p>:!row.paid?<><p>{stateCopy.paymentRequired}</p>{payWatching&&<p role="status">{stateCopy.paymentWaiting}</p>}<button onClick={()=>window.location.reload()}>{stateCopy.checkPayment}</button>{!error&&<a href={checkoutPath(row,siteLocale)}>{copy.checkout}</a>}</>:!['COMPLETED','AWAITING_FOLLOWUP'].includes(row.state)&&<>
    {row.recovery?.canRetryNow?<><p role="alert">{copy.recoveryStopped}</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{copy.recovery}</button></>:['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode||'')?<p role="status">{copy.held}</p>:row.errorCode==='PAYMENT_NOT_ACTIVE'?<p role="alert">{copy.support}</p>:<p>{stateCopy.serverResume}</p>}
  </>}
  {supportLink}
  {error&&<><p role="alert">{row.locale&&row.locale!=='ko'?stateCopy.loadFailed:error} {stateCopy.paidWarning}</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{stateCopy.retry}</button></>}<OrderReference id={row.id} locale={row.locale}/>
 </section>;
 return <section className={styles.reader} lang={locale}>
  <h1>{row?(locale==='ko'?`${row.product.name} · ${row.product.fishName}`:`${localizedSystem(row.product.readingKind==='single'?row.product.domain:'fusion',locale)} · ${localizedTier(row.product.fishId,locale)}`):stateCopy.result}</h1>
  {row&&row.state!=='COMPLETED'&&<OrderReference id={row.id} locale={row.locale}/>}

  {!row&&!error&&<ReadingLoading locale={siteLocale}/>}
  {row&&row.state==='AWAITING_DRAW'&&row.tarotSpread?<TarotCardPick row={row} spread={row.tarotSpread} siteLocale={siteLocale} onRow={setRow}/>:row&&<>
   {ritualEligible&&ritualGate?.id!==row.id?<ReadingLoading stage="generating" product={row.product} locale={row.locale}/>:ritualEligible&&!ritualGate?.done&&tarotChart?row.tarotSpread&&spreadReveal?<TarotSpreadReveal requestId={row.id} spread={row.tarotSpread} cards={spreadReveal} onComplete={finishRitual}/>:<TarotDrawRitual requestId={row.id} chart={tarotChart} locale={row.locale} onComplete={finishRitual}/>:<>
   {row.state!=='COMPLETED'&&<details className={styles.questionContext} open>
    <summary>{consultationLabel}</summary>
    {row.consultation?.question?<p style={{whiteSpace:'pre-wrap'}}>{row.consultation.question}</p>:<p>{stateCopy.context}</p>}
    {row.consultation?.relationship?.participants&&<p>{row.consultation.relationship.participants.self} · {row.consultation.relationship.participants.partner}</p>}
    {row.consultation?.asOf&&<p>{stateCopy.asOf}: {row.consultation.asOf} · {row.consultation.timezone || 'Asia/Seoul'}</p>}
    {row.consultation?.period&&<p>{stateCopy.period}: {periodLabel}. {stateCopy.periodHint}</p>}
   </details>}
   <div id="reading-progress" className={styles.progress} data-state={row.state}>{row.state!=='COMPLETED'&&<img src="/assets/yeongnyangi/hero.webp" width={120} height={120} alt=""/>}
     <div>{row.correction&&<p role="status">{row.correction.reason}</p>}{!unpaid&&<p>{row.state==='COMPLETED'?copy.complete:askReading?stateCopy.answering:stateCopy.saved(row.chapters.length,row.manifest.length)}</p>}
      {!unpaid&&<progress value={row.chapters.length+(row.state==='COMPLETED'?1:0)} max={row.manifest.length+1} aria-label={askReading?stateCopy.answerProgress:stateCopy.progress}/>}
     {row.paid&&row.state!=='REFUNDED'&&row.state!=='COMPLETED'&&(row.recovery?.canRetryNow?<><p role="alert">{stateCopy.recoveryStopped}</p><button className={styles.retryButton} disabled={busy} onClick={()=>void generate(row.id)}><PawPrint size={18} aria-hidden="true"/>{busy?stateCopy.recovering:copy.recovery}</button></>:['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode||'')?<p role="status">{stateCopy.reviewRequired}</p>:<p role="status">{row.errorCode==='PAYMENT_NOT_ACTIVE'?copy.support:row.chapters.length===row.manifest.length?copy.reviewing:copy.generating}</p>)}
     {row.state==='REFUNDED'&&<p>{stateCopy.refunded}</p>}
     {!row.paid&&row.state!=='REFUNDED'&&<><p>{stateCopy.unpaid}</p>{payWatching&&<p role="status">{stateCopy.paymentWaiting}</p>}<button onClick={()=>window.location.reload()}>{stateCopy.checkPayment}</button>{!error&&<a className={styles.button} href={checkoutPath(row,siteLocale)}>{copy.checkout}</a>}</>}
    </div>
   </div>
   {supportLink}
   {!unpaid&&<ReadingBook row={row}/>}
   {row.state==='COMPLETED'&&<SummaryReportView row={row}/>}
   {row.state==='COMPLETED'&&<>{shouldInvitePaidReview(row)&&<ReviewRewardBanner afterResult brand="yeongnyangi" locale={row.locale||'ko'}/>}<ResultBridge row={row} locale={row.locale}/><ResultSharing key={row.id} row={row}/><OrderReference id={row.id} locale={row.locale}/>{row.consultation&&<details className={styles.questionContext}><summary>{consultationLabel}</summary>{row.consultation.question&&<p style={{whiteSpace:'pre-wrap'}}>{row.consultation.question}</p>}{row.consultation.relationship?.participants&&<p>{row.consultation.relationship.participants.self} · {row.consultation.relationship.participants.partner}</p>}{row.consultation.asOf&&<p>{stateCopy.asOf}: {row.consultation.asOf} · {row.consultation.timezone||'Asia/Seoul'}</p>}{row.consultation.period&&<p>{stateCopy.period}: {periodLabel}. {stateCopy.periodHint}</p>}</details>}</>}
   {row.paid&&row.state!=='REFUNDED'&&<><ReadingIdentity product={row.product} locale={row.locale}/><FishReceipt product={row.product} locale={row.locale}/></>}
   </>}
  </>}
  {error&&!row&&requestId.current?<RecoveryNotice message={locale==='ko'?error:stateCopy.loadFailed} locale={locale} busy={busy} onRetry={()=>{setError('');setReload(n=>n+1);}}/>:error&&<p role="alert">{locale==='ko'?error:requestId.current?stateCopy.loadFailed:stateCopy.notFound} {stateCopy.paidWarningKnown}</p>}
  {row&&<p>{copy.language}: {readingLanguageNames[row.locale || 'ko']}</p>}
  {!row&&requestId.current&&<OrderReference id={requestId.current} locale={siteLocale}/>}
  <a href={'/yeongnyangi/library/?lang='+siteLocale}>{copy.library}</a>
 </section>;
}
