import {useEffect,useRef,useState} from 'react';
import {getAuthState} from '@/app/_lib/auth-store';
import {api,nativeSaleProducts,paymentRequiresReview,purchase} from '../src/platform';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';

const ownerId=()=>{const u=getAuthState().user;return String(u?.id||u?.userId||u?._id||u?.uid||'');};
type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId?:string};
export type NarrativeState={status:string;saved?:boolean;retryable?:boolean;retryAfterMs?:number;completedParts?:string[];totalParts?:number};
export function useNarrativeRoom<D,R extends NarrativeState>({owner,service,feature,key,path,initial,build}:{owner:string;service:string;feature:string;key:string;path:string;initial:()=>D;build:(d:D)=>D}){
  const params=new URLSearchParams(location.search),id=params.get('intentId'),orderId=params.get('orderId');
  const [draft,setDraft]=useState(initial),[price,setPrice]=useState<TossTeaPriceSelection|null>(null);
  const [state,setState]=useState<R|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const alive=useRef(true),locked=useRef(false),cancel=useRef<()=>void>();
  const current=()=>alive.current&&owner===ownerId();
  const save=(next:D)=>{setDraft(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{/* Draft storage is optional. */}};
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
        const path='/native/'+service+'/results/'+encodeURIComponent(id);
        let result=await api<R>(path);
        while(active()){
          setState(result);
          if(result.saved||result.retryable===false||document.hidden||!navigator.onLine)break;
          await new Promise(resolve=>setTimeout(resolve,Math.min(30000,Math.max(result.retryAfterMs||1000,1000))));
          if(!active()||document.hidden||!navigator.onLine)break;
          result=await api<R>(path,{});
        }
      }catch{if(active()){setState(null);setError('구매한 계정과 네트워크 연결을 확인한 뒤 다시 열어 주세요.');}}
      finally{if(active())setBusy(false);}
    };
    void run();return()=>{live=false;};
  },[id,retry,owner]);
  async function start(){
    if(locked.current||!current()||(!orderId&&(!price||price.featureKey!==feature||price.owner!==owner||paymentRequiresReview())))return;
    locked.current=true;setBusy(true);setError('');
    try{
      const input=build(draft);save(input);
      const intent=await api<Intent>('/native/'+service+'/prepare',{input,...(orderId?{orderId}:{})});
      if(!current())return;
      if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
      if(!intent.paid){
        const item=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
        if(!current())return;
        if(!item||item.sku!==price?.sku||item.displayAmount!==price.displayAmount)throw Error('PRICE_CHANGED');
        await new Promise<void>((done,fail)=>{cancel.current=purchase(item,intent.id,done,fail);});
      }
      if(!current())return;
      const checked=await api<Intent>('/native/'+service+'/intents/'+intent.id);
      if(!current())return;
      if(checked.id!==intent.id||!checked.paid)throw Error('ORDER_MISMATCH');
      try{localStorage.removeItem(key);}catch{/* Optional storage. */}
      location.replace(path+'?intentId='+encodeURIComponent(intent.id));
    }catch{if(current())setError('상담을 시작하지 못했어요. 구매 기록을 확인한 뒤 다시 시도해 주세요.');}
    finally{if(current()){locked.current=false;setBusy(false);}}
  }
  return {id,orderId,draft,price,setPrice,state,busy,error,save,start,retry:()=>setRetry(x=>x+1)};
}
