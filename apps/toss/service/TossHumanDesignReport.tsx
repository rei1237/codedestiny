import {useEffect,useMemo,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {buildHumanDesignReportPlan} from '@/lib/human-design/report-plan';
import ReportDownload from '@/app/human-design/report/_components/ReportDownload';
import {saveReportPdf} from '../src/media';
import ReportCover from '@/app/human-design/report/_components/ReportCover';
import ReportChapter from '@/app/human-design/report/_components/ReportChapter';
import type {ReportDocument,ReportPlan} from '@/app/human-design/report/_lib/types';
import styles from '@/app/human-design/report/report.module.css';
import chartStyles from '@/app/human-design/human-design.module.css';
import type {AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import TossTeaPrice from './TossTeaPrice';
import {checkoutReport} from './native-report-checkout';
import {api,paymentRequiresReview} from '../src/platform';

const feature='human-design-report';
const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
type Birth={birthDate:string;birthTime:string;timezone:string;calendar:string};
const empty:Birth={birthDate:'',birthTime:'',timezone:'Asia/Seoul',calendar:'solar'};
export default function TossHumanDesignReport(){
 const auth=useAuthStore(),owner=ownerId(),params=new URLSearchParams(location.search);
 if(!owner||!auth.isAuthenticated)return <main className={chartStyles.shell}><h1 className={chartStyles.blockHeading}>휴먼 디자인 프리미엄 리포트</h1><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></main>;
 return <main key={owner} className={chartStyles.shell}><h1 className={chartStyles.blockHeading}>휴먼 디자인 프리미엄 리포트</h1><p className={chartStyles.lede}>나의 차트를 바탕으로 기질, 결정 방식과 일상의 흐름을 18개 장으로 살펴봐요.</p>{params.has('intentId')?<Reader id={params.get('intentId')||''} owner={owner}/>:<Form owner={owner} orderId={params.get('orderId')}/>}<p><a href="/records/">꿀꿀운세 구매 기록</a> · <a href="/human-design/">내 바디그래프 살펴보기</a></p></main>;
}
function Form({owner,orderId}:{owner:string;orderId:string|null}){
 const key='toss:human-design-form:'+owner;
 const [birth,setBirth]=useState<Birth>(()=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&typeof value.birthDate==='string'&&typeof value.birthTime==='string'&&typeof value.timezone==='string'&&['solar','lunar','lunar-leap'].includes(value.calendar))return value;}catch{/* Optional draft. */}return empty;});
 const [price,setPrice]=useState<TossTeaPriceSelection|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),lock=useRef(false),cancel=useRef<()=>void>();
 const current=()=>alive.current&&ownerId()===owner;
 useEffect(()=>{alive.current=true;const leave=()=>{alive.current=false;cancel.current?.();};const resume=()=>{alive.current=true;lock.current=false;setBusy(false);};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);return()=>{leave();window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);};},[]);
 function change(next:Birth){setBirth(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Optional draft. */}}
 const select=(seed:AiPrefillSeed)=>change({birthDate:seed.birthDate||'',birthTime:seed.birthTime||'',timezone:seed.timezone||'',calendar:seed.calendarType==='lunar'?(seed.isLeapMonth?'lunar-leap':'lunar'):'solar'});
 const ready=Boolean(orderId||price?.featureKey===feature&&price.owner===owner&&!paymentRequiresReview());
 async function submit(event:React.FormEvent){event.preventDefault();if(!ready||lock.current||!current())return;lock.current=true;setBusy(true);setError('');
  try{const id=await checkoutReport({service:'human-design',feature,owner,input:{birth,locale:'ko'},orderId,price,current,onPurchase:cleanup=>{cancel.current=cleanup;}});if(id&&current()){localStorage.removeItem(key);location.replace('/human-design/report/?intentId='+id);}}
  catch{if(current())setError('상담을 시작하지 못했어요. 입력과 구매 기록을 확인해 주세요. 결제가 완료되었다면 같은 구매 기록에서 이어서 열어 주세요.');}
  finally{if(current()){lock.current=false;setBusy(false);}}
 }
 return <form onSubmit={submit} className={chartStyles.formFields}><fieldset disabled={busy} className={chartStyles.inner}><legend>리포트를 살펴볼 출생정보</legend><TossAstrologyProfilePicker inputId="human-design-report-profile" calendarMode="native-lunar" onSelect={select}/>
 <label className={chartStyles.label}>태어난 날짜<input className={chartStyles.input} type="date" required value={birth.birthDate} onChange={e=>change({...birth,birthDate:e.target.value})}/></label>
 <label className={chartStyles.label}>태어난 시각<input className={chartStyles.input} type="time" required value={birth.birthTime} onChange={e=>change({...birth,birthTime:e.target.value})}/></label>
 <label className={chartStyles.label}>출생지 타임존<input className={chartStyles.input} required maxLength={80} placeholder="예: Asia/Seoul" value={birth.timezone} onChange={e=>change({...birth,timezone:e.target.value})}/></label>
 <label className={chartStyles.label}>달력<select className={chartStyles.input} value={birth.calendar} onChange={e=>change({...birth,calendar:e.target.value})}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar-leap">음력 윤달</option></select></label></fieldset>
 {orderId?<p>구매한 회차를 이어서 열어요.</p>:<TossTeaPrice featureKey={feature} onPrice={setPrice}/>}
 {error&&<p role="alert">{error}</p>}<button className={chartStyles.cta} type="submit" disabled={busy||!ready}>{busy?'상담 준비 중':orderId?'구매한 리포트 이어서 열기':'리포트 시작하기'}</button></form>;
}
function Reader({id,owner}:{id:string;owner:string}){
 const [doc,setDoc]=useState<ReportDocument|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[terminal,setTerminal]=useState(false);
 const manualResume=useRef(false);
 useEffect(()=>{let live=true;const current=()=>live&&ownerId()===owner;const resume=()=>{if(current()&&!document.hidden)setRetry(n=>n+1);};window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
  async function run(){let advance=manualResume.current;manualResume.current=false;try{setError('');for(let waves=0;waves<40&&current()&&!document.hidden&&navigator.onLine;waves++){
   const next=await api<ReportDocument>('/native/human-design/results/'+encodeURIComponent(id),advance?{}:undefined);if(!current())return;
   if(!next||!['generating','delivery_pending','partial','completed','generation_failed'].includes(next.status)||!Array.isArray(next.sections))throw Error('INVALID_RESULT');
   setDoc(next);if(next.status==='completed'||next.status==='generation_failed'||next.status==='partial')return;
   await new Promise(resolve=>setTimeout(resolve,1200));advance=true;
  }}catch(error){if(current()){const ended=['GENERATION_ALREADY_FAILED','REPORT_UNDELIVERABLE','ORDER_REFUNDED','PAYMENT_REVOKED'].includes(String((error as {code?:string})?.code));setTerminal(ended);setError(ended?'이 리포트의 생성을 이어갈 수 없어요. 구매 기록에서 상담 상태를 확인해 주세요.':'저장된 리포트를 확인하지 못했어요. 같은 계정과 연결 상태를 확인한 뒤 이어서 열어 주세요.');}}}
  void run();return()=>{live=false;window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);};
 },[id,owner,retry]);
 const plan=useMemo(()=>doc?.chart&&doc.sections.length?buildHumanDesignReportPlan(doc,doc.chart) as ReportPlan:null,[doc]);
 return <>{error&&<p role="alert">{error}</p>}{doc?.status!=='completed'&&<section aria-live="polite"><p>{doc?.status==='generation_failed'?'생성을 완료하지 못했어요. 구매 기록에서 상담 상태를 확인해 주세요.':`${doc?.progress?.completed||0} / 18장 저장`}</p>{!terminal&&doc?.status!=='generation_failed'&&<button onClick={()=>{manualResume.current=true;setRetry(n=>n+1);}}>저장한 리포트 이어서 열기</button>}</section>}
 {plan&&doc?.chart&&<div className={styles.reader}><ReportCover cover={plan.cover} stats={plan.stats} locale="ko" bodyLocale={doc.locale}/>{doc.status==='completed'&&<ReportDownload plan={plan} chart={doc.chart} locale="ko" saveBase64={saveReportPdf}/>}<article className={styles.article}>{plan.chapters.map(chapter=><ReportChapter key={chapter.key} chapter={chapter} chart={doc.chart!} locale={doc.locale}/>)}</article></div>}</>;
}
