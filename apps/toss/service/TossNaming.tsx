import {useCallback,useEffect,useRef,useState} from 'react';
import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import NamingAiClient,{type NamingDraft} from '@/app/naming-ai/NamingAiClient';
import NamingAiResultClient,{type NamingNativeRead} from '@/app/naming-ai/result/NamingAiResultClient';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import {api,purchase,nativeSaleProducts,paymentRequiresReview} from '../src/platform';
import TossTeaPrice from './TossTeaPrice';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';

const feature='premium-naming-prompt';
const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
const GuestProfile=()=>null;
const read:NamingNativeRead=async(id,advance)=>{
  const data=await api<Awaited<ReturnType<NamingNativeRead>>['data']>('/native/naming/results/'+encodeURIComponent(id),advance?{}:undefined);
  return {status:data.result?.status==='completed'||data.result?.saved?200:202,data};
};
type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId?:string};
export default function TossNaming(){
  useAuthStore();const owner=ownerId();
  if(location.pathname.includes('/result'))return <NamingAiResultClient key={owner} nativeRead={read}/>;
  return <Form key={owner} owner={owner}/>;
}
function Form({owner}:{owner:string}){
  const draftKey='toss:naming-form:'+owner;
  const [handoff]=useState(()=>new URLSearchParams(location.search).get('restoreNaming'));
  const [initialDraft]=useState<NamingDraft|undefined>(()=>{
    try{
      const transfer=JSON.parse(localStorage.getItem('toss:naming-login')||'null');
      const carried=owner&&handoff&&handoff===transfer?.token&&transfer.expires>Date.now()?transfer.value:null;
      const draft=JSON.parse(carried||(owner?localStorage:sessionStorage).getItem(draftKey)||'null');
      if(draft?.form?.engine&&typeof draft.form.birthDate==='string'&&[0,1,2].includes(draft.step))return draft;
    }catch{/* Draft storage is optional. */}
  });
  const saveDraft=useCallback((draft:NamingDraft)=>{
    try{(owner?localStorage:sessionStorage).setItem(draftKey,JSON.stringify(draft));}catch{/* Draft storage is optional. */}
  },[owner,draftKey]);
  useEffect(()=>{
    try{
      const transfer=JSON.parse(localStorage.getItem('toss:naming-login')||'null');
      if(transfer&&(transfer.expires<=Date.now()||owner&&handoff===transfer.token))localStorage.removeItem('toss:naming-login');
    }catch{/* Optional storage. */}
  },[owner,handoff]);
  const [price,setPrice]=useState<TossTeaPriceSelection|null>(null),lock=useRef(false),alive=useRef(true),cancel=useRef<()=>void>();
  const orderId=new URLSearchParams(location.search).get('orderId');
  const current=()=>alive.current&&ownerId()===owner;
  useEffect(()=>{alive.current=true;const leave=()=>{alive.current=false;cancel.current?.();};const resume=()=>{alive.current=true;lock.current=false;};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);return()=>{leave();window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);};},[]);
  const ready=Boolean(owner&&(orderId||price&&price.owner===owner&&!paymentRequiresReview()));
  async function start(input:Record<string,unknown>){
    if(!ready||lock.current||!current())return;
    lock.current=true;
    try{
      const key='toss:naming-attempt:'+owner;
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input)))),x=>x.toString(16).padStart(2,'0')).join('');
      const saved=JSON.parse(localStorage.getItem(key)||'{}');
      const requestId=saved.digest===digest&&typeof saved.id==='string'?saved.id:'naming-'+crypto.randomUUID();
      localStorage.setItem(key,JSON.stringify({digest,id:requestId}));
      const intent=await api<Intent>('/native/naming/prepare',{input:{requestId,input},...(orderId?{orderId}:{})});
      if(!current())return;
      if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('PURCHASE_RUN_MISMATCH');
      if(!intent.paid){
        const item=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
        if(!current())return;
        if(!item||!price||price.sku!==item.sku||item.displayAmount!==price.displayAmount)throw Error('PRODUCT_PRICE_CHANGED');
        await new Promise<void>((done,fail)=>{cancel.current=purchase(item,intent.id,done,fail);});
      }
      if(!current())return;
      const checked=await api<Intent>('/native/naming/intents/'+intent.id);
      if(!current())return;
      if(!checked.paid||checked.id!==intent.id)throw Error('PURCHASE_RUN_MISMATCH');
      localStorage.removeItem(key);localStorage.removeItem(draftKey);location.replace('/naming-ai/result/?intentId='+intent.id);
    }finally{if(current())lock.current=false;}
  }
  const login='/login/?next='+encodeURIComponent(location.pathname+location.search);
  const carryGuestDraft=(link:HTMLAnchorElement)=>{
    try{
      const value=sessionStorage.getItem(draftKey);if(!value)return;
      const token=crypto.randomUUID();
      localStorage.setItem('toss:naming-login',JSON.stringify({token,value,expires:Date.now()+15*60_000}));
      const next=new URL(location.href);next.searchParams.set('restoreNaming',token);
      link.href='/login/?next='+encodeURIComponent(next.pathname+next.search);
    }catch{/* Login remains available if storage is unavailable. */}
  };
  return <NamingAiClient native={{ready,start,initialDraft,saveDraft,label:orderId?'구매한 작명첩 이어서 열기':'토스로 작명첩 열기',
    ProfilePicker:owner?TossAstrologyProfilePicker:GuestProfile,
    price:owner?(orderId?'구매한 작명첩':<TossTeaPrice featureKey={feature} onPrice={setPrice}/>):<a href={login} onClick={e=>carryGuestDraft(e.currentTarget)}>토스로 로그인하기</a>}}/>;
}
