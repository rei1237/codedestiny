import {useEffect,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {profileKey,useProfiles} from '@/app/yeongnyangi/_lib/use-profiles';
import ProfileForm from '@/app/yeongnyangi/_components/ProfileForm';
import HeukwolResult from '@/app/heukwol/HeukwolResult';
import type {HeukwolState} from '@/app/heukwol/types';
import styles from '@/app/heukwol/heukwol.module.css';
import {api,nativeSaleProducts,purchase,paymentRequiresReview} from '../src/platform';
import TossTeaPrice from './TossTeaPrice';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';

const feature='heukwol-warning-consultation';
const account=()=>{const user=getAuthState().user;return String(user?.id||user?.userId||user?._id||user?.uid||'');};
type Input={profileId:string;year:number;question:string;requestId:string};
type Intent={id:string;orderId:string|null;sku:string;amountKRW:number;paid:boolean};
function readDraft(key:string):Partial<Input>{
  try{return JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch{return {};}
}
export default function TossHeukwol(){
  const auth=useAuthStore(),owner=account();
  if(!auth.isAuthenticated||!owner)return <section className={styles.form}><h1>흑월의 경고</h1><p>저장한 출생정보로 사주와 자미두수의 흐름을 함께 살펴봐요.</p><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></section>;
  return <Reading key={owner} owner={owner}/>;
}
function Reading({owner}:{owner:string}){
  const profiles=useProfiles({requireVerified:true});
  const firstYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
  const key='toss:heukwol:'+owner,params=new URLSearchParams(location.search),orderId=params.get('orderId');
  const [draft,setDraft]=useState(()=>readDraft(key)),[adding,setAdding]=useState(false);
  const [price,setPrice]=useState<TossTeaPriceSelection|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const resultId=params.get('result')||'';
  const [state,setState]=useState<HeukwolState|null>(null);
  const [retry,setRetry]=useState(0),alive=useRef(true),flight=useRef(false),cancel=useRef<()=>void>();
  const question=draft.question||'',year=draft.year||firstYear;
  const current=()=>alive.current&&account()===owner;
  const save=(value:Partial<Input>)=>{setDraft(value);try{sessionStorage.setItem(key,JSON.stringify(value));}catch{/* Optional draft storage. */}};
  useEffect(()=>{alive.current=true;const leave=()=>{alive.current=false;cancel.current?.();};const resume=()=>{if(account()===owner){if(!alive.current){alive.current=true;flight.current=false;setBusy(false);}setRetry(n=>n+1);}};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);return()=>{leave();window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);};},[]);
  useEffect(()=>{
    if(!resultId)return;
    let active=true;
    const valid=()=>active&&current();
    async function read(){
      setBusy(true);setMessage('');
      try{
        const path='/native/heukwol/results/'+encodeURIComponent(resultId);
        let next=await api<HeukwolState>(path);
        while(valid()){
          setState(next);
          if(next.status!=='generating'||document.hidden||!navigator.onLine)break;
          await new Promise(resolve=>setTimeout(resolve,1200));
          if(!valid()||document.hidden||!navigator.onLine)break;
          next=await api<HeukwolState>(path,{});
        }
      }catch{if(valid()){setState(null);setMessage('저장된 상담을 확인하지 못했어요. 구매한 계정과 연결 상태를 확인해 주세요.');}}
      finally{if(valid())setBusy(false);}
    }
    void read();return()=>{active=false;};
  },[resultId,retry,owner]);
  async function start(){
    if(flight.current||!profiles.profileId||(!orderId&&(!price||price.owner!==owner||paymentRequiresReview())))return;
    flight.current=true;setBusy(true);setMessage('');
    try{
      const profileId=profiles.profileId;
      const input={profileId,year,question:question.trim(),requestId:draft.profileId===profileId&&draft.requestId?draft.requestId:'heukwol-'+crypto.randomUUID()};
      save(input);
      const intent=await api<Intent>('/native/heukwol/prepare',{input,...(orderId?{orderId}:{})});
      if(!current())return;
      if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
      if(!intent.paid){
        const sale=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
        if(!current())return;
        if(!sale||!price||price.sku!==sale.sku||price.displayAmount!==sale.displayAmount)throw Error('PRICE_CHANGED');
        await new Promise<void>((resolve,reject)=>{cancel.current=purchase(sale,intent.id,resolve,reject);});
      }
      if(!current())return;
      const owned=await api<Intent>('/native/heukwol/intents/'+intent.id);
      if(!current())return;
      if(!owned.paid||owned.id!==intent.id)throw Error('ORDER_MISMATCH');
      const href='/heukwol/?result='+encodeURIComponent(intent.id);
      try{sessionStorage.removeItem(key);}catch{/* Optional storage. */}
      location.replace(href);
    }catch(e){if(current())setMessage((e as Error).message==='BIRTH_TIME_REQUIRED'?'출생 시각과 성별이 기록된 프로필을 선택해 주세요.':'상담을 준비하지 못했어요. 구매 기록을 먼저 확인한 뒤 다시 시도해 주세요.');}
    finally{if(current()){flight.current=false;setBusy(false);}}
  }
  if(state?.report)return <main className={styles.page}><HeukwolResult report={state.report} isCurrent={current}/></main>;
  return <main className={styles.page}><section className={styles.form}><h1>흑월의 경고</h1>
    {resultId?<><p role="status">{state?.status==='failed'?'상담 작성을 완료하지 못했어요. 구매 기록에서 처리 상태를 확인해 주세요.':state?state.completedChapters+' / '+state.totalChapters+'장 저장':'구매한 상담을 확인하고 있어요.'}</p>
      <button disabled={busy} onClick={()=>setRetry(n=>n+1)}>저장한 상담 이어서 확인하기</button></>:<>
      <p>사주와 자미두수의 월별 비교를 위해 출생 시각과 성별이 기록된 프로필을 골라 주세요.</p>
      <label>상담할 프로필<select value={profiles.profileId} disabled={busy||profiles.loading} onChange={e=>profiles.select(e.target.value)}><option value="">프로필 선택</option>{profiles.profiles.map(p=><option key={profileKey(p)} value={profileKey(p)}>{p.name}</option>)}</select></label>
      <button type="button" disabled={busy} onClick={()=>setAdding(!adding)}>{adding?'입력 닫기':'새 프로필 만들기'}</button>{adding&&<ProfileForm locale="ko" surface="paper" onSaved={p=>{profiles.saved(p);setAdding(false);}}/>}
      <label>살펴볼 연도<select value={year} disabled={busy} onChange={e=>save({...draft,year:Number(e.target.value),requestId:''})}>{Array.from({length:10},(_,i)=><option key={i}>{firstYear+i}</option>)}</select></label>
      <label>어떤 일을 겪었고, 무엇이 걱정되나요?<textarea value={question} disabled={busy} maxLength={3000} onChange={e=>save({...draft,question:e.target.value,requestId:''})}/></label>
      <p>12~3,000자 · 현재 {question.trim().length}자</p>
      {!orderId&&<p>토스 단건 결제 · <TossTeaPrice featureKey={feature} onPrice={setPrice}/></p>}
      <button className={styles.primary} disabled={busy||(!orderId&&(!price||paymentRequiresReview()))||!profiles.profileId||question.trim().length<12} onClick={start}>{orderId?'결제한 상담 이어가기':'상담 시작하기'}</button></>}
    {message&&<p role="alert">{message}</p>}<a href="/records/">꿀꿀운세 구매 기록</a></section></main>;
}
