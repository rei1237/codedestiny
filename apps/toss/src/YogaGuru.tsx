import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api,nativeSaleProducts,paymentRequiresReview,type NativeSaleProduct} from './platform';
import {checkoutNativeInput} from './checkoutNativeInput';
import {Button} from './Button';
import TossSessionScope from './TossSessionScope';
import reader from 'virtual:toss-yoga-reader';

const feature='yoga-guru-per-use';
type Draft={mood:string;duration:number;requestId:string};
type Course={status:string;saved?:boolean;retryable?:boolean;reviewRequired?:boolean;retryAfterMs?:number;course_metadata?:{title:string};sequence?:unknown[]};
function load(key:string):Draft{
  try{const d=JSON.parse(localStorage.getItem(key)||'null');if(typeof d?.mood==='string'&&[0,30,60].includes(d.duration))return d;}catch{/* Optional draft storage. */}
  return {mood:'',duration:0,requestId:''};
}
function CourseReader({course,storageKey}:{course:Course;storageKey:string}){
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{
    function receive(e:MessageEvent){
      if(e.source!==frame.current?.contentWindow||e.origin!=='null')return;
      if(e.data?.type==='yoga-new')location.assign('/yoga-guru');
      if(e.data?.type==='yoga-step'&&Number.isInteger(e.data.step)&&e.data.step>=0&&e.data.step<(course.sequence?.length||0)){
        try{localStorage.setItem(storageKey,String(e.data.step));}catch{/* Optional reading position. */}
      }
    }
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[course,storageKey]);
  function show(){
    let step=0;
    try{step=Number(localStorage.getItem(storageKey));}catch{/* Optional reading position. */}
    frame.current?.contentWindow?.postMessage({type:'yoga-course',course,step},'*');
  }
  return <iframe ref={frame} sandbox="allow-scripts" srcDoc={reader} title="단계별 수련 지도" onLoad={show} style={{border:0,width:'100%',height:'80svh',borderRadius:12}}/>;
}
function Delivery({owner,id}:{owner:string;id:string}){
  const [course,setCourse]=useState<Course|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let live=true;setBusy(true);setError('');
    async function read(){
      const path='/native/yoga/results/'+id;
      try{
        let data=await api<Course>(path);
        for(let i=0;live;i++){
          setCourse(data);
          if(data.status==='completed'||data.retryable===false||data.reviewRequired||i>=3||document.hidden||!navigator.onLine)break;
          if(i>0)await new Promise(resolve=>setTimeout(resolve,Math.min(5000,data.retryAfterMs||1000)));
          if(!live)break;
          data=await api<Course>(path,{});
        }
      }catch{if(live)setError('저장한 코스를 확인하지 못했어요. 연결 후 같은 코스를 다시 열어 주세요.');}
      finally{if(live)setBusy(false);}
    }
    void read();return()=>{live=false;};
  },[id,attempt]);
  if(course?.saved&&course.status==='completed'&&course.course_metadata&&course.sequence)return <CourseReader course={course} storageKey={'toss.yoga.step.'+owner+'.'+id}/>;
  return <section><p role="status">{course?.reviewRequired?'코스 작성 상태를 확인해야 해요. 구매 기록에서 문의해 주세요.':'구매한 수련 코스를 준비하고 있어요.'}</p>{error&&<p role="alert">{error}</p>}
    <Button disabled={busy} onClick={()=>setAttempt(n=>n+1)}>같은 코스 다시 열기</Button></section>;
}
function Intake({owner}:{owner:string}){
  const key='toss.yoga.intake.'+owner;
  const [draft,setDraft]=useState(()=>load(key));
  const [sale,setSale]=useState<NativeSaleProduct|null>(null),[catalog,setCatalog]=useState<'loading'|'ready'|'error'>('loading'),[refresh,setRefresh]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const epoch=useRef(0),flight=useRef(false),cancel=useRef<()=>void>(()=>{});
  const orderId=new URLSearchParams(location.search).get('orderId')||'';
  useEffect(()=>()=>{epoch.current++;cancel.current();},[]);
  useEffect(()=>{let live=true;setCatalog('loading');nativeSaleProducts().then(items=>{if(live){setSale(items.find(row=>row.featureKey===feature)||null);setCatalog('ready');}}).catch(()=>{if(live)setCatalog('error');});return()=>{live=false;};},[refresh]);
  function save(value:Draft){setDraft(value);try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Optional persistence. */}}
  async function start(e:FormEvent){
    e.preventDefault();if(!draft.mood.trim()||!draft.duration||flight.current||(!orderId&&(!sale||paymentRequiresReview())))return;
    const version=epoch.current,isCurrent=()=>version===epoch.current;
    flight.current=true;setBusy(true);setError('');
    try{
      const requestId=draft.requestId||'yoga-'+crypto.randomUUID();save({...draft,requestId});
      const input={mood:draft.mood.trim(),duration:draft.duration,requestId};
      const intentId=await checkoutNativeInput({service:'yoga',feature,input,orderId,sku:sale?.sku,isCurrent,onCancel:cleanup=>{cancel.current=cleanup;}});
      if(!intentId||!isCurrent())return;
      try{localStorage.removeItem(key);}catch{/* Optional persistence. */}
      location.replace('/yoga-guru?resultId='+encodeURIComponent(intentId));
    }catch{if(isCurrent())setError('코스를 시작하지 못했어요. 구매 기록을 확인한 뒤 같은 입력으로 다시 시도해 주세요.');}
    finally{if(isCurrent()){flight.current=false;setBusy(false);}}
  }
  return <form className="form" onSubmit={start}><label>오늘의 몸과 마음<textarea rows={4} required value={draft.mood} maxLength={7500} disabled={busy} onChange={e=>save({...draft,mood:e.target.value,requestId:''})} placeholder="몸의 느낌과 오늘 수련에서 바라는 점을 알려주세요."/></label>
    <fieldset disabled={busy}><legend>수련 시간</legend>{([30,60] as const).map(n=><label key={n}><input type="radio" name="duration" checked={draft.duration===n} required onChange={()=>save({...draft,duration:n,requestId:''})}/>{n}분 · {n===30?'가네샤의 깨어남':'시바의 변형'}</label>)}</fieldset>
    {!orderId&&(catalog==='loading'?<p role="status">토스 상품을 확인하고 있어요.</p>:catalog==='error'?<Button type="button" onClick={()=>setRefresh(n=>n+1)}>상품 다시 확인하기</Button>:!sale?<p>토스 상품 등록을 기다리고 있어요.</p>:<p>토스 단건 결제 · {sale.displayAmount}</p>)}
    {(orderId||sale)&&<Button type="submit" disabled={busy||(!orderId&&paymentRequiresReview())}>{orderId?'결제한 코스 이어가기':'나의 수련 코스 만들기'}</Button>}
    {error&&<p role="alert">{error}</p>}</form>;
}
function Account(){
  const id=new URLSearchParams(location.search).get('resultId');
  const [owner,setOwner]=useState(''),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let live=true;setError(false);api<{user:{id:string}}>('/canonical/auth/me').then(r=>{if(!r.user?.id)throw Error();if(live)setOwner(r.user.id);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[attempt]);
  return owner?<>{id?<Delivery id={id} owner={owner}/>:<Intake owner={owner}/>}<a href="/library">꿀꿀운세 구매 기록</a></>:error?<Button onClick={()=>setAttempt(n=>n+1)}>계정 다시 확인하기</Button>:<p role="status">계정을 확인하고 있어요.</p>;
}
export default function YogaGuru({loggedIn,onLogin}:{loggedIn:boolean;onLogin:()=>void}){
  return <section><h1>디비야 요가</h1><p>지금의 몸과 마음에 맞춘 자세와 호흡, 명상을 한 코스로 따라가요.</p>{loggedIn?<TossSessionScope><Account/></TossSessionScope>:<Button onClick={onLogin}>토스 로그인하고 수련 입력하기</Button>}</section>;
}
