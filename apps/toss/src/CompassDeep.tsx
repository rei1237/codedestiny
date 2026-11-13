import {useEffect,useRef,useState} from 'react';
import {CompassSavedChapters} from '../../../app/destiny-compass/_components/SavedCompassReport';
import {compassReportPayload} from '../../../app/destiny-compass/_lib/report-payload';
import type {CompassInput,DirectionField} from '../../../app/destiny-compass/_engine/types';
import {api,nativeSaleProducts,paymentRequiresReview,type NativeSaleProduct} from './platform';
import {checkoutNativeInput} from './checkoutNativeInput';
import {Button} from './Button';
import MansionPdf from './MansionPdf';

const feature='destiny-compass-deep-report',title='운명의 나침반 심층 리포트';
type Chapter={key:string;order:number;title:string;body:string};
type Report={status:string;retryable?:boolean;sections:Chapter[];progress?:{completed:number;total:number}};
export function CompassDelivery({id}:{id:string}){
  const [data,setData]=useState<Report|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;setBusy(true);setError('');
    async function resume(){
      try {
        const path='/native/compass/results/'+id;
        let next=await api<Report>(path);
        for(let i=0;live;i++){
          setData(next);
          if(['completed','generation_failed'].includes(next.status)||next.retryable===false||document.hidden||!navigator.onLine||i>=24)break;
          if(i)await new Promise(r=>setTimeout(r,500));
          if(!live)break;
          next=await api<Report>(path,{});
        }
      }catch{if(live)setError('저장 상태를 다시 확인해 주세요. 같은 주문으로 이어서 열 수 있어요.');}
      finally{if(live)setBusy(false);}
    }
    void resume();return()=>{live=false;};
  },[id,retry]);
  return <section><h1>{title}</h1><p role="status">{data?.progress?.completed||0} / {data?.progress?.total||10}개 장 저장</p>
    {error&&<p role="alert">{error}</p>}{data?.status==='generation_failed'?<p>구매 기록에서 생성 상태를 확인해 주세요.</p>:data?.status!=='completed'&&<Button disabled={busy} onClick={()=>setRetry(n=>n+1)}>같은 주문 이어서 열기</Button>}
    {Boolean(data?.sections?.length)&&<CompassSavedChapters title="리포트 목차" sections={data!.sections}/>}
    {data?.status==='completed'&&<MansionPdf selector="[data-saved-compass-chapter]" options={{fileName:title+'.pdf',backgroundColor:'#12102c',cover:{title}}}/>}
    <a href="/library">꿀꿀운세 구매 기록</a></section>;
}
export function CompassPurchase({input,field,question,owner,onLogin}:{input:CompassInput;field:DirectionField;question:string;owner:string;onLogin:()=>void}){
  const [sale,setSale]=useState<NativeSaleProduct|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  const version=useRef(0),flight=useRef(false),cancel=useRef<()=>void>(()=>{});
  const orderId=new URLSearchParams(location.search).get('orderId')||'';
  useEffect(()=>()=>{version.current++;cancel.current();},[]);
  useEffect(()=>{
    if(owner==='guest')return;
    let live=true;setLoaded(false);setError('');
    nativeSaleProducts().then(items=>{if(live){setSale(items.find(r=>r.featureKey===feature)||null);setLoaded(true);}}).catch(()=>{if(live)setError('상품 정보를 확인하지 못했어요.');});
    return()=>{live=false;};
  },[owner,refresh]);
  async function start(){
    if(flight.current||(!orderId&&(!sale||paymentRequiresReview())))return;
    const epoch=version.current,isCurrent=()=>version.current===epoch;
    flight.current=true;setBusy(true);setError('');
    try{
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([field.seed,question,orderId])));
      const key='toss.compass.request.'+owner+'.'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const requestId=localStorage.getItem(key)||'compass-'+crypto.randomUUID();
      localStorage.setItem(key,requestId);
      const payload=compassReportPayload(input,field,question,requestId);
      const id=await checkoutNativeInput({service:'compass',feature,input:payload,orderId,sku:sale?.sku,isCurrent,onCancel:cleanup=>{cancel.current=cleanup;}});
      if(id&&isCurrent())location.replace('/destiny-compass?resultId='+encodeURIComponent(id));
    }catch{if(isCurrent())setError('시작 상태를 확인하지 못했어요. 구매 기록을 확인한 뒤 같은 질문으로 이어주세요.');}
    finally{if(isCurrent()){setBusy(false);flight.current=false;}}
  }
  return <section><h2>{title}</h2><p>다섯 체계의 근거와 선택의 흐름을 열 장으로 읽어요.</p>
    {owner==='guest'?<Button onClick={onLogin}>토스 로그인하고 심층 리포트 확인하기</Button>:orderId||sale?<Button disabled={busy||(!orderId&&paymentRequiresReview())} onClick={()=>void start()}>{orderId?'결제한 리포트 이어가기':'심층 리포트 열기 · '+sale!.displayAmount}</Button>:loaded?<p>토스 상품 등록을 기다리고 있어요.</p>:error?<Button onClick={()=>setRefresh(n=>n+1)}>상품 다시 확인하기</Button>:<p role="status">토스 상품을 확인하고 있어요.</p>}
    {error&&<p role="alert">{error}</p>}</section>;
}
