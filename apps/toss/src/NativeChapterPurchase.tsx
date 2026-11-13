import {useEffect,useRef,useState} from 'react';
import {nativeSaleProducts,paymentRequiresReview,type NativeSaleProduct} from './platform';
import {checkoutNativeInput} from './checkoutNativeInput';
import {Button} from './Button';

type Props={service:'compass'|'ziwei-deep';feature:string;prefix:string;route:string;owner:string;onLogin:()=>void;keyInput:unknown[];makePayload:(id:string)=>unknown;disabled?:boolean};
export default function NativeChapterPurchase({service,feature,prefix,route,owner,onLogin,keyInput,makePayload,disabled=false}:Props){
  const [sale,setSale]=useState<NativeSaleProduct|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  const version=useRef(0),flight=useRef(false),cancel=useRef<()=>void>(()=>{});
  const orderId=new URLSearchParams(location.search).get('orderId')||'';
  useEffect(()=>()=>{version.current++;cancel.current();},[]);
  useEffect(()=>{
    if(owner==='guest')return;
    let live=true;setLoaded(false);setError('');
    nativeSaleProducts().then(items=>{if(live){setSale(items.find(r=>r.featureKey===feature)||null);setLoaded(true);}}).catch(()=>{if(live)setError('상품 정보를 확인하지 못했어요.');});
    return()=>{live=false;};
  },[owner,feature,refresh]);
  async function start(){
    if(disabled||flight.current||(!orderId&&(!sale||paymentRequiresReview())))return;
    const epoch=version.current,isCurrent=()=>version.current===epoch;
    flight.current=true;setBusy(true);setError('');
    try{
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([...keyInput,orderId])));
      const key='toss.'+service+'.request.'+owner+'.'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const requestId=localStorage.getItem(key)||prefix+'-'+crypto.randomUUID();
      localStorage.setItem(key,requestId);
      const payload=makePayload(requestId);
      const id=await checkoutNativeInput({service,feature,input:payload,orderId,sku:sale?.sku,isCurrent,onCancel:cleanup=>{cancel.current=cleanup;}});
      if(id&&isCurrent())location.replace(route+'?resultId='+encodeURIComponent(id));
    }catch{if(isCurrent())setError('시작 상태를 확인하지 못했어요. 구매 기록을 확인한 뒤 같은 질문으로 이어주세요.');}
    finally{if(isCurrent()){setBusy(false);flight.current=false;}}
  }
  return <>
    {owner==='guest'?<Button onClick={onLogin}>토스 로그인하고 심층 리포트 확인하기</Button>:orderId||sale?<Button disabled={disabled||busy||(!orderId&&paymentRequiresReview())} onClick={()=>void start()}>{orderId?'결제한 리포트 이어가기':'심층 리포트 열기 · '+sale!.displayAmount}</Button>:loaded?<p>토스 상품 등록을 기다리고 있어요.</p>:error?<Button onClick={()=>setRefresh(n=>n+1)}>상품 다시 확인하기</Button>:<p role="status">토스 상품을 확인하고 있어요.</p>}
    {error&&<p role="alert">{error}</p>}</>;
}

