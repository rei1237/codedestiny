import {useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {api,getTossSessionRevision,onTossSessionRevisionChanged,restoreSession} from './platform';
import {ownsReviewReceipt} from './review-scope.mjs';

type PurchasePage={purchases:{status:string;state:string;href?:string;serviceId:string;orderId:string}[];nextCursor:string|null};

export default function ReviewReceipt({href,children}:{href:string;children:ReactNode}){
  const revision=useSyncExternalStore(onTossSessionRevisionChanged,getTossSessionRevision,getTossSessionRevision);
  const [ready,setReady]=useState(false),[verified,setVerified]=useState<{revision:number;owned:boolean}|null>(null);
  useEffect(()=>{
    // Some original recovery screens change service or remove the order ID with
    // History instead of following a link. Run that new URL through the entry gate.
    const {history,location}=window;
    const push=history.pushState,replace=history.replaceState;
    const guard=(method:History['pushState'],replacePage:boolean):History['pushState']=>function(data,title,target){
      if(target!=null){
        const next=new URL(target,location.href);
        if(next.origin===location.origin && next.pathname+next.search!==href){
          if(replacePage)location.replace(next.href);else location.assign(next.href);
          return;
        }
      }
      method.call(history,data,title,target);
    };
    history.pushState=guard(push,false);history.replaceState=guard(replace,true);
    const onBack=()=>{if(location.pathname+location.search!==href)location.reload();};
    window.addEventListener('popstate',onBack);
    return ()=>{history.pushState=push;history.replaceState=replace;window.removeEventListener('popstate',onBack);};
  },[href]);
  useEffect(()=>{
    let live=true;
    restoreSession().then(ok=>{if(live)setReady(ok);}).catch(()=>{if(live)setReady(false);});
    return ()=>{live=false;};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    let live=true;
    const readPage=(cursor:string|null)=>api<PurchasePage>(cursor?'/library?cursor='+encodeURIComponent(cursor):'/library');
    ownsReviewReceipt(href,readPage).then(owned=>{
      if(live&&revision===getTossSessionRevision())setVerified({revision,owned});
    }).catch(()=>{if(live&&revision===getTossSessionRevision())setVerified({revision,owned:false});});
    return ()=>{live=false;};
  },[href,ready,revision]);
  const show=verified?.owned&&verified.revision===revision;
  return <>{!show&&<main><h1>구매 기록 확인</h1><p>이 결과를 다시 보려면 같은 토스 계정의 구매 기록을 확인해 주세요.</p><a href="/library">기록 보관함 열기</a> · <a href="/recovery">구매 복구</a></main>}
    {show&&children}</>;
}
