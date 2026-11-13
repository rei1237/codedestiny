import {useEffect,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import {calculateNatalSaju} from '../../../lib/korean-calendar/natal.js';
import {buildSajuCompatBody} from '../../../js/saju-compat-flow.mjs';
import {renderSajuCompat} from '../../../js/saju-compat-render.mjs';
import {compatibilityFacts} from 'virtual:saju-compat-basis';
import {BirthFields,birthPayload,emptyBirth} from '../src/BirthFields';
import {api,purchase,nativeSaleProducts,paymentRequiresReview} from '../src/platform';
import {Button} from '../src/Button';
import TossTeaPrice from './TossTeaPrice';
import './saju-compat.css';

const feature='compat-saju-compatibility',page='/saju/compatibility/';
const ownerId=()=>String(getAuthState().user?.id||'');
const empty=()=>({self:emptyBirth(),partner:emptyBirth(),type:'love',name:''});
function pillars(side){
 const city=birthPayload(side).location;
 // The legacy facts require four pillars. Its noon reference is explicitly tagged as unknown in each side of the request.
 const {pillars:p}=calculateNatalSaju({birthDate:side.date,calendarType:side.calendar,birthTime:side.unknown?'12:00':side.time,birthPlace:{timezone:city.tz,longitude:city.lng,latitude:city.lat}});
 return [p.year,p.month,p.day,p.hour];
}
function draftKey(owner){return 'toss:compat:form:'+owner;}
function readDraft(owner){
 try{
  const url=new URL(location.href),carry=url.searchParams.get('restoreCompat');
  const guest=owner&&carry&&/^[a-f0-9-]{36}$/.test(carry)&&localStorage.getItem('toss:compat:handoff')===carry;
  const source=localStorage.getItem(draftKey(guest?'guest':owner||'guest'));
  return source?{...empty(),...JSON.parse(source)}:empty();
 }catch{return empty();}
}
function Report({id,owner}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true,timer;
  const current=()=>active&&ownerId()===owner;
  async function read(advance){
   try{
    const value=await api('/native/saju-compat/results/'+id,advance?{}:undefined);
    if(!current())return;
    if(value.saved&&value.status==='completed'){
      const html=renderSajuCompat(value);if(!html)throw Error('INVALID_RESULT');
      setData({html});return;
    }
    if(value.retryable===false)throw Error('DELIVERY_REVIEW_REQUIRED');
    setData({status:value.status||'generating',count:value.completedParts?.length||0});
    timer=setTimeout(()=>read(true),1300);
   }catch{if(current())setError('저장된 궁합을 열지 못했어요. 같은 주문으로 다시 확인해 주세요.');}
  }
  if(owner)void read(false);
  return ()=>{active=false;clearTimeout(timer);};
 },[id,owner,retry]);
 return <section className="toss-compat"><h1>두 사람의 사주 궁합</h1>{error?<><p role="alert">{error}</p><Button onClick={()=>{setError('');setRetry(n=>n+1);}}>같은 주문으로 다시 확인</Button></>:data?.html?<article dangerouslySetInnerHTML={{__html:data.html}}/>:<p role="status">두 사람의 명식을 읽고 있어요. {data?.count?data.count+'개 항목을 저장했어요.':''}</p>}
  <a href="/records/">꿀꿀운세 구매 기록</a></section>;
}
export default function TossSajuCompat(){
 useAuthStore();const owner=ownerId(),id=new URLSearchParams(location.search).get('intentId');
 if(id)return <Report key={owner+id} id={id} owner={owner}/>;
 return <Form key={owner} owner={owner}/>;
}
function Form({owner}){
 const [input,setInput]=useState(()=>readDraft(owner)),[price,setPrice]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=useRef(true),locked=useRef(false),cancel=useRef(null),orderId=new URLSearchParams(location.search).get('orderId');
 const current=()=>active.current&&ownerId()===owner;
 useEffect(()=>{active.current=true;const leave=()=>{active.current=false;cancel.current?.();};window.addEventListener('pagehide',leave);
   return ()=>{leave();window.removeEventListener('pagehide',leave);};},[]);
 useEffect(()=>{
  try{localStorage.setItem(draftKey(owner||'guest'),JSON.stringify(input));
    const url=new URL(location.href),carry=url.searchParams.get('restoreCompat');
    if(owner&&carry&&carry===localStorage.getItem('toss:compat:handoff')){localStorage.removeItem('toss:compat:handoff');localStorage.removeItem(draftKey('guest'));url.searchParams.delete('restoreCompat');history.replaceState(history.state,'',url);}
  }catch{/* Device storage is optional until checkout. */}
 },[input,owner]);
 async function start(event){
  event.preventDefault();if(locked.current||!owner)return;
  locked.current=true;setBusy(true);setError('');
  try{
   const basis=compatibilityFacts(pillars(input.self),pillars(input.partner),input.type,input.name||'상대');
   const key='toss:compat:request:'+owner;
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input)))),b=>b.toString(16).padStart(2,'0')).join('');
   const previous=JSON.parse(localStorage.getItem(key)||'null');
   const requestId=previous?.hash===hash?previous.requestId:'compat-'+crypto.randomUUID();
   localStorage.setItem(key,JSON.stringify({hash,requestId}));
   const body=buildSajuCompatBody({...basis,selfTimeUnknown:input.self.unknown,partnerTimeUnknown:input.partner.unknown,compatType:input.type,partnerName:input.name,requestId});
   const intent=await api('/native/saju-compat/prepare',{input:body,...(orderId?{orderId}:{})});
   if(!current())return;
   if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
   if(!intent.paid){
    const item=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
    if(!current())return;
    if(!item||!price||price.sku!==item.sku||item.displayAmount!==price.displayAmount||paymentRequiresReview())throw Error('PRICE_UNAVAILABLE');
    await new Promise((done,fail)=>{cancel.current=purchase(item,intent.id,done,fail);});
   }
   if(!current())return;
   const checked=await api('/native/saju-compat/intents/'+intent.id);
   if(!current())return;
   if(!checked.paid||checked.id!==intent.id)throw Error('ORDER_MISMATCH');
   localStorage.removeItem(draftKey(owner));
   location.replace(page+'?intentId='+encodeURIComponent(intent.id));
  }catch{if(current())setError('입력과 연결 상태를 확인하고 다시 시도해 주세요. 구매한 궁합은 구매 기록에서 이어볼 수 있어요.');}
  finally{if(current()){locked.current=false;setBusy(false);}}
 }
 return <section className="toss-compat"><img alt="" src="/images/compat-story/saju-compat-entry.webp" width="640" height="360"/><h1>두 사람의 사주 궁합</h1><p>두 명식의 조화와 차이, 관계를 돌보는 방법과 전생 인연을 읽어요.</p>
 <form className="form" onSubmit={start}>
 <BirthFields title="나의 출생정보" value={input.self} onChange={self=>setInput({...input,self})} showGender={false} disabled={busy}/>
 <label>상대의 이름이나 호칭<input maxLength={20} value={input.name} onChange={e=>setInput({...input,name:e.target.value})}/></label>
 <BirthFields title="상대의 출생정보" value={input.partner} onChange={partner=>setInput({...input,partner})} showGender={false} disabled={busy}/>
 <label>관계 유형<select value={input.type} onChange={e=>setInput({...input,type:e.target.value})}><option value="love">연인</option><option value="business">사업·동료</option><option value="friend">친구</option></select></label>
 {owner?(orderId?<p>구매한 사주 궁합</p>:<TossTeaPrice featureKey={feature} onPrice={setPrice}/>):<a href={'/login/?next='+encodeURIComponent(page)} onClick={e=>{
   const token=crypto.randomUUID();localStorage.setItem('toss:compat:handoff',token);e.currentTarget.href='/login/?next='+encodeURIComponent(page+'?restoreCompat='+token);
 }}>토스로 로그인하기</a>}
 {owner&&(orderId||price?.owner===owner&&!paymentRequiresReview())&&<Button type="submit" disabled={busy}>{orderId?'구매한 궁합 이어서 열기':'토스로 궁합 열기'}</Button>}
 {error&&<p role="alert">{error}</p>}</form></section>;
}
