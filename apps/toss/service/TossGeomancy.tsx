import {useEffect,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {api,nativeSaleProducts,paymentRequiresReview,purchase} from '../src/platform';
import TossTeaPrice from './TossTeaPrice';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import styles from '@/app/heukwol/heukwol.module.css';

const feature='geomancy';
const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId?:string};
const sections=[['answer','질문과 세 형상의 종합 해석'],['keyJudgement','핵심 판단'],['energyFlow','현재 흐름'],['risk','주의점과 선택'],['timing','시기별 실천 계획'],['actionTip','현실적인 행동'],['advice','마지막 조언']] as const;
type Reading=Partial<Record<(typeof sections)[number][0],string>>&{status:string;saved?:boolean;retryable?:boolean;retryAfterMs?:number;completedParts?:string[];totalParts?:number;question?:string};
type Draft={requestId:string;question:string;theme:'alchemist'|'sultan';counts:number[]};
function readDraft(key:string):Draft{
  try{const d=JSON.parse(localStorage.getItem(key)||'null');if(typeof d?.question==='string'&&['alchemist','sultan'].includes(d.theme)&&Array.isArray(d.counts)&&typeof d.requestId==='string')return d;}catch{/* Optional storage. */}
  return {requestId:'',question:'',theme:'alchemist',counts:[]};
}
export default function TossGeomancy(){
  const auth=useAuthStore(),owner=ownerId();
  if(!auth.isAuthenticated||!owner)return <main className={styles.page}><section className={styles.form}><h1>지오맨시 흙점</h1><p>질문과 열여섯 줄의 점으로 방패 차트를 만들고 두 증인과 재판관의 형상을 읽어요.</p><a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></section></main>;
  return <GeomancyRoom key={owner} owner={owner}/>;
}
function GeomancyRoom({owner}:{owner:string}){
  const key='toss:geomancy:'+owner,params=new URLSearchParams(location.search),id=params.get('intentId'),orderId=params.get('orderId');
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
        const path='/native/geomancy/results/'+encodeURIComponent(id);
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
    const input={question:draft.question.trim(),theme:draft.theme,counts:draft.counts.length===16?draft.counts:Array.from({length:16},()=>8+Math.floor(Math.random()*22)),requestId:draft.requestId||'geomancy-'+crypto.randomUUID()};save(input);
    try{
      const intent=await api<Intent>('/native/geomancy/prepare',{input,...(orderId?{orderId}:{})});
      if(!current())return;
      if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
      if(!intent.paid){
        const item=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
        if(!current())return;
        if(!item||item.sku!==price?.sku||item.displayAmount!==price.displayAmount)throw Error('PRICE_CHANGED');
        await new Promise<void>((done,fail)=>{cancel.current=purchase(item,intent.id,done,fail);});
      }
      if(!current())return;
      const checked=await api<Intent>('/native/geomancy/intents/'+intent.id);
      if(!current())return;
      if(checked.id!==intent.id||!checked.paid)throw Error('ORDER_MISMATCH');
      try{localStorage.removeItem(key);}catch{/* Optional storage. */}
      location.replace('/geomancy/?intentId='+encodeURIComponent(intent.id));
    }catch{if(current())setError('상담을 시작하지 못했어요. 구매 기록을 확인한 뒤 다시 시도해 주세요.');}
    finally{if(current()){locked.current=false;setBusy(false);}}
  }
  return <main className={styles.page}><section className={styles.form}><h1>지오맨시 흙점</h1>
    {id?state?.saved?<article><h2>방패 차트의 신탁</h2><p>{state.question}</p>{sections.map(([field,title])=><section key={field}><h3>{title}</h3><p>{state[field]}</p></section>)}</article>:<><p role="status">{state?.retryable===false?'구매한 상담의 처리 상태를 확인해 주세요.':state?.totalParts?(state.completedParts?.length||0)+' / '+state.totalParts+'부분 저장':'저장된 흙점 상담을 확인하고 있어요.'}</p><button disabled={busy} onClick={()=>setRetry(x=>x+1)}>저장한 흙점 상담 이어서 열기</button></>:<>
      <label>신탁의 방<select value={draft.theme} disabled={busy} onChange={e=>save({...draft,theme:e.target.value==='sultan'?'sultan':'alchemist',requestId:'',counts:[]})}><option value="alchemist">연금술사의 방</option><option value="sultan">술탄의 궁전</option></select></label>
      <label>신탁에 묻고 싶은 질문<textarea maxLength={500} value={draft.question} disabled={busy} onChange={e=>save({...draft,question:e.target.value,requestId:'',counts:[]})}/></label>
      <p>열여섯 줄의 흙점을 펼쳐 질문의 원인과 흐름, 지금 할 수 있는 일을 읽어요.</p>
      {!orderId&&<p>토스 단건 결제 · <TossTeaPrice featureKey={feature} onPrice={setPrice}/></p>}
      <button className={styles.primary} disabled={busy||draft.question.trim().length<2||(!orderId&&(!price||paymentRequiresReview()))} onClick={start}>{orderId?'구매한 흙점 상담 이어가기':'흙점 상담 시작하기'}</button>
    </>}{error&&<p role="alert">{error}</p>}<a href="/records/">꿀꿀운세 구매 기록</a></section></main>;
}
