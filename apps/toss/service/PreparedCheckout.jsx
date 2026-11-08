import React,{useEffect,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {canonicalResponse} from '../src/platform';
import Checkout from './Checkout';
import {isReviewSale} from '../../../worker/toss/review-products.js';

export default function PreparedCheckout({reviewOnly=false}={}){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||''),requestId=new URLSearchParams(location.search).get('requestId'),scope=JSON.stringify([auth.isAuthenticated===true,owner,requestId]);
 const [record,setRecord]=useState(null),[error,setError]=useState(null),[attempt,setAttempt]=useState(0),[,setNavigation]=useState(0);
 useEffect(()=>{const changed=()=>setNavigation(value=>value+1);window.addEventListener('popstate',changed);return()=>window.removeEventListener('popstate',changed);},[]);
 useEffect(()=>{const controller=new AbortController(),id=requestId;setRecord(null);setError(null);
  if(!auth.isAuthenticated||!owner)return()=>controller.abort();
  if(!/^[a-f0-9]{64}$/.test(id||'')){setError({scope,message:'상담 입력 화면에서 다시 시작해 주세요.'});return()=>controller.abort();}
  void readOwned(id,controller.signal).then(fortune=>{if(controller.signal.aborted)return;if(fortune.paid===true){location.replace('/yeongnyangi/result/?id='+encodeURIComponent(id));return;}if(reviewOnly&&!isReviewSale(fortune.product?.id)){setError({scope,message:'이 상담의 신규 구매는 열려 있지 않아요. 기존 구매는 기록 보관함에서 확인해 주세요.'});return;}setRecord({scope,fortune});}).catch(error=>{if(!controller.signal.aborted)setError({scope,message:(error?.status===403||error?.code==='ACCESS_DENIED')?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':(error?.status===401||['SESSION_EXPIRED','LOGIN_REQUIRED'].includes(error?.code))?'기록과 구매를 확인하려면 토스 로그인이 필요해요.':error?.code==='ORDER_REFUNDED'?'환불된 상담은 다시 열 수 없어요. 구매 내역을 확인해 주세요.':['ORDER_NOT_PAID','PAYMENT_REVIEW_REQUIRED'].includes(error?.code)?'결제 상태를 확인하지 못했어요. 추가 결제하지 말고 구매 내역을 확인해 주세요.':'상담을 불러오지 못했어요. 다시 열어 주세요.'});});return()=>controller.abort();
 },[scope,auth.isAuthenticated,owner,attempt,reviewOnly]);
 if(!auth.isAuthenticated||!owner)return <p role="status">기록과 구매를 확인하려면 토스 로그인이 필요해요. <a href={'/login/?next='+encodeURIComponent(location.pathname+location.search)}>토스로 로그인하기</a></p>;
 const row=record?.scope===scope?record.fortune:null;
 return error?.scope===scope?<div><p role="alert">{error.message}</p><button type="button" style={{minHeight:44}} onClick={()=>setAttempt(value=>value+1)}>다시 확인하기</button></div>:row?<Checkout key={scope} draft={{requestId:row.id,product:row.product,question:row.consultation?.question,chapters:row.manifest.length,ready:row.state==='CREATED'||row.paid,onPrepare:async()=>{const fresh=await readOwned(row.id);if(fresh.product?.id!==row.product?.id||fresh.product?.name!==row.product?.name||fresh.product?.fishId!==row.product?.fishId||fresh.product?.fishName!==row.product?.fishName||String(fresh.consultation?.question||'')!==String(row.consultation?.question||'')||JSON.stringify(fresh.manifest.map(item=>[item.id,item.title]))!==JSON.stringify(row.manifest.map(item=>[item.id,item.title]))||(!fresh.paid&&fresh.state!=='CREATED'))throw new Error('RESULT_MISMATCH');return fresh;}}}/>:<p role="status">상담을 확인하고 있어요.</p>;
}
async function readOwned(id,signal){
 const response=await canonicalResponse('/canonical/yeongnyangi/requests/'+id,new Request(location.origin,{signal}));
 if(!response.ok){if(response.status===401||response.status===403)throw Object.assign(new Error('REQUEST_FAILED'),{status:response.status});let payload={};try{payload=await response.json();}catch(error){if(error?.code==='SESSION_CHANGED')throw error;}const code=typeof payload?.error==='string'?payload.error:typeof payload?.code==='string'?payload.code:typeof payload?.reason==='string'?payload.reason:'REQUEST_FAILED';throw Object.assign(new Error(code),{status:response.status,code});}const data=await response.json();
 if(!data.fortune||data.fortune.id!==id||typeof data.fortune.paid!=='boolean'||!data.fortune.product||(!Array.isArray(data.fortune.manifest)||!data.fortune.manifest.length))throw new Error('RESULT_MISMATCH');
 if(data.fortune.state==='REFUNDED')throw Object.assign(new Error('ORDER_REFUNDED'),{code:'ORDER_REFUNDED'});
 if(data.fortune.recovery?.refundPending||['PAYMENT_NOT_ACTIVE','DELIVERY_REFUND_PENDING'].includes(data.fortune.errorCode))throw Object.assign(new Error('PAYMENT_REVIEW_REQUIRED'),{code:'PAYMENT_REVIEW_REQUIRED'});
 return data.fortune;
}
