import {useEffect,useRef,useState,type FormEvent} from 'react';
import {checkoutNativeInput} from './checkoutNativeInput';
import MansionPdf from './MansionPdf';
import {useNakshatraCopy} from '../../../app/nakshatra/_lib/copy';
import styles from './MansionConsultation.module.css';
import AiConsultDecks,{type Decks,type NatalIdentity} from '../../../app/nakshatra/ai/AiConsultDecks';
import MansionProfile from './MansionProfile';
import {PersonFields,birth,emptyPerson,type Person} from './MansionBirth';
import {api,nativeSaleProducts,paymentRequiresReview,type NativeSaleProduct} from './platform';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';

const feature='nakshatra-ai-consultation';
type Draft={person:Person;question:string;requestId:string};
type State={status:string;question?:string;natal?:NatalIdentity;decks?:Decks;totalCharCount?:number;progress?:{completed:number;total:number}};
function load(key:string):Draft{
  try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&typeof d.person==='object'&&typeof d.question==='string')return d;}catch{/* Device storage is optional. */}
  return {person:emptyPerson(),question:'',requestId:''};
}
function Delivery({id}:{id:string}){
  const copy=useNakshatraCopy();
  const [state,setState]=useState<State|null>(null),[message,setMessage]=useState(''),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let live=true;setBusy(true);setMessage('');
    async function read(){
      try{
        const path='/native/nakshatra/results/'+id;
        let next=await api<State>(path);
        for(let wave=0;live;wave++){
          setState(next);
          if(next.status==='completed'||next.status==='generation_failed'||wave>=10||document.hidden||!navigator.onLine)break;
          next=await api<State>(path,{});
        }
      }catch{if(live)setMessage('저장 상태를 확인하지 못했어요. 연결 후 같은 상담을 이어서 열어 주세요.');}
      finally{if(live)setBusy(false);}
    }
    void read();return()=>{live=false;};
  },[id,attempt]);
  if(state?.status==='completed'&&state.decks)return <><div className={styles.reader}><AiConsultDecks decks={state.decks} natal={state.natal||null} question={state.question} totalChars={state.totalCharCount}/></div><MansionPdf selector="[data-nakai-pdf-section]" options={{fileName:copy.aiPdfFileName(state.natal?.sukuyoKo||'',state.natal?.nakshatraKo||''),backgroundColor:'#0a0818',cover:{title:copy.aiFeatureTitle,subtitle:[state.natal?.sukuyoHan?state.natal.sukuyoHan+'宿':'',state.natal?.nakshatraKo].filter(Boolean).join(' · '),date:new Date().toISOString().slice(0,10)}}}/></>;
  return <section><h2>두 별 통합 상담</h2><p role="status">{state?.status==='generation_failed'?'상담 작성에 문제가 생겼어요. 구매 기록에서 처리 상태를 확인해 주세요.':state?.progress?state.progress.completed+' / '+state.progress.total+'장 저장':'구매한 상담을 확인하고 있어요.'}</p>
    {message&&<p role="alert">{message}</p>}<Button disabled={busy} onClick={()=>setAttempt(n=>n+1)}>같은 상담 이어서 열기</Button></section>;
}
function Intake({owner}:{owner:string}){
  const key='toss.nakshatra.ai.'+owner;
  const [draft,setDraft]=useState(()=>load(key));
  const [sale,setSale]=useState<NativeSaleProduct|null>(null),[catalog,setCatalog]=useState<'loading'|'ready'|'error'>('loading'),[refresh,setRefresh]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const epoch=useRef(0),flight=useRef(false),cancel=useRef<()=>void>(()=>{});
  const orderId=new URLSearchParams(location.search).get('orderId')||'';
  useEffect(()=>()=>{epoch.current++;cancel.current();},[]);
  useEffect(()=>{let live=true;setCatalog('loading');nativeSaleProducts().then(items=>{if(live){setSale(items.find(row=>row.featureKey===feature)||null);setCatalog('ready');}}).catch(()=>{if(live)setCatalog('error');});return()=>{live=false;};},[refresh]);
  function save(value:Draft){setDraft(value);try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Optional persistence. */}}
  async function start(e:FormEvent){
    e.preventDefault();if(flight.current||(!orderId&&(!sale||paymentRequiresReview())))return;
    const version=epoch.current,isCurrent=()=>version===epoch.current;
    flight.current=true;setBusy(true);setError('');
    try{
      const requestId=draft.requestId||'nakai-'+crypto.randomUUID();save({...draft,requestId});
      const input={birthInfo:birth(draft.person),question:draft.question.trim(),requestId};
      const intentId=await checkoutNativeInput({service:'nakshatra',feature,input,orderId,displayed:sale,isCurrent,onCancel:cleanup=>{cancel.current=cleanup;}});
      if(!intentId||!isCurrent())return;
      try{localStorage.removeItem(key);}catch{/* Optional persistence. */}
      location.replace('/nakshatra/ai?resultId='+encodeURIComponent(intentId));
    }catch{if(isCurrent())setError('상담을 시작하지 못했어요. 구매 기록을 확인한 뒤 같은 입력으로 다시 시도해 주세요.');}
    finally{if(isCurrent()){flight.current=false;setBusy(false);}}
  }
  return <form className="form" onSubmit={start}><p>달의 별자리와 일본 숙요를 함께 읽고, 질문에 대한 서로 다른 근거와 실천 방향을 살펴봐요.</p>
    <MansionProfile disabled={busy} onSelect={person=>save({...draft,person,requestId:''})}/>
    <PersonFields title="나의 출생 정보" disabled={busy} value={draft.person} onChange={person=>save({...draft,person,requestId:''})}/>
    <label>상담에서 묻고 싶은 질문 (선택)<textarea rows={4} maxLength={1200} value={draft.question} disabled={busy} onChange={e=>save({...draft,question:e.target.value,requestId:''})}/></label>
    {!orderId&&(catalog==='loading'?<p role="status">토스 상품을 확인하고 있어요.</p>:catalog==='error'?<Button type="button" onClick={()=>setRefresh(n=>n+1)}>상품 다시 확인하기</Button>:!sale?<p>토스 상품 등록을 기다리고 있어요.</p>:<p>토스 단건 결제 · {sale.displayAmount}</p>)}
    {(orderId||sale)&&<Button type="submit" disabled={busy||(!orderId&&paymentRequiresReview())}>{orderId?'결제한 상담 이어가기':'두 별 통합 상담 시작하기'}</Button>}
    {error&&<p role="alert">{error}</p>}</form>;
}
function Account(){
  const id=new URLSearchParams(location.search).get('resultId');
  const [owner,setOwner]=useState(''),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let live=true;setError(false);api<{user:{id:string}}>('/canonical/auth/me').then(r=>{if(!r.user?.id)throw Error();if(live)setOwner(r.user.id);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[attempt]);
  return owner?<>{id?<Delivery id={id}/>:<Intake owner={owner}/>}<a href="/library">꿀꿀운세 구매 기록</a></>:error?<Button onClick={()=>setAttempt(n=>n+1)}>계정 다시 확인하기</Button>:<p role="status">계정을 확인하고 있어요.</p>;
}
export default function MansionConsultation({loggedIn,onLogin}:{loggedIn:boolean;onLogin:()=>void}){
  return <section><h1>나크샤트라 개인 심화 상담</h1>{loggedIn?<TossSessionScope><Account/></TossSessionScope>:<Button onClick={onLogin}>토스 로그인하고 상담 입력하기</Button>}</section>;
}
