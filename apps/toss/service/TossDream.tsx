import {useEffect,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {api,nativeSaleProducts,paymentRequiresReview,purchase} from '../src/platform';
import TossTeaPrice from './TossTeaPrice';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import styles from '@/app/heukwol/heukwol.module.css';

const feature='dream-psycho-analysis';
const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId?:string};
type Reading={status:string;saved?:boolean;retryable?:boolean;retryAfterMs?:number;completedParts?:string[];totalParts?:number;record?:{markdown:string};dreamText?:string};
type Draft={requestId:string;dreamText:string};
function readDraft(key:string):Draft{
  try{const d=JSON.parse(localStorage.getItem(key)||'null');if(typeof d?.dreamText==='string'&&typeof d.requestId==='string')return d;}catch{/* Optional storage. */}
  return {requestId:'',dreamText:''};
}
export default function TossDream(){
  const auth=useAuthStore(),owner=ownerId();
  if(!auth.isAuthenticated||!owner)return <main className={styles.page}><section className={styles.form}><h1>정신분석 해몽</h1><p>꿈에 남은 장면과 감정을 다섯 장의 해석으로 읽어요.</p><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></section></main>;
  return <DreamRoom key={owner} owner={owner}/>;
}
function DreamRoom({owner}:{owner:string}){
  const key='toss:dream:'+owner,params=new URLSearchParams(location.search),id=params.get('intentId'),orderId=params.get('orderId');
  const [draft,setDraft]=useState(()=>readDraft(key)),[price,setPrice]=useState<TossTeaPriceSelection|null>(null);
  const [state,setState]=useState<Reading|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const alive=useRef(true),locked=useRef(false),cancel=useRef<()=>void>();
  const current=()=>alive.current&&owner===ownerId();
  const save=(next:Draft)=>{setDraft(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Draft storage is optional. */}};
  useEffect(()=>{
    alive.current=true;
    const leave=()=>{alive.current=false;cancel.current?.();};
    const resume=()=>{if(ownerId()===owner){if(!alive.current){alive.current=true;locked.current=false;setBusy(false);}setRetry(x=>x+1);}};
    window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);
    return()=>{leave();window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);};
  },[owner]);
  useEffect(()=>{
    if(!id)return;
    let live=true;
    const active=()=>live&&current();
    const run=async()=>{
      setBusy(true);setError('');
      try{
        const path='/native/dream/results/'+encodeURIComponent(id);
        let result=await api<Reading>(path);
        while(active()){
          setState(result);
          if(result.saved||result.retryable===false||document.hidden||!navigator.onLine)break;
          await new Promise(resolve=>setTimeout(resolve,Math.min(30000,Math.max(result.retryAfterMs||1000,1000))));
          if(!active()||document.hidden||!navigator.onLine)break;
          result=await api<Reading>(path,{});
        }
      }catch{if(active()){setState(null);setError('구매한 계정과 네트워크 연결을 확인한 뒤 다시 열어 주세요.');}}
      finally{if(active())setBusy(false);}
    };
    void run();return()=>{live=false;};
  },[id,retry,owner]);
  async function start(){
    if(locked.current||!current()||(!orderId&&(!price||price.owner!==owner||paymentRequiresReview())))return;
    locked.current=true;setBusy(true);setError('');
    const input={dreamText:draft.dreamText.trim(),requestId:draft.requestId||'dream-'+crypto.randomUUID()};save(input);
    try{
      const intent=await api<Intent>('/native/dream/prepare',{input,...(orderId?{orderId}:{})});
      if(!current())return;
      if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
      if(!intent.paid){
        const item=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
        if(!current())return;
        if(!item||item.sku!==price?.sku||item.displayAmount!==price.displayAmount)throw Error('PRICE_CHANGED');
        await new Promise<void>((done,fail)=>{cancel.current=purchase(item,intent.id,done,fail);});
      }
      if(!current())return;
      const checked=await api<Intent>('/native/dream/intents/'+intent.id);
      if(!current())return;
      if(checked.id!==intent.id||!checked.paid)throw Error('ORDER_MISMATCH');
      try{localStorage.removeItem(key);}catch{/* Optional storage. */}
      location.replace('/dream/psycho/?intentId='+encodeURIComponent(intent.id));
    }catch{if(current())setError('상담을 시작하지 못했어요. 구매 기록을 확인한 뒤 다시 시도해 주세요.');}
    finally{if(current()){locked.current=false;setBusy(false);}}
  }
  return <main className={styles.page}><section className={styles.form}><h1>정신분석 해몽</h1>
    {id?state?.saved&&state.record?<article><h2>꿈의 분석 기록</h2><p>{state.dreamText}</p>{state.record.markdown.split(/\n\s*\n/).map((p,i)=>p.startsWith('### ')?<h4 key={i}>{p.slice(4)}</h4>:p.startsWith('## ')?<h3 key={i}>{p.slice(3)}</h3>:<p key={i}>{p}</p>)}</article>:<><p role="status">{state?.retryable===false?'구매한 상담의 처리 상태를 확인해 주세요.':state?.totalParts?(state.completedParts?.length||0)+' / '+state.totalParts+'부분 저장':'저장된 꿈 상담을 확인하고 있어요.'}</p><button disabled={busy} onClick={()=>setRetry(x=>x+1)}>저장한 꿈 상담 이어서 열기</button></>:<>
      <label>기억나는 꿈의 장면<textarea maxLength={6000} value={draft.dreamText} disabled={busy} onChange={e=>save({dreamText:e.target.value,requestId:''})}/></label>
      <p>장소와 사람, 깨어난 뒤 남은 감정을 8~6,000자로 적어 주세요.</p>
      {!orderId&&<p>토스 단건 결제 · <TossTeaPrice featureKey={feature} onPrice={setPrice}/></p>}
      <button className={styles.primary} disabled={busy||draft.dreamText.trim().length<8||(!orderId&&(!price||paymentRequiresReview()))} onClick={start}>{orderId?'구매한 꿈 상담 이어가기':'꿈 상담 시작하기'}</button>
    </>}{error&&<p role="alert">{error}</p>}<a href="/records/">꿀꿀운세 구매 기록</a></section></main>;
}
